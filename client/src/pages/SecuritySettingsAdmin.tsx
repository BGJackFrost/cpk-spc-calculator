import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Shield, 
  Save, 
  Loader2, 
  AlertTriangle, 
  Lock, 
  Clock, 
  Smartphone,
  RefreshCw,
  Info
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface SecuritySettingItem {
  key: string;
  value: string;
  description: string;
  type: "number" | "boolean";
  min?: number;
  max?: number;
}

export default function SecuritySettingsAdmin() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: securitySettings, isLoading, refetch } = trpc.localAuth.getSecuritySettings.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const updateMutation = trpc.localAuth.updateSecuritySettings.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu cài đặt bảo mật");
      setHasChanges(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Lỗi khi lưu cài đặt");
    },
  });

  useEffect(() => {
    if (securitySettings) {
      const settingsMap: Record<string, string> = {};
      securitySettings.forEach((s: SecuritySettingItem) => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
    }
  }, [securitySettings]);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate({ settings });
  };

  const handleReset = () => {
    if (securitySettings) {
      const settingsMap: Record<string, string> = {};
      securitySettings.forEach((s: SecuritySettingItem) => {
        settingsMap[s.key] = s.value;
      });
      setSettings(settingsMap);
      setHasChanges(false);
    }
  };

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">Truy cập bị từ chối</h2>
              <p className="text-muted-foreground">
                Bạn cần quyền Admin để truy cập trang này.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const getSettingIcon = (key: string) => {
    switch (key) {
      case "max_failed_attempts":
      case "alert_threshold":
        return <AlertTriangle className="h-5 w-5" />;
      case "lockout_duration_minutes":
        return <Clock className="h-5 w-5" />;
      case "auto_unlock_enabled":
        return <Lock className="h-5 w-5" />;
      case "trusted_device_expiry_days":
        return <Smartphone className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getSettingLabel = (key: string) => {
    switch (key) {
      case "max_failed_attempts":
        return "Số lần thất bại tối đa";
      case "alert_threshold":
        return "Ngưỡng cảnh báo";
      case "lockout_duration_minutes":
        return "Thời gian khóa (phút)";
      case "auto_unlock_enabled":
        return "Tự động mở khóa";
      case "trusted_device_expiry_days":
        return "Thời hạn thiết bị tin cậy (ngày)";
      default:
        return key;
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <Breadcrumb
          items={[
            { label: "Cài đặt", href: "/settings" },
            { label: "Cài đặt Bảo mật" },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Cài đặt Bảo mật Đăng nhập
            </h1>
            <p className="text-muted-foreground mt-1">
              Cấu hình các thông số bảo mật cho hệ thống đăng nhập
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || updateMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Hoàn tác
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Lưu thay đổi
            </Button>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Lưu ý quan trọng</AlertTitle>
          <AlertDescription>
            Các thay đổi sẽ được áp dụng ngay lập tức cho tất cả người dùng. Hãy cân nhắc kỹ trước khi thay đổi.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Failed Attempts Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Đăng nhập Thất bại
                </CardTitle>
                <CardDescription>
                  Cấu hình xử lý khi đăng nhập thất bại nhiều lần
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="alert_threshold" className="flex items-center gap-2">
                      Ngưỡng cảnh báo
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Số lần thất bại để gửi cảnh báo cho admin</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <span className="text-sm text-muted-foreground">1-50 lần</span>
                  </div>
                  <Input
                    id="alert_threshold"
                    type="number"
                    min={1}
                    max={50}
                    value={settings.alert_threshold || ""}
                    onChange={(e) => handleChange("alert_threshold", e.target.value)}
                    className="max-w-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Gửi thông báo cảnh báo khi đạt ngưỡng này
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="max_failed_attempts" className="flex items-center gap-2">
                      Số lần thất bại tối đa
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Khóa tài khoản sau số lần thất bại này</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <span className="text-sm text-muted-foreground">3-100 lần</span>
                  </div>
                  <Input
                    id="max_failed_attempts"
                    type="number"
                    min={3}
                    max={100}
                    value={settings.max_failed_attempts || ""}
                    onChange={(e) => handleChange("max_failed_attempts", e.target.value)}
                    className="max-w-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tài khoản sẽ bị khóa khi vượt quá số lần này
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Lockout Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-500" />
                  Khóa Tài khoản
                </CardTitle>
                <CardDescription>
                  Cấu hình thời gian và cách thức khóa tài khoản
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="lockout_duration_minutes" className="flex items-center gap-2">
                      Thời gian khóa
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Thời gian tài khoản bị khóa (phút)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <span className="text-sm text-muted-foreground">1-1440 phút</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="lockout_duration_minutes"
                      type="number"
                      min={1}
                      max={1440}
                      value={settings.lockout_duration_minutes || ""}
                      onChange={(e) => handleChange("lockout_duration_minutes", e.target.value)}
                      className="max-w-[120px]"
                    />
                    <span className="text-sm text-muted-foreground">
                      = {Math.floor(parseInt(settings.lockout_duration_minutes || "0") / 60)} giờ {parseInt(settings.lockout_duration_minutes || "0") % 60} phút
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto_unlock_enabled" className="flex items-center gap-2">
                      Tự động mở khóa
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Tự động mở khóa sau thời gian lockout</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Nếu tắt, admin phải mở khóa thủ công
                    </p>
                  </div>
                  <Switch
                    id="auto_unlock_enabled"
                    checked={settings.auto_unlock_enabled === "true"}
                    onCheckedChange={(checked) => handleChange("auto_unlock_enabled", checked ? "true" : "false")}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Trusted Device Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-green-500" />
                  Thiết bị Tin cậy
                </CardTitle>
                <CardDescription>
                  Cấu hình thời hạn cho thiết bị tin cậy (skip 2FA)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="trusted_device_expiry_days" className="flex items-center gap-2">
                      Thời hạn tin cậy
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Số ngày thiết bị được tin cậy trước khi hết hạn</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <span className="text-sm text-muted-foreground">1-365 ngày</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="trusted_device_expiry_days"
                      type="number"
                      min={1}
                      max={365}
                      value={settings.trusted_device_expiry_days || ""}
                      onChange={(e) => handleChange("trusted_device_expiry_days", e.target.value)}
                      className="max-w-[120px]"
                    />
                    <span className="text-sm text-muted-foreground">ngày</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sau thời gian này, người dùng phải xác thực 2FA lại
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Liên kết Nhanh
                </CardTitle>
                <CardDescription>
                  Truy cập nhanh các trang quản lý bảo mật
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/locked-accounts">
                  <Button variant="outline" className="w-full justify-start">
                    <Lock className="h-4 w-4 mr-2" />
                    Quản lý Tài khoản bị Khóa
                  </Button>
                </Link>
                <Link href="/login-history-detail">
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    Lịch sử Đăng nhập
                  </Button>
                </Link>
                <Link href="/trusted-devices">
                  <Button variant="outline" className="w-full justify-start">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Thiết bị Tin cậy
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
