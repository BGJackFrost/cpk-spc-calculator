import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Lock, User, Mail, UserPlus } from "lucide-react";

export default function LocalLogin() {
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

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      toast.success("Đăng nhập thành công!");
      // Check if user must change password
      if (data.mustChangePassword) {
        setLocation("/change-password");
        window.location.reload();
      } else {
        setLocation("/");
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
      // Clear register form
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-10" />
      
      <Card className="w-full max-w-md relative z-10 bg-card/95 backdrop-blur border-border/50 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">SPC/CPK Calculator</CardTitle>
          <CardDescription>
            Đăng nhập Local - Chế độ Offline
          </CardDescription>
        </CardHeader>
        
        <CardContent>
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
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang đăng nhập...
                    </>
                  ) : (
                    "Đăng nhập"
                  )}
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
                      placeholder="Nhập tên đăng nhập (ít nhất 3 ký tự)"
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
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
          <p>Chế độ đăng nhập Local cho triển khai Offline</p>
          <p className="text-xs">
            Tài khoản mặc định: <code className="bg-muted px-1 rounded">admin</code> / <code className="bg-muted px-1 rounded">admin123</code>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
