import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
  Download,
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
  name: string;
  thresholdType: "global" | "line" | "machine";
  productionLineId?: number;
  machineId?: number;
  targetOee: number;
  warningThreshold: number;
  criticalThreshold: number;
  notifyOnWarning: boolean;
  notifyOnCritical: boolean;
  notifyEmails: string;
}

const defaultFormData: ThresholdFormData = {
  name: "",
  thresholdType: "global",
  targetOee: 85,
  warningThreshold: 80,
  criticalThreshold: 70,
  notifyOnWarning: true,
  notifyOnCritical: true,
  notifyEmails: "",
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

  const exportMutation = trpc.oee.exportAlertThresholds.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã xuất ${data.count} ngưỡng cảnh báo`);
      window.open(data.url, "_blank");
    },
    onError: (error) => {
      toast.error("Lỗi xuất file: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error("Vui lòng nhập tên ngưỡng");
      return;
    }

    if (formData.thresholdType === "line" && !formData.productionLineId) {
      toast.error("Vui lòng chọn dây chuyền");
      return;
    }

    if (formData.thresholdType === "machine" && !formData.machineId) {
      toast.error("Vui lòng chọn máy");
      return;
    }

    const data = {
      name: formData.name,
      thresholdType: formData.thresholdType,
      productionLineId: formData.thresholdType === "line" ? formData.productionLineId : undefined,
      machineId: formData.thresholdType === "machine" ? formData.machineId : undefined,
      targetOee: formData.targetOee,
      warningThreshold: formData.warningThreshold,
      criticalThreshold: formData.criticalThreshold,
      notifyOnWarning: formData.notifyOnWarning ? 1 : 0,
      notifyOnCritical: formData.notifyOnCritical ? 1 : 0,
      notifyEmails: formData.notifyEmails || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (threshold: any) => {
    setEditingId(threshold.id);
    setFormData({
      name: threshold.name,
      thresholdType: threshold.thresholdType,
      productionLineId: threshold.productionLineId || undefined,
      machineId: threshold.machineId || undefined,
      targetOee: Number(threshold.targetOee),
      warningThreshold: Number(threshold.warningThreshold),
      criticalThreshold: Number(threshold.criticalThreshold),
      notifyOnWarning: threshold.notifyOnWarning === 1,
      notifyOnCritical: threshold.notifyOnCritical === 1,
      notifyEmails: threshold.notifyEmails || "",
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

  // Filter thresholds
  const filteredThresholds = thresholds?.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || t.thresholdType === filterType;
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
            Thiết lập ngưỡng cảnh báo OEE tùy chỉnh theo máy hoặc dây chuyền
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm ngưỡng mới
          </Button>
        </div>
      </div>

      {/* Default Threshold Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Ngưỡng mặc định (khi không có cấu hình riêng)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Mục tiêu OEE:</span>
              <span className="ml-2 font-medium text-green-600">85%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Ngưỡng cảnh báo:</span>
              <span className="ml-2 font-medium text-yellow-600">80%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Ngưỡng nghiêm trọng:</span>
              <span className="ml-2 font-medium text-red-600">70%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên..."
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

      {/* Thresholds List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Danh sách ngưỡng cảnh báo</CardTitle>
              <CardDescription>
                {filteredThresholds?.length || 0} ngưỡng được cấu hình
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending || !thresholds?.length}
            >
              {exportMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Xuất Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : filteredThresholds && filteredThresholds.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Tên</th>
                    <th className="text-center p-3">Loại</th>
                    <th className="text-center p-3">Áp dụng cho</th>
                    <th className="text-center p-3">Mục tiêu</th>
                    <th className="text-center p-3">Cảnh báo</th>
                    <th className="text-center p-3">Nghiêm trọng</th>
                    <th className="text-center p-3">Thông báo</th>
                    <th className="text-center p-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredThresholds.map((threshold) => (
                    <tr key={threshold.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{threshold.name}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="flex items-center gap-1 justify-center">
                          {getThresholdTypeIcon(threshold.thresholdType)}
                          {getThresholdTypeLabel(threshold.thresholdType)}
                        </Badge>
                      </td>
                      <td className="p-3 text-center text-sm">
                        {threshold.thresholdType === "global" && "Tất cả"}
                        {threshold.thresholdType === "line" && (
                          productionLines?.find((l) => l.id === threshold.productionLineId)?.name || `Line #${threshold.productionLineId}`
                        )}
                        {threshold.thresholdType === "machine" && (
                          machines?.find((m) => m.id === threshold.machineId)?.name || `Machine #${threshold.machineId}`
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
                        <div className="flex items-center justify-center gap-1">
                          {threshold.notifyOnWarning === 1 && (
                            <Badge variant="outline" className="text-xs bg-yellow-50">Cảnh báo</Badge>
                          )}
                          {threshold.notifyOnCritical === 1 && (
                            <Badge variant="outline" className="text-xs bg-red-50">Nghiêm trọng</Badge>
                          )}
                        </div>
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
                  ))}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Sửa ngưỡng cảnh báo" : "Thêm ngưỡng cảnh báo mới"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên ngưỡng *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Ngưỡng cao cho Line A"
              />
            </div>

            <div className="space-y-2">
              <Label>Loại ngưỡng *</Label>
              <Select
                value={formData.thresholdType}
                onValueChange={(value: "global" | "line" | "machine") =>
                  setFormData({ ...formData, thresholdType: value, productionLineId: undefined, machineId: undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Toàn cục (áp dụng cho tất cả)</SelectItem>
                  <SelectItem value="line">Theo dây chuyền</SelectItem>
                  <SelectItem value="machine">Theo máy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.thresholdType === "line" && (
              <div className="space-y-2">
                <Label>Chọn dây chuyền *</Label>
                <Select
                  value={formData.productionLineId?.toString() || ""}
                  onValueChange={(value) => setFormData({ ...formData, productionLineId: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dây chuyền" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionLines?.map((line) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.thresholdType === "machine" && (
              <div className="space-y-2">
                <Label>Chọn máy *</Label>
                <Select
                  value={formData.machineId?.toString() || ""}
                  onValueChange={(value) => setFormData({ ...formData, machineId: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn máy" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines?.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id.toString()}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Mục tiêu OEE (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.targetOee}
                  onChange={(e) => setFormData({ ...formData, targetOee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ngưỡng cảnh báo (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.warningThreshold}
                  onChange={(e) => setFormData({ ...formData, warningThreshold: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ngưỡng nghiêm trọng (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.criticalThreshold}
                  onChange={(e) => setFormData({ ...formData, criticalThreshold: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gửi thông báo khi</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyOnWarning}
                    onChange={(e) => setFormData({ ...formData, notifyOnWarning: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Đạt ngưỡng cảnh báo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyOnCritical}
                    onChange={(e) => setFormData({ ...formData, notifyOnCritical: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Đạt ngưỡng nghiêm trọng</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email nhận thông báo (cách nhau bởi dấu phẩy)</Label>
              <Input
                value={formData.notifyEmails}
                onChange={(e) => setFormData({ ...formData, notifyEmails: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Cập nhật" : "Tạo mới"}
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
