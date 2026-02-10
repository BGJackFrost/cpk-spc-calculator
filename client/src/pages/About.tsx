import { Key, CheckCircle, AlertCircle, Upload, Wifi, WifiOff, Fingerprint, RefreshCw, Building2, Calendar, Users as UsersIcon, Layers } from 'lucide-react';
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Info, 
  Server, 
  Database, 
  BarChart3, 
  Shield, 
  Clock, 
  Users, 
  Cpu,
  Activity,
  FileText,
  Copy,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const SYSTEM_VERSION = "4.0.0";
const BUILD_DATE = "2026-02-10";
const BUILD_NUMBER = "phase200-gd37";

const FEATURES = [
  { icon: BarChart3, name: "Tính toán SPC/CPK", description: "Tính toán Cp, Cpk, Pp, Ppk, Ca với control chart động" },
  { icon: Activity, name: "Giám sát Realtime", description: "Theo dõi dây chuyền sản xuất theo thời gian thực với WebSocket" },
  { icon: Database, name: "Quản lý Database", description: "Kết nối và truy vấn dữ liệu từ nhiều nguồn database" },
  { icon: FileText, name: "Báo cáo & Xuất Excel/PDF", description: "Tạo báo cáo SPC và xuất dữ liệu ra Excel/PDF" },
  { icon: Shield, name: "8 SPC Rules", description: "Phát hiện vi phạm theo 8 quy tắc SPC tiêu chuẩn" },
  { icon: Users, name: "Phân quyền người dùng", description: "Quản lý vai trò và quyền truy cập chi tiết" },
  { icon: Cpu, name: "Quản lý Máy & Fixture", description: "Theo dõi máy móc, loại máy và fixture" },
  { icon: Clock, name: "Kế hoạch SPC", description: "Lập lịch lấy mẫu và phân tích tự động" },
  { icon: Activity, name: "OEE Monitoring", description: "Theo dõi hiệu suất thiết bị tổng thể (OEE)" },
  { icon: Shield, name: "MMS Bảo trì", description: "Hệ thống quản lý bảo trì thiết bị" },
  { icon: Clock, name: "Offline Mode", description: "Hoạt động offline với đồng bộ dữ liệu" },
  { icon: Activity, name: "Push Notifications", description: "Thông báo đẩy realtime với âm thanh" },
];

const TECH_STACK = [
  { category: "Frontend", items: ["React 19", "TypeScript", "Tailwind CSS 4", "Recharts", "Radix UI"] },
  { category: "Backend", items: ["Node.js", "Express.js", "tRPC", "WebSocket"] },
  { category: "Database", items: ["PostgreSQL", "Drizzle ORM", "MySQL Support"] },
  { category: "Khác", items: ["Vite", "Vitest", "Zod Validation"] },
];

// Generate hardware fingerprint from browser
function generateBrowserFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
  }
  
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 0,
  ].join('|');
  
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(32, '0').substring(0, 32);
}

