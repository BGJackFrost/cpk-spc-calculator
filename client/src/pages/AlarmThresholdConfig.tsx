import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, Settings, AlertTriangle, Plus, Pencil, Trash2, Copy, Volume2, Mail, Clock } from "lucide-react";

interface ThresholdConfig {
  id?: number;
  machineId: number | null;
  fixtureId: number | null;
  measurementName: string;
  warningUsl: number | null;
  warningLsl: number | null;
  warningCpkMin: number | null;
  criticalUsl: number | null;
  criticalLsl: number | null;
  criticalCpkMin: number | null;
  enableSpcRules: boolean;
  spcRuleSeverity: "warning" | "critical";
  enableSound: boolean;
  enableEmail: boolean;
  emailRecipients: string;
  escalationDelayMinutes: number;
  escalationEmails: string;
  isActive: boolean;
}

const defaultConfig: ThresholdConfig = {
  machineId: null,
  fixtureId: null,
  measurementName: "",
  warningUsl: null,
  warningLsl: null,
  warningCpkMin: 1.33,
  criticalUsl: null,
  criticalLsl: null,
  criticalCpkMin: 1.0,
  enableSpcRules: true,
  spcRuleSeverity: "warning",
  enableSound: true,
  enableEmail: false,
  emailRecipients: "",
  escalationDelayMinutes: 5,
  escalationEmails: "",
  isActive: true,
};

