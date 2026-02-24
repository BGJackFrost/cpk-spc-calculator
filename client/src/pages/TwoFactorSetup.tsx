import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, CheckCircle, Copy, Download } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function TwoFactorSetup() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"setup" | "verify" | "backup">("setup");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const { data: status, refetch: refetchStatus } = trpc.localAuth.get2FAStatus.useQuery();
  
  const generateSecret = trpc.localAuth.generate2FASecret.useMutation({
    onSuccess: () => {
      setStep("verify");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const enable2FA = trpc.localAuth.enable2FA.useMutation({
    onSuccess: (data) => {
      if (data.success && data.backupCodes) {
        setBackupCodes(data.backupCodes);
        setStep("backup");
        refetchStatus();
        toast.success("2FA đã được kích hoạt");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const disable2FA = trpc.localAuth.disable2FA.useMutation({
    onSuccess: () => {
      refetchStatus();
      setStep("setup");
      toast.success("2FA đã được tắt");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCode.length !== 6) {
      toast.error("Mã xác thực phải có 6 chữ số");
      return;
    }
    enable2FA.mutate({ token: verifyCode });
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast.success("Đã sao chép mã dự phòng");
  };

  const downloadBackupCodes = () => {
    const content = `Mã dự phòng 2FA - CPK/SPC System\n\nLưu ý: Mỗi mã chỉ sử dụng được một lần.\n\n${backupCodes.join("\n")}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "2fa-backup-codes.txt";
    a.click();
  };

  if (status?.enabled) {
    return (
      <DashboardLayout>
        <div className="container max-w-2xl py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle>Xác thực 2 yếu tố đã được kích hoạt</CardTitle>
                  <CardDescription>Tài khoản của bạn được bảo vệ bởi 2FA</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Mỗi lần đăng nhập, bạn sẽ cần nhập mã từ ứng dụng xác thực.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="disableCode">Nhập mã để tắt 2FA</Label>
                  <Input
                    id="disableCode"
                    type="text"
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="destructive"
                onClick={() => disable2FA.mutate({ token: verifyCode })}
                disabled={verifyCode.length !== 6 || disable2FA.isPending}
              >
                {disable2FA.isPending ? "Đang xử lý..." : "Tắt 2FA"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-2xl py-8">
        {step === "setup" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Thiết lập xác thực 2 yếu tố</CardTitle>
                  <CardDescription>Bảo vệ tài khoản với lớp bảo mật bổ sung</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Xác thực 2 yếu tố (2FA) thêm một lớp bảo mật cho tài khoản của bạn bằng cách yêu cầu mã xác thực từ ứng dụng như Google Authenticator hoặc Authy.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => generateSecret.mutate()} disabled={generateSecret.isPending}>
                {generateSecret.isPending ? "Đang tạo..." : "Bắt đầu thiết lập"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === "verify" && generateSecret.data && (
          <Card>
            <CardHeader>
              <CardTitle>Quét mã QR</CardTitle>
              <CardDescription>Sử dụng ứng dụng xác thực để quét mã QR bên dưới</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <img src={generateSecret.data.qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Hoặc nhập mã thủ công:</p>
                <code className="bg-muted px-3 py-1 rounded text-sm">{generateSecret.data.secret}</code>
              </div>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verifyCode">Nhập mã từ ứng dụng</Label>
                  <Input
                    id="verifyCode"
                    type="text"
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={verifyCode.length !== 6 || enable2FA.isPending}>
                  {enable2FA.isPending ? "Đang xác thực..." : "Xác nhận và kích hoạt"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "backup" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle>2FA đã được kích hoạt!</CardTitle>
                  <CardDescription>Lưu lại mã dự phòng bên dưới</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Lưu các mã dự phòng này ở nơi an toàn. Bạn có thể sử dụng chúng để đăng nhập nếu mất quyền truy cập vào ứng dụng xác thực.
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="text-sm font-mono">{code}</code>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyBackupCodes}>
                  <Copy className="w-4 h-4 mr-2" />
                  Sao chép
                </Button>
                <Button variant="outline" onClick={downloadBackupCodes}>
                  <Download className="w-4 h-4 mr-2" />
                  Tải xuống
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setLocation("/dashboard")}>Hoàn tất</Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
