import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Plus, AlertTriangle, Target, Gauge, Loader2, Trash2, Edit, Factory, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface OeeThreshold {
  id: number;
  productionLineId: number | null;
  targetOee: number;
  warningThreshold: number;
  criticalThreshold: number;
  dropAlertThreshold: number;
  relativeDropThreshold: number;
  availabilityTarget: number | null;
  performanceTarget: number | null;
  qualityTarget: number | null;
  isActive: boolean;
}

export default function OeeThresholdsByLine() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<OeeThreshold | null>(null);
  const [formData, setFormData] = useState({
    productionLineId: '',
    targetOee: 85,
    warningThreshold: 80,
    criticalThreshold: 70,
    dropAlertThreshold: 5,
    relativeDropThreshold: 10,
    availabilityTarget: 90,
    performanceTarget: 95,
    qualityTarget: 99,
  });

  const { data: thresholds, isLoading, refetch } = trpc.oeeThresholds.getAll.useQuery({});
  const { data: productionLines } = trpc.productionLine.getAll.useQuery({});

  const createMutation = trpc.oeeThresholds.create.useMutation({
    onSuccess: () => {
      toast.success('Đã tạo cấu hình ngưỡng OEE');
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (e) => toast.error(`Lỗi: ${e.message}`)
  });

  const updateMutation = trpc.oeeThresholds.update.useMutation({
    onSuccess: () => {
      toast.success('Đã cập nhật cấu hình');
      setEditingThreshold(null);
      resetForm();
      refetch();
    },
    onError: (e) => toast.error(`Lỗi: ${e.message}`)
  });

  const deleteMutation = trpc.oeeThresholds.delete.useMutation({
    onSuccess: () => {
      toast.success('Đã xóa cấu hình');
      refetch();
    },
    onError: (e) => toast.error(`Lỗi: ${e.message}`)
  });

  const toggleMutation = trpc.oeeThresholds.toggle.useMutation({
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái');
      refetch();
    },
    onError: (e) => toast.error(`Lỗi: ${e.message}`)
  });

  const resetForm = () => {
    setFormData({
      productionLineId: '',
      targetOee: 85,
      warningThreshold: 80,
      criticalThreshold: 70,
      dropAlertThreshold: 5,
      relativeDropThreshold: 10,
      availabilityTarget: 90,
      performanceTarget: 95,
      qualityTarget: 99,
    });
  };

  const handleCreate = () => {
    if (formData.warningThreshold <= formData.criticalThreshold) {
      toast.error('Ngưỡng Warning phải lớn hơn ngưỡng Critical');
      return;
    }
    createMutation.mutate({
      productionLineId: formData.productionLineId && formData.productionLineId !== 'default' ? parseInt(formData.productionLineId) : undefined,
      targetOee: formData.targetOee,
      warningThreshold: formData.warningThreshold,
      criticalThreshold: formData.criticalThreshold,
      dropAlertThreshold: formData.dropAlertThreshold,
      relativeDropThreshold: formData.relativeDropThreshold,
      availabilityTarget: formData.availabilityTarget,
      performanceTarget: formData.performanceTarget,
      qualityTarget: formData.qualityTarget,
    });
  };

  const handleUpdate = () => {
    if (!editingThreshold) return;
    if (formData.warningThreshold <= formData.criticalThreshold) {
      toast.error('Ngưỡng Warning phải lớn hơn ngưỡng Critical');
      return;
    }
    updateMutation.mutate({
      id: editingThreshold.id,
      targetOee: formData.targetOee,
      warningThreshold: formData.warningThreshold,
      criticalThreshold: formData.criticalThreshold,
      dropAlertThreshold: formData.dropAlertThreshold,
      relativeDropThreshold: formData.relativeDropThreshold,
      availabilityTarget: formData.availabilityTarget,
      performanceTarget: formData.performanceTarget,
      qualityTarget: formData.qualityTarget,
    });
  };

  const openEditDialog = (threshold: OeeThreshold) => {
    setEditingThreshold(threshold);
    setFormData({
      productionLineId: threshold.productionLineId?.toString() || '',
      targetOee: Number(threshold.targetOee),
      warningThreshold: Number(threshold.warningThreshold),
      criticalThreshold: Number(threshold.criticalThreshold),
      dropAlertThreshold: Number(threshold.dropAlertThreshold),
      relativeDropThreshold: Number(threshold.relativeDropThreshold),
      availabilityTarget: Number(threshold.availabilityTarget) || 90,
      performanceTarget: Number(threshold.performanceTarget) || 95,
      qualityTarget: Number(threshold.qualityTarget) || 99,
    });
  };

  const getProductionLineName = (lineId: number | null) => {
    if (!lineId) return 'Mặc định (Tất cả)';
    const line = productionLines?.find((l: any) => l.id === lineId);
    return line?.name || `Line #${lineId}`;
  };

  const ThresholdForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-6 py-4">
      {!isEdit && (
        <div className="space-y-2">
          <Label>Dây chuyền sản xuất</Label>
          <Select value={formData.productionLineId} onValueChange={(v) => setFormData({ ...formData, productionLineId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn dây chuyền (để trống = mặc định)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Mặc định (Tất cả)</SelectItem>
              {productionLines?.map((line: any) => (
                <SelectItem key={line.id} value={line.id.toString()}>
                  {line.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Để trống để áp dụng cho tất cả dây chuyền không có cấu hình riêng</p>
        </div>
      )}

      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Ngưỡng OEE tổng thể
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Target: {formData.targetOee}%
            </Label>
            <Slider 
              value={[formData.targetOee]} 
              onValueChange={([v]) => setFormData({ ...formData, targetOee: v })} 
              min={50} max={100} step={1}
            />
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              Warning: {formData.warningThreshold}%
            </Label>
            <Slider 
              value={[formData.warningThreshold]} 
              onValueChange={([v]) => setFormData({ ...formData, warningThreshold: v })} 
              min={40} max={100} step={1}
            />
          </div>
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              Critical: {formData.criticalThreshold}%
            </Label>
            <Slider 
              value={[formData.criticalThreshold]} 
              onValueChange={([v]) => setFormData({ ...formData, criticalThreshold: v })} 
              min={30} max={100} step={1}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Ngưỡng cảnh báo sụt giảm
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Sụt giảm tuyệt đối: {formData.dropAlertThreshold}%</Label>
            <Slider 
              value={[formData.dropAlertThreshold]} 
              onValueChange={([v]) => setFormData({ ...formData, dropAlertThreshold: v })} 
              min={1} max={20} step={1}
            />
            <p className="text-xs text-muted-foreground">Cảnh báo khi OEE giảm X% so với kỳ trước</p>
          </div>
          <div className="space-y-2">
            <Label>Sụt giảm tương đối: {formData.relativeDropThreshold}%</Label>
            <Slider 
              value={[formData.relativeDropThreshold]} 
              onValueChange={([v]) => setFormData({ ...formData, relativeDropThreshold: v })} 
              min={5} max={50} step={1}
            />
            <p className="text-xs text-muted-foreground">Cảnh báo khi OEE giảm X% tương đối</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Ngưỡng thành phần OEE (A × P × Q)
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Availability: {formData.availabilityTarget}%</Label>
            <Slider 
              value={[formData.availabilityTarget]} 
              onValueChange={([v]) => setFormData({ ...formData, availabilityTarget: v })} 
              min={50} max={100} step={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Performance: {formData.performanceTarget}%</Label>
            <Slider 
              value={[formData.performanceTarget]} 
              onValueChange={([v]) => setFormData({ ...formData, performanceTarget: v })} 
              min={50} max={100} step={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Quality: {formData.qualityTarget}%</Label>
            <Slider 
              value={[formData.qualityTarget]} 
              onValueChange={([v]) => setFormData({ ...formData, qualityTarget: v })} 
              min={50} max={100} step={1}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-blue-500" />
              Cấu hình Ngưỡng OEE theo Dây chuyền
            </h1>
            <p className="text-muted-foreground">
              Thiết lập ngưỡng cảnh báo OEE riêng cho từng dây chuyền sản xuất
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />Thêm cấu hình
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo cấu hình ngưỡng OEE</DialogTitle>
                <DialogDescription>
                  Thiết lập ngưỡng cảnh báo OEE cho dây chuyền sản xuất cụ thể
                </DialogDescription>
              </DialogHeader>
              <ThresholdForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Tạo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Tổng cấu hình</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{thresholds?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Đang hoạt động</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {thresholds?.filter((t: any) => t.isActive).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Dây chuyền có cấu hình</CardTitle>
              <Factory className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {thresholds?.filter((t: any) => t.productionLineId).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Ngưỡng Critical TB</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {thresholds?.length ? 
                  (thresholds.reduce((sum: number, t: any) => sum + Number(t.criticalThreshold), 0) / thresholds.length).toFixed(0) 
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Thresholds Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách cấu hình ngưỡng</CardTitle>
            <CardDescription>
              Cấu hình ngưỡng OEE cho từng dây chuyền. Dây chuyền không có cấu hình riêng sẽ sử dụng cấu hình mặc định.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !thresholds?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có cấu hình ngưỡng OEE</p>
                <p className="text-sm">Nhấn "Thêm cấu hình" để tạo mới</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dây chuyền</TableHead>
                    <TableHead>Target OEE</TableHead>
                    <TableHead>Warning</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>A / P / Q</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thresholds.map((threshold: any) => (
                    <TableRow key={threshold.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Factory className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {getProductionLineName(threshold.productionLineId)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700">
                          <Target className="h-3 w-3 mr-1" />
                          {Number(threshold.targetOee).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-100 text-yellow-700">
                          {Number(threshold.warningThreshold).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-100 text-red-700">
                          {Number(threshold.criticalThreshold).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-blue-600">{Number(threshold.availabilityTarget || 90).toFixed(0)}%</span>
                        {' / '}
                        <span className="text-purple-600">{Number(threshold.performanceTarget || 95).toFixed(0)}%</span>
                        {' / '}
                        <span className="text-green-600">{Number(threshold.qualityTarget || 99).toFixed(0)}%</span>
                      </TableCell>
                      <TableCell>
                        <Switch 
                          checked={threshold.isActive} 
                          onCheckedChange={() => toggleMutation.mutate({ id: threshold.id, isActive: !threshold.isActive })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(threshold)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              if (confirm('Bạn có chắc muốn xóa cấu hình này?')) {
                                deleteMutation.mutate({ id: threshold.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingThreshold} onOpenChange={(open) => !open && setEditingThreshold(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa cấu hình ngưỡng OEE</DialogTitle>
              <DialogDescription>
                {editingThreshold && getProductionLineName(editingThreshold.productionLineId)}
              </DialogDescription>
            </DialogHeader>
            <ThresholdForm isEdit />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingThreshold(null)}>Hủy</Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
