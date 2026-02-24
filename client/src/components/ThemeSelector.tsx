import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Check, Plus, Trash2, Save, Eye, ImageIcon } from "lucide-react";
import { ImageThemeExtractor } from "./ImageThemeExtractor";
import { AdvancedColorPicker } from "./AdvancedColorPicker";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

// Theme definitions
export interface ThemeConfig {
  id: string;
  name: string;
  nameVi: string;
  description: string;
  descriptionVi: string;
  preview: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
  };
  cssVariables: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

export const THEMES: ThemeConfig[] = [
  {
    id: "default-blue",
    name: "Default Blue",
    nameVi: "Xanh Dương Mặc Định",
    description: "Professional blue theme with clean design",
    descriptionVi: "Giao diện xanh dương chuyên nghiệp, thiết kế sạch sẽ",
    preview: {
      primary: "#3b82f6",
      secondary: "#6366f1",
      accent: "#8b5cf6",
      background: "#ffffff",
      foreground: "#0f172a",
    },
    cssVariables: {
      light: {
        "--primary": "217.2 91.2% 59.8%",
        "--primary-foreground": "210 40% 98%",
        "--secondary": "210 40% 96.1%",
        "--secondary-foreground": "222.2 47.4% 11.2%",
        "--accent": "210 40% 96.1%",
        "--accent-foreground": "222.2 47.4% 11.2%",
        "--muted": "210 40% 96.1%",
        "--muted-foreground": "215.4 16.3% 46.9%",
      },
      dark: {
        "--primary": "217.2 91.2% 59.8%",
        "--primary-foreground": "222.2 47.4% 11.2%",
        "--secondary": "217.2 32.6% 17.5%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "217.2 32.6% 17.5%",
        "--accent-foreground": "210 40% 98%",
        "--muted": "217.2 32.6% 17.5%",
        "--muted-foreground": "215 20.2% 65.1%",
      },
    },
  },
  {
    id: "green-nature",
    name: "Green Nature",
    nameVi: "Xanh Lá Thiên Nhiên",
    description: "Fresh green theme inspired by nature",
    descriptionVi: "Giao diện xanh lá tươi mát, lấy cảm hứng từ thiên nhiên",
    preview: {
      primary: "#22c55e",
      secondary: "#10b981",
      accent: "#14b8a6",
      background: "#f0fdf4",
      foreground: "#14532d",
    },
    cssVariables: {
      light: {
        "--primary": "142.1 76.2% 36.3%",
        "--primary-foreground": "355.7 100% 97.3%",
        "--secondary": "160 84.1% 39.4%",
        "--secondary-foreground": "144.9 80.4% 10%",
        "--accent": "168 83.8% 38.2%",
        "--accent-foreground": "166 76.5% 8%",
        "--muted": "138 76.5% 96.7%",
        "--muted-foreground": "143 16.3% 46.9%",
      },
      dark: {
        "--primary": "142.1 70.6% 45.3%",
        "--primary-foreground": "144.9 80.4% 10%",
        "--secondary": "160 64.4% 29.4%",
        "--secondary-foreground": "138 76.5% 96.7%",
        "--accent": "168 63.8% 28.2%",
        "--accent-foreground": "138 76.5% 96.7%",
        "--muted": "142 32.6% 17.5%",
        "--muted-foreground": "143 20.2% 65.1%",
      },
    },
  },
  {
    id: "purple-elegant",
    name: "Purple Elegant",
    nameVi: "Tím Sang Trọng",
    description: "Elegant purple theme with sophisticated feel",
    descriptionVi: "Giao diện tím sang trọng, tinh tế",
    preview: {
      primary: "#a855f7",
      secondary: "#8b5cf6",
      accent: "#d946ef",
      background: "#faf5ff",
      foreground: "#3b0764",
    },
    cssVariables: {
      light: {
        "--primary": "270 91% 65%",
        "--primary-foreground": "270 100% 98%",
        "--secondary": "263 70% 50%",
        "--secondary-foreground": "270 100% 98%",
        "--accent": "292 91% 73%",
        "--accent-foreground": "292 80% 10%",
        "--muted": "270 76.5% 96.7%",
        "--muted-foreground": "270 16.3% 46.9%",
      },
      dark: {
        "--primary": "270 91% 65%",
        "--primary-foreground": "270 80% 10%",
        "--secondary": "263 50% 40%",
        "--secondary-foreground": "270 100% 98%",
        "--accent": "292 71% 53%",
        "--accent-foreground": "270 100% 98%",
        "--muted": "270 32.6% 17.5%",
        "--muted-foreground": "270 20.2% 65.1%",
      },
    },
  },
  {
    id: "orange-warm",
    name: "Orange Warm",
    nameVi: "Cam Ấm Áp",
    description: "Warm orange theme with energetic vibes",
    descriptionVi: "Giao diện cam ấm áp, tràn đầy năng lượng",
    preview: {
      primary: "#f97316",
      secondary: "#fb923c",
      accent: "#fbbf24",
      background: "#fff7ed",
      foreground: "#7c2d12",
    },
    cssVariables: {
      light: {
        "--primary": "24.6 95% 53.1%",
        "--primary-foreground": "60 9.1% 97.8%",
        "--secondary": "27 96% 61%",
        "--secondary-foreground": "24 80% 10%",
        "--accent": "45 93% 47%",
        "--accent-foreground": "45 80% 10%",
        "--muted": "30 76.5% 96.7%",
        "--muted-foreground": "24 16.3% 46.9%",
      },
      dark: {
        "--primary": "24.6 95% 53.1%",
        "--primary-foreground": "24 80% 10%",
        "--secondary": "27 76% 41%",
        "--secondary-foreground": "30 76.5% 96.7%",
        "--accent": "45 73% 37%",
        "--accent-foreground": "30 76.5% 96.7%",
        "--muted": "24 32.6% 17.5%",
        "--muted-foreground": "24 20.2% 65.1%",
      },
    },
  },
  {
    id: "dark-professional",
    name: "Dark Professional",
    nameVi: "Tối Chuyên Nghiệp",
    description: "Dark theme for professional environments",
    descriptionVi: "Giao diện tối dành cho môi trường chuyên nghiệp",
    preview: {
      primary: "#60a5fa",
      secondary: "#475569",
      accent: "#94a3b8",
      background: "#0f172a",
      foreground: "#f1f5f9",
    },
    cssVariables: {
      light: {
        "--primary": "213 94% 68%",
        "--primary-foreground": "222.2 47.4% 11.2%",
        "--secondary": "215 19% 35%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "215 25% 65%",
        "--accent-foreground": "222.2 47.4% 11.2%",
        "--muted": "215 25% 90%",
        "--muted-foreground": "215 16.3% 46.9%",
      },
      dark: {
        "--primary": "213 94% 68%",
        "--primary-foreground": "222.2 47.4% 11.2%",
        "--secondary": "217.2 32.6% 17.5%",
        "--secondary-foreground": "210 40% 98%",
        "--accent": "217.2 32.6% 25%",
        "--accent-foreground": "210 40% 98%",
        "--muted": "217.2 32.6% 17.5%",
        "--muted-foreground": "215 20.2% 65.1%",
      },
    },
  },
  {
    id: "rose-pink",
    name: "Rose Pink",
    nameVi: "Hồng Nhẹ Nhàng",
    description: "Soft rose pink theme with gentle aesthetics",
    descriptionVi: "Giao diện hồng nhẹ nhàng, thẩm mỹ tinh tế",
    preview: {
      primary: "#f43f5e",
      secondary: "#fb7185",
      accent: "#fda4af",
      background: "#fff1f2",
      foreground: "#881337",
    },
    cssVariables: {
      light: {
        "--primary": "346.8 77.2% 49.8%",
        "--primary-foreground": "355.7 100% 97.3%",
        "--secondary": "349 89% 72%",
        "--secondary-foreground": "346 80% 10%",
        "--accent": "351 83% 82%",
        "--accent-foreground": "346 80% 10%",
        "--muted": "350 76.5% 96.7%",
        "--muted-foreground": "346 16.3% 46.9%",
      },
      dark: {
        "--primary": "346.8 77.2% 49.8%",
        "--primary-foreground": "346 80% 10%",
        "--secondary": "349 69% 52%",
        "--secondary-foreground": "350 76.5% 96.7%",
        "--accent": "351 63% 62%",
        "--accent-foreground": "346 80% 10%",
        "--muted": "346 32.6% 17.5%",
        "--muted-foreground": "346 20.2% 65.1%",
      },
    },
  },
  // Industry-specific themes
  {
    id: "manufacturing-industrial",
    name: "Manufacturing Industrial",
    nameVi: "Công nghiệp Sản xuất",
    description: "Industrial theme for manufacturing environments",
    descriptionVi: "Giao diện công nghiệp cho môi trường sản xuất",
    preview: {
      primary: "#0891b2",
      secondary: "#0e7490",
      accent: "#06b6d4",
      background: "#f0f9ff",
      foreground: "#164e63",
    },
    cssVariables: {
      light: {
        "--primary": "192 91% 36%",
        "--primary-foreground": "192 100% 98%",
        "--secondary": "193 82% 31%",
        "--secondary-foreground": "192 100% 98%",
        "--accent": "188 94% 43%",
        "--accent-foreground": "192 80% 10%",
        "--muted": "192 76.5% 96.7%",
        "--muted-foreground": "192 16.3% 46.9%",
      },
      dark: {
        "--primary": "192 91% 36%",
        "--primary-foreground": "192 80% 10%",
        "--secondary": "193 62% 21%",
        "--secondary-foreground": "192 76.5% 96.7%",
        "--accent": "188 74% 33%",
        "--accent-foreground": "192 76.5% 96.7%",
        "--muted": "192 32.6% 17.5%",
        "--muted-foreground": "192 20.2% 65.1%",
      },
    },
  },
  {
    id: "healthcare-medical",
    name: "Healthcare Medical",
    nameVi: "Y tế Chăm sóc Sức khỏe",
    description: "Clean medical theme for healthcare applications",
    descriptionVi: "Giao diện y tế sạch sẽ cho ứng dụng chăm sóc sức khỏe",
    preview: {
      primary: "#059669",
      secondary: "#10b981",
      accent: "#34d399",
      background: "#ecfdf5",
      foreground: "#064e3b",
    },
    cssVariables: {
      light: {
        "--primary": "160 84% 39%",
        "--primary-foreground": "160 100% 98%",
        "--secondary": "160 84% 39%",
        "--secondary-foreground": "160 100% 98%",
        "--accent": "160 67% 52%",
        "--accent-foreground": "160 80% 10%",
        "--muted": "160 76.5% 96.7%",
        "--muted-foreground": "160 16.3% 46.9%",
      },
      dark: {
        "--primary": "160 84% 39%",
        "--primary-foreground": "160 80% 10%",
        "--secondary": "160 64% 29%",
        "--secondary-foreground": "160 76.5% 96.7%",
        "--accent": "160 47% 42%",
        "--accent-foreground": "160 76.5% 96.7%",
        "--muted": "160 32.6% 17.5%",
        "--muted-foreground": "160 20.2% 65.1%",
      },
    },
  },
  {
    id: "finance-corporate",
    name: "Finance Corporate",
    nameVi: "Tài chính Doanh nghiệp",
    description: "Professional corporate theme for finance applications",
    descriptionVi: "Giao diện doanh nghiệp chuyên nghiệp cho ứng dụng tài chính",
    preview: {
      primary: "#1e40af",
      secondary: "#3b82f6",
      accent: "#60a5fa",
      background: "#eff6ff",
      foreground: "#1e3a8a",
    },
    cssVariables: {
      light: {
        "--primary": "224 76% 48%",
        "--primary-foreground": "224 100% 98%",
        "--secondary": "217 91% 60%",
        "--secondary-foreground": "224 100% 98%",
        "--accent": "213 94% 68%",
        "--accent-foreground": "224 80% 10%",
        "--muted": "224 76.5% 96.7%",
        "--muted-foreground": "224 16.3% 46.9%",
      },
      dark: {
        "--primary": "224 76% 48%",
        "--primary-foreground": "224 80% 10%",
        "--secondary": "217 71% 40%",
        "--secondary-foreground": "224 76.5% 96.7%",
        "--accent": "213 74% 48%",
        "--accent-foreground": "224 76.5% 96.7%",
        "--muted": "224 32.6% 17.5%",
        "--muted-foreground": "224 20.2% 65.1%",
      },
    },
  },
  {
    id: "automotive-tech",
    name: "Automotive Tech",
    nameVi: "Công nghệ Ô tô",
    description: "Modern tech theme for automotive industry",
    descriptionVi: "Giao diện công nghệ hiện đại cho ngành ô tô",
    preview: {
      primary: "#dc2626",
      secondary: "#ef4444",
      accent: "#f87171",
      background: "#fef2f2",
      foreground: "#7f1d1d",
    },
    cssVariables: {
      light: {
        "--primary": "0 72% 51%",
        "--primary-foreground": "0 100% 98%",
        "--secondary": "0 84% 60%",
        "--secondary-foreground": "0 100% 98%",
        "--accent": "0 91% 71%",
        "--accent-foreground": "0 80% 10%",
        "--muted": "0 76.5% 96.7%",
        "--muted-foreground": "0 16.3% 46.9%",
      },
      dark: {
        "--primary": "0 72% 51%",
        "--primary-foreground": "0 80% 10%",
        "--secondary": "0 64% 40%",
        "--secondary-foreground": "0 76.5% 96.7%",
        "--accent": "0 71% 51%",
        "--accent-foreground": "0 76.5% 96.7%",
        "--muted": "0 32.6% 17.5%",
        "--muted-foreground": "0 20.2% 65.1%",
      },
    },
  },
  {
    id: "food-beverage",
    name: "Food & Beverage",
    nameVi: "Thực phẩm & Đồ uống",
    description: "Fresh theme for food and beverage industry",
    descriptionVi: "Giao diện tươi mới cho ngành thực phẩm và đồ uống",
    preview: {
      primary: "#ea580c",
      secondary: "#f97316",
      accent: "#84cc16",
      background: "#fffbeb",
      foreground: "#78350f",
    },
    cssVariables: {
      light: {
        "--primary": "21 90% 48%",
        "--primary-foreground": "21 100% 98%",
        "--secondary": "25 95% 53%",
        "--secondary-foreground": "21 100% 98%",
        "--accent": "84 81% 44%",
        "--accent-foreground": "84 80% 10%",
        "--muted": "48 76.5% 96.7%",
        "--muted-foreground": "21 16.3% 46.9%",
      },
      dark: {
        "--primary": "21 90% 48%",
        "--primary-foreground": "21 80% 10%",
        "--secondary": "25 75% 33%",
        "--secondary-foreground": "48 76.5% 96.7%",
        "--accent": "84 61% 34%",
        "--accent-foreground": "48 76.5% 96.7%",
        "--muted": "21 32.6% 17.5%",
        "--muted-foreground": "21 20.2% 65.1%",
      },
    },
  },
];

