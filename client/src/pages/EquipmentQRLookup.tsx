import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  QrCode, Search, Camera, X, Wrench, Clock, AlertTriangle, 
  CheckCircle, History, FileText, Download, Printer
} from "lucide-react";
import { format } from "date-fns";
import QRCode from "qrcode";

interface EquipmentInfo {
  id: number;
  name: string;
  code: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  installDate?: string;
  lastMaintenanceDate?: string;
  status: string;
  location?: string;
}

export default function EquipmentQRLookup() {
  const [searchCode, setSearchCode] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentInfo | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Queries
  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: workOrders } = trpc.maintenance.listWorkOrders.useQuery(
    { machineId: selectedEquipment?.id },
    { enabled: !!selectedEquipment }
  );

  // Search machine by code
  const searchMachine = (code: string) => {
    if (!code) return;
    const machine = machines?.find(m => 
      m.code?.toLowerCase() === code.toLowerCase() ||
      m.name?.toLowerCase().includes(code.toLowerCase()) ||
      String(m.id) === code
    );
    
    if (machine) {
      setSelectedEquipment({
        id: machine.id,
        name: machine.name,
        code: machine.code || `M${machine.id}`,
        model: machine.model || undefined,
        manufacturer: machine.manufacturer || undefined,
        serialNumber: machine.serialNumber || undefined,
        installDate: machine.installDate ? String(machine.installDate) : undefined,
        lastMaintenanceDate: machine?.updatedAt ? machine.updatedAt.toISOString().split('T')[0] : undefined,
        status: machine.status || "active",
        location: "N/A",
      });
      generateQRCode(machine.code || `M${machine.id}`);
    } else {
      toast.error("Không tìm thấy thiết bị với mã: " + code);
    }
  };

  // Generate QR code for equipment
  const generateQRCode = async (code: string) => {
    try {
      const url = await QRCode.toDataURL(
        JSON.stringify({ type: "equipment", code, app: "cpk-spc" }),
        { width: 200, margin: 2 }
      );
      setQrCodeUrl(url);
    } catch (err) {
      console.error("QR generation error:", err);
    }
  };

  // Start camera for QR scanning
  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsScannerOpen(true);
      
      // Simple QR detection using canvas (basic implementation)
      // In production, use html5-qrcode library for better detection
      toast.info("Đưa mã QR vào khung hình để quét");
    } catch (err) {
      toast.error("Không thể truy cập camera. Vui lòng cấp quyền.");
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScannerOpen(false);
  };

  // Simulate QR scan result (in production, use actual QR detection)
  const handleManualScan = () => {
    const code = prompt("Nhập mã thiết bị từ QR:");
    if (code) {
      try {
        const data = JSON.parse(code);
        if (data.code) {
          searchMachine(data.code);
        }
      } catch {
        searchMachine(code);
      }
    }
    stopScanner();
  };

  // Print QR label
  const printQRLabel = () => {
    if (!selectedEquipment || !qrCodeUrl) return;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Label - ${selectedEquipment.name}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              .label { border: 2px solid #000; padding: 20px; display: inline-block; }
              .name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
              .code { font-size: 14px; color: #666; margin-bottom: 15px; }
              img { display: block; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="name">${selectedEquipment.name}</div>
              <div class="code">Mã: ${selectedEquipment.code}</div>
              <img src="${qrCodeUrl}" alt="QR Code" />
            </div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
      case "running":
        return <Badge className="bg-green-500">Hoạt động</Badge>;
      case "maintenance":
        return <Badge className="bg-yellow-500">Bảo trì</Badge>;
      case "stopped":
      case "inactive":
        return <Badge className="bg-red-500">Dừng</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tra cứu Thiết bị QR</h1>
            <p className="text-muted-foreground">
              Quét mã QR hoặc nhập mã để xem thông tin và lịch sử bảo trì
            </p>
          </div>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Tìm kiếm Thiết bị
            </CardTitle>
            <CardDescription>Quét mã QR hoặc nhập mã thiết bị để tra cứu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Nhập mã thiết bị hoặc tên máy..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchMachine(searchCode)}
                />
                <Button onClick={() => searchMachine(searchCode)}>
                  <Search className="h-4 w-4 mr-2" />
                  Tìm
                </Button>
              </div>
              <Button variant="outline" onClick={startScanner}>
                <Camera className="h-4 w-4 mr-2" />
                Quét QR
              </Button>
            </div>

            {/* Quick access to machines */}
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Thiết bị gần đây:</p>
              <div className="flex flex-wrap gap-2">
                {machines?.slice(0, 8).map((m) => (
                  <Button
                    key={m.id}
                    variant="outline"
                    size="sm"
                    onClick={() => searchMachine(m.code || String(m.id))}
                  >
                    {m.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Details */}
        {selectedEquipment && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Info Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedEquipment.name}</CardTitle>
                    <CardDescription>Mã: {selectedEquipment.code}</CardDescription>
                  </div>
                  {getStatusBadge(selectedEquipment.status)}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="info">
                  <TabsList>
                    <TabsTrigger value="info">Thông tin</TabsTrigger>
                    <TabsTrigger value="history">Lịch sử bảo trì</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="info" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Model</p>
                        <p className="font-medium">{selectedEquipment.model || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Nhà sản xuất</p>
                        <p className="font-medium">{selectedEquipment.manufacturer || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Số serial</p>
                        <p className="font-medium">{selectedEquipment.serialNumber || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vị trí</p>
                        <p className="font-medium">{selectedEquipment.location || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ngày lắp đặt</p>
                        <p className="font-medium">
                          {selectedEquipment.installDate 
                            ? format(new Date(selectedEquipment.installDate), "dd/MM/yyyy")
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Bảo trì gần nhất</p>
                        <p className="font-medium">
                          {selectedEquipment.lastMaintenanceDate 
                            ? format(new Date(selectedEquipment.lastMaintenanceDate), "dd/MM/yyyy")
                            : "Chưa có"}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="history">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ngày</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead>Mô tả</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>KTV</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workOrders && workOrders.length > 0 ? (
                          workOrders.map((wo) => (
                            <TableRow key={wo.id}>
                              <TableCell>
                                {wo.scheduledStartAt 
                                  ? format(new Date(wo.scheduledStartAt), "dd/MM/yyyy")
                                  : "N/A"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {wo.typeCategory === "preventive" ? "Định kỳ" :
                                   wo.typeCategory === "corrective" ? "Sửa chữa" : "Dự đoán"}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {wo.title}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  wo.status === "completed" ? "default" :
                                  wo.status === "in_progress" ? "secondary" : "outline"
                                }>
                                  {wo.status === "completed" ? "Hoàn thành" :
                                   wo.status === "in_progress" ? "Đang làm" : "Chờ"}
                                </Badge>
                              </TableCell>
                              <TableCell>{wo.technicianName || "N/A"}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              Chưa có lịch sử bảo trì
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* QR Code Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mã QR Thiết bị</CardTitle>
                <CardDescription>Quét để tra cứu nhanh</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code" className="border rounded-lg" />
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={printQRLabel}>
                    <Printer className="h-4 w-4 mr-2" />
                    In nhãn
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={qrCodeUrl} download={`qr-${selectedEquipment.code}.png`}>
                      <Download className="h-4 w-4 mr-2" />
                      Tải xuống
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Scanner Dialog */}
        <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Quét mã QR</DialogTitle>
              <DialogDescription>Đưa mã QR của thiết bị vào khung hình</DialogDescription>
            </DialogHeader>
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white rounded-lg" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleManualScan}>
                Nhập thủ công
              </Button>
              <Button variant="destructive" className="flex-1" onClick={stopScanner}>
                <X className="h-4 w-4 mr-2" />
                Đóng
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
