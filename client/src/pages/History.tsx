import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { History as HistoryIcon, AlertTriangle, CheckCircle2, Search, X } from "lucide-react";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [productCodeFilter, setProductCodeFilter] = useState("");
  const [stationNameFilter, setStationNameFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{
    productCode?: string;
    stationName?: string;
  }>({});

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
    });
    setPage(1);
  };

  const handleClearFilters = () => {
    setProductCodeFilter("");
    setStationNameFilter("");
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

  const getCpkBadge = (cpk: number | null) => {
    if (cpk === null) return <Badge variant="secondary">N/A</Badge>;
    const cpkValue = cpk / 1000;
    if (cpkValue >= 1.67) return <Badge className="bg-chart-3 text-white">Xuất sắc ({cpkValue.toFixed(3)})</Badge>;
    if (cpkValue >= 1.33) return <Badge className="bg-chart-2 text-white">Tốt ({cpkValue.toFixed(3)})</Badge>;
    if (cpkValue >= 1.0) return <Badge className="bg-warning text-warning-foreground">Chấp nhận ({cpkValue.toFixed(3)})</Badge>;
    return <Badge variant="destructive">Không đạt ({cpkValue.toFixed(3)})</Badge>;
  };

  const hasFilters = appliedFilters.productCode || appliedFilters.stationName;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <HistoryIcon className="h-8 w-8 text-primary" />
            Lịch sử phân tích
          </h1>
          <p className="text-muted-foreground mt-1">
            Xem lại các phân tích SPC/CPK đã thực hiện
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1 block">Mã sản phẩm</label>
                <Input
                  placeholder="Nhập mã sản phẩm..."
                  value={productCodeFilter}
                  onChange={(e) => setProductCodeFilter(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1 block">Tên trạm</label>
                <Input
                  placeholder="Nhập tên trạm..."
                  value={stationNameFilter}
                  onChange={(e) => setStationNameFilter(e.target.value)}
                />
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
            </div>
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
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
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
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
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
