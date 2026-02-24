/**
 * KPI Alert Thresholds Management Page
 * Quản lý ngưỡng cảnh báo KPI tùy chỉnh cho từng dây chuyền
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  AlertTriangle, 
  Settings2, 
  Mail,
  Factory,
  TrendingDown
} from "lucide-react";

interface ThresholdFormData {
  productionLineId: number;
  cpkWarning: number;
  cpkCritical: number;
  oeeWarning: number;
  oeeCritical: number;
  defectRateWarning: number;
  defectRateCritical: number;
  weeklyDeclineThreshold: number;
  emailAlertEnabled: boolean;
  alertEmails: string;
}

const DEFAULT_FORM_DATA: ThresholdFormData = {
  productionLineId: 0,
  cpkWarning: 1.33,
  cpkCritical: 1.0,
  oeeWarning: 75,
  oeeCritical: 60,
  defectRateWarning: 2,
  defectRateCritical: 5,
  weeklyDeclineThreshold: -5,
  emailAlertEnabled: true,
  alertEmails: ""
};

export default function KpiAlertThresholds() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ThresholdFormData>(DEFAULT_FORM_DATA);

  const { data: thresholds, refetch } = trpc.shiftManager.getAlertThresholds.useQuery();
  const { data: linesWithoutThresholds } = trpc.shiftManager.getLinesWithoutThresholds.useQuery();
  const { data: allLines } = trpc.productionLine.list.useQuery();

  const createMutation = trpc.shiftManager.createAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo ngưỡng cảnh báo KPI");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  const updateMutation = trpc.shiftManager.updateAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật ngưỡng cảnh báo KPI");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  const deleteMutation = trpc.shiftManager.deleteAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa ngưỡng cảnh báo");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (threshold: any) => {
    setEditingId(threshold.id);
    setFormData({
      productionLineId: threshold.productionLineId,
      cpkWarning: threshold.cpkWarning,
      cpkCritical: threshold.cpkCritical,
      oeeWarning: threshold.oeeWarning,
      oeeCritical: threshold.oeeCritical,
      defectRateWarning: threshold.defectRateWarning,
      defectRateCritical: threshold.defectRateCritical,
      weeklyDeclineThreshold: threshold.weeklyDeclineThreshold,
      emailAlertEnabled: threshold.emailAlertEnabled,
      alertEmails: threshold.alertEmails || ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        cpkWarning: formData.cpkWarning,
        cpkCritical: formData.cpkCritical,
        oeeWarning: formData.oeeWarning,
        oeeCritical: formData.oeeCritical,
        defectRateWarning: formData.defectRateWarning,
        defectRateCritical: formData.defectRateCritical,
        weeklyDeclineThreshold: formData.weeklyDeclineThreshold,
        emailAlertEnabled: formData.emailAlertEnabled,
        alertEmails: formData.alertEmails
      });
    } else {
      if (!formData.productionLineId) {
        toast.error("Vui lòng chọn dây chuyền");
        return;
      }
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa ngưỡng cảnh báo này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusBadge = (value: number, warning: number, critical: number, isHigherBetter: boolean = true) => {
    if (isHigherBetter) {
      if (value >= warning * 1.25) return <Badge className="bg-green-500">Xuất sắc</Badge>;
      if (value >= warning) return <Badge className="bg-blue-500">Tốt</Badge>;
      if (value >= critical) return <Badge className="bg-yellow-500">Cảnh báo</Badge>;
      return <Badge className="bg-red-500">Nghiêm trọng</Badge>;
    } else {
      if (value <= warning * 0.5) return <Badge className="bg-green-500">Xuất sắc</Badge>;
      if (value <= warning) return <Badge className="bg-blue-500">Tốt</Badge>;
      if (value <= critical) return <Badge className="bg-yellow-500">Cảnh báo</Badge>;
      return <Badge className="bg-red-500">Nghiêm trọng</Badge>;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6" />
            Cấu hình Ngưỡng Cảnh báo KPI
          </h1>
          <p className="text-muted-foreground">
            Thiết lập ngưỡng cảnh báo CPK, OEE, tỷ lệ lỗi cho từng dây chuyền sản xuất
          </p>
        </div>
        <Button onClick={handleOpenCreate} disabled={!linesWithoutThresholds?.length}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm ngưỡng mới
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng dây chuyền
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allLines?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đã cấu hình
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{thresholds?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chưa cấu hình
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {linesWithoutThresholds?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Email Alert bật
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {thresholds?.filter(t => t.emailAlertEnabled).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thresholds Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Ngưỡng Cảnh báo</CardTitle>
          <CardDescription>
            Các ngưỡng cảnh báo KPI đã được cấu hình cho từng dây chuyền
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dây chuyền</TableHead>
                <TableHead className="text-center">CPK</TableHead>
                <TableHead className="text-center">OEE</TableHead>
                <TableHead className="text-center">Tỷ lệ lỗi</TableHead>
                <TableHead className="text-center">Giảm tuần</TableHead>
                <TableHead className="text-center">Email Alert</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thresholds?.map((threshold) => (
                <TableRow key={threshold.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Factory className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{threshold.lineName}</div>
                        <div className="text-xs text-muted-foreground">{threshold.lineCode}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1 text-yellow-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-sm">{threshold.cpkWarning}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-sm">{threshold.cpkCritical}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <div className="text-yellow-600 text-sm">{threshold.oeeWarning}%</div>
                      <div className="text-red-600 text-sm">{threshold.oeeCritical}%</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <div className="text-yellow-600 text-sm">{threshold.defectRateWarning}%</div>
                      <div className="text-red-600 text-sm">{threshold.defectRateCritical}%</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-600">
                      <TrendingDown className="h-3 w-3" />
                      <span className="text-sm">{threshold.weeklyDeclineThreshold}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {threshold.emailAlertEnabled ? (
                      <Badge className="bg-green-500">
                        <Mail className="h-3 w-3 mr-1" />
                        Bật
                      </Badge>
                    ) : (
                      <Badge variant="outline">Tắt</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(threshold)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(threshold.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!thresholds || thresholds.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chưa có ngưỡng cảnh báo nào được cấu hình
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lines without thresholds */}
      {linesWithoutThresholds && linesWithoutThresholds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Dây chuyền chưa cấu hình
            </CardTitle>
            <CardDescription>
              Các dây chuyền này sẽ sử dụng ngưỡng mặc định (CPK: 1.33/1.0, OEE: 75%/60%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {linesWithoutThresholds.map((line) => (
                <Badge key={line.id} variant="outline" className="py-1 px-3">
                  {line.name} ({line.code})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Chỉnh sửa Ngưỡng Cảnh báo" : "Thêm Ngưỡng Cảnh báo mới"}
            </DialogTitle>
            <DialogDescription>
              Thiết lập ngưỡng cảnh báo KPI cho dây chuyền sản xuất
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Production Line Select */}
            {!editingId && (
              <div className="space-y-2">
                <Label>Dây chuyền sản xuất</Label>
                <Select
                  value={formData.productionLineId.toString()}
                  onValueChange={(value) => setFormData({ ...formData, productionLineId: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dây chuyền" />
                  </SelectTrigger>
                  <SelectContent>
                    {linesWithoutThresholds?.map((line) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name} ({line.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* CPK Thresholds */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  CPK Cảnh báo
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cpkWarning}
                  onChange={(e) => setFormData({ ...formData, cpkWarning: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Mặc định: 1.33</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  CPK Nghiêm trọng
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cpkCritical}
                  onChange={(e) => setFormData({ ...formData, cpkCritical: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Mặc định: 1.00</p>
              </div>
            </div>

            {/* OEE Thresholds */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  OEE Cảnh báo (%)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.oeeWarning}
                  onChange={(e) => setFormData({ ...formData, oeeWarning: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Mặc định: 75%</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  OEE Nghiêm trọng (%)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.oeeCritical}
                  onChange={(e) => setFormData({ ...formData, oeeCritical: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Mặc định: 60%</p>
              </div>
            </div>

            {/* Defect Rate Thresholds */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  Tỷ lệ lỗi Cảnh báo (%)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.defectRateWarning}
                  onChange={(e) => setFormData({ ...formData, defectRateWarning: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Mặc định: 2%</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  Tỷ lệ lỗi Nghiêm trọng (%)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.defectRateCritical}
                  onChange={(e) => setFormData({ ...formData, defectRateCritical: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Mặc định: 5%</p>
              </div>
            </div>

            {/* Weekly Decline Threshold */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                Ngưỡng giảm so với tuần trước (%)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={formData.weeklyDeclineThreshold}
                onChange={(e) => setFormData({ ...formData, weeklyDeclineThreshold: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Cảnh báo khi KPI giảm quá ngưỡng này so với tuần trước (mặc định: -5%)
              </p>
            </div>

            {/* Email Alert Settings */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Gửi email cảnh báo</Label>
                  <p className="text-xs text-muted-foreground">
                    Tự động gửi email khi KPI vượt ngưỡng
                  </p>
                </div>
                <Switch
                  checked={formData.emailAlertEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, emailAlertEnabled: checked })}
                />
              </div>

              {formData.emailAlertEnabled && (
                <div className="space-y-2">
                  <Label>Danh sách email nhận cảnh báo</Label>
                  <Textarea
                    placeholder="email1@example.com, email2@example.com"
                    value={formData.alertEmails}
                    onChange={(e) => setFormData({ ...formData, alertEmails: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nhập các email cách nhau bởi dấu phẩy. Để trống sẽ gửi cho owner.
                  </p>
                </div>
              )}
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
    </div>
  );
}
