/**
 * KPI Threshold Settings Page
 * Trang cấu hình ngưỡng KPI cho từng dây chuyền sản xuất
 */

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Settings, Plus, Pencil, Trash2, AlertTriangle, CheckCircle, 
  Factory, Gauge, Activity, Info, Save, RefreshCw, Copy
} from "lucide-react";

interface ThresholdFormData {
  productionLineId: number | null;
  cpkWarning: number;
  cpkCritical: number;
  oeeWarning: number;
  oeeCritical: number;
  weeklyDeclineThreshold: number;
  emailAlertEnabled: boolean;
  alertRecipients: string;
}

const DEFAULT_THRESHOLD: ThresholdFormData = {
  productionLineId: null,
  cpkWarning: 1.33,
  cpkCritical: 1.0,
  oeeWarning: 75,
  oeeCritical: 60,
  weeklyDeclineThreshold: 5,
  emailAlertEnabled: true,
  alertRecipients: "",
};

export default function KpiThresholdSettings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ThresholdFormData>(DEFAULT_THRESHOLD);
  const [selectedTab, setSelectedTab] = useState("list");

  // Fetch data
  const { data: thresholds, isLoading, refetch } = trpc.shiftManager.getAlertThresholds.useQuery();
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: linesWithoutThresholds } = trpc.shiftManager.getLinesWithoutThresholds.useQuery();

  // Mutations
  const createMutation = trpc.shiftManager.createAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo ngưỡng KPI thành công");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const updateMutation = trpc.shiftManager.updateAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật ngưỡng KPI thành công");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const deleteMutation = trpc.shiftManager.deleteAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa ngưỡng KPI thành công");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData(DEFAULT_THRESHOLD);
    setEditingId(null);
  };

  const handleEdit = (threshold: any) => {
    setEditingId(threshold.id);
    setFormData({
      productionLineId: threshold.productionLineId,
      cpkWarning: parseFloat(threshold.cpkWarning) || 1.33,
      cpkCritical: parseFloat(threshold.cpkCritical) || 1.0,
      oeeWarning: parseFloat(threshold.oeeWarning) || 75,
      oeeCritical: parseFloat(threshold.oeeCritical) || 60,
      weeklyDeclineThreshold: parseFloat(threshold.weeklyDeclineThreshold) || 5,
      emailAlertEnabled: threshold.emailAlertEnabled ?? true,
      alertRecipients: threshold.alertRecipients || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa ngưỡng KPI này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSubmit = () => {
    if (!formData.productionLineId) {
      toast.error("Vui lòng chọn dây chuyền sản xuất");
      return;
    }

    const data = {
      productionLineId: formData.productionLineId,
      cpkWarning: formData.cpkWarning,
      cpkCritical: formData.cpkCritical,
      oeeWarning: formData.oeeWarning,
      oeeCritical: formData.oeeCritical,
      weeklyDeclineThreshold: formData.weeklyDeclineThreshold,
      emailAlertEnabled: formData.emailAlertEnabled,
      alertRecipients: formData.alertRecipients,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCopyToAll = (threshold: any) => {
    if (!linesWithoutThresholds || linesWithoutThresholds.length === 0) {
      toast.info("Tất cả dây chuyền đã có ngưỡng KPI");
      return;
    }

    if (confirm(`Sao chép ngưỡng này cho ${linesWithoutThresholds.length} dây chuyền chưa có cấu hình?`)) {
      linesWithoutThresholds.forEach((line: any) => {
        createMutation.mutate({
          productionLineId: line.id,
          cpkWarning: parseFloat(threshold.cpkWarning),
          cpkCritical: parseFloat(threshold.cpkCritical),
          oeeWarning: parseFloat(threshold.oeeWarning),
          oeeCritical: parseFloat(threshold.oeeCritical),
          weeklyDeclineThreshold: parseFloat(threshold.weeklyDeclineThreshold),
          emailAlertEnabled: threshold.emailAlertEnabled,
          alertRecipients: threshold.alertRecipients || "",
        });
      });
    }
  };

  const getStatusColor = (value: number, warning: number, critical: number, isHigherBetter: boolean = true) => {
    if (isHigherBetter) {
      if (value >= warning) return "text-green-600";
      if (value >= critical) return "text-yellow-600";
      return "text-red-600";
    } else {
      if (value <= warning) return "text-green-600";
      if (value <= critical) return "text-yellow-600";
      return "text-red-600";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Cấu hình Ngưỡng KPI
            </h1>
            <p className="text-muted-foreground">
              Thiết lập ngưỡng cảnh báo CPK và OEE cho từng dây chuyền sản xuất
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm ngưỡng mới
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Chỉnh sửa ngưỡng KPI" : "Thêm ngưỡng KPI mới"}
                  </DialogTitle>
                  <DialogDescription>
                    Cấu hình ngưỡng cảnh báo cho dây chuyền sản xuất
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                  {/* Production Line Selection */}
                  <div className="space-y-2">
                    <Label>Dây chuyền sản xuất *</Label>
                    <Select
                      value={formData.productionLineId?.toString() || ""}
                      onValueChange={(value) => setFormData({ ...formData, productionLineId: parseInt(value) })}
                      disabled={!!editingId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn dây chuyền" />
                      </SelectTrigger>
                      <SelectContent>
                        {(editingId ? productionLines : linesWithoutThresholds)?.map((line: any) => (
                          <SelectItem key={line.id} value={line.id.toString()}>
                            {line.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* CPK Thresholds */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Gauge className="h-4 w-4" />
                      Ngưỡng CPK
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ngưỡng Warning (≥)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.cpkWarning}
                          onChange={(e) => setFormData({ ...formData, cpkWarning: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">Khuyến nghị: 1.33</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Ngưỡng Critical (≥)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.cpkCritical}
                          onChange={(e) => setFormData({ ...formData, cpkCritical: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">Khuyến nghị: 1.00</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Ngưỡng giảm tuần (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.weeklyDeclineThreshold}
                        onChange={(e) => setFormData({ ...formData, weeklyDeclineThreshold: parseFloat(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cảnh báo khi CPK giảm hơn {formData.weeklyDeclineThreshold}% so với tuần trước
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* OEE Thresholds */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Ngưỡng OEE (%)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ngưỡng Warning (≥)</Label>
                        <Input
                          type="number"
                          step="1"
                          value={formData.oeeWarning}
                          onChange={(e) => setFormData({ ...formData, oeeWarning: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">Khuyến nghị: 75%</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Ngưỡng Critical (≥)</Label>
                        <Input
                          type="number"
                          step="1"
                          value={formData.oeeCritical}
                          onChange={(e) => setFormData({ ...formData, oeeCritical: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">Khuyến nghị: 60%</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Ngưỡng giảm tuần (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.weeklyDeclineThreshold}
                        onChange={(e) => setFormData({ ...formData, weeklyDeclineThreshold: parseFloat(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Cảnh báo khi OEE giảm hơn {formData.weeklyDeclineThreshold}% so với tuần trước
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Notification Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Cài đặt thông báo</h4>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Gửi email cảnh báo</Label>
                        <p className="text-xs text-muted-foreground">Gửi email khi KPI vi phạm ngưỡng</p>
                      </div>
                      <Switch
                        checked={formData.emailAlertEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, emailAlertEnabled: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Thông báo cho Owner</Label>
                        <p className="text-xs text-muted-foreground">Gửi thông báo cho chủ sở hữu hệ thống</p>
                      </div>
                      <Switch
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email nhận cảnh báo (phân cách bằng dấu phẩy)</Label>
                      <Input
                        placeholder="email1@example.com, email2@example.com"
                        value={formData.alertRecipients}
                        onChange={(e) => setFormData({ ...formData, alertRecipients: e.target.value })}
                      />
                    </div>
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
                    <Save className="h-4 w-4 mr-2" />
                    {editingId ? "Cập nhật" : "Tạo mới"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Info Alert */}
        {linesWithoutThresholds && linesWithoutThresholds.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Dây chuyền chưa có cấu hình</AlertTitle>
            <AlertDescription>
              Có {linesWithoutThresholds.length} dây chuyền chưa được cấu hình ngưỡng KPI. 
              Các dây chuyền này sẽ sử dụng ngưỡng mặc định (CPK Warning: 1.33, Critical: 1.00, OEE Warning: 75%, Critical: 60%).
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="list">Danh sách ngưỡng</TabsTrigger>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Thresholds Table */}
            <Card>
              <CardHeader>
                <CardTitle>Ngưỡng KPI theo dây chuyền</CardTitle>
                <CardDescription>
                  Danh sách các ngưỡng KPI đã cấu hình cho từng dây chuyền
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : !thresholds || thresholds.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có ngưỡng KPI nào được cấu hình
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dây chuyền</TableHead>
                        <TableHead className="text-center">CPK Warning</TableHead>
                        <TableHead className="text-center">CPK Critical</TableHead>
                        <TableHead className="text-center">OEE Warning</TableHead>
                        <TableHead className="text-center">OEE Critical</TableHead>
                        <TableHead className="text-center">Giảm tuần</TableHead>
                        <TableHead className="text-center">Thông báo</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {thresholds.map((threshold: any) => (
                        <TableRow key={threshold.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Factory className="h-4 w-4 text-muted-foreground" />
                              {threshold.productionLineName || `Line ${threshold.productionLineId}`}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              ≥ {parseFloat(threshold.cpkWarning).toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              ≥ {parseFloat(threshold.cpkCritical).toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              ≥ {parseFloat(threshold.oeeWarning).toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              ≥ {parseFloat(threshold.oeeCritical).toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm text-muted-foreground">
                              CPK: {parseFloat(threshold.weeklyDeclineThreshold).toFixed(1)}% | 
                              OEE: {parseFloat(threshold.weeklyDeclineThreshold).toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {threshold.emailAlertEnabled && (
                                <Badge variant="secondary" className="text-xs">Email</Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">Owner</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyToAll(threshold)}
                                title="Sao chép cho các dây chuyền khác"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(threshold)}
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
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổng số dây chuyền
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{productionLines?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Đã cấu hình ngưỡng
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
            </div>

            {/* Default Thresholds Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Ngưỡng mặc định
                </CardTitle>
                <CardDescription>
                  Các dây chuyền chưa được cấu hình sẽ sử dụng ngưỡng mặc định sau
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">CPK Warning</div>
                    <div className="text-xl font-bold">≥ 1.33</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">CPK Critical</div>
                    <div className="text-xl font-bold">≥ 1.00</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">OEE Warning</div>
                    <div className="text-xl font-bold">≥ 75%</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">OEE Critical</div>
                    <div className="text-xl font-bold">≥ 60%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lines without thresholds */}
            {linesWithoutThresholds && linesWithoutThresholds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Dây chuyền chưa cấu hình
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {linesWithoutThresholds.map((line: any) => (
                      <Badge key={line.id} variant="outline">
                        {line.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
