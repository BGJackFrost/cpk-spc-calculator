import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Settings,
  Target,
  Factory,
  Cpu,
  Search,
  RefreshCw,
} from "lucide-react";
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

interface ThresholdFormData {
  productionLineId?: number;
  machineId?: number;
  targetOee: number;
  warningThreshold: number;
  criticalThreshold: number;
  dropAlertThreshold: number;
  relativeDropThreshold: number;
  availabilityTarget: number;
  performanceTarget: number;
  qualityTarget: number;
}

const defaultFormData: ThresholdFormData = {
  targetOee: 85,
  warningThreshold: 80,
  criticalThreshold: 70,
  dropAlertThreshold: 5,
  relativeDropThreshold: 10,
  availabilityTarget: 90,
  performanceTarget: 95,
  qualityTarget: 99,
};

export default function OeeAlertThresholdSettings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ThresholdFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Queries
  const { data: thresholds, isLoading, refetch } = trpc.oee.listAlertThresholds.useQuery();
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: machines } = trpc.machine.list.useQuery();

  // Mutations
  const createMutation = trpc.oee.createAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo ngưỡng cảnh báo mới");
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const updateMutation = trpc.oee.updateAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật ngưỡng cảnh báo");
      setIsDialogOpen(false);
      setEditingId(null);
      setFormData(defaultFormData);
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const deleteMutation = trpc.oee.deleteAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa ngưỡng cảnh báo");
      setDeleteId(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const handleSubmit = () => {
    const data = {
      ...formData,
      productionLineId: formData.productionLineId || undefined,
      machineId: formData.machineId || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (threshold: NonNullable<typeof thresholds>[number]) => {
    setEditingId(threshold.id);
    setFormData({
      productionLineId: threshold.productionLineId ?? undefined,
      machineId: threshold.machineId ?? undefined,
      targetOee: Number(threshold.targetOee),
      warningThreshold: Number(threshold.warningThreshold),
      criticalThreshold: Number(threshold.criticalThreshold),
      dropAlertThreshold: Number(threshold.dropAlertThreshold),
      relativeDropThreshold: Number(threshold.relativeDropThreshold),
      availabilityTarget: Number(threshold.availabilityTarget || 90),
      performanceTarget: Number(threshold.performanceTarget || 95),
      qualityTarget: Number(threshold.qualityTarget || 99),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  const openNewDialog = () => {
    setEditingId(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  // Determine threshold type based on machineId and productionLineId
  const getThresholdType = (threshold: NonNullable<typeof thresholds>[number]) => {
    if (threshold.machineId) return "machine";
    if (threshold.productionLineId) return "line";
    return "global";
  };

  // Filter thresholds
  const filteredThresholds = thresholds?.filter((t) => {
    const thresholdType = getThresholdType(t);
    const matchesType = filterType === "all" || thresholdType === filterType;
    
    // Search by machine or line name
    let matchesSearch = true;
    if (searchTerm) {
      const machineName = machines?.find((m: { id: number | null; name: string }) => m.id === t.machineId)?.name || "";
      const lineName = productionLines?.find((l) => l.id === t.productionLineId)?.name || "";
      matchesSearch = machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      lineName.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return matchesSearch && matchesType;
  });

  const getThresholdTypeLabel = (type: string) => {
    switch (type) {
      case "global": return "Toàn cục";
      case "line": return "Dây chuyền";
      case "machine": return "Máy";
      default: return type;
    }
  };

  const getThresholdTypeIcon = (type: string) => {
    switch (type) {
      case "global": return <Target className="h-4 w-4" />;
      case "line": return <Factory className="h-4 w-4" />;
      case "machine": return <Cpu className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-primary" />
            Cấu hình Ngưỡng Cảnh báo OEE
          </h1>
          <p className="text-muted-foreground mt-1">
            Thiết lập ngưỡng cảnh báo OEE cho từng máy, dây chuyền hoặc toàn nhà máy
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm ngưỡng
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên máy hoặc dây chuyền..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Loại ngưỡng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="global">Toàn cục</SelectItem>
                <SelectItem value="line">Dây chuyền</SelectItem>
                <SelectItem value="machine">Máy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Thresholds Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách ngưỡng cảnh báo</CardTitle>
          <CardDescription>
            {filteredThresholds?.length || 0} ngưỡng cảnh báo được cấu hình
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : filteredThresholds && filteredThresholds.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3">Loại</th>
                    <th className="text-left p-3">Áp dụng cho</th>
                    <th className="text-center p-3">Mục tiêu</th>
                    <th className="text-center p-3">Cảnh báo</th>
                    <th className="text-center p-3">Nghiêm trọng</th>
                    <th className="text-center p-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredThresholds.map((threshold) => {
                    const thresholdType = getThresholdType(threshold);
                    return (
                      <tr key={threshold.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            {getThresholdTypeIcon(thresholdType)}
                            {getThresholdTypeLabel(thresholdType)}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">
                          {thresholdType === "global" && "Tất cả"}
                          {thresholdType === "line" && (
                            productionLines?.find((l) => l.id === threshold.productionLineId)?.name || `Line #${threshold.productionLineId}`
                          )}
                          {thresholdType === "machine" && (
                            machines?.find((m: { id: number | null; name: string }) => m.id === threshold.machineId)?.name || `Machine #${threshold.machineId}`
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-green-600 font-medium">{Number(threshold.targetOee).toFixed(0)}%</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-yellow-600 font-medium">{Number(threshold.warningThreshold).toFixed(0)}%</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-red-600 font-medium">{Number(threshold.criticalThreshold).toFixed(0)}%</span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(threshold)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(threshold.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Chưa có ngưỡng cảnh báo nào được cấu hình</p>
              <Button variant="outline" className="mt-4" onClick={openNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm ngưỡng đầu tiên
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Chỉnh sửa ngưỡng cảnh báo" : "Thêm ngưỡng cảnh báo mới"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dây chuyền (tùy chọn)</Label>
                <Select
                  value={formData.productionLineId?.toString() || "none"}
                  onValueChange={(v) => setFormData({ ...formData, productionLineId: v === "none" ? undefined : Number(v), machineId: undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dây chuyền" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tất cả dây chuyền</SelectItem>
                    {productionLines?.map((line) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Máy (tùy chọn)</Label>
                <Select
                  value={formData.machineId?.toString() || "none"}
                  onValueChange={(v) => setFormData({ ...formData, machineId: v === "none" ? undefined : Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn máy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tất cả máy</SelectItem>
                    {machines?.filter((m: { id: number | null; name: string }) => m.id !== null).map((machine: { id: number | null; name: string }) => (
                      <SelectItem key={machine.id!} value={machine.id!.toString()}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Mục tiêu OEE (%)</Label>
                <Input
                  type="number"
                  value={formData.targetOee}
                  onChange={(e) => setFormData({ ...formData, targetOee: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label>Ngưỡng cảnh báo (%)</Label>
                <Input
                  type="number"
                  value={formData.warningThreshold}
                  onChange={(e) => setFormData({ ...formData, warningThreshold: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label>Ngưỡng nghiêm trọng (%)</Label>
                <Input
                  type="number"
                  value={formData.criticalThreshold}
                  onChange={(e) => setFormData({ ...formData, criticalThreshold: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ngưỡng giảm tuyệt đối (%)</Label>
                <Input
                  type="number"
                  value={formData.dropAlertThreshold}
                  onChange={(e) => setFormData({ ...formData, dropAlertThreshold: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label>Ngưỡng giảm tương đối (%)</Label>
                <Input
                  type="number"
                  value={formData.relativeDropThreshold}
                  onChange={(e) => setFormData({ ...formData, relativeDropThreshold: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Availability (%)</Label>
                <Input
                  type="number"
                  value={formData.availabilityTarget}
                  onChange={(e) => setFormData({ ...formData, availabilityTarget: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label>Performance (%)</Label>
                <Input
                  type="number"
                  value={formData.performanceTarget}
                  onChange={(e) => setFormData({ ...formData, performanceTarget: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label>Quality (%)</Label>
                <Input
                  type="number"
                  value={formData.qualityTarget}
                  onChange={(e) => setFormData({ ...formData, qualityTarget: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Đang lưu..." : editingId ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa ngưỡng cảnh báo này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
