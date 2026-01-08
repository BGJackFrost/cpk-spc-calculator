/**
 * CPK Alert Management Page
 * Hiển thị biểu đồ trend CPK theo thời gian và lịch sử cảnh báo
 */
import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { Download, RefreshCw, AlertTriangle, CheckCircle, XCircle, TrendingUp, Calendar } from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { toast } from 'sonner';

export default function CpkAlertManagement() {
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [productCode, setProductCode] = useState<string>('all');
  const [stationName, setStationName] = useState<string>('all');
  const [alertTypeFilter, setAlertTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');

  // Get CPK trend data
  const { data: trendData, isLoading: trendLoading, refetch: refetchTrend } = trpc.spc.getCpkTrend.useQuery({
    groupBy,
    productCode: productCode !== 'all' ? productCode : undefined,
    stationName: stationName !== 'all' ? stationName : undefined,
  });

  // Get alert history
  const { data: alertHistory, isLoading: historyLoading, refetch: refetchHistory } = trpc.cpkAlert.listAlertHistory.useQuery({
    page,
    pageSize: 20,
    productCode: productCode !== 'all' ? productCode : undefined,
    stationName: stationName !== 'all' ? stationName : undefined,
    alertType: alertTypeFilter !== 'all' ? alertTypeFilter as 'warning' | 'critical' | 'excellent' : undefined,
    search: searchText || undefined,
  });

  // Get stats
  const { data: stats } = trpc.cpkAlert.getAlertHistoryStats.useQuery({});

  // Get products and workstations for filters
  const { data: products } = trpc.product.list.useQuery({});
  const { data: workstations } = trpc.workstation.list.useQuery({});

  // Export Excel mutation
  const exportMutation = trpc.cpkAlert.exportAlertHistoryExcel.useMutation({
    onSuccess: (data) => {
      // Create download link
      const byteCharacters = atob(data.buffer);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Xuất Excel thành công!');
    },
    onError: (error) => {
      toast.error('Lỗi xuất Excel: ' + error.message);
    },
  });

  // Process trend data for chart
  const chartData = useMemo(() => {
    if (!trendData?.items) return [];
    return trendData.items.map(item => ({
      date: item.date,
      avgCpk: item.avgCpk,
      minCpk: item.minCpk,
      maxCpk: item.maxCpk,
      count: item.count,
    }));
  }, [trendData]);

  const handleExportExcel = () => {
    exportMutation.mutate({
      productCode: productCode !== 'all' ? productCode : undefined,
      stationName: stationName !== 'all' ? stationName : undefined,
      alertType: alertTypeFilter !== 'all' ? alertTypeFilter as 'warning' | 'critical' | 'excellent' : undefined,
    });
  };

  const handleRefresh = () => {
    refetchTrend();
    refetchHistory();
    toast.success('Đã làm mới dữ liệu');
  };

  const getAlertBadge = (alertType: string) => {
    switch (alertType) {
      case 'critical':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Nghiêm trọng</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="gap-1 bg-yellow-500 text-white"><AlertTriangle className="h-3 w-3" /> Cảnh báo</Badge>;
      case 'excellent':
        return <Badge variant="secondary" className="gap-1 bg-green-500 text-white"><CheckCircle className="h-3 w-3" /> Xuất sắc</Badge>;
      default:
        return <Badge variant="outline">Bình thường</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Cảnh báo CPK</h1>
            <p className="text-muted-foreground">Theo dõi xu hướng CPK và lịch sử cảnh báo</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Button onClick={handleExportExcel} disabled={exportMutation.isPending}>
              <Download className="h-4 w-4 mr-2" />
              {exportMutation.isPending ? 'Đang xuất...' : 'Xuất Excel'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tổng phân tích</CardDescription>
              <CardTitle className="text-2xl">{stats?.totalAlerts || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-red-600">Nghiêm trọng</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats?.criticalCount || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-yellow-600">Cảnh báo</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">{stats?.warningCount || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader className="pb-2">
              <CardDescription className="text-green-600">Xuất sắc</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats?.excellentCount || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>CPK trung bình</CardDescription>
              <CardTitle className="text-2xl">{(stats?.avgCpk || 0).toFixed(3)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'day' | 'week' | 'month')}>
                <SelectTrigger>
                  <SelectValue placeholder="Nhóm theo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Theo ngày</SelectItem>
                  <SelectItem value="week">Theo tuần</SelectItem>
                  <SelectItem value="month">Theo tháng</SelectItem>
                </SelectContent>
              </Select>

              <Select value={productCode} onValueChange={setProductCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Sản phẩm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                  {products?.map((p: { id: number; code: string; name: string }) => (
                    <SelectItem key={p.id} value={p.code}>{p.code} - {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stationName} onValueChange={setStationName}>
                <SelectTrigger>
                  <SelectValue placeholder="Công trạm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả công trạm</SelectItem>
                  {workstations?.map((w: { id: number; name: string }) => (
                    <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={alertTypeFilter} onValueChange={setAlertTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Loại cảnh báo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="critical">Nghiêm trọng</SelectItem>
                  <SelectItem value="warning">Cảnh báo</SelectItem>
                  <SelectItem value="excellent">Xuất sắc</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Tìm kiếm..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* CPK Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Biểu đồ Trend CPK
            </CardTitle>
            <CardDescription>
              Xu hướng CPK theo thời gian với các ngưỡng cảnh báo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Không có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 'auto']} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        avgCpk: 'CPK trung bình',
                        minCpk: 'CPK thấp nhất',
                        maxCpk: 'CPK cao nhất',
                      };
                      return [value.toFixed(3), labels[name] || name];
                    }}
                  />
                  <Legend />
                  
                  {/* Threshold lines */}
                  <ReferenceLine y={1.0} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Critical (1.0)', fill: '#ef4444', fontSize: 12 }} />
                  <ReferenceLine y={1.33} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Warning (1.33)', fill: '#f59e0b', fontSize: 12 }} />
                  <ReferenceLine y={1.67} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Excellent (1.67)', fill: '#22c55e', fontSize: 12 }} />
                  
                  {/* Data lines */}
                  <Area type="monotone" dataKey="maxCpk" fill="#22c55e" fillOpacity={0.1} stroke="none" name="CPK cao nhất" />
                  <Area type="monotone" dataKey="minCpk" fill="#ef4444" fillOpacity={0.1} stroke="none" name="CPK thấp nhất" />
                  <Line type="monotone" dataKey="avgCpk" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="CPK trung bình" />
                  <Line type="monotone" dataKey="minCpk" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} name="CPK thấp nhất" />
                  <Line type="monotone" dataKey="maxCpk" stroke="#22c55e" strokeWidth={1} strokeDasharray="3 3" dot={false} name="CPK cao nhất" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Alert History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử Phân tích CPK</CardTitle>
            <CardDescription>
              Danh sách các phân tích CPK gần đây
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Công trạm</TableHead>
                      <TableHead className="text-right">CPK</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Mean</TableHead>
                      <TableHead className="text-right">Std Dev</TableHead>
                      <TableHead className="text-right">Số mẫu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertHistory?.items?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Không có dữ liệu
                        </TableCell>
                      </TableRow>
                    ) : (
                      alertHistory?.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '-'}
                          </TableCell>
                          <TableCell>{item.productCode}</TableCell>
                          <TableCell>{item.stationName}</TableCell>
                          <TableCell className="text-right font-mono">{item.cpkValue.toFixed(3)}</TableCell>
                          <TableCell>{getAlertBadge(item.alertType)}</TableCell>
                          <TableCell className="text-right font-mono">{item.mean.toFixed(3)}</TableCell>
                          <TableCell className="text-right font-mono">{item.stdDev.toFixed(3)}</TableCell>
                          <TableCell className="text-right">{item.sampleCount}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {alertHistory && alertHistory.total > alertHistory.pageSize && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Trước
                    </Button>
                    <span className="flex items-center px-4">
                      Trang {page} / {Math.ceil(alertHistory.total / alertHistory.pageSize)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= Math.ceil(alertHistory.total / alertHistory.pageSize)}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Sau
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
