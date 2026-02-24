import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Timer, 
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Clock
} from "lucide-react";

interface SamplingConfig {
  id: number;
  name: string;
  timeUnit: "year" | "month" | "week" | "day" | "hour" | "minute" | "second";
  intervalValue: number;
  sampleSize: number;
  subgroupSize: number;
  description?: string | null;
  isActive: number;
  mappingId?: number | null;
}

const intervalTypeLabels: Record<string, string> = {
  year: "Năm",
  month: "Tháng",
  week: "Tuần",
  day: "Ngày",
  hour: "Giờ",
  minute: "Phút",
  second: "Giây",
};

export default function SamplingMethodManagement() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SamplingConfig | null>(null);
  type TimeUnit = "year" | "month" | "week" | "day" | "hour" | "minute" | "second";
  const [formData, setFormData] = useState<{
    name: string;
    timeUnit: TimeUnit;
    intervalUnit: TimeUnit;
    intervalValue: number;
    sampleSize: number;
    subgroupSize: number;
    description: string;
  }>({
    name: "",
    timeUnit: "hour",
    intervalUnit: "hour",
    intervalValue: 1,
    sampleSize: 5,
    subgroupSize: 1,
    description: "",
  });

  // Fetch data
  const { data: samplingConfigs, isLoading, refetch } = trpc.sampling.list.useQuery();

  // Mutations
  const createMutation = trpc.sampling.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo phương pháp lấy mẫu thành công");
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const updateMutation = trpc.sampling.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật phương pháp lấy mẫu thành công");
      refetch();
      setEditingConfig(null);
      resetForm();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const deleteMutation = trpc.sampling.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa phương pháp lấy mẫu thành công");
      refetch();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      timeUnit: "hour",
      intervalUnit: "hour",
      intervalValue: 1,
      sampleSize: 5,
      subgroupSize: 1,
      description: "",
    });
  };

  const handleCreate = () => {
    if (!formData.name) {
      toast.error("Vui lòng nhập tên phương pháp");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingConfig) return;
    updateMutation.mutate({
      id: editingConfig.id,
      ...formData,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa phương pháp này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const openEditDialog = (config: SamplingConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      timeUnit: config.timeUnit,
      intervalUnit: config.timeUnit,
      intervalValue: config.intervalValue,
      sampleSize: config.sampleSize,
      subgroupSize: config.subgroupSize,
      description: config.description || "",
    });
  };

  const filteredConfigs = samplingConfigs?.filter((c: SamplingConfig) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Không có quyền truy cập</CardTitle>
              <CardDescription>Bạn cần quyền Admin để truy cập trang này</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Phương pháp lấy mẫu</h1>
            <p className="text-muted-foreground mt-1">Cấu hình tần suất và số lượng mẫu cho SPC</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm phương pháp
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Thêm phương pháp lấy mẫu</DialogTitle>
                <DialogDescription>Định nghĩa tần suất và số lượng mẫu</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tên phương pháp *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Lấy mẫu mỗi giờ"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Đơn vị thời gian</Label>
                    <Select value={formData.timeUnit} onValueChange={(v) => setFormData({ ...formData, timeUnit: v as TimeUnit, intervalUnit: v as TimeUnit })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">Năm</SelectItem>
                        <SelectItem value="month">Tháng</SelectItem>
                        <SelectItem value="week">Tuần</SelectItem>
                        <SelectItem value="day">Ngày</SelectItem>
                        <SelectItem value="hour">Giờ</SelectItem>
                        <SelectItem value="minute">Phút</SelectItem>
                        <SelectItem value="second">Giây</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Khoảng cách</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.intervalValue}
                      onChange={(e) => setFormData({ ...formData, intervalValue: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Số lượng mẫu mỗi lần</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.sampleSize}
                    onChange={(e) => setFormData({ ...formData, sampleSize: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ví dụ: Lấy {formData.sampleSize} mẫu mỗi {formData.intervalValue} {intervalTypeLabels[formData.timeUnit]}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả chi tiết..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Tạo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Danh sách phương pháp lấy mẫu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Tên phương pháp</th>
                      <th className="px-4 py-3 text-center font-semibold">Tần suất</th>
                      <th className="px-4 py-3 text-center font-semibold">Số mẫu</th>
                      <th className="px-4 py-3 text-left font-semibold">Mô tả</th>
                      <th className="px-4 py-3 text-left font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConfigs?.map((config: SamplingConfig) => (
                      <tr key={config.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{config.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                            <Clock className="h-3 w-3" />
                            {config.intervalValue} {intervalTypeLabels[config.timeUnit]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{config.sampleSize}</td>
                        <td className="px-4 py-3 text-muted-foreground">{config.description || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Dialog open={editingConfig?.id === config.id} onOpenChange={(open) => !open && setEditingConfig(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(config)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Chỉnh sửa phương pháp</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Tên phương pháp</Label>
                                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Đơn vị thời gian</Label>
                                      <Select value={formData.timeUnit} onValueChange={(v) => setFormData({ ...formData, timeUnit: v as TimeUnit, intervalUnit: v as TimeUnit })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="year">Năm</SelectItem>
                                          <SelectItem value="month">Tháng</SelectItem>
                                          <SelectItem value="week">Tuần</SelectItem>
                                          <SelectItem value="day">Ngày</SelectItem>
                                          <SelectItem value="hour">Giờ</SelectItem>
                                          <SelectItem value="minute">Phút</SelectItem>
                                          <SelectItem value="second">Giây</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Khoảng cách</Label>
                                      <Input type="number" min={1} value={formData.intervalValue} onChange={(e) => setFormData({ ...formData, intervalValue: parseInt(e.target.value) || 1 })} />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Số lượng mẫu</Label>
                                    <Input type="number" min={1} value={formData.sampleSize} onChange={(e) => setFormData({ ...formData, sampleSize: parseInt(e.target.value) || 1 })} />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingConfig(null)}>Hủy</Button>
                                  <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                                    {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Lưu
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(config.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredConfigs?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Timer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có phương pháp lấy mẫu nào</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
