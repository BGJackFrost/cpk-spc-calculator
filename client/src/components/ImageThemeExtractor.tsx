import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { Upload, Image as ImageIcon, Palette, Sparkles, Check, Loader2 } from "lucide-react";

// Color extraction utilities
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
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

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Extract dominant colors from image using canvas
async function extractColorsFromImage(imageUrl: string, colorCount: number = 5): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Scale down for performance
      const scale = Math.min(100 / img.width, 100 / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      // Collect colors with their frequency
      const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = Math.round(pixels[i] / 16) * 16;
        const g = Math.round(pixels[i + 1] / 16) * 16;
        const b = Math.round(pixels[i + 2] / 16) * 16;
        const a = pixels[i + 3];
        
        if (a < 128) continue; // Skip transparent pixels
        
        const key = `${r},${g},${b}`;
        const existing = colorMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          colorMap.set(key, { r, g, b, count: 1 });
        }
      }

      // Sort by frequency and get top colors
      const sortedColors = Array.from(colorMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, colorCount * 3); // Get more colors for filtering

      // Filter out very similar colors and very dark/light colors
      const filteredColors: string[] = [];
      for (const color of sortedColors) {
        const [h, s, l] = rgbToHsl(color.r, color.g, color.b);
        
        // Skip very dark or very light colors
        if (l < 15 || l > 90) continue;
        // Skip very unsaturated colors (grays)
        if (s < 15) continue;
        
        const hex = hslToHex(h, s, l);
        
        // Check if too similar to existing colors
        const isSimilar = filteredColors.some(existing => {
          const [eh, es, el] = hexToHsl(existing);
          return Math.abs(h - eh) < 30 && Math.abs(s - es) < 20 && Math.abs(l - el) < 20;
        });
        
        if (!isSimilar) {
          filteredColors.push(hex);
        }
        
        if (filteredColors.length >= colorCount) break;
      }

      // If we don't have enough colors, add some variations
      while (filteredColors.length < colorCount && sortedColors.length > 0) {
        const color = sortedColors.shift()!;
        const [h, s, l] = rgbToHsl(color.r, color.g, color.b);
        const hex = hslToHex(h, Math.min(s + 20, 100), Math.max(Math.min(l, 70), 30));
        if (!filteredColors.includes(hex)) {
          filteredColors.push(hex);
        }
      }

      resolve(filteredColors);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

function hexToHsl(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return rgbToHsl(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16));
}

function hexToHslString(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  return `${h} ${s}% ${l}%`;
}

// Generate theme colors from extracted palette
function generateThemeFromColors(colors: string[]): {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
} {
  // Sort colors by saturation (most saturated first for primary)
  const sortedBySaturation = [...colors].sort((a, b) => {
    const [, sa] = hexToHsl(a);
    const [, sb] = hexToHsl(b);
    return sb - sa;
  });

  const primary = sortedBySaturation[0] || "#3b82f6";
  const secondary = sortedBySaturation[1] || sortedBySaturation[0] || "#6366f1";
  const accent = sortedBySaturation[2] || sortedBySaturation[1] || "#8b5cf6";

  // Generate background and foreground based on primary
  const [h] = hexToHsl(primary);
  const background = hslToHex(h, 5, 98); // Very light, slightly tinted
  const foreground = hslToHex(h, 10, 15); // Very dark, slightly tinted

  return { primary, secondary, accent, background, foreground };
}

interface ImageThemeExtractorProps {
  onThemeGenerated?: (colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
  }) => void;
}

