import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Palette, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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

// Get current theme from localStorage
export function getCurrentTheme(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("app-color-theme") || "default-blue";
  }
  return "default-blue";
}

// Apply theme to document
export function applyTheme(themeId: string, isDark: boolean) {
  const theme = THEMES.find((t) => t.id === themeId);
  if (!theme) return;

  const root = document.documentElement;
  const variables = isDark ? theme.cssVariables.dark : theme.cssVariables.light;

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  localStorage.setItem("app-color-theme", themeId);
}

export function ThemeSelector() {
  const { language } = useLanguage();
  const [selectedTheme, setSelectedTheme] = useState(getCurrentTheme());
  const [open, setOpen] = useState(false);

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
          applyTheme(selectedTheme, isDark);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [selectedTheme]);

  const handleSelectTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    const isDark = document.documentElement.classList.contains("dark");
    applyTheme(themeId, isDark);
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {language === "en" ? "Choose Theme" : "Chọn Giao diện"}
          </DialogTitle>
          <DialogDescription>
            {language === "en"
              ? "Select a color theme for the application"
              : "Chọn giao diện màu sắc cho ứng dụng"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleSelectTheme(theme.id)}
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
              {/* Theme preview */}
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
      </DialogContent>
    </Dialog>
  );
}
