import { useState, useRef, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
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
  CheckCircle, History, FileText, Download, Printer, TrendingUp, Gauge, Activity
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
  const { data: oeeRecords } = trpc.oee.listRecords.useQuery(
    { machineId: selectedEquipment?.id },
    { enabled: !!selectedEquipment }
  );

  // Process maintenance history for chart
  const maintenanceChartData = useMemo(() => {
    if (!workOrders) return [];
    const monthlyData: Record<string, { month: string; preventive: number; corrective: number; predictive: number }> = {};
    
    workOrders.forEach(wo => {
      if (!wo.scheduledStartAt) return;
      const date = new Date(wo.scheduledStartAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, preventive: 0, corrective: 0, predictive: 0 };
      }
      
      if (wo.typeCategory === "preventive") monthlyData[monthKey].preventive++;
      else if (wo.typeCategory === "corrective") monthlyData[monthKey].corrective++;
      else monthlyData[monthKey].predictive++;
    });
    
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [workOrders]);

  // Process OEE data for chart
  const oeeChartData = useMemo(() => {
    if (!oeeRecords) return [];
    return oeeRecords.slice(-30).map(r => ({
      date: r.recordDate ? new Date(r.recordDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '',
      oee: r.oee ? Number(r.oee) : 0,
      availability: r.availability ? Number(r.availability) : 0,
      performance: r.performance ? Number(r.performance) : 0,
      quality: r.quality ? Number(r.quality) : 0,
    }));
  }, [oeeRecords]);

  // Maintenance type distribution
  const maintenanceDistribution = useMemo(() => {
    if (!workOrders) return [];
    const counts = { preventive: 0, corrective: 0, predictive: 0 };
    workOrders.forEach(wo => {
      if (wo.typeCategory === "preventive") counts.preventive++;
      else if (wo.typeCategory === "corrective") counts.corrective++;
      else counts.predictive++;
    });
    return [
      { name: 'Định kỳ', value: counts.preventive, color: '#3b82f6' },
      { name: 'Sửa chữa', value: counts.corrective, color: '#f59e0b' },
      { name: 'Dự đoán', value: counts.predictive, color: '#8b5cf6' },
    ].filter(d => d.value > 0);
  }, [workOrders]);

  // Calculate average OEE
  const avgOEE = useMemo(() => {
    if (!oeeChartData.length) return 0;
    return oeeChartData.reduce((sum, d) => sum + d.oee, 0) / oeeChartData.length;
  }, [oeeChartData]);

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
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="info">Thông tin</TabsTrigger>
                    <TabsTrigger value="oee">OEE</TabsTrigger>
                    <TabsTrigger value="charts">Biểu đồ</TabsTrigger>
                    <TabsTrigger value="history">Lịch sử</TabsTrigger>
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
                  
                  {/* OEE Tab */}
                  <TabsContent value="oee" className="space-y-4">
                    {/* OEE Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <Gauge className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                        <div className="text-2xl font-bold">{avgOEE.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">OEE Trung bình</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <Activity className="h-6 w-6 mx-auto mb-2 text-green-500" />
                        <div className="text-2xl font-bold">
                          {oeeChartData.length > 0 ? oeeChartData[oeeChartData.length - 1].availability.toFixed(1) : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">Availability</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <TrendingUp className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                        <div className="text-2xl font-bold">
                          {oeeChartData.length > 0 ? oeeChartData[oeeChartData.length - 1].performance.toFixed(1) : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">Performance</p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <CheckCircle className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                        <div className="text-2xl font-bold">
                          {oeeChartData.length > 0 ? oeeChartData[oeeChartData.length - 1].quality.toFixed(1) : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">Quality</p>
                      </div>
                    </div>
                    
                    {/* MTBF/MTTR Statistics */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-4 bg-cyan-50 dark:bg-cyan-950 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">MTBF</p>
                            <p className="text-sm text-muted-foreground">Mean Time Between Failures</p>
                          </div>
                          <Clock className="h-5 w-5 text-cyan-500" />
                        </div>
                        <div className="text-2xl font-bold text-cyan-600 mt-2">
                          {workOrders && workOrders.length > 0 
                            ? Math.round((30 * 24) / Math.max(workOrders.filter(w => w.typeCategory === 'corrective').length, 1))
                            : 'N/A'
                          }h
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Thời gian trung bình giữa các lần hỏng</p>
                      </div>
                      <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">MTTR</p>
                            <p className="text-sm text-muted-foreground">Mean Time To Repair</p>
                          </div>
                          <Wrench className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="text-2xl font-bold text-orange-600 mt-2">
                          {workOrders && workOrders.filter(w => w.status === 'completed').length > 0
                            ? (workOrders.filter(w => w.status === 'completed').reduce((sum, w) => {
                                const start = w.scheduledStartAt ? new Date(w.scheduledStartAt) : null;
                                const end = w.completedAt ? new Date(w.completedAt) : null;
                                if (start && end) {
                                  return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                                }
                                return sum;
                              }, 0) / workOrders.filter(w => w.status === 'completed').length).toFixed(1)
                            : 'N/A'
                          }h
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Thời gian trung bình sửa chữa</p>
                      </div>
                    </div>

                    {/* OEE Trend Chart */}
                    <div className="h-[250px]">
                      <p className="text-sm font-medium mb-2">Xu hướng OEE (30 ngày gần nhất)</p>
                      {oeeChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={oeeChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="oee" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="OEE" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          Chưa có dữ liệu OEE
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Charts Tab */}
                  <TabsContent value="charts" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Maintenance History Chart */}
                      <div>
                        <p className="text-sm font-medium mb-2">Lịch sử bảo trì theo tháng</p>
                        <div className="h-[200px]">
                          {maintenanceChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={maintenanceChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="preventive" name="Định kỳ" fill="#3b82f6" />
                                <Bar dataKey="corrective" name="Sửa chữa" fill="#f59e0b" />
                                <Bar dataKey="predictive" name="Dự đoán" fill="#8b5cf6" />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                              Chưa có dữ liệu bảo trì
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Maintenance Type Distribution */}
                      <div>
                        <p className="text-sm font-medium mb-2">Phân bổ loại bảo trì</p>
                        <div className="h-[200px]">
                          {maintenanceDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={maintenanceDistribution}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={70}
                                  dataKey="value"
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                  {maintenanceDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                              Chưa có dữ liệu
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Stats Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
                        <div className="text-xl font-bold text-blue-600">{workOrders?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Tổng số lần bảo trì</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                        <div className="text-xl font-bold text-green-600">
                          {workOrders?.filter(w => w.status === "completed").length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Hoàn thành</p>
                      </div>
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-center">
                        <div className="text-xl font-bold text-yellow-600">
                          {workOrders?.filter(w => w.status === "pending" || w.status === "in_progress").length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Đang chờ</p>
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
