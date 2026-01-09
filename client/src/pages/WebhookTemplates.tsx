/**
 * WebhookTemplates - Trang quản lý Webhook Templates
 * Hỗ trợ Telegram, Zalo, Slack, Teams, Discord và Custom webhooks
 */
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Plus, Trash2, Edit, Send, CheckCircle, XCircle, Clock, 
  MessageSquare, MessageCircle, Hash, Users, Gamepad2, Globe,
  Copy, Eye, History, RefreshCw, Loader2, AlertTriangle, Zap
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const CHANNEL_ICONS: Record<string, any> = {
  telegram: MessageSquare,
  zalo: MessageCircle,
  slack: Hash,
  teams: Users,
  discord: Gamepad2,
  custom: Globe,
};

const CHANNEL_COLORS: Record<string, string> = {
  telegram: "bg-blue-500",
  zalo: "bg-blue-600",
  slack: "bg-purple-500",
  teams: "bg-indigo-500",
  discord: "bg-violet-500",
  custom: "bg-gray-500",
};

export default function WebhookTemplates() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [viewLogsTemplate, setViewLogsTemplate] = useState<any>(null);
  const [showSampleTemplates, setShowSampleTemplates] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channelType: 'telegram' as 'telegram' | 'zalo' | 'slack' | 'teams' | 'discord' | 'custom',
    templateTitle: '',
    templateBody: '',
    templateFormat: 'text' as 'text' | 'markdown' | 'html' | 'json',
    // Telegram
    telegramBotToken: '',
    telegramChatId: '',
    telegramParseMode: 'HTML' as 'HTML' | 'Markdown' | 'MarkdownV2',
    // Zalo
    zaloOaId: '',
    zaloAccessToken: '',
    zaloTemplateId: '',
    // Custom webhook
    webhookUrl: '',
    webhookMethod: 'POST' as 'GET' | 'POST' | 'PUT',
    webhookHeaders: '',
    webhookAuthType: 'none' as 'none' | 'bearer' | 'basic' | 'api_key',
    webhookAuthValue: '',
    // Filters
    events: [] as string[],
    minSeverity: 'warning' as 'info' | 'warning' | 'critical',
    rateLimitMinutes: 5,
    isActive: true,
    isDefault: false,
  });

  // Queries
  const { data: templates, refetch: refetchTemplates, isLoading } = trpc.webhookTemplate.list.useQuery();
  const { data: metadata } = trpc.webhookTemplate.getMetadata.useQuery();
  const { data: sampleTemplates } = trpc.webhookTemplate.getSampleTemplates.useQuery();
  const { data: logs, refetch: refetchLogs } = trpc.webhookTemplate.getLogs.useQuery(
    { templateId: viewLogsTemplate?.id, limit: 50 },
    { enabled: !!viewLogsTemplate }
  );

  // Mutations
  const createMutation = trpc.webhookTemplate.create.useMutation({
    onSuccess: () => {
      toast.success('Đã tạo template thành công');
      setIsCreateOpen(false);
      resetForm();
      refetchTemplates();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateMutation = trpc.webhookTemplate.update.useMutation({
    onSuccess: () => {
      toast.success('Đã cập nhật template');
      setEditingTemplate(null);
      resetForm();
      refetchTemplates();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const deleteMutation = trpc.webhookTemplate.delete.useMutation({
    onSuccess: () => {
      toast.success('Đã xóa template');
      refetchTemplates();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const testMutation = trpc.webhookTemplate.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Test thành công! Kiểm tra kênh nhận thông báo của bạn.');
      } else {
        toast.error(`Test thất bại: ${result.error}`);
      }
      refetchTemplates();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      channelType: 'telegram',
      templateTitle: '',
      templateBody: '',
      templateFormat: 'text',
      telegramBotToken: '',
      telegramChatId: '',
      telegramParseMode: 'HTML',
      zaloOaId: '',
      zaloAccessToken: '',
      zaloTemplateId: '',
      webhookUrl: '',
      webhookMethod: 'POST',
      webhookHeaders: '',
      webhookAuthType: 'none',
      webhookAuthValue: '',
      events: [],
      minSeverity: 'warning',
      rateLimitMinutes: 5,
      isActive: true,
      isDefault: false,
    });
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      channelType: template.channelType,
      templateTitle: template.templateTitle || '',
      templateBody: template.templateBody,
      templateFormat: template.templateFormat || 'text',
      telegramBotToken: template.telegramBotToken || '',
      telegramChatId: template.telegramChatId || '',
      telegramParseMode: template.telegramParseMode || 'HTML',
      zaloOaId: template.zaloOaId || '',
      zaloAccessToken: template.zaloAccessToken || '',
      zaloTemplateId: template.zaloTemplateId || '',
      webhookUrl: template.webhookUrl || '',
      webhookMethod: template.webhookMethod || 'POST',
      webhookHeaders: template.webhookHeaders ? JSON.stringify(template.webhookHeaders) : '',
      webhookAuthType: template.webhookAuthType || 'none',
      webhookAuthValue: template.webhookAuthValue || '',
      events: template.events || [],
      minSeverity: template.minSeverity || 'warning',
      rateLimitMinutes: template.rateLimitMinutes || 5,
      isActive: template.isActive === 1,
      isDefault: template.isDefault === 1,
    });
  };

  const handleSave = () => {
    const data = {
      ...formData,
      webhookHeaders: formData.webhookHeaders ? JSON.parse(formData.webhookHeaders) : undefined,
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleUseSample = (sample: any) => {
    setFormData({
      ...formData,
      name: sample.name,
      channelType: sample.channelType,
      templateTitle: sample.templateTitle || '',
      templateBody: sample.templateBody,
      templateFormat: sample.templateFormat || 'text',
      events: sample.events || [],
    });
    setShowSampleTemplates(false);
    setIsCreateOpen(true);
  };

  const insertPlaceholder = (placeholder: string) => {
    setFormData({
      ...formData,
      templateBody: formData.templateBody + placeholder,
    });
  };

  const ChannelIcon = CHANNEL_ICONS[formData.channelType] || Globe;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Webhook Templates</h1>
            <p className="text-muted-foreground mt-1">
              Quản lý template thông báo cho Telegram, Zalo, Slack, Teams và các hệ thống khác
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSampleTemplates(true)}>
              <Copy className="h-4 w-4 mr-2" />
              Mẫu có sẵn
            </Button>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo Template
            </Button>
          </div>
        </div>

        {/* Channel Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metadata?.channelTypes.map((channel) => {
            const Icon = CHANNEL_ICONS[channel.value] || Globe;
            const count = templates?.filter(t => t.channelType === channel.value).length || 0;
            return (
              <Card key={channel.value} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${CHANNEL_COLORS[channel.value]} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{channel.label}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Templates List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Danh sách Templates
            </CardTitle>
            <CardDescription>
              Các template webhook đã cấu hình cho hệ thống thông báo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : templates?.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Chưa có template nào</h3>
                <p className="text-muted-foreground mb-4">Tạo template đầu tiên để bắt đầu nhận thông báo</p>
                <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo Template
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {templates?.map((template) => {
                  const Icon = CHANNEL_ICONS[template.channelType] || Globe;
                  return (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${CHANNEL_COLORS[template.channelType]} text-white`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{template.name}</h4>
                            {template.isDefault === 1 && (
                              <Badge variant="secondary">Mặc định</Badge>
                            )}
                            {template.isActive === 1 ? (
                              <Badge variant="default" className="bg-green-500">Hoạt động</Badge>
                            ) : (
                              <Badge variant="outline">Tắt</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {template.description || `${template.channelType} template`}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {template.totalSent} đã gửi
                            </span>
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3 text-red-500" />
                              {template.totalFailed} thất bại
                            </span>
                            {template.lastSentAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Gửi lần cuối: {new Date(template.lastSentAt).toLocaleString('vi-VN')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewLogsTemplate(template)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => testMutation.mutate({ id: template.id })}
                          disabled={testMutation.isPending}
                        >
                          {testMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Bạn có chắc muốn xóa template này?')) {
                              deleteMutation.mutate({ id: template.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateOpen || !!editingTemplate} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingTemplate(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Chỉnh sửa Template' : 'Tạo Template mới'}
              </DialogTitle>
              <DialogDescription>
                Cấu hình template thông báo cho các kênh khác nhau
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                <TabsTrigger value="channel">Kênh</TabsTrigger>
                <TabsTrigger value="filters">Bộ lọc</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tên Template *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Telegram - Cảnh báo CPK"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại kênh *</Label>
                    <Select
                      value={formData.channelType}
                      onValueChange={(v: any) => setFormData({ ...formData, channelType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {metadata?.channelTypes.map((channel) => (
                          <SelectItem key={channel.value} value={channel.value}>
                            {channel.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả ngắn về template"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tiêu đề thông báo</Label>
                  <Input
                    value={formData.templateTitle}
                    onChange={(e) => setFormData({ ...formData, templateTitle: e.target.value })}
                    placeholder="VD: ⚠️ Cảnh báo CPK - {{product}}"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Nội dung thông báo *</Label>
                    <Select
                      value={formData.templateFormat}
                      onValueChange={(v: any) => setFormData({ ...formData, templateFormat: v })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    value={formData.templateBody}
                    onChange={(e) => setFormData({ ...formData, templateBody: e.target.value })}
                    placeholder="Nội dung thông báo với các placeholder như {{cpk}}, {{product}}..."
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Placeholders có sẵn:</Label>
                  <div className="flex flex-wrap gap-1">
                    {metadata?.placeholders.map((p) => (
                      <Badge
                        key={p.key}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => insertPlaceholder(p.key)}
                        title={p.description}
                      >
                        {p.key}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="channel" className="space-y-4 mt-4">
                {formData.channelType === 'telegram' && (
                  <>
                    <div className="space-y-2">
                      <Label>Bot Token *</Label>
                      <Input
                        type="password"
                        value={formData.telegramBotToken}
                        onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                        placeholder="Nhập Bot Token từ @BotFather"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Chat ID *</Label>
                      <Input
                        value={formData.telegramChatId}
                        onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                        placeholder="ID của chat/group/channel"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Parse Mode</Label>
                      <Select
                        value={formData.telegramParseMode}
                        onValueChange={(v: any) => setFormData({ ...formData, telegramParseMode: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HTML">HTML</SelectItem>
                          <SelectItem value="Markdown">Markdown</SelectItem>
                          <SelectItem value="MarkdownV2">MarkdownV2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {formData.channelType === 'zalo' && (
                  <>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">Hướng dẫn tích hợp Zalo OA</h4>
                      <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                        <li>Đăng ký Zalo Official Account tại developers.zalo.me</li>
                        <li>Tạo ứng dụng và lấy OA ID</li>
                        <li>Lấy Access Token từ Zalo Developer Console</li>
                      </ol>
                    </div>
                    <div className="space-y-2">
                      <Label>OA ID *</Label>
                      <Input
                        value={formData.zaloOaId}
                        onChange={(e) => setFormData({ ...formData, zaloOaId: e.target.value })}
                        placeholder="ID của Zalo Official Account"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Access Token *</Label>
                      <Input
                        type="password"
                        value={formData.zaloAccessToken}
                        onChange={(e) => setFormData({ ...formData, zaloAccessToken: e.target.value })}
                        placeholder="Access Token từ Zalo Developer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Template ID (tùy chọn)</Label>
                      <Input
                        value={formData.zaloTemplateId}
                        onChange={(e) => setFormData({ ...formData, zaloTemplateId: e.target.value })}
                        placeholder="ID của template ZNS"
                      />
                    </div>
                  </>
                )}

                {(formData.channelType === 'slack' || formData.channelType === 'teams' || formData.channelType === 'discord') && (
                  <div className="space-y-2">
                    <Label>Webhook URL *</Label>
                    <Input
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      placeholder={`URL webhook của ${formData.channelType}`}
                    />
                  </div>
                )}

                {formData.channelType === 'custom' && (
                  <>
                    <div className="space-y-2">
                      <Label>Webhook URL *</Label>
                      <Input
                        value={formData.webhookUrl}
                        onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                        placeholder="https://your-api.com/webhook"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>HTTP Method</Label>
                        <Select
                          value={formData.webhookMethod}
                          onValueChange={(v: any) => setFormData({ ...formData, webhookMethod: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="GET">GET</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Authentication</Label>
                        <Select
                          value={formData.webhookAuthType}
                          onValueChange={(v: any) => setFormData({ ...formData, webhookAuthType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Không</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="api_key">API Key</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {formData.webhookAuthType !== 'none' && (
                      <div className="space-y-2">
                        <Label>Auth Value</Label>
                        <Input
                          type="password"
                          value={formData.webhookAuthValue}
                          onChange={(e) => setFormData({ ...formData, webhookAuthValue: e.target.value })}
                          placeholder={formData.webhookAuthType === 'bearer' ? 'Bearer token' : 'API Key'}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Custom Headers (JSON)</Label>
                      <Textarea
                        value={formData.webhookHeaders}
                        onChange={(e) => setFormData({ ...formData, webhookHeaders: e.target.value })}
                        placeholder='{"X-Custom-Header": "value"}'
                        rows={3}
                        className="font-mono text-sm"
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="filters" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Loại sự kiện</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {metadata?.eventTypes.map((event) => (
                      <div key={event.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`event-${event.value}`}
                          checked={formData.events.includes(event.value)}
                          onCheckedChange={(checked) => {
                            setFormData({
                              ...formData,
                              events: checked
                                ? [...formData.events, event.value]
                                : formData.events.filter(e => e !== event.value),
                            });
                          }}
                        />
                        <label htmlFor={`event-${event.value}`} className="text-sm cursor-pointer">
                          {event.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mức độ tối thiểu</Label>
                    <Select
                      value={formData.minSeverity}
                      onValueChange={(v: any) => setFormData({ ...formData, minSeverity: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Thông tin</SelectItem>
                        <SelectItem value="warning">Cảnh báo</SelectItem>
                        <SelectItem value="critical">Nghiêm trọng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rate Limit (phút)</Label>
                    <Input
                      type="number"
                      value={formData.rateLimitMinutes}
                      onChange={(e) => setFormData({ ...formData, rateLimitMinutes: parseInt(e.target.value) || 5 })}
                      min={1}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Kích hoạt</Label>
                    <p className="text-sm text-muted-foreground">Bật/tắt template này</p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Đặt làm mặc định</Label>
                    <p className="text-sm text-muted-foreground">Sử dụng template này cho kênh {formData.channelType}</p>
                  </div>
                  <Switch
                    checked={formData.isDefault}
                    onCheckedChange={(v) => setFormData({ ...formData, isDefault: v })}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateOpen(false);
                setEditingTemplate(null);
                resetForm();
              }}>
                Hủy
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editingTemplate ? 'Cập nhật' : 'Tạo Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sample Templates Dialog */}
        <Dialog open={showSampleTemplates} onOpenChange={setShowSampleTemplates}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Mẫu Template có sẵn</DialogTitle>
              <DialogDescription>
                Chọn một mẫu để bắt đầu nhanh
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {sampleTemplates?.map((sample, idx) => {
                  const Icon = CHANNEL_ICONS[sample.channelType] || Globe;
                  return (
                    <div
                      key={idx}
                      className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleUseSample(sample)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${CHANNEL_COLORS[sample.channelType]} text-white`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <h4 className="font-medium">{sample.name}</h4>
                      </div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {sample.templateBody.slice(0, 200)}...
                      </pre>
                      <div className="flex gap-1 mt-2">
                        {sample.events?.map((e: string) => (
                          <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Logs Dialog */}
        <Dialog open={!!viewLogsTemplate} onOpenChange={(open) => !open && setViewLogsTemplate(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Lịch sử gửi - {viewLogsTemplate?.name}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {logs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có lịch sử gửi
                </div>
              ) : (
                <div className="space-y-3">
                  {logs?.map((log) => (
                    <div key={log.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {log.status === 'sent' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : log.status === 'failed' ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium">{log.eventTitle}</span>
                          <Badge variant={log.severity === 'critical' ? 'destructive' : log.severity === 'warning' ? 'secondary' : 'outline'}>
                            {log.severity}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      {log.errorMessage && (
                        <p className="text-sm text-red-500 mt-1">{log.errorMessage}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
