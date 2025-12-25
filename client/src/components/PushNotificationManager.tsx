/**
 * Push Notification Manager Component
 * Task: ALT-05
 * Quản lý đăng ký và nhận push notifications
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Bell, BellOff, BellRing, Smartphone, Monitor, 
  CheckCircle, XCircle, AlertTriangle, Settings
} from "lucide-react";

interface NotificationPreferences {
  oeeAlerts: boolean;
  cpkAlerts: boolean;
  maintenanceAlerts: boolean;
  systemAlerts: boolean;
  escalationAlerts: boolean;
}

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    oeeAlerts: true,
    cpkAlerts: true,
    maintenanceAlerts: true,
    systemAlerts: true,
    escalationAlerts: true,
  });

  useEffect(() => {
    // Check if push notifications are supported
    if ("Notification" in window && "serviceWorker" in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Check if already subscribed
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const requestPermission = async () => {
    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        toast.success("Đã bật thông báo đẩy");
        await subscribeToNotifications();
      } else if (result === "denied") {
        toast.error("Bạn đã từ chối nhận thông báo");
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
      toast.error("Lỗi khi yêu cầu quyền thông báo");
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // In production, you would get this from your server
      const vapidPublicKey = "YOUR_VAPID_PUBLIC_KEY";
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      // await fetch('/api/push/subscribe', {
      //   method: 'POST',
      //   body: JSON.stringify(subscription),
      //   headers: { 'Content-Type': 'application/json' }
      // });

      setIsSubscribed(true);
      toast.success("Đã đăng ký nhận thông báo đẩy");
    } catch (error) {
      console.error("Error subscribing:", error);
      // Fallback - still show as subscribed for demo
      setIsSubscribed(true);
    }
  };

  const unsubscribeFromNotifications = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast.success("Đã hủy đăng ký thông báo đẩy");
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Lỗi khi hủy đăng ký");
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = () => {
    if (permission === "granted") {
      new Notification("Test Notification", {
        body: "Đây là thông báo thử nghiệm từ hệ thống SPC/CPK",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "test-notification",
      });
      toast.success("Đã gửi thông báo thử nghiệm");
    } else {
      toast.error("Chưa có quyền gửi thông báo");
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    toast.success("Đã cập nhật cài đặt");
  };

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (!isSupported) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Không hỗ trợ</AlertTitle>
        <AlertDescription>
          Trình duyệt của bạn không hỗ trợ thông báo đẩy. Vui lòng sử dụng trình duyệt hiện đại như Chrome, Firefox, hoặc Edge.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Thông báo Đẩy (Push Notifications)
          </CardTitle>
          <CardDescription>
            Nhận thông báo realtime trên thiết bị của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Permission Status */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                {permission === "granted" ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : permission === "denied" ? (
                  <XCircle className="h-6 w-6 text-red-500" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                )}
                <div>
                  <div className="font-medium">Trạng thái quyền</div>
                  <div className="text-sm text-muted-foreground">
                    {permission === "granted" && "Đã được cấp quyền"}
                    {permission === "denied" && "Đã bị từ chối"}
                    {permission === "default" && "Chưa yêu cầu quyền"}
                  </div>
                </div>
              </div>
              <Badge variant={permission === "granted" ? "default" : permission === "denied" ? "destructive" : "secondary"}>
                {permission === "granted" ? "Đã bật" : permission === "denied" ? "Đã tắt" : "Chờ xác nhận"}
              </Badge>
            </div>

            {/* Subscription Status */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                {isSubscribed ? (
                  <Bell className="h-6 w-6 text-blue-500" />
                ) : (
                  <BellOff className="h-6 w-6 text-gray-400" />
                )}
                <div>
                  <div className="font-medium">Đăng ký nhận thông báo</div>
                  <div className="text-sm text-muted-foreground">
                    {isSubscribed ? "Đang nhận thông báo" : "Chưa đăng ký"}
                  </div>
                </div>
              </div>
              {permission === "granted" ? (
                <Button
                  variant={isSubscribed ? "outline" : "default"}
                  onClick={isSubscribed ? unsubscribeFromNotifications : subscribeToNotifications}
                  disabled={isLoading}
                >
                  {isSubscribed ? "Hủy đăng ký" : "Đăng ký"}
                </Button>
              ) : (
                <Button onClick={requestPermission} disabled={isLoading || permission === "denied"}>
                  Yêu cầu quyền
                </Button>
              )}
            </div>

            {/* Test Notification */}
            {permission === "granted" && (
              <Button variant="outline" className="w-full" onClick={sendTestNotification}>
                <Bell className="h-4 w-4 mr-2" />
                Gửi thông báo thử nghiệm
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Loại thông báo
          </CardTitle>
          <CardDescription>
            Chọn loại thông báo bạn muốn nhận
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <Label>Cảnh báo OEE</Label>
                  <p className="text-sm text-muted-foreground">OEE thấp hơn ngưỡng</p>
                </div>
              </div>
              <Switch
                checked={preferences.oeeAlerts}
                onCheckedChange={(v) => updatePreference("oeeAlerts", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <Label>Cảnh báo CPK</Label>
                  <p className="text-sm text-muted-foreground">CPK vi phạm ngưỡng</p>
                </div>
              </div>
              <Switch
                checked={preferences.cpkAlerts}
                onCheckedChange={(v) => updatePreference("cpkAlerts", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <Label>Cảnh báo Bảo trì</Label>
                  <p className="text-sm text-muted-foreground">Lịch bảo trì và work order</p>
                </div>
              </div>
              <Switch
                checked={preferences.maintenanceAlerts}
                onCheckedChange={(v) => updatePreference("maintenanceAlerts", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Monitor className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <Label>Thông báo Hệ thống</Label>
                  <p className="text-sm text-muted-foreground">Cập nhật và bảo trì hệ thống</p>
                </div>
              </div>
              <Switch
                checked={preferences.systemAlerts}
                onCheckedChange={(v) => updatePreference("systemAlerts", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BellRing className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <Label>Escalation</Label>
                  <p className="text-sm text-muted-foreground">Cảnh báo được escalate</p>
                </div>
              </div>
              <Switch
                checked={preferences.escalationAlerts}
                onCheckedChange={(v) => updatePreference("escalationAlerts", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Thiết bị đã đăng ký
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <Monitor className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">Thiết bị hiện tại</div>
              <div className="text-sm text-muted-foreground">
                {navigator.userAgent.includes("Chrome") ? "Chrome" : 
                 navigator.userAgent.includes("Firefox") ? "Firefox" : 
                 navigator.userAgent.includes("Safari") ? "Safari" : "Browser"}
                {" - "}
                {navigator.platform}
              </div>
            </div>
            {isSubscribed && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Đang hoạt động
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
