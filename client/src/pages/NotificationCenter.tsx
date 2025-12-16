import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, MessageSquare, Smartphone, Check, X, Clock, AlertTriangle, Info, CheckCircle, Filter, Search, Trash2, Settings } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Notification {
  id: number;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  channel: "email" | "push" | "sms" | "in_app";
  isRead: boolean;
  createdAt: Date;
}

// Mock notifications for demo
const mockNotifications: Notification[] = [
  {
    id: 1,
    type: "error",
    title: "Cảnh báo OEE thấp",
    message: "Máy CNC-001 có OEE dưới 65% trong 2 giờ qua",
    channel: "in_app",
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 2,
    type: "warning",
    title: "CPK dưới ngưỡng",
    message: "Sản phẩm ABC-123 có CPK = 1.15 (< 1.33)",
    channel: "email",
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 3,
    type: "success",
    title: "Báo cáo ca sáng đã gửi",
    message: "Báo cáo OEE/SPC ca sáng đã được gửi thành công",
    channel: "email",
    isRead: true,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
  {
    id: 4,
    type: "info",
    title: "Lịch bảo trì sắp tới",
    message: "Máy CNC-002 có lịch bảo trì định kỳ vào ngày mai",
    channel: "in_app",
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
];

export default function NotificationCenter() {
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Notification settings
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread" && n.isRead) return false;
    if (filter === "read" && !n.isRead) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !n.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: number) => {
    setNotifications(notifications.map((n) => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    toast.success(language === "vi" ? "Đã đánh dấu tất cả đã đọc" : "All marked as read");
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter((n) => n.id !== id));
    toast.success(language === "vi" ? "Đã xóa thông báo" : "Notification deleted");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "error": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email": return <Mail className="h-3 w-3" />;
      case "push": return <Smartphone className="h-3 w-3" />;
      case "sms": return <MessageSquare className="h-3 w-3" />;
      default: return <Bell className="h-3 w-3" />;
    }
  };

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} ${language === "vi" ? "phút trước" : "min ago"}`;
    if (hours < 24) return `${hours} ${language === "vi" ? "giờ trước" : "hours ago"}`;
    return `${days} ${language === "vi" ? "ngày trước" : "days ago"}`;
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {language === "vi" ? "Trung tâm Thông báo" : "Notification Center"}
            </h1>
            <p className="text-muted-foreground">
              {language === "vi" 
                ? "Quản lý tất cả thông báo và cài đặt kênh thông báo" 
                : "Manage all notifications and channel settings"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} {language === "vi" ? "chưa đọc" : "unread"}</Badge>
            )}
            <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
              <Check className="h-4 w-4 mr-2" />
              {language === "vi" ? "Đánh dấu tất cả đã đọc" : "Mark all read"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="notifications">
          <TabsList>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              {language === "vi" ? "Thông báo" : "Notifications"}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              {language === "vi" ? "Cài đặt" : "Settings"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{language === "vi" ? "Tất cả" : "All"}</SelectItem>
                        <SelectItem value="unread">{language === "vi" ? "Chưa đọc" : "Unread"}</SelectItem>
                        <SelectItem value="read">{language === "vi" ? "Đã đọc" : "Read"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={language === "vi" ? "Loại" : "Type"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === "vi" ? "Tất cả loại" : "All types"}</SelectItem>
                      <SelectItem value="error">{language === "vi" ? "Lỗi" : "Error"}</SelectItem>
                      <SelectItem value="warning">{language === "vi" ? "Cảnh báo" : "Warning"}</SelectItem>
                      <SelectItem value="success">{language === "vi" ? "Thành công" : "Success"}</SelectItem>
                      <SelectItem value="info">{language === "vi" ? "Thông tin" : "Info"}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={language === "vi" ? "Tìm kiếm thông báo..." : "Search notifications..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification List */}
            <div className="space-y-2">
              {filteredNotifications.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{language === "vi" ? "Không có thông báo nào" : "No notifications"}</p>
                  </CardContent>
                </Card>
              ) : (
                filteredNotifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`transition-colors ${!notification.isRead ? "bg-muted/50 border-primary/20" : ""}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">{getTypeIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <Badge variant="secondary" className="text-xs">
                                {language === "vi" ? "Mới" : "New"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(notification.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              {getChannelIcon(notification.channel)}
                              {notification.channel.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.isRead && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => markAsRead(notification.id)}
                              title={language === "vi" ? "Đánh dấu đã đọc" : "Mark as read"}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteNotification(notification.id)}
                            title={language === "vi" ? "Xóa" : "Delete"}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{language === "vi" ? "Kênh thông báo" : "Notification Channels"}</CardTitle>
                <CardDescription>
                  {language === "vi" 
                    ? "Chọn kênh nhận thông báo cho các sự kiện quan trọng" 
                    : "Choose channels for receiving important notifications"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base">Email</Label>
                      <p className="text-sm text-muted-foreground">
                        {language === "vi" ? "Nhận thông báo qua email" : "Receive notifications via email"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base">Push Notification</Label>
                      <p className="text-sm text-muted-foreground">
                        {language === "vi" ? "Nhận thông báo đẩy trên trình duyệt" : "Receive push notifications in browser"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base">SMS</Label>
                      <p className="text-sm text-muted-foreground">
                        {language === "vi" ? "Nhận thông báo qua tin nhắn SMS" : "Receive notifications via SMS"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{language === "vi" ? "Loại thông báo" : "Notification Types"}</CardTitle>
                <CardDescription>
                  {language === "vi" 
                    ? "Cấu hình loại sự kiện nào sẽ gửi thông báo" 
                    : "Configure which events trigger notifications"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {[
                    { key: "oee_alert", label: language === "vi" ? "Cảnh báo OEE thấp" : "Low OEE Alert", desc: language === "vi" ? "Khi OEE dưới ngưỡng cấu hình" : "When OEE falls below threshold" },
                    { key: "cpk_alert", label: language === "vi" ? "Cảnh báo CPK" : "CPK Alert", desc: language === "vi" ? "Khi CPK < 1.33" : "When CPK < 1.33" },
                    { key: "spc_violation", label: language === "vi" ? "Vi phạm SPC Rule" : "SPC Rule Violation", desc: language === "vi" ? "Khi phát hiện vi phạm quy tắc SPC" : "When SPC rule violation detected" },
                    { key: "maintenance", label: language === "vi" ? "Nhắc nhở bảo trì" : "Maintenance Reminder", desc: language === "vi" ? "Trước lịch bảo trì định kỳ" : "Before scheduled maintenance" },
                    { key: "shift_report", label: language === "vi" ? "Báo cáo ca" : "Shift Report", desc: language === "vi" ? "Báo cáo tự động cuối mỗi ca" : "Auto report at end of shift" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <Label>{item.label}</Label>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => toast.success(language === "vi" ? "Đã lưu cài đặt" : "Settings saved")}>
                {language === "vi" ? "Lưu cài đặt" : "Save Settings"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
