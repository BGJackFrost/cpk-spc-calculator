import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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
  KeyRound
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { getLoginUrl } from "@/const";
import TwoFactorVerify from "./TwoFactorVerify";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginMethod, setLoginMethod] = useState<"local" | "oauth">("local");
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
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
      if (data.requires2FA) {
        setRequires2FA(true);
        return;
      }
      toast.success("Đăng nhập thành công!");
      if (data.mustChangePassword) {
        setLocation("/change-password");
        window.location.reload();
      } else {
        setLocation("/dashboard");
        window.location.reload();
      }
    },
    onError: (error) => {
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
    loginMutation.mutate({ username: loginUsername, password: loginPassword });
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

  const handleOAuthLogin = () => {
    window.location.href = getLoginUrl();
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
          <div className="text-sm text-muted-foreground">
            Chọn phương thức đăng nhập phù hợp
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
              {requires2FA ? (
                <TwoFactorVerify
                  username={loginUsername}
                  password={loginPassword}
                  onSuccess={() => {
                    toast.success("Đăng nhập thành công!");
                    setLocation("/dashboard");
                    window.location.reload();
                  }}
                  onCancel={() => {
                    setRequires2FA(false);
                    setLoginPassword("");
                  }}
                />
              ) : (
              <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur border-border/50 shadow-2xl">
                <CardHeader className="text-center space-y-2">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Đăng nhập</CardTitle>
                  <CardDescription>
                    Chọn phương thức đăng nhập phù hợp
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {/* Login Method Selector */}
                  <div className="flex gap-2 mb-6">
                    <Button
                      variant={loginMethod === "local" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setLoginMethod("local")}
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      Username/Password
                    </Button>
                    <Button
                      variant={loginMethod === "oauth" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setLoginMethod("oauth")}
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Manus OAuth
                    </Button>
                  </div>

                  {loginMethod === "oauth" ? (
                    /* OAuth Login Section */
                    <div className="space-y-4">
                      <div className="text-center p-6 bg-muted/50 rounded-lg">
                        <Globe className="h-12 w-12 mx-auto text-primary mb-4" />
                        <h3 className="font-semibold mb-2">Đăng nhập với Manus OAuth</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Sử dụng tài khoản Manus để đăng nhập nhanh chóng và an toàn.
                          Không cần tạo tài khoản mới.
                        </p>
                        <Button 
                          onClick={handleOAuthLogin}
                          className="w-full"
                          size="lg"
                        >
                          <Globe className="mr-2 h-5 w-5" />
                          Đăng nhập với Manus
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                            Hoặc sử dụng tài khoản local
                          </span>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setLoginMethod("local")}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Đăng nhập bằng Username/Password
                      </Button>
                    </div>
                  ) : (
                    /* Local Login Section */
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
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end">
                            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                              Quên mật khẩu?
                            </Link>
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={loginMutation.isPending}
                          >
                            {loginMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang đăng nhập...
                              </>
                            ) : (
                              <>
                                Đăng nhập
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                          
                          <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                              <Separator className="w-full" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-card px-2 text-muted-foreground">
                                Hoặc
                              </span>
                            </div>
                          </div>
                          
                          <Button 
                            type="button"
                            variant="outline" 
                            className="w-full"
                            onClick={handleOAuthLogin}
                          >
                            <Globe className="mr-2 h-4 w-4" />
                            Đăng nhập với Manus OAuth
                          </Button>
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
                  {loginMethod === "local" ? (
                    <>
                      <p>Chế độ đăng nhập Local - Không cần Internet</p>
                      <p className="text-xs">
                        Tài khoản mặc định: <code className="bg-muted px-1 rounded">admin</code> / <code className="bg-muted px-1 rounded">admin123</code>
                      </p>
                    </>
                  ) : (
                    <p>Đăng nhập với tài khoản Manus - Cần kết nối Internet</p>
                  )}
                </CardFooter>
              </Card>
              )}
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

      {/* Footer */}
      <footer className="py-8 border-t mt-auto">
        <div className="container text-center text-muted-foreground">
          <p>© 2024 SPC/CPK Calculator. Hệ thống phân tích chất lượng quy trình sản xuất.</p>
        </div>
      </footer>
    </div>
  );
}
