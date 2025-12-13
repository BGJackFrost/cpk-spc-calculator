import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, TrendingUp, History, FileSpreadsheet, Settings, Activity, Users, Package, Ruler, Factory, Clock, Calendar, Mail, Shield, Server, Database, Wrench, Cog, GitBranch, FileText, BarChart3, AlertTriangle, Cpu, GitCompare, ArrowUpDown, Info, BookOpen, Layers, Key, Webhook, FileType, FolderClock, UserCog } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "../contexts/LanguageContext";

// Menu items with translation keys
const menuItemsConfig = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard" },
  { icon: Activity, labelKey: "nav.realtimeConveyor", path: "/production-lines" },
  { icon: Layers, labelKey: "nav.spcPlanOverview", path: "/spc-visualization" },
  { icon: TrendingUp, labelKey: "nav.analyze", path: "/analyze" },
  { icon: GitCompare, labelKey: "nav.multiObjectAnalysis", path: "/multi-analysis" },
  { icon: ArrowUpDown, labelKey: "nav.lineComparison", path: "/line-comparison" },
  { icon: History, labelKey: "nav.history", path: "/history" },
  { icon: BarChart3, labelKey: "nav.spcReport", path: "/spc-report" },
  { icon: AlertTriangle, labelKey: "nav.errorManagement", path: "/defects" },
  { icon: BarChart3, labelKey: "nav.paretoChart", path: "/defect-statistics" },
  { icon: FileSpreadsheet, labelKey: "nav.mappingManagement", path: "/mappings" },
  { icon: Package, labelKey: "nav.productManagement", path: "/products" },
  { icon: Ruler, labelKey: "nav.specificationManagement", path: "/specifications" },
  { icon: Factory, labelKey: "productionLine", path: "/production-line-management" },
  { icon: Wrench, labelKey: "workstation", path: "/workstations" },
  { icon: Cog, labelKey: "machine", path: "/machines" },
  { icon: Cpu, labelKey: "machineType", path: "/machine-types" },
  { icon: Wrench, labelKey: "fixture", path: "/fixtures" },
  { icon: GitBranch, labelKey: "process", path: "/processes" },
  { icon: Clock, labelKey: "samplingMethod", path: "/sampling-methods" },
  { icon: Calendar, labelKey: "nav.spcPlanManagement", path: "/spc-plans" },
  { icon: Mail, labelKey: "emailNotification", path: "/email-notifications" },
  { icon: Users, labelKey: "nav.userManagement", path: "/users" },
  { icon: UserCog, labelKey: "nav.localUserManagement", path: "/local-users", adminOnly: true },
  { icon: Shield, labelKey: "permission", path: "/permissions" },
  { icon: Server, labelKey: "smtpConfig", path: "/smtp-settings" },
  { icon: Database, labelKey: "seedData", path: "/seed-data" },
  { icon: FileText, labelKey: "nav.auditLog", path: "/audit-logs" },
  { icon: Settings, labelKey: "common.settings", path: "/settings" },
  { icon: BookOpen, labelKey: "nav.rulesManagement", path: "/rules" },
  { icon: Info, labelKey: "nav.about", path: "/about" },
  { icon: Key, labelKey: "nav.licenseManagement", path: "/license-management", adminOnly: true },
  { icon: Webhook, labelKey: "nav.webhookManagement", path: "/webhooks", adminOnly: true },
  { icon: FileType, labelKey: "nav.reportTemplates", path: "/report-templates", adminOnly: true },
  { icon: FolderClock, labelKey: "nav.exportHistory", path: "/export-history" },
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
};

const fallbackLabelsEn: Record<string, string> = {
  "productionLine": "Production Line Management",
  "workstation": "Workstation Management",
  "machine": "Machine Management",
  "machineType": "Machine Type",
  "fixture": "Fixture Management",
  "process": "Process Management",
  "samplingMethod": "Sampling Method",
  "emailNotification": "Email Notification",
  "permission": "Permissions",
  "smtpConfig": "SMTP Configuration",
  "seedData": "Seed Data",
  "nav.reportTemplates": "Report Templates",
  "nav.exportHistory": "Export History",
  "nav.localUserManagement": "Local Users",
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
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
  
  // Get label for menu item based on current language
  const getLabel = (labelKey: string) => {
    const translated = translate(labelKey);
    if (translated !== labelKey) return translated;
    const fallbackLabels = language === 'en' ? fallbackLabelsEn : fallbackLabelsVi;
    return fallbackLabels[labelKey] || labelKey;
  };
  
  const activeMenuItem = menuItemsConfig.find(item => item.path === location);
  const isMobile = useIsMobile();

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

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItemsConfig
                .filter(item => !item.adminOnly || user?.role === "admin")
                .map(item => {
                const isActive = location === item.path;
                const label = getLabel(item.labelKey);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <LanguageSwitcher variant="inline" className="px-1 py-1" />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t.common.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem ? getLabel(activeMenuItem.labelKey) : "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
