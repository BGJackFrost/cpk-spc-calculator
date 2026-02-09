import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Bell, BellOff, Mail, MessageSquare, Smartphone, Settings, 
  Clock, CheckCircle, AlertTriangle, Volume2, VolumeX, Globe,
  Send, RefreshCw, Filter, Trash2, Eye, EyeOff
} from "lucide-react";

// Types
interface NotificationChannel {
  id: string;
  name: string;
  type: "email" | "sms" | "push" | "in_app" | "telegram" | "slack";
  enabled: boolean;
  config: Record<string, any>;
}

interface NotificationPreference {
  id: string;
  category: string;
  description: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
}

interface NotificationHistory {
  id: number;
  type: string;
  channel: string;
  title: string;
  message: string;
  status: "sent" | "failed" | "pending";
  sentAt: Date;
  readAt?: Date;
}

// Demo data
// Mock data removed - demoChannels (data comes from tRPC or is not yet implemented)

// Mock data removed - demoPreferences (data comes from tRPC or is not yet implemented)

// Mock data removed - demoHistory (data comes from tRPC or is not yet implemented)

export default function NotificationUnified() {
  const [activeTab, setActiveTab] = useState("preferences");
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Global settings
  const [globalSettings, setGlobalSettings] = useState({
    enabled: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    soundEnabled: true,
    desktopNotifications: true,
    digestMode: false,
    digestFrequency: "daily",
  });

  // Handlers
  const toggleChannel = (channelId: string) => {
    setChannels(channels.map(c => {
      if (c.id === channelId) {
        const enabled = !c.enabled;
        toast.success(enabled ? `Đã bật kênh ${c.name}` : `Đã tắt kênh ${c.name}`);
        return { ...c, enabled };
      }
      return c;
    }));
  };

  const updatePreference = (prefId: string, field: keyof NotificationPreference, value: boolean) => {
    setPreferences(preferences.map(p => {
      if (p.id === prefId) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const markAsRead = (notificationId: number) => {
    setHistory(history.map(h => {
      if (h.id === notificationId) {
        return { ...h, readAt: new Date() };
      }
      return h;
    }));
    toast.success("Đã đánh dấu đã đọc");
  };

  const deleteNotification = (notificationId: number) => {
    setHistory(history.filter(h => h.id !== notificationId));
    toast.success("Đã xóa thông báo");
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />;
      case "sms": return <Smartphone className="h-4 w-4" />;
      case "push": return <Bell className="h-4 w-4" />;
      case "in_app": return <MessageSquare className="h-4 w-4" />;
      case "telegram": return <Send className="h-4 w-4" />;
      case "slack": return <Globe className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: NotificationHistory["status"]) => {
    switch (status) {
      case "sent": return <Badge className="bg-green-500">Đã gửi</Badge>;
      case "failed": return <Badge variant="destructive">Thất bại</Badge>;
      case "pending": return <Badge variant="secondary">Đang chờ</Badge>;
    }
  };

  const filteredHistory = history.filter(h => {
    if (filterChannel !== "all" && h.channel !== filterChannel) return false;
    if (filterStatus !== "all" && h.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: history.length,
    sent: history.filter(h => h.status === "sent").length,
    failed: history.filter(h => h.status === "failed").length,
    unread: history.filter(h => !h.readAt).length,
    enabledChannels: channels.filter(c => c.enabled).length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Cài đặt Thông báo</h1>
            <p className="text-muted-foreground">
              Quản lý kênh thông báo và tùy chỉnh preferences
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <Label>Thông báo</Label>
              <Switch 
                checked={globalSettings.enabled}
                onCheckedChange={(checked) => {
                  setGlobalSettings({...globalSettings, enabled: checked});
                  toast.success(checked ? "Đã bật thông báo" : "Đã tắt tất cả thông báo");
                }}
              />
            </div>
            <Button variant="outline" onClick={() => toast.info("Đang làm mới...")}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tổng thông báo</span>
              </div>
              <div className="text-2xl font-bold mt-1">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Đã gửi</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-green-600">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Thất bại</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Chưa đọc</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-blue-600">{stats.unread}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Kênh hoạt động</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-purple-600">{stats.enabledChannels}/{channels.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preferences">
              <Settings className="h-4 w-4 mr-2" />
              Tùy chỉnh
            </TabsTrigger>
            <TabsTrigger value="channels">
              <Globe className="h-4 w-4 mr-2" />
              Kênh thông báo
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="h-4 w-4 mr-2" />
              Lịch sử
              {stats.unread > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.unread}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Bell className="h-4 w-4 mr-2" />
              Cài đặt chung
            </TabsTrigger>
          </TabsList>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tùy chỉnh thông báo theo danh mục</CardTitle>
                <CardDescription>Chọn kênh nhận thông báo cho từng loại sự kiện</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Danh mục</th>
                        <th className="text-center py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <Mail className="h-4 w-4" /> Email
                          </div>
                        </th>
                        <th className="text-center py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <Smartphone className="h-4 w-4" /> SMS
                          </div>
                        </th>
                        <th className="text-center py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <Bell className="h-4 w-4" /> Push
                          </div>
                        </th>
                        <th className="text-center py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <MessageSquare className="h-4 w-4" /> In-App
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preferences.map((pref) => (
                        <tr key={pref.id} className="border-b">
                          <td className="py-3 px-2">
                            <div>
                              <div className="font-medium">{pref.category}</div>
                              <div className="text-sm text-muted-foreground">{pref.description}</div>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2">
                            <Checkbox 
                              checked={pref.email}
                              onCheckedChange={(checked) => updatePreference(pref.id, "email", !!checked)}
                            />
                          </td>
                          <td className="text-center py-3 px-2">
                            <Checkbox 
                              checked={pref.sms}
                              onCheckedChange={(checked) => updatePreference(pref.id, "sms", !!checked)}
                            />
                          </td>
                          <td className="text-center py-3 px-2">
                            <Checkbox 
                              checked={pref.push}
                              onCheckedChange={(checked) => updatePreference(pref.id, "push", !!checked)}
                            />
                          </td>
                          <td className="text-center py-3 px-2">
                            <Checkbox 
                              checked={pref.inApp}
                              onCheckedChange={(checked) => updatePreference(pref.id, "inApp", !!checked)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={() => toast.success("Đã lưu tùy chỉnh")}>
                    Lưu thay đổi
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Channels Tab */}
          <TabsContent value="channels" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((channel) => (
                <Card key={channel.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(channel.type)}
                        <CardTitle className="text-lg">{channel.name}</CardTitle>
                      </div>
                      <Switch 
                        checked={channel.enabled}
                        onCheckedChange={() => toggleChannel(channel.id)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={channel.enabled ? "default" : "secondary"}>
                      {channel.enabled ? "Đang hoạt động" : "Đã tắt"}
                    </Badge>
                    {channel.enabled && (
                      <Button variant="link" className="p-0 h-auto mt-2" onClick={() => toast.info("Mở cài đặt chi tiết...")}>
                        Cấu hình chi tiết →
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Channel Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Cấu hình kênh Email</CardTitle>
                <CardDescription>Thiết lập SMTP server để gửi email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input placeholder="smtp.company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input type="number" placeholder="587" />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input placeholder="noreply@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => toast.info("Đang gửi email test...")}>
                    Gửi email test
                  </Button>
                  <Button onClick={() => toast.success("Đã lưu cấu hình")}>
                    Lưu cấu hình
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Select value={filterChannel} onValueChange={setFilterChannel}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Lọc kênh" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả kênh</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="in_app">In-App</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Lọc trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="sent">Đã gửi</SelectItem>
                    <SelectItem value="failed">Thất bại</SelectItem>
                    <SelectItem value="pending">Đang chờ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => {
                setHistory(history.map(h => ({ ...h, readAt: new Date() })));
                toast.success("Đã đánh dấu tất cả đã đọc");
              }}>
                Đánh dấu tất cả đã đọc
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {filteredHistory.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`flex items-start gap-4 p-4 rounded-lg border ${!notification.readAt ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
                    >
                      <div className="flex-shrink-0">
                        {getChannelIcon(notification.channel)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{notification.title}</span>
                          {getStatusBadge(notification.status)}
                          {!notification.readAt && <Badge variant="outline" className="text-blue-600">Mới</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{notification.type}</span>
                          <span>•</span>
                          <span>{new Date(notification.sentAt).toLocaleString("vi-VN")}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!notification.readAt && (
                          <Button size="sm" variant="ghost" onClick={() => markAsRead(notification.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => deleteNotification(notification.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredHistory.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Không có thông báo nào
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cài đặt chung</CardTitle>
                  <CardDescription>Tùy chỉnh cách nhận thông báo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      <Label>Âm thanh thông báo</Label>
                    </div>
                    <Switch 
                      checked={globalSettings.soundEnabled}
                      onCheckedChange={(checked) => setGlobalSettings({...globalSettings, soundEnabled: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <Label>Desktop Notifications</Label>
                    </div>
                    <Switch 
                      checked={globalSettings.desktopNotifications}
                      onCheckedChange={(checked) => setGlobalSettings({...globalSettings, desktopNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <Label>Chế độ tổng hợp (Digest)</Label>
                    </div>
                    <Switch 
                      checked={globalSettings.digestMode}
                      onCheckedChange={(checked) => setGlobalSettings({...globalSettings, digestMode: checked})}
                    />
                  </div>

                  {globalSettings.digestMode && (
                    <div className="space-y-2 pl-6">
                      <Label>Tần suất gửi tổng hợp</Label>
                      <Select 
                        value={globalSettings.digestFrequency}
                        onValueChange={(value) => setGlobalSettings({...globalSettings, digestFrequency: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Mỗi giờ</SelectItem>
                          <SelectItem value="daily">Mỗi ngày</SelectItem>
                          <SelectItem value="weekly">Mỗi tuần</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Giờ yên tĩnh (Do Not Disturb)</CardTitle>
                  <CardDescription>Tạm dừng thông báo trong khoảng thời gian nhất định</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellOff className="h-4 w-4" />
                      <Label>Bật giờ yên tĩnh</Label>
                    </div>
                    <Switch 
                      checked={globalSettings.quietHoursEnabled}
                      onCheckedChange={(checked) => setGlobalSettings({...globalSettings, quietHoursEnabled: checked})}
                    />
                  </div>

                  {globalSettings.quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bắt đầu</Label>
                        <Input 
                          type="time" 
                          value={globalSettings.quietHoursStart}
                          onChange={(e) => setGlobalSettings({...globalSettings, quietHoursStart: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kết thúc</Label>
                        <Input 
                          type="time" 
                          value={globalSettings.quietHoursEnd}
                          onChange={(e) => setGlobalSettings({...globalSettings, quietHoursEnd: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Trong giờ yên tĩnh, chỉ các thông báo nghiêm trọng (Critical) mới được gửi.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => toast.success("Đã lưu cài đặt")}>
                Lưu tất cả cài đặt
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
