import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  ShieldCheck, 
  ShieldOff,
  Smartphone,
  Key,
  Copy,
  CheckCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TwoFactorSettings() {
  const { toast } = useToast();
  
  // Setup state
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  
  // Disable state
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  
  // Regenerate backup codes state
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { data: twoFAStatus, isLoading, refetch } = trpc.localAuth.is2FAEnabled.useQuery();

  const setup2FAMutation = trpc.localAuth.setup2FA.useMutation({
    onSuccess: (data) => {
      setSetupData(data);
      setSetupDialogOpen(true);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verify2FAMutation = trpc.localAuth.verify2FA.useMutation({
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes || null);
      setSetupData(null);
      setVerifyCode("");
      toast({
        title: "Thành công",
        description: "Xác thực 2 yếu tố đã được bật",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disable2FAMutation = trpc.localAuth.disable2FA.useMutation({
    onSuccess: () => {
      setDisableDialogOpen(false);
      setDisablePassword("");
      toast({
        title: "Thành công",
        description: "Xác thực 2 yếu tố đã được tắt",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateBackupCodesMutation = trpc.localAuth.regenerateBackupCodes.useMutation({
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes || null);
      setRegenerateDialogOpen(false);
      setRegeneratePassword("");
      toast({
        title: "Thành công",
        description: "Đã tạo mã backup mới",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Đã sao chép",
      description: "Mã đã được sao chép vào clipboard",
    });
  };

  const copyAllBackupCodes = () => {
    if (backupCodes) {
      navigator.clipboard.writeText(backupCodes.join("\n"));
      toast({
        title: "Đã sao chép",
        description: "Tất cả mã backup đã được sao chép",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Xác thực 2 yếu tố (2FA)
        </h1>
        <p className="text-muted-foreground mt-1">
          Thêm lớp bảo mật cho tài khoản của bạn bằng xác thực 2 yếu tố
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {twoFAStatus?.enabled ? (
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <ShieldOff className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg">
                  Trạng thái: {twoFAStatus?.enabled ? "Đã bật" : "Chưa bật"}
                </CardTitle>
                <CardDescription>
                  {twoFAStatus?.enabled 
                    ? "Tài khoản của bạn được bảo vệ bởi xác thực 2 yếu tố"
                    : "Bật xác thực 2 yếu tố để tăng cường bảo mật"}
                </CardDescription>
              </div>
            </div>
            <Badge variant={twoFAStatus?.enabled ? "default" : "secondary"}>
              {twoFAStatus?.enabled ? "Đang hoạt động" : "Chưa kích hoạt"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {twoFAStatus?.enabled ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Mã backup còn lại</p>
                    <p className="text-sm text-muted-foreground">
                      {twoFAStatus.backupCodesCount} mã có thể sử dụng
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setRegenerateDialogOpen(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tạo mã mới
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="destructive"
                  onClick={() => setDisableDialogOpen(true)}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Tắt 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Xác thực 2 yếu tố giúp bảo vệ tài khoản ngay cả khi mật khẩu bị lộ.
                  Bạn sẽ cần ứng dụng xác thực như Google Authenticator hoặc Authy.
                </AlertDescription>
              </Alert>
              
              <Button onClick={() => setup2FAMutation.mutate()}>
                {setup2FAMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4 mr-2" />
                )}
                Bật xác thực 2 yếu tố
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thiết lập xác thực 2 yếu tố</DialogTitle>
            <DialogDescription>
              Quét mã QR bằng ứng dụng xác thực, sau đó nhập mã 6 số để xác nhận
            </DialogDescription>
          </DialogHeader>
          
          {setupData && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img 
                  src={setupData.qrCodeUrl} 
                  alt="QR Code" 
                  className="w-48 h-48"
                />
              </div>
              
              {/* Manual entry */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Hoặc nhập mã thủ công:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                    {setupData.secret}
                  </code>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => copyToClipboard(setupData.secret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Verify code */}
              <div className="space-y-2">
                <Label htmlFor="verify-code">Nhập mã xác thực</Label>
                <Input
                  id="verify-code"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={() => verify2FAMutation.mutate({ code: verifyCode })}
              disabled={verifyCode.length !== 6 || verify2FAMutation.isPending}
            >
              {verify2FAMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={!!backupCodes} onOpenChange={() => setBackupCodes(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Mã backup của bạn
            </DialogTitle>
            <DialogDescription>
              Lưu các mã này ở nơi an toàn. Mỗi mã chỉ sử dụng được một lần khi bạn không thể truy cập ứng dụng xác thực.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                Đây là lần duy nhất bạn thấy các mã này. Hãy lưu lại ngay!
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-2">
              {backupCodes?.map((code, index) => (
                <div 
                  key={index}
                  className="p-2 bg-muted rounded font-mono text-center cursor-pointer hover:bg-muted/80"
                  onClick={() => copyToClipboard(code)}
                >
                  {code}
                </div>
              ))}
            </div>
            
            <Button variant="outline" className="w-full" onClick={copyAllBackupCodes}>
              <Copy className="h-4 w-4 mr-2" />
              Sao chép tất cả
            </Button>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setBackupCodes(null)}>
              Đã lưu, đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tắt xác thực 2 yếu tố?</AlertDialogTitle>
            <AlertDialogDescription>
              Điều này sẽ làm giảm bảo mật cho tài khoản của bạn. Nhập mật khẩu để xác nhận.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="disable-password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="disable-password"
                type={showPassword ? "text" : "password"}
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisablePassword("")}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disable2FAMutation.mutate({ password: disablePassword })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!disablePassword || disable2FAMutation.isPending}
            >
              {disable2FAMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tắt 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Backup Codes Dialog */}
      <AlertDialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tạo mã backup mới?</AlertDialogTitle>
            <AlertDialogDescription>
              Các mã backup cũ sẽ không còn sử dụng được. Nhập mật khẩu để xác nhận.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="regenerate-password">Mật khẩu</Label>
            <Input
              id="regenerate-password"
              type="password"
              value={regeneratePassword}
              onChange={(e) => setRegeneratePassword(e.target.value)}
              placeholder="Nhập mật khẩu của bạn"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRegeneratePassword("")}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regenerateBackupCodesMutation.mutate({ password: regeneratePassword })}
              disabled={!regeneratePassword || regenerateBackupCodesMutation.isPending}
            >
              {regenerateBackupCodesMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tạo mã mới
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
