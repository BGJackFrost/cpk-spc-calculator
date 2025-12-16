import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { FileSpreadsheet, FileText, Download, TrendingUp, TrendingDown, Package, Calendar, Filter, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths, subQuarters } from "date-fns";
import { vi } from "date-fns/locale";

export default function StockReport() {
  const [reportType, setReportType] = useState<"monthly" | "quarterly" | "custom">("monthly");
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");

  // Get categories for filter dropdown - disabled as getCategories is not implemented
  const categories: string[] = [];

  // Auto-set dates based on report type
  const handleReportTypeChange = (type: "monthly" | "quarterly" | "custom") => {
    setReportType(type);
    const now = new Date();
    if (type === "monthly") {
      setStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(now), "yyyy-MM-dd"));
    } else if (type === "quarterly") {
      setStartDate(format(startOfQuarter(now), "yyyy-MM-dd"));
      setEndDate(format(endOfQuarter(now), "yyyy-MM-dd"));
    }
  };

  const reportQuery = trpc.spareParts.exportStockReportExcel.useMutation();

  const handleGenerateReport = () => {
    reportQuery.mutate({ startDate, endDate, reportType });
  };

  const exportToExcel = async () => {
    if (!reportQuery.data) return;
    setIsExporting(true);
    
    try {
      // Create CSV content
      const headers = ["Mã phụ tùng", "Tên phụ tùng", "Loại", "Số lượng", "Đơn giá", "Thành tiền", "Tham chiếu", "Ghi chú", "Ngày"];
      const rows = reportQuery.data.movements.map(m => [
        m.partNumber || "",
        m.partName || "",
        m.movementType || "",
        m.quantity || "0",
        m.unitCost || "0",
        m.totalCost || "0",
        m.referenceNumber || "",
        m.reason || "",
        m.createdAt ? format(new Date(m.createdAt), "dd/MM/yyyy HH:mm") : ""
      ]);

      // Add summary
      rows.push([]);
      rows.push(["TỔNG KẾT"]);
      rows.push(["Tổng nhập", String(reportQuery.data.summary.totalIn)]);
      rows.push(["Tổng xuất", String(reportQuery.data.summary.totalOut)]);
      rows.push(["Chênh lệch", String(reportQuery.data.summary.netChange)]);
      rows.push(["Giá trị nhập", String(reportQuery.data.summary.totalInValue)]);
      rows.push(["Giá trị xuất", String(reportQuery.data.summary.totalOutValue)]);
      rows.push(["Giá trị chênh lệch", String(reportQuery.data.summary.netValue)]);

      const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bao-cao-xuat-nhap-ton_${startDate}_${endDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const getMovementTypeBadge = (type: string | null) => {
    if (!type) return <Badge variant="secondary">N/A</Badge>;
    if (type.includes("in")) {
      return <Badge className="bg-green-500 hover:bg-green-600">Nhập</Badge>;
    }
    return <Badge className="bg-red-500 hover:bg-red-600">Xuất</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  // Filter movements based on search and filters
  const filteredMovements = useMemo(() => {
    if (!reportQuery.data?.movements) return [];
    
    return reportQuery.data.movements.filter(m => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (m.partName?.toLowerCase().includes(searchLower)) ||
        (m.partNumber?.toLowerCase().includes(searchLower));
      
      // Category filter - removed as category is not in the response
      const matchesCategory = categoryFilter === "all";
      
      // Movement type filter
      const matchesType = movementTypeFilter === "all" || 
        (movementTypeFilter === "in" && m.movementType?.includes("in")) ||
        (movementTypeFilter === "out" && m.movementType?.includes("out"));
      
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [reportQuery.data?.movements, searchTerm, categoryFilter, movementTypeFilter]);

  // Recalculate summary for filtered data
  const filteredSummary = useMemo(() => {
    const totalIn = filteredMovements.filter(m => m.movementType?.includes("in")).reduce((sum, m) => sum + (m.quantity || 0), 0);
    const totalOut = filteredMovements.filter(m => m.movementType?.includes("out")).reduce((sum, m) => sum + (m.quantity || 0), 0);
    const totalInValue = filteredMovements.filter(m => m.movementType?.includes("in")).reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);
    const totalOutValue = filteredMovements.filter(m => m.movementType?.includes("out")).reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);
    return {
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
      totalInValue,
      totalOutValue,
      netValue: totalInValue - totalOutValue
    };
  }, [filteredMovements]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Báo cáo Xuất nhập tồn</h1>
            <p className="text-muted-foreground">Xem và xuất báo cáo xuất nhập tồn kho phụ tùng</p>
          </div>
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Bộ lọc báo cáo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Loại báo cáo</Label>
                <Select value={reportType} onValueChange={(v) => handleReportTypeChange(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Theo tháng</SelectItem>
                    <SelectItem value="quarterly">Theo quý</SelectItem>
                    <SelectItem value="custom">Tùy chọn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Từ ngày</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={reportType !== "custom"}
                />
              </div>
              <div className="space-y-2">
                <Label>Đến ngày</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={reportType !== "custom"}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleGenerateReport} disabled={reportQuery.isPending} className="w-full">
                  {reportQuery.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      Tạo báo cáo
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Search and Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Tìm kiếm phụ tùng</Label>
                <Input
                  placeholder="Nhập tên hoặc mã phụ tùng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả danh mục</SelectItem>
                    {categories?.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loại giao dịch</Label>
                <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="in">Nhập kho</SelectItem>
                    <SelectItem value="out">Xuất kho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => { setSearchTerm(""); setCategoryFilter("all"); setMovementTypeFilter("all"); }} className="w-full">
                  Xóa bộ lọc
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Results */}
        {reportQuery.data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng nhập</p>
                      <p className="text-2xl font-bold text-green-600">{filteredSummary.totalIn}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatCurrency(filteredSummary.totalInValue)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng xuất</p>
                      <p className="text-2xl font-bold text-red-600">{filteredSummary.totalOut}</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatCurrency(filteredSummary.totalOutValue)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Chênh lệch</p>
                      <p className={`text-2xl font-bold ${filteredSummary.netChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {filteredSummary.netChange >= 0 ? "+" : ""}{filteredSummary.netChange}
                      </p>
                    </div>
                    <Package className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatCurrency(filteredSummary.netValue)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Số giao dịch</p>
                      <p className="text-2xl font-bold">{filteredMovements.length}</p>
                    </div>
                    <FileSpreadsheet className="h-8 w-8 text-purple-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Từ {format(new Date(startDate), "dd/MM/yyyy")} đến {format(new Date(endDate), "dd/MM/yyyy")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button onClick={exportToExcel} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Xuất Excel (CSV)
              </Button>
            </div>

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết giao dịch</CardTitle>
                <CardDescription>
                  Danh sách các giao dịch xuất nhập kho trong khoảng thời gian đã chọn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã phụ tùng</TableHead>
                        <TableHead>Tên phụ tùng</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead className="text-right">Số lượng</TableHead>
                        <TableHead className="text-right">Đơn giá</TableHead>
                        <TableHead className="text-right">Thành tiền</TableHead>
                        <TableHead>Tham chiếu</TableHead>
                        <TableHead>Ngày</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMovements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {searchTerm || categoryFilter !== "all" || movementTypeFilter !== "all" 
                              ? "Không tìm thấy giao dịch phù hợp với bộ lọc"
                              : "Không có giao dịch nào trong khoảng thời gian này"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMovements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell className="font-mono">{movement.partNumber || "-"}</TableCell>
                            <TableCell>{movement.partName || "-"}</TableCell>
                            <TableCell>{getMovementTypeBadge(movement.movementType)}</TableCell>
                            <TableCell className="text-right">{movement.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(movement.unitCost) || 0)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(movement.totalCost) || 0)}</TableCell>
                            <TableCell>{movement.referenceNumber || "-"}</TableCell>
                            <TableCell>
                              {movement.createdAt ? format(new Date(movement.createdAt), "dd/MM/yyyy HH:mm", { locale: vi }) : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