export default function AlarmThresholdConfig() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ThresholdConfig | null>(null);
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>("all");

  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: fixtures } = trpc.fixture.list.useQuery();
  const { data: thresholds, refetch } = trpc.alarmThreshold.list.useQuery();
  
  const createMutation = trpc.alarmThreshold.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo cấu hình ngưỡng alarm");
      refetch();
      setDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.alarmThreshold.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật cấu hình");
      refetch();
      setDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.alarmThreshold.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa cấu hình");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSave = () => {
    if (!editingConfig) return;
    
    const data = {
      machineId: editingConfig.machineId,
      fixtureId: editingConfig.fixtureId,
      measurementName: editingConfig.measurementName || null,
      warningUsl: editingConfig.warningUsl ? Math.round(editingConfig.warningUsl * 10000) : null,
      warningLsl: editingConfig.warningLsl ? Math.round(editingConfig.warningLsl * 10000) : null,
      warningCpkMin: editingConfig.warningCpkMin ? Math.round(editingConfig.warningCpkMin * 10000) : null,
      criticalUsl: editingConfig.criticalUsl ? Math.round(editingConfig.criticalUsl * 10000) : null,
      criticalLsl: editingConfig.criticalLsl ? Math.round(editingConfig.criticalLsl * 10000) : null,
      criticalCpkMin: editingConfig.criticalCpkMin ? Math.round(editingConfig.criticalCpkMin * 10000) : null,
      enableSpcRules: editingConfig.enableSpcRules ? 1 : 0,
      spcRuleSeverity: editingConfig.spcRuleSeverity,
      enableSound: editingConfig.enableSound ? 1 : 0,
      enableEmail: editingConfig.enableEmail ? 1 : 0,
      emailRecipients: editingConfig.emailRecipients || null,
      escalationDelayMinutes: editingConfig.escalationDelayMinutes,
      escalationEmails: editingConfig.escalationEmails || null,
      isActive: editingConfig.isActive ? 1 : 0,
    };

    if (editingConfig.id) {
      updateMutation.mutate({ id: editingConfig.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (threshold: any) => {
    setEditingConfig({
      id: threshold.id,
      machineId: threshold.machineId,
      fixtureId: threshold.fixtureId,
      measurementName: threshold.measurementName || "",
      warningUsl: threshold.warningUsl ? threshold.warningUsl / 10000 : null,
      warningLsl: threshold.warningLsl ? threshold.warningLsl / 10000 : null,
      warningCpkMin: threshold.warningCpkMin ? threshold.warningCpkMin / 10000 : null,
      criticalUsl: threshold.criticalUsl ? threshold.criticalUsl / 10000 : null,
      criticalLsl: threshold.criticalLsl ? threshold.criticalLsl / 10000 : null,
      criticalCpkMin: threshold.criticalCpkMin ? threshold.criticalCpkMin / 10000 : null,
      enableSpcRules: threshold.enableSpcRules === 1,
      spcRuleSeverity: threshold.spcRuleSeverity || "warning",
      enableSound: threshold.enableSound === 1,
      enableEmail: threshold.enableEmail === 1,
      emailRecipients: threshold.emailRecipients || "",
      escalationDelayMinutes: threshold.escalationDelayMinutes || 5,
      escalationEmails: threshold.escalationEmails || "",
      isActive: threshold.isActive === 1,
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (threshold: any) => {
    setEditingConfig({
      ...defaultConfig,
      machineId: threshold.machineId,
      fixtureId: threshold.fixtureId,
      measurementName: threshold.measurementName || "",
      warningUsl: threshold.warningUsl ? threshold.warningUsl / 10000 : null,
      warningLsl: threshold.warningLsl ? threshold.warningLsl / 10000 : null,
      warningCpkMin: threshold.warningCpkMin ? threshold.warningCpkMin / 10000 : null,
      criticalUsl: threshold.criticalUsl ? threshold.criticalUsl / 10000 : null,
      criticalLsl: threshold.criticalLsl ? threshold.criticalLsl / 10000 : null,
      criticalCpkMin: threshold.criticalCpkMin ? threshold.criticalCpkMin / 10000 : null,
      enableSpcRules: threshold.enableSpcRules === 1,
      spcRuleSeverity: threshold.spcRuleSeverity || "warning",
      enableSound: threshold.enableSound === 1,
      enableEmail: threshold.enableEmail === 1,
      emailRecipients: threshold.emailRecipients || "",
      escalationDelayMinutes: threshold.escalationDelayMinutes || 5,
      escalationEmails: threshold.escalationEmails || "",
    });
    setDialogOpen(true);
  };

  const getMachineName = (machineId: number | null) => {
    if (!machineId) return "Tất cả máy";
    const machine = machines?.find((m: any) => m.id === machineId);
    return machine?.name || `Máy #${machineId}`;
  };

  const getFixtureName = (fixtureId: number | null) => {
    if (!fixtureId) return "Tất cả fixture";
    const fixture = fixtures?.find((f: any) => f.id === fixtureId);
    return fixture?.name || `Fixture #${fixtureId}`;
  };

  const filteredThresholds = thresholds?.filter((t: any) => {
    if (selectedMachineFilter === "all") return true;
    if (selectedMachineFilter === "global") return !t.machineId;
    return t.machineId === parseInt(selectedMachineFilter);
  });

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Cấu hình Ngưỡng Alarm
            </h1>
            <p className="text-muted-foreground">
              Thiết lập ngưỡng cảnh báo cho từng máy và fixture
            </p>
          </div>
          <Button onClick={() => { setEditingConfig({ ...defaultConfig }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm cấu hình
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách cấu hình ngưỡng</CardTitle>
              <Select value={selectedMachineFilter} onValueChange={setSelectedMachineFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Lọc theo máy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="global">Cấu hình chung</SelectItem>
                  {machines?.map((m: any) => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Máy</TableHead>
                  <TableHead>Fixture</TableHead>
                  <TableHead>Measurement</TableHead>
                  <TableHead>Warning CPK</TableHead>
                  <TableHead>Critical CPK</TableHead>
                  <TableHead>SPC Rules</TableHead>
                  <TableHead>Thông báo</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredThresholds?.map((threshold: any) => (
                  <TableRow key={threshold.id}>
                    <TableCell className="font-medium">{getMachineName(threshold.machineId)}</TableCell>
                    <TableCell>{getFixtureName(threshold.fixtureId)}</TableCell>
                    <TableCell>{threshold.measurementName || "Tất cả"}</TableCell>
                    <TableCell>
                      {threshold.warningCpkMin ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          ≥ {(threshold.warningCpkMin / 10000).toFixed(2)}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {threshold.criticalCpkMin ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                          ≥ {(threshold.criticalCpkMin / 10000).toFixed(2)}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {threshold.enableSpcRules ? (
                        <Badge variant={threshold.spcRuleSeverity === "critical" ? "destructive" : "secondary"}>
                          {threshold.spcRuleSeverity === "critical" ? "Critical" : "Warning"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Tắt</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {threshold.enableSound === 1 && <Volume2 className="h-4 w-4 text-blue-500" />}
                        {threshold.enableEmail === 1 && <Mail className="h-4 w-4 text-green-500" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={threshold.isActive === 1 ? "default" : "secondary"}>
                        {threshold.isActive === 1 ? "Hoạt động" : "Tắt"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(threshold)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(threshold)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate({ id: threshold.id })}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredThresholds || filteredThresholds.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Chưa có cấu hình ngưỡng nào. Nhấn "Thêm cấu hình" để bắt đầu.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog cấu hình */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig?.id ? "Chỉnh sửa cấu hình ngưỡng" : "Thêm cấu hình ngưỡng mới"}
              </DialogTitle>
              <DialogDescription>
                Thiết lập ngưỡng cảnh báo cho máy và fixture
              </DialogDescription>
            </DialogHeader>

            {editingConfig && (
              <Tabs defaultValue="thresholds" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="thresholds">Ngưỡng</TabsTrigger>
                  <TabsTrigger value="spc">SPC Rules</TabsTrigger>
                  <TabsTrigger value="notifications">Thông báo</TabsTrigger>
                </TabsList>

                <TabsContent value="thresholds" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Máy</Label>
                      <Select 
                        value={editingConfig.machineId?.toString() || "all"} 
                        onValueChange={(v) => setEditingConfig({ ...editingConfig, machineId: v === "all" ? null : parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn máy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả máy (Global)</SelectItem>
                          {machines?.map((m: any) => (
                            <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fixture</Label>
                      <Select 
                        value={editingConfig.fixtureId?.toString() || "all"} 
                        onValueChange={(v) => setEditingConfig({ ...editingConfig, fixtureId: v === "all" ? null : parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn fixture" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả fixture</SelectItem>
                          {fixtures?.filter((f: any) => !editingConfig.machineId || f.machineId === editingConfig.machineId).map((f: any) => (
                            <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Measurement Name (để trống = tất cả)</Label>
                    <Input 
                      value={editingConfig.measurementName} 
                      onChange={(e) => setEditingConfig({ ...editingConfig, measurementName: e.target.value })}
                      placeholder="Ví dụ: Diameter, Length, Width..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <Card className="border-yellow-200 bg-yellow-50/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
                          <AlertTriangle className="h-4 w-4" />
                          Ngưỡng Warning
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">USL</Label>
                            <Input 
                              type="number" 
                              step="0.001"
                              value={editingConfig.warningUsl ?? ""} 
                              onChange={(e) => setEditingConfig({ ...editingConfig, warningUsl: e.target.value ? parseFloat(e.target.value) : null })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">LSL</Label>
                            <Input 
                              type="number" 
                              step="0.001"
                              value={editingConfig.warningLsl ?? ""} 
                              onChange={(e) => setEditingConfig({ ...editingConfig, warningLsl: e.target.value ? parseFloat(e.target.value) : null })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">CPK tối thiểu</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={editingConfig.warningCpkMin ?? ""} 
                            onChange={(e) => setEditingConfig({ ...editingConfig, warningCpkMin: e.target.value ? parseFloat(e.target.value) : null })}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-red-200 bg-red-50/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          Ngưỡng Critical
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">USL</Label>
                            <Input 
                              type="number" 
                              step="0.001"
                              value={editingConfig.criticalUsl ?? ""} 
                              onChange={(e) => setEditingConfig({ ...editingConfig, criticalUsl: e.target.value ? parseFloat(e.target.value) : null })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">LSL</Label>
                            <Input 
                              type="number" 
                              step="0.001"
                              value={editingConfig.criticalLsl ?? ""} 
                              onChange={(e) => setEditingConfig({ ...editingConfig, criticalLsl: e.target.value ? parseFloat(e.target.value) : null })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">CPK tối thiểu</Label>
                          <Input 
                            type="number" 
                            step="0.01"
                            value={editingConfig.criticalCpkMin ?? ""} 
                            onChange={(e) => setEditingConfig({ ...editingConfig, criticalCpkMin: e.target.value ? parseFloat(e.target.value) : null })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="spc" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Bật kiểm tra SPC Rules</Label>
                      <p className="text-sm text-muted-foreground">
                        Cảnh báo khi vi phạm 8 SPC Rules (Western Electric)
                      </p>
                    </div>
                    <Switch 
                      checked={editingConfig.enableSpcRules} 
                      onCheckedChange={(v) => setEditingConfig({ ...editingConfig, enableSpcRules: v })}
                    />
                  </div>

                  {editingConfig.enableSpcRules && (
                    <div className="space-y-2">
                      <Label>Mức độ nghiêm trọng khi vi phạm SPC Rules</Label>
                      <Select 
                        value={editingConfig.spcRuleSeverity} 
                        onValueChange={(v: "warning" | "critical") => setEditingConfig({ ...editingConfig, spcRuleSeverity: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warning">Warning (Cảnh báo)</SelectItem>
                          <SelectItem value="critical">Critical (Nghiêm trọng)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-5 w-5 text-blue-500" />
                      <div>
                        <Label>Âm thanh cảnh báo</Label>
                        <p className="text-sm text-muted-foreground">Phát âm thanh khi có alarm</p>
                      </div>
                    </div>
                    <Switch 
                      checked={editingConfig.enableSound} 
                      onCheckedChange={(v) => setEditingConfig({ ...editingConfig, enableSound: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-green-500" />
                      <div>
                        <Label>Gửi Email</Label>
                        <p className="text-sm text-muted-foreground">Gửi email khi có alarm</p>
                      </div>
                    </div>
                    <Switch 
                      checked={editingConfig.enableEmail} 
                      onCheckedChange={(v) => setEditingConfig({ ...editingConfig, enableEmail: v })}
                    />
                  </div>

                  {editingConfig.enableEmail && (
                    <div className="space-y-2">
                      <Label>Email nhận thông báo (phân cách bằng dấu phẩy)</Label>
                      <Input 
                        value={editingConfig.emailRecipients} 
                        onChange={(e) => setEditingConfig({ ...editingConfig, emailRecipients: e.target.value })}
                        placeholder="email1@example.com, email2@example.com"
                      />
                    </div>
                  )}

                  <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                        <Clock className="h-4 w-4" />
                        Escalation (Leo thang)
                      </CardTitle>
                      <CardDescription>
                        Gửi thông báo cho cấp cao hơn nếu alarm không được xác nhận
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label>Thời gian chờ (phút)</Label>
                        <Input 
                          type="number" 
                          value={editingConfig.escalationDelayMinutes} 
                          onChange={(e) => setEditingConfig({ ...editingConfig, escalationDelayMinutes: parseInt(e.target.value) || 5 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email escalation</Label>
                        <Input 
                          value={editingConfig.escalationEmails} 
                          onChange={(e) => setEditingConfig({ ...editingConfig, escalationEmails: e.target.value })}
                          placeholder="manager@example.com"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Trạng thái</Label>
                      <p className="text-sm text-muted-foreground">Bật/tắt cấu hình này</p>
                    </div>
                    <Switch 
                      checked={editingConfig.isActive} 
                      onCheckedChange={(v) => setEditingConfig({ ...editingConfig, isActive: v })}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingConfig?.id ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
