/**
 * Notification Channels Settings Page
 * Cấu hình kênh thông báo: Email, Telegram cho cảnh báo nghiêm trọng
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, MessageCircle, Bell, Save, TestTube, 
  AlertTriangle, CheckCircle2, Settings2, Shield
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NotificationChannelsSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Fetch current preferences
  const { data: preferences, isLoading } = trpc.notificationPreferences.get.useQuery();

  // Local state for form
  const [emailEnabled, setEmailEnabled] = useState(preferences?.emailEnabled ?? true);
  const [emailAddress, setEmailAddress] = useState(preferences?.emailAddress ?? user?.email ?? "");
  const [telegramEnabled, setTelegramEnabled] = useState(preferences?.telegramEnabled ?? false);
  const [telegramChatId, setTelegramChatId] = useState(preferences?.telegramChatId ?? "");
  const [pushEnabled, setPushEnabled] = useState(preferences?.pushEnabled ?? true);
  const [severityFilter, setSeverityFilter] = useState<string>(preferences?.severityFilter ?? "warning_up");
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(preferences?.quietHoursEnabled ?? false);
  const [quietHoursStart, setQuietHoursStart] = useState(preferences?.quietHoursStart ?? "22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState(preferences?.quietHoursEnd ?? "07:00");

  // Update state when data loads
  useState(() => {
    if (preferences) {
      setEmailEnabled(preferences.emailEnabled === 1);
      setEmailAddress(preferences.emailAddress || user?.email || "");
      setTelegramEnabled(preferences.telegramEnabled === 1);
      setTelegramChatId(preferences.telegramChatId || "");
      setPushEnabled(preferences.pushEnabled === 1);
      setSeverityFilter(preferences.severityFilter || "warning_up");
      setQuietHoursEnabled(preferences.quietHoursEnabled === 1);
      setQuietHoursStart(preferences.quietHoursStart || "22:00");
      setQuietHoursEnd(preferences.quietHoursEnd || "07:00");
    }
  });

  // Save mutation
  const saveMutation = trpc.notificationPreferences.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Đã lưu cấu hình",
        description: "Cấu hình kênh thông báo đã được cập nhật thành công.",
      });
      utils.notificationPreferences.get.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể lưu cấu hình. Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  // Test email mutation
  const testEmailMutation = trpc.notification.testNotification.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Gửi email test thành công",
          description: "Vui lòng kiểm tra hộp thư của bạn.",
        });
      } else {
        toast({
          title: "Gửi email thất bại",
          description: "Kiểm tra lại cấu hình SMTP.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      emailEnabled: emailEnabled ? 1 : 0,
      emailAddress,
      telegramEnabled: telegramEnabled ? 1 : 0,
      telegramChatId,
      pushEnabled: pushEnabled ? 1 : 0,
      severityFilter: severityFilter as "all" | "warning_up" | "critical_only",
      quietHoursEnabled: quietHoursEnabled ? 1 : 0,
      quietHoursStart,
      quietHoursEnd,
    });
  };

  const handleTestEmail = () => {
    testEmailMutation.mutate({
      channelType: "email",
      config: { email: emailAddress },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Cấu hình Kênh Thông báo
        </h1>
        <p className="text-muted-foreground mt-1">
          Thiết lập cách nhận thông báo khi có cảnh báo nghiêm trọng từ hệ thống SPC/CPK
        </p>
      </div>

      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Kênh thông báo
          </TabsTrigger>
          <TabsTrigger value="filters" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Bộ lọc & Quy tắc
          </TabsTrigger>
        </TabsList>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          {/* Email Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Email</CardTitle>
                    <CardDescription>Nhận thông báo qua email</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                />
              </div>
            </CardHeader>
            {emailEnabled && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Địa chỉ email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleTestEmail}
                      disabled={!emailAddress || testEmailMutation.isPending}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      Test
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email này sẽ nhận các cảnh báo nghiêm trọng từ hệ thống
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Telegram Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Telegram</CardTitle>
                    <CardDescription>Nhận thông báo qua Telegram Bot</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={telegramEnabled}
                  onCheckedChange={setTelegramEnabled}
                />
              </div>
            </CardHeader>
            {telegramEnabled && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="telegramChatId">Chat ID</Label>
                  <Input
                    id="telegramChatId"
                    placeholder="123456789"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Để lấy Chat ID, gửi tin nhắn đến bot và sử dụng /start để nhận ID
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">Hướng dẫn kết nối Telegram:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Tìm bot @CPK_SPC_AlertBot trên Telegram</li>
                    <li>Gửi lệnh /start để bắt đầu</li>
                    <li>Bot sẽ gửi lại Chat ID của bạn</li>
                    <li>Nhập Chat ID vào ô trên và lưu cấu hình</li>
                  </ol>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Push Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Push Notification</CardTitle>
                    <CardDescription>Thông báo realtime trong ứng dụng</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={pushEnabled}
                  onCheckedChange={setPushEnabled}
                />
              </div>
            </CardHeader>
            {pushEnabled && (
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Push notification đang hoạt động. Bạn sẽ nhận thông báo ngay trong ứng dụng.
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Filters Tab */}
        <TabsContent value="filters" className="space-y-4">
          {/* Severity Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Mức độ cảnh báo
              </CardTitle>
              <CardDescription>
                Chọn loại cảnh báo bạn muốn nhận
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nhận thông báo khi</Label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Tất cả</Badge>
                        <span>Nhận tất cả thông báo</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="warning_up">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-500">Cảnh báo+</Badge>
                        <span>Cảnh báo và nghiêm trọng</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="critical_only">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Nghiêm trọng</Badge>
                        <span>Chỉ cảnh báo nghiêm trọng</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-medium">Thông tin</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Báo cáo định kỳ, cập nhật hệ thống
                  </p>
                </div>
                <div className="p-4 border rounded-lg border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="font-medium">Cảnh báo</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    CPK &lt; 1.33, vi phạm SPC rules
                  </p>
                </div>
                <div className="p-4 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="font-medium">Nghiêm trọng</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    CPK &lt; 1.0, lỗi hệ thống
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Giờ yên tĩnh</CardTitle>
                  <CardDescription>
                    Tạm dừng thông báo trong khoảng thời gian nhất định
                  </CardDescription>
                </div>
                <Switch
                  checked={quietHoursEnabled}
                  onCheckedChange={setQuietHoursEnabled}
                />
              </div>
            </CardHeader>
            {quietHoursEnabled && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quietStart">Bắt đầu</Label>
                    <Input
                      id="quietStart"
                      type="time"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quietEnd">Kết thúc</Label>
                    <Input
                      id="quietEnd"
                      type="time"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Trong khoảng thời gian này, chỉ có cảnh báo nghiêm trọng (critical) mới được gửi.
                </p>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </div>
    </div>
  );
}
