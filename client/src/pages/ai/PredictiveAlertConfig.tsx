import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { 
  Settings, Plus, Edit, Trash2, Bell, AlertTriangle, CheckCircle, 
  RefreshCw, Loader2, Target, Bug, TrendingDown, TrendingUp,
  Zap, Clock, Mail, History, Play, Eye
} from "lucide-react";

export default function PredictiveAlertConfig() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<any>(null);
  const [selectedThresholdId, setSelectedThresholdId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    productionLineId: null as number | null,
    predictionType: 'both' as 'oee' | 'defect_rate' | 'both',
    oeeWarningThreshold: 75,
    oeeCriticalThreshold: 65,
    oeeDeclineThreshold: 5,
    defectWarningThreshold: 3,
    defectCriticalThreshold: 5,
    defectIncreaseThreshold: 20,
    autoAdjustEnabled: false,
    autoAdjustSensitivity: 'medium' as 'low' | 'medium' | 'high',
    autoAdjustPeriodDays: 30,
    emailAlertEnabled: true,
    alertEmails: [] as string[],
    alertFrequency: 'immediate' as 'immediate' | 'hourly' | 'daily',
  });

  // Queries
  const { data: thresholds, isLoading, refetch } = trpc.predictiveAlert.getThresholds.useQuery();
  const { data: summary } = trpc.predictiveAlert.getSummary.useQuery();
  const { data: alertHistory } = trpc.predictiveAlert.getAlertHistory.useQuery({ limit: 20 });
  const { data: adjustmentLogs } = trpc.predictiveAlert.getAdjustmentLogs.useQuery(
    { thresholdId: selectedThresholdId || 0, limit: 10 },
    { enabled: !!selectedThresholdId }
  );
  const { data: productionLines } = trpc.productionLine.getAll.useQuery();

  // Mutations
  const createMutation = trpc.predictiveAlert.createThreshold.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã tạo cấu hình ngưỡng mới" });
      setIsCreateDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = trpc.predictiveAlert.updateThreshold.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã cập nhật cấu hình ngưỡng" });
      setEditingThreshold(null);
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.predictiveAlert.deleteThreshold.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã xóa cấu hình ngưỡng" });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const checkAlertsMutation = trpc.predictiveAlert.checkAlerts.useMutation({
    onSuccess: (result) => {
      if (result.alerts.length > 0) {
        toast({ 
          title: "Phát hiện cảnh báo", 
          description: `Có ${result.alerts.length} cảnh báo mới`,
          variant: "destructive"
        });
      } else {
        toast({ title: "Thành công", description: "Không có cảnh báo nào" });
      }
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const triggerAutoAdjustMutation = trpc.predictiveAlert.triggerAutoAdjust.useMutation({
    onSuccess: (result) => {
      if (result.adjustments.length > 0) {
        toast({ 
          title: "Đã điều chỉnh ngưỡng", 
          description: `Đã điều chỉnh ${result.adjustments.length} ngưỡng tự động`
        });
      } else {
        toast({ title: "Thông báo", description: "Không cần điều chỉnh ngưỡng" });
      }
      refetch();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const acknowledgeAlertMutation = trpc.predictiveAlert.acknowledgeAlert.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã xác nhận cảnh báo" });
      refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      productionLineId: null,
      predictionType: 'both',
      oeeWarningThreshold: 75,
      oeeCriticalThreshold: 65,
      oeeDeclineThreshold: 5,
      defectWarningThreshold: 3,
      defectCriticalThreshold: 5,
      defectIncreaseThreshold: 20,
      autoAdjustEnabled: false,
      autoAdjustSensitivity: 'medium',
      autoAdjustPeriodDays: 30,
      emailAlertEnabled: true,
      alertEmails: [],
      alertFrequency: 'immediate',
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingThreshold) return;
    updateMutation.mutate({ id: editingThreshold.id, ...formData });
  };

  const handleEdit = (threshold: any) => {
    setEditingThreshold(threshold);
    setFormData({
      name: threshold.name,
      productionLineId: threshold.productionLineId,
      predictionType: threshold.predictionType,
      oeeWarningThreshold: threshold.oeeWarningThreshold,
      oeeCriticalThreshold: threshold.oeeCriticalThreshold,
      oeeDeclineThreshold: threshold.oeeDeclineThreshold,
      defectWarningThreshold: threshold.defectWarningThreshold,
      defectCriticalThreshold: threshold.defectCriticalThreshold,
      defectIncreaseThreshold: threshold.defectIncreaseThreshold,
      autoAdjustEnabled: threshold.autoAdjustEnabled,
      autoAdjustSensitivity: threshold.autoAdjustSensitivity,
      autoAdjustPeriodDays: threshold.autoAdjustPeriodDays,
      emailAlertEnabled: threshold.emailAlertEnabled,
      alertEmails: threshold.alertEmails,
      alertFrequency: threshold.alertFrequency,
    });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge className="bg-red-500">Nghiêm trọng</Badge>;
      case 'warning': return <Badge className="bg-orange-500">Cảnh báo</Badge>;
      case 'info': return <Badge className="bg-blue-500">Thông tin</Badge>;
      default: return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline">Chờ xử lý</Badge>;
      case 'sent': return <Badge className="bg-blue-500">Đã gửi</Badge>;
      case 'acknowledged': return <Badge className="bg-yellow-500">Đã xác nhận</Badge>;
      case 'resolved': return <Badge className="bg-green-500">Đã xử lý</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bell className="w-8 h-8 text-purple-500" />
              Cấu hình Cảnh báo Dự báo
            </h1>
            <p className="text-muted-foreground mt-1">
              Cấu hình ngưỡng cảnh báo tự động dựa trên kết quả dự báo OEE và Defect Rate
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Tạo cấu hình mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo cấu hình ngưỡng cảnh báo</DialogTitle>
                <DialogDescription>
                  Thiết lập ngưỡng cảnh báo tự động cho OEE và tỷ lệ lỗi
                </DialogDescription>
              </DialogHeader>
              <ThresholdForm 
                formData={formData} 
                setFormData={setFormData}
                productionLines={productionLines || []}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Tạo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng cấu hình</p>
                  <p className="text-2xl font-bold">{summary?.totalThresholds || 0}</p>
                </div>
                <Settings className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                  <p className="text-2xl font-bold text-green-600">{summary?.activeThresholds || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tự động điều chỉnh</p>
                  <p className="text-2xl font-bold text-blue-600">{summary?.autoAdjustEnabled || 0}</p>
                </div>
                <Zap className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700">Cảnh báo chờ</p>
                  <p className="text-2xl font-bold text-orange-800">{summary?.pendingAlerts || 0}</p>
                </div>
                <Bell className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700">Nghiêm trọng</p>
                  <p className="text-2xl font-bold text-red-800">{summary?.criticalAlerts || 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="thresholds" className="space-y-4">
          <TabsList>
            <TabsTrigger value="thresholds">Cấu hình ngưỡng</TabsTrigger>
            <TabsTrigger value="alerts">Lịch sử cảnh báo</TabsTrigger>
            <TabsTrigger value="adjustments">Điều chỉnh tự động</TabsTrigger>
          </TabsList>

          <TabsContent value="thresholds" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách cấu hình ngưỡng dự báo</CardTitle>
                <CardDescription>
                  Quản lý các cấu hình ngưỡng cảnh báo cho dự báo OEE và Defect
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Dây chuyền</TableHead>
                        <TableHead>Loại dự báo</TableHead>
                        <TableHead className="text-center">OEE (W/C)</TableHead>
                        <TableHead className="text-center">Defect (W/C)</TableHead>
                        <TableHead className="text-center">Tự động</TableHead>
                        <TableHead className="text-center">Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {thresholds?.map((threshold) => (
                        <TableRow key={threshold.id}>
                          <TableCell className="font-medium">{threshold.name}</TableCell>
                          <TableCell>{threshold.productionLineName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {threshold.predictionType === 'both' ? 'OEE + Defect' : 
                               threshold.predictionType === 'oee' ? 'OEE' : 'Defect'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-orange-600">{threshold.oeeWarningThreshold}%</span>
                            {' / '}
                            <span className="text-red-600">{threshold.oeeCriticalThreshold}%</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-orange-600">{threshold.defectWarningThreshold}%</span>
                            {' / '}
                            <span className="text-red-600">{threshold.defectCriticalThreshold}%</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {threshold.autoAdjustEnabled ? (
                              <CheckCircle className="w-4 h-4 text-green-500 inline" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {threshold.isActive ? (
                              <Badge className="bg-green-500">Hoạt động</Badge>
                            ) : (
                              <Badge variant="outline">Tắt</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSelectedThresholdId(threshold.id);
                                  checkAlertsMutation.mutate({ thresholdId: threshold.id });
                                }}
                                disabled={checkAlertsMutation.isPending}
                                title="Kiểm tra cảnh báo"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEdit(threshold)}
                                title="Chỉnh sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteMutation.mutate({ id: threshold.id })}
                                disabled={deleteMutation.isPending}
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!thresholds || thresholds.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Chưa có cấu hình ngưỡng nào. Nhấn "Tạo cấu hình mới" để bắt đầu.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử cảnh báo dự báo</CardTitle>
                <CardDescription>
                  Các cảnh báo được tạo từ hệ thống dự báo OEE và Defect Rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Tiêu đề</TableHead>
                      <TableHead className="text-center">Mức độ</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertHistory?.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="text-sm">
                          {new Date(alert.createdAt).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell className="font-medium">{alert.title}</TableCell>
                        <TableCell className="text-center">
                          {getSeverityBadge(alert.severity)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(alert.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {alert.status === 'pending' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => acknowledgeAlertMutation.mutate({ alertId: alert.id })}
                            >
                              Xác nhận
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!alertHistory || alertHistory.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Chưa có cảnh báo nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adjustments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử điều chỉnh ngưỡng tự động</CardTitle>
                <CardDescription>
                  Các điều chỉnh ngưỡng được thực hiện tự động bởi hệ thống AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-4">
                  <Select 
                    value={selectedThresholdId?.toString() || ''} 
                    onValueChange={(v) => setSelectedThresholdId(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Chọn cấu hình để xem lịch sử" />
                    </SelectTrigger>
                    <SelectContent>
                      {thresholds?.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedThresholdId && (
                    <Button 
                      variant="outline"
                      onClick={() => triggerAutoAdjustMutation.mutate({ thresholdId: selectedThresholdId })}
                      disabled={triggerAutoAdjustMutation.isPending}
                    >
                      {triggerAutoAdjustMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Chạy điều chỉnh ngay
                    </Button>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Loại ngưỡng</TableHead>
                      <TableHead className="text-center">Giá trị cũ</TableHead>
                      <TableHead className="text-center">Giá trị mới</TableHead>
                      <TableHead>Lý do</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustmentLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.adjustType.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{log.oldValue}%</TableCell>
                        <TableCell className="text-center font-medium">{log.newValue}%</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!adjustmentLogs || adjustmentLogs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {selectedThresholdId 
                            ? 'Chưa có điều chỉnh tự động nào cho cấu hình này'
                            : 'Vui lòng chọn cấu hình để xem lịch sử điều chỉnh'
                          }
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={!!editingThreshold} onOpenChange={(open) => !open && setEditingThreshold(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa cấu hình ngưỡng</DialogTitle>
              <DialogDescription>
                Cập nhật ngưỡng cảnh báo cho {editingThreshold?.name}
              </DialogDescription>
            </DialogHeader>
            <ThresholdForm 
              formData={formData} 
              setFormData={setFormData}
              productionLines={productionLines || []}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingThreshold(null)}>
                Hủy
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cập nhật
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Threshold Form Component
function ThresholdForm({ 
  formData, 
  setFormData, 
  productionLines 
}: { 
  formData: any; 
  setFormData: (data: any) => void;
  productionLines: any[];
}) {
  const [emailInput, setEmailInput] = useState('');

  const addEmail = () => {
    if (emailInput && !formData.alertEmails.includes(emailInput)) {
      setFormData({ ...formData, alertEmails: [...formData.alertEmails, emailInput] });
      setEmailInput('');
    }
  };

  const removeEmail = (email: string) => {
    setFormData({ 
      ...formData, 
      alertEmails: formData.alertEmails.filter((e: string) => e !== email) 
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tên cấu hình</Label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Ngưỡng Line 1"
            />
          </div>
          <div className="space-y-2">
            <Label>Dây chuyền sản xuất</Label>
            <Select 
              value={formData.productionLineId?.toString() || 'all'}
              onValueChange={(v) => setFormData({ 
                ...formData, 
                productionLineId: v === 'all' ? null : parseInt(v) 
              })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả dây chuyền</SelectItem>
                {productionLines.map((line) => (
                  <SelectItem key={line.id} value={line.id.toString()}>
                    {line.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Loại dự báo</Label>
          <Select 
            value={formData.predictionType}
            onValueChange={(v) => setFormData({ ...formData, predictionType: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="both">OEE + Defect Rate</SelectItem>
              <SelectItem value="oee">Chỉ OEE</SelectItem>
              <SelectItem value="defect_rate">Chỉ Defect Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* OEE Thresholds */}
      {(formData.predictionType === 'oee' || formData.predictionType === 'both') && (
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-green-500" />
            Ngưỡng OEE
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-orange-600">Cảnh báo khi OEE &lt;</Label>
              <div className="flex items-center gap-2">
                <Slider 
                  value={[formData.oeeWarningThreshold]}
                  onValueChange={([v]) => setFormData({ ...formData, oeeWarningThreshold: v })}
                  min={50}
                  max={95}
                  step={1}
                />
                <span className="w-12 text-right font-medium">{formData.oeeWarningThreshold}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-red-600">Nghiêm trọng khi OEE &lt;</Label>
              <div className="flex items-center gap-2">
                <Slider 
                  value={[formData.oeeCriticalThreshold]}
                  onValueChange={([v]) => setFormData({ ...formData, oeeCriticalThreshold: v })}
                  min={40}
                  max={90}
                  step={1}
                />
                <span className="w-12 text-right font-medium">{formData.oeeCriticalThreshold}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cảnh báo khi OEE giảm &gt;</Label>
              <div className="flex items-center gap-2">
                <Slider 
                  value={[formData.oeeDeclineThreshold]}
                  onValueChange={([v]) => setFormData({ ...formData, oeeDeclineThreshold: v })}
                  min={1}
                  max={20}
                  step={0.5}
                />
                <span className="w-12 text-right font-medium">{formData.oeeDeclineThreshold}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Defect Rate Thresholds */}
      {(formData.predictionType === 'defect_rate' || formData.predictionType === 'both') && (
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Bug className="w-4 h-4 text-red-500" />
            Ngưỡng Tỷ lệ lỗi
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-orange-600">Cảnh báo khi Defect &gt;</Label>
              <div className="flex items-center gap-2">
                <Slider 
                  value={[formData.defectWarningThreshold]}
                  onValueChange={([v]) => setFormData({ ...formData, defectWarningThreshold: v })}
                  min={0.5}
                  max={10}
                  step={0.1}
                />
                <span className="w-12 text-right font-medium">{formData.defectWarningThreshold}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-red-600">Nghiêm trọng khi Defect &gt;</Label>
              <div className="flex items-center gap-2">
                <Slider 
                  value={[formData.defectCriticalThreshold]}
                  onValueChange={([v]) => setFormData({ ...formData, defectCriticalThreshold: v })}
                  min={1}
                  max={15}
                  step={0.1}
                />
                <span className="w-12 text-right font-medium">{formData.defectCriticalThreshold}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cảnh báo khi Defect tăng &gt;</Label>
              <div className="flex items-center gap-2">
                <Slider 
                  value={[formData.defectIncreaseThreshold]}
                  onValueChange={([v]) => setFormData({ ...formData, defectIncreaseThreshold: v })}
                  min={5}
                  max={50}
                  step={1}
                />
                <span className="w-12 text-right font-medium">{formData.defectIncreaseThreshold}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Auto Adjust */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              Tự động điều chỉnh ngưỡng
            </h4>
            <p className="text-sm text-muted-foreground">
              Hệ thống sẽ tự động điều chỉnh ngưỡng dựa trên dữ liệu lịch sử
            </p>
          </div>
          <Switch 
            checked={formData.autoAdjustEnabled}
            onCheckedChange={(v) => setFormData({ ...formData, autoAdjustEnabled: v })}
          />
        </div>

        {formData.autoAdjustEnabled && (
          <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-blue-200">
            <div className="space-y-2">
              <Label>Độ nhạy</Label>
              <Select 
                value={formData.autoAdjustSensitivity}
                onValueChange={(v) => setFormData({ ...formData, autoAdjustSensitivity: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thấp (ít điều chỉnh)</SelectItem>
                  <SelectItem value="medium">Trung bình</SelectItem>
                  <SelectItem value="high">Cao (điều chỉnh thường xuyên)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chu kỳ phân tích (ngày)</Label>
              <Input 
                type="number"
                value={formData.autoAdjustPeriodDays}
                onChange={(e) => setFormData({ ...formData, autoAdjustPeriodDays: parseInt(e.target.value) || 30 })}
                min={7}
                max={365}
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Notification Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-500" />
              Thông báo qua Email
            </h4>
            <p className="text-sm text-muted-foreground">
              Gửi cảnh báo qua email khi vượt ngưỡng
            </p>
          </div>
          <Switch 
            checked={formData.emailAlertEnabled}
            onCheckedChange={(v) => setFormData({ ...formData, emailAlertEnabled: v })}
          />
        </div>

        {formData.emailAlertEnabled && (
          <div className="space-y-4 pl-4 border-l-2 border-purple-200">
            <div className="space-y-2">
              <Label>Tần suất gửi</Label>
              <Select 
                value={formData.alertFrequency}
                onValueChange={(v) => setFormData({ ...formData, alertFrequency: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Ngay lập tức</SelectItem>
                  <SelectItem value="hourly">Tổng hợp mỗi giờ</SelectItem>
                  <SelectItem value="daily">Tổng hợp hàng ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Danh sách email nhận cảnh báo</Label>
              <div className="flex gap-2">
                <Input 
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="email@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                />
                <Button type="button" variant="outline" onClick={addEmail}>
                  Thêm
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.alertEmails.map((email: string) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button 
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
