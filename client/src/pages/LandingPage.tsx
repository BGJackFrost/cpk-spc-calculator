import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2,
  Factory,
  Shield,
  Zap,
  LineChart,
  Settings,
  Users,
  Wrench,
  Package,
  Activity,
  Target,
  Award,
  Building2,
  Phone,
  MapPin,
  Globe,
  ChevronRight,
  Play
} from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Separator } from "@/components/ui/separator";

export default function LandingPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register form state
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");

  // Stats from API
  const statsQuery = trpc.dashboard.getStats.useQuery(undefined, {
    enabled: true,
    staleTime: 60000,
  });

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [loading, isAuthenticated, setLocation]);

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
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

  // Main features
  const mainFeatures = [
    {
      icon: TrendingUp,
      title: "Phân tích SPC/CPK",
      description: "Tính toán tự động Cp, Cpk, Pp, Ppk, Ca với độ chính xác cao",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: BarChart3,
      title: "Control Charts",
      description: "Biểu đồ X-bar, R-chart, Histogram với 8 SPC Rules",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Factory,
      title: "Quản lý Sản xuất",
      description: "Dây chuyền, công trạm, máy móc và quy trình sản xuất",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Target,
      title: "OEE Dashboard",
      description: "Theo dõi hiệu suất thiết bị tổng thể realtime",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: Wrench,
      title: "Bảo trì Dự đoán",
      description: "Lập lịch bảo trì và dự đoán hỏng hóc thiết bị",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      icon: Package,
      title: "Quản lý Kho",
      description: "Phụ tùng, xuất nhập tồn và kiểm kê tự động",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
  ];

  // System modules
  const systemModules = [
    { name: "SPC/CPK Analysis", icon: LineChart, count: "15+ tính năng" },
    { name: "MMS - Bảo trì", icon: Wrench, count: "12+ tính năng" },
    { name: "OEE Dashboard", icon: Activity, count: "8+ tính năng" },
    { name: "Quản lý Sản xuất", icon: Factory, count: "10+ tính năng" },
    { name: "License Server", icon: Shield, count: "6+ tính năng" },
    { name: "Báo cáo & Xuất", icon: FileSpreadsheet, count: "8+ tính năng" },
  ];

  // Benefits
  const benefits = [
    "Giảm 60% thời gian phân tích dữ liệu kiểm tra",
    "Phát hiện sớm các bất thường trong quy trình",
    "Cải thiện năng lực quy trình sản xuất (CPK > 1.33)",
    "Đưa ra quyết định dựa trên dữ liệu thực",
    "Tích hợp AI phân tích và khuyến nghị",
    "Hỗ trợ đa ngôn ngữ (Tiếng Việt, English)",
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/foutec-logo.png" alt="Foutec Logo" className="w-10 h-10 object-contain" />
            <div>
              <span className="font-bold text-lg">Foutec SPC/CPK</span>
              <p className="text-xs text-muted-foreground">Manufacturing Excellence System</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tính năng</a>
            <a href="#modules" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Modules</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Liên hệ</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 lg:py-24 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Hero Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                <Sparkles className="h-4 w-4" />
                Hệ thống quản lý sản xuất thông minh
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Kiểm soát chất lượng{" "}
                <span className="bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
                  quy trình sản xuất
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                Hệ thống tích hợp SPC/CPK, OEE, MMS giúp doanh nghiệp theo dõi, phân tích 
                và cải thiện hiệu suất sản xuất với công nghệ AI tiên tiến.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 py-6 border-y border-border/50">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {statsQuery.data?.totalProductionLines || 5}+
                  </div>
                  <div className="text-sm text-muted-foreground">Dây chuyền</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {statsQuery.data?.totalProducts || 10}+
                  </div>
                  <div className="text-sm text-muted-foreground">Sản phẩm</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {statsQuery.data?.totalAnalyses || 100}+
                  </div>
                  <div className="text-sm text-muted-foreground">Phân tích</div>
                </div>
              </div>

              {/* Benefits list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {benefits.slice(0, 4).map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Login Form */}
            <div className="lg:pl-8">
              <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl shadow-primary/5">
                <CardHeader className="text-center space-y-3 pb-2">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Đăng nhập hệ thống</CardTitle>
                  <CardDescription>
                    Truy cập để sử dụng đầy đủ tính năng
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-4">
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
                        
                        <Button 
                          type="submit" 
                          className="w-full h-11"
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
                          className="w-full h-11"
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
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="reg-password">Mật khẩu *</Label>
                            <Input
                              id="reg-password"
                              type="password"
                              placeholder="Mật khẩu"
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reg-confirm">Xác nhận *</Label>
                            <Input
                              id="reg-confirm"
                              type="password"
                              placeholder="Xác nhận"
                              value={regConfirmPassword}
                              onChange={(e) => setRegConfirmPassword(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="reg-name">Họ tên</Label>
                          <Input
                            id="reg-name"
                            type="text"
                            placeholder="Nhập họ tên"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="reg-email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="reg-email"
                              type="email"
                              placeholder="email@company.com"
                              value={regEmail}
                              onChange={(e) => setRegEmail(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full h-11"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Đang đăng ký...
                            </>
                          ) : (
                            <>
                              Đăng ký tài khoản
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Tính năng nổi bật</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hệ thống tích hợp đầy đủ các công cụ cần thiết cho quản lý chất lượng và sản xuất
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainFeatures.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Các Module Hệ thống</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Kiến trúc module hóa cho phép mở rộng và tùy chỉnh theo nhu cầu doanh nghiệp
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemModules.map((module, index) => (
              <div 
                key={index} 
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <module.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">{module.name}</h4>
                  <p className="text-sm text-muted-foreground">{module.count}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Info Section */}
      <section id="contact" className="py-20 bg-muted/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-6">Thông tin Công ty</h2>
              <p className="text-lg text-primary font-medium italic mb-4">
                "Sự hài lòng của bạn là giá trị cốt lõi của chúng tôi"
              </p>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Công ty TNHH Foutec chuyên cung cấp giải pháp phần mềm quản lý sản xuất và kiểm soát chất lượng 
                cho các doanh nghiệp sản xuất công nghiệp, giúp nâng cao hiệu suất và giảm chi phí.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Công Ty TNHH Foutec</div>
                    <div className="text-sm text-muted-foreground">Manufacturing Excellence Solutions</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Địa chỉ</div>
                    <div className="text-sm text-muted-foreground">Lạc Vệ, Tân Chi, Bắc Ninh</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Hotline</div>
                    <div className="text-sm text-muted-foreground">0778484853</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Email</div>
                    <div className="text-sm text-muted-foreground">admin@foutec.vn</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Award className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Chứng nhận ISO 9001:2015</h3>
                      <p className="text-sm text-muted-foreground">Hệ thống quản lý chất lượng</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Bảo mật Dữ liệu</h3>
                      <p className="text-sm text-muted-foreground">Mã hóa AES-256, SSL/TLS</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Hỗ trợ 24/7</h3>
                      <p className="text-sm text-muted-foreground">Đội ngũ kỹ thuật chuyên nghiệp</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-background">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/foutec-logo.png" alt="Foutec Logo" className="w-8 h-8 object-contain" />
              <span className="font-semibold">Foutec SPC/CPK</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Công Ty TNHH Foutec. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Điều khoản
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Chính sách
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Hỗ trợ
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
