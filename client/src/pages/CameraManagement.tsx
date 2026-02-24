import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Camera, Video, Wifi, WifiOff, AlertCircle, CheckCircle, Play, Loader2, Settings } from "lucide-react";

type CameraType = 'avi' | 'aoi' | 'ip_camera' | 'usb_camera' | 'rtsp' | 'http_stream';
type AnalysisType = 'defect_detection' | 'quality_inspection' | 'measurement' | 'ocr' | 'custom';
type CameraStatus = 'active' | 'inactive' | 'error' | 'disconnected';

interface CameraFormData {
  name: string;
  description: string;
  cameraType: CameraType;
  connectionUrl: string;
  username: string;
  password: string;
  apiKey: string;
  analysisType: AnalysisType;
  alertEnabled: boolean;
  alertThreshold: number;
  alertEmails: string;
}

const defaultFormData: CameraFormData = {
  name: '',
  description: '',
  cameraType: 'ip_camera',
  connectionUrl: '',
  username: '',
  password: '',
  apiKey: '',
  analysisType: 'quality_inspection',
  alertEnabled: true,
  alertThreshold: 0.8,
  alertEmails: '',
};

const cameraTypeLabels: Record<CameraType, string> = {
  avi: 'AVI Camera',
  aoi: 'AOI Camera',
  ip_camera: 'IP Camera',
  usb_camera: 'USB Camera',
  rtsp: 'RTSP Stream',
  http_stream: 'HTTP Stream',
};

const analysisTypeLabels: Record<AnalysisType, string> = {
  defect_detection: 'Phát hiện lỗi',
  quality_inspection: 'Kiểm tra chất lượng',
  measurement: 'Đo lường',
  ocr: 'Nhận dạng ký tự',
  custom: 'Tùy chỉnh',
};

const statusConfig: Record<CameraStatus, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: 'Hoạt động', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  inactive: { label: 'Không hoạt động', color: 'bg-gray-500', icon: <WifiOff className="h-4 w-4 text-gray-500" /> },
  error: { label: 'Lỗi', color: 'bg-red-500', icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
  disconnected: { label: 'Mất kết nối', color: 'bg-yellow-500', icon: <Wifi className="h-4 w-4 text-yellow-500" /> },
};

