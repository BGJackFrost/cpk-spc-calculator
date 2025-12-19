import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Bell, Mail, Smartphone, Globe, Webhook, Plus, Trash2, Send, CheckCircle, XCircle, Clock } from "lucide-react";

type ChannelType = 'email' | 'sms' | 'push' | 'webhook';

const CHANNEL_ICONS: Record<ChannelType, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  sms: <Smartphone className="w-4 h-4" />,
  push: <Bell className="w-4 h-4" />,
  webhook: <Webhook className="w-4 h-4" />,
};

const CHANNEL_NAMES: Record<ChannelType, string> = {
  email: 'Email',
  sms: 'SMS',
  push: 'Push Notification',
  webhook: 'Webhook',
};

export default function NotificationSettings() {
  const [activeTab, setActiveTab] = useState("channels");
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannel, setNewChannel] = useState<{
    type: ChannelType;
    config: Record<string, string>;
  }>({
    type: 'email',
    config: {},
  });
  const [testRecipient, setTestRecipient] = useState("");

  const { data: channels, refetch: refetchChannels } = trpc.notification.getChannels.useQuery();
  const { data: logs, refetch: refetchLogs } = trpc.notification.getLogs.useQuery({ limit: 50 });

  const upsertChannel = trpc.notification.upsertChannel.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu kênh thông báo");
      setShowAddChannel(false);
      setNewChannel({ type: 'email', config: {} });
      refetchChannels();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteChannel = trpc.notification.deleteChannel.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa kênh thông báo");
      refetchChannels();
    },
    onError: (err) => toast.error(err.message),
  });

  const testNotification = trpc.notification.testNotification.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Đã gửi thông báo test thành công");
      } else {
        toast.error("Gửi thông báo test thất bại");
      }
      refetchLogs();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAddChannel = () => {
    if (newChannel.type === 'email' && !newChannel.config.email) {
      toast.error("Vui lòng nhập email");
      return;
    }
    if (newChannel.type === 'sms' && !newChannel.config.phoneNumber) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }
    if (newChannel.type === 'webhook' && !newChannel.config.webhookUrl) {
      toast.error("Vui lòng nhập URL webhook");
      return;
    }

    upsertChannel.mutate({
      channelType: newChannel.type,
      config: newChannel.config,
      enabled: true,
    });
  };

  const handleTest = (channel: any) => {
    let recipient = '';
    switch (channel.channelType) {
      case 'email':
        recipient = channel.channelConfig?.email;
        break;
      case 'sms':
        recipient = channel.channelConfig?.phoneNumber;
        break;
      case 'push':
        recipient = channel.channelConfig?.fcmToken;
        break;
      case 'webhook':
        recipient = channel.channelConfig?.webhookUrl;
        break;
    }

    if (!recipient) {
      toast.error("Không tìm thấy thông tin người nhận");
      return;
    }

    testNotification.mutate({
      channelType: channel.channelType,
      recipient,
      config: channel.channelConfig,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Đã gửi</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Thất bại</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Đang chờ</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Cài đặt Thông báo</h1>
          <p className="text-muted-foreground">Quản lý các kênh nhận thông báo khi có cảnh báo NTF</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="channels">
              <Bell className="w-4 h-4 mr-2" />
              Kênh thông báo
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Clock className="w-4 h-4 mr-2" />
              Lịch sử gửi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="channels" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Cấu hình các kênh nhận thông báo khi NTF rate vượt ngưỡng critical
              </p>
              <Dialog open={showAddChannel} onOpenChange={setShowAddChannel}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm kênh
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm kênh thông báo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Loại kênh</Label>
                      <Select
                        value={newChannel.type}
                        onValueChange={(v) => setNewChannel({ type: v as ChannelType, config: {} })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS (Twilio)</SelectItem>
                          <SelectItem value="push">Push Notification (FCM)</SelectItem>
                          <SelectItem value="webhook">Webhook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newChannel.type === 'email' && (
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="admin@example.com"
                          value={newChannel.config.email || ''}
                          onChange={(e) => setNewChannel({
                            ...newChannel,
                            config: { ...newChannel.config, email: e.target.value }
                          })}
                        />
                      </div>
                    )}

                    {newChannel.type === 'sms' && (
                      <>
                        <div className="space-y-2">
                          <Label>Số điện thoại</Label>
                          <Input
                            placeholder="+84123456789"
                            value={newChannel.config.phoneNumber || ''}
                            onChange={(e) => setNewChannel({
                              ...newChannel,
                              config: { ...newChannel.config, phoneNumber: e.target.value }
                            })}
                          />
                          <p className="text-xs text-muted-foreground">Định dạng quốc tế (VD: +84123456789)</p>
                        </div>
                        <div className="p-3 bg-yellow-500/10 rounded text-sm">
                          <p className="font-medium text-yellow-600">Yêu cầu cấu hình Twilio</p>
                          <p className="text-muted-foreground">Cần thiết lập TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER trong Settings &gt; Secrets</p>
                        </div>
                      </>
                    )}

                    {newChannel.type === 'push' && (
                      <>
                        <div className="space-y-2">
                          <Label>FCM Token</Label>
                          <Input
                            placeholder="Firebase Cloud Messaging token"
                            value={newChannel.config.fcmToken || ''}
                            onChange={(e) => setNewChannel({
                              ...newChannel,
                              config: { ...newChannel.config, fcmToken: e.target.value }
                            })}
                          />
                        </div>
                        <div className="p-3 bg-yellow-500/10 rounded text-sm">
                          <p className="font-medium text-yellow-600">Yêu cầu cấu hình Firebase</p>
                          <p className="text-muted-foreground">Cần thiết lập FCM_SERVER_KEY trong Settings &gt; Secrets</p>
                        </div>
                      </>
                    )}

                    {newChannel.type === 'webhook' && (
                      <>
                        <div className="space-y-2">
                          <Label>Webhook URL</Label>
                          <Input
                            placeholder="https://example.com/webhook"
                            value={newChannel.config.webhookUrl || ''}
                            onChange={(e) => setNewChannel({
                              ...newChannel,
                              config: { ...newChannel.config, webhookUrl: e.target.value }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Authorization Header (optional)</Label>
                          <Input
                            placeholder="Bearer your-token"
                            value={newChannel.config.authHeader || ''}
                            onChange={(e) => setNewChannel({
                              ...newChannel,
                              config: { 
                                ...newChannel.config, 
                                authHeader: e.target.value || ''
                              }
                            })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddChannel(false)}>Hủy</Button>
                    <Button onClick={handleAddChannel} disabled={upsertChannel.isPending}>
                      Thêm
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {(channels || []).map((channel: any) => (
                <Card key={channel.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {CHANNEL_ICONS[channel.channelType as ChannelType]}
                        {CHANNEL_NAMES[channel.channelType as ChannelType]}
                      </CardTitle>
                      <Badge variant={channel.enabled ? "default" : "secondary"}>
                        {channel.enabled ? "Bật" : "Tắt"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {channel.channelType === 'email' && channel.channelConfig?.email}
                      {channel.channelType === 'sms' && channel.channelConfig?.phoneNumber}
                      {channel.channelType === 'push' && `Token: ${channel.channelConfig?.fcmToken?.substring(0, 20)}...`}
                      {channel.channelType === 'webhook' && channel.channelConfig?.webhookUrl}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(channel)}
                        disabled={testNotification.isPending}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Test
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Xóa kênh thông báo này?")) {
                            deleteChannel.mutate({ id: channel.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(channels || []).length === 0 && (
                <Card className="col-span-2">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Chưa có kênh thông báo nào. Nhấn "Thêm kênh" để bắt đầu.
                  </CardContent>
                </Card>
              )}
            </div>

            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="text-sm">Hướng dẫn cấu hình</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Email:</strong> Sử dụng SMTP đã cấu hình trong hệ thống</p>
                <p><strong>SMS:</strong> Cần Twilio Account SID, Auth Token và số điện thoại gửi</p>
                <p><strong>Push:</strong> Cần Firebase Cloud Messaging Server Key</p>
                <p><strong>Webhook:</strong> Gửi POST request với JSON body chứa subject và message</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử gửi thông báo</CardTitle>
                <CardDescription>50 thông báo gần nhất</CardDescription>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Kênh</TableHead>
                    <TableHead>Người nhận</TableHead>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs || []).map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.createdAt).toLocaleString('vi-VN')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {CHANNEL_ICONS[log.channelType as ChannelType]}
                          {CHANNEL_NAMES[log.channelType as ChannelType]}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.recipient}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.subject || '-'}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                    </TableRow>
                  ))}
                  {(logs || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Chưa có lịch sử gửi thông báo
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
