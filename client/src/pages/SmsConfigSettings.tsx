/**
 * SMS Configuration Settings Page
 * Trang cấu hình SMS với form nhập thông tin provider và test SMS
 */
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';
import { 
  MessageSquare, 
  Phone, 
  Settings, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertTriangle,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  BarChart3,
  History
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SmsConfig {
  enabled: boolean;
  provider: 'twilio' | 'nexmo' | 'custom';
  apiKey?: string;
  apiSecret?: string;
  fromNumber?: string;
  customEndpoint?: string;
  timeoutMinutes: number;
  recipients: string[];
  escalationEnabled: boolean;
  escalationIntervalMinutes: number;
  maxEscalations: number;
}

interface SmsStats {
  totalSent: number;
  alertsCovered: number;
  byDay: { date: string; count: number }[];
}

export default function SmsConfigSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<SmsConfig>({
    enabled: false,
    provider: 'twilio',
    apiKey: '',
    apiSecret: '',
    fromNumber: '',
    customEndpoint: '',
    timeoutMinutes: 30,
    recipients: [],
    escalationEnabled: true,
    escalationIntervalMinutes: 15,
    maxEscalations: 3,
  });
  const [recipientInput, setRecipientInput] = useState('');
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testMessage, setTestMessage] = useState('Đây là tin nhắn test từ hệ thống SPC/CPK Calculator');
  const [showSecrets, setShowSecrets] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [stats, setStats] = useState<SmsStats | null>(null);
  const [activeTab, setActiveTab] = useState('config');

  // Load config
  const configQuery = trpc.criticalAlertSms.getSmsConfig.useQuery(undefined, {
    onSuccess: (data) => {
      if (data) {
        setConfig(data as SmsConfig);
      }
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    },
  });

  // Load stats
  const statsQuery = trpc.criticalAlertSms.getSmsStats.useQuery({ days: 7 }, {
    onSuccess: (data) => {
      if (data) {
        setStats(data as SmsStats);
      }
    },
  });

  // Save config mutation
  const saveConfigMutation = trpc.criticalAlertSms.saveSmsConfig.useMutation({
    onSuccess: () => {
      toast({
        title: 'Đã lưu cấu hình',
        description: 'Cấu hình SMS đã được lưu thành công',
      });
      setIsSaving(false);
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể lưu cấu hình',
        variant: 'destructive',
      });
      setIsSaving(false);
    },
  });

  // Test SMS mutation
  const testSmsMutation = trpc.criticalAlertSms.testSms.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Gửi SMS thành công',
          description: 'Tin nhắn test đã được gửi thành công',
        });
      } else {
        toast({
          title: 'Gửi SMS thất bại',
          description: data.error || 'Không thể gửi tin nhắn test',
          variant: 'destructive',
        });
      }
      setIsTesting(false);
      setTestDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể gửi tin nhắn test',
        variant: 'destructive',
      });
      setIsTesting(false);
    },
  });

  const handleSaveConfig = () => {
    setIsSaving(true);
    saveConfigMutation.mutate(config);
  };

  const handleTestSms = () => {
    if (!testPhoneNumber) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập số điện thoại test',
        variant: 'destructive',
      });
      return;
    }
    setIsTesting(true);
    testSmsMutation.mutate({
      phoneNumber: testPhoneNumber,
      message: testMessage,
    });
  };

  const addRecipient = () => {
    if (recipientInput && !config.recipients.includes(recipientInput)) {
      setConfig({
        ...config,
        recipients: [...config.recipients, recipientInput],
      });
      setRecipientInput('');
    }
  };

  const removeRecipient = (phone: string) => {
    setConfig({
      ...config,
      recipients: config.recipients.filter((r) => r !== phone),
    });
  };

  const getProviderInfo = () => {
    switch (config.provider) {
      case 'twilio':
        return {
          name: 'Twilio',
          description: 'Dịch vụ SMS phổ biến nhất với độ tin cậy cao',
          docs: 'https://www.twilio.com/docs/sms',
        };
      case 'nexmo':
        return {
          name: 'Vonage (Nexmo)',
          description: 'Dịch vụ SMS với giá cạnh tranh và phủ sóng toàn cầu',
          docs: 'https://developer.vonage.com/messaging/sms/overview',
        };
      case 'custom':
        return {
          name: 'Custom Endpoint',
          description: 'Sử dụng API SMS tùy chỉnh của riêng bạn',
          docs: '',
        };
      default:
        return { name: '', description: '', docs: '' };
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cấu hình SMS</h1>
            <p className="text-muted-foreground">
              Cấu hình gửi SMS tự động khi có cảnh báo Critical
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.enabled ? 'default' : 'secondary'}>
              {config.enabled ? 'Đang bật' : 'Đang tắt'}
            </Badge>
            <Button variant="outline" onClick={() => configQuery.refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="test">
              <Send className="h-4 w-4 mr-2" />
              Test SMS
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              Thống kê
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-6">
            {/* Enable/Disable */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Trạng thái
                </CardTitle>
                <CardDescription>
                  Bật/tắt tính năng gửi SMS tự động
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Kích hoạt SMS tự động</Label>
                    <p className="text-sm text-muted-foreground">
                      Gửi SMS khi có cảnh báo Critical chưa xử lý quá {config.timeoutMinutes} phút
                    </p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Provider Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Nhà cung cấp SMS
                </CardTitle>
                <CardDescription>
                  Chọn dịch vụ SMS và cấu hình thông tin xác thực
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Chọn Provider</Label>
                  <Select
                    value={config.provider}
                    onValueChange={(value: 'twilio' | 'nexmo' | 'custom') =>
                      setConfig({ ...config, provider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="nexmo">Vonage (Nexmo)</SelectItem>
                      <SelectItem value="custom">Custom Endpoint</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {getProviderInfo().description}
                  </p>
                </div>

                <Separator />

                {/* Provider-specific fields */}
                {config.provider === 'twilio' && (
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Twilio Configuration</AlertTitle>
                      <AlertDescription>
                        Lấy thông tin từ{' '}
                        <a
                          href="https://console.twilio.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Twilio Console
                        </a>
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Account SID</Label>
                        <div className="relative">
                          <Input
                            type={showSecrets ? 'text' : 'password'}
                            value={config.apiKey || ''}
                            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Auth Token</Label>
                        <div className="relative">
                          <Input
                            type={showSecrets ? 'text' : 'password'}
                            value={config.apiSecret || ''}
                            onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>From Number (Twilio Phone Number)</Label>
                      <Input
                        value={config.fromNumber || ''}
                        onChange={(e) => setConfig({ ...config, fromNumber: e.target.value })}
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>
                )}

                {config.provider === 'nexmo' && (
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Vonage (Nexmo) Configuration</AlertTitle>
                      <AlertDescription>
                        Lấy thông tin từ{' '}
                        <a
                          href="https://dashboard.nexmo.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Vonage Dashboard
                        </a>
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                          type={showSecrets ? 'text' : 'password'}
                          value={config.apiKey || ''}
                          onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                          placeholder="xxxxxxxx"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>API Secret</Label>
                        <Input
                          type={showSecrets ? 'text' : 'password'}
                          value={config.apiSecret || ''}
                          onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                          placeholder="xxxxxxxxxxxxxxxx"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>From Number / Sender ID</Label>
                      <Input
                        value={config.fromNumber || ''}
                        onChange={(e) => setConfig({ ...config, fromNumber: e.target.value })}
                        placeholder="+1234567890 hoặc COMPANY"
                      />
                    </div>
                  </div>
                )}

                {config.provider === 'custom' && (
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Custom Endpoint Configuration</AlertTitle>
                      <AlertDescription>
                        Cấu hình API endpoint tùy chỉnh để gửi SMS
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label>API Endpoint URL</Label>
                      <Input
                        value={config.customEndpoint || ''}
                        onChange={(e) => setConfig({ ...config, customEndpoint: e.target.value })}
                        placeholder="https://api.example.com/sms/send"
                      />
                      <p className="text-xs text-muted-foreground">
                        Endpoint sẽ nhận POST request với body: {`{ to, message, from }`}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>API Key (Bearer Token) - Optional</Label>
                      <Input
                        type={showSecrets ? 'text' : 'password'}
                        value={config.apiKey || ''}
                        onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                        placeholder="Bearer token nếu cần"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>From Number / Sender ID</Label>
                      <Input
                        value={config.fromNumber || ''}
                        onChange={(e) => setConfig({ ...config, fromNumber: e.target.value })}
                        placeholder="Sender ID"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSecrets(!showSecrets)}
                  >
                    {showSecrets ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Ẩn thông tin
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Hiển thị thông tin
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recipients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Danh sách người nhận
                </CardTitle>
                <CardDescription>
                  Thêm số điện thoại sẽ nhận SMS cảnh báo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    placeholder="+84xxxxxxxxx"
                    onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
                  />
                  <Button onClick={addRecipient}>Thêm</Button>
                </div>

                {config.recipients.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {config.recipients.map((phone) => (
                      <Badge
                        key={phone}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeRecipient(phone)}
                      >
                        {phone}
                        <XCircle className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Chưa có số điện thoại nào được thêm
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Timeout & Escalation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Thời gian & Escalation
                </CardTitle>
                <CardDescription>
                  Cấu hình thời gian chờ và leo thang cảnh báo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Thời gian chờ trước khi gửi SMS (phút)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    value={config.timeoutMinutes}
                    onChange={(e) =>
                      setConfig({ ...config, timeoutMinutes: parseInt(e.target.value) || 30 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    SMS sẽ được gửi khi cảnh báo Critical chưa xử lý quá thời gian này
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bật Escalation</Label>
                    <p className="text-sm text-muted-foreground">
                      Gửi SMS nhắc nhở nếu vẫn chưa xử lý
                    </p>
                  </div>
                  <Switch
                    checked={config.escalationEnabled}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, escalationEnabled: checked })
                    }
                  />
                </div>

                {config.escalationEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Khoảng cách giữa các lần nhắc (phút)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={60}
                        value={config.escalationIntervalMinutes}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            escalationIntervalMinutes: parseInt(e.target.value) || 15,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Số lần nhắc tối đa</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={config.maxEscalations}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            maxEscalations: parseInt(e.target.value) || 3,
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSaveConfig} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Lưu cấu hình
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Test SMS Tab */}
          <TabsContent value="test" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Gửi SMS Test
                </CardTitle>
                <CardDescription>
                  Kiểm tra cấu hình bằng cách gửi tin nhắn test
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!config.enabled && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>SMS đang tắt</AlertTitle>
                    <AlertDescription>
                      Bạn cần bật SMS trong tab Cấu hình trước khi test
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Số điện thoại nhận test</Label>
                  <Input
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="+84xxxxxxxxx"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nội dung tin nhắn</Label>
                  <Textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    onClick={handleTestSms}
                    disabled={isTesting || !config.enabled}
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Gửi SMS Test
                      </>
                    )}
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    Provider: <Badge variant="outline">{getProviderInfo().name}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Hướng dẫn Test
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Cấu hình Provider</p>
                      <p className="text-muted-foreground">
                        Nhập thông tin xác thực của nhà cung cấp SMS
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <span className="text-primary font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Bật SMS</p>
                      <p className="text-muted-foreground">
                        Bật switch "Kích hoạt SMS tự động" trong tab Cấu hình
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <span className="text-primary font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Lưu cấu hình</p>
                      <p className="text-muted-foreground">
                        Nhấn nút "Lưu cấu hình" để lưu thay đổi
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <span className="text-primary font-bold">4</span>
                    </div>
                    <div>
                      <p className="font-medium">Gửi Test</p>
                      <p className="text-muted-foreground">
                        Nhập số điện thoại và nhấn "Gửi SMS Test"
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổng SMS đã gửi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalSent || 0}</div>
                  <p className="text-xs text-muted-foreground">7 ngày gần nhất</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cảnh báo đã xử lý
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.alertsCovered || 0}</div>
                  <p className="text-xs text-muted-foreground">Alerts có SMS</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Người nhận
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{config.recipients.length}</div>
                  <p className="text-xs text-muted-foreground">Số điện thoại</p>
                </CardContent>
              </Card>
            </div>

            {/* SMS by Day */}
            <Card>
              <CardHeader>
                <CardTitle>SMS theo ngày</CardTitle>
                <CardDescription>Số lượng SMS đã gửi trong 7 ngày gần nhất</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.byDay && stats.byDay.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead className="text-right">Số lượng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.byDay.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell>{day.date}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{day.count}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Chưa có dữ liệu SMS trong 7 ngày gần nhất
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
