import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Palette, Save, Eye } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function LoginCustomization() {
  const { data: customization, refetch } = trpc.localAuth.getLoginCustomization.useQuery();
  
  const [formData, setFormData] = useState({
    logoUrl: "",
    logoAlt: "Logo",
    welcomeTitle: "Chào mừng",
    welcomeSubtitle: "Đăng nhập để tiếp tục",
    primaryColor: "#3b82f6",
    secondaryColor: "#1e40af",
    backgroundGradient: "",
    footerText: "",
    showOauth: true,
    showRegister: true,
    customCss: "",
  });

  useEffect(() => {
    if (customization) {
      setFormData({
        logoUrl: customization.logoUrl || "",
        logoAlt: customization.logoAlt || "Logo",
        welcomeTitle: customization.welcomeTitle || "Chào mừng",
        welcomeSubtitle: customization.welcomeSubtitle || "Đăng nhập để tiếp tục",
        primaryColor: customization.primaryColor || "#3b82f6",
        secondaryColor: customization.secondaryColor || "#1e40af",
        backgroundGradient: customization.backgroundGradient || "",
        footerText: customization.footerText || "",
        showOauth: customization.showOauth ?? true,
        showRegister: customization.showRegister ?? true,
        customCss: customization.customCss || "",
      });
    }
  }, [customization]);

  const updateCustomization = trpc.localAuth.updateLoginCustomization.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu thay đổi");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCustomization.mutate({
      logoUrl: formData.logoUrl || null,
      logoAlt: formData.logoAlt,
      welcomeTitle: formData.welcomeTitle,
      welcomeSubtitle: formData.welcomeSubtitle,
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      backgroundGradient: formData.backgroundGradient || null,
      footerText: formData.footerText || null,
      showOauth: formData.showOauth,
      showRegister: formData.showRegister,
      customCss: formData.customCss || null,
    });
  };

  const openPreview = () => {
    window.open("/", "_blank");
  };

  return (
    <DashboardLayout>
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tùy chỉnh trang đăng nhập</h1>
              <p className="text-muted-foreground">Thay đổi giao diện trang đăng nhập</p>
            </div>
          </div>
          <Button variant="outline" onClick={openPreview}>
            <Eye className="w-4 h-4 mr-2" />
            Xem trước
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo & Thông điệp</CardTitle>
              <CardDescription>Tùy chỉnh logo và thông điệp chào mừng</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">URL Logo</Label>
                  <Input
                    id="logoUrl"
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoAlt">Alt text cho Logo</Label>
                  <Input
                    id="logoAlt"
                    value={formData.logoAlt}
                    onChange={(e) => setFormData({ ...formData, logoAlt: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcomeTitle">Tiêu đề chào mừng</Label>
                <Input
                  id="welcomeTitle"
                  value={formData.welcomeTitle}
                  onChange={(e) => setFormData({ ...formData, welcomeTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcomeSubtitle">Phụ đề</Label>
                <Input
                  id="welcomeSubtitle"
                  value={formData.welcomeSubtitle}
                  onChange={(e) => setFormData({ ...formData, welcomeSubtitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerText">Văn bản footer</Label>
                <Input
                  id="footerText"
                  placeholder="© 2024 Company Name"
                  value={formData.footerText}
                  onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Màu sắc</CardTitle>
              <CardDescription>Tùy chỉnh màu sắc theme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Màu chính</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Màu phụ</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="backgroundGradient">Background Gradient (CSS)</Label>
                <Input
                  id="backgroundGradient"
                  placeholder="linear-gradient(to right, #3b82f6, #1e40af)"
                  value={formData.backgroundGradient}
                  onChange={(e) => setFormData({ ...formData, backgroundGradient: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tùy chọn hiển thị</CardTitle>
              <CardDescription>Bật/tắt các tùy chọn đăng nhập</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Hiển thị đăng nhập OAuth</Label>
                  <p className="text-sm text-muted-foreground">Cho phép đăng nhập bằng Manus OAuth</p>
                </div>
                <Switch
                  checked={formData.showOauth}
                  onCheckedChange={(checked) => setFormData({ ...formData, showOauth: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Hiển thị đăng ký</Label>
                  <p className="text-sm text-muted-foreground">Cho phép người dùng mới đăng ký tài khoản</p>
                </div>
                <Switch
                  checked={formData.showRegister}
                  onCheckedChange={(checked) => setFormData({ ...formData, showRegister: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CSS tùy chỉnh</CardTitle>
              <CardDescription>Thêm CSS tùy chỉnh cho trang đăng nhập</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder=".login-card { border-radius: 16px; }"
                value={formData.customCss}
                onChange={(e) => setFormData({ ...formData, customCss: e.target.value })}
                rows={5}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateCustomization.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateCustomization.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
