import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, FileSpreadsheet, Trash2, Download, BarChart3, RefreshCw, Filter, X, Calendar, Search } from "lucide-react";

export default function ExportHistory() {
  const { t, language } = useLanguage();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  // Filter states
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProductCode, setFilterProductCode] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: exports, isLoading, refetch } = trpc.exportHistory.list.useQuery({ limit: 500 });
  const { data: stats } = trpc.exportHistory.stats.useQuery();
  
  const deleteMutation = trpc.exportHistory.delete.useMutation({
    onSuccess: () => {
      toast.success(language === 'vi' ? 'Đã xóa bản ghi' : 'Record deleted');
      refetch();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Filtered exports
  const filteredExports = useMemo(() => {
    if (!exports) return [];
    
    return exports.filter((record) => {
      // Filter by type
      if (filterType !== "all" && record.exportType !== filterType) {
        return false;
      }
      
      // Filter by product code
      if (filterProductCode && record.productCode) {
        if (!record.productCode.toLowerCase().includes(filterProductCode.toLowerCase())) {
          return false;
        }
      } else if (filterProductCode && !record.productCode) {
        return false;
      }
      
      // Filter by date range
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        const recordDate = new Date(record.createdAt);
        if (recordDate < fromDate) {
          return false;
        }
      }
      
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        const recordDate = new Date(record.createdAt);
        if (recordDate > toDate) {
          return false;
        }
      }
      
      return true;
    });
  }, [exports, filterType, filterProductCode, filterDateFrom, filterDateTo]);

  const hasActiveFilters = filterType !== "all" || filterProductCode || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setFilterType("all");
    setFilterProductCode("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCpkBadge = (cpk: number | null) => {
    if (cpk === null) return <Badge variant="secondary">N/A</Badge>;
    const cpkValue = cpk / 10000;
    if (cpkValue >= 1.33) return <Badge className="bg-green-500">{cpkValue.toFixed(2)}</Badge>;
    if (cpkValue >= 1.0) return <Badge className="bg-yellow-500">{cpkValue.toFixed(2)}</Badge>;
    return <Badge className="bg-red-500">{cpkValue.toFixed(2)}</Badge>;
  };

  const getExportTypeBadge = (type: string) => {
    if (type === 'pdf') {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          PDF
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <FileSpreadsheet className="h-3 w-3" />
        Excel
      </Badge>
    );
  };

  const getAnalysisTypeBadge = (type: string | null) => {
    if (!type) return <Badge variant="secondary">-</Badge>;
    const labels: Record<string, { vi: string; en: string }> = {
      single: { vi: 'Đơn', en: 'Single' },
      batch: { vi: 'Lô', en: 'Batch' },
      'spc-plan': { vi: 'Kế hoạch SPC', en: 'SPC Plan' },
    };
    const label = labels[type] || { vi: type, en: type };
    return <Badge variant="secondary">{language === 'vi' ? label.vi : label.en}</Badge>;
  };

  const handleDownload = (record: NonNullable<typeof exports>[0]) => {
    if (record.fileUrl) {
      window.open(record.fileUrl, '_blank');
    } else {
      toast.error(language === 'vi' 
        ? 'File không còn khả dụng để tải xuống' 
        : 'File is no longer available for download');
    }
  };

  const pdfCount = stats?.find(s => s.exportType === 'pdf')?.count || 0;
  const excelCount = stats?.find(s => s.exportType === 'excel')?.count || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {language === 'vi' ? 'Lịch sử Xuất Báo cáo' : 'Export History'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'vi' 
                ? 'Xem và quản lý các báo cáo đã xuất' 
                : 'View and manage exported reports'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={showFilters ? "default" : "outline"} 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {language === 'vi' ? 'Bộ lọc' : 'Filters'}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  !
                </Badge>
              )}
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {language === 'vi' ? 'Làm mới' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {language === 'vi' ? 'Bộ lọc nâng cao' : 'Advanced Filters'}
                </CardTitle>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    {language === 'vi' ? 'Xóa bộ lọc' : 'Clear filters'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* File Type Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {language === 'vi' ? 'Loại file' : 'File Type'}
                  </Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {language === 'vi' ? 'Tất cả' : 'All'}
                      </SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Product Code Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    {language === 'vi' ? 'Mã sản phẩm' : 'Product Code'}
                  </Label>
                  <Input
                    placeholder={language === 'vi' ? 'Tìm kiếm...' : 'Search...'}
                    value={filterProductCode}
                    onChange={(e) => setFilterProductCode(e.target.value)}
                  />
                </div>

                {/* Date From Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {language === 'vi' ? 'Từ ngày' : 'From Date'}
                  </Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>

                {/* Date To Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {language === 'vi' ? 'Đến ngày' : 'To Date'}
                  </Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'vi' ? 'Tổng số báo cáo' : 'Total Reports'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{exports?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'vi' ? 'Báo cáo PDF' : 'PDF Reports'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">{pdfCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'vi' ? 'Báo cáo Excel' : 'Excel Reports'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{excelCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'vi' ? 'Kết quả lọc' : 'Filtered Results'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{filteredExports.length}</span>
                {hasActiveFilters && (
                  <span className="text-sm text-muted-foreground">
                    / {exports?.length || 0}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export History Table */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'vi' ? 'Danh sách báo cáo' : 'Report List'}</CardTitle>
            <CardDescription>
              {language === 'vi' 
                ? 'Các báo cáo SPC/CPK đã xuất gần đây' 
                : 'Recently exported SPC/CPK reports'}
              {hasActiveFilters && (
                <span className="ml-2 text-primary">
                  ({language === 'vi' ? 'Đang lọc' : 'Filtered'})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredExports && filteredExports.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'vi' ? 'Loại' : 'Type'}</TableHead>
                    <TableHead>{language === 'vi' ? 'Mã SP' : 'Product'}</TableHead>
                    <TableHead>{language === 'vi' ? 'Trạm' : 'Station'}</TableHead>
                    <TableHead>{language === 'vi' ? 'Phân tích' : 'Analysis'}</TableHead>
                    <TableHead>{language === 'vi' ? 'Mẫu' : 'Samples'}</TableHead>
                    <TableHead>CPK</TableHead>
                    <TableHead>{language === 'vi' ? 'Kích thước' : 'Size'}</TableHead>
                    <TableHead>{language === 'vi' ? 'Ngày xuất' : 'Exported'}</TableHead>
                    <TableHead>{language === 'vi' ? 'Tải xuống' : 'Download'}</TableHead>
                    <TableHead className="text-right">{language === 'vi' ? 'Thao tác' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExports.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{getExportTypeBadge(record.exportType)}</TableCell>
                      <TableCell className="font-medium">{record.productCode || '-'}</TableCell>
                      <TableCell>{record.stationName || '-'}</TableCell>
                      <TableCell>{getAnalysisTypeBadge(record.analysisType)}</TableCell>
                      <TableCell>{record.sampleCount || '-'}</TableCell>
                      <TableCell>{getCpkBadge(record.cpk)}</TableCell>
                      <TableCell>{formatFileSize(record.fileSize)}</TableCell>
                      <TableCell>{formatDate(record.createdAt)}</TableCell>
                      <TableCell>
                        {record.fileUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(record)}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" />
                            {language === 'vi' ? 'Tải' : 'Download'}
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {language === 'vi' ? 'Không khả dụng' : 'Not available'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(record.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {hasActiveFilters ? (
                  <>
                    <p>{language === 'vi' ? 'Không tìm thấy báo cáo phù hợp' : 'No matching reports found'}</p>
                    <Button variant="link" onClick={clearFilters} className="mt-2">
                      {language === 'vi' ? 'Xóa bộ lọc' : 'Clear filters'}
                    </Button>
                  </>
                ) : (
                  <>
                    <p>{language === 'vi' ? 'Chưa có báo cáo nào được xuất' : 'No reports exported yet'}</p>
                    <p className="text-sm mt-2">
                      {language === 'vi' 
                        ? 'Xuất báo cáo từ trang Phân tích SPC/CPK để bắt đầu' 
                        : 'Export reports from the SPC/CPK Analysis page to get started'}
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'vi' ? 'Xác nhận xóa' : 'Confirm Delete'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'vi' 
                ? 'Bạn có chắc chắn muốn xóa bản ghi này? Hành động này không thể hoàn tác.' 
                : 'Are you sure you want to delete this record? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'vi' ? 'Xóa' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
