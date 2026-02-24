import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bell,
  MessageSquare,
  Mail,
  Smartphone,
  Settings,
  Save,
  TestTube,
  RefreshCw,
  Clock,
  Shield,
} from "lucide-react";

export default function WorkOrderNotificationConfig() {
  const [activeTab, setActiveTab] = useState("sms");

  // SMS Config State
  const [smsConfig, setSmsConfig] = useState({
    provider: "twilio",
    accountSid: "",
    authToken: "",
    fromNumber: "",
    maxSmsPerDay: 100,
    maxSmsPerHour: 20,
    cooldownMinutes: 5,
    isEnabled: false,
  });

  // Push Config State
  const [pushConfig, setPushConfig] = useState({
    provider: "firebase",
    projectId: "",
    serverKey: "",
    vapidPublicKey: "",
    vapidPrivateKey: "",
    isEnabled: false,
  });

  const utils = trpc.useUtils();

  // Fetch SMS Config
  const { data: smsData, isLoading: smsLoading } = trpc.workOrderNotification.getSmsConfig.useQuery(
    undefined,
    {
      onSuccess: (data) => {
        if (data) {
          setSmsConfig({
            provider: data.provider || "twilio",
            accountSid: data.account_sid || "",
            authToken: data.auth_token || "",
            fromNumber: data.from_number || "",
            maxSmsPerDay: data.max_sms_per_day || 100,
            maxSmsPerHour: data.max_sms_per_hour || 20,
            cooldownMinutes: data.cooldown_minutes || 5,
            isEnabled: Boolean(data.is_enabled),
          });
        }
      },
    }
  );

  // Fetch Push Config
  const { data: pushData, isLoading: pushLoading } = trpc.workOrderNotification.getPushConfig.useQuery(
    undefined,
    {
      onSuccess: (data) => {
        if (data) {
          setPushConfig({
            provider: data.provider || "firebase",
            projectId: data.project_id || "",
            serverKey: data.server_key || "",
            vapidPublicKey: data.vapid_public_key || "",
            vapidPrivateKey: data.vapid_private_key || "",
            isEnabled: Boolean(data.is_enabled),
          });
        }
      },
    }
  );

  // Update SMS Config
  const updateSmsMutation = trpc.workOrderNotification.updateSmsConfig.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu cấu hình SMS");
      utils.workOrderNotification.getSmsConfig.invalidate();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Update Push Config
  const updatePushMutation = trpc.workOrderNotification.updatePushConfig.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu cấu hình Push Notification");
      utils.workOrderNotification.getPushConfig.invalidate();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const handleSaveSmsConfig = () => {
    updateSmsMutation.mutate(smsConfig);
  };

  const handleSavePushConfig = () => {
    updatePushMutation.mutate(pushConfig);
  };

  // Test SMS mutation
  const testSmsMutation = trpc.workOrderNotification.testSms.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`SMS test thành công! Message ID: ${data.messageId}`);
      } else {
        toast.error(`SMS test thất bại: ${data.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Test Push mutation
  const testPushMutation = trpc.workOrderNotification.testPush.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Push test thành công! Message ID: ${data.messageId}`);
      } else {
        toast.error(`Push test thất bại: ${data.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testPushToken, setTestPushToken] = useState("");

  const handleTestSms = () => {
    if (!testPhoneNumber) {
      toast.error("Vui lòng nhập số điện thoại test");
      return;
    }
    if (!smsConfig.accountSid || !smsConfig.authToken) {
      toast.error("Vui lòng cấu hình Account SID và Auth Token trước");
      return;
    }
    testSmsMutation.mutate({ phoneNumber: testPhoneNumber });
  };

  const handleTestPush = () => {
    if (!testPushToken) {
      toast.error("Vui lòng nhập Push Token test");
      return;
    }
    if (!pushConfig.projectId || !pushConfig.serverKey) {
      toast.error("Vui lòng cấu hình Project ID và Server Key trước");
      return;
    }
    testPushMutation.mutate({ token: testPushToken });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Cấu hình Thông báo Work Order
          </h1>
          <p className="text-muted-foreground">
            Thiết lập Push Notification và SMS để thông báo cho kỹ thuật viên khi có work order mới
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              SMS (Twilio)
            </TabsTrigger>
            <TabsTrigger value="push" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Push Notification
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
          </TabsList>

          {/* SMS Tab */}
          <TabsContent value="sms" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cấu hình Twilio SMS</CardTitle>
                    <CardDescription>
                      Thiết lập tài khoản Twilio để gửi SMS thông báo
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Kích hoạt</Label>
                    <Switch
                      checked={smsConfig.isEnabled}
                      onCheckedChange={(checked) =>
                        setSmsConfig((prev) => ({ ...prev, isEnabled: checked }))
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Provider</Label>
                    <Select
                      value={smsConfig.provider}
                      onValueChange={(v) =>
                        setSmsConfig((prev) => ({ ...prev, provider: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="nexmo">Nexmo/Vonage</SelectItem>
                        <SelectItem value="aws_sns">AWS SNS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Số điện thoại gửi</Label>
                    <Input
                      value={smsConfig.fromNumber}
                      onChange={(e) =>
                        setSmsConfig((prev) => ({ ...prev, fromNumber: e.target.value }))
                      }
                      placeholder="+84xxxxxxxxx"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Account SID</Label>
                    <Input
                      value={smsConfig.accountSid}
                      onChange={(e) =>
                        setSmsConfig((prev) => ({ ...prev, accountSid: e.target.value }))
                      }
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <Label>Auth Token</Label>
                    <Input
                      type="password"
                      value={smsConfig.authToken}
                      onChange={(e) =>
                        setSmsConfig((prev) => ({ ...prev, authToken: e.target.value }))
                      }
                      placeholder="••••••••••••••••"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Giới hạn gửi tin
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Tối đa/ngày</Label>
                      <Input
                        type="number"
                        value={smsConfig.maxSmsPerDay}
                        onChange={(e) =>
                          setSmsConfig((prev) => ({
                            ...prev,
                            maxSmsPerDay: parseInt(e.target.value) || 100,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Tối đa/giờ</Label>
                      <Input
                        type="number"
                        value={smsConfig.maxSmsPerHour}
                        onChange={(e) =>
                          setSmsConfig((prev) => ({
                            ...prev,
                            maxSmsPerHour: parseInt(e.target.value) || 20,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Cooldown (phút)</Label>
                      <Input
                        type="number"
                        value={smsConfig.cooldownMinutes}
                        onChange={(e) =>
                          setSmsConfig((prev) => ({
                            ...prev,
                            cooldownMinutes: parseInt(e.target.value) || 5,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <TestTube className="w-4 h-4" />
                    Test SMS
                  </h4>
                  <div className="flex gap-2">
                    <Input
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      placeholder="+84xxxxxxxxx"
                      className="max-w-xs"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleTestSms}
                      disabled={testSmsMutation.isPending}
                    >
                      {testSmsMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4 mr-2" />
                      )}
                      Gửi SMS Test
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    onClick={handleSaveSmsConfig}
                    disabled={updateSmsMutation.isPending}
                  >
                    {updateSmsMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Lưu cấu hình
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SMS Usage Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hướng dẫn cấu hình Twilio</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Đăng ký tài khoản tại <a href="https://www.twilio.com" target="_blank" className="text-primary underline">twilio.com</a></p>
                <p>2. Lấy Account SID và Auth Token từ Console Dashboard</p>
                <p>3. Mua số điện thoại (Phone Number) có khả năng gửi SMS</p>
                <p>4. Nhập thông tin vào form trên và bật kích hoạt</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Push Notification Tab */}
          <TabsContent value="push" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cấu hình Firebase Push Notification</CardTitle>
                    <CardDescription>
                      Thiết lập Firebase Cloud Messaging (FCM) để gửi push notification
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Kích hoạt</Label>
                    <Switch
                      checked={pushConfig.isEnabled}
                      onCheckedChange={(checked) =>
                        setPushConfig((prev) => ({ ...prev, isEnabled: checked }))
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Provider</Label>
                    <Select
                      value={pushConfig.provider}
                      onValueChange={(v) =>
                        setPushConfig((prev) => ({ ...prev, provider: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="firebase">Firebase (FCM)</SelectItem>
                        <SelectItem value="onesignal">OneSignal</SelectItem>
                        <SelectItem value="pusher">Pusher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Project ID</Label>
                    <Input
                      value={pushConfig.projectId}
                      onChange={(e) =>
                        setPushConfig((prev) => ({ ...prev, projectId: e.target.value }))
                      }
                      placeholder="my-project-id"
                    />
                  </div>
                </div>

                <div>
                  <Label>Server Key (Legacy)</Label>
                  <Input
                    type="password"
                    value={pushConfig.serverKey}
                    onChange={(e) =>
                      setPushConfig((prev) => ({ ...prev, serverKey: e.target.value }))
                    }
                    placeholder="AAAA..."
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">VAPID Keys (Web Push)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Public Key</Label>
                      <Input
                        value={pushConfig.vapidPublicKey}
                        onChange={(e) =>
                          setPushConfig((prev) => ({ ...prev, vapidPublicKey: e.target.value }))
                        }
                        placeholder="BPxxxxxxx..."
                      />
                    </div>
                    <div>
                      <Label>Private Key</Label>
                      <Input
                        type="password"
                        value={pushConfig.vapidPrivateKey}
                        onChange={(e) =>
                          setPushConfig((prev) => ({ ...prev, vapidPrivateKey: e.target.value }))
                        }
                        placeholder="••••••••••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <TestTube className="w-4 h-4" />
                    Test Push Notification
                  </h4>
                  <div className="flex gap-2">
                    <Input
                      value={testPushToken}
                      onChange={(e) => setTestPushToken(e.target.value)}
                      placeholder="FCM Device Token"
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleTestPush}
                      disabled={testPushMutation.isPending}
                    >
                      {testPushMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4 mr-2" />
                      )}
                      Gửi Push Test
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Lấy FCM Token từ ứng dụng mobile hoặc web của bạn
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    onClick={handleSavePushConfig}
                    disabled={updatePushMutation.isPending}
                  >
                    {updatePushMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Lưu cấu hình
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Push Usage Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hướng dẫn cấu hình Firebase</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Tạo project tại <a href="https://console.firebase.google.com" target="_blank" className="text-primary underline">Firebase Console</a></p>
                <p>2. Vào Project Settings → Cloud Messaging</p>
                <p>3. Lấy Server Key từ tab Cloud Messaging</p>
                <p>4. Tạo VAPID keys cho Web Push (nếu cần)</p>
                <p>5. Nhập thông tin vào form trên và bật kích hoạt</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cấu hình Email Notification</CardTitle>
                <CardDescription>
                  Sử dụng cấu hình SMTP đã thiết lập trong hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <Mail className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email đã được cấu hình</p>
                    <p className="text-sm text-muted-foreground">
                      Hệ thống sử dụng cấu hình SMTP từ trang Cấu hình SMTP để gửi email thông báo work order.
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="/smtp-config">Đi đến cấu hình SMTP</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Notification Types Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Các loại thông báo Work Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg">
                <Badge className="mb-2">new_work_order</Badge>
                <p className="text-sm text-muted-foreground">
                  Khi có work order mới được tạo
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge className="mb-2">assigned</Badge>
                <p className="text-sm text-muted-foreground">
                  Khi work order được gán cho kỹ thuật viên
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge className="mb-2">status_change</Badge>
                <p className="text-sm text-muted-foreground">
                  Khi trạng thái work order thay đổi
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="secondary" className="mb-2">due_soon</Badge>
                <p className="text-sm text-muted-foreground">
                  Khi work order sắp đến hạn
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="destructive" className="mb-2">overdue</Badge>
                <p className="text-sm text-muted-foreground">
                  Khi work order quá hạn
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Badge variant="outline" className="mb-2">escalation</Badge>
                <p className="text-sm text-muted-foreground">
                  Khi work order được leo thang
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
