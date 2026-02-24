import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package,
  Download, Calendar, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import * as XLSX from "xlsx";

export default function SparePartsCostReport() {
  const [period, setPeriod] = useState<string>("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `${now.getFullYear()}-Q${quarter}`;
  });

  // Queries
  const { data: transactions } = trpc.spareParts.listTransactions.useQuery({ limit: 1000 });
  const { data: parts } = trpc.spareParts.listParts.useQuery({});

  // Calculate cost statistics
  const costStats = useMemo(() => {
    if (!transactions || !parts) return null;

    // Create a map of part prices
    const partPrices = new Map(parts.map(p => [p.id, Number(p.unitPrice) || 0]));
    const partNames = new Map(parts.map(p => [p.id, p.name]));
    const partNumbers = new Map(parts.map(p => [p.id, p.partNumber]));
    const partCategories = new Map(parts.map(p => [p.id, p.category || "Khác"]));

    // Filter transactions by period
    const filteredTx = transactions.filter(tx => {
      if (!tx.createdAt) return false;
      const txDate = new Date(tx.createdAt);
      
      if (period === "month") {
        const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        return txMonth === selectedMonth;
      } else {
        const txQuarter = Math.ceil((txDate.getMonth() + 1) / 3);
        const txQuarterStr = `${txDate.getFullYear()}-Q${txQuarter}`;
        return txQuarterStr === selectedQuarter;
      }
    });

    // Calculate costs by type
    let totalImportCost = 0;
    let totalExportCost = 0;
    const costByCategory: Record<string, { import: number; export: number }> = {};
    const costByPart: Record<number, { name: string; partNumber: string; import: number; export: number; importQty: number; exportQty: number }> = {};

    filteredTx.forEach(tx => {
      const price = partPrices.get(tx.sparePartId) || 0;
      const cost = (tx.quantity || 0) * price;
      const category = partCategories.get(tx.sparePartId) || "Khác";
      const partName = partNames.get(tx.sparePartId) || "Unknown";
      const partNumber = partNumbers.get(tx.sparePartId) || "N/A";

      if (!costByCategory[category]) {
        costByCategory[category] = { import: 0, export: 0 };
      }
      if (!costByPart[tx.sparePartId]) {
        costByPart[tx.sparePartId] = { name: partName, partNumber, import: 0, export: 0, importQty: 0, exportQty: 0 };
      }

      if (tx.transactionType === "in") {
        totalImportCost += cost;
        costByCategory[category].import += cost;
        costByPart[tx.sparePartId].import += cost;
        costByPart[tx.sparePartId].importQty += tx.quantity || 0;
      } else if (tx.transactionType === "out") {
        totalExportCost += cost;
        costByCategory[category].export += cost;
        costByPart[tx.sparePartId].export += cost;
        costByPart[tx.sparePartId].exportQty += tx.quantity || 0;
      }
    });

    // Sort parts by total cost
    const sortedParts = Object.entries(costByPart)
      .map(([id, data]) => ({ id: Number(id), ...data, total: data.import + data.export }))
      .sort((a, b) => b.total - a.total);

    return {
      totalImportCost,
      totalExportCost,
      netCost: totalImportCost - totalExportCost,
      transactionCount: filteredTx.length,
      costByCategory,
      topParts: sortedParts.slice(0, 10),
      allParts: sortedParts
    };
  }, [transactions, parts, period, selectedMonth, selectedQuarter]);

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

  // Generate quarter options (last 8 quarters)
  const quarterOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
    let year = now.getFullYear();
    let quarter = currentQuarter;
    
    for (let i = 0; i < 8; i++) {
      const value = `${year}-Q${quarter}`;
      const label = `Quý ${quarter}/${year}`;
      options.push({ value, label });
      
      quarter--;
      if (quarter === 0) {
        quarter = 4;
        year--;
      }
    }
    return options;
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const exportToExcel = () => {
    if (!costStats) return;

    // Summary sheet
    const summaryData = [
      { "Chỉ tiêu": "Tổng chi phí nhập", "Giá trị": costStats.totalImportCost },
      { "Chỉ tiêu": "Tổng chi phí xuất", "Giá trị": costStats.totalExportCost },
      { "Chỉ tiêu": "Chênh lệch", "Giá trị": costStats.netCost },
      { "Chỉ tiêu": "Số giao dịch", "Giá trị": costStats.transactionCount },
    ];

    // Category sheet
    const categoryData = Object.entries(costStats.costByCategory).map(([cat, data]) => ({
      "Danh mục": cat,
      "Chi phí nhập": data.import,
      "Chi phí xuất": data.export,
      "Tổng": data.import + data.export
    }));

    // Parts sheet
    const partsData = costStats.allParts.map(p => ({
      "Mã phụ tùng": p.partNumber,
      "Tên": p.name,
      "SL nhập": p.importQty,
      "Chi phí nhập": p.import,
      "SL xuất": p.exportQty,
      "Chi phí xuất": p.export,
      "Tổng chi phí": p.total
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Tổng quan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categoryData), "Theo danh mục");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(partsData), "Chi tiết phụ tùng");

    const periodStr = period === "month" ? selectedMonth : selectedQuarter;
    XLSX.writeFile(wb, `bao_cao_chi_phi_phu_tung_${periodStr}.xlsx`);
    toast.success("Đã xuất báo cáo Excel");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/spare-parts">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Báo cáo Chi phí Phụ tùng</h1>
              <p className="text-muted-foreground">Thống kê chi phí xuất/nhập kho theo thời gian</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Theo tháng</SelectItem>
                <SelectItem value="quarter">Theo quý</SelectItem>
              </SelectContent>
            </Select>
            
            {period === "month" ? (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="w-[150px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quarterOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="w-4 h-4 mr-2" />
              Xuất Excel
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng chi phí nhập</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(costStats?.totalImportCost || 0)}
              </div>
              <p className="text-xs text-muted-foreground">trong kỳ báo cáo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng chi phí xuất</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(costStats?.totalExportCost || 0)}
              </div>
              <p className="text-xs text-muted-foreground">trong kỳ báo cáo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chênh lệch</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(costStats?.netCost || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(costStats?.netCost || 0)}
              </div>
              <p className="text-xs text-muted-foreground">nhập - xuất</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số giao dịch</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{costStats?.transactionCount || 0}</div>
              <p className="text-xs text-muted-foreground">trong kỳ báo cáo</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Cost by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Chi phí theo danh mục
              </CardTitle>
              <CardDescription>Phân bổ chi phí theo loại phụ tùng</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costStats?.costByCategory && Object.entries(costStats.costByCategory).map(([category, data]) => {
                  const total = data.import + data.export;
                  const maxTotal = Math.max(...Object.values(costStats.costByCategory).map(d => d.import + d.export), 1);
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{category}</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                      <div className="flex gap-1 h-4">
                        <div 
                          className="bg-green-500 rounded-l"
                          style={{ width: `${(data.import / maxTotal) * 100}%` }}
                          title={`Nhập: ${formatCurrency(data.import)}`}
                        />
                        <div 
                          className="bg-red-500 rounded-r"
                          style={{ width: `${(data.export / maxTotal) * 100}%` }}
                          title={`Xuất: ${formatCurrency(data.export)}`}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="text-green-600">Nhập: {formatCurrency(data.import)}</span>
                        <span className="text-red-600">Xuất: {formatCurrency(data.export)}</span>
                      </div>
                    </div>
                  );
                })}
                {(!costStats?.costByCategory || Object.keys(costStats.costByCategory).length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    Không có dữ liệu trong kỳ này
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Parts by Cost */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Top 10 phụ tùng chi phí cao
              </CardTitle>
              <CardDescription>Phụ tùng có tổng chi phí cao nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phụ tùng</TableHead>
                    <TableHead className="text-right">Nhập</TableHead>
                    <TableHead className="text-right">Xuất</TableHead>
                    <TableHead className="text-right">Tổng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costStats?.topParts.map((part, index) => (
                    <TableRow key={part.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{part.name}</div>
                          <div className="text-xs text-muted-foreground">{part.partNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-green-600 text-sm">
                        {formatCurrency(part.import)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 text-sm">
                        {formatCurrency(part.export)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatCurrency(part.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!costStats?.topParts || costStats.topParts.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Không có dữ liệu trong kỳ này
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Full Parts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết chi phí theo phụ tùng</CardTitle>
            <CardDescription>Danh sách đầy đủ chi phí xuất/nhập của từng phụ tùng</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã PT</TableHead>
                  <TableHead>Tên phụ tùng</TableHead>
                  <TableHead className="text-center">SL Nhập</TableHead>
                  <TableHead className="text-right">Chi phí nhập</TableHead>
                  <TableHead className="text-center">SL Xuất</TableHead>
                  <TableHead className="text-right">Chi phí xuất</TableHead>
                  <TableHead className="text-right">Tổng chi phí</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costStats?.allParts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-mono text-sm">{part.partNumber}</TableCell>
                    <TableCell>{part.name}</TableCell>
                    <TableCell className="text-center">{part.importQty}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(part.import)}</TableCell>
                    <TableCell className="text-center">{part.exportQty}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(part.export)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(part.total)}</TableCell>
                  </TableRow>
                ))}
                {(!costStats?.allParts || costStats.allParts.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Không có dữ liệu trong kỳ này
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
