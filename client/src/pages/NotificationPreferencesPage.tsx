/**
 * Notification Preferences Page
 * Trang cấu hình notification preferences cho user
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function NotificationPreferencesPage() {
  // Form state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailAddress, setEmailAddress] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'warning_up' | 'critical_only'>('warning_up');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');

  // Fetch current preferences
  const { data: preferences, isLoading, refetch } = trpc.notificationPreferences.getMyPreferences.useQuery();

  // Update mutation
  const updateMutation = trpc.notificationPreferences.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success('Đã lưu cấu hình thông báo');
      refetch();
    },
    onError: (error) => {
      toast.error('Lỗi khi lưu cấu hình', {
        description: error.message,
      });
    },
  });

  // Reset mutation
  const resetMutation = trpc.notificationPreferences.resetToDefaults.useMutation({
    onSuccess: () => {
      toast.success('Đã khôi phục cấu hình mặc định');
      refetch();
    },
    onError: (error) => {
      toast.error('Lỗi khi khôi phục', {
        description: error.message,
      });
    },
  });

  // Load preferences into form
  useEffect(() => {
    if (preferences) {
      setEmailEnabled(!!preferences.emailEnabled);
      setEmailAddress(preferences.emailAddress || '');
      setTelegramEnabled(!!preferences.telegramEnabled);
      setTelegramChatId(preferences.telegramChatId || '');
      setPushEnabled(!!preferences.pushEnabled);
      setSeverityFilter((preferences.severityFilter as 'all' | 'warning_up' | 'critical_only') || 'warning_up');
      setQuietHoursEnabled(!!preferences.quietHoursEnabled);
      setQuietHoursStart(preferences.quietHoursStart || '22:00');
      setQuietHoursEnd(preferences.quietHoursEnd || '07:00');
    }
  }, [preferences]);

  // Handle save
  const handleSave = () => {
    updateMutation.mutate({
      emailEnabled,
      emailAddress: emailAddress || null,
      telegramEnabled,
      telegramChatId: telegramChatId || null,
      pushEnabled,
      severityFilter,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
    });
  };

  // Handle reset
  const handleReset = () => {
    resetMutation.mutate();
  };

  // Severity filter descriptions
  const severityDescriptions = {
    all: 'Nhận tất cả thông báo (Info, Warning, Error, Critical)',
    warning_up: 'Chỉ nhận Warning, Error và Critical',
    critical_only: 'Chỉ nhận Error và Critical',
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Cấu hình Thông báo</h1>
            <p className="text-muted-foreground">Quản lý cách nhận thông báo từ hệ thống</p>
          </div>
          <div className="grid gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-72" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Cấu hình Thông báo
            </h1>
            <p className="text-muted-foreground">
              Quản lý cách nhận thông báo từ hệ thống IoT và SPC
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={resetMutation.isPending}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Khôi phục mặc định
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </div>

        {/* Notification Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Kênh thông báo
            </CardTitle>
            <CardDescription>
              Chọn các kênh bạn muốn nhận thông báo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email */}
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <Label className="text-base font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Nhận thông báo qua email
                  </p>
                  {emailEnabled && (
                    <div className="mt-2">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
              <Switch
                checked={emailEnabled}
                onCheckedChange={setEmailEnabled}
              />
            </div>

            {/* Telegram */}
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-sky-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-sky-600" />
                </div>
                <div className="space-y-1">
                  <Label className="text-base font-medium">Telegram</Label>
                  <p className="text-sm text-muted-foreground">
                    Nhận thông báo qua Telegram
                  </p>
                  {telegramEnabled && (
                    <div className="mt-2">
                      <Input
                        type="text"
                        placeholder="Chat ID"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        className="max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Liên hệ admin để lấy Chat ID
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Switch
                checked={telegramEnabled}
                onCheckedChange={setTelegramEnabled}
              />
            </div>

            {/* Push Notifications */}
            <div className="flex items-start justify-between p-4 border rounded-lg">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Bell className="h-5 w-5 text-purple-600" />
                </div>
                <div className="space-y-1">
                  <Label className="text-base font-medium">Push Notification</Label>
                  <p className="text-sm text-muted-foreground">
                    Nhận thông báo trong ứng dụng
                  </p>
                </div>
              </div>
              <Switch
                checked={pushEnabled}
                onCheckedChange={setPushEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Severity Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Bộ lọc mức độ
            </CardTitle>
            <CardDescription>
              Chọn mức độ thông báo bạn muốn nhận
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mức độ thông báo</Label>
              <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}>
                <SelectTrigger className="max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      Tất cả
                    </div>
                  </SelectItem>
                  <SelectItem value="warning_up">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Warning trở lên
                    </div>
                  </SelectItem>
                  <SelectItem value="critical_only">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Chỉ Critical/Error
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {severityDescriptions[severityFilter]}
              </p>
            </div>

            {/* Severity level explanation */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-blue-700">Info</span>
                </div>
                <p className="text-xs text-blue-600">Thông tin chung</p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-yellow-700">Warning</span>
                </div>
                <p className="text-xs text-yellow-600">Cảnh báo nhẹ</p>
              </div>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-orange-700">Error</span>
                </div>
                <p className="text-xs text-orange-600">Lỗi cần xử lý</p>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-700">Critical</span>
                </div>
                <p className="text-xs text-red-600">Nghiêm trọng</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Giờ yên tĩnh
            </CardTitle>
            <CardDescription>
              Tắt thông báo trong khoảng thời gian nhất định
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">Bật giờ yên tĩnh</Label>
                <p className="text-sm text-muted-foreground">
                  Không nhận thông báo trong khoảng thời gian đã cấu hình
                </p>
              </div>
              <Switch
                checked={quietHoursEnabled}
                onCheckedChange={setQuietHoursEnabled}
              />
            </div>

            {quietHoursEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label>Bắt đầu</Label>
                  <Input
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kết thúc</Label>
                  <Input
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                  />
                </div>
                <div className="col-span-full">
                  <p className="text-sm text-muted-foreground">
                    Thông báo sẽ bị tạm dừng từ {quietHoursStart} đến {quietHoursEnd}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Trạng thái hiện tại
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className={`h-4 w-4 ${emailEnabled ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="font-medium">Email</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {emailEnabled ? (emailAddress || 'Chưa cấu hình địa chỉ') : 'Đã tắt'}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className={`h-4 w-4 ${telegramEnabled ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="font-medium">Telegram</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {telegramEnabled ? (telegramChatId || 'Chưa cấu hình Chat ID') : 'Đã tắt'}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className={`h-4 w-4 ${pushEnabled ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="font-medium">Push</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {pushEnabled ? 'Đã bật' : 'Đã tắt'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
