import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, Plus, Trash2, Edit, Send, History, Loader2, CheckCircle, XCircle, Power, PowerOff, TestTube } from "lucide-react";

export default function AlertEmailConfig() {
  const [activeTab, setActiveTab] = useState("configs");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", severityThreshold: "major" as "minor" | "major" | "critical", emailRecipients: "", cooldownMinutes: 30, includeImage: true, includeAiAnalysis: true,
    emailSubjectTemplate: "[CẢNH BÁO] Phát hiện lỗi {{severity}} - {{productCode}}",
    emailBodyTemplate: "Hệ thống CPK/SPC đã phát hiện lỗi chất lượng:\n\n- Loại cảnh báo: {{alertType}}\n- Mức độ: {{severity}}\n- Mã sản phẩm: {{productCode}}\n- Thời gian: {{timestamp}}\n\n{{aiAnalysis}}",
  });

  const { data: configsData, refetch: refetchConfigs } = trpc.alertEmail.getConfigs.useQuery({});
  const { data: historyData, refetch: refetchHistory } = trpc.alertEmail.getHistory.useQuery({ limit: 50 });
  const { data: statsData } = trpc.alertEmail.getStats.useQuery({ days: 30 });

  const createMutation = trpc.alertEmail.createConfig.useMutation({ onSuccess: () => { refetchConfigs(); setIsCreateOpen(false); resetForm(); toast.success("Đã tạo cấu hình mới"); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });
  const updateMutation = trpc.alertEmail.updateConfig.useMutation({ onSuccess: () => { refetchConfigs(); setEditingConfig(null); resetForm(); toast.success("Đã cập nhật"); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });
  const deleteMutation = trpc.alertEmail.deleteConfig.useMutation({ onSuccess: () => { refetchConfigs(); toast.success("Đã xóa"); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });
  const toggleMutation = trpc.alertEmail.toggleActive.useMutation({ onSuccess: (d) => { refetchConfigs(); toast.success(d.isActive ? "Đã bật" : "Đã tắt"); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });
  const testMutation = trpc.alertEmail.testConfig.useMutation({ onSuccess: (d) => { if (d.success) toast.success("Đã gửi email test"); else toast.error("Gửi test thất bại"); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });
  const resendMutation = trpc.alertEmail.resendAlert.useMutation({ onSuccess: (d) => { refetchHistory(); if (d.success) toast.success("Đã gửi lại"); else toast.error("Gửi lại thất bại"); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });

  const resetForm = () => setFormData({ name: "", description: "", severityThreshold: "major", emailRecipients: "", cooldownMinutes: 30, includeImage: true, includeAiAnalysis: true, emailSubjectTemplate: "[CẢNH BÁO] Phát hiện lỗi {{severity}} - {{productCode}}", emailBodyTemplate: "Hệ thống CPK/SPC đã phát hiện lỗi chất lượng:\n\n- Loại cảnh báo: {{alertType}}\n- Mức độ: {{severity}}\n- Mã sản phẩm: {{productCode}}\n- Thời gian: {{timestamp}}\n\n{{aiAnalysis}}" });

  const handleSubmit = () => {
    const recipients = formData.emailRecipients.split(",").map(e => e.trim()).filter(e => e);
    if (!formData.name || recipients.length === 0) { toast.error("Vui lòng điền đầy đủ thông tin"); return; }
    const data = { ...formData, emailRecipients: recipients };
    if (editingConfig) updateMutation.mutate({ id: editingConfig, ...data });
    else createMutation.mutate(data);
  };

  const configs = configsData?.configs || [];
  const history = historyData?.history || [];
  const stats = statsData || { totalAlerts: 0, bySeverity: {}, byStatus: {} };
  const getSeverityColor = (s: string) => { switch (s) { case "critical": case "major": return "destructive"; case "minor": return "secondary"; default: return "default"; } };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Cấu hình Email Cảnh báo</h1><p className="text-muted-foreground">Tự động gửi email khi AI phát hiện lỗi nghiêm trọng</p></div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Tạo cấu hình</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingConfig ? "Chỉnh sửa" : "Tạo mới"}</DialogTitle><DialogDescription>Cấu hình email cảnh báo tự động</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Tên *</Label><Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="VD: Cảnh báo lỗi nghiêm trọng" /></div>
                  <div className="space-y-2"><Label>Ngưỡng</Label><Select value={formData.severityThreshold} onValueChange={(v: typeof formData.severityThreshold) => setFormData(p => ({ ...p, severityThreshold: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minor">Nhẹ</SelectItem><SelectItem value="major">Trung bình</SelectItem><SelectItem value="critical">Nghiêm trọng</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label>Mô tả</Label><Input value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Email * (phân cách bằng dấu phẩy)</Label><Input value={formData.emailRecipients} onChange={(e) => setFormData(p => ({ ...p, emailRecipients: e.target.value }))} placeholder="email1@example.com, email2@example.com" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Cooldown (phút)</Label><Input type="number" value={formData.cooldownMinutes} onChange={(e) => setFormData(p => ({ ...p, cooldownMinutes: parseInt(e.target.value) || 30 }))} min={1} max={1440} /></div>
                  <div className="space-y-4 pt-6"><div className="flex items-center justify-between"><Label>Đính kèm hình ảnh</Label><Switch checked={formData.includeImage} onCheckedChange={(v) => setFormData(p => ({ ...p, includeImage: v }))} /></div><div className="flex items-center justify-between"><Label>Đính kèm AI</Label><Switch checked={formData.includeAiAnalysis} onCheckedChange={(v) => setFormData(p => ({ ...p, includeAiAnalysis: v }))} /></div></div>
                </div>
                <div className="space-y-2"><Label>Template tiêu đề</Label><Input value={formData.emailSubjectTemplate} onChange={(e) => setFormData(p => ({ ...p, emailSubjectTemplate: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Template nội dung</Label><Textarea value={formData.emailBodyTemplate} onChange={(e) => setFormData(p => ({ ...p, emailBodyTemplate: e.target.value }))} rows={5} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditingConfig(null); resetForm(); }}>Hủy</Button><Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingConfig ? "Cập nhật" : "Tạo"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tổng (30 ngày)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalAlerts}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Nghiêm trọng</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-500">{(stats.bySeverity as Record<string, number>)?.critical || 0}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Đã gửi</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-500">{(stats.byStatus as Record<string, number>)?.sent || 0}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Thất bại</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-yellow-500">{(stats.byStatus as Record<string, number>)?.failed || 0}</p></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList><TabsTrigger value="configs"><Mail className="h-4 w-4 mr-2" />Cấu hình</TabsTrigger><TabsTrigger value="history"><History className="h-4 w-4 mr-2" />Lịch sử</TabsTrigger></TabsList>

          <TabsContent value="configs" className="space-y-4">
            {configs.map((c) => (
              <Card key={c.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><CardTitle className="text-lg">{c.name}</CardTitle><Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? <><Power className="h-3 w-3 mr-1" />Bật</> : <><PowerOff className="h-3 w-3 mr-1" />Tắt</>}</Badge><Badge variant={getSeverityColor(c.severityThreshold)}>≥ {c.severityThreshold}</Badge></div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => testMutation.mutate({ id: c.id })} disabled={testMutation.isPending}><TestTube className="h-4 w-4 mr-1" />Test</Button>
                      <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate({ id: c.id })}>{c.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}</Button>
                      <Button variant="outline" size="sm" onClick={() => { setEditingConfig(c.id); setFormData({ name: c.name, description: c.description || "", severityThreshold: c.severityThreshold as "minor" | "major" | "critical", emailRecipients: (c.emailRecipients as string[])?.join(", ") || "", cooldownMinutes: c.cooldownMinutes, includeImage: !!c.includeImage, includeAiAnalysis: !!c.includeAiAnalysis, emailSubjectTemplate: c.emailSubjectTemplate || "", emailBodyTemplate: c.emailBodyTemplate || "" }); setIsCreateOpen(true); }}><Edit className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate({ id: c.id })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  {c.description && <CardDescription>{c.description}</CardDescription>}
                </CardHeader>
                <CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div><span className="text-muted-foreground">Email:</span><p className="font-medium truncate">{(c.emailRecipients as string[])?.join(", ") || "N/A"}</p></div><div><span className="text-muted-foreground">Cooldown:</span><p className="font-medium">{c.cooldownMinutes} phút</p></div><div><span className="text-muted-foreground">Đã gửi:</span><p className="font-medium">{c.totalAlertsSent}</p></div><div><span className="text-muted-foreground">Gần nhất:</span><p className="font-medium">{c.lastAlertSentAt ? new Date(c.lastAlertSentAt).toLocaleString("vi-VN") : "Chưa có"}</p></div></div></CardContent>
              </Card>
            ))}
            {configs.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground"><Mail className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Chưa có cấu hình nào</p></CardContent></Card>}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Lịch sử gửi email</CardTitle><CardDescription>50 email gần nhất</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">{h.status === "sent" ? <CheckCircle className="h-5 w-5 text-green-500" /> : h.status === "failed" ? <XCircle className="h-5 w-5 text-red-500" /> : <Loader2 className="h-5 w-5 animate-spin" />}<div><p className="font-medium truncate max-w-md">{h.subject}</p><div className="flex items-center gap-2 text-sm text-muted-foreground"><Badge variant={getSeverityColor(h.severity)} className="text-xs">{h.severity}</Badge><span>{new Date(h.createdAt!).toLocaleString("vi-VN")}</span></div></div></div>
                      <div className="flex items-center gap-2"><Badge variant={h.status === "sent" ? "default" : h.status === "failed" ? "destructive" : "secondary"}>{h.status}</Badge>{h.status === "failed" && <Button variant="outline" size="sm" onClick={() => resendMutation.mutate({ historyId: h.id })} disabled={resendMutation.isPending}><Send className="h-4 w-4" /></Button>}</div>
                    </div>
                  ))}
                  {history.length === 0 && <div className="text-center py-8 text-muted-foreground"><History className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Chưa có lịch sử</p></div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
