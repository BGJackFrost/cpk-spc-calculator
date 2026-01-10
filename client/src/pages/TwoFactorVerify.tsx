import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface TwoFactorVerifyProps {
  username: string;
  password: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TwoFactorVerify({ username, password, onSuccess, onCancel }: TwoFactorVerifyProps) {
  const [code, setCode] = useState("");
  const [isBackupCode, setIsBackupCode] = useState(false);

  const login = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      toast.error("Vui lòng nhập mã xác thực");
      return;
    }
    login.mutate({
      username,
      password,
      twoFactorCode: code,
      isBackupCode,
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle>Xác thực 2 yếu tố</CardTitle>
        <CardDescription>
          Nhập mã từ ứng dụng xác thực của bạn
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">{isBackupCode ? "Mã dự phòng" : "Mã xác thực"}</Label>
            <Input
              id="code"
              type="text"
              placeholder={isBackupCode ? "XXXXXXXX" : "000000"}
              value={code}
              onChange={(e) => setCode(isBackupCode ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={isBackupCode ? 8 : 6}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="backupCode"
              checked={isBackupCode}
              onCheckedChange={(checked) => {
                setIsBackupCode(!!checked);
                setCode("");
              }}
            />
            <Label htmlFor="backupCode" className="text-sm font-normal">
              Sử dụng mã dự phòng
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? "Đang xác thực..." : "Xác nhận"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
