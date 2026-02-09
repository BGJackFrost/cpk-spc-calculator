import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemeSelector, THEMES, applyTheme, getCurrentTheme } from "@/components/ThemeSelector";
import { 
  Settings, 
  Palette, 
  Image, 
  Type, 
  Save, 
  Upload,
  Sun,
  Moon,
  Download,
  FileJson,
  Check,
  X,
  RefreshCw,
  Building2,
  Pin,
  Star,
  Loader2
} from "lucide-react";

export default function AppSettings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { theme, setTheme } = useTheme();
  const isAdmin = user?.role === "admin";
  
  // App settings state
  const [appTitle, setAppTitle] = useState("");
  const [appLogo, setAppLogo] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Quick Access settings state
  const [maxPinned, setMaxPinned] = useState(5);
  const [isSavingPinLimit, setIsSavingPinLimit] = useState(false);
  
  // Fetch current pin limit
  const { data: pinLimitData, refetch: refetchPinLimit } = trpc.quickAccess.getPinLimit.useQuery(
    undefined,
    {
      enabled: !!user,
      onSuccess: (data) => {
        setMaxPinned(data.maxPinned);
      },
    }
  );
  
  // Update pin limit mutation
  const updatePinLimitMutation = trpc.quickAccess.updatePinLimit.useMutation({
    onSuccess: (data) => {
      toast.success(
        language === "en" 
          ? `Pin limit updated to ${data.maxPinned}` 
          : `Đã cập nhật giới hạn ghim thành ${data.maxPinned}`
      );
      refetchPinLimit();
      setIsSavingPinLimit(false);
    },
    onError: (error) => {
      toast.error(
        language === "en" 
          ? "Failed to update pin limit" 
          : "Không thể cập nhật giới hạn ghim",
        { description: error.message }
      );
      setIsSavingPinLimit(false);
    },
  });
  
  const handleSavePinLimit = () => {
    if (!isAdmin) {
      toast.error(
        language === "en" 
          ? "Only admin can change this setting" 
          : "Chỉ admin mới có thể thay đổi cài đặt này"
      );
      return;
    }
    setIsSavingPinLimit(true);
    updatePinLimitMutation.mutate({ maxPinned });
  };
  
  // Theme state
  const [selectedTheme, setSelectedTheme] = useState(getCurrentTheme());
  
  // Load current settings
  useEffect(() => {
    // Load from env or localStorage
    setAppTitle(import.meta.env.VITE_APP_TITLE || localStorage.getItem("app-title") || "MMS/SPC");
    setAppLogo(import.meta.env.VITE_APP_LOGO || localStorage.getItem("app-logo") || "https://files.manuscdn.com/user_upload_by_module/session_file/310519663243606474/jLjFIplRgffsFopW.png");
    setCompanyName(localStorage.getItem("company-name") || "");
  }, []);
  
  // Save settings to localStorage (env vars can't be changed at runtime)
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem("app-title", appTitle);
      localStorage.setItem("app-logo", appLogo);
      localStorage.setItem("company-name", companyName);
      
      toast.success(language === "en" ? "Settings saved" : "Đã lưu cài đặt");
      
      // Reload to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      toast.error(language === "en" ? "Failed to save settings" : "Không thể lưu cài đặt");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle theme change
  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    const isDark = theme === "dark";
    applyTheme(themeId, isDark);
  };
  
  // Export theme
  const handleExportTheme = () => {
    const themeData = {
      themeId: selectedTheme,
      isDarkMode: theme === "dark",
      customSettings: {
        appTitle,
        appLogo,
        companyName,
      },
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `theme-${selectedTheme}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(language === "en" ? "Theme exported" : "Đã xuất giao diện");
  };
  
  // Import theme
  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.themeId) {
          setSelectedTheme(data.themeId);
          applyTheme(data.themeId, data.isDarkMode || false);
          
          if (data.isDarkMode) {
            setTheme("dark");
          } else {
            setTheme("light");
          }
        }
        
        if (data.customSettings) {
          if (data.customSettings.appTitle) setAppTitle(data.customSettings.appTitle);
          if (data.customSettings.appLogo) setAppLogo(data.customSettings.appLogo);
          if (data.customSettings.companyName) setCompanyName(data.customSettings.companyName);
        }
        
        toast.success(language === "en" ? "Theme imported" : "Đã nhập giao diện");
      } catch (error) {
        toast.error(language === "en" ? "Invalid theme file" : "File giao diện không hợp lệ");
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = "";
  };
  
  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              {language === "en" ? "Application Settings" : "Cài đặt Ứng dụng"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === "en" 
                ? "Customize your application appearance and branding" 
                : "Tùy chỉnh giao diện và thương hiệu ứng dụng"}
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="branding" className="space-y-4">
          <TabsList>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {language === "en" ? "Branding" : "Thương hiệu"}
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {language === "en" ? "Theme" : "Giao diện"}
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              {language === "en" ? "Export/Import" : "Xuất/Nhập"}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="quickaccess" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Quick Access
              </TabsTrigger>
            )}
          </TabsList>
          
          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  {language === "en" ? "Logo & Title" : "Logo & Tiêu đề"}
                </CardTitle>
                <CardDescription>
                  {language === "en" 
                    ? "Customize the application logo and title displayed in the header" 
                    : "Tùy chỉnh logo và tiêu đề hiển thị trên header"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Preview */}
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/50">
                    {appLogo ? (
                      <img 
                        src={appLogo} 
                        alt="Logo preview" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Image className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="logo-url">
                      {language === "en" ? "Logo URL" : "URL Logo"}
                    </Label>
                    <Input
                      id="logo-url"
                      value={appLogo}
                      onChange={(e) => setAppLogo(e.target.value)}
                      placeholder="/logo.png or https://..."
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === "en" 
                        ? "Enter a URL or path to your logo image" 
                        : "Nhập URL hoặc đường dẫn đến hình logo"}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                {/* App Title */}
                <div className="space-y-2">
                  <Label htmlFor="app-title" className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    {language === "en" ? "Application Title" : "Tiêu đề Ứng dụng"}
                  </Label>
                  <Input
                    id="app-title"
                    value={appTitle}
                    onChange={(e) => setAppTitle(e.target.value)}
                    placeholder="MMS/SPC"
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === "en" 
                      ? "This title appears in the header and browser tab" 
                      : "Tiêu đề này hiển thị trên header và tab trình duyệt"}
                  </p>
                </div>
                
                <Separator />
                
                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {language === "en" ? "Company Name" : "Tên Công ty"}
                  </Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={language === "en" ? "Your Company Name" : "Tên công ty của bạn"}
                  />
                </div>
                
                {/* Save Button */}
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {language === "en" ? "Save Changes" : "Lưu thay đổi"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Theme Tab */}
          <TabsContent value="theme" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  {language === "en" ? "Color Theme" : "Giao diện Màu sắc"}
                </CardTitle>
                <CardDescription>
                  {language === "en" 
                    ? "Choose a color theme for your application" 
                    : "Chọn giao diện màu sắc cho ứng dụng"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Moon className="h-5 w-5 text-primary" />
                    ) : (
                      <Sun className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {language === "en" ? "Dark Mode" : "Chế độ Tối"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {theme === "dark" 
                          ? (language === "en" ? "Currently using dark theme" : "Đang sử dụng giao diện tối")
                          : (language === "en" ? "Currently using light theme" : "Đang sử dụng giao diện sáng")}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>
                
                <Separator />
                
                {/* Theme Grid */}
                <div>
                  <Label className="mb-3 block">
                    {language === "en" ? "Select Theme" : "Chọn Giao diện"}
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {THEMES.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md ${
                          selectedTheme === t.id 
                            ? "border-primary ring-2 ring-primary/20" 
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {selectedTheme === t.id && (
                          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        
                        {/* Color Preview */}
                        <div className="flex gap-1 mb-2">
                          <div 
                            className="w-6 h-6 rounded-full border"
                            style={{ backgroundColor: t.preview.primary }}
                          />
                          <div 
                            className="w-6 h-6 rounded-full border"
                            style={{ backgroundColor: t.preview.secondary }}
                          />
                          <div 
                            className="w-6 h-6 rounded-full border"
                            style={{ backgroundColor: t.preview.accent }}
                          />
                        </div>
                        
                        <p className="font-medium text-sm">
                          {language === "en" ? t.name : t.nameVi}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {language === "en" ? t.description : t.descriptionVi}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Open Full Theme Selector */}
                <div className="flex justify-center pt-4">
                  <ThemeSelector />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Export/Import Tab */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  {language === "en" ? "Export & Import Theme" : "Xuất & Nhập Giao diện"}
                </CardTitle>
                <CardDescription>
                  {language === "en" 
                    ? "Share your theme settings with others or restore from a backup" 
                    : "Chia sẻ cài đặt giao diện với người khác hoặc khôi phục từ bản sao lưu"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Theme Info */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {language === "en" ? "Current Theme" : "Giao diện Hiện tại"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {THEMES.find(t => t.id === selectedTheme)?.name || selectedTheme}
                      </p>
                    </div>
                    <Badge variant={theme === "dark" ? "secondary" : "outline"}>
                      {theme === "dark" ? "Dark" : "Light"}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Export */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        {language === "en" ? "Export Theme" : "Xuất Giao diện"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {language === "en" 
                          ? "Download your current theme settings as a JSON file" 
                          : "Tải xuống cài đặt giao diện hiện tại dưới dạng file JSON"}
                      </p>
                      <Button onClick={handleExportTheme} className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        {language === "en" ? "Export to JSON" : "Xuất ra JSON"}
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {/* Import */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {language === "en" ? "Import Theme" : "Nhập Giao diện"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {language === "en" 
                          ? "Load theme settings from a JSON file" 
                          : "Tải cài đặt giao diện từ file JSON"}
                      </p>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportTheme}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button variant="outline" className="w-full">
                          <Upload className="h-4 w-4 mr-2" />
                          {language === "en" ? "Import from JSON" : "Nhập từ JSON"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Quick Access Settings Tab - Admin Only */}
          {isAdmin && (
            <TabsContent value="quickaccess" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pin className="h-5 w-5 text-amber-500" />
                    {language === "en" ? "Quick Access Settings" : "Cài đặt Quick Access"}
                  </CardTitle>
                  <CardDescription>
                    {language === "en" 
                      ? "Configure Quick Access behavior for all users" 
                      : "Cấu hình hành vi Quick Access cho tất cả người dùng"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pin Limit Setting */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-base font-medium flex items-center gap-2">
                          <Pin className="h-4 w-4" />
                          {language === "en" ? "Maximum Pinned Items" : "Số mục ghim tối đa"}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {language === "en" 
                            ? "Limit how many items each user can pin in Quick Access" 
                            : "Giới hạn số mục mỗi người dùng có thể ghim trong Quick Access"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={maxPinned}
                          onChange={(e) => setMaxPinned(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">
                          {language === "en" ? "items (1-20)" : "mục (1-20)"}
                        </span>
                      </div>
                      
                      <Button 
                        onClick={handleSavePinLimit}
                        disabled={isSavingPinLimit || maxPinned === pinLimitData?.maxPinned}
                        size="sm"
                      >
                        {isSavingPinLimit ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {language === "en" ? "Saving..." : "Đang lưu..."}
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {language === "en" ? "Save" : "Lưu"}
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* Current Status */}
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-amber-500/10">
                          <Pin className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {language === "en" ? "Current Setting" : "Cài đặt hiện tại"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {language === "en" 
                              ? `Users can pin up to ${pinLimitData?.maxPinned || 5} items` 
                              : `Người dùng có thể ghim tối đa ${pinLimitData?.maxPinned || 5} mục`}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-auto">
                          {pinLimitData?.maxPinned || 5} {language === "en" ? "max" : "tối đa"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Info */}
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {language === "en" 
                        ? "Changes apply immediately to all users" 
                        : "Thay đổi được áp dụng ngay cho tất cả người dùng"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      {language === "en" 
                        ? "Existing pins are not affected when reducing limit" 
                        : "Các mục đã ghim không bị ảnh hưởng khi giảm giới hạn"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
