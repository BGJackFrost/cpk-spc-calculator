import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Mail, Server, Shield, Send, CheckCircle, AlertTriangle, Activity, TestTube } from "lucide-react";

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
  const [testType, setTestType] = useState<"simple" | "cpk_alert" | "spc_violation">("simple");
  
  // CPK Alert test data
  const [cpkTestData, setCpkTestData] = useState({
    productCode: "PROD-001",
    stationName: "Station A",
    cpkValue: 0.85,
    threshold: 1.33,
  });
  
  // SPC Violation test data
  const [spcTestData, setSpcTestData] = useState({
    productCode: "PROD-001",
    stationName: "Station A",
    violationType: "Rule 1 - Điểm ngoài 3σ",
    currentValue: 56.5,
    ucl: 55,
    lcl: 45,
  });

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
  
  const testCpkAlertMutation = trpc.smtp.testCpkAlert.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Đã gửi email CPK Alert test thành công");
      } else {
        toast.error(`Lỗi: ${result.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const testSpcViolationMutation = trpc.smtp.testSpcViolation.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Đã gửi email SPC Violation test thành công");
      } else {
        toast.error(`Result: ${result.error}`);
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
    
    if (testType === "simple") {
      testMutation.mutate({ email: testEmail });
    } else if (testType === "cpk_alert") {
      testCpkAlertMutation.mutate({
        email: testEmail,
        ...cpkTestData,
      });
    } else if (testType === "spc_violation") {
      testSpcViolationMutation.mutate({
        email: testEmail,
        ...spcTestData,
      });
    }
  };
  
  const isTestPending = testMutation.isPending || testCpkAlertMutation.isPending || testSpcViolationMutation.isPending;

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

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Test Email
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Hướng dẫn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
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
            </div>
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Test Email Type Selection */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    Gửi Email Test
                  </CardTitle>
                  <CardDescription>
                    Kiểm tra cấu hình SMTP bằng cách gửi các loại email test khác nhau
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Email nhận</Label>
                      <Input
                        type="email"
                        placeholder="test@example.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Loại email test</Label>
                      <Select value={testType} onValueChange={(v) => setTestType(v as typeof testType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email đơn giản
                            </div>
                          </SelectItem>
                          <SelectItem value="cpk_alert">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              CPK Alert
                            </div>
                          </SelectItem>
                          <SelectItem value="spc_violation">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-red-500" />
                              SPC Violation
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CPK Alert Test Data */}
              {testType === "cpk_alert" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <AlertTriangle className="h-5 w-5" />
                      Dữ liệu CPK Alert Test
                    </CardTitle>
                    <CardDescription>
                      Cấu hình dữ liệu mẫu cho email cảnh báo CPK
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Mã sản phẩm</Label>
                        <Input
                          value={cpkTestData.productCode}
                          onChange={(e) => setCpkTestData({ ...cpkTestData, productCode: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tên trạm</Label>
                        <Input
                          value={cpkTestData.stationName}
                          onChange={(e) => setCpkTestData({ ...cpkTestData, stationName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Giá trị CPK</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={cpkTestData.cpkValue}
                          onChange={(e) => setCpkTestData({ ...cpkTestData, cpkValue: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Giá trị CPK hiện tại (thấp hơn ngưỡng sẽ trigger cảnh báo)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Ngưỡng cảnh báo</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={cpkTestData.threshold}
                          onChange={(e) => setCpkTestData({ ...cpkTestData, threshold: parseFloat(e.target.value) || 1.33 })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Ngưỡng CPK tối thiểu (thường là 1.33)
                        </p>
                      </div>
                    </div>
                    
                    {/* Preview */}
                    <div className="rounded-lg border bg-orange-50 dark:bg-orange-950/20 p-4">
                      <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">Preview nội dung email:</h4>
                      <div className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                        <p><strong>Sản phẩm:</strong> {cpkTestData.productCode}</p>
                        <p><strong>Trạm:</strong> {cpkTestData.stationName}</p>
                        <p><strong>CPK:</strong> {cpkTestData.cpkValue} (Ngưỡng: {cpkTestData.threshold})</p>
                        <p><strong>Trạng thái:</strong> {cpkTestData.cpkValue < cpkTestData.threshold ? "⚠️ Dưới ngưỡng" : "✅ Đạt yêu cầu"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SPC Violation Test Data */}
              {testType === "spc_violation" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <Activity className="h-5 w-5" />
                      Dữ liệu SPC Violation Test
                    </CardTitle>
                    <CardDescription>
                      Cấu hình dữ liệu mẫu cho email vi phạm SPC
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Mã sản phẩm</Label>
                        <Input
                          value={spcTestData.productCode}
                          onChange={(e) => setSpcTestData({ ...spcTestData, productCode: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tên trạm</Label>
                        <Input
                          value={spcTestData.stationName}
                          onChange={(e) => setSpcTestData({ ...spcTestData, stationName: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Loại vi phạm</Label>
                      <Select 
                        value={spcTestData.violationType} 
                        onValueChange={(v) => setSpcTestData({ ...spcTestData, violationType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rule 1 - Điểm ngoài 3σ">Rule 1 - Điểm ngoài 3σ</SelectItem>
                          <SelectItem value="Rule 2 - 9 điểm liên tiếp cùng phía">Rule 2 - 9 điểm liên tiếp cùng phía</SelectItem>
                          <SelectItem value="Rule 3 - 6 điểm tăng/giảm liên tục">Rule 3 - 6 điểm tăng/giảm liên tục</SelectItem>
                          <SelectItem value="Rule 4 - 14 điểm dao động">Rule 4 - 14 điểm dao động</SelectItem>
                          <SelectItem value="Rule 5 - 2/3 điểm ngoài 2σ">Rule 5 - 2/3 điểm ngoài 2σ</SelectItem>
                          <SelectItem value="Rule 6 - 4/5 điểm ngoài 1σ">Rule 6 - 4/5 điểm ngoài 1σ</SelectItem>
                          <SelectItem value="Rule 7 - 15 điểm trong 1σ">Rule 7 - 15 điểm trong 1σ</SelectItem>
                          <SelectItem value="Rule 8 - 8 điểm ngoài 1σ">Rule 8 - 8 điểm ngoài 1σ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Giá trị hiện tại</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={spcTestData.currentValue}
                          onChange={(e) => setSpcTestData({ ...spcTestData, currentValue: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>UCL (Upper Control Limit)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={spcTestData.ucl}
                          onChange={(e) => setSpcTestData({ ...spcTestData, ucl: parseFloat(e.target.value) || 55 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>LCL (Lower Control Limit)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={spcTestData.lcl}
                          onChange={(e) => setSpcTestData({ ...spcTestData, lcl: parseFloat(e.target.value) || 45 })}
                        />
                      </div>
                    </div>
                    
                    {/* Preview */}
                    <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-4">
                      <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Preview nội dung email:</h4>
                      <div className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        <p><strong>Sản phẩm:</strong> {spcTestData.productCode}</p>
                        <p><strong>Trạm:</strong> {spcTestData.stationName}</p>
                        <p><strong>Vi phạm:</strong> {spcTestData.violationType}</p>
                        <p><strong>Giá trị:</strong> {spcTestData.currentValue} (UCL: {spcTestData.ucl}, LCL: {spcTestData.lcl})</p>
                        <p><strong>Trạng thái:</strong> {
                          spcTestData.currentValue > spcTestData.ucl 
                            ? "🔴 Vượt UCL" 
                            : spcTestData.currentValue < spcTestData.lcl 
                              ? "🔴 Dưới LCL" 
                              : "🟢 Trong giới hạn"
                        }</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Simple Test Info */}
              {testType === "simple" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Test Đơn giản
                    </CardTitle>
                    <CardDescription>
                      Gửi email test cơ bản để kiểm tra kết nối SMTP
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-4">
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Nội dung email test:</h4>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p><strong>Tiêu đề:</strong> [Test] SPC/CPK Calculator Email Test</p>
                        <p><strong>Nội dung:</strong> This is a test email from SPC/CPK Calculator.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Send Button */}
              <Card className={testType === "simple" ? "" : "lg:col-span-1"}>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleTestEmail}
                    disabled={isTestPending || !testEmail}
                    className="w-full"
                    size="lg"
                  >
                    {isTestPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Gửi Email Test
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Đảm bảo đã lưu cấu hình SMTP trước khi test
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="guide">
            <Card>
              <CardHeader>
                <CardTitle>Hướng dẫn cấu hình phổ biến</CardTitle>
                <CardDescription>
                  Thông tin cấu hình SMTP cho các nhà cung cấp email phổ biến
                </CardDescription>
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
                    <div className="mt-2 text-xs text-muted-foreground">
                      <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        Tạo App Password →
                      </a>
                    </div>
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
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-purple-600">SendGrid</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Host: smtp.sendgrid.net<br />
                      Port: 587<br />
                      Username: apikey<br />
                      Password: [API Key]
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-green-600">Mailgun</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Host: smtp.mailgun.org<br />
                      Port: 587<br />
                      TLS: Bật
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold text-cyan-600">Zoho Mail</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Host: smtp.zoho.com<br />
                      Port: 587 (TLS) hoặc 465 (SSL)<br />
                      TLS: Bật
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 p-4">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">⚠️ Lưu ý quan trọng:</h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                    <li>Với Gmail, cần bật 2FA và tạo App Password</li>
                    <li>Một số nhà cung cấp yêu cầu xác thực domain</li>
                    <li>Kiểm tra giới hạn gửi email của nhà cung cấp</li>
                    <li>Sử dụng email chuyên dụng cho hệ thống (không dùng email cá nhân)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