export function ImageThemeExtractor({ onThemeGenerated }: ImageThemeExtractorProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [generatedTheme, setGeneratedTheme] = useState<{
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [themeName, setThemeName] = useState("");

  // tRPC mutation for saving theme
  const createCustomThemeMutation = trpc.theme.createCustomTheme.useMutation({
    onSuccess: () => {
      toast({
        title: language === "en" ? "Theme saved" : "Đã lưu giao diện",
        description: language === "en" 
          ? "Your image-based theme has been saved" 
          : "Giao diện từ hình ảnh đã được lưu",
      });
      setThemeName("");
    },
    onError: () => {
      toast({
        title: language === "en" ? "Error" : "Lỗi",
        description: language === "en" ? "Failed to save theme" : "Không thể lưu giao diện",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: language === "en" ? "Invalid file" : "File không hợp lệ",
        description: language === "en" 
          ? "Please select an image file" 
          : "Vui lòng chọn file hình ảnh",
        variant: "destructive",
      });
      return;
    }

    // Create object URL for preview
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setExtractedColors([]);
    setGeneratedTheme(null);

    // Extract colors
    setIsExtracting(true);
    try {
      const colors = await extractColorsFromImage(url, 5);
      setExtractedColors(colors);
      
      const theme = generateThemeFromColors(colors);
      setGeneratedTheme(theme);
      onThemeGenerated?.(theme);
      
      toast({
        title: language === "en" ? "Colors extracted" : "Đã trích xuất màu",
        description: language === "en" 
          ? `Found ${colors.length} dominant colors` 
          : `Tìm thấy ${colors.length} màu chủ đạo`,
      });
    } catch (error) {
      toast({
        title: language === "en" ? "Error" : "Lỗi",
        description: language === "en" 
          ? "Failed to extract colors from image" 
          : "Không thể trích xuất màu từ hình ảnh",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  }, [language, toast, onThemeGenerated]);

  const handleSaveTheme = async () => {
    if (!generatedTheme) return;
    if (!themeName.trim()) {
      toast({
        title: language === "en" ? "Error" : "Lỗi",
        description: language === "en" 
          ? "Please enter a theme name" 
          : "Vui lòng nhập tên giao diện",
        variant: "destructive",
      });
      return;
    }

    await createCustomThemeMutation.mutateAsync({
      name: themeName,
      colors: {
        primaryColor: hexToHslString(generatedTheme.primary),
        secondaryColor: hexToHslString(generatedTheme.secondary),
        accentColor: hexToHslString(generatedTheme.accent),
        backgroundColor: hexToHslString(generatedTheme.background),
        foregroundColor: hexToHslString(generatedTheme.foreground),
      },
    });
  };

  const handleApplyTheme = () => {
    if (!generatedTheme) return;
    
    const root = document.documentElement;
    root.style.setProperty("--primary", hexToHslString(generatedTheme.primary));
    root.style.setProperty("--secondary", hexToHslString(generatedTheme.secondary));
    root.style.setProperty("--accent", hexToHslString(generatedTheme.accent));
    
    toast({
      title: language === "en" ? "Theme applied" : "Đã áp dụng giao diện",
      description: language === "en" 
        ? "The theme has been applied temporarily" 
        : "Giao diện đã được áp dụng tạm thời",
    });
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-5 w-5 text-primary" />
          {language === "en" ? "Theme from Image" : "Giao diện từ Hình ảnh"}
        </CardTitle>
        <CardDescription>
          {language === "en" 
            ? "Upload an image to automatically extract colors and create a theme" 
            : "Tải lên hình ảnh để tự động trích xuất màu và tạo giao diện"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload area */}
        <div 
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {imageUrl ? (
            <div className="space-y-3">
              <img 
                src={imageUrl} 
                alt="Uploaded" 
                className="max-h-32 mx-auto rounded-lg object-contain"
              />
              <p className="text-sm text-muted-foreground">
                {language === "en" ? "Click to change image" : "Nhấp để đổi hình ảnh"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">
                {language === "en" ? "Click to upload image" : "Nhấp để tải hình ảnh"}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF, WebP
              </p>
            </div>
          )}
        </div>

        {/* Loading state */}
        {isExtracting && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {language === "en" ? "Extracting colors..." : "Đang trích xuất màu..."}
            </span>
          </div>
        )}

        {/* Extracted colors */}
        {extractedColors.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm">
              {language === "en" ? "Extracted Colors" : "Màu đã trích xuất"}
            </Label>
            <div className="flex gap-2 flex-wrap">
              {extractedColors.map((color, index) => (
                <div
                  key={index}
                  className="w-10 h-10 rounded-lg border shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}

        {/* Generated theme preview */}
        {generatedTheme && (
          <div className="space-y-3">
            <Label className="text-sm">
              {language === "en" ? "Generated Theme" : "Giao diện được tạo"}
            </Label>
            <div 
              className="rounded-lg border p-4 space-y-3"
              style={{ backgroundColor: generatedTheme.background }}
            >
              <div className="flex gap-2">
                <div 
                  className="flex-1 h-10 rounded-md flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: generatedTheme.primary }}
                >
                  Primary
                </div>
                <div 
                  className="flex-1 h-10 rounded-md flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: generatedTheme.secondary }}
                >
                  Secondary
                </div>
                <div 
                  className="flex-1 h-10 rounded-md flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: generatedTheme.accent }}
                >
                  Accent
                </div>
              </div>
              <p 
                className="text-sm"
                style={{ color: generatedTheme.foreground }}
              >
                {language === "en" 
                  ? "This is how text will look with the generated theme." 
                  : "Đây là cách văn bản sẽ hiển thị với giao diện được tạo."}
              </p>
            </div>

            {/* Theme name input */}
            <div className="space-y-2">
              <Label htmlFor="theme-name">
                {language === "en" ? "Theme Name" : "Tên giao diện"}
              </Label>
              <Input
                id="theme-name"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder={language === "en" ? "My Image Theme" : "Giao diện từ ảnh"}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleApplyTheme}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {language === "en" ? "Preview" : "Xem trước"}
              </Button>
              <Button
                onClick={handleSaveTheme}
                disabled={createCustomThemeMutation.isPending || !themeName.trim()}
                className="flex-1"
              >
                {createCustomThemeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {language === "en" ? "Save Theme" : "Lưu giao diện"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ImageThemeExtractor;