export default function CameraManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<number | null>(null);
  const [formData, setFormData] = useState<CameraFormData>(defaultFormData);

  const utils = trpc.useUtils();
  const { data: cameras, isLoading } = trpc.cameraConfig.list.useQuery();
  const { data: stats } = trpc.cameraConfig.getStats.useQuery();
  
  const createMutation = trpc.cameraConfig.create.useMutation({
    onSuccess: () => {
      toast.success('Thêm camera thành công');
      setIsCreateOpen(false);
      setFormData(defaultFormData);
      utils.cameraConfig.list.invalidate();
      utils.cameraConfig.getStats.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.cameraConfig.update.useMutation({
    onSuccess: () => {
      toast.success('Cập nhật camera thành công');
      setEditingCamera(null);
      setFormData(defaultFormData);
      utils.cameraConfig.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.cameraConfig.delete.useMutation({
    onSuccess: () => {
      toast.success('Xóa camera thành công');
      utils.cameraConfig.list.invalidate();
      utils.cameraConfig.getStats.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const testConnectionMutation = trpc.cameraConfig.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message || 'Kết nối thành công');
      } else {
        toast.error(result.error || 'Kết nối thất bại');
      }
      utils.cameraConfig.list.invalidate();
      utils.cameraConfig.getStats.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      description: formData.description || undefined,
      cameraType: formData.cameraType,
      connectionUrl: formData.connectionUrl,
      username: formData.username || undefined,
      password: formData.password || undefined,
      apiKey: formData.apiKey || undefined,
      analysisType: formData.analysisType,
      alertEnabled: formData.alertEnabled,
      alertThreshold: formData.alertThreshold,
      alertEmails: formData.alertEmails || undefined,
    };

    if (editingCamera) {
      updateMutation.mutate({ id: editingCamera, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (camera: any) => {
    setFormData({
      name: camera.name,
      description: camera.description || '',
      cameraType: camera.cameraType,
      connectionUrl: camera.connectionUrl,
      username: camera.username || '',
      password: camera.password || '',
      apiKey: camera.apiKey || '',
      analysisType: camera.analysisType || 'quality_inspection',
      alertEnabled: camera.alertEnabled === 1,
      alertThreshold: parseFloat(camera.alertThreshold || '0.8'),
      alertEmails: camera.alertEmails || '',
    });
    setEditingCamera(camera.id);
    setIsCreateOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Camera</h1>
            <p className="text-muted-foreground">Cấu hình camera AVI/AOI cho phân tích hình ảnh realtime</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setEditingCamera(null);
              setFormData(defaultFormData);
            }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Thêm Camera</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingCamera ? 'Chỉnh sửa Camera' : 'Thêm Camera mới'}</DialogTitle>
                <DialogDescription>Cấu hình kết nối và phân tích cho camera</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tên camera *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nhập tên camera" />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại camera *</Label>
                    <Select value={formData.cameraType} onValueChange={(v) => setFormData({ ...formData, cameraType: v as CameraType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(cameraTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>URL kết nối *</Label>
                  <Input value={formData.connectionUrl} onChange={(e) => setFormData({ ...formData, connectionUrl: e.target.value })} placeholder="rtsp://192.168.1.100:554/stream" />
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả camera" rows={2} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input value={formData.apiKey} onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Loại phân tích</Label>
                  <Select value={formData.analysisType} onValueChange={(v) => setFormData({ ...formData, analysisType: v as AnalysisType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(analysisTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium">Cấu hình cảnh báo</h4>
                  <div className="flex items-center gap-2">
                    <Switch checked={formData.alertEnabled} onCheckedChange={(checked) => setFormData({ ...formData, alertEnabled: checked })} />
                    <Label>Bật cảnh báo khi phát hiện lỗi</Label>
                  </div>
                  {formData.alertEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label>Ngưỡng cảnh báo (0-1)</Label>
                        <Input type="number" min={0} max={1} step={0.05} value={formData.alertThreshold} onChange={(e) => setFormData({ ...formData, alertThreshold: parseFloat(e.target.value) || 0.8 })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email nhận cảnh báo</Label>
                        <Input value={formData.alertEmails} onChange={(e) => setFormData({ ...formData, alertEmails: e.target.value })} placeholder="email1@example.com, email2@example.com" />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={!formData.name || !formData.connectionUrl}>{editingCamera ? 'Cập nhật' : 'Thêm'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Tổng số</p><p className="text-2xl font-bold">{stats.total}</p></div><Camera className="h-8 w-8 text-muted-foreground" /></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Hoạt động</p><p className="text-2xl font-bold text-green-500">{stats.active}</p></div><CheckCircle className="h-8 w-8 text-green-500" /></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Không hoạt động</p><p className="text-2xl font-bold text-gray-500">{stats.inactive}</p></div><WifiOff className="h-8 w-8 text-gray-500" /></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Lỗi</p><p className="text-2xl font-bold text-red-500">{stats.error}</p></div><AlertCircle className="h-8 w-8 text-red-500" /></div></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Mất kết nối</p><p className="text-2xl font-bold text-yellow-500">{stats.disconnected}</p></div><Wifi className="h-8 w-8 text-yellow-500" /></div></CardContent></Card>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : cameras?.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center h-64"><Video className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground">Chưa có camera nào</p><Button className="mt-4" onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Thêm Camera đầu tiên</Button></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cameras?.map((camera) => (
              <Card key={camera.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${statusConfig[camera.status as CameraStatus]?.color}`} />
                      <CardTitle className="text-lg">{camera.name}</CardTitle>
                    </div>
                    {statusConfig[camera.status as CameraStatus]?.icon}
                  </div>
                  <CardDescription className="line-clamp-2">{camera.description || camera.connectionUrl}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">{cameraTypeLabels[camera.cameraType as CameraType]}</Badge>
                    <Badge variant="secondary">{analysisTypeLabels[camera.analysisType as AnalysisType]}</Badge>
                    <Badge variant={camera.status === 'active' ? 'default' : 'secondary'}>{statusConfig[camera.status as CameraStatus]?.label}</Badge>
                  </div>
                  {camera.lastConnectedAt && <p className="text-xs text-muted-foreground mb-2">Kết nối lần cuối: {new Date(camera.lastConnectedAt).toLocaleString('vi-VN')}</p>}
                  {camera.lastErrorMessage && <p className="text-xs text-destructive mb-2 line-clamp-2">Lỗi: {camera.lastErrorMessage}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => testConnectionMutation.mutate({ id: camera.id })} disabled={testConnectionMutation.isPending}>{testConnectionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}</Button>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(camera)}><Settings className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => { if (confirm('Bạn có chắc muốn xóa camera này?')) deleteMutation.mutate({ id: camera.id }); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
