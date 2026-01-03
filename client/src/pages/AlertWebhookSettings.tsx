import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  Plus,
  Trash2,
  Edit,
  Send,
  Slack,
  Mail,
  MessageSquare,
  Webhook,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  History,
  Settings,
} from 'lucide-react';

// Channel type icons
const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  slack: <Slack className="w-4 h-4" />,
  teams: <MessageSquare className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  discord: <MessageSquare className="w-4 h-4" />,
  custom: <Webhook className="w-4 h-4" />,
};

// Alert types
const ALERT_TYPES = [
  { value: 'cpk_warning', label: 'Cảnh báo CPK' },
  { value: 'cpk_critical', label: 'CPK nghiêm trọng' },
  { value: 'spc_violation', label: 'Vi phạm SPC' },
  { value: 'machine_down', label: 'Máy dừng' },
  { value: 'iot_alarm', label: 'Cảnh báo IoT' },
  { value: 'sensor_critical', label: 'Sensor nghiêm trọng' },
  { value: 'latency_warning', label: 'Cảnh báo độ trễ' },
  { value: 'oee_alert', label: 'Cảnh báo OEE' },
  { value: 'maintenance_alert', label: 'Cảnh báo bảo trì' },
];

interface WebhookConfig {
  id?: number;
  name: string;
  description: string;
  channelType: 'slack' | 'teams' | 'email' | 'discord' | 'custom';
  webhookUrl: string;
  emailRecipients: string[];
  emailSubjectTemplate: string;
  slackChannel: string;
  slackBotToken: string;
  teamsWebhookUrl: string;
  alertTypes: string[];
  productionLineIds: number[];
  machineIds: number[];
  minSeverity: 'info' | 'warning' | 'critical';
  rateLimitMinutes: number;
  isActive: boolean;
  testMode: boolean;
}

const defaultConfig: WebhookConfig = {
  name: '',
  description: '',
  channelType: 'slack',
  webhookUrl: '',
  emailRecipients: [],
  emailSubjectTemplate: '[{severity}] {type}: {title}',
  slackChannel: '',
  slackBotToken: '',
  teamsWebhookUrl: '',
  alertTypes: [],
  productionLineIds: [],
  machineIds: [],
  minSeverity: 'warning',
  rateLimitMinutes: 5,
  isActive: true,
  testMode: false,
};

