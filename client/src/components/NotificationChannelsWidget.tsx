import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Mail, Globe, User, Trash2, TestTube, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type ChannelType = "email" | "webhook" | "owner";

export function NotificationChannelsWidget() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newChannel, setNewChannel] = useState<{ name: string; type: ChannelType; config: Record<string, string> }>({
    name: "", type: "email", config: { recipients: "", subjectPrefix: "[SPC/CPK Alert]" }
  });
  
  const { data: channels, refetch } = trpc.performanceAlert.getChannels.useQuery();
  const { data: stats } = trpc.performanceAlert.getChannelStats.useQuery();
  
  const createChannel = trpc.performanceAlert.createChannel.useMutation({
    onSuccess: () => { toast.success("Đã tạo kênh thông báo"); setShowAddDialog(false); refetch(); setNewChannel({ name: "", type: "email", config: { recipients: "", subjectPrefix: "[SPC/CPK Alert]" } }); },
    onError: (error) => { toast.error(`Lỗi: ${error.message}`); },
  });
  
  const toggleChannel = trpc.performanceAlert.toggleChannel.useMutation({
    onSuccess: () => { toast.success("Đã cập nhật trạng thái"); refetch(); },
    onError: (error) => { toast.error(`Lỗi: ${error.message}`); },
  });
  
  const deleteChannel = trpc.performanceAlert.deleteChannel.useMutation({
    onSuccess: () => { toast.success("Đã xóa kênh thông báo"); refetch(); },
    onError: (error) => { toast.error(`Lỗi: ${error.message}`); },
  });
  
  const testChannel = trpc.performanceAlert.testChannel.useMutation({
    onSuccess: (result) => {
      if (result.success) toast.success(`Test thành công (${result.responseTime}ms)`);
      else toast.error(`Test thất bại: ${result.error}`);
    },
    onError: (error) => { toast.error(`Lỗi: ${error.message}`); },
  });
  
  const getChannelIcon = (type: ChannelType) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />;
      case "webhook": return <Globe className="h-4 w-4" />;
      case "owner": return <User className="h-4 w-4" />;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>;
      case "inactive": return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
      case "error": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const handleTypeChange = (type: ChannelType) => {
    let config: Record<string, string> = {};
    if (type === "email") config = { recipients: "", subjectPrefix: "[SPC/CPK Alert]" };
    else if (type === "webhook") config = { url: "", method: "POST" };
    else config = { enabled: "true" };
    setNewChannel({ ...newChannel, type, config });
  };
  
  const handleCreate = () => {
    if (!newChannel.name.trim()) { toast.error("Vui lòng nhập tên kênh"); return; }
    const config: Record<string, unknown> = { ...newChannel.config };
    if (newChannel.type === "email") config.recipients = (newChannel.config.recipients || "").split(",").map(e => e.trim()).filter(Boolean);
    createChannel.mutate({ name: newChannel.name, type: newChannel.type, config, enabled: true });
  };
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng kênh</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.total || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{stats?.enabled || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Gửi thành công</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-500">{stats?.totalSuccess || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Gửi thất bại</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-500">{stats?.totalFailure || 0}</div></CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Notification Channels</CardTitle><CardDescription>Quản lý các kênh thông báo khi có cảnh báo hiệu suất</CardDescription></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Thêm kênh</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Thêm kênh thông báo</DialogTitle><DialogDescription>Tạo kênh mới để nhận thông báo khi có cảnh báo</DialogDescription></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label htmlFor="name">Tên kênh</Label><Input id="name" value={newChannel.name} onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })} placeholder="VD: Admin Email" /></div>
                    <div className="space-y-2">
                      <Label>Loại kênh</Label>
                      <Select value={newChannel.type} onValueChange={(v) => handleTypeChange(v as ChannelType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="h-4 w-4" />Email</div></SelectItem>
                          <SelectItem value="webhook"><div className="flex items-center gap-2"><Globe className="h-4 w-4" />Webhook</div></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newChannel.type === "email" && (
                      <>
                        <div className="space-y-2"><Label htmlFor="recipients">Email nhận (phân cách bằng dấu phẩy)</Label><Input id="recipients" value={newChannel.config.recipients || ""} onChange={(e) => setNewChannel({ ...newChannel, config: { ...newChannel.config, recipients: e.target.value } })} placeholder="admin@example.com, manager@example.com" /></div>
                        <div className="space-y-2"><Label htmlFor="subjectPrefix">Tiền tố tiêu đề</Label><Input id="subjectPrefix" value={newChannel.config.subjectPrefix || ""} onChange={(e) => setNewChannel({ ...newChannel, config: { ...newChannel.config, subjectPrefix: e.target.value } })} /></div>
                      </>
                    )}
                    {newChannel.type === "webhook" && (
                      <>
                        <div className="space-y-2"><Label htmlFor="url">Webhook URL</Label><Input id="url" value={newChannel.config.url || ""} onChange={(e) => setNewChannel({ ...newChannel, config: { ...newChannel.config, url: e.target.value } })} placeholder="https://example.com/webhook" /></div>
                        <div className="space-y-2">
                          <Label>HTTP Method</Label>
                          <Select value={newChannel.config.method || "POST"} onValueChange={(v) => setNewChannel({ ...newChannel, config: { ...newChannel.config, method: v } })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="POST">POST</SelectItem><SelectItem value="PUT">PUT</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                  <DialogFooter><Button variant="outline" onClick={() => setShowAddDialog(false)}>Hủy</Button><Button onClick={handleCreate} disabled={createChannel.isPending}>{createChannel.isPending ? "Đang tạo..." : "Tạo kênh"}</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {channels?.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">{getChannelIcon(channel.type as ChannelType)}</div>
                  <div>
                    <div className="font-medium">{channel.name}</div>
                    <div className="text-sm text-muted-foreground capitalize">{channel.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(channel.status)}
                  <div className="text-sm text-muted-foreground">
                    <span className="text-green-500">{channel.successCount}</span> / <span className="text-red-500">{channel.failureCount}</span>
                  </div>
                  <Switch checked={channel.enabled} onCheckedChange={(checked) => toggleChannel.mutate({ id: channel.id, enabled: checked })} />
                  <Button variant="outline" size="icon" onClick={() => testChannel.mutate({ id: channel.id })} disabled={testChannel.isPending}><TestTube className="h-4 w-4" /></Button>
                  {channel.type !== "owner" && <Button variant="outline" size="icon" onClick={() => deleteChannel.mutate({ id: channel.id })}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
            ))}
            {(!channels || channels.length === 0) && <div className="text-center py-8 text-muted-foreground">Chưa có kênh thông báo nào</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationChannelsWidget;
