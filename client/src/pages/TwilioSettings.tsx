import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Phone, MessageSquare, CheckCircle, XCircle, Send, Settings, Shield, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TwilioSettings() {
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Load current config
  const { data: config, isLoading, refetch } = trpc.system.getTwilioConfig.useQuery(undefined, {
    onSuccess: (data) => {
      if (data) {
        setAccountSid(data.accountSid || '');
        setAuthToken(data.authToken || '');
        setFromNumber(data.fromNumber || '');
        setEnabled(data.enabled || false);
      }
    },
  });

  // Save config mutation
  const saveMutation = trpc.system.saveTwilioConfig.useMutation({
    onSuccess: () => {
      toast.success('Đã lưu cấu hình Twilio');
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Test SMS mutation
  const testMutation = trpc.system.testTwilioSms.useMutation({
    onSuccess: () => {
      toast.success('Đã gửi SMS test thành công!');
    },
    onError: (error) => {
      toast.error(`Lỗi gửi SMS: ${error.message}`);
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        accountSid,
        authToken,
        fromNumber,
        enabled,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone) {
      toast.error('Vui lòng nhập số điện thoại test');
      return;
    }
    setIsTesting(true);
    try {
      await testMutation.mutateAsync({ toNumber: testPhone });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Phone className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Cấu hình Twilio SMS</h1>
            <p className="text-muted-foreground">Thiết lập gửi SMS thông báo qua Twilio</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Thông tin Twilio Account
              </CardTitle>
              <CardDescription>
                Nhập thông tin từ Twilio Console để kích hoạt SMS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountSid">Account SID</Label>
                <Input
                  id="accountSid"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={accountSid}
                  onChange={(e) => setAccountSid(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Tìm trong Twilio Console &gt; Account Info
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authToken">Auth Token</Label>
                <Input
                  id="authToken"
                  type="password"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Auth Token bí mật từ Twilio Console
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromNumber">Số điện thoại gửi</Label>
                <Input
                  id="fromNumber"
                  placeholder="+1234567890"
                  value={fromNumber}
                  onChange={(e) => setFromNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Số điện thoại Twilio đã mua (định dạng E.164)
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-0.5">
                  <Label>Kích hoạt SMS</Label>
                  <p className="text-xs text-muted-foreground">
                    Bật/tắt gửi SMS thông báo
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </Button>
            </CardContent>
          </Card>

          {/* Test Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Test SMS
              </CardTitle>
              <CardDescription>
                Gửi SMS test để kiểm tra cấu hình
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testPhone">Số điện thoại nhận</Label>
                <Input
                  id="testPhone"
                  placeholder="+84912345678"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Nhập số điện thoại để nhận SMS test (định dạng E.164)
                </p>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleTest}
                disabled={isTesting || !enabled}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {isTesting ? 'Đang gửi...' : 'Gửi SMS Test'}
              </Button>

              {!enabled && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Chưa kích hoạt</AlertTitle>
                  <AlertDescription>
                    Bật "Kích hoạt SMS" và lưu cấu hình trước khi test
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Trạng thái
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Cấu hình</span>
                {accountSid && authToken && fromNumber ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Đã cấu hình
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <XCircle className="h-4 w-4" />
                    Chưa cấu hình
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Trạng thái</span>
                {enabled ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Đang hoạt động
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-500">
                    <XCircle className="h-4 w-4" />
                    Đã tắt
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Hướng dẫn
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><strong>1.</strong> Đăng ký tài khoản tại <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">twilio.com</a></p>
              <p><strong>2.</strong> Mua số điện thoại Twilio (Phone Numbers)</p>
              <p><strong>3.</strong> Lấy Account SID và Auth Token từ Console</p>
              <p><strong>4.</strong> Nhập thông tin vào form và bật "Kích hoạt SMS"</p>
              <p><strong>5.</strong> Test gửi SMS để kiểm tra</p>
              
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  SMS sẽ được gửi tự động khi có cảnh báo Critical chưa được xử lý
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
