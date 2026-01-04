import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, Loader2, FileBarChart, Send, Clock, Mail, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function EscalationReports() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", frequency: "weekly" as "daily" | "weekly" | "monthly",
    dayOfWeek: 1, dayOfMonth: 1, timeOfDay: "08:00", timezone: "Asia/Ho_Chi_Minh",
    emailRecipients: "", webhookConfigIds: "",
    includeStats: true, includeTopAlerts: true, includeResolvedAlerts: true, includeTrends: true,
    alertTypes: "", productionLineIds: "", isActive: true,
  });

  const { data: configs, isLoading, refetch } = trpc.escalationReport.list.useQuery();
  const { data: history } = trpc.escalationReport.getHistory.useQuery({ limit: 50 });
  const { data: webhooks } = trpc.escalationWebhook.list.useQuery({ activeOnly: true });

  const createMutation = trpc.escalationReport.create.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã tạo cấu hình báo cáo" }); setIsCreateOpen(false); resetForm(); refetch(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const updateMutation = trpc.escalationReport.update.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã cập nhật cấu hình" }); setEditingId(null); resetForm(); refetch(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const deleteMutation = trpc.escalationReport.delete.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã xóa cấu hình" }); refetch(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const sendNowMutation = trpc.escalationReport.sendNow.useMutation({
    onSuccess: (result) => {
      if (result.success) toast({ title: "Thành công", description: `Đã gửi ${result.emailsSent} emails, ${result.webhooksSent} webhooks` });
      else toast({ title: "Cảnh báo", description: result.error || "Gửi báo cáo không hoàn toàn thành công", variant: "destructive" });
      refetch();
    },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const resetForm = () => {
    setFormData({
      name: "", description: "", frequency: "weekly", dayOfWeek: 1, dayOfMonth: 1, timeOfDay: "08:00", timezone: "Asia/Ho_Chi_Minh",
      emailRecipients: "", webhookConfigIds: "",
      includeStats: true, includeTopAlerts: true, includeResolvedAlerts: true, includeTrends: true,
      alertTypes: "", productionLineIds: "", isActive: true,
    });
  };

  const handleEdit = (config: any) => {
    setEditingId(config.id);
    setFormData({
      name: config.name, description: config.description || "", frequency: config.frequency,
      dayOfWeek: config.dayOfWeek || 1, dayOfMonth: config.dayOfMonth || 1, timeOfDay: config.timeOfDay, timezone: config.timezone,
      emailRecipients: config.emailRecipients?.join(", ") || "", webhookConfigIds: config.webhookConfigIds?.join(", ") || "",
      includeStats: config.includeStats, includeTopAlerts: config.includeTopAlerts,
      includeResolvedAlerts: config.includeResolvedAlerts, includeTrends: config.includeTrends,
      alertTypes: config.alertTypes?.join(", ") || "", productionLineIds: config.productionLineIds?.join(", ") || "",
      isActive: config.isActive,
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = () => {
    const parseList = (s: string) => s ? s.split(",").map(e => e.trim()).filter(Boolean) : undefined;
    const parseNumbers = (s: string) => s ? s.split(",").map(n => parseInt(n.trim())).filter(n => !isNaN(n)) : undefined;
    const data: any = {
      name: formData.name, description: formData.description || undefined, frequency: formData.frequency,
      timeOfDay: formData.timeOfDay, timezone: formData.timezone,
      emailRecipients: parseList(formData.emailRecipients), webhookConfigIds: parseNumbers(formData.webhookConfigIds),
      includeStats: formData.includeStats, includeTopAlerts: formData.includeTopAlerts,
      includeResolvedAlerts: formData.includeResolvedAlerts, includeTrends: formData.includeTrends,
      alertTypes: parseList(formData.alertTypes), productionLineIds: parseNumbers(formData.productionLineIds),
      isActive: formData.isActive,
    };
    if (formData.frequency === "weekly") data.dayOfWeek = formData.dayOfWeek;
    if (formData.frequency === "monthly") data.dayOfMonth = formData.dayOfMonth;
    if (editingId) updateMutation.mutate({ id: editingId, ...data });
    else createMutation.mutate(data);
  };

  const getFrequencyLabel = (f: string) => ({ daily: "Hàng ngày", weekly: "Hàng tuần", monthly: "Hàng tháng" }[f] || f);
  const getDayOfWeekLabel = (d: number) => ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d] || "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Escalation Reports</h1>
            <p className="text-muted-foreground">Cấu hình báo cáo escalation tự động gửi định kỳ</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { setEditingId(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Thêm Báo cáo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Chỉnh sửa Báo cáo" : "Thêm Báo cáo mới"}</DialogTitle>
                <DialogDescription>Cấu hình báo cáo escalation tự động</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tên báo cáo *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Báo cáo tuần" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tần suất *</Label>
                    <Select value={formData.frequency} onValueChange={(v: any) => setFormData({ ...formData, frequency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Hàng ngày</SelectItem>
                        <SelectItem value="weekly">Hàng tuần</SelectItem>
                        <SelectItem value="monthly">Hàng tháng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {formData.frequency === "weekly" && (
                    <div className="space-y-2">
                      <Label>Ngày trong tuần</Label>
                      <Select value={String(formData.dayOfWeek)} onValueChange={(v) => setFormData({ ...formData, dayOfWeek: parseInt(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"].map((d, i) => (
                            <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.frequency === "monthly" && (
                    <div className="space-y-2">
                      <Label>Ngày trong tháng</Label>
                      <Input type="number" min={1} max={31} value={formData.dayOfMonth} onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Giờ gửi</Label>
                    <Input type="time" value={formData.timeOfDay} onChange={(e) => setFormData({ ...formData, timeOfDay: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Múi giờ</Label>
                    <Input value={formData.timezone} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label><Mail className="h-4 w-4 inline mr-1" /> Email nhận báo cáo</Label>
                  <Input value={formData.emailRecipients} onChange={(e) => setFormData({ ...formData, emailRecipients: e.target.value })} placeholder="email1@test.com, email2@test.com" />
                </div>
                <div className="space-y-2">
                  <Label>Webhook IDs (gửi qua Slack/Teams)</Label>
                  <Input value={formData.webhookConfigIds} onChange={(e) => setFormData({ ...formData, webhookConfigIds: e.target.value })} placeholder="1, 2" />
                  {webhooks && webhooks.length > 0 && (
                    <p className="text-xs text-muted-foreground">Có sẵn: {webhooks.map((w: any) => `${w.id}:${w.name}`).join(", ")}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2"><Switch checked={formData.includeStats} onCheckedChange={(v) => setFormData({ ...formData, includeStats: v })} /><Label>Thống kê tổng quan</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={formData.includeTopAlerts} onCheckedChange={(v) => setFormData({ ...formData, includeTopAlerts: v })} /><Label>Top alerts chưa xử lý</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={formData.includeResolvedAlerts} onCheckedChange={(v) => setFormData({ ...formData, includeResolvedAlerts: v })} /><Label>Alerts đã xử lý</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={formData.includeTrends} onCheckedChange={(v) => setFormData({ ...formData, includeTrends: v })} /><Label>Xu hướng theo ngày</Label></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} /><Label>Kích hoạt</Label></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingId(null); resetForm(); }}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? "Cập nhật" : "Tạo mới"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="configs">
          <TabsList>
            <TabsTrigger value="configs">Cấu hình</TabsTrigger>
            <TabsTrigger value="history">Lịch sử gửi</TabsTrigger>
          </TabsList>

          <TabsContent value="configs">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : configs && configs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Tần suất</TableHead>
                        <TableHead>Lịch gửi</TableHead>
                        <TableHead>Người nhận</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((config: any) => (
                        <TableRow key={config.id}>
                          <TableCell><p className="font-medium">{config.name}</p></TableCell>
                          <TableCell><Badge variant="outline">{getFrequencyLabel(config.frequency)}</Badge></TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {config.frequency === "weekly" && <span>{getDayOfWeekLabel(config.dayOfWeek)}, </span>}
                              {config.frequency === "monthly" && <span>Ngày {config.dayOfMonth}, </span>}
                              <span>{config.timeOfDay}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {config.emailRecipients?.length > 0 && <p>{config.emailRecipients.length} emails</p>}
                              {config.webhookConfigIds?.length > 0 && <p>{config.webhookConfigIds.length} webhooks</p>}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant={config.isActive ? "default" : "secondary"}>{config.isActive ? "Hoạt động" : "Tắt"}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => sendNowMutation.mutate({ id: config.id })} disabled={sendNowMutation.isPending}><Send className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => { if (confirm("Xóa cấu hình này?")) deleteMutation.mutate({ id: config.id }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileBarChart className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium">Chưa có cấu hình báo cáo</h3>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử gửi báo cáo</CardTitle>
                <CardDescription>50 lần gửi gần nhất</CardDescription>
              </CardHeader>
              <CardContent>
                {history && history.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Kỳ báo cáo</TableHead>
                        <TableHead>Thống kê</TableHead>
                        <TableHead>Gửi</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((h: any) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-sm">{new Date(Number(h.sentAt)).toLocaleString("vi-VN")}</TableCell>
                          <TableCell className="text-sm">{new Date(Number(h.reportPeriodStart)).toLocaleDateString("vi-VN")} - {new Date(Number(h.reportPeriodEnd)).toLocaleDateString("vi-VN")}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="text-blue-600">{h.totalAlerts}</span> tổng,{" "}
                              <span className="text-green-600">{h.resolvedAlerts}</span> xử lý,{" "}
                              <span className="text-red-600">{h.pendingAlerts}</span> chờ
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{h.emailsSent} emails, {h.webhooksSent} webhooks</TableCell>
                          <TableCell>
                            {h.status === "sent" && <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" /> Thành công</Badge>}
                            {h.status === "partial" && <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" /> Một phần</Badge>}
                            {h.status === "failed" && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Lỗi</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Chưa có lịch sử gửi</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
