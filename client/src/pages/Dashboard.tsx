import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo, memo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import GuidedTour from "@/components/GuidedTour";
import { useGuidedTour, dashboardTourSteps } from "@/hooks/useGuidedTour";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  DashboardStatsGridSkeleton, 
  QuickActionsSkeleton, 
  WidgetGridSkeleton,
  RecentAnalysisListSkeleton 
} from "@/components/DashboardSkeletons";
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
  EyeOff,
  HelpCircle,
  ShieldCheck,
  XCircle,
  Activity,
  Camera
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
import { LicenseStatusWidget } from "@/components/LicenseStatusWidget";
import { WebhookRetryWidget } from "@/components/WebhookRetryWidget";
import { LowStockWidget } from "@/components/LowStockWidget";
import { ValidationRulesCard } from "@/components/ValidationRulesCard";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import NtfStatsWidget from "@/components/NtfStatsWidget";
import NtfAiMonitor from "@/components/NtfAiMonitor";
import UnifiedSummaryWidget from "@/components/UnifiedSummaryWidget";
import { ConnectionPoolWidget } from "@/components/ConnectionPoolWidget";
import CpkRealtimeAlertWidget from "@/components/CpkRealtimeAlertWidget";
import AiPredictedCpkDashboardWidget from "@/components/AiPredictedCpkDashboardWidget";
import AiDefectAlertsDashboardWidget from "@/components/AiDefectAlertsDashboardWidget";
import { AiOverviewDashboard } from "@/components/ai/AiOverviewWidgets";
import RadarChartHistoryWidget from "@/components/RadarChartHistoryWidget";
import CapacityStatsWidget from "@/components/CapacityStatsWidget";
import CapacityComparisonChart from "@/components/CapacityComparisonChart";
import { DashboardCameraWidget } from "@/components/DashboardCameraWidget";
import FloorPlanHeatMap from "@/components/FloorPlanHeatMap";
import DefectParetoChart from "@/components/DefectParetoChart";
import AutoNtfSuggestions from "@/components/AutoNtfSuggestions";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: mappings, isLoading: isLoadingMappings } = trpc.mapping.list.useQuery();
  const { data: history, isLoading: isLoadingHistory } = trpc.spc.history.useQuery({ limit: 10 });
  const { data: dashboardConfig, refetch: refetchConfig, isLoading: isLoadingConfig } = trpc.dashboardConfig.get.useQuery();
  const { data: defaultTemplate } = trpc.reportTemplate.getDefault.useQuery();
  const { data: validationRules, isLoading: isLoadingRules } = trpc.validationRule.list.useQuery();
  
  // Combined loading state
  const isInitialLoading = isLoadingMappings || isLoadingHistory || isLoadingConfig;
  
  // NTF Statistics for widget
  const { data: ntfStats } = trpc.defect.getNtfStatistics.useQuery({
    groupBy: "day",
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    endDate: new Date(),
  });
  
  // Guided Tour
  const { run, stepIndex, steps, handleCallback, startTour, isCompleted } = useGuidedTour("dashboard", dashboardTourSteps);
  
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
  
  // Validation Rules stats
  const activeValidationRules = useMemo(() => 
    validationRules?.filter(r => r.isActive === 1) || [],
    [validationRules]
  );

  // Memoize stats to prevent unnecessary re-renders
  const stats = useMemo(() => [
    {
      title: t.dashboard.mappingConfig,
      value: mappings?.length || 0,
      icon: Database,
      description: t.dashboard.productStationMappings,
      color: "text-chart-1",
    },
    {
      title: t.dashboard.recentAnalysis,
      value: totalAnalyses,
      icon: BarChart3,
      description: t.dashboard.inLast30Days,
      color: "text-chart-2",
    },
    {
      title: t.dashboard.cpkAlerts,
      value: recentAlerts.length,
      icon: AlertTriangle,
      description: t.dashboard.needReview,
      color: recentAlerts.length > 0 ? "text-destructive" : "text-chart-3",
    },
    {
      title: t.dashboard.systemStatus,
      value: recentAlerts.length === 0 ? t.dashboard.good : t.dashboard.warning,
      icon: recentAlerts.length === 0 ? CheckCircle2 : AlertTriangle,
      description: t.dashboard.productionSystem,
      color: recentAlerts.length === 0 ? "text-chart-3" : "text-warning",
    },
  ], [t, mappings?.length, totalAnalyses, recentAlerts.length]);

  // Memoize quick actions
  const quickActions = useMemo(() => [
    {
      title: t.dashboard.analyzeSpcCpk,
      description: t.dashboard.selectProductStation,
      icon: TrendingUp,
      href: "/analyze",
      primary: true,
    },
    {
      title: t.dashboard.analysisHistory,
      description: t.dashboard.viewPastAnalyses,
      icon: History,
      href: "/history",
    },
    {
      title: t.dashboard.manageMappings,
      description: t.dashboard.configureMapping,
      icon: FileSpreadsheet,
      href: "/mappings",
    },
    {
      title: t.dashboard.systemSettings,
      description: t.dashboard.configureDatabase,
      icon: Settings,
      href: "/settings",
    },
  ], [t]);

  return (
    <DashboardLayout>
      {/* Guided Tour */}
      <GuidedTour run={run} stepIndex={stepIndex} steps={steps} onCallback={handleCallback} />
      
      <div className="space-y-8 animate-fade-in">
        {/* Onboarding Wizard */}
        <OnboardingWizard />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Company Logo */}
            {defaultTemplate?.companyLogo && defaultTemplate?.showLogo === 1 && (
              <img 
                src={defaultTemplate.companyLogo} 
                alt={defaultTemplate.companyName || 'Company Logo'}
                className="h-14 w-auto object-contain"
              />
            )}
            <div className="flex flex-col gap-2">
              {/* Company Name */}
              {defaultTemplate?.companyName && defaultTemplate?.showCompanyName === 1 && (
                <span className="text-sm font-medium text-muted-foreground">
                  {defaultTemplate.companyName}
                </span>
              )}
              <h1 className="text-3xl font-bold tracking-tight">
                {t.dashboard.welcome}, {user?.name || "User"}
              </h1>
              <p className="text-muted-foreground">
                {t.dashboard.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  {t.dashboard.customize}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t.dashboard.showWidget}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={isWidgetVisible("mapping_count")}
                  onCheckedChange={() => handleToggleWidget("mapping_count")}
                >
                  {t.dashboard.mappingConfig}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={isWidgetVisible("recent_analysis")}
                  onCheckedChange={() => handleToggleWidget("recent_analysis")}
                >
                  {t.dashboard.recentAnalysis}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={isWidgetVisible("cpk_alerts")}
                  onCheckedChange={() => handleToggleWidget("cpk_alerts")}
                >
                  {t.dashboard.cpkAlerts}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={isWidgetVisible("system_status")}
                  onCheckedChange={() => handleToggleWidget("system_status")}
                >
                  {t.dashboard.systemStatus}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={isWidgetVisible("quick_actions")}
                  onCheckedChange={() => handleToggleWidget("quick_actions")}
                >
                  {t.dashboard.quickActions}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={isWidgetVisible("validation_rules")}
                  onCheckedChange={() => handleToggleWidget("validation_rules")}
                >
                  Validation Rules
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={isWidgetVisible("ntf_rate")}
                  onCheckedChange={() => handleToggleWidget("ntf_rate")}
                >
                  Tỉ lệ NTF
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={isWidgetVisible("connection_pool")}
                  onCheckedChange={() => handleToggleWidget("connection_pool")}
                >
                  Connection Pool Monitor
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={isWidgetVisible("radar_chart_history")}
                  onCheckedChange={() => handleToggleWidget("radar_chart_history")}
                >
                  Xu hướng CPK (Radar Chart)
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={isWidgetVisible("capacity_stats")}
                  onCheckedChange={() => handleToggleWidget("capacity_stats")}
                >
                  Công suất Factory/Workshop
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={isWidgetVisible("camera_streaming")}
                  onCheckedChange={() => handleToggleWidget("camera_streaming")}
                >
                  Camera Streaming
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isCompleted && (
              <Button variant="ghost" size="sm" onClick={startTour} title="Xem lại hướng dẫn">
                <HelpCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {isInitialLoading ? (
          <DashboardStatsGridSkeleton />
        ) : (
        <div data-tour="dashboard-stats" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const widgetKeys = ["mapping_count", "recent_analysis", "cpk_alerts", "system_status"];
            const widgetKey = widgetKeys[index];
            if (!isWidgetVisible(widgetKey)) return null;
            const IconComponent = stat.icon;
            const cardContent = (
              <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer">
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
            return (stat as any).href ? (
              <Link key={index} href={(stat as any).href}>
                {cardContent}
              </Link>
            ) : (
              <div key={index}>{cardContent}</div>
            );
          })}
        </div>
        )}

        {/* Quick Actions - Full Width */}
        {isWidgetVisible("quick_actions") && (
          isInitialLoading ? (
            <QuickActionsSkeleton />
          ) : (
          <div data-tour="quick-actions">
            <h2 className="text-xl font-semibold mb-4">{t.dashboard.quickActions}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <Link key={index} href={action.href}>
                    <Card 
                      className={`elegant-card cursor-pointer h-full ${action.primary ? 'border-primary/50 bg-primary/5' : ''}`}
                      data-tour={action.primary ? "analyze-button" : undefined}
                    >
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
          )
        )}

        {/* System Status - License, Webhook & Validation Rules */}
        <div data-tour="license-status">
          <h2 className="text-xl font-semibold mb-4">{t.dashboard.systemStatus}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <LicenseStatusWidget />
            <WebhookRetryWidget />
            <LowStockWidget />
            {isWidgetVisible("validation_rules") && <ValidationRulesCard />}
            
            {/* NTF Stats Widget - Enhanced */}
            {isWidgetVisible("ntf_rate") && <NtfStatsWidget />}
            
            {/* NTF AI Monitor */}
            {isWidgetVisible("ntf_rate") && user?.role === 'admin' && <NtfAiMonitor />}
            
            {/* Unified OEE & CPK Summary Widget */}
            <UnifiedSummaryWidget />
            
            {/* CPK Realtime Alert Widget */}
            <CpkRealtimeAlertWidget />
            
            {/* AI Predicted CPK Widget */}
            <AiPredictedCpkDashboardWidget />
            
            {/* AI Defect Alerts Widget */}
            <AiDefectAlertsDashboardWidget />
            
            {/* Connection Pool Monitoring Widget */}
            {user?.role === 'admin' && isWidgetVisible("connection_pool") && <ConnectionPoolWidget />}
            
            {/* Radar Chart History Widget - Xu hướng CPK */}
            {isWidgetVisible("radar_chart_history") && <RadarChartHistoryWidget />}
          </div>
        </div>
        
        {/* Capacity Stats Widget - Factory/Workshop */}
        {isWidgetVisible("capacity_stats") && (
          <div className="mt-2">
            <CapacityStatsWidget />
          </div>
        )}

        {/* Capacity Comparison Chart - So sánh công suất thực tế vs kế hoạch */}
        {isWidgetVisible("capacity_stats") && (
          <div className="mt-6">
            <CapacityComparisonChart />
          </div>
        )}

        {/* Camera Streaming Widget */}
        {isWidgetVisible("camera_streaming") && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-500" />
              Camera Streaming Realtime
            </h2>
            <DashboardCameraWidget maxCameras={4} layout="2x2" />
          </div>
        )}

        {/* AI Overview Dashboard Widgets */}
        <div className="mt-2">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            AI Overview - Dự đoán và Phân tích
          </h2>
          <AiOverviewDashboard />
        </div>

        {/* Heat Map Yield & Pareto Chart */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FloorPlanHeatMap />
          <DefectParetoChart />
        </div>

        {/* Auto-NTF Detection */}
        <div className="mt-6">
          <AutoNtfSuggestions />
        </div>

        {/* Recent Analyses */}
        {isLoadingHistory ? (
          <RecentAnalysisListSkeleton />
        ) : history && history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{t.dashboard.recentAnalysis}</h2>
              <Link href="/history">
                <Button variant="ghost" size="sm">
                  {t.common.viewAll}
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
