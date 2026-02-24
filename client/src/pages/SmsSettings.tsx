import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Phone, Send, CheckCircle, XCircle, Clock, Activity } from "lucide-react";

export default function SmsSettings() {
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = trpc.sms.getConfig.useQuery();
  const { data: stats } = trpc.sms.getStats.useQuery();
  const { data: logs, refetch: refetchLogs } = trpc.sms.getLogs.useQuery({ page: 1, pageSize: 10 });
  
  const saveConfigMutation = trpc.sms.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu cấu hình SMS");
      refetchConfig();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const testSmsMutation = trpc.sms.testSms.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Đã gửi SMS test thành công!");
        refetchLogs();
      } else {
        toast.error(`Lỗi gửi SMS: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const [formData, setFormData] = useState({
    provider: "twilio" as "twilio" | "vonage" | "custom",
    enabled: false,
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioFromNumber: "",
    vonageApiKey: "",
    vonageApiSecret: "",
    vonageFromNumber: "",
    customWebhookUrl: "",
    customWebhookMethod: "POST" as "POST" | "GET",
    customWebhookHeaders: "",
    customWebhookBodyTemplate: "",
  });
  
  useEffect(() => {
    if (config) {
      setFormData({
        provider: config.provider,
        enabled: config.enabled,
        twilioAccountSid: config.twilioAccountSid,
        twilioAuthToken: config.twilioAuthToken,
        twilioFromNumber: config.twilioFromNumber,
        vonageApiKey: config.vonageApiKey,
        vonageApiSecret: config.vonageApiSecret,
        vonageFromNumber: config.vonageFromNumber,
        customWebhookUrl: config.customWebhookUrl,
        customWebhookMethod: config.customWebhookMethod,
        customWebhookHeaders: config.customWebhookHeaders,
        customWebhookBodyTemplate: config.customWebhookBodyTemplate,
      });
    }
  }, [config]);
  
  const handleSave = () => {
    saveConfigMutation.mutate(formData);
  };
  
  const handleTestSms = () => {
    if (!testPhone) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }
    testSmsMutation.mutate({ phoneNumber: testPhone, message: testMessage || undefined });
  };
  
  if (configLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cấu hình SMS Notification</h1>
            <p className="text-muted-foreground">Cấu hình gửi SMS cho escalation alerts</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
            <span className="text-sm">{formData.enabled ? "Đang bật" : "Đang tắt"}</span>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng SMS</p>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã gửi</p>
                  <p className="text-2xl font-bold">{stats?.sent || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Thất bại</p>
                  <p className="text-2xl font-bold">{stats?.failed || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hôm nay</p>
                  <p className="text-2xl font-bold">{stats?.today || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Cấu hình Provider</CardTitle>
                <CardDescription>Chọn và cấu hình nhà cung cấp SMS</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={formData.provider} onValueChange={(v) => setFormData({ ...formData, provider: v as any })}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="twilio">Twilio</TabsTrigger>
                    <TabsTrigger value="vonage">Vonage</TabsTrigger>
                    <TabsTrigger value="custom">Custom Webhook</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="twilio" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Account SID</Label>
                      <Input
                        value={formData.twilioAccountSid}
                        onChange={(e) => setFormData({ ...formData, twilioAccountSid: e.target.value })}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Auth Token</Label>
                      <Input
                        type="password"
                        value={formData.twilioAuthToken}
                        onChange={(e) => setFormData({ ...formData, twilioAuthToken: e.target.value })}
                        placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>From Number</Label>
                      <Input
                        value={formData.twilioFromNumber}
                        onChange={(e) => setFormData({ ...formData, twilioFromNumber: e.target.value })}
                        placeholder="+1234567890"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="vonage" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input
                        value={formData.vonageApiKey}
                        onChange={(e) => setFormData({ ...formData, vonageApiKey: e.target.value })}
                        placeholder="xxxxxxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API Secret</Label>
                      <Input
                        type="password"
                        value={formData.vonageApiSecret}
                        onChange={(e) => setFormData({ ...formData, vonageApiSecret: e.target.value })}
                        placeholder="xxxxxxxxxxxxxxxx"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>From Number</Label>
                      <Input
                        value={formData.vonageFromNumber}
                        onChange={(e) => setFormData({ ...formData, vonageFromNumber: e.target.value })}
                        placeholder="+1234567890"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="custom" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input
                        value={formData.customWebhookUrl}
                        onChange={(e) => setFormData({ ...formData, customWebhookUrl: e.target.value })}
                        placeholder="https://your-sms-gateway.com/send"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Method</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={formData.customWebhookMethod}
                        onChange={(e) => setFormData({ ...formData, customWebhookMethod: e.target.value as any })}
                      >
                        <option value="POST">POST</option>
                        <option value="GET">GET</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Headers (JSON)</Label>
                      <Textarea
                        value={formData.customWebhookHeaders}
                        onChange={(e) => setFormData({ ...formData, customWebhookHeaders: e.target.value })}
                        placeholder='{"Authorization": "Bearer xxx"}'
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Body Template</Label>
                      <Textarea
                        value={formData.customWebhookBodyTemplate}
                        onChange={(e) => setFormData({ ...formData, customWebhookBodyTemplate: e.target.value })}
                        placeholder='{"to": "{{to}}", "message": "{{message}}"}'
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Sử dụng {"{{to}}"}, {"{{message}}"}, {"{{timestamp}}"} làm placeholder
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="mt-6">
                  <Button onClick={handleSave} disabled={saveConfigMutation.isPending}>
                    {saveConfigMutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Test SMS */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Test SMS
                </CardTitle>
                <CardDescription>Gửi SMS test để kiểm tra cấu hình</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+84912345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nội dung (tùy chọn)</Label>
                  <Textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Để trống để sử dụng tin nhắn mặc định"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleTestSms}
                  disabled={testSmsMutation.isPending || !formData.enabled}
                  className="w-full"
                >
                  {testSmsMutation.isPending ? "Đang gửi..." : "Gửi SMS Test"}
                </Button>
                {!formData.enabled && (
                  <p className="text-xs text-muted-foreground text-center">
                    Bật SMS để có thể gửi test
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Recent Logs */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Lịch sử gần đây
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logs?.logs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{log.toNumber}</span>
                      </div>
                      <Badge variant={log.status === "sent" ? "default" : "destructive"}>
                        {log.status}
                      </Badge>
                    </div>
                  ))}
                  {(!logs?.logs || logs.logs.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Chưa có lịch sử gửi SMS
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
