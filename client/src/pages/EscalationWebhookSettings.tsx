import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, TestTube, Loader2, Webhook, CheckCircle, XCircle } from "lucide-react";

export default function EscalationWebhookSettings() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", channelType: "slack" as "slack" | "teams" | "discord" | "custom",
    webhookUrl: "", slackChannel: "", slackMentions: "", teamsTitle: "",
    customHeaders: "", customBodyTemplate: "", includeDetails: true, includeChart: false, isActive: true,
  });

  const { data: configs, isLoading, refetch } = trpc.escalationWebhook.list.useQuery();
  const { data: logs } = trpc.escalationWebhook.getLogs.useQuery({ limit: 50 });

  const createMutation = trpc.escalationWebhook.create.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã tạo webhook mới" }); setIsCreateOpen(false); resetForm(); refetch(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const updateMutation = trpc.escalationWebhook.update.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã cập nhật webhook" }); setEditingId(null); resetForm(); refetch(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const deleteMutation = trpc.escalationWebhook.delete.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã xóa webhook" }); refetch(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const testMutation = trpc.escalationWebhook.test.useMutation({
    onSuccess: (result) => {
      if (result.success) toast({ title: "Thành công", description: "Test webhook thành công" });
      else toast({ title: "Lỗi", description: result.error || "Test webhook thất bại", variant: "destructive" });
    },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const resetForm = () => {
    setFormData({
      name: "", description: "", channelType: "slack", webhookUrl: "", slackChannel: "", slackMentions: "",
      teamsTitle: "", customHeaders: "", customBodyTemplate: "", includeDetails: true, includeChart: false, isActive: true,
    });
  };

  const handleEdit = (config: any) => {
    setEditingId(config.id);
    setFormData({
      name: config.name, description: config.description || "", channelType: config.channelType,
      webhookUrl: config.webhookUrl, slackChannel: config.slackChannel || "",
      slackMentions: config.slackMentions?.join(", ") || "", teamsTitle: config.teamsTitle || "",
      customHeaders: config.customHeaders ? JSON.stringify(config.customHeaders, null, 2) : "",
      customBodyTemplate: config.customBodyTemplate || "",
      includeDetails: config.includeDetails, includeChart: config.includeChart, isActive: config.isActive,
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = () => {
    const data: any = {
      name: formData.name, description: formData.description || undefined, channelType: formData.channelType,
      webhookUrl: formData.webhookUrl, includeDetails: formData.includeDetails, includeChart: formData.includeChart, isActive: formData.isActive,
    };
    if (formData.channelType === "slack") {
      if (formData.slackChannel) data.slackChannel = formData.slackChannel;
      if (formData.slackMentions) data.slackMentions = formData.slackMentions.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    if (formData.channelType === "teams" && formData.teamsTitle) data.teamsTitle = formData.teamsTitle;
    if (formData.channelType === "custom") {
      if (formData.customHeaders) try { data.customHeaders = JSON.parse(formData.customHeaders); } catch {}
      if (formData.customBodyTemplate) data.customBodyTemplate = formData.customBodyTemplate;
    }
    if (editingId) updateMutation.mutate({ id: editingId, ...data });
    else createMutation.mutate(data);
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "slack": return "🔷";
      case "teams": return "🟣";
      case "discord": return "🎮";
      default: return "🔗";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Escalation Webhook Settings</h1>
            <p className="text-muted-foreground">Cấu hình webhook để gửi thông báo escalation đến Slack, Teams, Discord</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { setEditingId(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Thêm Webhook</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Chỉnh sửa Webhook" : "Thêm Webhook mới"}</DialogTitle>
                <DialogDescription>Cấu hình webhook để nhận thông báo escalation</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tên webhook *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Slack Production Alerts" />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại kênh *</Label>
                    <Select value={formData.channelType} onValueChange={(v: any) => setFormData({ ...formData, channelType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slack">🔷 Slack</SelectItem>
                        <SelectItem value="teams">🟣 Microsoft Teams</SelectItem>
                        <SelectItem value="discord">🎮 Discord</SelectItem>
                        <SelectItem value="custom">🔗 Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Webhook URL *</Label>
                  <Input value={formData.webhookUrl} onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })} placeholder="https://hooks.slack.com/services/..." />
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                </div>
                {formData.channelType === "slack" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Slack Channel</Label>
                      <Input value={formData.slackChannel} onChange={(e) => setFormData({ ...formData, slackChannel: e.target.value })} placeholder="#alerts" />
                    </div>
                    <div className="space-y-2">
                      <Label>Slack Mentions (User IDs)</Label>
                      <Input value={formData.slackMentions} onChange={(e) => setFormData({ ...formData, slackMentions: e.target.value })} placeholder="U123456, U789012" />
                    </div>
                  </div>
                )}
                {formData.channelType === "teams" && (
                  <div className="space-y-2">
                    <Label>Teams Card Title</Label>
                    <Input value={formData.teamsTitle} onChange={(e) => setFormData({ ...formData, teamsTitle: e.target.value })} placeholder="SPC Alert" />
                  </div>
                )}
                {formData.channelType === "custom" && (
                  <>
                    <div className="space-y-2">
                      <Label>Custom Headers (JSON)</Label>
                      <Textarea value={formData.customHeaders} onChange={(e) => setFormData({ ...formData, customHeaders: e.target.value })} rows={3} placeholder='{"Authorization": "Bearer xxx"}' />
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Body Template (JSON)</Label>
                      <Textarea value={formData.customBodyTemplate} onChange={(e) => setFormData({ ...formData, customBodyTemplate: e.target.value })} rows={4} placeholder='{"alert": "{{alertTitle}}"}' />
                    </div>
                  </>
                )}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2"><Switch checked={formData.includeDetails} onCheckedChange={(v) => setFormData({ ...formData, includeDetails: v })} /><Label>Bao gồm chi tiết</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} /><Label>Kích hoạt</Label></div>
                </div>
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
            <TabsTrigger value="configs">Cấu hình Webhook</TabsTrigger>
            <TabsTrigger value="logs">Lịch sử gửi</TabsTrigger>
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
                        <TableHead>Loại</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((config: any) => (
                        <TableRow key={config.id}>
                          <TableCell><p className="font-medium">{config.name}</p></TableCell>
                          <TableCell><Badge variant="outline">{getChannelIcon(config.channelType)} {config.channelType}</Badge></TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{config.webhookUrl}</TableCell>
                          <TableCell><Badge variant={config.isActive ? "default" : "secondary"}>{config.isActive ? "Hoạt động" : "Tắt"}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => testMutation.mutate({ id: config.id })}><TestTube className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => { if (confirm("Xóa webhook này?")) deleteMutation.mutate({ id: config.id }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium">Chưa có webhook nào</h3>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử gửi Webhook</CardTitle>
                <CardDescription>50 lần gửi gần nhất</CardDescription>
              </CardHeader>
              <CardContent>
                {logs && logs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Alert</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Kênh</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">{new Date(Number(log.sentAt)).toLocaleString("vi-VN")}</TableCell>
                          <TableCell><div className="max-w-[200px] truncate">{log.alertTitle}</div></TableCell>
                          <TableCell><Badge variant="outline">Level {log.escalationLevel}</Badge></TableCell>
                          <TableCell>{getChannelIcon(log.channelType)} {log.channelType}</TableCell>
                          <TableCell>
                            {log.success ? <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" /> OK</Badge> : <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Lỗi</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Chưa có lịch sử</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
