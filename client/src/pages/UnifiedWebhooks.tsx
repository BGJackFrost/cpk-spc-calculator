import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Edit, 
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Settings,
  History,
  BarChart3,
  Slack,
  MessageSquare,
  Globe
} from "lucide-react";

export default function UnifiedWebhooks() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    channelType: "slack" as "slack" | "teams" | "discord" | "custom",
    webhookUrl: "",
    slackChannel: "",
    slackUsername: "SPC Alert Bot",
    slackIconEmoji: ":warning:",
    teamsTitle: "",
    teamsThemeColor: "",
    minSeverity: "major" as "info" | "minor" | "major" | "critical",
    rateLimitMinutes: 5,
    isActive: true,
  });

  const utils = trpc.useUtils();
  const { data: webhooks, isLoading } = trpc.unifiedWebhook.list.useQuery();
  const { data: selectedLogs } = trpc.unifiedWebhook.getLogs.useQuery(
    { webhookConfigId: selectedWebhook!, limit: 20 },
    { enabled: !!selectedWebhook }
  );
  const { data: selectedStats } = trpc.unifiedWebhook.getStats.useQuery(
    { webhookConfigId: selectedWebhook },
    { enabled: !!selectedWebhook }
  );

  const createMutation = trpc.unifiedWebhook.create.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã tạo webhook mới" });
      setIsCreateDialogOpen(false);
      utils.unifiedWebhook.list.invalidate();
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = trpc.unifiedWebhook.toggleActive.useMutation({
    onSuccess: (result) => {
      toast({ 
        title: "Thành công", 
        description: result.isActive ? "Đã kích hoạt webhook" : "Đã tắt webhook" 
      });
      utils.unifiedWebhook.list.invalidate();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = trpc.unifiedWebhook.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "Thành công", description: "Đã gửi tin nhắn test thành công" });
      } else {
        toast({ 
          title: "Thất bại", 
          description: result.error || "Không thể gửi tin nhắn test", 
          variant: "destructive" 
        });
      }
      utils.unifiedWebhook.getLogs.invalidate();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.unifiedWebhook.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã xóa webhook" });
      utils.unifiedWebhook.list.invalidate();
      setSelectedWebhook(null);
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      channelType: "slack",
      webhookUrl: "",
      slackChannel: "",
      slackUsername: "SPC Alert Bot",
      slackIconEmoji: ":warning:",
      teamsTitle: "",
      teamsThemeColor: "",
      minSeverity: "major",
      rateLimitMinutes: 5,
      isActive: true,
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "slack":
        return <Slack className="w-4 h-4" />;
      case "teams":
        return <MessageSquare className="w-4 h-4" />;
      case "discord":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getChannelBadge = (type: string) => {
    switch (type) {
      case "slack":
        return <Badge className="bg-purple-500">Slack</Badge>;
      case "teams":
        return <Badge className="bg-blue-500">Teams</Badge>;
      case "discord":
        return <Badge className="bg-indigo-500">Discord</Badge>;
      default:
        return <Badge variant="outline">Custom</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Nghiêm trọng</Badge>;
      case "major":
        return <Badge className="bg-orange-500">Lớn</Badge>;
      case "minor":
        return <Badge className="bg-yellow-500">Nhỏ</Badge>;
      default:
        return <Badge variant="outline">Thông tin</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Webhook className="w-6 h-6" />
              Webhook Notifications
            </h1>
            <p className="text-muted-foreground">
              Cấu hình gửi cảnh báo đến Slack, Teams, Discord hoặc webhook tùy chỉnh
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Thêm webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Thêm webhook mới</DialogTitle>
                <DialogDescription>
                  Cấu hình webhook để nhận cảnh báo từ hệ thống
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên webhook</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Slack Production Alerts"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channelType">Loại kênh</Label>
                    <Select
                      value={formData.channelType}
                      onValueChange={(value: "slack" | "teams" | "discord" | "custom") => 
                        setFormData({ ...formData, channelType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slack">
                          <div className="flex items-center gap-2">
                            <Slack className="w-4 h-4" /> Slack
                          </div>
                        </SelectItem>
                        <SelectItem value="teams">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> Microsoft Teams
                          </div>
                        </SelectItem>
                        <SelectItem value="discord">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> Discord
                          </div>
                        </SelectItem>
                        <SelectItem value="custom">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" /> Custom Webhook
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả về webhook này..."
                  />
                </div>

                {/* Slack-specific settings */}
                {formData.channelType === "slack" && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Cài đặt Slack</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="slackChannel">Channel (tùy chọn)</Label>
                        <Input
                          id="slackChannel"
                          value={formData.slackChannel}
                          onChange={(e) => setFormData({ ...formData, slackChannel: e.target.value })}
                          placeholder="#alerts"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slackUsername">Username</Label>
                        <Input
                          id="slackUsername"
                          value={formData.slackUsername}
                          onChange={(e) => setFormData({ ...formData, slackUsername: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slackIconEmoji">Icon Emoji</Label>
                        <Input
                          id="slackIconEmoji"
                          value={formData.slackIconEmoji}
                          onChange={(e) => setFormData({ ...formData, slackIconEmoji: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Teams-specific settings */}
                {formData.channelType === "teams" && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Cài đặt Teams</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="teamsTitle">Tiêu đề card</Label>
                        <Input
                          id="teamsTitle"
                          value={formData.teamsTitle}
                          onChange={(e) => setFormData({ ...formData, teamsTitle: e.target.value })}
                          placeholder="SPC Alert"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="teamsThemeColor">Màu theme (hex)</Label>
                        <Input
                          id="teamsThemeColor"
                          value={formData.teamsThemeColor}
                          onChange={(e) => setFormData({ ...formData, teamsThemeColor: e.target.value })}
                          placeholder="FF0000"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Alert settings */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Cài đặt cảnh báo</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minSeverity">Mức độ tối thiểu</Label>
                      <Select
                        value={formData.minSeverity}
                        onValueChange={(value: "info" | "minor" | "major" | "critical") => 
                          setFormData({ ...formData, minSeverity: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Thông tin (Info)</SelectItem>
                          <SelectItem value="minor">Nhỏ (Minor)</SelectItem>
                          <SelectItem value="major">Lớn (Major)</SelectItem>
                          <SelectItem value="critical">Nghiêm trọng (Critical)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rateLimitMinutes">Rate limit (phút)</Label>
                      <Input
                        id="rateLimitMinutes"
                        type="number"
                        min={0}
                        max={1440}
                        value={formData.rateLimitMinutes}
                        onChange={(e) => setFormData({ ...formData, rateLimitMinutes: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <Label htmlFor="isActive">Kích hoạt ngay</Label>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang tạo..." : "Tạo webhook"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Webhook List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Danh sách webhook</CardTitle>
                <CardDescription>
                  {webhooks?.length || 0} webhook đã cấu hình
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Đang tải...</div>
                ) : webhooks?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Chưa có webhook nào</p>
                    <p className="text-sm">Nhấn "Thêm webhook" để bắt đầu</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {webhooks?.map((webhook) => (
                      <div
                        key={webhook.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedWebhook === webhook.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedWebhook(webhook.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium truncate flex items-center gap-2">
                            {getChannelIcon(webhook.channelType)}
                            {webhook.name}
                          </span>
                          {webhook.isActive ? (
                            <Badge className="bg-green-500">Hoạt động</Badge>
                          ) : (
                            <Badge variant="secondary">Tắt</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getChannelBadge(webhook.channelType)}
                          <span className="text-xs text-muted-foreground">
                            {webhook.totalNotificationsSent || 0} đã gửi
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Webhook Details */}
          <div className="lg:col-span-2">
            {selectedWebhook ? (
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Tổng quan
                  </TabsTrigger>
                  <TabsTrigger value="logs">
                    <History className="w-4 h-4 mr-2" />
                    Lịch sử
                  </TabsTrigger>
                  <TabsTrigger value="settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Cài đặt
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{selectedStats?.total || 0}</div>
                        <div className="text-sm text-muted-foreground">Tổng gửi</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedStats?.sent || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Thành công</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-red-600">
                          {selectedStats?.failed || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Thất bại</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">
                          {selectedStats?.successRate || 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Tỷ lệ thành công</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Điều khiển</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => toggleMutation.mutate({ id: selectedWebhook })}
                          disabled={toggleMutation.isPending}
                        >
                          {webhooks?.find(w => w.id === selectedWebhook)?.isActive ? (
                            <>
                              <XCircle className="w-4 h-4 mr-2" />
                              Tắt
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Bật
                            </>
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => testMutation.mutate({ id: selectedWebhook })}
                          disabled={testMutation.isPending}
                        >
                          <TestTube className="w-4 h-4 mr-2" />
                          {testMutation.isPending ? "Đang gửi..." : "Test webhook"}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Bạn có chắc muốn xóa webhook này?")) {
                              deleteMutation.mutate({ id: selectedWebhook });
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Xóa
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="logs">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Lịch sử gửi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Thời gian</TableHead>
                            <TableHead>Sự kiện</TableHead>
                            <TableHead>Mức độ</TableHead>
                            <TableHead>Trạng thái</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedLogs?.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                {new Date(log.createdAt).toLocaleString("vi-VN")}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{log.eventTitle}</div>
                                  <div className="text-xs text-muted-foreground">{log.eventType}</div>
                                </div>
                              </TableCell>
                              <TableCell>{getSeverityBadge(log.severity || "info")}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(log.status)}
                                  <span className="capitalize">{log.status}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!selectedLogs || selectedLogs.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                Chưa có lịch sử gửi
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Cài đặt webhook</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        Tính năng chỉnh sửa cài đặt sẽ được cập nhật trong phiên bản tiếp theo.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <Webhook className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">Chọn một webhook</h3>
                  <p className="text-muted-foreground">
                    Chọn một webhook từ danh sách bên trái để xem chi tiết
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
