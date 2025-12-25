/**
 * Alert Configuration Enhanced Page
 * Task: ALT-04
 * Trang cấu hình ngưỡng cảnh báo nâng cao
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Bell, Settings, Plus, Trash2, Save, RefreshCw, 
  AlertTriangle, AlertCircle, Info, Mail, MessageSquare,
  Clock, Users, Target, Cpu, Factory
} from "lucide-react";

interface AlertThreshold {
  id: number;
  alertType: string;
  entityType: "machine" | "line" | "global";
  entityId?: number;
  entityName?: string;
  warningThreshold: number;
  criticalThreshold: number;
  enabled: boolean;
  emailRecipients: string[];
  escalationEnabled: boolean;
  escalationDelayMinutes: number;
}

export default function AlertConfigurationEnhanced() {
  const [selectedTab, setSelectedTab] = useState("oee");
  const [editingThreshold, setEditingThreshold] = useState<AlertThreshold | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch data
  const { data: machines } = trpc.machine.list.useQuery();
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: oeeThresholds, refetch: refetchOee } = trpc.oee.listAlertThresholds.useQuery();

  // Mutations
  const updateThreshold = trpc.oee.updateAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật cấu hình cảnh báo");
      refetchOee();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const createThreshold = trpc.oee.createAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo cấu hình cảnh báo mới");
      refetchOee();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const deleteThreshold = trpc.oee.deleteAlertThreshold.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa cấu hình cảnh báo");
      refetchOee();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const handleSaveThreshold = () => {
    if (!editingThreshold) return;

    if (editingThreshold.id) {
      updateThreshold.mutate({
        id: editingThreshold.id,
        warningThreshold: editingThreshold.warningThreshold,
        criticalThreshold: editingThreshold.criticalThreshold,
        isActive: editingThreshold.enabled,
        alertEmails: editingThreshold.emailRecipients,
      });
    } else {
      createThreshold.mutate({
        machineId: editingThreshold.entityType === "machine" ? editingThreshold.entityId : undefined,
        productionLineId: editingThreshold.entityType === "line" ? editingThreshold.entityId : undefined,
        targetOee: 85,
        warningThreshold: editingThreshold.warningThreshold,
        criticalThreshold: editingThreshold.criticalThreshold,
        alertEmails: editingThreshold.emailRecipients,
      });
    }
  };

  const handleCreateNew = () => {
    setEditingThreshold({
      id: 0,
      alertType: "oee",
      entityType: "global",
      warningThreshold: 75,
      criticalThreshold: 60,
      enabled: true,
      emailRecipients: [],
      escalationEnabled: true,
      escalationDelayMinutes: 30,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (threshold: any) => {
    setEditingThreshold({
      id: threshold.id,
      alertType: "oee",
      entityType: threshold.machineId ? "machine" : threshold.productionLineId ? "line" : "global",
      entityId: threshold.machineId || threshold.productionLineId,
      entityName: threshold.machineName || threshold.productionLineName,
      warningThreshold: Number(threshold.warningThreshold) || 75,
      criticalThreshold: Number(threshold.criticalThreshold) || 60,
      enabled: threshold.isActive === 1,
      emailRecipients: threshold.alertEmails ? JSON.parse(threshold.alertEmails) : [],
      escalationEnabled: true,
      escalationDelayMinutes: 30,
    });
    setIsDialogOpen(true);
  };

  const getSeverityColor = (value: number, warning: number, critical: number) => {
    if (value <= critical) return "text-red-500";
    if (value <= warning) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Cấu hình Cảnh báo Nâng cao
            </h1>
            <p className="text-muted-foreground">
              Quản lý ngưỡng cảnh báo và escalation cho OEE, CPK, và các chỉ số khác
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetchOee()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm cấu hình
            </Button>
          </div>
        </div>

        {/* Alert Types Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="oee" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              OEE
            </TabsTrigger>
            <TabsTrigger value="cpk" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              CPK
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Bảo trì
            </TabsTrigger>
            <TabsTrigger value="escalation" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Escalation
            </TabsTrigger>
          </TabsList>

          {/* OEE Tab */}
          <TabsContent value="oee" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ngưỡng cảnh báo OEE</CardTitle>
                <CardDescription>
                  Cấu hình ngưỡng cảnh báo OEE cho từng máy hoặc dây chuyền
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {oeeThresholds?.map((threshold: any) => (
                    <div
                      key={threshold.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${threshold.isActive ? "bg-green-100" : "bg-gray-100"}`}>
                          {threshold.machineId ? (
                            <Cpu className="h-5 w-5 text-blue-500" />
                          ) : threshold.productionLineId ? (
                            <Factory className="h-5 w-5 text-green-500" />
                          ) : (
                            <Target className="h-5 w-5 text-purple-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {threshold.machineName || threshold.productionLineName || "Toàn hệ thống"}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="text-yellow-500">⚠ {threshold.warningThreshold}%</span>
                            <span className="text-red-500">🔴 {threshold.criticalThreshold}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={threshold.isActive ? "default" : "secondary"}>
                          {threshold.isActive ? "Đang bật" : "Tắt"}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(threshold)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500"
                          onClick={() => deleteThreshold.mutate({ id: threshold.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {(!oeeThresholds || oeeThresholds.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      Chưa có cấu hình cảnh báo OEE nào
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CPK Tab */}
          <TabsContent value="cpk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ngưỡng cảnh báo CPK</CardTitle>
                <CardDescription>
                  Cấu hình ngưỡng cảnh báo CPK cho quy trình sản xuất
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Ngưỡng cảnh báo</span>
                    </div>
                    <div className="text-3xl font-bold text-yellow-500">CPK &lt; 1.33</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Quy trình cần được giám sát
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="font-medium">Ngưỡng nghiêm trọng</span>
                    </div>
                    <div className="text-3xl font-bold text-red-500">CPK &lt; 1.00</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Quy trình không đạt yêu cầu
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cảnh báo Bảo trì</CardTitle>
                <CardDescription>
                  Cấu hình cảnh báo cho lịch bảo trì và tồn kho phụ tùng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Bảo trì quá hạn</div>
                      <div className="text-sm text-muted-foreground">
                        Cảnh báo khi có lịch bảo trì quá hạn
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Tồn kho phụ tùng thấp</div>
                      <div className="text-sm text-muted-foreground">
                        Cảnh báo khi tồn kho dưới mức tối thiểu
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Work order chưa hoàn thành</div>
                      <div className="text-sm text-muted-foreground">
                        Cảnh báo work order quá 24h chưa xử lý
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Escalation Tab */}
          <TabsContent value="escalation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cấu hình Escalation</CardTitle>
                <CardDescription>
                  Tự động escalate cảnh báo chưa được xử lý
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Thời gian chờ trước khi escalate</Label>
                      <Select defaultValue="30">
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 phút</SelectItem>
                          <SelectItem value="30">30 phút</SelectItem>
                          <SelectItem value="60">1 giờ</SelectItem>
                          <SelectItem value="120">2 giờ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Số lần escalate tối đa</Label>
                      <Select defaultValue="3">
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 lần</SelectItem>
                          <SelectItem value="2">2 lần</SelectItem>
                          <SelectItem value="3">3 lần</SelectItem>
                          <SelectItem value="5">5 lần</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Escalation Level 1 - Email</Label>
                    <Input
                      className="mt-2"
                      placeholder="email1@company.com, email2@company.com"
                    />
                  </div>

                  <div>
                    <Label>Escalation Level 2 - Manager</Label>
                    <Input
                      className="mt-2"
                      placeholder="manager@company.com"
                    />
                  </div>

                  <div>
                    <Label>Escalation Level 3 - Director</Label>
                    <Input
                      className="mt-2"
                      placeholder="director@company.com"
                    />
                  </div>

                  <Button className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Lưu cấu hình Escalation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingThreshold?.id ? "Chỉnh sửa" : "Thêm"} Cấu hình Cảnh báo
              </DialogTitle>
              <DialogDescription>
                Cấu hình ngưỡng và người nhận cảnh báo
              </DialogDescription>
            </DialogHeader>

            {editingThreshold && (
              <div className="space-y-4">
                <div>
                  <Label>Loại đối tượng</Label>
                  <Select
                    value={editingThreshold.entityType}
                    onValueChange={(v: "machine" | "line" | "global") =>
                      setEditingThreshold({ ...editingThreshold, entityType: v, entityId: undefined })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Toàn hệ thống</SelectItem>
                      <SelectItem value="machine">Máy cụ thể</SelectItem>
                      <SelectItem value="line">Dây chuyền</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingThreshold.entityType === "machine" && (
                  <div>
                    <Label>Chọn máy</Label>
                    <Select
                      value={editingThreshold.entityId?.toString() || ""}
                      onValueChange={(v) =>
                        setEditingThreshold({ ...editingThreshold, entityId: parseInt(v) })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Chọn máy" />
                      </SelectTrigger>
                      <SelectContent>
                        {machines?.map((m: any) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {editingThreshold.entityType === "line" && (
                  <div>
                    <Label>Chọn dây chuyền</Label>
                    <Select
                      value={editingThreshold.entityId?.toString() || ""}
                      onValueChange={(v) =>
                        setEditingThreshold({ ...editingThreshold, entityId: parseInt(v) })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Chọn dây chuyền" />
                      </SelectTrigger>
                      <SelectContent>
                        {productionLines?.map((l: any) => (
                          <SelectItem key={l.id} value={l.id.toString()}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Ngưỡng cảnh báo (Warning): {editingThreshold.warningThreshold}%</Label>
                  <Slider
                    className="mt-2"
                    value={[editingThreshold.warningThreshold]}
                    onValueChange={([v]) =>
                      setEditingThreshold({ ...editingThreshold, warningThreshold: v })
                    }
                    min={50}
                    max={95}
                    step={5}
                  />
                </div>

                <div>
                  <Label>Ngưỡng nghiêm trọng (Critical): {editingThreshold.criticalThreshold}%</Label>
                  <Slider
                    className="mt-2"
                    value={[editingThreshold.criticalThreshold]}
                    onValueChange={([v]) =>
                      setEditingThreshold({ ...editingThreshold, criticalThreshold: v })
                    }
                    min={30}
                    max={80}
                    step={5}
                  />
                </div>

                <div>
                  <Label>Email nhận cảnh báo (cách nhau bởi dấu phẩy)</Label>
                  <Input
                    className="mt-2"
                    value={editingThreshold.emailRecipients.join(", ")}
                    onChange={(e) =>
                      setEditingThreshold({
                        ...editingThreshold,
                        emailRecipients: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="email1@company.com, email2@company.com"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Kích hoạt cảnh báo</Label>
                  <Switch
                    checked={editingThreshold.enabled}
                    onCheckedChange={(v) =>
                      setEditingThreshold({ ...editingThreshold, enabled: v })
                    }
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSaveThreshold}>
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
