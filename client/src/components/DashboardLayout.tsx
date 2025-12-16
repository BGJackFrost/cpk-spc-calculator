import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, LogOut, PanelLeft, TrendingUp, History, FileSpreadsheet, 
  Settings, Activity, Users, Package, Ruler, Factory, Clock, Calendar, 
  Mail, Shield, Server, Database, Wrench, Cog, GitBranch, FileText, 
  BarChart3, AlertTriangle, Cpu, GitCompare, ArrowUpDown, Info, BookOpen, 
  Layers, Key, Webhook, FileType, FolderClock, UserCog, ChevronRight,
  Gauge, ClipboardList, Building2, ShieldCheck, Boxes, Moon, Sun, Zap,
  Target, HardHat, Hammer, Truck, Brain, Bell, Download
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "../contexts/LanguageContext";
import { NotificationBell } from "./NotificationBell";
import { WebSocketIndicator } from "./WebSocketIndicator";

// Menu groups configuration
interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  path: string;
  adminOnly?: boolean;
}

interface MenuGroup {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
  defaultOpen?: boolean;
}

const menuGroups: MenuGroup[] = [
  {
    id: "dashboard",
    labelKey: "menuGroup.dashboard",
    icon: Gauge,
    defaultOpen: true,
    items: [
      { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard" },
      { icon: Zap, labelKey: "nav.realtimeLine", path: "/realtime-line" },
      { icon: Cpu, labelKey: "nav.machineOverview", path: "/machine-overview" },
      { icon: BarChart3, labelKey: "nav.machineStatusReport", path: "/machine-status-report" },
      { icon: Layers, labelKey: "nav.spcPlanOverview", path: "/spc-visualization" },
      { icon: Users, labelKey: "nav.supervisorDashboard", path: "/supervisor-dashboard" },
      { icon: GitCompare, labelKey: "nav.machineComparison", path: "/machine-comparison" },
    ]
  },
  {
    id: "dashboardConfig",
    labelKey: "menuGroup.dashboardConfig",
    icon: Settings,
    items: [
      { icon: Activity, labelKey: "nav.realtimeConveyor", path: "/production-lines" },
      { icon: Settings, labelKey: "nav.realtimeMachineConfig", path: "/realtime-machine-config", adminOnly: true },
      { icon: History, labelKey: "nav.realtimeHistory", path: "/realtime-history" },
      { icon: AlertTriangle, labelKey: "nav.alarmThreshold", path: "/alarm-threshold-config", adminOnly: true },
      { icon: Layers, labelKey: "nav.machineAreas", path: "/machine-areas", adminOnly: true },
    ]
  },
  {
    id: "mms",
    labelKey: "menuGroup.mms",
    icon: HardHat,
    items: [
      { icon: Target, labelKey: "nav.oeeDashboard", path: "/oee-dashboard" },
      { icon: BarChart3, labelKey: "nav.plantKpi", path: "/plant-kpi" },
      { icon: TrendingUp, labelKey: "nav.advancedAnalytics", path: "/advanced-analytics" },
      { icon: ClipboardList, labelKey: "nav.maintenanceDashboard", path: "/maintenance-dashboard" },
      { icon: Calendar, labelKey: "nav.maintenanceSchedule", path: "/maintenance-schedule" },
      { icon: Boxes, labelKey: "nav.spareParts", path: "/spare-parts" },
      { icon: Brain, labelKey: "nav.predictiveMaintenance", path: "/predictive-maintenance" },
      { icon: Cpu, labelKey: "nav.equipmentQr", path: "/equipment-qr" },
      { icon: Database, labelKey: "nav.mmsDataInit", path: "/mms-data-init", adminOnly: true },
    ]
  },
  {
    id: "mmsConfig",
    labelKey: "menuGroup.mmsConfig",
    icon: Cog,
    items: [
      { icon: Cpu, labelKey: "nav.iotGateway", path: "/iot-gateway", adminOnly: true },
      { icon: FileText, labelKey: "nav.reportsExport", path: "/reports-export" },
      { icon: Download, labelKey: "nav.exportReports", path: "/export-reports" },
      { icon: FileText, labelKey: "nav.customReportBuilder", path: "/custom-report-builder" },
      { icon: AlertTriangle, labelKey: "nav.alertConfig", path: "/alert-config", adminOnly: true },
      { icon: Target, labelKey: "nav.alertThresholdConfig", path: "/alert-threshold-config", adminOnly: true },
      { icon: Mail, labelKey: "nav.scheduledReports", path: "/scheduled-reports" },
      { icon: Clock, labelKey: "nav.shiftReports", path: "/shift-reports" },
      { icon: FileSpreadsheet, labelKey: "nav.exportRealtime", path: "/export-realtime" },
    ]
  },
  {
    id: "analysis",
    labelKey: "menuGroup.analysis",
    icon: TrendingUp,
    defaultOpen: true,
    items: [
      { icon: TrendingUp, labelKey: "nav.analyze", path: "/analyze" },
      { icon: GitCompare, labelKey: "nav.multiObjectAnalysis", path: "/multi-analysis" },
      { icon: ArrowUpDown, labelKey: "nav.lineComparison", path: "/line-comparison" },
      { icon: History, labelKey: "nav.history", path: "/history" },
      { icon: BarChart3, labelKey: "nav.spcReport", path: "/spc-report" },
    ]
  },
  {
    id: "quality",
    labelKey: "menuGroup.quality",
    icon: ClipboardList,
    items: [
      { icon: AlertTriangle, labelKey: "nav.defectTracking", path: "/defects" },
      { icon: BarChart3, labelKey: "nav.defectAnalysis", path: "/defect-statistics" },
      { icon: BookOpen, labelKey: "nav.spcRulesConfig", path: "/rules" },
      { icon: ShieldCheck, labelKey: "nav.customValidation", path: "/validation-rules", adminOnly: true },
      { icon: BarChart3, labelKey: "nav.cpkBenchmark", path: "/cpk-comparison" },
      { icon: Clock, labelKey: "nav.shiftAnalysis", path: "/shift-cpk-comparison" },
    ]
  },
  {
    id: "production",
    labelKey: "menuGroup.production",
    icon: Building2,
    items: [
      { icon: Factory, labelKey: "productionLine", path: "/production-line-management", adminOnly: true },
      { icon: Wrench, labelKey: "workstation", path: "/workstations", adminOnly: true },
      { icon: Cog, labelKey: "machine", path: "/machines", adminOnly: true },
      { icon: Cpu, labelKey: "machineType", path: "/machine-types", adminOnly: true },
      { icon: Wrench, labelKey: "fixture", path: "/fixtures", adminOnly: true },
      { icon: GitBranch, labelKey: "process", path: "/processes", adminOnly: true },
    ]
  },
  {
    id: "masterData",
    labelKey: "menuGroup.masterData",
    icon: Boxes,
    items: [
      { icon: Package, labelKey: "nav.productManagement", path: "/products", adminOnly: true },
      { icon: Ruler, labelKey: "nav.measurementStandards", path: "/measurement-standards", adminOnly: true },
      { icon: BarChart3, labelKey: "nav.measurementStandardsDashboard", path: "/measurement-standards-dashboard", adminOnly: true },
      { icon: FileSpreadsheet, labelKey: "nav.mappingManagement", path: "/mappings", adminOnly: true },
      { icon: Calendar, labelKey: "nav.spcPlanManagement", path: "/spc-plans", adminOnly: true },
      { icon: Zap, labelKey: "nav.quickSpcPlan", path: "/quick-spc-plan", adminOnly: true },
    ]
  },
  {
    id: "users",
    labelKey: "menuGroup.users",
    icon: Users,
    items: [
      { icon: Users, labelKey: "nav.userManagement", path: "/users" },
      { icon: UserCog, labelKey: "nav.localUserManagement", path: "/local-users", adminOnly: true },
      { icon: Shield, labelKey: "permission", path: "/permissions" },
      { icon: History, labelKey: "nav.loginHistory", path: "/login-history", adminOnly: true },
    ]
  },
  {
    id: "system",
    labelKey: "menuGroup.system",
    icon: ShieldCheck,
    items: [
      { icon: Settings, labelKey: "nav.settingsAndConnections", path: "/settings", adminOnly: true },
      { icon: Database, labelKey: "nav.databaseSettings", path: "/database-setting", adminOnly: true },
      { icon: FolderClock, labelKey: "nav.backupHistory", path: "/backup-history", adminOnly: true },
      { icon: Building2, labelKey: "nav.companyInfo", path: "/company-info", adminOnly: true },
      { icon: Mail, labelKey: "emailNotification", path: "/email-notifications", adminOnly: true },
      { icon: Server, labelKey: "smtpConfig", path: "/smtp-settings", adminOnly: true },
      { icon: Webhook, labelKey: "nav.webhookManagement", path: "/webhooks", adminOnly: true },
      { icon: Key, labelKey: "nav.licensePortal", path: "/license-activation" },
      { icon: FileText, labelKey: "nav.auditLog", path: "/audit-logs" },
      { icon: Database, labelKey: "seedData", path: "/seed-data", adminOnly: true },
      { icon: FileType, labelKey: "nav.reportTemplates", path: "/report-templates", adminOnly: true },
      { icon: FolderClock, labelKey: "nav.exportHistory", path: "/export-history" },
      { icon: Info, labelKey: "nav.about", path: "/about" },
      { icon: Bell, labelKey: "nav.notificationCenter", path: "/notification-center" },
      { icon: Clock, labelKey: "nav.scheduledJobs", path: "/scheduled-jobs", adminOnly: true },
      { icon: Shield, labelKey: "nav.rateLimitDashboard", path: "/rate-limit-dashboard", adminOnly: true },
    ]
  },
  {
    id: "licenseServer",
    labelKey: "menuGroup.licenseServer",
    icon: Shield,
    items: [
      { icon: Gauge, labelKey: "nav.licenseServerDashboard", path: "/license-server-dashboard", adminOnly: true },
      { icon: Key, labelKey: "nav.licenseManagement", path: "/license-management", adminOnly: true },
      { icon: Building2, labelKey: "nav.licenseCustomers", path: "/license-customers", adminOnly: true },
      { icon: BarChart3, labelKey: "nav.licenseRevenue", path: "/license-revenue", adminOnly: true },
      { icon: Server, labelKey: "nav.licenseServerSettings", path: "/license-server-settings", adminOnly: true },
    ]
  },
];

// Fallback labels for keys not in translation files (by language)
const fallbackLabelsVi: Record<string, string> = {
  "productionLine": "Quản lý Dây chuyền",
  "workstation": "Quản lý Công trạm",
  "machine": "Quản lý Máy",
  "machineType": "Loại Máy",
  "fixture": "Quản lý Fixture",
  "process": "Quản lý Quy trình",
  "samplingMethod": "Phương pháp Lấy mẫu",
  "emailNotification": "Thông báo Email",
  "permission": "Phân quyền",
  "smtpConfig": "Cấu hình SMTP",
  "seedData": "Khởi tạo Dữ liệu",
  "nav.reportTemplates": "Template Báo cáo",
  "nav.exportHistory": "Lịch sử Xuất",
  "nav.localUserManagement": "Người dùng Local",
  "nav.loginHistory": "Lịch sử Đăng nhập",
  "nav.licensePortal": "Cổng License",
  "nav.licenseAdmin": "Quản trị License",
  "nav.licenseServer": "License Server",
  "nav.connectionManager": "Quản lý Kết nối",
  "nav.companyInfo": "Thông tin Công ty",
  "menuGroup.dashboard": "Tổng quan",
  "menuGroup.dashboardConfig": "Cấu hình Dashboard",
  "menuGroup.mms": "MMS - Bảo trì",
  "menuGroup.mmsConfig": "Cấu hình MMS",
  "menuGroup.analysis": "Phân tích",
  "menuGroup.quality": "Chất lượng",
  "menuGroup.production": "Sản xuất",
  "menuGroup.masterData": "Dữ liệu chính",
  "menuGroup.users": "Người dùng",
  "menuGroup.system": "Hệ thống",
  "nav.mmsDataInit": "Khởi tạo Dữ liệu MMS",
  "nav.measurementStandards": "Tiêu chuẩn Đo",
  "nav.measurementStandardsDashboard": "Dashboard Tiêu chuẩn",
  "nav.quickSpcPlan": "Tạo nhanh SPC Plan",
  "nav.realtimeLine": "Dashboard RealTime",
  "nav.realtimeMachineConfig": "Cấu hình Máy Realtime",
  "nav.realtimeHistory": "Lịch sử Realtime",
  "nav.alarmThreshold": "Cấu hình Ngưỡng Alarm",
  "nav.machineOverview": "Tổng quan Máy móc",
  "nav.machineAreas": "Khu vực Máy",
  "nav.machineStatusReport": "Báo cáo Trạng thái",
  "menuGroup.oee": "OEE",
  "nav.oeeDashboard": "Dashboard OEE",
  "menuGroup.maintenance": "Bảo trì",
  "nav.maintenanceDashboard": "Dashboard Bảo trì",
  "nav.shiftCpkComparison": "So sánh CPK theo Ca",
  "nav.defectTracking": "Theo dõi Lỗi",
  "nav.defectAnalysis": "Phân tích Lỗi (Pareto)",
  "nav.spcRulesConfig": "Cấu hình SPC Rules",
  "nav.customValidation": "Kiểm tra Tùy chỉnh",
  "nav.cpkBenchmark": "So sánh CPK",
  "nav.shiftAnalysis": "Phân tích theo Ca",
  "menuGroup.licenseServer": "License Server",
  "nav.licenseManagement": "Quản lý License",
  "nav.licenseCustomers": "Quản lý Khách hàng",
  "nav.licenseRevenue": "Báo cáo Doanh thu",
  "nav.licenseServerSettings": "Cài đặt Server",
  "nav.licenseServerDashboard": "Dashboard Server",
  "nav.supervisorDashboard": "Dashboard Supervisor",
  "nav.machineComparison": "So sánh Máy",
  "nav.shiftReports": "Báo cáo theo Ca",
  "nav.notificationCenter": "Trung tâm Thông báo",
  "nav.scheduledJobs": "Quản lý Scheduled Jobs",
  "nav.rateLimitDashboard": "Giám sát Rate Limit",
  "nav.advancedAnalytics": "Phân tích Nâng cao",
  "nav.exportReports": "Xuất Báo cáo",
  "nav.customReportBuilder": "Tạo Báo cáo Tùy chỉnh",
};

const fallbackLabelsEn: Record<string, string> = {
  "productionLine": "Production Line",
  "workstation": "Workstation",
  "machine": "Machine",
  "machineType": "Machine Type",
  "fixture": "Fixture",
  "process": "Process",
  "samplingMethod": "Sampling Method",
  "emailNotification": "Email Notification",
  "permission": "Permissions",
  "smtpConfig": "SMTP Config",
  "seedData": "Seed Data",
  "nav.reportTemplates": "Report Templates",
  "nav.exportHistory": "Export History",
  "nav.localUserManagement": "Local Users",
  "nav.loginHistory": "Login History",
  "nav.licensePortal": "License Portal",
  "nav.licenseAdmin": "License Administration",
  "nav.licenseServer": "License Server",
  "nav.connectionManager": "Connection Manager",
  "nav.companyInfo": "Company Info",
  "menuGroup.dashboard": "Overview",
  "menuGroup.dashboardConfig": "Dashboard Config",
  "menuGroup.mms": "MMS - Maintenance",
  "menuGroup.mmsConfig": "MMS Config",
  "menuGroup.analysis": "Analysis",
  "menuGroup.quality": "Quality",
  "menuGroup.production": "Production",
  "menuGroup.masterData": "Master Data",
  "menuGroup.users": "Users",
  "menuGroup.system": "System",
  "nav.mmsDataInit": "MMS Data Init",
  "nav.measurementStandards": "Measurement Standards",
  "nav.measurementStandardsDashboard": "Standards Dashboard",
  "nav.quickSpcPlan": "Quick SPC Plan",
  "nav.realtimeLine": "Realtime Dashboard",
  "nav.realtimeMachineConfig": "Realtime Machine Config",
  "nav.realtimeHistory": "Realtime History",
  "nav.alarmThreshold": "Alarm Threshold Config",
  "nav.machineOverview": "Machine Overview",
  "nav.machineAreas": "Machine Areas",
  "nav.machineStatusReport": "Status Report",
  "menuGroup.licenseServer": "License Server",
  "nav.licenseManagement": "License Management",
  "nav.licenseCustomers": "Customer Management",
  "nav.licenseRevenue": "Revenue Report",
  "nav.licenseServerSettings": "Server Settings",
  "nav.licenseServerDashboard": "Server Dashboard",
  "nav.shiftCpkComparison": "Shift CPK Comparison",
  "nav.defectTracking": "Defect Tracking",
  "nav.defectAnalysis": "Defect Analysis (Pareto)",
  "nav.spcRulesConfig": "SPC Rules Config",
  "nav.customValidation": "Custom Validation",
  "nav.cpkBenchmark": "CPK Benchmark",
  "nav.shiftAnalysis": "Shift Analysis",
  "nav.supervisorDashboard": "Supervisor Dashboard",
  "nav.machineComparison": "Machine Comparison",
  "nav.shiftReports": "Shift Reports",
  "nav.notificationCenter": "Notification Center",
  "nav.scheduledJobs": "Scheduled Jobs",
  "nav.rateLimitDashboard": "Rate Limit Dashboard",
  "nav.advancedAnalytics": "Advanced Analytics",
  "nav.exportReports": "Export Reports",
  "nav.customReportBuilder": "Custom Report Builder",
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const MENU_OPEN_STATE_KEY = "menu-open-state";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { translate, t, language } = useLanguage();
  
  // Menu open state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(MENU_OPEN_STATE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    // Default: open groups that have defaultOpen or contain active item
    const defaults: Record<string, boolean> = {};
    menuGroups.forEach(group => {
      defaults[group.id] = group.defaultOpen || group.items.some(item => item.path === location);
    });
    return defaults;
  });

  // Save open state to localStorage
  useEffect(() => {
    localStorage.setItem(MENU_OPEN_STATE_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  // Get label for menu item based on current language
  const getLabel = (labelKey: string) => {
    const translated = translate(labelKey);
    if (translated !== labelKey) return translated;
    const fallbackLabels = language === 'en' ? fallbackLabelsEn : fallbackLabelsVi;
    return fallbackLabels[labelKey] || labelKey;
  };
  
  const isMobile = useIsMobile();
  const { theme, toggleTheme, switchable } = useTheme();
  
  // Theme Toggle Component
  const ThemeToggle = () => {
    if (!switchable || !toggleTheme) return null;
    return (
      <DropdownMenuItem onClick={toggleTheme}>
        {theme === 'dark' ? (
          <>
            <Sun className="mr-2 h-4 w-4" />
            {language === 'en' ? 'Light Mode' : 'Chế độ sáng'}
          </>
        ) : (
          <>
            <Moon className="mr-2 h-4 w-4" />
            {language === 'en' ? 'Dark Mode' : 'Chế độ tối'}
          </>
        )}
      </DropdownMenuItem>
    );
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Filter items based on user role
  const filterItems = (items: MenuItem[]) => {
    return items.filter(item => !item.adminOnly || user?.role === "admin");
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    SPC/CPK Calculator
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            {menuGroups.map(group => {
              const filteredItems = filterItems(group.items);
              if (filteredItems.length === 0) return null;
              
              const isGroupActive = filteredItems.some(item => item.path === location);
              const isOpen = openGroups[group.id] ?? group.defaultOpen ?? false;

              if (isCollapsed) {
                // When collapsed, show only icons
                return (
                  <SidebarMenu key={group.id} className="px-2 py-1">
                    {filteredItems.map(item => {
                      const isActive = location === item.path;
                      const label = getLabel(item.labelKey);
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setLocation(item.path)}
                            tooltip={label}
                            className="h-10 transition-all font-normal"
                          >
                            <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                            <span>{label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                );
              }

              return (
                <Collapsible
                  key={group.id}
                  open={isOpen}
                  onOpenChange={() => toggleGroup(group.id)}
                  className="group/collapsible"
                >
                  <div className="px-2 py-1">
                    <CollapsibleTrigger asChild>
                      <button
                        className={`flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent ${
                          isGroupActive ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <group.icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{getLabel(group.labelKey)}</span>
                        <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1">
                      <SidebarMenu>
                        {filteredItems.map(item => {
                          const isActive = location === item.path;
                          const label = getLabel(item.labelKey);
                          return (
                            <SidebarMenuItem key={item.path}>
                              <SidebarMenuButton
                                isActive={isActive}
                                onClick={() => setLocation(item.path)}
                                tooltip={label}
                                className="h-9 pl-9 transition-all font-normal"
                              >
                                <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                                <span className="truncate">{label}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </SidebarContent>

          <SidebarFooter className="p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 shrink-0">
                    {(user as any)?.avatar ? (
                      <AvatarImage src={(user as any).avatar} alt={user?.name || "User"} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {user?.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-sm font-medium truncate w-full">
                        {user?.name || "User"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate w-full">
                        {user?.email || ""}
                      </span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="px-2 py-1.5 text-sm font-medium">
                  {user?.name}
                </div>
                <div className="px-2 pb-2 text-xs text-muted-foreground">
                  {user?.email}
                </div>
                <div className="border-t my-1" />
                <LanguageSwitcher />
                <ThemeToggle />
                <div className="border-t my-1" />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    setLocation("/");
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {translate("common.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Nút Đăng xuất riêng biệt */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 mt-2"
              onClick={() => {
                logout();
                setLocation("/");
              }}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && translate("common.logout")}
            </Button>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        {!isCollapsed && !isMobile && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
          />
        )}
      </div>

      <SidebarInset className="flex flex-col min-h-screen">
        <header className="h-16 shrink-0 flex items-center gap-2 border-b px-4 lg:px-6">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <div className="flex-1" />
          <WebSocketIndicator />
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
