import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  Power, 
  Activity,
  CheckCircle,
  Clock,
  Zap
} from "lucide-react";

export default function AutoResolveSettings() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    alertType: "",
    isActive: true,
    metricThreshold: "",
    metricOperator: "lt" as "gt" | "gte" | "lt" | "lte" | "eq",
    consecutiveOkCount: 3,
    autoResolveAfterMinutes: 30,
    notifyOnAutoResolve: true,
    notificationChannels: "",
  });
  
  const { data: configs, isLoading, refetch } = trpc.autoResolve.getList.useQuery();
  const { data: stats } = trpc.autoResolve.getStats.useQuery();
  const { data: alertTypes } = trpc.autoResolve.getAlertTypes.useQuery();
  const { data: logs } = trpc.autoResolve.getLogs.useQuery({ page: 1, pageSize: 10 });
  
  const createMutation = trpc.autoResolve.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo cấu hình auto-resolve");
      refetch();
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const updateMutation = trpc.autoResolve.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật cấu hình");
      refetch();
      setEditingConfig(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const deleteMutation = trpc.autoResolve.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa cấu hình");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const toggleActiveMutation = trpc.autoResolve.toggleActive.useMutation({
    onSuccess: (result) => {
      toast.success(result.isActive ? "Đã bật cấu hình" : "Đã tắt cấu hình");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      alertType: "",
      isActive: true,
      metricThreshold: "",
      metricOperator: "lt",
      consecutiveOkCount: 3,
      autoResolveAfterMinutes: 30,
      notifyOnAutoResolve: true,
      notificationChannels: "",
    });
  };
  
  const handleCreate = () => {
    if (!formData.name || !formData.alertType) {
      toast.error("Vui lòng nhập tên và loại cảnh báo");
      return;
    }
    
    createMutation.mutate({
      ...formData,
      metricThreshold: formData.metricThreshold ? parseFloat(formData.metricThreshold) : undefined,
    });
  };
  
  const handleUpdate = () => {
    if (!editingConfig) return;
    
    updateMutation.mutate({
      id: editingConfig.id,
      ...formData,
      metricThreshold: formData.metricThreshold ? parseFloat(formData.metricThreshold) : undefined,
    });
  };
  
  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      description: config.description || "",
      alertType: config.alertType,
      isActive: config.isActive,
      metricThreshold: config.metricThreshold?.toString() || "",
      metricOperator: config.metricOperator || "lt",
      consecutiveOkCount: config.consecutiveOkCount,
      autoResolveAfterMinutes: config.autoResolveAfterMinutes,
      notifyOnAutoResolve: config.notifyOnAutoResolve,
      notificationChannels: config.notificationChannels || "",
    });
  };
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  const ConfigForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tên cấu hình *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="VD: Auto-resolve CPK Warning"
          />
        </div>
        <div className="space-y-2">
          <Label>Loại cảnh báo *</Label>
          <Select
            value={formData.alertType}
            onValueChange={(v) => setFormData({ ...formData, alertType: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn loại cảnh báo" />
            </SelectTrigger>
            <SelectContent>
              {alertTypes?.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Mô tả</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Mô tả cấu hình..."
          rows={2}
        />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Ngưỡng metric</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.metricThreshold}
            onChange={(e) => setFormData({ ...formData, metricThreshold: e.target.value })}
            placeholder="VD: 1.33"
          />
        </div>
        <div className="space-y-2">
          <Label>Toán tử</Label>
          <Select
            value={formData.metricOperator}
            onValueChange={(v) => setFormData({ ...formData, metricOperator: v as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gt">Lớn hơn (&gt;)</SelectItem>
              <SelectItem value="gte">Lớn hơn hoặc bằng (≥)</SelectItem>
              <SelectItem value="lt">Nhỏ hơn (&lt;)</SelectItem>
              <SelectItem value="lte">Nhỏ hơn hoặc bằng (≤)</SelectItem>
              <SelectItem value="eq">Bằng (=)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Số lần OK liên tiếp</Label>
          <Input
            type="number"
            min={1}
            value={formData.consecutiveOkCount}
            onChange={(e) => setFormData({ ...formData, consecutiveOkCount: parseInt(e.target.value) || 3 })}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tự động giải quyết sau (phút)</Label>
          <Input
            type="number"
            min={1}
            value={formData.autoResolveAfterMinutes}
            onChange={(e) => setFormData({ ...formData, autoResolveAfterMinutes: parseInt(e.target.value) || 30 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Kênh thông báo</Label>
          <Input
            value={formData.notificationChannels}
            onChange={(e) => setFormData({ ...formData, notificationChannels: e.target.value })}
            placeholder="email, sms, webhook"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
          <Label>Kích hoạt</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.notifyOnAutoResolve}
            onCheckedChange={(checked) => setFormData({ ...formData, notifyOnAutoResolve: checked })}
          />
          <Label>Thông báo khi tự động giải quyết</Label>
        </div>
      </div>
    </div>
  );
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Auto-resolve Settings</h1>
            <p className="text-muted-foreground">Cấu hình tự động giải quyết alerts khi metrics trở lại bình thường</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm cấu hình
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tạo cấu hình Auto-resolve</DialogTitle>
                <DialogDescription>
                  Thiết lập điều kiện để tự động giải quyết alerts
                </DialogDescription>
              </DialogHeader>
              <ConfigForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang tạo..." : "Tạo cấu hình"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng cấu hình</p>
                  <p className="text-2xl font-bold">{stats?.totalConfigs || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Power className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                  <p className="text-2xl font-bold">{stats?.activeConfigs || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng auto-resolved</p>
                  <p className="text-2xl font-bold">{stats?.totalAutoResolved || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hôm nay</p>
                  <p className="text-2xl font-bold">{stats?.todayAutoResolved || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Config List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách cấu hình</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {configs?.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${config.isActive ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-800"}`}>
                      <Activity className={`h-5 w-5 ${config.isActive ? "text-green-600 dark:text-green-400" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.name}</span>
                        <Badge variant="outline">{config.alertType}</Badge>
                        {config.isActive ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Đang bật
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Đã tắt</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {config.description || `Tự động giải quyết sau ${config.autoResolveAfterMinutes} phút hoặc ${config.consecutiveOkCount} lần OK liên tiếp`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({ id: config.id })}
                    >
                      <Power className={`h-4 w-4 ${config.isActive ? "text-green-600" : "text-gray-400"}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Bạn có chắc muốn xóa cấu hình này?")) {
                          deleteMutation.mutate({ id: config.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!configs || configs.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có cấu hình auto-resolve nào
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Lịch sử Auto-resolve gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs?.logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.alertType}</Badge>
                      {log.notificationSent && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          Đã thông báo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{log.reason}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
              ))}
              {(!logs?.logs || logs.logs.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có lịch sử auto-resolve
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Edit Dialog */}
        <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa cấu hình</DialogTitle>
            </DialogHeader>
            <ConfigForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingConfig(null)}>
                Hủy
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
