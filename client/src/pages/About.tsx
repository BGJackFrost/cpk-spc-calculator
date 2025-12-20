import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const SYSTEM_VERSION = "2.0.0";
const BUILD_DATE = "2024-12-12";

const FEATURES = [
  { icon: BarChart3, name: "Tính toán SPC/CPK", description: "Tính toán Cp, Cpk, Pp, Ppk, Ca với control chart động" },
  { icon: Activity, name: "Giám sát Realtime", description: "Theo dõi dây chuyền sản xuất theo thời gian thực với SSE" },
  { icon: Database, name: "Quản lý Database", description: "Kết nối và truy vấn dữ liệu từ nhiều nguồn database" },
  { icon: FileText, name: "Báo cáo & Xuất Excel", description: "Tạo báo cáo SPC và xuất dữ liệu ra Excel" },
  { icon: Shield, name: "8 SPC Rules", description: "Phát hiện vi phạm theo 8 quy tắc SPC tiêu chuẩn" },
  { icon: Users, name: "Phân quyền người dùng", description: "Quản lý vai trò và quyền truy cập chi tiết" },
  { icon: Cpu, name: "Quản lý Máy & Fixture", description: "Theo dõi máy móc, loại máy và fixture" },
  { icon: Clock, name: "Kế hoạch SPC", description: "Lập lịch lấy mẫu và phân tích tự động" },
];

const TECH_STACK = [
  { category: "Frontend", items: ["React 19", "TypeScript", "Tailwind CSS 4", "Recharts", "Radix UI"] },
  { category: "Backend", items: ["Node.js", "Express.js", "tRPC", "Server-Sent Events"] },
  { category: "Database", items: ["PostgreSQL", "Drizzle ORM", "MySQL Support"] },
  { category: "Khác", items: ["Vite", "Vitest", "Zod Validation"] },
];

export default function About() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  
  // Fetch active license from database
  const { data: activeLicense } = trpc.license.getActive.useQuery();
  
  const licenseStatus = {
    isActive: activeLicense?.isActive === 1,
    type: (activeLicense?.licenseType || "trial") as "trial" | "standard" | "professional" | "enterprise",
    expiresAt: activeLicense?.expiresAt ? new Date(activeLicense.expiresAt) : null,
    maxUsers: activeLicense?.maxUsers || 5,
    maxProductionLines: activeLicense?.maxProductionLines || 3,
  };

  const getLicenseTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      trial: "bg-yellow-100 text-yellow-800",
      standard: "bg-blue-100 text-blue-800",
      professional: "bg-purple-100 text-purple-800",
      enterprise: "bg-green-100 text-green-800",
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
                    <span className="text-muted-foreground">Tên hệ thống</span>
                    <span className="font-semibold">SPC/CPK Calculator</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Môi trường</span>
                    <Badge className="bg-green-100 text-green-800">Production</Badge>
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
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Đã kích hoạt
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">
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
