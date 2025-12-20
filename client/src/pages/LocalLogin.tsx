import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Lock, User, Mail, UserPlus, Shield, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

// Generate a simple device fingerprint
function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('device-fingerprint', 2, 2);
  }
  const canvasData = canvas.toDataURL();
  
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvasData.slice(-50),
  ].join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

export default function LocalLogin() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  
  // 2FA state
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [pending2FAUserId, setPending2FAUserId] = useState<number | null>(null);
  
  // Register form state
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");

  // Generate device fingerprint on mount
  useEffect(() => {
    setDeviceFingerprint(generateDeviceFingerprint());
  }, []);

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      if (data.requires2FA) {
        // Show 2FA dialog
        setShow2FADialog(true);
        setPending2FAUserId(data.userId || null);
        return;
      }
      
      if (data.trustedDeviceSkipped2FA) {
        toast.success("Đăng nhập thành công! (Thiết bị tin cậy - bỏ qua 2FA)");
      } else {
        toast.success("Đăng nhập thành công!");
      }
      
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
    loginMutation.mutate({ 
      username: loginUsername, 
      password: loginPassword,
      deviceFingerprint,
    });
  };

  const handleVerify2FA = () => {
    if (!twoFactorCode || twoFactorCode.length < 6) {
      toast.error("Vui lòng nhập mã xác thực 6 số");
      return;
    }
    
    loginMutation.mutate({
      username: loginUsername,
      password: loginPassword,
      twoFactorCode,
      deviceFingerprint,
      trustDevice,
    });
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
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Mật khẩu</Label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      Quên mật khẩu?
                    </Link>
                  </div>
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
                      placeholder="Nhập email (tùy chọn)"
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
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Đăng ký
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
          <p>Phiên bản Local - Dữ liệu lưu trữ cục bộ</p>
        </CardFooter>
      </Card>

      {/* 2FA Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Xác thực 2 yếu tố</DialogTitle>
            <DialogDescription className="text-center">
              Nhập mã 6 số từ ứng dụng xác thực của bạn
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6 py-4">
            <InputOTP
              maxLength={6}
              value={twoFactorCode}
              onChange={(value) => setTwoFactorCode(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="trust-device"
                checked={trustDevice}
                onCheckedChange={(checked) => setTrustDevice(checked === true)}
              />
              <label
                htmlFor="trust-device"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                <Smartphone className="h-4 w-4" />
                Nhớ thiết bị này (30 ngày)
              </label>
            </div>

            <Button 
              onClick={handleVerify2FA}
              disabled={loginMutation.isPending || twoFactorCode.length < 6}
              className="w-full"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xác thực...
                </>
              ) : (
                "Xác thực"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
