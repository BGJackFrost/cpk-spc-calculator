import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Settings2,
  Plus,
  Pencil,
  Trash2,
  Target,
  AlertTriangle,
  Bell,
  Webhook,
  Factory,
  Package,
  Cpu,
} from "lucide-react";

export default function AiPredictionThresholds() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    productId: undefined as number | undefined,
    productionLineId: undefined as number | undefined,
    workstationId: undefined as number | undefined,
    cpkWarning: 1.33,
    cpkCritical: 1.0,
    cpkTarget: 1.67,
    oeeWarning: 75,
    oeeCritical: 60,
    oeeTarget: 85,
    trendDeclineWarning: 5,
    trendDeclineCritical: 10,
    emailAlertEnabled: true,
    alertEmails: "",
    webhookEnabled: false,
    webhookUrl: "",
    priority: 0,
  });

  const { data, isLoading, refetch } = trpc.ai.thresholds.list.useQuery();
  const { data: products } = trpc.ai.thresholds.getProducts.useQuery();
  const { data: productionLines } = trpc.ai.thresholds.getProductionLines.useQuery();
  const { data: workstations } = trpc.ai.thresholds.getWorkstations.useQuery();

  const createMutation = trpc.ai.thresholds.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo cấu hình ngưỡng mới");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const updateMutation = trpc.ai.thresholds.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật cấu hình");
      setEditingId(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const deleteMutation = trpc.ai.thresholds.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa cấu hình");
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
      productId: undefined,
      productionLineId: undefined,
      workstationId: undefined,
      cpkWarning: 1.33,
      cpkCritical: 1.0,
      cpkTarget: 1.67,
      oeeWarning: 75,
      oeeCritical: 60,
      oeeTarget: 85,
      trendDeclineWarning: 5,
      trendDeclineCritical: 10,
      emailAlertEnabled: true,
      alertEmails: "",
      webhookEnabled: false,
      webhookUrl: "",
      priority: 0,
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, ...formData });
  };

  const handleEdit = (threshold: any) => {
    setEditingId(threshold.id);
    setFormData({
      name: threshold.name,
      description: threshold.description || "",
      productId: threshold.productId || undefined,
      productionLineId: threshold.productionLineId || undefined,
      workstationId: threshold.workstationId || undefined,
      cpkWarning: parseFloat(threshold.cpkWarning) || 1.33,
      cpkCritical: parseFloat(threshold.cpkCritical) || 1.0,
      cpkTarget: parseFloat(threshold.cpkTarget) || 1.67,
      oeeWarning: parseFloat(threshold.oeeWarning) || 75,
      oeeCritical: parseFloat(threshold.oeeCritical) || 60,
      oeeTarget: parseFloat(threshold.oeeTarget) || 85,
      trendDeclineWarning: parseFloat(threshold.trendDeclineWarning) || 5,
      trendDeclineCritical: parseFloat(threshold.trendDeclineCritical) || 10,
      emailAlertEnabled: threshold.emailAlertEnabled === 1,
      alertEmails: threshold.alertEmails || "",
      webhookEnabled: threshold.webhookEnabled === 1,
      webhookUrl: threshold.webhookUrl || "",
      priority: threshold.priority || 0,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa cấu hình này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const ThresholdForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Tên cấu hình *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="VD: Ngưỡng cho dây chuyền A"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="description">Mô tả</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Mô tả chi tiết..."
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Sản phẩm</Label>
          <Select
            value={formData.productId?.toString() || "none"}
            onValueChange={(v) => setFormData({ ...formData, productId: v === "none" ? undefined : parseInt(v) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn sản phẩm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tất cả</SelectItem>
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.code} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Dây chuyền</Label>
          <Select
            value={formData.productionLineId?.toString() || "none"}
            onValueChange={(v) => setFormData({ ...formData, productionLineId: v === "none" ? undefined : parseInt(v) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn dây chuyền" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tất cả</SelectItem>
              {productionLines?.map((l) => (
                <SelectItem key={l.id} value={l.id.toString()}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Trạm</Label>
          <Select
            value={formData.workstationId?.toString() || "none"}
            onValueChange={(v) => setFormData({ ...formData, workstationId: v === "none" ? undefined : parseInt(v) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn trạm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tất cả</SelectItem>
              {workstations?.map((w) => (
                <SelectItem key={w.id} value={w.id.toString()}>
                  {w.code} - {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Ngưỡng CPK
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Cảnh báo</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cpkWarning}
                onChange={(e) => setFormData({ ...formData, cpkWarning: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Nguy hiểm</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cpkCritical}
                onChange={(e) => setFormData({ ...formData, cpkCritical: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Mục tiêu</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cpkTarget}
                onChange={(e) => setFormData({ ...formData, cpkTarget: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Ngưỡng OEE (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Cảnh báo</Label>
              <Input
                type="number"
                step="1"
                value={formData.oeeWarning}
                onChange={(e) => setFormData({ ...formData, oeeWarning: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Nguy hiểm</Label>
              <Input
                type="number"
                step="1"
                value={formData.oeeCritical}
                onChange={(e) => setFormData({ ...formData, oeeCritical: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Mục tiêu</Label>
              <Input
                type="number"
                step="1"
                value={formData.oeeTarget}
                onChange={(e) => setFormData({ ...formData, oeeTarget: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Cấu hình thông báo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Gửi email cảnh báo</Label>
            <Switch
              checked={formData.emailAlertEnabled}
              onCheckedChange={(v) => setFormData({ ...formData, emailAlertEnabled: v })}
            />
          </div>
          {formData.emailAlertEnabled && (
            <div>
              <Label>Email nhận cảnh báo</Label>
              <Input
                value={formData.alertEmails}
                onChange={(e) => setFormData({ ...formData, alertEmails: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label>Gọi Webhook</Label>
            <Switch
              checked={formData.webhookEnabled}
              onCheckedChange={(v) => setFormData({ ...formData, webhookEnabled: v })}
            />
          </div>
          {formData.webhookEnabled && (
            <div>
              <Label>Webhook URL</Label>
              <Input
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <Label>Độ ưu tiên (0-100)</Label>
        <Input
          type="number"
          min="0"
          max="100"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="h-6 w-6 text-blue-500" />
              Cấu hình Ngưỡng Cảnh báo AI
            </h1>
            <p className="text-muted-foreground mt-1">
              Tùy chỉnh ngưỡng CPK/OEE theo sản phẩm và dây chuyền
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm cấu hình
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo cấu hình ngưỡng mới</DialogTitle>
                <DialogDescription>
                  Thiết lập ngưỡng cảnh báo tùy chỉnh
                </DialogDescription>
              </DialogHeader>
              <ThresholdForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang tạo..." : "Tạo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ngưỡng mặc định</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">CPK Warning:</span> <span className="font-medium">≤ 1.33</span></div>
              <div><span className="text-muted-foreground">CPK Critical:</span> <span className="font-medium">≤ 1.00</span></div>
              <div><span className="text-muted-foreground">OEE Warning:</span> <span className="font-medium">≤ 75%</span></div>
              <div><span className="text-muted-foreground">OEE Critical:</span> <span className="font-medium">≤ 60%</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách cấu hình</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Phạm vi</TableHead>
                    <TableHead className="text-center">CPK</TableHead>
                    <TableHead className="text-center">OEE</TableHead>
                    <TableHead className="text-center">Thông báo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.thresholds?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Chưa có cấu hình nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.thresholds?.map((threshold) => (
                      <TableRow key={threshold.id}>
                        <TableCell>
                          <div className="font-medium">{threshold.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {threshold.productId && <Badge variant="outline" className="text-xs"><Package className="h-3 w-3 mr-1" />Product</Badge>}
                            {threshold.productionLineId && <Badge variant="outline" className="text-xs"><Factory className="h-3 w-3 mr-1" />Line</Badge>}
                            {threshold.workstationId && <Badge variant="outline" className="text-xs"><Cpu className="h-3 w-3 mr-1" />Station</Badge>}
                            {!threshold.productId && !threshold.productionLineId && !threshold.workstationId && <Badge variant="secondary" className="text-xs">Global</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <span className="text-amber-600">{threshold.cpkWarning}</span> / <span className="text-red-600">{threshold.cpkCritical}</span>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <span className="text-amber-600">{threshold.oeeWarning}%</span> / <span className="text-red-600">{threshold.oeeCritical}%</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            {threshold.emailAlertEnabled === 1 && <Bell className="h-4 w-4 text-blue-500" />}
                            {threshold.webhookEnabled === 1 && <Webhook className="h-4 w-4 text-purple-500" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Dialog open={editingId === threshold.id} onOpenChange={(open) => !open && setEditingId(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(threshold)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Chỉnh sửa</DialogTitle></DialogHeader>
                                <ThresholdForm />
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingId(null)}>Hủy</Button>
                                  <Button onClick={handleUpdate} disabled={updateMutation.isPending}>Lưu</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(threshold.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
