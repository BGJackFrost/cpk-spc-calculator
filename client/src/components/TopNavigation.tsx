import { cn } from "@/lib/utils";
import { useSystem } from "@/contexts/SystemContext";
import { SYSTEMS } from "@/config/systemMenu";
import { LayoutDashboard } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  license: { 
    vi: "License", 
    en: "License",
    description: { vi: "Quản lý License Server", en: "License Server Management" }
  },
  system: { 
    vi: "Hệ thống", 
    en: "System",
    description: { vi: "Cấu hình & quản trị hệ thống", en: "System Configuration & Admin" }
  },
};

// Default paths for each system
const systemDefaultPaths: Record<string, string> = {
  dashboard: "/dashboard",
  spc: "/analyze",
  mms: "/oee-dashboard",
  production: "/production-line-management",
  license: "/license-server-dashboard",
  system: "/users",
};

export function TopNavigation() {
  const { activeSystem, setActiveSystem } = useSystem();
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();
  const isVi = language === "vi";

  const systems = [
    { id: "dashboard", config: SYSTEMS.DASHBOARD },
    { id: "spc", config: SYSTEMS.SPC },
    { id: "mms", config: SYSTEMS.MMS },
    { id: "production", config: SYSTEMS.PRODUCTION },
    { id: "license", config: SYSTEMS.LICENSE },
    { id: "system", config: SYSTEMS.SYSTEM },
  ];

  const handleSystemClick = (systemId: string) => {
    // Set active system and navigate to default path
    setActiveSystem(systemId);
    setLocation(systemDefaultPaths[systemId]);
  };



  return (
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
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  "hover:bg-accent/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
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
  );
}

export default TopNavigation;
