import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  FileText,
  Search,
  RefreshCw,
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

export default function StockMovements() {
  const [activeTab, setActiveTab] = useState("movements");
  const [searchTerm, setSearchTerm] = useState("");
  const [movementType, setMovementType] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  
  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState({
    sparePartId: 0,
    quantity: 1,
    unitCost: 0,
    referenceNumber: "",
    toLocation: "",
    reason: "",
  });

  // Export dialog
  const [exportOpen, setExportOpen] = useState(false);
  const [exportData, setExportData] = useState({
    sparePartId: 0,
    quantity: 1,
    referenceNumber: "",
    fromLocation: "",
    reason: "",
  });

  // Queries
  const { data: parts } = trpc.spareParts.listParts.useQuery({});
  const { data: movements, refetch: refetchMovements } = trpc.spareParts.listStockMovements.useQuery({
    movementType: movementType !== "all" ? movementType : undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
    limit: 200,
  });
  const { data: report } = trpc.spareParts.getStockReport.useQuery({
    startDate: dateRange.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: dateRange.end || new Date().toISOString(),
  }, { enabled: activeTab === "report" });

  // Mutations
  const importMutation = trpc.spareParts.importStock.useMutation({
    onSuccess: () => {
      toast.success("Nhập kho thành công");
      setImportOpen(false);
      refetchMovements();
      setImportData({ sparePartId: 0, quantity: 1, unitCost: 0, referenceNumber: "", toLocation: "", reason: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const exportMutation = trpc.spareParts.exportStock.useMutation({
    onSuccess: () => {
      toast.success("Xuất kho thành công");
      setExportOpen(false);
      refetchMovements();
      setExportData({ sparePartId: 0, quantity: 1, referenceNumber: "", fromLocation: "", reason: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase_in: "Nhập mua",
      return_in: "Nhập trả",
      transfer_in: "Nhập chuyển kho",
      adjustment_in: "Điều chỉnh tăng",
      initial_in: "Nhập đầu kỳ",
      work_order_out: "Xuất cho WO",
      transfer_out: "Xuất chuyển kho",
      adjustment_out: "Điều chỉnh giảm",
      scrap_out: "Xuất hủy",
      return_supplier: "Trả NCC",
    };
    return labels[type] || type;
  };

  const getMovementIcon = (type: string) => {
    if (type.includes("_in")) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (type.includes("_out")) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const filteredMovements = movements?.filter(m => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return m.partName?.toLowerCase().includes(search) || 
           m.partNumber?.toLowerCase().includes(search) ||
           m.referenceNumber?.toLowerCase().includes(search);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Xuất Nhập Tồn Kho</h1>
            <p className="text-muted-foreground">Quản lý xuất nhập và theo dõi tồn kho phụ tùng</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <ArrowDownToLine className="h-4 w-4" />
                  Nhập kho
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nhập kho phụ tùng</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Phụ tùng *</Label>
                    <Select value={String(importData.sparePartId)} onValueChange={(v) => setImportData({ ...importData, sparePartId: Number(v) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn phụ tùng" />
                      </SelectTrigger>
                      <SelectContent>
                        {parts?.map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.partNumber} - {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Số lượng *</Label>
                      <Input type="number" min={1} value={importData.quantity} onChange={(e) => setImportData({ ...importData, quantity: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Đơn giá</Label>
                      <Input type="number" min={0} value={importData.unitCost} onChange={(e) => setImportData({ ...importData, unitCost: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Số chứng từ</Label>
                      <Input value={importData.referenceNumber} onChange={(e) => setImportData({ ...importData, referenceNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Vị trí nhập</Label>
                      <Input value={importData.toLocation} onChange={(e) => setImportData({ ...importData, toLocation: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Ghi chú</Label>
                    <Textarea value={importData.reason} onChange={(e) => setImportData({ ...importData, reason: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setImportOpen(false)}>Hủy</Button>
                  <Button onClick={() => importMutation.mutate(importData)} disabled={!importData.sparePartId || importData.quantity < 1}>
                    Nhập kho
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowUpFromLine className="h-4 w-4" />
                  Xuất kho
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Xuất kho phụ tùng</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Phụ tùng *</Label>
                    <Select value={String(exportData.sparePartId)} onValueChange={(v) => setExportData({ ...exportData, sparePartId: Number(v) })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn phụ tùng" />
                      </SelectTrigger>
                      <SelectContent>
                        {parts?.map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.partNumber} - {p.name} (Tồn: {p.currentStock || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Số lượng *</Label>
                      <Input type="number" min={1} value={exportData.quantity} onChange={(e) => setExportData({ ...exportData, quantity: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Số chứng từ</Label>
                      <Input value={exportData.referenceNumber} onChange={(e) => setExportData({ ...exportData, referenceNumber: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Vị trí xuất</Label>
                    <Input value={exportData.fromLocation} onChange={(e) => setExportData({ ...exportData, fromLocation: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Lý do xuất</Label>
                    <Textarea value={exportData.reason} onChange={(e) => setExportData({ ...exportData, reason: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setExportOpen(false)}>Hủy</Button>
                  <Button onClick={() => exportMutation.mutate(exportData)} disabled={!exportData.sparePartId || exportData.quantity < 1}>
                    Xuất kho
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        {report && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tổng nhập</p>
                    <p className="text-xl font-bold text-green-600">{report.totalIn}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <ArrowUpFromLine className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tổng xuất</p>
                    <p className="text-xl font-bold text-red-600">{report.totalOut}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Chênh lệch</p>
                    <p className={`text-xl font-bold ${report.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {report.netChange >= 0 ? '+' : ''}{report.netChange}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Số giao dịch</p>
                    <p className="text-xl font-bold">{report.movementCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo mã, tên phụ tùng, số chứng từ..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={movementType} onValueChange={setMovementType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Loại giao dịch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="purchase_in">Nhập mua</SelectItem>
                  <SelectItem value="adjustment_in">Điều chỉnh tăng</SelectItem>
                  <SelectItem value="work_order_out">Xuất cho WO</SelectItem>
                  <SelectItem value="adjustment_out">Điều chỉnh giảm</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="w-[150px]"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
                <span>-</span>
                <Input
                  type="date"
                  className="w-[150px]"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => refetchMovements()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Movements Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử xuất nhập tồn</CardTitle>
            <CardDescription>Danh sách các giao dịch xuất nhập kho</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Phụ tùng</TableHead>
                  <TableHead className="text-right">SL</TableHead>
                  <TableHead className="text-right">Trước</TableHead>
                  <TableHead className="text-right">Sau</TableHead>
                  <TableHead>Chứng từ</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements?.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">
                      {new Date(m.createdAt).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(m.movementType)}
                        <Badge variant={m.movementType.includes('_in') ? 'default' : 'secondary'}>
                          {getMovementTypeLabel(m.movementType)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{m.partNumber}</p>
                        <p className="text-sm text-muted-foreground">{m.partName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={m.movementType.includes('_in') ? 'text-green-600' : 'text-red-600'}>
                        {m.movementType.includes('_in') ? '+' : '-'}{m.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{m.beforeQuantity}</TableCell>
                    <TableCell className="text-right">{m.afterQuantity}</TableCell>
                    <TableCell>{m.referenceNumber || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{m.reason || '-'}</TableCell>
                  </TableRow>
                ))}
                {(!filteredMovements || filteredMovements.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Chưa có giao dịch nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
