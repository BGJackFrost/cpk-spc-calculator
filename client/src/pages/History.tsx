import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { toast } from "sonner";
import { vi } from "date-fns/locale";
import { 
  History as HistoryIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  X, 
  Factory, 
  Building2,
  Download,
  FileSpreadsheet
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/Pagination";

export default function History() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [productCodeFilter, setProductCodeFilter] = useState("");
  const [stationNameFilter, setStationNameFilter] = useState("");
  const [selectedFactory, setSelectedFactory] = useState("all");
  const [selectedWorkshop, setSelectedWorkshop] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState<{
    productCode?: string;
    stationName?: string;
    factoryId?: number;
    workshopId?: number;
  }>({});

  // Fetch factory/workshop dropdown options
  const { data: hierarchyOptions } = trpc.factoryWorkshop.getDropdownOptions.useQuery();

  // Filter workshops based on selected factory
  const filteredWorkshops = useMemo(() => {
    if (!hierarchyOptions?.workshops) return [];
    if (selectedFactory === "all") return hierarchyOptions.workshops;
    return hierarchyOptions.workshops.filter(w => w.factoryId === parseInt(selectedFactory));
  }, [hierarchyOptions?.workshops, selectedFactory]);

  // Reset workshop when factory changes
  useEffect(() => {
    setSelectedWorkshop("all");
  }, [selectedFactory]);

  const { data, isLoading } = trpc.spc.historyPaginated.useQuery({
    page,
    pageSize,
    productCode: appliedFilters.productCode || undefined,
    stationName: appliedFilters.stationName || undefined,
  });

  const handleApplyFilters = () => {
    setAppliedFilters({
      productCode: productCodeFilter || undefined,
      stationName: stationNameFilter || undefined,
      factoryId: selectedFactory !== "all" ? parseInt(selectedFactory) : undefined,
      workshopId: selectedWorkshop !== "all" ? parseInt(selectedWorkshop) : undefined,
    });
    setPage(1);
  };

  const handleClearFilters = () => {
    setProductCodeFilter("");
    setStationNameFilter("");
    setSelectedFactory("all");
    setSelectedWorkshop("all");
    setAppliedFilters({});
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  // Export mutations
  const exportExcelMutation = trpc.spc.exportHistoryExcel.useMutation({
    onSuccess: (result) => {
      const blob = new Blob([Uint8Array.from(atob(result.base64), c => c.charCodeAt(0))], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã xuất file Excel thành công");
    },
    onError: (error) => toast.error(`Lỗi xuất Excel: ${error.message}`),
  });

  const exportPdfMutation = trpc.spc.exportHistoryPdf.useMutation({
    onSuccess: (result) => {
      const blob = new Blob([result.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, "_blank");
      if (newWindow) {
        newWindow.onload = () => {
          newWindow.print();
        };
      }
      toast.success("Đã tạo báo cáo PDF");
    },
    onError: (error) => toast.error(`Lỗi xuất PDF: ${error.message}`),
  });

  const handleExportExcel = () => {
    exportExcelMutation.mutate({
      productCode: appliedFilters.productCode,
      stationName: appliedFilters.stationName,
    });
  };

  const handleExportPdf = () => {
    exportPdfMutation.mutate({
      productCode: appliedFilters.productCode,
      stationName: appliedFilters.stationName,
    });
  };

  const getCpkBadge = (cpk: number | null) => {
    if (cpk === null) return <Badge variant="secondary">N/A</Badge>;
    const cpkValue = cpk / 1000;
    if (cpkValue >= 1.67) return <Badge className="bg-chart-3 text-white">{t.analyze?.cpkStatus?.excellent || "Xuất sắc"} ({cpkValue.toFixed(3)})</Badge>;
    if (cpkValue >= 1.33) return <Badge className="bg-chart-2 text-white">{t.analyze?.cpkStatus?.good || "Tốt"} ({cpkValue.toFixed(3)})</Badge>;
    if (cpkValue >= 1.0) return <Badge className="bg-warning text-warning-foreground">{t.analyze?.cpkStatus?.acceptable || "Chấp nhận"} ({cpkValue.toFixed(3)})</Badge>;
    return <Badge variant="destructive">{t.analyze?.cpkStatus?.poor || "Không đạt"} ({cpkValue.toFixed(3)})</Badge>;
  };

  const hasFilters = appliedFilters.productCode || appliedFilters.stationName || appliedFilters.factoryId || appliedFilters.workshopId;

  // Get factory/workshop names for display
  const getFactoryName = (factoryId: number | undefined) => {
    if (!factoryId || !hierarchyOptions?.factories) return null;
    return hierarchyOptions.factories.find(f => f.id === factoryId)?.name;
  };

  const getWorkshopName = (workshopId: number | undefined) => {
    if (!workshopId || !hierarchyOptions?.workshops) return null;
    return hierarchyOptions.workshops.find(w => w.id === workshopId)?.name;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <HistoryIcon className="h-8 w-8 text-primary" />
              Lịch sử phân tích
            </h1>
            <p className="text-muted-foreground mt-1">
              Xem lại các phân tích SPC/CPK đã thực hiện
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exportExcelMutation.isPending}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {exportExcelMutation.isPending ? "Đang xuất..." : "Xuất Excel"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exportPdfMutation.isPending}>
              <Download className="h-4 w-4 mr-2" />
              {exportPdfMutation.isPending ? "Đang tạo..." : "Tải PDF"}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Bộ lọc</CardTitle>
            <CardDescription>
              Lọc theo nhà máy, xưởng, sản phẩm hoặc trạm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Factory Filter */}
              <div>
                <label className="text-sm font-medium mb-1 block">Nhà máy</label>
                <Select value={selectedFactory} onValueChange={setSelectedFactory}>
                  <SelectTrigger>
                    <Factory className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Chọn nhà máy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả nhà máy</SelectItem>
                    {hierarchyOptions?.factories?.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.code} - {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Workshop Filter */}
              <div>
                <label className="text-sm font-medium mb-1 block">Nhà xưởng</label>
                <Select value={selectedWorkshop} onValueChange={setSelectedWorkshop}>
                  <SelectTrigger>
                    <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Chọn nhà xưởng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả xưởng</SelectItem>
                    {filteredWorkshops.map((w) => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.code} - {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Code Filter */}
              <div>
                <label className="text-sm font-medium mb-1 block">Mã sản phẩm</label>
                <Input
                  placeholder="Nhập mã sản phẩm..."
                  value={productCodeFilter}
                  onChange={(e) => setProductCodeFilter(e.target.value)}
                />
              </div>

              {/* Station Name Filter */}
              <div>
                <label className="text-sm font-medium mb-1 block">Tên trạm</label>
                <Input
                  placeholder="Nhập tên trạm..."
                  value={stationNameFilter}
                  onChange={(e) => setStationNameFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleApplyFilters}>
                <Search className="h-4 w-4 mr-2" />
                Tìm kiếm
              </Button>
              {hasFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Xóa lọc
                </Button>
              )}
            </div>

            {/* Active Filters Display */}
            {hasFilters && (
              <div className="mt-4 flex flex-wrap gap-2">
                {appliedFilters.factoryId && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Factory className="h-3 w-3" />
                    {getFactoryName(appliedFilters.factoryId)}
                  </Badge>
                )}
                {appliedFilters.workshopId && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {getWorkshopName(appliedFilters.workshopId)}
                  </Badge>
                )}
                {appliedFilters.productCode && (
                  <Badge variant="secondary">
                    Sản phẩm: {appliedFilters.productCode}
                  </Badge>
                )}
                {appliedFilters.stationName && (
                  <Badge variant="secondary">
                    Trạm: {appliedFilters.stationName}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Table */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle>Danh sách phân tích</CardTitle>
            <CardDescription>
              {data?.total || 0} phân tích đã được thực hiện
              {hasFilters && " (đã lọc)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : data && data.data.length > 0 ? (
              <>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Nhà máy</TableHead>
                        <TableHead>Xưởng</TableHead>
                        <TableHead>Mã sản phẩm</TableHead>
                        <TableHead>Trạm</TableHead>
                        <TableHead>Khoảng thời gian</TableHead>
                        <TableHead className="text-center">Số mẫu</TableHead>
                        <TableHead className="text-right">Mean</TableHead>
                        <TableHead className="text-right">Std Dev</TableHead>
                        <TableHead className="text-center">CPK</TableHead>
                        <TableHead className="text-center">Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.data.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-sm">-</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-sm">-</span>
                          </TableCell>
                          <TableCell>{item.productCode}</TableCell>
                          <TableCell>{item.stationName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(item.startDate), "dd/MM", { locale: vi })} - {format(new Date(item.endDate), "dd/MM/yyyy", { locale: vi })}
                          </TableCell>
                          <TableCell className="text-center">{item.sampleCount}</TableCell>
                          <TableCell className="text-right font-mono">
                            {(item.mean / 1000).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(item.stdDev / 1000).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getCpkBadge(item.cpk)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.alertTriggered ? (
                              <AlertTriangle className="h-5 w-5 text-destructive inline" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-chart-3 inline" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Pagination
                  page={data.page}
                  pageSize={data.pageSize}
                  total={data.total}
                  totalPages={data.totalPages}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </>
            ) : (
              <div className="text-center py-12">
                <HistoryIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">
                  {hasFilters ? "Không tìm thấy kết quả" : "Chưa có lịch sử phân tích"}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {hasFilters 
                    ? "Thử thay đổi bộ lọc để tìm kiếm"
                    : "Thực hiện phân tích SPC/CPK để xem lịch sử tại đây"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