export default function About() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [hardwareFingerprint, setHardwareFingerprint] = useState("");
  const [activationMode, setActivationMode] = useState<"online" | "offline">("online");
  
  // Fetch active license from database
  const { data: activeLicense, refetch: refetchLicense } = trpc.license.getActive.useQuery();
  const activateOnlineMutation = trpc.license.activateOnline.useMutation();
  const activateOfflineMutation = trpc.license.activateOffline.useMutation();
  
  useEffect(() => {
    setHardwareFingerprint(generateBrowserFingerprint());
  }, []);
  
  const licenseStatus = {
    isActive: activeLicense?.isActive === 1,
    type: (activeLicense?.licenseType || "trial") as "trial" | "standard" | "professional" | "enterprise",
    expiresAt: activeLicense?.expiresAt ? new Date(activeLicense.expiresAt) : null,
    maxUsers: activeLicense?.maxUsers || 5,
    maxProductionLines: activeLicense?.maxProductionLines || 3,
  };

  const getLicenseTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      trial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      standard: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      professional: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      enterprise: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    const labels: Record<string, string> = {
      trial: "Dùng thử",
      standard: "Standard",
      professional: "Professional",
      enterprise: "Enterprise",
    };
    return <Badge className={styles[type] || ""}>{labels[type] || type}</Badge>;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Đã sao chép vào clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Không giới hạn";
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysRemaining = (date: Date | null) => {
    if (!date) return null;
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining(licenseStatus.expiresAt);
  
  const handleOnlineActivation = async () => {
    if (!licenseKey.trim()) {
      toast.error("Vui lòng nhập License Key");
      return;
    }
    
    try {
      await activateOnlineMutation.mutateAsync({
        licenseKey: licenseKey.trim(),
        hardwareFingerprint
      });
      toast.success("Kích hoạt license thành công!");
      refetchLicense();
      setLicenseKey("");
    } catch (error: any) {
      toast.error(error.message || "Kích hoạt thất bại");
    }
  };
  
  const handleOfflineActivation = async () => {
    if (!licenseFile) {
      toast.error("Vui lòng chọn file license (.lic)");
      return;
    }
    
    try {
      const fileContent = await licenseFile.text();
      await activateOfflineMutation.mutateAsync({
        licenseFileContent: fileContent,
        hardwareFingerprint
      });
      toast.success("Kích hoạt license offline thành công!");
      refetchLicense();
      setLicenseFile(null);
    } catch (error: any) {
      toast.error(error.message || "Kích hoạt thất bại");
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.lic')) {
        toast.error("Vui lòng chọn file có đuôi .lic");
        return;
      }
      setLicenseFile(file);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Info className="h-8 w-8" />
              Thông tin Hệ thống
            </h1>
            <p className="text-muted-foreground">
              Thông tin phiên bản, tính năng và quản lý license
            </p>
          </div>
        </div>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="license">Kích hoạt License</TabsTrigger>
            <TabsTrigger value="features">Tính năng</TabsTrigger>
            <TabsTrigger value="tech">Công nghệ</TabsTrigger>
          </TabsList>

          {/* System Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Thông tin Phiên bản
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Phiên bản</span>
                    <Badge variant="outline" className="font-mono">{SYSTEM_VERSION}</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Ngày build</span>
                    <span className="font-mono">{BUILD_DATE}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Build Number</span>
                    <span className="font-mono text-xs">{BUILD_NUMBER}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tên hệ thống</span>
                    <span className="font-semibold">SPC/CPK Calculator</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Môi trường</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Production</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Trạng thái License
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Loại license</span>
                    {getLicenseTypeBadge(licenseStatus.type)}
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Trạng thái</span>
                    {licenseStatus.isActive ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Đã kích hoạt
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Dùng thử
                      </Badge>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Hết hạn</span>
                    <span className={daysRemaining && daysRemaining < 30 ? "text-orange-600 font-semibold" : ""}>
                      {formatDate(licenseStatus.expiresAt)}
                      {daysRemaining && daysRemaining > 0 && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({daysRemaining} ngày)
                        </span>
                      )}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Số người dùng tối đa</span>
                    <span>{licenseStatus.maxUsers === -1 ? "Không giới hạn" : licenseStatus.maxUsers}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Số dây chuyền tối đa</span>
                    <span>{licenseStatus.maxProductionLines === -1 ? "Không giới hạn" : licenseStatus.maxProductionLines}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current User Info */}
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Thông tin Người dùng
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tên</span>
                      <span className="font-semibold">{user.name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Email</span>
                      <span>{user.email || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Vai trò</span>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role === "admin" ? "Quản trị viên" : "Người dùng"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* License Activation Tab (Hybrid) */}
          <TabsContent value="license" className="space-y-4">
            {/* Current License Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>Trạng thái License hiện tại</CardTitle>
                  </div>
                  {licenseStatus.isActive ? (
                    <Badge className="bg-green-500">Đang hoạt động</Badge>
                  ) : (
                    <Badge variant="secondary">Chưa kích hoạt</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {activeLicense ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Công ty</p>
                        <p className="font-medium">{activeLicense.companyName || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Key className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Loại License</p>
                        <p className="font-medium capitalize">{activeLicense.licenseType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Hết hạn</p>
                        <p className="font-medium">{formatDate(licenseStatus.expiresAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <UsersIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Số người dùng</p>
                        <p className="font-medium">{licenseStatus.maxUsers === -1 ? "Không giới hạn" : licenseStatus.maxUsers}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Chưa có license</AlertTitle>
                    <AlertDescription>
                      Vui lòng kích hoạt license để sử dụng đầy đủ tính năng của hệ thống.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
            
            {/* Hardware Fingerprint */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fingerprint className="h-5 w-5" />
                  Hardware Fingerprint
                </CardTitle>
                <CardDescription>
                  Mã định danh phần cứng dùng để xác thực license
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                    {hardwareFingerprint || "Đang tạo..."}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(hardwareFingerprint)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Activation Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Kích hoạt License (Hybrid)</CardTitle>
                <CardDescription>
                  Chọn phương thức kích hoạt phù hợp với môi trường của bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activationMode} onValueChange={(v) => setActivationMode(v as "online" | "offline")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="online" className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      Online
                    </TabsTrigger>
                    <TabsTrigger value="offline" className="flex items-center gap-2">
                      <WifiOff className="h-4 w-4" />
                      Offline
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="online" className="space-y-4 mt-4">
                    <Alert>
                      <Wifi className="h-4 w-4" />
                      <AlertTitle>Kích hoạt Online</AlertTitle>
                      <AlertDescription>
                        Nhập License Key để kích hoạt trực tiếp qua internet. Yêu cầu kết nối mạng.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2">
                      <Label htmlFor="license-key">License Key</Label>
                      <Input
                        id="license-key"
                        placeholder="VD: PRO-LK5M2X-A1B2-C3D4-E5F6"
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                      />
                    </div>
                    
                    <Button 
                      onClick={handleOnlineActivation}
                      disabled={activateOnlineMutation.isPending}
                      className="w-full"
                    >
                      {activateOnlineMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Đang kích hoạt...
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4 mr-2" />
                          Kích hoạt Online
                        </>
                      )}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="offline" className="space-y-4 mt-4">
                    <Alert>
                      <WifiOff className="h-4 w-4" />
                      <AlertTitle>Kích hoạt Offline</AlertTitle>
                      <AlertDescription>
                        Upload file license (.lic) được cấp bởi nhà cung cấp. Phù hợp cho môi trường không có internet.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2">
                      <Label htmlFor="license-file">File License (.lic)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="license-file"
                          type="file"
                          accept=".lic"
                          onChange={handleFileChange}
                          className="flex-1"
                        />
                      </div>
                      {licenseFile && (
                        <p className="text-sm text-muted-foreground">
                          Đã chọn: {licenseFile.name}
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      onClick={handleOfflineActivation}
                      disabled={activateOfflineMutation.isPending || !licenseFile}
                      className="w-full"
                    >
                      {activateOfflineMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Đang kích hoạt...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Kích hoạt Offline
                        </>
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tính năng Hệ thống</CardTitle>
                <CardDescription>
                  Danh sách các tính năng chính của hệ thống SPC/CPK Calculator
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {FEATURES.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-lg border">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{feature.name}</h4>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* License Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  So sánh các gói License
                </CardTitle>
                <CardDescription>Tính năng theo từng gói license</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-semibold">Tính năng</th>
                        <th className="text-center py-3 px-2"><Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Trial</Badge></th>
                        <th className="text-center py-3 px-2"><Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Standard</Badge></th>
                        <th className="text-center py-3 px-2"><Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Professional</Badge></th>
                        <th className="text-center py-3 px-2"><Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Enterprise</Badge></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { feature: "Tính toán SPC/CPK cơ bản", trial: true, standard: true, professional: true, enterprise: true },
                        { feature: "Control Charts (X̄-R, X̄-S)", trial: true, standard: true, professional: true, enterprise: true },
                        { feature: "8 SPC Rules Detection", trial: true, standard: true, professional: true, enterprise: true },
                        { feature: "Xuất Excel/PDF", trial: false, standard: true, professional: true, enterprise: true },
                        { feature: "OEE Monitoring", trial: false, standard: true, professional: true, enterprise: true },
                        { feature: "MMS Bảo trì", trial: false, standard: true, professional: true, enterprise: true },
                        { feature: "Số người dùng", trial: "5", standard: "20", professional: "50", enterprise: "∞" },
                        { feature: "Số dây chuyền", trial: "3", standard: "10", professional: "30", enterprise: "∞" },
                        { feature: "AI Anomaly Detection", trial: false, standard: false, professional: true, enterprise: true },
                        { feature: "AI Root Cause Analysis", trial: false, standard: false, professional: true, enterprise: true },
                        { feature: "AI Model Training", trial: false, standard: false, professional: true, enterprise: true },
                        { feature: "IoT Gateway Config", trial: false, standard: false, professional: true, enterprise: true },
                        { feature: "Scheduled Reports", trial: false, standard: false, professional: true, enterprise: true },
                        { feature: "Offline Mode", trial: false, standard: false, professional: false, enterprise: true },
                        { feature: "Custom Integrations", trial: false, standard: false, professional: false, enterprise: true },
                        { feature: "Priority Support", trial: false, standard: false, professional: false, enterprise: true },
                      ].map((row, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2.5 px-2 font-medium">{row.feature}</td>
                          {[row.trial, row.standard, row.professional, row.enterprise].map((val, j) => (
                            <td key={j} className="text-center py-2.5 px-2">
                              {typeof val === 'string' ? (
                                <span className="font-semibold">{val}</span>
                              ) : val ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          {/* Tech Stack Tab */}
          <TabsContent value="tech" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Công nghệ Sử dụng</CardTitle>
                <CardDescription>
                  Stack công nghệ được sử dụng để xây dựng hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {TECH_STACK.map((stack, index) => (
                    <div key={index} className="space-y-2">
                      <h4 className="font-semibold text-primary">{stack.category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {stack.items.map((item, i) => (
                          <Badge key={i} variant="outline">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thông tin Kỹ thuật</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex justify-between items-center p-3 rounded-lg border">
                    <span className="text-muted-foreground">Node.js Version</span>
                    <Badge variant="outline" className="font-mono">22.x</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg border">
                    <span className="text-muted-foreground">React Version</span>
                    <Badge variant="outline" className="font-mono">19.x</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg border">
                    <span className="text-muted-foreground">TypeScript</span>
                    <Badge variant="outline" className="font-mono">5.x</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg border">
                    <span className="text-muted-foreground">Database</span>
                    <Badge variant="outline" className="font-mono">PostgreSQL</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
