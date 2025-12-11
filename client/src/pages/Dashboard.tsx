import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3, 
  Database, 
  FileSpreadsheet, 
  History, 
  Settings, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  LayoutGrid,
  Eye,
  EyeOff
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: mappings } = trpc.mapping.list.useQuery();
  const { data: history } = trpc.spc.history.useQuery({ limit: 10 });
  const { data: dashboardConfig, refetch: refetchConfig } = trpc.dashboardConfig.get.useQuery();
  const toggleWidgetMutation = trpc.dashboardConfig.toggleWidget.useMutation({
    onSuccess: () => {
      refetchConfig();
      toast.success("Đã cập nhật cấu hình Dashboard");
    },
  });

  const isWidgetVisible = (key: string) => {
    if (!dashboardConfig) return true;
    const config = dashboardConfig.find(c => c.widgetKey === key);
    return config ? config.isVisible === 1 : true;
  };

  const handleToggleWidget = (key: string) => {
    const currentVisible = isWidgetVisible(key);
    toggleWidgetMutation.mutate({ widgetKey: key, isVisible: !currentVisible });
  };

  const recentAlerts = history?.filter(h => h.alertTriggered === 1) || [];
  const totalAnalyses = history?.length || 0;

  const stats = [
    {
      title: "Cấu hình Mapping",
      value: mappings?.length || 0,
      icon: Database,
      description: "Product-Station mappings",
      color: "text-chart-1",
    },
    {
      title: "Phân tích gần đây",
      value: totalAnalyses,
      icon: BarChart3,
      description: "Trong 30 ngày qua",
      color: "text-chart-2",
    },
    {
      title: "Cảnh báo CPK",
      value: recentAlerts.length,
      icon: AlertTriangle,
      description: "Cần xem xét",
      color: recentAlerts.length > 0 ? "text-destructive" : "text-chart-3",
    },
    {
      title: "Trạng thái",
      value: recentAlerts.length === 0 ? "Tốt" : "Cảnh báo",
      icon: recentAlerts.length === 0 ? CheckCircle2 : AlertTriangle,
      description: "Hệ thống sản xuất",
      color: recentAlerts.length === 0 ? "text-chart-3" : "text-warning",
    },
  ];

  const quickActions = [
    {
      title: "Phân tích SPC/CPK",
      description: "Chọn sản phẩm và trạm để phân tích",
      icon: TrendingUp,
      href: "/analyze",
      primary: true,
    },
    {
      title: "Lịch sử phân tích",
      description: "Xem các phân tích đã thực hiện",
      icon: History,
      href: "/history",
    },
    {
      title: "Quản lý Mapping",
      description: "Cấu hình product-station mapping",
      icon: FileSpreadsheet,
      href: "/mappings",
    },
    {
      title: "Cài đặt hệ thống",
      description: "Cấu hình database và cảnh báo",
      icon: Settings,
      href: "/settings",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Xin chào, {user?.name || "User"}
            </h1>
            <p className="text-muted-foreground">
              Hệ thống phân tích SPC/CPK cho quy trình sản xuất
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Tùy chỉnh
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Hiển thị Widget</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={isWidgetVisible("mapping_count")}
                onCheckedChange={() => handleToggleWidget("mapping_count")}
              >
                Cấu hình Mapping
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={isWidgetVisible("recent_analysis")}
                onCheckedChange={() => handleToggleWidget("recent_analysis")}
              >
                Phân tích gần đây
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={isWidgetVisible("cpk_alerts")}
                onCheckedChange={() => handleToggleWidget("cpk_alerts")}
              >
                Cảnh báo CPK
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={isWidgetVisible("system_status")}
                onCheckedChange={() => handleToggleWidget("system_status")}
              >
                Trạng thái hệ thống
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={isWidgetVisible("quick_actions")}
                onCheckedChange={() => handleToggleWidget("quick_actions")}
              >
                Thao tác nhanh
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const widgetKeys = ["mapping_count", "recent_analysis", "cpk_alerts", "system_status"];
            const widgetKey = widgetKeys[index];
            if (!isWidgetVisible(widgetKey)) return null;
            const IconComponent = stat.icon;
            return (
              <Card key={index} className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <IconComponent className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="stat-value">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        {isWidgetVisible("quick_actions") && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Thao tác nhanh</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <Link key={index} href={action.href}>
                    <Card className={`elegant-card cursor-pointer h-full ${action.primary ? 'border-primary/50 bg-primary/5' : ''}`}>
                      <CardHeader>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${action.primary ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                          <ActionIcon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">{action.title}</CardTitle>
                        <CardDescription>{action.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Analyses */}
        {history && history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Phân tích gần đây</h2>
              <Link href="/history">
                <Button variant="ghost" size="sm">
                  Xem tất cả
                </Button>
              </Link>
            </div>
            <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {history.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${item.alertTriggered ? 'bg-destructive' : 'bg-chart-3'}`} />
                        <div>
                          <p className="font-medium">{item.productCode} - {item.stationName}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-medium">
                          CPK: {item.cpk ? (item.cpk / 1000).toFixed(3) : 'N/A'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.sampleCount} mẫu
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
