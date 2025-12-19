import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, TrendingUp, History, FileSpreadsheet,
  Settings, Activity, Users, Package, Ruler, Factory, Clock, Calendar,
  Mail, Shield, Server, Database, Wrench, Cog, GitBranch, FileText,
  BarChart3, AlertTriangle, Cpu, GitCompare, ArrowUpDown, Info, BookOpen,
  Layers, Key, Webhook, FileType, FolderClock, UserCog, ChevronDown,
  Gauge, ClipboardList, Building2, ShieldCheck, Boxes, Zap,
  Target, HardHat, Hammer, Truck, Brain, Bell, Download, BellRing, Award, Thermometer
} from "lucide-react";
import React from "react";

// Top Navigation Menu Structure - Organized by System
interface NavItem {
  title: string;
  titleEn: string;
  href: string;
  description?: string;
  descriptionEn?: string;
  icon?: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  titleEn: string;
  items: NavItem[];
}

interface TopNavGroup {
  id: string;
  title: string;
  titleEn: string;
  icon: React.ComponentType<{ className?: string }>;
  sections: NavSection[];
}

const topNavGroups: TopNavGroup[] = [
  {
    id: "spc",
    title: "SPC/CPK",
    titleEn: "SPC/CPK",
    icon: TrendingUp,
    sections: [
      {
        title: "Tổng quan",
        titleEn: "Overview",
        items: [
          { title: "Dashboard", titleEn: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Tổng quan hệ thống SPC", descriptionEn: "SPC system overview" },
          { title: "Dashboard RealTime", titleEn: "Realtime Dashboard", href: "/realtime-line", icon: Zap, description: "Theo dõi dây chuyền realtime", descriptionEn: "Realtime line monitoring" },
          { title: "Tổng quan Máy móc", titleEn: "Machine Overview", href: "/machine-overview", icon: Cpu, description: "Trạng thái tất cả máy", descriptionEn: "All machines status" },
          { title: "SPC Plan Overview", titleEn: "SPC Plan Overview", href: "/spc-visualization", icon: Layers, description: "Trực quan hóa kế hoạch SPC", descriptionEn: "SPC plan visualization" },
        ]
      },
      {
        title: "Phân tích",
        titleEn: "Analysis",
        items: [
          { title: "Phân tích SPC/CPK", titleEn: "SPC/CPK Analysis", href: "/analyze", icon: TrendingUp, description: "Phân tích dữ liệu SPC", descriptionEn: "Analyze SPC data" },
          { title: "Phân tích Đa đối tượng", titleEn: "Multi-object Analysis", href: "/multi-analysis", icon: GitCompare, description: "So sánh nhiều sản phẩm/máy", descriptionEn: "Compare multiple products/machines" },
          { title: "So sánh Dây chuyền", titleEn: "Line Comparison", href: "/line-comparison", icon: ArrowUpDown, description: "So sánh CPK giữa các dây chuyền", descriptionEn: "Compare CPK between lines" },
          { title: "Lịch sử Phân tích", titleEn: "Analysis History", href: "/history", icon: History, description: "Xem lịch sử phân tích", descriptionEn: "View analysis history" },
          { title: "Báo cáo SPC", titleEn: "SPC Report", href: "/spc-report", icon: BarChart3, description: "Báo cáo tổng hợp SPC", descriptionEn: "SPC summary report" },
        ]
      },
      {
        title: "Chất lượng",
        titleEn: "Quality",
        items: [
          { title: "Theo dõi Lỗi", titleEn: "Defect Tracking", href: "/defects", icon: AlertTriangle, description: "Quản lý và theo dõi lỗi", descriptionEn: "Manage and track defects" },
          { title: "Phân tích Lỗi (Pareto)", titleEn: "Defect Analysis", href: "/defect-statistics", icon: BarChart3, description: "Biểu đồ Pareto phân tích lỗi", descriptionEn: "Pareto chart defect analysis" },
          { title: "Cấu hình SPC Rules", titleEn: "SPC Rules Config", href: "/rules", icon: BookOpen, description: "Cấu hình các quy tắc SPC", descriptionEn: "Configure SPC rules" },
          { title: "So sánh CPK", titleEn: "CPK Comparison", href: "/cpk-comparison", icon: BarChart3, description: "So sánh CPK giữa các đối tượng", descriptionEn: "Compare CPK between objects" },
          { title: "Phân tích theo Ca", titleEn: "Shift Analysis", href: "/shift-cpk-comparison", icon: Clock, description: "Phân tích CPK theo ca làm việc", descriptionEn: "CPK analysis by shift" },
        ]
      },
    ]
  },
  {
    id: "mms",
    title: "MMS",
    titleEn: "MMS",
    icon: HardHat,
    sections: [
      {
        title: "Tổng quan",
        titleEn: "Overview",
        items: [
          { title: "Dashboard OEE", titleEn: "OEE Dashboard", href: "/oee-dashboard", icon: Target, description: "Theo dõi hiệu suất OEE", descriptionEn: "Monitor OEE performance" },
          { title: "Dashboard Tổng hợp", titleEn: "Unified Dashboard", href: "/unified-dashboard", icon: Gauge, description: "Dashboard OEE + CPK", descriptionEn: "OEE + CPK Dashboard" },
          { title: "KPI Nhà máy", titleEn: "Plant KPI", href: "/plant-kpi", icon: BarChart3, description: "Các chỉ số KPI nhà máy", descriptionEn: "Plant KPI metrics" },
          { title: "Dashboard Bảo trì", titleEn: "Maintenance Dashboard", href: "/maintenance-dashboard", icon: ClipboardList, description: "Tổng quan bảo trì", descriptionEn: "Maintenance overview" },
        ]
      },
      {
        title: "Bảo trì",
        titleEn: "Maintenance",
        items: [
          { title: "Lịch Bảo trì", titleEn: "Maintenance Schedule", href: "/maintenance-schedule", icon: Calendar, description: "Lịch bảo trì định kỳ", descriptionEn: "Scheduled maintenance" },
          { title: "Bảo trì Dự đoán", titleEn: "Predictive Maintenance", href: "/predictive-maintenance", icon: Brain, description: "Dự đoán hỏng hóc", descriptionEn: "Predict failures" },
          { title: "Tra cứu Thiết bị QR", titleEn: "Equipment QR Lookup", href: "/equipment-qr", icon: Cpu, description: "Tra cứu thiết bị qua QR", descriptionEn: "Lookup equipment via QR" },
        ]
      },
      {
        title: "Kho Phụ tùng",
        titleEn: "Spare Parts",
        items: [
          { title: "Quản lý Phụ tùng", titleEn: "Spare Parts Management", href: "/spare-parts", icon: Boxes, description: "Quản lý kho phụ tùng", descriptionEn: "Manage spare parts inventory" },
          { title: "Báo cáo Chi phí", titleEn: "Cost Report", href: "/spare-parts-cost-report", icon: BarChart3, description: "Báo cáo chi phí phụ tùng", descriptionEn: "Spare parts cost report" },
          { title: "Hướng dẫn Sử dụng", titleEn: "User Guide", href: "/spare-parts-guide", icon: BookOpen, description: "Hướng dẫn quản lý kho", descriptionEn: "Inventory management guide" },
        ]
      },
    ]
  },
  {
    id: "production",
    title: "Sản xuất",
    titleEn: "Production",
    icon: Factory,
    sections: [
      {
        title: "Quản lý Sản xuất",
        titleEn: "Production Management",
        items: [
          { title: "Dây chuyền Sản xuất", titleEn: "Production Lines", href: "/production-line-management", icon: Factory, description: "Quản lý dây chuyền", descriptionEn: "Manage production lines", adminOnly: true },
          { title: "Công trạm", titleEn: "Workstations", href: "/workstations", icon: Wrench, description: "Quản lý công trạm", descriptionEn: "Manage workstations", adminOnly: true },
          { title: "Máy móc", titleEn: "Machines", href: "/machines", icon: Cog, description: "Quản lý máy móc", descriptionEn: "Manage machines", adminOnly: true },
          { title: "Loại Máy", titleEn: "Machine Types", href: "/machine-types", icon: Cpu, description: "Quản lý loại máy", descriptionEn: "Manage machine types", adminOnly: true },
          { title: "Fixture", titleEn: "Fixtures", href: "/fixtures", icon: Wrench, description: "Quản lý fixture", descriptionEn: "Manage fixtures", adminOnly: true },
          { title: "Quy trình", titleEn: "Processes", href: "/processes", icon: GitBranch, description: "Quản lý quy trình", descriptionEn: "Manage processes", adminOnly: true },
        ]
      },
      {
        title: "Dữ liệu Chính",
        titleEn: "Master Data",
        items: [
          { title: "Sản phẩm", titleEn: "Products", href: "/products", icon: Package, description: "Quản lý sản phẩm", descriptionEn: "Manage products", adminOnly: true },
          { title: "Tiêu chuẩn Đo", titleEn: "Measurement Standards", href: "/measurement-standards", icon: Ruler, description: "Tiêu chuẩn đo lường", descriptionEn: "Measurement standards", adminOnly: true },
          { title: "Mapping", titleEn: "Mappings", href: "/mappings", icon: FileSpreadsheet, description: "Cấu hình mapping", descriptionEn: "Configure mappings", adminOnly: true },
          { title: "Kế hoạch SPC", titleEn: "SPC Plans", href: "/spc-plans", icon: Calendar, description: "Quản lý kế hoạch SPC", descriptionEn: "Manage SPC plans", adminOnly: true },
        ]
      },
    ]
  },
  {
    id: "system",
    title: "Hệ thống",
    titleEn: "System",
    icon: Settings,
    sections: [
      {
        title: "Người dùng",
        titleEn: "Users",
        items: [
          { title: "Quản lý Người dùng", titleEn: "User Management", href: "/users", icon: Users, description: "Quản lý tài khoản", descriptionEn: "Manage accounts" },
          { title: "Người dùng Local", titleEn: "Local Users", href: "/local-users", icon: UserCog, description: "Quản lý user local", descriptionEn: "Manage local users", adminOnly: true },
          { title: "Cấu trúc Tổ chức", titleEn: "Organization", href: "/organization", icon: Building2, description: "Quản lý tổ chức", descriptionEn: "Manage organization", adminOnly: true },
          { title: "Phân quyền", titleEn: "Permissions", href: "/module-permissions", icon: Shield, description: "Phân quyền người dùng", descriptionEn: "User permissions", adminOnly: true },
        ]
      },
      {
        title: "Cấu hình",
        titleEn: "Configuration",
        items: [
          { title: "Cài đặt", titleEn: "Settings", href: "/settings", icon: Settings, description: "Cài đặt hệ thống", descriptionEn: "System settings", adminOnly: true },
          { title: "Quản lý Database", titleEn: "Database Management", href: "/database-unified", icon: Database, description: "Quản lý kết nối DB", descriptionEn: "Manage DB connections", adminOnly: true },
          { title: "Backup & Restore", titleEn: "Backup & Restore", href: "/backup-history", icon: FolderClock, description: "Sao lưu và khôi phục", descriptionEn: "Backup and restore", adminOnly: true },
          { title: "Thông tin Công ty", titleEn: "Company Info", href: "/company-info", icon: Building2, description: "Thông tin công ty", descriptionEn: "Company information", adminOnly: true },
          { title: "Cấu hình SMTP", titleEn: "SMTP Config", href: "/smtp-settings", icon: Mail, description: "Cấu hình email", descriptionEn: "Email configuration", adminOnly: true },
          { title: "Webhook", titleEn: "Webhooks", href: "/webhooks", icon: Webhook, description: "Quản lý webhook", descriptionEn: "Manage webhooks", adminOnly: true },
        ]
      },
      {
        title: "Khác",
        titleEn: "Others",
        items: [
          { title: "License", titleEn: "License", href: "/license-activation", icon: Key, description: "Kích hoạt license", descriptionEn: "Activate license" },
          { title: "Audit Log", titleEn: "Audit Log", href: "/audit-logs", icon: FileText, description: "Nhật ký hệ thống", descriptionEn: "System logs" },
          { title: "Thông tin Hệ thống", titleEn: "About", href: "/about", icon: Info, description: "Thông tin phiên bản", descriptionEn: "Version information" },
        ]
      },
    ]
  },
];

// ListItem component for navigation menu
const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { 
    title: string; 
    icon?: React.ComponentType<{ className?: string }>;
    adminOnly?: boolean;
    isAdmin?: boolean;
  }
>(({ className, title, children, icon: Icon, adminOnly, isAdmin, ...props }, ref) => {
  // Hide admin-only items for non-admin users
  if (adminOnly && !isAdmin) return null;
  
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-2 text-sm font-medium leading-none">
            {Icon && <Icon className="h-4 w-4" />}
            {title}
            {adminOnly && (
              <span className="ml-1 text-[10px] px-1 py-0.5 bg-orange-100 text-orange-700 rounded">Admin</span>
            )}
          </div>
          <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

export function TopNavigation() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [location] = useLocation();
  const isAdmin = user?.role === "admin";
  const isVi = language === "vi";

  return (
    <NavigationMenu className="hidden lg:flex">
      <NavigationMenuList>
        {topNavGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <NavigationMenuItem key={group.id}>
              <NavigationMenuTrigger className="h-9 px-3 gap-1">
                <GroupIcon className="h-4 w-4" />
                <span>{isVi ? group.title : group.titleEn}</span>
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid gap-3 p-4 w-[600px] lg:w-[800px] lg:grid-cols-3">
                  {group.sections.map((section, idx) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground px-3">
                        {isVi ? section.title : section.titleEn}
                      </h4>
                      <ul className="space-y-1">
                        {section.items.map((item) => (
                          <ListItem
                            key={item.href}
                            title={isVi ? item.title : item.titleEn}
                            href={item.href}
                            icon={item.icon}
                            adminOnly={item.adminOnly}
                            isAdmin={isAdmin}
                          >
                            {isVi ? item.description : item.descriptionEn}
                          </ListItem>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

export default TopNavigation;