// Convert HEX to HSL
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 0%";
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Get current theme from localStorage
export function getCurrentTheme(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("app-color-theme") || "default-blue";
  }
  return "default-blue";
}

// Apply theme to document
export function applyTheme(themeId: string, isDark: boolean, customVariables?: Record<string, string>) {
  const root = document.documentElement;
  
  if (customVariables) {
    Object.entries(customVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  } else {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    
    const variables = isDark ? theme.cssVariables.dark : theme.cssVariables.light;
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Also apply sidebar colors based on primary
    const primaryVar = variables["--primary"];
    if (primaryVar) {
      root.style.setProperty("--sidebar-primary", primaryVar);
      root.style.setProperty("--ring", primaryVar);
      root.style.setProperty("--sidebar-ring", primaryVar);
    }
    
    // Apply foreground to sidebar
    const fgVar = variables["--primary-foreground"];
    if (fgVar) {
      root.style.setProperty("--sidebar-primary-foreground", fgVar);
    }
  }
  
  localStorage.setItem("app-color-theme", themeId);
}

// Apply preview theme temporarily
function applyPreviewTheme(preview: ThemeConfig["preview"], isDark: boolean) {
  const root = document.documentElement;
  const hslPrimary = hexToHsl(preview.primary);
  const hslSecondary = hexToHsl(preview.secondary);
  const hslAccent = hexToHsl(preview.accent);
  const hslBackground = hexToHsl(preview.background);
  const hslForeground = hexToHsl(preview.foreground);
  
  // Apply primary colors
  root.style.setProperty("--primary", hslPrimary);
  root.style.setProperty("--sidebar-primary", hslPrimary);
  root.style.setProperty("--ring", hslPrimary);
  root.style.setProperty("--sidebar-ring", hslPrimary);
  
  // Apply secondary and accent
  if (isDark) {
    const hue = hslSecondary.split(" ")[0];
    root.style.setProperty("--secondary", `${hue} 32.6% 17.5%`);
    root.style.setProperty("--accent", `${hslAccent.split(" ")[0]} 32.6% 17.5%`);
  } else {
    root.style.setProperty("--secondary", hslSecondary);
    root.style.setProperty("--accent", hslAccent);
  }
  
  // Apply background and foreground for preview
  // Note: Only apply in light mode preview to avoid breaking dark mode
  if (!isDark) {
    // Subtle background tint based on primary
    const primaryHue = hslPrimary.split(" ")[0];
    root.style.setProperty("--background", `${primaryHue} 5% 98%`);
    root.style.setProperty("--card", `${primaryHue} 0% 100%`);
    root.style.setProperty("--sidebar", `${primaryHue} 5% 98%`);
  }
}

export function ThemeSelector() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState(getCurrentTheme());
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("presets");
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const previousThemeRef = useRef<string>(selectedTheme);
  
  // Custom theme creator state
  const [customName, setCustomName] = useState("");
  const [customColors, setCustomColors] = useState({
    primary: "#3b82f6",
    secondary: "#6366f1",
    accent: "#8b5cf6",
    background: "#ffffff",
    foreground: "#0f172a",
  });
  
  // tRPC queries and mutations
  const { data: preference, refetch: refetchPreference } = trpc.theme.getPreference.useQuery(undefined, {
    enabled: open,
  });
  const { data: customThemes, refetch: refetchCustomThemes } = trpc.theme.getCustomThemes.useQuery(undefined, {
    enabled: open,
  });
  
  const savePreferenceMutation = trpc.theme.savePreference.useMutation({
    onSuccess: () => {
      refetchPreference();
    },
  });
  
  const createCustomThemeMutation = trpc.theme.createCustomTheme.useMutation({
    onSuccess: () => {
      refetchCustomThemes();
      toast({
        title: language === "en" ? "Theme created" : "Đã tạo giao diện",
        description: language === "en" ? "Your custom theme has been saved" : "Giao diện tùy chỉnh đã được lưu",
      });
      setCustomName("");
    },
  });
  
  const deleteCustomThemeMutation = trpc.theme.deleteCustomTheme.useMutation({
    onSuccess: () => {
      refetchCustomThemes();
      toast({
        title: language === "en" ? "Theme deleted" : "Đã xóa giao diện",
      });
    },
  });
  
  // Sync with database preference on load
  useEffect(() => {
    if (preference) {
      setSelectedTheme(preference.themeId);
      const isDark = document.documentElement.classList.contains("dark");
      applyTheme(preference.themeId, isDark);
    }
  }, [preference]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    applyTheme(selectedTheme, isDark);
  }, [selectedTheme]);

  // Listen for dark mode changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isDark = document.documentElement.classList.contains("dark");
          applyTheme(previewThemeId || selectedTheme, isDark);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [selectedTheme, previewThemeId]);

  // Handle theme hover for preview
  const handleThemeHover = useCallback((themeId: string) => {
    if (!previewThemeId) {
      previousThemeRef.current = selectedTheme;
    }
    setPreviewThemeId(themeId);
    const isDark = document.documentElement.classList.contains("dark");
    const theme = THEMES.find(t => t.id === themeId);
    if (theme) {
      applyPreviewTheme(theme.preview, isDark);
    }
  }, [selectedTheme, previewThemeId]);

  const handleThemeLeave = useCallback(() => {
    setPreviewThemeId(null);
    const isDark = document.documentElement.classList.contains("dark");
    applyTheme(previousThemeRef.current, isDark);
  }, []);

  const handleSelectTheme = async (themeId: string) => {
    setSelectedTheme(themeId);
    previousThemeRef.current = themeId;
    setPreviewThemeId(null);
    const isDark = document.documentElement.classList.contains("dark");
    applyTheme(themeId, isDark);
    
    // Save to database
    try {
      await savePreferenceMutation.mutateAsync({
        themeId,
        isDarkMode: isDark,
      });
    } catch {
      // Fallback to localStorage only
    }
  };

  const handleCreateCustomTheme = async () => {
    if (!customName.trim()) {
      toast({
        title: language === "en" ? "Error" : "Lỗi",
        description: language === "en" ? "Please enter a theme name" : "Vui lòng nhập tên giao diện",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createCustomThemeMutation.mutateAsync({
        name: customName,
        colors: {
          primaryColor: hexToHsl(customColors.primary),
          secondaryColor: hexToHsl(customColors.secondary),
          accentColor: hexToHsl(customColors.accent),
          backgroundColor: hexToHsl(customColors.background),
          foregroundColor: hexToHsl(customColors.foreground),
        },
      });
    } catch {
      toast({
        title: language === "en" ? "Error" : "Lỗi",
        description: language === "en" ? "Failed to create theme" : "Không thể tạo giao diện",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCustomTheme = async (id: number) => {
    try {
      await deleteCustomThemeMutation.mutateAsync({ id });
    } catch {
      toast({
        title: language === "en" ? "Error" : "Lỗi",
        description: language === "en" ? "Failed to delete theme" : "Không thể xóa giao diện",
        variant: "destructive",
      });
    }
  };

  // Preview custom colors in real-time with auto-preview
  const handleCustomColorChange = (key: keyof typeof customColors, value: string) => {
    const newColors = { ...customColors, [key]: value };
    setCustomColors(newColors);
    // Auto preview when changing colors
    const isDark = document.documentElement.classList.contains("dark");
    applyPreviewTheme(newColors, isDark);
  };

  const previewCustomTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    applyPreviewTheme(customColors, isDark);
  };
  
  // Reset to original theme when leaving custom tab
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== "custom") {
      // Restore original theme when leaving custom tab
      const isDark = document.documentElement.classList.contains("dark");
      applyTheme(selectedTheme, isDark);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-accent transition-colors"
          title={language === "en" ? "Theme Settings" : "Cài đặt Giao diện"}
        >
          <Palette className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === "en" ? "Theme Settings" : "Cài đặt Giao diện"}
          </DialogTitle>
          <DialogDescription>
            {language === "en"
              ? "Choose a preset theme or create your own custom theme"
              : "Chọn giao diện có sẵn hoặc tạo giao diện tùy chỉnh của bạn"}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="presets">
              {language === "en" ? "Preset Themes" : "Giao diện có sẵn"}
            </TabsTrigger>
            <TabsTrigger value="custom">
              {language === "en" ? "Custom Theme" : "Tùy chỉnh"}
            </TabsTrigger>
            <TabsTrigger value="image">
              {language === "en" ? "From Image" : "Từ hình ảnh"}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="presets" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  onMouseEnter={() => handleThemeHover(theme.id)}
                  onMouseLeave={handleThemeLeave}
                  className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    selectedTheme === theme.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {selectedTheme === theme.id && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  {previewThemeId === theme.id && selectedTheme !== theme.id && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <Eye className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div
                    className="h-16 rounded-md mb-2 flex items-end overflow-hidden"
                    style={{ backgroundColor: theme.preview.background }}
                  >
                    <div className="flex w-full h-8 gap-1 p-1">
                      <div
                        className="flex-1 rounded"
                        style={{ backgroundColor: theme.preview.primary }}
                      />
                      <div
                        className="flex-1 rounded"
                        style={{ backgroundColor: theme.preview.secondary }}
                      />
                      <div
                        className="flex-1 rounded"
                        style={{ backgroundColor: theme.preview.accent }}
                      />
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">
                      {language === "en" ? theme.name : theme.nameVi}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {language === "en" ? theme.description : theme.descriptionVi}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Custom themes from database */}
            {customThemes && customThemes.length > 0 && (
              <>
                <div className="mt-6 mb-3">
                  <h4 className="text-sm font-medium">
                    {language === "en" ? "Your Custom Themes" : "Giao diện tùy chỉnh của bạn"}
                  </h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {customThemes.map((theme) => (
                    <div
                      key={theme.id}
                      className={`relative p-3 rounded-lg border-2 transition-all ${
                        selectedTheme === `custom-${theme.id}`
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {theme.isOwner && (
                        <button
                          onClick={() => handleDeleteCustomTheme(theme.id)}
                          className="absolute top-2 right-2 h-5 w-5 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      )}
                      <button
                        onClick={() => handleSelectTheme(`custom-${theme.id}`)}
                        className="w-full text-left"
                      >
                        <div className="h-12 rounded-md mb-2 flex items-center justify-center gap-2 bg-muted">
                          <div
                            className="h-6 w-6 rounded-full"
                            style={{ backgroundColor: `hsl(${theme.primaryColor})` }}
                          />
                          <div
                            className="h-6 w-6 rounded-full"
                            style={{ backgroundColor: `hsl(${theme.secondaryColor})` }}
                          />
                          <div
                            className="h-6 w-6 rounded-full"
                            style={{ backgroundColor: `hsl(${theme.accentColor})` }}
                          />
                        </div>
                        <p className="font-medium text-sm truncate">{theme.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {theme.isOwner 
                            ? (language === "en" ? "Your theme" : "Của bạn")
                            : (language === "en" ? "Shared" : "Được chia sẻ")
                          }
                        </p>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="custom" className="mt-4">
            <div className="space-y-6">
              {/* Theme name */}
              <div className="space-y-2">
                <Label htmlFor="theme-name">
                  {language === "en" ? "Theme Name" : "Tên giao diện"}
                </Label>
                <Input
                  id="theme-name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={language === "en" ? "My Custom Theme" : "Giao diện của tôi"}
                />
              </div>
              
              {/* Advanced Color pickers */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <AdvancedColorPicker
                  label={language === "en" ? "Primary" : "Màu chính"}
                  value={customColors.primary}
                  onChange={(color) => handleCustomColorChange("primary", color)}
                />
                
                <AdvancedColorPicker
                  label={language === "en" ? "Secondary" : "Màu phụ"}
                  value={customColors.secondary}
                  onChange={(color) => handleCustomColorChange("secondary", color)}
                />
                
                <AdvancedColorPicker
                  label={language === "en" ? "Accent" : "Màu nhấn"}
                  value={customColors.accent}
                  onChange={(color) => handleCustomColorChange("accent", color)}
                />
                
                <AdvancedColorPicker
                  label={language === "en" ? "Background" : "Nền"}
                  value={customColors.background}
                  onChange={(color) => handleCustomColorChange("background", color)}
                />
                
                <AdvancedColorPicker
                  label={language === "en" ? "Text" : "Chữ"}
                  value={customColors.foreground}
                  onChange={(color) => handleCustomColorChange("foreground", color)}
                />
              </div>
              
              {/* Preview */}
              <div className="space-y-2">
                <Label>{language === "en" ? "Preview" : "Xem trước"}</Label>
                <div
                  className="h-24 rounded-lg border p-4 flex items-center justify-center gap-4"
                  style={{ backgroundColor: customColors.background }}
                >
                  <div
                    className="px-4 py-2 rounded-md text-white font-medium"
                    style={{ backgroundColor: customColors.primary }}
                  >
                    {language === "en" ? "Primary" : "Chính"}
                  </div>
                  <div
                    className="px-4 py-2 rounded-md text-white font-medium"
                    style={{ backgroundColor: customColors.secondary }}
                  >
                    {language === "en" ? "Secondary" : "Phụ"}
                  </div>
                  <div
                    className="px-4 py-2 rounded-md text-white font-medium"
                    style={{ backgroundColor: customColors.accent }}
                  >
                    {language === "en" ? "Accent" : "Nhấn"}
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={previewCustomTheme}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {language === "en" ? "Preview" : "Xem trước"}
                </Button>
                <Button
                  onClick={handleCreateCustomTheme}
                  disabled={createCustomThemeMutation.isPending}
                  className="flex-1"
                >
                  {createCustomThemeMutation.isPending ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {language === "en" ? "Save Theme" : "Lưu giao diện"}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="image" className="mt-4">
            <ImageThemeExtractor 
              onThemeGenerated={(colors) => {
                // Apply preview when theme is generated
                const root = document.documentElement;
                const hexToHsl = (hex: string) => {
                  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                  if (!result) return "0 0% 0%";
                  let r = parseInt(result[1], 16) / 255;
                  let g = parseInt(result[2], 16) / 255;
                  let b = parseInt(result[3], 16) / 255;
                  const max = Math.max(r, g, b);
                  const min = Math.min(r, g, b);
                  let h = 0, s = 0;
                  const l = (max + min) / 2;
                  if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    switch (max) {
                      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                      case g: h = ((b - r) / d + 2) / 6; break;
                      case b: h = ((r - g) / d + 4) / 6; break;
                    }
                  }
                  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
                };
                root.style.setProperty("--primary", hexToHsl(colors.primary));
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