export default function AlertWebhookSettings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WebhookConfig>(defaultConfig);
  const [emailInput, setEmailInput] = useState('');
  const [activeTab, setActiveTab] = useState('configs');

  // Queries
  const { data: configs, refetch: refetchConfigs } = trpc.alertWebhook.list.useQuery();
  const { data: logs, refetch: refetchLogs } = trpc.alertWebhook.getLogs.useQuery({ limit: 50 });
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: machines } = trpc.machine.list.useQuery();

  // Mutations
  const createMutation = trpc.alertWebhook.create.useMutation({
    onSuccess: () => {
      toast.success('Đã tạo webhook thành công');
      setIsDialogOpen(false);
      refetchConfigs();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.alertWebhook.update.useMutation({
    onSuccess: () => {
      toast.success('Đã cập nhật webhook');
      setIsDialogOpen(false);
      refetchConfigs();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.alertWebhook.delete.useMutation({
    onSuccess: () => {
      toast.success('Đã xóa webhook');
      refetchConfigs();
    },
    onError: (error) => toast.error(error.message),
  });

  const testMutation = trpc.alertWebhook.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Test thành công! Kiểm tra kênh nhận thông báo.');
      } else {
        toast.error(`Test thất bại: ${result.error}`);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const handleOpenDialog = (config?: WebhookConfig) => {
    if (config) {
      setEditingConfig(config);
    } else {
      setEditingConfig(defaultConfig);
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingConfig.id) {
      updateMutation.mutate({
        id: editingConfig.id,
        ...editingConfig,
      });
    } else {
      createMutation.mutate(editingConfig);
    }
  };

  const handleAddEmail = () => {
    if (emailInput && !editingConfig.emailRecipients.includes(emailInput)) {
      setEditingConfig({
        ...editingConfig,
        emailRecipients: [...editingConfig.emailRecipients, emailInput],
      });
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEditingConfig({
      ...editingConfig,
      emailRecipients: editingConfig.emailRecipients.filter((e) => e !== email),
    });
  };

  const handleAlertTypeToggle = (type: string) => {
    const types = editingConfig.alertTypes.includes(type)
      ? editingConfig.alertTypes.filter((t) => t !== type)
      : [...editingConfig.alertTypes, type];
    setEditingConfig({ ...editingConfig, alertTypes: types });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Đã gửi</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Thất bại</Badge>;
      case 'rate_limited':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Rate Limited</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cấu hình Webhook Cảnh báo</h1>
            <p className="text-muted-foreground">
              Quản lý các kênh nhận thông báo: Slack, Teams, Email, Discord
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm Webhook
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="configs">
              <Settings className="w-4 h-4 mr-2" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="logs">
              <History className="w-4 h-4 mr-2" />
              Lịch sử gửi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configs" className="space-y-4">
            {/* Webhook configs list */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {configs?.map((config: any) => (
                <Card key={config.id} className={!config.isActive ? 'opacity-60' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {CHANNEL_ICONS[config.channelType]}
                        <CardTitle className="text-lg">{config.name}</CardTitle>
                      </div>
                      <Badge variant={config.isActive ? 'default' : 'secondary'}>
                        {config.isActive ? 'Hoạt động' : 'Tắt'}
                      </Badge>
                    </div>
                    <CardDescription>{config.description || 'Không có mô tả'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Kênh:</span>
                        <Badge variant="outline">{config.channelType.toUpperCase()}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Mức độ tối thiểu:</span>
                        <Badge variant={config.minSeverity === 'critical' ? 'destructive' : 'secondary'}>
                          {config.minSeverity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Rate limit:</span>
                        <span>{config.rateLimitMinutes} phút</span>
                      </div>
                      {config.alertTypes && config.alertTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(config.alertTypes as string[]).slice(0, 3).map((type) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {ALERT_TYPES.find((t) => t.value === type)?.label || type}
                            </Badge>
                          ))}
                          {(config.alertTypes as string[]).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(config.alertTypes as string[]).length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(config)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testMutation.mutate({ id: config.id })}
                        disabled={testMutation.isPending}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Test
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('Xác nhận xóa webhook này?')) {
                            deleteMutation.mutate({ id: config.id });
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!configs || configs.length === 0) && (
                <Card className="col-span-full">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có webhook nào được cấu hình</p>
                    <Button className="mt-4" onClick={() => handleOpenDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Thêm Webhook đầu tiên
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Lịch sử gửi thông báo</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Làm mới
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Kênh</TableHead>
                      <TableHead>Loại cảnh báo</TableHead>
                      <TableHead>Tiêu đề</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs?.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {CHANNEL_ICONS[log.channelType]}
                            <span className="capitalize">{log.channelType}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ALERT_TYPES.find((t) => t.value === log.alertType)?.label || log.alertType}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{log.alertTitle}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                      </TableRow>
                    ))}
                    {(!logs || logs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          Chưa có lịch sử gửi thông báo
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig.id ? 'Chỉnh sửa Webhook' : 'Thêm Webhook mới'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên webhook</Label>
                  <Input
                    value={editingConfig.name}
                    onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                    placeholder="VD: Slack Production Alerts"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Loại kênh</Label>
                  <Select
                    value={editingConfig.channelType}
                    onValueChange={(v: any) => setEditingConfig({ ...editingConfig, channelType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="teams">Microsoft Teams</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="discord">Discord</SelectItem>
                      <SelectItem value="custom">Custom Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={editingConfig.description}
                  onChange={(e) => setEditingConfig({ ...editingConfig, description: e.target.value })}
                  placeholder="Mô tả ngắn về webhook này"
                />
              </div>

              {/* Channel-specific fields */}
              {(editingConfig.channelType === 'slack' || editingConfig.channelType === 'discord' || editingConfig.channelType === 'custom') && (
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    value={editingConfig.webhookUrl}
                    onChange={(e) => setEditingConfig({ ...editingConfig, webhookUrl: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
              )}

              {editingConfig.channelType === 'slack' && (
                <div className="space-y-2">
                  <Label>Channel (tùy chọn)</Label>
                  <Input
                    value={editingConfig.slackChannel}
                    onChange={(e) => setEditingConfig({ ...editingConfig, slackChannel: e.target.value })}
                    placeholder="#alerts"
                  />
                </div>
              )}

              {editingConfig.channelType === 'teams' && (
                <div className="space-y-2">
                  <Label>Teams Webhook URL</Label>
                  <Input
                    value={editingConfig.teamsWebhookUrl}
                    onChange={(e) => setEditingConfig({ ...editingConfig, teamsWebhookUrl: e.target.value })}
                    placeholder="https://outlook.office.com/webhook/..."
                  />
                </div>
              )}

              {editingConfig.channelType === 'email' && (
                <>
                  <div className="space-y-2">
                    <Label>Email nhận thông báo</Label>
                    <div className="flex gap-2">
                      <Input
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="email@example.com"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                      />
                      <Button type="button" onClick={handleAddEmail}>
                        Thêm
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {editingConfig.emailRecipients.map((email) => (
                        <Badge key={email} variant="secondary" className="gap-1">
                          {email}
                          <button onClick={() => handleRemoveEmail(email)}>
                            <XCircle className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Template tiêu đề email</Label>
                    <Input
                      value={editingConfig.emailSubjectTemplate}
                      onChange={(e) => setEditingConfig({ ...editingConfig, emailSubjectTemplate: e.target.value })}
                      placeholder="[{severity}] {type}: {title}"
                    />
                    <p className="text-xs text-muted-foreground">
                      Biến: {'{severity}'}, {'{type}'}, {'{title}'}
                    </p>
                  </div>
                </>
              )}

              {/* Alert types */}
              <div className="space-y-2">
                <Label>Loại cảnh báo nhận</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALERT_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={editingConfig.alertTypes.includes(type.value)}
                        onCheckedChange={() => handleAlertTypeToggle(type.value)}
                      />
                      <label htmlFor={type.value} className="text-sm cursor-pointer">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Để trống để nhận tất cả loại cảnh báo
                </p>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mức độ tối thiểu</Label>
                  <Select
                    value={editingConfig.minSeverity}
                    onValueChange={(v: any) => setEditingConfig({ ...editingConfig, minSeverity: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info (tất cả)</SelectItem>
                      <SelectItem value="warning">Warning trở lên</SelectItem>
                      <SelectItem value="critical">Critical only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rate limit (phút)</Label>
                  <Input
                    type="number"
                    value={editingConfig.rateLimitMinutes}
                    onChange={(e) => setEditingConfig({ ...editingConfig, rateLimitMinutes: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
              </div>

              {/* Switches */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingConfig.isActive}
                    onCheckedChange={(v) => setEditingConfig({ ...editingConfig, isActive: v })}
                  />
                  <Label>Kích hoạt</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingConfig.testMode}
                    onCheckedChange={(v) => setEditingConfig({ ...editingConfig, testMode: v })}
                  />
                  <Label>Chế độ test</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingConfig.id ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
