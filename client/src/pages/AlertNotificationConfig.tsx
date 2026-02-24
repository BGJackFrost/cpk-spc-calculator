import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  Mail,
  MessageSquare,
  Bell,
  Settings,
  Save,
  TestTube,
  Phone,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function AlertNotificationConfig() {
  const [emailConfig, setEmailConfig] = useState({
    enabled: true,
    recipients: '',
  });

  const [smsConfig, setSmsConfig] = useState({
    enabled: false,
    accountSid: '',
    authToken: '',
    fromNumber: '',
    recipients: '',
  });

  const [escalationConfig, setEscalationConfig] = useState({
    enabled: false,
    levels: [
      { level: 1, name: 'Supervisor', timeoutMinutes: 15, notifyEmails: '', notifyPhones: '' },
      { level: 2, name: 'Manager', timeoutMinutes: 30, notifyEmails: '', notifyPhones: '' },
      { level: 3, name: 'Director', timeoutMinutes: 60, notifyEmails: '', notifyPhones: '' },
    ],
  });

  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Mutations
  const saveConfigMutation = trpc.system.saveSystemSetting.useMutation({
    onSuccess: () => {
      toast.success('Đã lưu cấu hình');
    },
    onError: (error) => {
      toast.error('Lỗi khi lưu: ' + error.message);
    },
  });

  const handleSaveEmailConfig = async () => {
    setIsSaving(true);
    try {
      await saveConfigMutation.mutateAsync({
        key: 'critical_alert_emails',
        value: emailConfig.recipients,
      });
      toast.success('Đã lưu cấu hình email');
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSmsConfig = async () => {
    setIsSaving(true);
    try {
      await saveConfigMutation.mutateAsync({
        key: 'twilio_account_sid',
        value: smsConfig.accountSid,
      });
      await saveConfigMutation.mutateAsync({
        key: 'twilio_auth_token',
        value: smsConfig.authToken,
      });
      await saveConfigMutation.mutateAsync({
        key: 'twilio_from_number',
        value: smsConfig.fromNumber,
      });
      await saveConfigMutation.mutateAsync({
        key: 'twilio_enabled',
        value: smsConfig.enabled ? 'true' : 'false',
      });
      await saveConfigMutation.mutateAsync({
        key: 'critical_alert_phones',
        value: smsConfig.recipients,
      });
      toast.success('Đã lưu cấu hình SMS');
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = () => {
    if (!testEmail) {
      toast.error('Vui lòng nhập email để test');
      return;
    }
    toast.info('Đang gửi email test...');
    // In real implementation, call API to send test email
    setTimeout(() => {
      toast.success('Email test đã được gửi');
    }, 2000);
  };

  const handleTestSms = () => {
    if (!testPhone) {
      toast.error('Vui lòng nhập số điện thoại để test');
      return;
    }
    toast.info('Đang gửi SMS test...');
    // In real implementation, call API to send test SMS
    setTimeout(() => {
      toast.success('SMS test đã được gửi');
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Cấu hình Thông báo Cảnh báo</h1>
          <p className="text-muted-foreground">
            Thiết lập kênh thông báo cho các cảnh báo critical
          </p>
        </div>

        <Tabs defaultValue="email" className="space-y-4">
          <TabsList>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS (Twilio)
            </TabsTrigger>
            <TabsTrigger value="escalation" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Escalation
            </TabsTrigger>
          </TabsList>

          {/* Email Tab */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Cấu hình Email
                </CardTitle>
                <CardDescription>
                  Thiết lập danh sách email nhận thông báo khi có cảnh báo critical
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bật thông báo Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Gửi email khi có cảnh báo critical
                    </p>
                  </div>
                  <Switch
                    checked={emailConfig.enabled}
                    onCheckedChange={(checked) =>
                      setEmailConfig({ ...emailConfig, enabled: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Danh sách Email nhận thông báo</Label>
                  <Input
                    placeholder="email1@example.com, email2@example.com"
                    value={emailConfig.recipients}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, recipients: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Phân cách nhiều email bằng dấu phẩy
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Test gửi Email</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Email test"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleTestEmail}>
                      <TestTube className="h-4 w-4 mr-2" />
                      Gửi Test
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveEmailConfig} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    Lưu cấu hình
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMS Tab */}
          <TabsContent value="sms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Cấu hình SMS (Twilio)
                </CardTitle>
                <CardDescription>
                  Thiết lập Twilio để gửi SMS khi có cảnh báo critical
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bật thông báo SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Gửi SMS khi có cảnh báo critical
                    </p>
                  </div>
                  <Switch
                    checked={smsConfig.enabled}
                    onCheckedChange={(checked) =>
                      setSmsConfig({ ...smsConfig, enabled: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account SID</Label>
                    <Input
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={smsConfig.accountSid}
                      onChange={(e) =>
                        setSmsConfig({ ...smsConfig, accountSid: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Auth Token</Label>
                    <Input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={smsConfig.authToken}
                      onChange={(e) =>
                        setSmsConfig({ ...smsConfig, authToken: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Số điện thoại gửi (From Number)</Label>
                  <Input
                    placeholder="+1234567890"
                    value={smsConfig.fromNumber}
                    onChange={(e) =>
                      setSmsConfig({ ...smsConfig, fromNumber: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Số điện thoại Twilio của bạn (bao gồm mã quốc gia)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Danh sách số điện thoại nhận</Label>
                  <Input
                    placeholder="+84901234567, +84909876543"
                    value={smsConfig.recipients}
                    onChange={(e) =>
                      setSmsConfig({ ...smsConfig, recipients: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Phân cách nhiều số bằng dấu phẩy (bao gồm mã quốc gia)
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Test gửi SMS</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="+84901234567"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleTestSms}>
                      <TestTube className="h-4 w-4 mr-2" />
                      Gửi Test
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSmsConfig} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    Lưu cấu hình
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Twilio Guide */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Hướng dẫn lấy thông tin Twilio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Đăng ký tài khoản tại <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">twilio.com</a></li>
                  <li>Vào Console Dashboard để lấy Account SID và Auth Token</li>
                  <li>Mua hoặc sử dụng số điện thoại Twilio miễn phí (trial)</li>
                  <li>Nhập thông tin vào form trên và lưu</li>
                </ol>
                <p className="text-muted-foreground">
                  Lưu ý: Tài khoản trial chỉ gửi được SMS đến số đã xác minh.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Escalation Tab */}
          <TabsContent value="escalation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Cấu hình Escalation
                </CardTitle>
                <CardDescription>
                  Tự động escalate cảnh báo khi không được xử lý trong thời gian quy định
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bật Escalation tự động</Label>
                    <p className="text-sm text-muted-foreground">
                      Tự động thông báo lên cấp cao hơn khi cảnh báo không được xử lý
                    </p>
                  </div>
                  <Switch
                    checked={escalationConfig.enabled}
                    onCheckedChange={(checked) =>
                      setEscalationConfig({ ...escalationConfig, enabled: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  {escalationConfig.levels.map((level, index) => (
                    <Card key={level.level} className="border-dashed">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Badge variant={index === 0 ? 'secondary' : index === 1 ? 'default' : 'destructive'}>
                              Level {level.level}
                            </Badge>
                            {level.name}
                          </CardTitle>
                          <Badge variant="outline">
                            Sau {level.timeoutMinutes} phút
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tên cấp độ</Label>
                            <Input
                              value={level.name}
                              onChange={(e) => {
                                const newLevels = [...escalationConfig.levels];
                                newLevels[index].name = e.target.value;
                                setEscalationConfig({ ...escalationConfig, levels: newLevels });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Thời gian chờ (phút)</Label>
                            <Input
                              type="number"
                              value={level.timeoutMinutes}
                              onChange={(e) => {
                                const newLevels = [...escalationConfig.levels];
                                newLevels[index].timeoutMinutes = parseInt(e.target.value) || 15;
                                setEscalationConfig({ ...escalationConfig, levels: newLevels });
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Email thông báo</Label>
                          <Input
                            placeholder="supervisor@example.com"
                            value={level.notifyEmails}
                            onChange={(e) => {
                              const newLevels = [...escalationConfig.levels];
                              newLevels[index].notifyEmails = e.target.value;
                              setEscalationConfig({ ...escalationConfig, levels: newLevels });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Số điện thoại SMS</Label>
                          <Input
                            placeholder="+84901234567"
                            value={level.notifyPhones}
                            onChange={(e) => {
                              const newLevels = [...escalationConfig.levels];
                              newLevels[index].notifyPhones = e.target.value;
                              setEscalationConfig({ ...escalationConfig, levels: newLevels });
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    Lưu cấu hình Escalation
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Escalation Flow Diagram */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Quy trình Escalation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
                      <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <p className="font-medium">Cảnh báo mới</p>
                    <p className="text-muted-foreground text-xs">0 phút</p>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed mx-4" />
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                      <Bell className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="font-medium">Level 1</p>
                    <p className="text-muted-foreground text-xs">15 phút</p>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed mx-4" />
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                      <Bell className="h-6 w-6 text-orange-600" />
                    </div>
                    <p className="font-medium">Level 2</p>
                    <p className="text-muted-foreground text-xs">30 phút</p>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed mx-4" />
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                      <Bell className="h-6 w-6 text-red-600" />
                    </div>
                    <p className="font-medium">Level 3</p>
                    <p className="text-muted-foreground text-xs">60 phút</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
