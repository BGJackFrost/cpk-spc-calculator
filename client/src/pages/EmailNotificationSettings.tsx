import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Mail, 
  Bell,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Save
} from "lucide-react";

export default function EmailNotificationSettings() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    notifyOnSpcViolation: true,
    notifyOnCaViolation: true,
    notifyOnCpkViolation: true,
    cpkThreshold: 133, // 1.33 * 100
    notifyFrequency: "immediate" as "immediate" | "hourly" | "daily",
  });

  // Fetch current settings
  const { data: settings, isLoading, refetch } = trpc.emailNotification.get.useQuery();

  // Update mutation
  const updateMutation = trpc.emailNotification.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật cài đặt thông báo thành công");
      refetch();
    },
    onError: (err: any) => {
      toast.error(`Lỗi: ${err.message}`);
    },
  });

  // Initialize form from settings
  useEffect(() => {
    if (settings) {
      setFormData({
        email: settings.email || user?.email || "",
        notifyOnSpcViolation: settings.notifyOnSpcViolation === 1,
        notifyOnCaViolation: settings.notifyOnCaViolation === 1,
        notifyOnCpkViolation: settings.notifyOnCpkViolation === 1,
        cpkThreshold: settings.cpkThreshold || 133,
        notifyFrequency: settings.notifyFrequency || "immediate",
      });
    } else if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email || "" }));
    }
  }, [settings, user]);

  const handleSave = () => {
    if (!formData.email) {
      toast.error("Vui lòng nhập địa chỉ email");
      return;
    }
    updateMutation.mutate(formData);
  };

  const frequencyLabels: Record<string, string> = {
    immediate: "Ngay lập tức",
    hourly: "Mỗi giờ",
    daily: "Hàng ngày",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cài đặt Thông báo Email</h1>
          <p className="text-muted-foreground mt-1">
            Cấu hình nhận thông báo khi phát hiện lỗi SPC, CA, CPK trên các dây chuyền
          </p>
        </div>

        {/* Email Settings Card */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Địa chỉ Email
            </CardTitle>
            <CardDescription>
              Email sẽ nhận thông báo khi có vi phạm quy tắc SPC
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email nhận thông báo</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Types Card */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Loại Thông báo
            </CardTitle>
            <CardDescription>
              Chọn loại vi phạm bạn muốn nhận thông báo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* SPC Rules Violation */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <Label className="font-medium">Vi phạm 8 SPC Rules</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Thông báo khi dữ liệu vi phạm các quy tắc Western Electric
                </p>
              </div>
              <Switch
                checked={formData.notifyOnSpcViolation}
                onCheckedChange={(v) => setFormData({ ...formData, notifyOnSpcViolation: v })}
              />
            </div>

            {/* CA Rules Violation */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <Label className="font-medium">Vi phạm CA Rules</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Thông báo khi chỉ số CA vượt ngưỡng cho phép
                </p>
              </div>
              <Switch
                checked={formData.notifyOnCaViolation}
                onCheckedChange={(v) => setFormData({ ...formData, notifyOnCaViolation: v })}
              />
            </div>

            {/* CPK Violation */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <Label className="font-medium">CPK dưới ngưỡng</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Thông báo khi CPK thấp hơn ngưỡng cảnh báo
                </p>
              </div>
              <Switch
                checked={formData.notifyOnCpkViolation}
                onCheckedChange={(v) => setFormData({ ...formData, notifyOnCpkViolation: v })}
              />
            </div>

            {/* CPK Threshold */}
            {formData.notifyOnCpkViolation && (
              <div className="space-y-2 pl-4 border-l-2 border-red-200">
                <Label>Ngưỡng CPK cảnh báo</Label>
                <Select 
                  value={formData.cpkThreshold.toString()} 
                  onValueChange={(v) => setFormData({ ...formData, cpkThreshold: parseInt(v) })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="167">1.67 (Xuất sắc)</SelectItem>
                    <SelectItem value="133">1.33 (Tốt)</SelectItem>
                    <SelectItem value="100">1.00 (Chấp nhận)</SelectItem>
                    <SelectItem value="67">0.67 (Cần cải tiến)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Bạn sẽ nhận thông báo khi CPK thấp hơn {(formData.cpkThreshold / 100).toFixed(2)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Frequency Card */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Tần suất Thông báo
            </CardTitle>
            <CardDescription>
              Chọn tần suất nhận email thông báo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Tần suất gửi email</Label>
              <Select 
                value={formData.notifyFrequency} 
                onValueChange={(v) => setFormData({ ...formData, notifyFrequency: v as "immediate" | "hourly" | "daily" })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Ngay lập tức</SelectItem>
                  <SelectItem value="hourly">Tổng hợp mỗi giờ</SelectItem>
                  <SelectItem value="daily">Tổng hợp hàng ngày</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.notifyFrequency === "immediate" && "Email sẽ được gửi ngay khi phát hiện vi phạm"}
                {formData.notifyFrequency === "hourly" && "Email tổng hợp các vi phạm sẽ được gửi mỗi giờ"}
                {formData.notifyFrequency === "daily" && "Email tổng hợp các vi phạm sẽ được gửi vào 8:00 sáng mỗi ngày"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending} size="lg">
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lưu cài đặt
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
