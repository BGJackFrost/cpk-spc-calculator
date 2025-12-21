import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAuthMode } from "@/contexts/AuthModeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { 
  BarChart3, 
  TrendingUp, 
  Database, 
  Bell, 
  FileSpreadsheet, 
  Brain,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Lock,
  User,
  Mail,
  UserPlus,
  Loader2,
  Globe,
  Wifi,
  WifiOff
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const { authMode, setAuthMode, isOnlineMode, isOfflineMode } = useAuthMode();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  
  // Register form state
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [loading, isAuthenticated, setLocation]);

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      // Check if 2FA is required
      if (data.requires2FA) {
        setRequires2FA(true);
        toast.info("Vui lòng nhập mã xác thực 2 yếu tố");
        return;
      }
      
      toast.success("Đăng nhập thành công!");
      
      // Show new device notification if applicable
      if (data.isNewDevice) {
        toast.info("Đăng nhập từ thiết bị mới. Email thông báo đã được gửi.", { duration: 5000 });
      }
      
      if (data.mustChangePassword) {
        setLocation("/change-password");
        window.location.reload();
      } else {
        setLocation("/dashboard");
        window.location.reload();
      }
    },
    onError: (error) => {
      // Reset 2FA state on error
      if (requires2FA) {
        setTwoFactorCode("");
      }
      toast.error(error.message || "Đăng nhập thất bại");
    },
  });

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: () => {
      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      setActiveTab("login");
      setLoginUsername(regUsername);
      setRegUsername("");
      setRegPassword("");
      setRegConfirmPassword("");
      setRegName("");
      setRegEmail("");
    },
    onError: (error) => {
      toast.error(error.message || "Đăng ký thất bại");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      toast.error("Vui lòng nhập tên đăng nhập và mật khẩu");
      return;
    }
    
    // If 2FA is required, validate the code
    if (requires2FA && !twoFactorCode) {
      toast.error("Vui lòng nhập mã xác thực 2 yếu tố");
      return;
    }
    
    loginMutation.mutate({ 
      username: loginUsername, 
      password: loginPassword,
      twoFactorCode: requires2FA ? twoFactorCode : undefined,
    });
  };
  
  const handleCancel2FA = () => {
    setRequires2FA(false);
    setTwoFactorCode("");
    setLoginPassword("");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword) {
      toast.error("Vui lòng nhập tên đăng nhập và mật khẩu");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    registerMutation.mutate({
      username: regUsername,
      password: regPassword,
      name: regName || undefined,
      email: regEmail || undefined,
    });
  };

  const handleOnlineLogin = () => {
    window.location.href = getLoginUrl();
  };

  const handleAuthModeToggle = (checked: boolean) => {
    setAuthMode(checked ? "offline" : "online");
    // Reset form state when switching modes
    setLoginUsername("");
    setLoginPassword("");
    setTwoFactorCode("");
    setRequires2FA(false);
  };

  const features = [
    {
      icon: TrendingUp,
      title: "Phân tích SPC/CPK",
      description: "Tính toán tự động các chỉ số Cp, Cpk, UCL, LCL từ dữ liệu kiểm tra",
    },
    {
      icon: BarChart3,
      title: "Control Charts",
      description: "Biểu đồ X-bar và R-chart trực quan để theo dõi xu hướng",
    },
    {
      icon: Database,
      title: "Kết nối Database động",
      description: "Cấu hình linh hoạt connection string và mapping bảng dữ liệu",
    },
    {
      icon: Bell,
      title: "Cảnh báo thông minh",
      description: "Thông báo tự động khi CPK vượt ngưỡng cho phép",
    },
    {
      icon: FileSpreadsheet,
      title: "Xuất báo cáo",
      description: "Xuất kết quả phân tích ra PDF hoặc Excel để lưu trữ",
    },
    {
      icon: Brain,
      title: "Phân tích AI",
      description: "Sử dụng LLM để đưa ra nhận xét và khuyến nghị cải tiến",
    },
  ];

  const benefits = [
    "Giảm thời gian phân tích dữ liệu kiểm tra",
    "Phát hiện sớm các bất thường trong quy trình",
    "Cải thiện năng lực quy trình sản xuất",
    "Đưa ra quyết định dựa trên dữ liệu",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">SPC/CPK Calculator</span>
          </div>
          <div className="flex items-center gap-3">
            {isOnlineMode ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Wifi className="h-4 w-4" />
                <span>Chế độ Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                <WifiOff className="h-4 w-4" />
                <span>Chế độ Offline</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section with Login Form */}
      <section className="py-12 lg:py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Hero Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Hệ thống phân tích SPC/CPK thông minh
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Kiểm soát chất lượng{" "}
                <span className="gradient-text">quy trình sản xuất</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Phân tích dữ liệu kiểm tra máy, tính toán chỉ số CPK và theo dõi xu hướng 
                quy trình sản xuất với biểu đồ Control Chart trực quan.
              </p>
              <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-chart-3 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Login Form */}
            <div>
              <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur border-border/50 shadow-2xl">
                <CardHeader className="text-center space-y-2">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Đăng nhập</CardTitle>
                  <CardDescription>
                    Đăng nhập để sử dụng hệ thống
                  </CardDescription>
                  
                  {/* Auth Mode Toggle */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <div className={`flex items-center gap-1.5 text-sm ${isOnlineMode ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      <Globe className="h-4 w-4" />
                      <span>Online</span>
                    </div>
                    <Switch
                      checked={isOfflineMode}
                      onCheckedChange={handleAuthModeToggle}
                      className="data-[state=checked]:bg-orange-500"
                    />
                    <div className={`flex items-center gap-1.5 text-sm ${isOfflineMode ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                      <WifiOff className="h-4 w-4" />
                      <span>Offline</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {isOnlineMode ? (
                    /* Online Mode - Manus OAuth */
                    <div className="space-y-6">
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Đăng nhập bằng tài khoản Manus để truy cập đầy đủ tính năng
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            <CheckCircle2 className="h-3 w-3" /> Phân tích AI
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            <CheckCircle2 className="h-3 w-3" /> Lưu trữ Cloud
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            <CheckCircle2 className="h-3 w-3" /> Đồng bộ dữ liệu
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleOnlineLogin}
                        className="w-full h-12 text-base"
                        size="lg"
                      >
                        <Globe className="mr-2 h-5 w-5" />
                        Đăng nhập với Manus
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                            hoặc chuyển sang chế độ Offline
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-center text-muted-foreground">
                        Chế độ Offline cho phép đăng nhập bằng tài khoản local khi không có kết nối Internet
                      </p>
                    </div>
                  ) : (
                    /* Offline Mode - Local Authentication */
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                        <TabsTrigger value="register">Đăng ký</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="login">
                        <form onSubmit={handleLogin} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="login-username">Tên đăng nhập</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="login-username"
                                type="text"
                                placeholder="Nhập tên đăng nhập"
                                value={loginUsername}
                                onChange={(e) => setLoginUsername(e.target.value)}
                                className="pl-10"
                                autoComplete="username"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="login-password">Mật khẩu</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="login-password"
                                type="password"
                                placeholder="Nhập mật khẩu"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                className="pl-10"
                                autoComplete="current-password"
                                disabled={requires2FA}
                              />
                            </div>
                          </div>
                          
                          {requires2FA && (
                            <div className="space-y-2">
                              <Label htmlFor="two-factor-code">Mã xác thực 2 yếu tố</Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="two-factor-code"
                                  type="text"
                                  placeholder="Nhập mã 6 số từ ứng dụng Authenticator"
                                  value={twoFactorCode}
                                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                  className="pl-10 text-center text-lg tracking-widest"
                                  maxLength={6}
                                  autoFocus
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Mở ứng dụng Google Authenticator hoặc tương tự để lấy mã
                              </p>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            {requires2FA && (
                              <Button 
                                type="button" 
                                variant="outline"
                                className="flex-1"
                                onClick={handleCancel2FA}
                              >
                                Quay lại
                              </Button>
                            )}
                            <Button 
                              type="submit" 
                              className={requires2FA ? "flex-1" : "w-full"}
                              disabled={loginMutation.isPending}
                            >
                              {loginMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {requires2FA ? 'Đang xác thực...' : 'Đang đăng nhập...'}
                                </>
                              ) : (
                                <>
                                  {requires2FA ? 'Xác thực' : 'Đăng nhập'}
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </div>
                          
                          <div className="text-center">
                            <a 
                              href="/forgot-password" 
                              className="text-sm text-primary hover:underline"
                            >
                              Quên mật khẩu?
                            </a>
                          </div>
                        </form>
                      </TabsContent>
                      
                      <TabsContent value="register">
                        <form onSubmit={handleRegister} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="reg-username">Tên đăng nhập *</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="reg-username"
                                type="text"
                                placeholder="Nhập tên đăng nhập"
                                value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)}
                                className="pl-10"
                                autoComplete="username"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="reg-name">Họ và tên</Label>
                            <div className="relative">
                              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="reg-name"
                                type="text"
                                placeholder="Nhập họ và tên"
                                value={regName}
                                onChange={(e) => setRegName(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="reg-email">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="reg-email"
                                type="email"
                                placeholder="Nhập email"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="reg-password">Mật khẩu *</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="reg-password"
                                type="password"
                                placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                className="pl-10"
                                autoComplete="new-password"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="reg-confirm-password">Xác nhận mật khẩu *</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="reg-confirm-password"
                                type="password"
                                placeholder="Nhập lại mật khẩu"
                                value={regConfirmPassword}
                                onChange={(e) => setRegConfirmPassword(e.target.value)}
                                className="pl-10"
                                autoComplete="new-password"
                              />
                            </div>
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang đăng ký...
                              </>
                            ) : (
                              "Đăng ký"
                            )}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
                
                <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
                  {isOnlineMode ? (
                    <p>Đăng nhập Online - Yêu cầu kết nối Internet</p>
                  ) : (
                    <>
                      <p>Chế độ đăng nhập Local - Không cần Internet</p>
                      <p className="text-xs">
                        Tài khoản mặc định: <code className="bg-muted px-1 rounded">admin</code> / <code className="bg-muted px-1 rounded">Admin@2024!</code>
                      </p>
                    </>
                  )}
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Tính năng nổi bật</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hệ thống cung cấp đầy đủ công cụ để phân tích và kiểm soát chất lượng quy trình sản xuất
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="elegant-card p-6 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auth Mode Comparison */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">So sánh chế độ đăng nhập</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Chọn chế độ phù hợp với môi trường sử dụng của bạn
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Online Mode */}
            <Card className={`relative ${isOnlineMode ? 'ring-2 ring-primary' : ''}`}>
              {isOnlineMode && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                  Đang chọn
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle>Online Mode</CardTitle>
                    <CardDescription>Đăng nhập qua Manus OAuth</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Phân tích AI với LLM</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Lưu trữ Cloud (S3)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Đồng bộ dữ liệu đa thiết bị</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Cập nhật tự động</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-4 h-4 flex items-center justify-center">•</span>
                  <span>Yêu cầu kết nối Internet</span>
                </div>
              </CardContent>
            </Card>

            {/* Offline Mode */}
            <Card className={`relative ${isOfflineMode ? 'ring-2 ring-orange-500' : ''}`}>
              {isOfflineMode && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
                  Đang chọn
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <WifiOff className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <CardTitle>Offline Mode</CardTitle>
                    <CardDescription>Đăng nhập Local Database</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Hoạt động không cần Internet</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Phân tích SPC/CPK đầy đủ</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Xuất báo cáo PDF/Excel</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Quản lý người dùng local</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-4 h-4 flex items-center justify-center">•</span>
                  <span>Không có phân tích AI</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto">
        <div className="container text-center text-muted-foreground">
          <p>© 2024 SPC/CPK Calculator. Hệ thống phân tích chất lượng quy trình sản xuất.</p>
        </div>
      </footer>
    </div>
  );
}
