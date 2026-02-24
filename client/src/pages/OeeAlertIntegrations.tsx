/**
 * OEE Alert Integrations - Cấu hình Telegram/Slack cho OEE alerts
 */

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Trash2,
  TestTube,
  AlertTriangle,
  Bell,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const SlackIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
  </svg>
);

export default function OeeAlertIntegrations() {
  const [activeTab, setActiveTab] = useState('telegram');
  const [showAddTelegram, setShowAddTelegram] = useState(false);
  const [showAddSlack, setShowAddSlack] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);

  const [telegramForm, setTelegramForm] = useState({
    name: '',
    botToken: '',
    chatId: '',
    alertTypes: ['oee_drop', 'cpk_alert', 'iot_critical'] as string[],
  });

  const [slackForm, setSlackForm] = useState({
    name: '',
    webhookUrl: '',
    channel: '',
    alertTypes: ['oee_drop', 'cpk_alert', 'iot_critical'] as string[],
  });

  const { data: telegramConfigs, isLoading: loadingTelegram, refetch: refetchTelegram } = 
    trpc.telegram.list.useQuery();

  const createTelegram = trpc.telegram.create.useMutation({
    onSuccess: () => {
      toast.success('Đã thêm cấu hình Telegram');
      setShowAddTelegram(false);
      setTelegramForm({ name: '', botToken: '', chatId: '', alertTypes: ['oee_drop', 'cpk_alert', 'iot_critical'] });
      refetchTelegram();
    },
    onError: (error) => toast.error('Lỗi: ' + error.message),
  });

  const deleteTelegram = trpc.telegram.delete.useMutation({
    onSuccess: () => {
      toast.success('Đã xóa cấu hình');
      refetchTelegram();
    },
    onError: (error) => toast.error('Lỗi: ' + error.message),
  });

  const testTelegram = trpc.telegram.test.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Test thành công! Kiểm tra tin nhắn trên Telegram.');
      } else {
        toast.error('Test thất bại: ' + (data.error || 'Unknown error'));
      }
      setTestingId(null);
    },
    onError: (error) => {
      toast.error('Lỗi test: ' + error.message);
      setTestingId(null);
    },
  });

  const toggleTelegramActive = trpc.telegram.update.useMutation({
    onSuccess: () => refetchTelegram(),
  });

  const alertTypeOptions = [
    { value: 'oee_drop', label: 'OEE giảm' },
    { value: 'cpk_alert', label: 'CPK cảnh báo' },
    { value: 'iot_critical', label: 'IoT Critical' },
    { value: 'spc_violation', label: 'Vi phạm SPC' },
    { value: 'maintenance', label: 'Bảo trì' },
    { value: 'defect_rate', label: 'Tỷ lệ lỗi' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Tích hợp Alert OEE
          </h1>
          <p className="text-muted-foreground">
            Cấu hình gửi cảnh báo OEE qua Telegram và Slack
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Hướng dẫn</AlertTitle>
          <AlertDescription>
            Để nhận cảnh báo OEE, bạn cần cấu hình ít nhất một kênh thông báo (Telegram hoặc Slack).
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="telegram" className="gap-2">
              <TelegramIcon />
              Telegram
            </TabsTrigger>
            <TabsTrigger value="slack" className="gap-2">
              <SlackIcon />
              Slack
            </TabsTrigger>
          </TabsList>

          <TabsContent value="telegram" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Cấu hình Telegram Bot</h2>
                <p className="text-sm text-muted-foreground">Thêm bot Telegram để nhận cảnh báo</p>
              </div>
              <Dialog open={showAddTelegram} onOpenChange={setShowAddTelegram}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Thêm Bot</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm Telegram Bot</DialogTitle>
                    <DialogDescription>Nhập thông tin bot Telegram</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tên cấu hình</Label>
                      <Input
                        placeholder="VD: Bot cảnh báo OEE"
                        value={telegramForm.name}
                        onChange={(e) => setTelegramForm({ ...telegramForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bot Token</Label>
                      <Input
                        placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                        value={telegramForm.botToken}
                        onChange={(e) => setTelegramForm({ ...telegramForm, botToken: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Lấy token từ @BotFather</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Chat ID</Label>
                      <Input
                        placeholder="-1001234567890"
                        value={telegramForm.chatId}
                        onChange={(e) => setTelegramForm({ ...telegramForm, chatId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Loại cảnh báo</Label>
                      <div className="flex flex-wrap gap-2">
                        {alertTypeOptions.map(opt => (
                          <Badge
                            key={opt.value}
                            variant={telegramForm.alertTypes.includes(opt.value) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              const types = telegramForm.alertTypes.includes(opt.value)
                                ? telegramForm.alertTypes.filter(t => t !== opt.value)
                                : [...telegramForm.alertTypes, opt.value];
                              setTelegramForm({ ...telegramForm, alertTypes: types });
                            }}
                          >
                            {opt.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddTelegram(false)}>Hủy</Button>
                    <Button 
                      onClick={() => createTelegram.mutate(telegramForm)}
                      disabled={createTelegram.isPending || !telegramForm.name || !telegramForm.botToken || !telegramForm.chatId}
                    >
                      {createTelegram.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Thêm
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {loadingTelegram ? (
                <Card className="p-8 text-center">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                </Card>
              ) : telegramConfigs?.length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="flex justify-center mb-2"><TelegramIcon /></div>
                  <p className="text-muted-foreground">Chưa có cấu hình Telegram nào</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowAddTelegram(true)}>
                    <Plus className="h-4 w-4 mr-2" />Thêm Bot đầu tiên
                  </Button>
                </Card>
              ) : (
                telegramConfigs?.map((config: any) => (
                  <Card key={config.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                            <TelegramIcon />
                          </div>
                          <div>
                            <CardTitle className="text-base">{config.name}</CardTitle>
                            <CardDescription className="text-xs">Chat ID: {config.chatId}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={config.isActive}
                            onCheckedChange={(checked) => 
                              toggleTelegramActive.mutate({ id: config.id, isActive: checked })
                            }
                          />
                          <Badge variant={config.isActive ? 'default' : 'secondary'}>
                            {config.isActive ? 'Hoạt động' : 'Tắt'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {(config.alertTypes || []).map((type: string) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {alertTypeOptions.find(o => o.value === type)?.label || type}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTestingId(config.id);
                              testTelegram.mutate({ id: config.id });
                            }}
                            disabled={testingId === config.id}
                          >
                            {testingId === config.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                            <span className="ml-2">Test</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Xác nhận xóa?')) {
                                deleteTelegram.mutate({ id: config.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hướng dẫn thiết lập Telegram Bot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3"><Badge variant="outline">1</Badge><p>Mở Telegram và tìm @BotFather</p></div>
                <div className="flex gap-3"><Badge variant="outline">2</Badge><p>Gửi /newbot và làm theo hướng dẫn</p></div>
                <div className="flex gap-3"><Badge variant="outline">3</Badge><p>Sao chép Bot Token được cung cấp</p></div>
                <div className="flex gap-3"><Badge variant="outline">4</Badge><p>Thêm bot vào group hoặc chat trực tiếp</p></div>
                <div className="flex gap-3"><Badge variant="outline">5</Badge><p>Lấy Chat ID từ: api.telegram.org/bot[TOKEN]/getUpdates</p></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="slack" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Cấu hình Slack Webhook</h2>
                <p className="text-sm text-muted-foreground">Thêm Slack Incoming Webhook</p>
              </div>
              <Dialog open={showAddSlack} onOpenChange={setShowAddSlack}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Thêm Webhook</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm Slack Webhook</DialogTitle>
                    <DialogDescription>Nhập thông tin Slack Incoming Webhook</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tên cấu hình</Label>
                      <Input
                        placeholder="VD: Channel #alerts"
                        value={slackForm.name}
                        onChange={(e) => setSlackForm({ ...slackForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input
                        placeholder="https://hooks.slack.com/services/..."
                        value={slackForm.webhookUrl}
                        onChange={(e) => setSlackForm({ ...slackForm, webhookUrl: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Channel (tùy chọn)</Label>
                      <Input
                        placeholder="#alerts"
                        value={slackForm.channel}
                        onChange={(e) => setSlackForm({ ...slackForm, channel: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddSlack(false)}>Hủy</Button>
                    <Button disabled={!slackForm.name || !slackForm.webhookUrl}>Thêm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="p-8 text-center">
              <div className="flex justify-center mb-2"><SlackIcon /></div>
              <p className="text-muted-foreground">Chưa có cấu hình Slack nào</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowAddSlack(true)}>
                <Plus className="h-4 w-4 mr-2" />Thêm Webhook đầu tiên
              </Button>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hướng dẫn thiết lập Slack Webhook</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3"><Badge variant="outline">1</Badge><p>Truy cập Slack App Directory và tạo app mới</p></div>
                <div className="flex gap-3"><Badge variant="outline">2</Badge><p>Bật Incoming Webhooks trong Features</p></div>
                <div className="flex gap-3"><Badge variant="outline">3</Badge><p>Thêm Webhook mới và chọn channel</p></div>
                <div className="flex gap-3"><Badge variant="outline">4</Badge><p>Sao chép Webhook URL</p></div>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Xem hướng dẫn chi tiết
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
