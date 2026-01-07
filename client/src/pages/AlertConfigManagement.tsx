/**
 * Alert Config Management Page
 * Trang quản lý cấu hình cảnh báo anomaly detection
 * - Danh sách cấu hình cảnh báo
 * - Tạo/sửa cấu hình (ngưỡng, kênh thông báo)
 * - Lịch sử cảnh báo đã gửi
 * - Quản lý kênh thông báo (Email, Telegram, Slack)
 * - Test notification
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Bell, Plus, Settings, History, Mail, MessageSquare, Slack,
  AlertTriangle, CheckCircle, XCircle, Send, RefreshCw, Trash2,
  Edit, Eye, Clock, Zap
} from "lucide-react";

type AlertSeverity = 'info' | 'warning' | 'critical';
type NotificationChannel = 'email' | 'telegram' | 'slack' | 'webhook';

interface AlertConfig {
  id: number;
  name: string;
  description?: string | null;
  modelId?: number | null;
  gatewayId?: number | null;
  severityThreshold: AlertSeverity;
  anomalyScoreThreshold: number;
  consecutiveAnomalies: number;
  cooldownMinutes: number;
  notificationChannels: NotificationChannel[];
  emailRecipients: string[];
  telegramChatId?: string | null;
  slackWebhookUrl?: string | null;
  webhookUrl?: string | null;
  messageTemplate?: string | null;
  isEnabled: boolean;
  createdAt: string;
}

interface AlertHistory {
  id: number;
  configId: number;
  alertType: string;
  severity: AlertSeverity;
  message: string;
  anomalyScore?: number | null;
  channelsSent: NotificationChannel[];
  sentAt: number;
  acknowledged: boolean;
  acknowledgedBy?: number | null;
  acknowledgedAt?: number | null;
}

const severityColors: Record<AlertSeverity, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const channelIcons: Record<NotificationChannel, any> = {
  email: Mail,
  telegram: MessageSquare,
  slack: Slack,
  webhook: Zap,
};

export default function AlertConfigManagement() {
  const [activeTab, setActiveTab] = useState("configs");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AlertConfig | null>(null);
  const [testingChannel, setTestingChannel] = useState<NotificationChannel | null>(null);

  // Queries
  const { data: configs = [], isLoading: configsLoading, refetch: refetchConfigs } = trpc.anomalyAlert.getConfigs.useQuery();
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = trpc.anomalyAlert.getHistory.useQuery({ limit: 50 });

  // Mutations
  const createConfig = trpc.anomalyAlert.createConfig.useMutation({
    onSuccess: () => {
      toast.success("Tạo cấu hình cảnh báo thành công");
      setIsCreateDialogOpen(false);
      refetchConfigs();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateConfig = trpc.anomalyAlert.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật cấu hình thành công");
      setEditingConfig(null);
      refetchConfigs();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const toggleConfig = trpc.anomalyAlert.toggleConfig.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật trạng thái thành công");
      refetchConfigs();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const deleteConfig = trpc.anomalyAlert.deleteConfig.useMutation({
    onSuccess: () => {
      toast.success("Xóa cấu hình thành công");
      refetchConfigs();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const testNotification = trpc.anomalyAlert.testNotification.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Gửi test notification thành công");
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
      setTestingChannel(null);
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
      setTestingChannel(null);
    },
  });

  const acknowledgeAlert = trpc.anomalyAlert.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận cảnh báo");
      refetchHistory();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const handleToggle = (config: AlertConfig) => {
    toggleConfig.mutate({ id: config.id, isEnabled: !config.isEnabled });
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa cấu hình này?")) {
      deleteConfig.mutate({ id });
    }
  };

  const handleTestNotification = (configId: number, channel: NotificationChannel) => {
    setTestingChannel(channel);
    testNotification.mutate({ configId, channel });
  };

  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    return date.toLocaleString('vi-VN');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Quản lý Cấu hình Cảnh báo
            </h1>
            <p className="text-muted-foreground mt-1">
              Cấu hình ngưỡng cảnh báo và kênh thông báo cho Anomaly Detection
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo cấu hình mới
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng cấu hình</p>
                  <p className="text-2xl font-bold">{configs.length}</p>
                </div>
                <Settings className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                  <p className="text-2xl font-bold text-green-600">
                    {configs.filter(c => c.isEnabled).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cảnh báo hôm nay</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {historyData?.history?.filter((h: AlertHistory) => {
                      const today = new Date();
                      const alertDate = new Date(h.sentAt);
                      return alertDate.toDateString() === today.toDateString();
                    }).length || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chưa xác nhận</p>
                  <p className="text-2xl font-bold text-red-600">
                    {historyData?.history?.filter((h: AlertHistory) => !h.acknowledged).length || 0}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="configs" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Lịch sử cảnh báo
            </TabsTrigger>
            <TabsTrigger value="channels" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Kênh thông báo
            </TabsTrigger>
          </TabsList>

          {/* Configs Tab */}
          <TabsContent value="configs" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh sách cấu hình cảnh báo</CardTitle>
                  <CardDescription>
                    Quản lý các cấu hình ngưỡng và kênh thông báo
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchConfigs()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Làm mới
                </Button>
              </CardHeader>
              <CardContent>
                {configsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : configs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có cấu hình cảnh báo nào</p>
                    <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tạo cấu hình đầu tiên
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Ngưỡng</TableHead>
                        <TableHead>Kênh thông báo</TableHead>
                        <TableHead>Cooldown</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((config: AlertConfig) => (
                        <TableRow key={config.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{config.name}</p>
                              {config.description && (
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {config.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={severityColors[config.severityThreshold]}>
                              {config.severityThreshold}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">
                              Score ≥ {config.anomalyScoreThreshold}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {config.notificationChannels.map((channel) => {
                                const Icon = channelIcons[channel];
                                return (
                                  <Badge key={channel} variant="outline" className="gap-1">
                                    <Icon className="h-3 w-3" />
                                    {channel}
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{config.cooldownMinutes} phút</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={config.isEnabled}
                                onCheckedChange={() => handleToggle(config)}
                              />
                              <span className={config.isEnabled ? "text-green-600" : "text-muted-foreground"}>
                                {config.isEnabled ? "Bật" : "Tắt"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingConfig(config)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(config.id)}
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

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lịch sử cảnh báo</CardTitle>
                  <CardDescription>
                    Xem chi tiết các cảnh báo đã được gửi
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchHistory()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Làm mới
                </Button>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : !historyData?.history || historyData.history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có lịch sử cảnh báo</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Thời gian</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Nội dung</TableHead>
                          <TableHead>Kênh đã gửi</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyData.history.map((alert: AlertHistory) => (
                          <TableRow key={alert.id}>
                            <TableCell>
                              <span className="text-sm">{formatDate(alert.sentAt)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{alert.alertType}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={severityColors[alert.severity]}>
                                {alert.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm truncate max-w-[300px]">{alert.message}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {alert.channelsSent.map((channel) => {
                                  const Icon = channelIcons[channel];
                                  return (
                                    <Badge key={channel} variant="secondary" className="gap-1">
                                      <Icon className="h-3 w-3" />
                                    </Badge>
                                  );
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              {alert.acknowledged ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Đã xác nhận
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Chưa xác nhận
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!alert.acknowledged && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => acknowledgeAlert.mutate({ alertId: alert.id })}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Xác nhận
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Channels Tab */}
          <TabsContent value="channels" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email Channel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email
                  </CardTitle>
                  <CardDescription>
                    Gửi cảnh báo qua email
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Cấu hình email được quản lý trong từng Alert Config.
                        Thêm danh sách email recipients khi tạo cấu hình mới.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (configs.length > 0) {
                          handleTestNotification(configs[0].id, 'email');
                        } else {
                          toast.error("Cần tạo cấu hình trước khi test");
                        }
                      }}
                      disabled={testingChannel === 'email' || configs.length === 0}
                    >
                      {testingChannel === 'email' ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Test Email
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Telegram Channel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Telegram
                  </CardTitle>
                  <CardDescription>
                    Gửi cảnh báo qua Telegram Bot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Cấu hình Telegram Chat ID trong từng Alert Config.
                        Bot token được cấu hình trong Settings.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (configs.length > 0) {
                          handleTestNotification(configs[0].id, 'telegram');
                        } else {
                          toast.error("Cần tạo cấu hình trước khi test");
                        }
                      }}
                      disabled={testingChannel === 'telegram' || configs.length === 0}
                    >
                      {testingChannel === 'telegram' ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Test Telegram
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Slack Channel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Slack className="h-5 w-5" />
                    Slack
                  </CardTitle>
                  <CardDescription>
                    Gửi cảnh báo qua Slack Webhook
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Cấu hình Slack Webhook URL trong từng Alert Config.
                        Tạo Incoming Webhook trong Slack App.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (configs.length > 0) {
                          handleTestNotification(configs[0].id, 'slack');
                        } else {
                          toast.error("Cần tạo cấu hình trước khi test");
                        }
                      }}
                      disabled={testingChannel === 'slack' || configs.length === 0}
                    >
                      {testingChannel === 'slack' ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Test Slack
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Webhook Channel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Webhook
                  </CardTitle>
                  <CardDescription>
                    Gửi cảnh báo qua Custom Webhook
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Cấu hình Webhook URL trong từng Alert Config.
                        Hỗ trợ POST request với JSON payload.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (configs.length > 0) {
                          handleTestNotification(configs[0].id, 'webhook');
                        } else {
                          toast.error("Cần tạo cấu hình trước khi test");
                        }
                      }}
                      disabled={testingChannel === 'webhook' || configs.length === 0}
                    >
                      {testingChannel === 'webhook' ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Test Webhook
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <AlertConfigDialog
          open={isCreateDialogOpen || !!editingConfig}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateDialogOpen(false);
              setEditingConfig(null);
            }
          }}
          config={editingConfig}
          onSubmit={(data) => {
            if (editingConfig) {
              updateConfig.mutate({ id: editingConfig.id, ...data });
            } else {
              createConfig.mutate(data);
            }
          }}
          isLoading={createConfig.isPending || updateConfig.isPending}
        />
      </div>
    </DashboardLayout>
  );
}

// Alert Config Dialog Component
interface AlertConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: AlertConfig | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function AlertConfigDialog({ open, onOpenChange, config, onSubmit, isLoading }: AlertConfigDialogProps) {
  const [formData, setFormData] = useState({
    name: config?.name || "",
    description: config?.description || "",
    severityThreshold: config?.severityThreshold || "warning" as AlertSeverity,
    anomalyScoreThreshold: config?.anomalyScoreThreshold || 0.7,
    consecutiveAnomalies: config?.consecutiveAnomalies || 3,
    cooldownMinutes: config?.cooldownMinutes || 15,
    notificationChannels: config?.notificationChannels || [] as NotificationChannel[],
    emailRecipients: config?.emailRecipients?.join(", ") || "",
    telegramChatId: config?.telegramChatId || "",
    slackWebhookUrl: config?.slackWebhookUrl || "",
    webhookUrl: config?.webhookUrl || "",
    messageTemplate: config?.messageTemplate || "",
  });

  const handleChannelToggle = (channel: NotificationChannel) => {
    setFormData(prev => ({
      ...prev,
      notificationChannels: prev.notificationChannels.includes(channel)
        ? prev.notificationChannels.filter(c => c !== channel)
        : [...prev.notificationChannels, channel]
    }));
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      emailRecipients: formData.emailRecipients.split(",").map(e => e.trim()).filter(Boolean),
    };
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config ? "Sửa cấu hình cảnh báo" : "Tạo cấu hình cảnh báo mới"}</DialogTitle>
          <DialogDescription>
            Cấu hình ngưỡng và kênh thông báo cho cảnh báo anomaly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="font-medium">Thông tin cơ bản</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên cấu hình *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Critical Temperature Alert"
                />
              </div>
              <div className="space-y-2">
                <Label>Severity Threshold</Label>
                <Select
                  value={formData.severityThreshold}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, severityThreshold: v as AlertSeverity }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả chi tiết về cấu hình cảnh báo"
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Thresholds */}
          <div className="space-y-4">
            <h4 className="font-medium">Ngưỡng cảnh báo</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Anomaly Score Threshold: {formData.anomalyScoreThreshold}</Label>
                <Slider
                  value={[formData.anomalyScoreThreshold * 100]}
                  onValueChange={([v]) => setFormData(prev => ({ ...prev, anomalyScoreThreshold: v / 100 }))}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consecutive">Consecutive Anomalies</Label>
                <Input
                  id="consecutive"
                  type="number"
                  min={1}
                  value={formData.consecutiveAnomalies}
                  onChange={(e) => setFormData(prev => ({ ...prev, consecutiveAnomalies: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="cooldown">Cooldown (phút)</Label>
                <Input
                  id="cooldown"
                  type="number"
                  min={1}
                  value={formData.cooldownMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, cooldownMinutes: parseInt(e.target.value) || 15 }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notification Channels */}
          <div className="space-y-4">
            <h4 className="font-medium">Kênh thông báo</h4>
            <div className="flex flex-wrap gap-2">
              {(['email', 'telegram', 'slack', 'webhook'] as NotificationChannel[]).map((channel) => {
                const Icon = channelIcons[channel];
                const isSelected = formData.notificationChannels.includes(channel);
                return (
                  <Button
                    key={channel}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleChannelToggle(channel)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {channel.charAt(0).toUpperCase() + channel.slice(1)}
                  </Button>
                );
              })}
            </div>

            {/* Channel-specific settings */}
            {formData.notificationChannels.includes('email') && (
              <div className="space-y-2">
                <Label htmlFor="emails">Email Recipients (phân cách bằng dấu phẩy)</Label>
                <Input
                  id="emails"
                  value={formData.emailRecipients}
                  onChange={(e) => setFormData(prev => ({ ...prev, emailRecipients: e.target.value }))}
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
            )}

            {formData.notificationChannels.includes('telegram') && (
              <div className="space-y-2">
                <Label htmlFor="telegram">Telegram Chat ID</Label>
                <Input
                  id="telegram"
                  value={formData.telegramChatId}
                  onChange={(e) => setFormData(prev => ({ ...prev, telegramChatId: e.target.value }))}
                  placeholder="-1001234567890"
                />
              </div>
            )}

            {formData.notificationChannels.includes('slack') && (
              <div className="space-y-2">
                <Label htmlFor="slack">Slack Webhook URL</Label>
                <Input
                  id="slack"
                  value={formData.slackWebhookUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, slackWebhookUrl: e.target.value }))}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
            )}

            {formData.notificationChannels.includes('webhook') && (
              <div className="space-y-2">
                <Label htmlFor="webhook">Webhook URL</Label>
                <Input
                  id="webhook"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  placeholder="https://your-api.com/webhook"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Message Template */}
          <div className="space-y-2">
            <Label htmlFor="template">Message Template (tùy chọn)</Label>
            <Textarea
              id="template"
              value={formData.messageTemplate}
              onChange={(e) => setFormData(prev => ({ ...prev, messageTemplate: e.target.value }))}
              placeholder="Sử dụng {{severity}}, {{message}}, {{timestamp}} làm biến"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.name}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              config ? "Cập nhật" : "Tạo mới"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
