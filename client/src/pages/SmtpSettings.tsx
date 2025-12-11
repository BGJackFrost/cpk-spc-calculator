import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Mail, Server, Shield, Send, CheckCircle } from "lucide-react";

export default function SmtpSettings() {
  const [formData, setFormData] = useState({
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
    fromEmail: "",
    fromName: "SPC/CPK Calculator",
  });
  const [testEmail, setTestEmail] = useState("");

  const { data: smtpConfig, isLoading } = trpc.smtp.getConfig.useQuery();
  const saveMutation = trpc.smtp.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu cấu hình SMTP");
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  const testMutation = trpc.smtp.testEmail.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Đã gửi email test thành công");
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  useEffect(() => {
    if (smtpConfig) {
      setFormData({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        username: smtpConfig.username,
        password: smtpConfig.password,
        fromEmail: smtpConfig.fromEmail,
        fromName: smtpConfig.fromName,
      });
    }
  }, [smtpConfig]);

  const handleSave = () => {
    if (!formData.host || !formData.username || !formData.password || !formData.fromEmail) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleTestEmail = () => {
    if (!testEmail) {
      toast.error("Vui lòng nhập email test");
      return;
    }
    testMutation.mutate({ email: testEmail });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cấu hình SMTP</h1>
          <p className="text-muted-foreground mt-1">
            Thiết lập server email để gửi thông báo tự động
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* SMTP Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Thông tin Server
              </CardTitle>
              <CardDescription>
                Cấu hình kết nối đến SMTP server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="host">SMTP Host</Label>
                  <Input
                    id="host"
                    placeholder="smtp.gmail.com"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    placeholder="587"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 587 })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="secure" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Sử dụng TLS/SSL
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Bật nếu server yêu cầu kết nối bảo mật
                  </p>
                </div>
                <Switch
                  id="secure"
                  checked={formData.secure}
                  onCheckedChange={(checked) => setFormData({ ...formData, secure: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="your-email@gmail.com"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password / App Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Với Gmail, sử dụng App Password thay vì mật khẩu thường
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sender Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Thông tin Người gửi
              </CardTitle>
              <CardDescription>
                Cấu hình thông tin hiển thị khi gửi email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fromEmail">Email người gửi</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="noreply@company.com"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromName">Tên hiển thị</Label>
                <Input
                  id="fromName"
                  placeholder="SPC/CPK Calculator"
                  value={formData.fromName}
                  onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                />
              </div>

              <Button 
                onClick={handleSave} 
                className="w-full"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Lưu cấu hình
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Gửi Email Test
              </CardTitle>
              <CardDescription>
                Kiểm tra cấu hình SMTP bằng cách gửi email test
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleTestEmail}
                  disabled={testMutation.isPending || !testEmail}
                  variant="outline"
                >
                  {testMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Gửi test
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Common SMTP Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Hướng dẫn cấu hình phổ biến</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-red-600">Gmail</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Host: smtp.gmail.com<br />
                  Port: 587 (TLS) hoặc 465 (SSL)<br />
                  Cần bật App Password
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-blue-600">Outlook/Office 365</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Host: smtp.office365.com<br />
                  Port: 587<br />
                  TLS: Bật
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-orange-600">Amazon SES</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Host: email-smtp.[region].amazonaws.com<br />
                  Port: 587<br />
                  TLS: Bật
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
