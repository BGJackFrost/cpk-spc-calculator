import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { 
  Bell, Settings, Users, History, Plus, Trash2, Edit, Save, 
  Mail, MessageSquare, AlertTriangle, CheckCircle, XCircle, Loader2
} from "lucide-react";

export default function AiVisionNotificationSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("config");
  const [isAddRecipientOpen, setIsAddRecipientOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [newRecipient, setNewRecipient] = useState({ name: "", email: "", telegramId: "", notifyEmail: true, notifyTelegram: false });

  // Queries
  const { data: configs, isLoading: configsLoading, refetch: refetchConfigs } = 
    trpc.aiVisionNotification.getConfigs.useQuery();
  const { data: recipients, isLoading: recipientsLoading, refetch: refetchRecipients } = 
    trpc.aiVisionNotification.getRecipients.useQuery();
  const { data: history, isLoading: historyLoading } = 
    trpc.aiVisionNotification.getHistory.useQuery({ limit: 50 });
  const { data: productionLines } = trpc.productionLine.list.useQuery();

  // Mutations
  const updateConfigMutation = trpc.aiVisionNotification.updateConfig.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã cập nhật cấu hình thông báo" });
      refetchConfigs();
      setEditingConfig(null);
    },
    onError: (err) => toast({ title: "Lỗi", description: err.message, variant: "destructive" }),
  });

  const addRecipientMutation = trpc.aiVisionNotification.addRecipient.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã thêm người nhận" });
      refetchRecipients();
      setIsAddRecipientOpen(false);
      setNewRecipient({ name: "", email: "", telegramId: "", notifyEmail: true, notifyTelegram: false });
    },
    onError: (err) => toast({ title: "Lỗi", description: err.message, variant: "destructive" }),
  });

  const deleteRecipientMutation = trpc.aiVisionNotification.deleteRecipient.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã xóa người nhận" });
      refetchRecipients();
    },
    onError: (err) => toast({ title: "Lỗi", description: err.message, variant: "destructive" }),
  });

  const handleSaveConfig = () => {
    if (!editingConfig) return;
    updateConfigMutation.mutate({
      id: editingConfig.id,
      defectRateThreshold: parseFloat(editingConfig.defectRateThreshold),
      confidenceThreshold: parseFloat(editingConfig.confidenceThreshold),
      alertCooldownMinutes: parseInt(editingConfig.alertCooldownMinutes),
      enabled: editingConfig.enabled,
    });
  };

  const handleAddRecipient = () => {
    if (!newRecipient.name || (!newRecipient.email && !newRecipient.telegramId)) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên và ít nhất một phương thức liên hệ", variant: "destructive" });
      return;
    }
    addRecipientMutation.mutate(newRecipient);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Cấu hình Thông báo AI Vision
            </h1>
            <p className="text-muted-foreground">
              Quản lý ngưỡng cảnh báo và danh sách người nhận thông báo từ hệ thống AI Vision
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="config"><Settings className="h-4 w-4 mr-2" />Cấu hình ngưỡng</TabsTrigger>
            <TabsTrigger value="recipients"><Users className="h-4 w-4 mr-2" />Người nhận</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />Lịch sử</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Ngưỡng cảnh báo theo dây chuyền</CardTitle>
                <CardDescription>
                  Thiết lập ngưỡng tỷ lệ lỗi và độ tin cậy để kích hoạt cảnh báo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {configsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dây chuyền</TableHead>
                        <TableHead>Ngưỡng tỷ lệ lỗi (%)</TableHead>
                        <TableHead>Ngưỡng độ tin cậy (%)</TableHead>
                        <TableHead>Cooldown (phút)</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs?.map((config: any) => (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">
                            {productionLines?.find((l: any) => l.id === config.productionLineId)?.name || `Line ${config.productionLineId}`}
                          </TableCell>
                          <TableCell>
                            {editingConfig?.id === config.id ? (
                              <Input
                                type="number"
                                step="0.1"
                                className="w-24"
                                value={editingConfig.defectRateThreshold}
                                onChange={(e) => setEditingConfig({ ...editingConfig, defectRateThreshold: e.target.value })}
                              />
                            ) : (
                              `${config.defectRateThreshold}%`
                            )}
                          </TableCell>
                          <TableCell>
                            {editingConfig?.id === config.id ? (
                              <Input
                                type="number"
                                step="0.1"
                                className="w-24"
                                value={editingConfig.confidenceThreshold}
                                onChange={(e) => setEditingConfig({ ...editingConfig, confidenceThreshold: e.target.value })}
                              />
                            ) : (
                              `${config.confidenceThreshold}%`
                            )}
                          </TableCell>
                          <TableCell>
                            {editingConfig?.id === config.id ? (
                              <Input
                                type="number"
                                className="w-20"
                                value={editingConfig.alertCooldownMinutes}
                                onChange={(e) => setEditingConfig({ ...editingConfig, alertCooldownMinutes: e.target.value })}
                              />
                            ) : (
                              `${config.alertCooldownMinutes} phút`
                            )}
                          </TableCell>
                          <TableCell>
                            {editingConfig?.id === config.id ? (
                              <Switch
                                checked={editingConfig.enabled}
                                onCheckedChange={(checked) => setEditingConfig({ ...editingConfig, enabled: checked })}
                              />
                            ) : (
                              <Badge variant={config.enabled ? "default" : "secondary"}>
                                {config.enabled ? "Bật" : "Tắt"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingConfig?.id === config.id ? (
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" onClick={handleSaveConfig} disabled={updateConfigMutation.isPending}>
                                  <Save className="h-4 w-4 mr-1" />Lưu
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingConfig(null)}>
                                  Hủy
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => setEditingConfig({ ...config })}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!configs || configs.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Chưa có cấu hình nào. Cấu hình sẽ được tạo tự động khi có dây chuyền sử dụng AI Vision.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recipients" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh sách người nhận thông báo</CardTitle>
                  <CardDescription>Quản lý email và Telegram của người nhận cảnh báo</CardDescription>
                </div>
                <Dialog open={isAddRecipientOpen} onOpenChange={setIsAddRecipientOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-2" />Thêm người nhận</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Thêm người nhận mới</DialogTitle>
                      <DialogDescription>Nhập thông tin người nhận thông báo AI Vision</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Tên người nhận *</Label>
                        <Input
                          value={newRecipient.name}
                          onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                          placeholder="Nguyễn Văn A"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newRecipient.email}
                          onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                          placeholder="email@company.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telegram ID</Label>
                        <Input
                          value={newRecipient.telegramId}
                          onChange={(e) => setNewRecipient({ ...newRecipient, telegramId: e.target.value })}
                          placeholder="@username hoặc chat_id"
                        />
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newRecipient.notifyEmail}
                            onCheckedChange={(checked) => setNewRecipient({ ...newRecipient, notifyEmail: checked })}
                          />
                          <Label>Gửi Email</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newRecipient.notifyTelegram}
                            onCheckedChange={(checked) => setNewRecipient({ ...newRecipient, notifyTelegram: checked })}
                          />
                          <Label>Gửi Telegram</Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddRecipientOpen(false)}>Hủy</Button>
                      <Button onClick={handleAddRecipient} disabled={addRecipientMutation.isPending}>
                        {addRecipientMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Thêm
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {recipientsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telegram</TableHead>
                        <TableHead>Kênh thông báo</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipients?.map((recipient: any) => (
                        <TableRow key={recipient.id}>
                          <TableCell className="font-medium">{recipient.name}</TableCell>
                          <TableCell>
                            {recipient.email ? (
                              <span className="flex items-center gap-1">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {recipient.email}
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {recipient.telegramId ? (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                {recipient.telegramId}
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {recipient.notifyEmail && <Badge variant="outline">Email</Badge>}
                              {recipient.notifyTelegram && <Badge variant="outline">Telegram</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={recipient.isActive ? "default" : "secondary"}>
                              {recipient.isActive ? "Hoạt động" : "Tạm dừng"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => deleteRecipientMutation.mutate({ id: recipient.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!recipients || recipients.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Chưa có người nhận nào. Nhấn "Thêm người nhận" để bắt đầu.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử gửi thông báo</CardTitle>
                <CardDescription>Xem lại các thông báo đã gửi gần đây</CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Loại cảnh báo</TableHead>
                        <TableHead>Dây chuyền</TableHead>
                        <TableHead>Nội dung</TableHead>
                        <TableHead>Người nhận</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(item.sentAt).toLocaleString("vi-VN")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.alertType === "critical" ? "destructive" : "secondary"}>
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {item.alertType === "critical" ? "Nghiêm trọng" : "Cảnh báo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {productionLines?.find((l: any) => l.id === item.productionLineId)?.name || `Line ${item.productionLineId}`}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{item.message}</TableCell>
                          <TableCell>{item.recipientName}</TableCell>
                          <TableCell>
                            {item.status === "sent" ? (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />Đã gửi
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />Thất bại
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!history || history.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Chưa có lịch sử thông báo nào.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
