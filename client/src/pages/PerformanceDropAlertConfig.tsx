/**
 * Performance Drop Alert Configuration Page
 * Cấu hình cảnh báo khi hiệu suất dây chuyền giảm đột ngột
 */
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';
import { 
  TrendingDown, 
  Settings, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertTriangle,
  Shield,
  Loader2,
  RefreshCw,
  BarChart3,
  Activity,
  Factory,
  Zap
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PerformanceDropConfig {
  enabled: boolean;
  oeeDropThreshold: number;
  cpkDropThreshold: number;
  comparisonPeriodHours: number;
  checkIntervalMinutes: number;
  notifyOwner: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  minSamplesRequired: number;
}

interface PerformanceDropAlert {
  id: number;
  productionLineId: number;
  productionLineName?: string;
  alertType: string;
  severity: string;
  alertMessage: string;
  currentValue: string;
  thresholdValue: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  minutesSinceCreated: number;
}

interface PerformanceDropStats {
  totalAlerts: number;
  byType: { type: string; count: number }[];
  byLine: { lineId: number; lineName: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
}

export default function PerformanceDropAlertConfig() {
  const { toast } = useToast();
  const [config, setConfig] = useState<PerformanceDropConfig>({
    enabled: false,
    oeeDropThreshold: 10,
    cpkDropThreshold: 0.2,
    comparisonPeriodHours: 24,
    checkIntervalMinutes: 30,
    notifyOwner: true,
    notifyEmail: true,
    notifySms: false,
    minSamplesRequired: 5,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [activeTab, setActiveTab] = useState('config');

  // Load config
  const configQuery = trpc.performanceDropAlert.getConfig.useQuery(undefined, {
    onSuccess: (data) => {
      if (data) {
        setConfig(data as PerformanceDropConfig);
      }
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    },
  });

  // Load unresolved alerts
  const alertsQuery = trpc.performanceDropAlert.getUnresolvedAlerts.useQuery();

  // Load stats
  const statsQuery = trpc.performanceDropAlert.getStats.useQuery({ days: 7 });

  // Save config mutation
  const saveConfigMutation = trpc.performanceDropAlert.saveConfig.useMutation({
    onSuccess: () => {
      toast({
        title: 'Đã lưu cấu hình',
        description: 'Cấu hình cảnh báo hiệu suất đã được lưu thành công',
      });
      setIsSaving(false);
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể lưu cấu hình',
        variant: 'destructive',
      });
      setIsSaving(false);
    },
  });

  // Check now mutation
  const checkNowMutation = trpc.performanceDropAlert.checkNow.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Đã kiểm tra',
        description: `Phát hiện ${data.alertsFound} cảnh báo mới`,
      });
      setIsChecking(false);
      alertsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể kiểm tra',
        variant: 'destructive',
      });
      setIsChecking(false);
    },
  });

  // Resolve alert mutation
  const resolveAlertMutation = trpc.performanceDropAlert.resolveAlert.useMutation({
    onSuccess: () => {
      toast({
        title: 'Đã xử lý',
        description: 'Cảnh báo đã được đánh dấu đã xử lý',
      });
      alertsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể xử lý cảnh báo',
        variant: 'destructive',
      });
    },
  });

  const handleSaveConfig = () => {
    setIsSaving(true);
    saveConfigMutation.mutate(config);
  };

  const handleCheckNow = () => {
    setIsChecking(true);
    checkNowMutation.mutate();
  };

  const handleResolveAlert = (alertId: number) => {
    resolveAlertMutation.mutate({ alertId });
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'oee_drop': 'OEE giảm',
      'cpk_drop': 'CPK giảm',
      'availability_drop': 'Availability giảm',
      'quality_drop': 'Quality giảm',
    };
    return labels[type] || type;
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'critical') {
      return <Badge variant="destructive">Critical</Badge>;
    }
    return <Badge variant="secondary">Warning</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const alerts = alertsQuery.data as PerformanceDropAlert[] || [];
  const stats = statsQuery.data as PerformanceDropStats || { totalAlerts: 0, byType: [], byLine: [], bySeverity: [] };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingDown className="h-6 w-6" />
              Cảnh báo Hiệu suất Giảm
            </h1>
            <p className="text-muted-foreground">
              Tự động phát hiện và cảnh báo khi hiệu suất dây chuyền giảm đột ngột
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.enabled ? 'default' : 'secondary'}>
              {config.enabled ? 'Đang bật' : 'Đang tắt'}
            </Badge>
            <Button variant="outline" onClick={() => {
              configQuery.refetch();
              alertsQuery.refetch();
              statsQuery.refetch();
            }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Cảnh báo ({alerts.length})
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              Thống kê
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-6">
            {/* Enable/Disable */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Trạng thái
                </CardTitle>
                <CardDescription>
                  Bật/tắt tính năng phát hiện hiệu suất giảm đột ngột
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Kích hoạt tự động phát hiện</Label>
                    <p className="text-sm text-muted-foreground">
                      Tự động kiểm tra và cảnh báo khi hiệu suất giảm quá ngưỡng
                    </p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Ngưỡng cảnh báo
                </CardTitle>
                <CardDescription>
                  Cấu hình ngưỡng phát hiện hiệu suất giảm
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ngưỡng giảm OEE (%)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={config.oeeDropThreshold}
                      onChange={(e) =>
                        setConfig({ ...config, oeeDropThreshold: parseFloat(e.target.value) || 10 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Cảnh báo khi OEE giảm ≥ {config.oeeDropThreshold}% so với baseline
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Ngưỡng giảm CPK</Label>
                    <Input
                      type="number"
                      min={0.1}
                      max={1}
                      step={0.1}
                      value={config.cpkDropThreshold}
                      onChange={(e) =>
                        setConfig({ ...config, cpkDropThreshold: parseFloat(e.target.value) || 0.2 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Cảnh báo khi CPK giảm ≥ {config.cpkDropThreshold} so với baseline
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Khoảng thời gian so sánh (giờ)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={config.comparisonPeriodHours}
                      onChange={(e) =>
                        setConfig({ ...config, comparisonPeriodHours: parseInt(e.target.value) || 24 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      So sánh với dữ liệu trong {config.comparisonPeriodHours} giờ trước
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Số mẫu tối thiểu</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={config.minSamplesRequired}
                      onChange={(e) =>
                        setConfig({ ...config, minSamplesRequired: parseInt(e.target.value) || 5 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Cần ít nhất {config.minSamplesRequired} mẫu để đánh giá
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Thông báo
                </CardTitle>
                <CardDescription>
                  Cấu hình phương thức thông báo khi phát hiện hiệu suất giảm
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Thông báo Owner</Label>
                    <p className="text-sm text-muted-foreground">
                      Gửi thông báo đến chủ sở hữu hệ thống
                    </p>
                  </div>
                  <Switch
                    checked={config.notifyOwner}
                    onCheckedChange={(checked) => setConfig({ ...config, notifyOwner: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Gửi Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Gửi email cảnh báo đến người dùng đã cấu hình
                    </p>
                  </div>
                  <Switch
                    checked={config.notifyEmail}
                    onCheckedChange={(checked) => setConfig({ ...config, notifyEmail: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Gửi SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Gửi SMS cảnh báo (cần cấu hình SMS trước)
                    </p>
                  </div>
                  <Switch
                    checked={config.notifySms}
                    onCheckedChange={(checked) => setConfig({ ...config, notifySms: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleCheckNow} disabled={isChecking || !config.enabled}>
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Kiểm tra ngay
                  </>
                )}
              </Button>
              <Button onClick={handleSaveConfig} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Lưu cấu hình
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Cảnh báo chưa xử lý
                </CardTitle>
                <CardDescription>
                  Danh sách các cảnh báo hiệu suất giảm đang chờ xử lý
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Không có cảnh báo nào chưa xử lý</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dây chuyền</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Mức độ</TableHead>
                        <TableHead>Nội dung</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Factory className="h-4 w-4" />
                              {alert.productionLineName || `Line #${alert.productionLineId}`}
                            </div>
                          </TableCell>
                          <TableCell>{getAlertTypeLabel(alert.alertType)}</TableCell>
                          <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {alert.alertMessage}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {alert.minutesSinceCreated} phút trước
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResolveAlert(alert.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Xử lý
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổng cảnh báo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAlerts}</div>
                  <p className="text-xs text-muted-foreground">7 ngày gần nhất</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Critical
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {stats.bySeverity.find(s => s.severity === 'critical')?.count || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Cảnh báo nghiêm trọng</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Warning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-500">
                    {stats.bySeverity.find(s => s.severity === 'warning')?.count || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Cảnh báo thường</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Dây chuyền
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.byLine.length}</div>
                  <p className="text-xs text-muted-foreground">Có cảnh báo</p>
                </CardContent>
              </Card>
            </div>

            {/* By Type */}
            <Card>
              <CardHeader>
                <CardTitle>Theo loại cảnh báo</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.byType.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loại</TableHead>
                        <TableHead className="text-right">Số lượng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.byType.map((item) => (
                        <TableRow key={item.type}>
                          <TableCell>{getAlertTypeLabel(item.type)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{item.count}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Chưa có dữ liệu
                  </p>
                )}
              </CardContent>
            </Card>

            {/* By Line */}
            <Card>
              <CardHeader>
                <CardTitle>Theo dây chuyền</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.byLine.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dây chuyền</TableHead>
                        <TableHead className="text-right">Số cảnh báo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.byLine.map((item) => (
                        <TableRow key={item.lineId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Factory className="h-4 w-4" />
                              {item.lineName}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{item.count}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Chưa có dữ liệu
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
