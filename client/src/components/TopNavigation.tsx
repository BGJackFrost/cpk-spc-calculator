import { cn } from "@/lib/utils";
import { useSystem } from "@/contexts/SystemContext";
import { SYSTEMS } from "@/config/systemMenu";
import { LayoutDashboard, Menu, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuickAccess } from "@/hooks/useQuickAccess";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// System labels
const systemLabels: Record<string, { vi: string; en: string; description: { vi: string; en: string } }> = {
  dashboard: { 
    vi: "Bảng điều khiển", 
    en: "Dashboard",
    description: { vi: "Tổng quan hệ thống", en: "System Overview" }
  },
  spc: { 
    vi: "SPC/CPK", 
    en: "SPC/CPK",
    description: { vi: "Kiểm soát quy trình thống kê", en: "Statistical Process Control" }
  },
  mms: { 
    vi: "MMS", 
    en: "MMS",
    description: { vi: "Hệ thống quản lý bảo trì", en: "Maintenance Management System" }
  },
  production: { 
    vi: "Sản xuất", 
    en: "Production",
    description: { vi: "Quản lý sản xuất & dữ liệu chính", en: "Production & Master Data" }
  },
  iot: { 
    vi: "IoT", 
    en: "IoT",
    description: { vi: "Gateway, Cảm biến & Thu thập dữ liệu", en: "Gateway, Sensors & Data Collection" }
  },
  aoi_avi: { 
    vi: "AOI/AVI", 
    en: "AOI/AVI",
    description: { vi: "Kiểm tra quang học & hình ảnh tự động", en: "Automated Optical/Visual Inspection" }
  },
  admin: { 
    vi: "Admin", 
    en: "Admin",
    description: { vi: "Quản trị & Giám sát Hệ thống", en: "System Administration & Monitoring" }
  },
  system: { 
    vi: "Hệ thống", 
    en: "System",
    description: { vi: "Cấu hình & quản trị hệ thống", en: "System Configuration & Admin" }
  },
  ai: { 
    vi: "AI", 
    en: "AI",
    description: { vi: "Trí tuệ nhân tạo & Học máy", en: "Artificial Intelligence & Machine Learning" }
  },
};

// Default paths for each system
const systemDefaultPaths: Record<string, string> = {
  dashboard: "/dashboard",
  spc: "/analyze",
  mms: "/oee-dashboard",
  production: "/production-line-management",
  iot: "/iot-dashboard",
  aoi_avi: "/avi-aoi-dashboard",
  admin: "/admin-dashboard",
  system: "/users",
  ai: "/ai-dashboard",
};

export function TopNavigation() {
  const { activeSystem, setActiveSystem } = useSystem();
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();
  const { quickAccessItems } = useQuickAccess();
  const isVi = language === "vi";
  const quickAccessCount = quickAccessItems.length;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const systems = [
    { id: "dashboard", config: SYSTEMS.DASHBOARD },
    { id: "spc", config: SYSTEMS.SPC },
    { id: "mms", config: SYSTEMS.MMS },
    { id: "production", config: SYSTEMS.PRODUCTION },
    { id: "iot", config: SYSTEMS.IOT },
    { id: "aoi_avi", config: SYSTEMS.AOI_AVI },
    { id: "ai", config: SYSTEMS.AI },
    { id: "admin", config: SYSTEMS.ADMIN },
    { id: "system", config: SYSTEMS.SYSTEM },
  ];

  const handleSystemClick = (systemId: string) => {
    // Set active system and navigate to default path
    setActiveSystem(systemId);
    setLocation(systemDefaultPaths[systemId]);
    setMobileMenuOpen(false);
  };

  // Get current system info
  const currentSystem = systems.find(s => s.id === activeSystem);
  const CurrentIcon = currentSystem?.config.icon || LayoutDashboard;
  const currentLabels = systemLabels[activeSystem] || systemLabels.dashboard;

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center gap-1">
        {systems.map(({ id, config }) => {
          const isActive = activeSystem === id;
          const Icon = config.icon;
          const labels = systemLabels[id];
          
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleSystemClick(id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative",
                    "hover:bg-accent/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="relative">
                    <Icon className="h-4 w-4" />
                    {id === 'dashboard' && quickAccessCount > 0 && (
                      <span className={cn(
                        "absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                        isActive 
                          ? "bg-primary-foreground text-primary" 
                          : "bg-primary text-primary-foreground"
                      )}>
                        {quickAccessCount > 9 ? '9+' : quickAccessCount}
                      </span>
                    )}
                  </div>
                  <span>{isVi ? labels.vi : labels.en}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="text-xs">{isVi ? labels.description.vi : labels.description.en}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Mobile Navigation - Dropdown Menu */}
      <div className="lg:hidden">
        <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2 h-9 px-3"
            >
              <CurrentIcon className="h-4 w-4" />
              <span className="max-w-[100px] truncate text-sm font-medium">
                {isVi ? currentLabels.vi : currentLabels.en}
              </span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="w-56"
            sideOffset={8}
          >
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {isVi ? "Chọn hệ thống" : "Select System"}
            </div>
            <DropdownMenuSeparator />
            {systems.map(({ id, config }) => {
              const isActive = activeSystem === id;
              const Icon = config.icon;
              const labels = systemLabels[id];
              
              return (
                <DropdownMenuItem
                  key={id}
                  onClick={() => handleSystemClick(id)}
                  className={cn(
                    "flex items-center gap-3 py-2.5 cursor-pointer",
                    isActive && "bg-accent"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isActive && "text-primary"
                    )}>
                      {isVi ? labels.vi : labels.en}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {isVi ? labels.description.vi : labels.description.en}
                    </p>
                  </div>
                  {id === 'dashboard' && quickAccessCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center bg-primary text-primary-foreground">
                      {quickAccessCount > 9 ? '9+' : quickAccessCount}
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

export default TopNavigation;
