import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FloorPlanDesigner, FloorPlanConfig, FloorPlanItem } from '@/components/FloorPlanDesigner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  Plus,
  FolderOpen,
  Trash2,
  Edit,
  Eye,
  Map,
  Save,
} from 'lucide-react';

export default function FloorPlanDesignerPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isDesigning, setIsDesigning] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<FloorPlanConfig | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanLineId, setNewPlanLineId] = useState<string>('');

  // Queries
  const { data: floorPlans, refetch: refetchPlans } = trpc.floorPlan.list.useQuery();
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: machines } = trpc.machine.list.useQuery();

  // Mutations
  const createMutation = trpc.floorPlan.create.useMutation({
    onSuccess: (result) => {
      toast.success('Đã tạo sơ đồ mới');
      setIsCreateDialogOpen(false);
      refetchPlans();
      // Open designer with new plan
      setSelectedPlanId(result.id);
      setCurrentConfig({
        id: result.id,
        name: newPlanName,
        width: 1200,
        height: 800,
        gridSize: 20,
        showGrid: true,
        items: [],
      });
      setIsDesigning(true);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.floorPlan.update.useMutation({
    onSuccess: () => {
      toast.success('Đã lưu sơ đồ');
      refetchPlans();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.floorPlan.delete.useMutation({
    onSuccess: () => {
      toast.success('Đã xóa sơ đồ');
      refetchPlans();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCreatePlan = () => {
    if (!newPlanName.trim()) {
      toast.error('Vui lòng nhập tên sơ đồ');
      return;
    }
    createMutation.mutate({
      name: newPlanName,
      productionLineId: newPlanLineId ? parseInt(newPlanLineId) : undefined,
      width: 1200,
      height: 800,
      gridSize: 20,
    });
  };

  const handleOpenPlan = (plan: any) => {
    const items: FloorPlanItem[] = (plan.machinePositions as any[] || []).map((pos: any, index: number) => ({
      id: pos.id || `item-${index}`,
      type: pos.type || 'machine',
      name: pos.name || `Item ${index + 1}`,
      x: pos.x || 0,
      y: pos.y || 0,
      width: pos.width || 80,
      height: pos.height || 60,
      rotation: pos.rotation || 0,
      color: pos.color || '#3b82f6',
      machineId: pos.machineId,
      status: pos.status,
      metadata: pos.metadata,
    }));

    setCurrentConfig({
      id: plan.id,
      name: plan.name,
      width: plan.width || 1200,
      height: plan.height || 800,
      gridSize: plan.gridSize || 20,
      showGrid: true,
      items,
    });
    setSelectedPlanId(plan.id);
    setIsDesigning(true);
  };

  const handleSaveConfig = (config: FloorPlanConfig) => {
    if (!config.id) return;

    const machinePositions = config.items.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation,
      color: item.color,
      machineId: item.machineId,
      status: item.status,
      metadata: item.metadata,
    }));

    updateMutation.mutate({
      id: config.id,
      name: config.name,
      width: config.width,
      height: config.height,
      gridSize: config.gridSize,
      machinePositions,
    });
  };

  const handleDeletePlan = (id: number) => {
    if (confirm('Xác nhận xóa sơ đồ này?')) {
      deleteMutation.mutate({ id });
    }
  };

  // Convert machines to format for designer
  const machineList = machines?.map((m: any) => ({
    id: m.id,
    name: m.name,
    status: 'idle' as const,
  })) || [];

  if (isDesigning && currentConfig) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-120px)]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Thiết kế: {currentConfig.name}</h1>
            <Button variant="outline" onClick={() => setIsDesigning(false)}>
              Quay lại danh sách
            </Button>
          </div>
          <FloorPlanDesigner
            initialConfig={currentConfig}
            onSave={handleSaveConfig}
            machines={machineList}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Thiết kế Sơ đồ Nhà máy</h1>
            <p className="text-muted-foreground">
              Tạo và quản lý layout nhà máy với drag-and-drop
            </p>
          </div>
          <Button onClick={() => {
            setNewPlanName('');
            setNewPlanLineId('');
            setIsCreateDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Tạo sơ đồ mới
          </Button>
        </div>

        {/* Floor plans list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5" />
              Danh sách Sơ đồ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên sơ đồ</TableHead>
                  <TableHead>Dây chuyền</TableHead>
                  <TableHead>Kích thước</TableHead>
                  <TableHead>Số đối tượng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {floorPlans?.map((plan: any) => {
                  const positions = plan.machinePositions as any[] || [];
                  const line = productionLines?.find((l: any) => l.id === plan.productionLineId);
                  
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>
                        {line ? (
                          <Badge variant="outline">{line.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{plan.width} x {plan.height}</TableCell>
                      <TableCell>{positions.length}</TableCell>
                      <TableCell>
                        <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                          {plan.isActive ? 'Hoạt động' : 'Ẩn'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(plan.updatedAt).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPlan(plan)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Sửa
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePlan(plan.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!floorPlans || floorPlans.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Chưa có sơ đồ nào</p>
                      <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo sơ đồ đầu tiên
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo sơ đồ mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tên sơ đồ</Label>
                <Input
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="VD: Sơ đồ nhà máy A"
                />
              </div>
              <div className="space-y-2">
                <Label>Dây chuyền (tùy chọn)</Label>
                <Select value={newPlanLineId} onValueChange={setNewPlanLineId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dây chuyền" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không chọn</SelectItem>
                    {productionLines?.map((line: any) => (
                      <SelectItem key={line.id} value={String(line.id)}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreatePlan} disabled={createMutation.isPending}>
                Tạo mới
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
