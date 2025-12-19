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
import { Palette, Check, Plus, Trash2, Save, Eye } from "lucide-react";
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
  }
  
  localStorage.setItem("app-color-theme", themeId);
}

// Apply preview theme temporarily
function applyPreviewTheme(preview: ThemeConfig["preview"], isDark: boolean) {
  const root = document.documentElement;
  const hslPrimary = hexToHsl(preview.primary);
  const hslSecondary = hexToHsl(preview.secondary);
  const hslAccent = hexToHsl(preview.accent);
  
  root.style.setProperty("--primary", hslPrimary);
  root.style.setProperty("--secondary", isDark ? `${hslSecondary.split(" ")[0]} 32.6% 17.5%` : hslSecondary);
  root.style.setProperty("--accent", isDark ? `${hslAccent.split(" ")[0]} 32.6% 17.5%` : hslAccent);
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

  // Preview custom colors in real-time
  const handleCustomColorChange = (key: keyof typeof customColors, value: string) => {
    setCustomColors(prev => ({ ...prev, [key]: value }));
  };

  const previewCustomTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    applyPreviewTheme(customColors, isDark);
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">
              {language === "en" ? "Preset Themes" : "Giao diện có sẵn"}
            </TabsTrigger>
            <TabsTrigger value="custom">
              {language === "en" ? "Custom Theme" : "Tùy chỉnh"}
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
              
              {/* Color pickers */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">
                    {language === "en" ? "Primary" : "Màu chính"}
                  </Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="primary-color"
                      value={customColors.primary}
                      onChange={(e) => handleCustomColorChange("primary", e.target.value)}
                      className="h-10 w-14 rounded cursor-pointer border"
                    />
                    <Input
                      value={customColors.primary}
                      onChange={(e) => handleCustomColorChange("primary", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secondary-color">
                    {language === "en" ? "Secondary" : "Màu phụ"}
                  </Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="secondary-color"
                      value={customColors.secondary}
                      onChange={(e) => handleCustomColorChange("secondary", e.target.value)}
                      className="h-10 w-14 rounded cursor-pointer border"
                    />
                    <Input
                      value={customColors.secondary}
                      onChange={(e) => handleCustomColorChange("secondary", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accent-color">
                    {language === "en" ? "Accent" : "Màu nhấn"}
                  </Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="accent-color"
                      value={customColors.accent}
                      onChange={(e) => handleCustomColorChange("accent", e.target.value)}
                      className="h-10 w-14 rounded cursor-pointer border"
                    />
                    <Input
                      value={customColors.accent}
                      onChange={(e) => handleCustomColorChange("accent", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="background-color">
                    {language === "en" ? "Background" : "Nền"}
                  </Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="background-color"
                      value={customColors.background}
                      onChange={(e) => handleCustomColorChange("background", e.target.value)}
                      className="h-10 w-14 rounded cursor-pointer border"
                    />
                    <Input
                      value={customColors.background}
                      onChange={(e) => handleCustomColorChange("background", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="foreground-color">
                    {language === "en" ? "Text" : "Chữ"}
                  </Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="foreground-color"
                      value={customColors.foreground}
                      onChange={(e) => handleCustomColorChange("foreground", e.target.value)}
                      className="h-10 w-14 rounded cursor-pointer border"
                    />
                    <Input
                      value={customColors.foreground}
                      onChange={(e) => handleCustomColorChange("foreground", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
