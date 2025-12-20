import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pipette, RotateCcw } from "lucide-react";

interface AdvancedColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  presetColors?: string[];
}

// Default preset colors organized by category
const DEFAULT_PRESETS = {
  primary: ["#3b82f6", "#2563eb", "#1d4ed8", "#0ea5e9", "#06b6d4", "#14b8a6"],
  warm: ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e"],
  cool: ["#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#6366f1"],
  neutral: ["#0f172a", "#1e293b", "#334155", "#64748b", "#94a3b8", "#cbd5e1"],
  light: ["#f8fafc", "#f1f5f9", "#e2e8f0", "#ffffff", "#fafafa", "#f5f5f5"],
};

// Convert HEX to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Convert HSL to HEX
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function AdvancedColorPicker({
  value,
  onChange,
  label,
  presetColors,
}: AdvancedColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  const [inputValue, setInputValue] = useState(value);
  const gradientRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<"gradient" | "hue" | null>(null);

  // Sync HSL when value changes externally
  useEffect(() => {
    const newHsl = hexToHsl(value);
    setHsl(newHsl);
    setInputValue(value);
  }, [value]);

  // Update color from HSL
  const updateColor = useCallback(
    (newHsl: { h: number; s: number; l: number }) => {
      setHsl(newHsl);
      const hex = hslToHex(newHsl.h, newHsl.s, newHsl.l);
      setInputValue(hex);
      onChange(hex);
    },
    [onChange]
  );

  // Handle gradient click/drag (saturation and lightness)
  const handleGradientInteraction = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!gradientRef.current) return;
      const rect = gradientRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      // x = saturation (0-100), y = lightness (100-0)
      const s = Math.round(x * 100);
      const l = Math.round((1 - y) * 100);

      updateColor({ ...hsl, s, l });
    },
    [hsl, updateColor]
  );

  // Handle hue slider click/drag
  const handleHueInteraction = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const h = Math.round(x * 360);

      updateColor({ ...hsl, h });
    },
    [hsl, updateColor]
  );

  // Mouse event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging === "gradient") {
        handleGradientInteraction(e);
      } else if (isDragging === "hue") {
        handleHueInteraction(e);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleGradientInteraction, handleHueInteraction]);

  // Handle hex input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Validate and update if valid hex
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      const newHsl = hexToHsl(val);
      setHsl(newHsl);
      onChange(val);
    }
  };

  // Handle preset color click
  const handlePresetClick = (color: string) => {
    const newHsl = hexToHsl(color);
    setHsl(newHsl);
    setInputValue(color);
    onChange(color);
  };

  // Reset to default
  const handleReset = () => {
    const defaultColor = "#3b82f6";
    const newHsl = hexToHsl(defaultColor);
    setHsl(newHsl);
    setInputValue(defaultColor);
    onChange(defaultColor);
  };

  const allPresets = presetColors || [
    ...DEFAULT_PRESETS.primary,
    ...DEFAULT_PRESETS.warm,
    ...DEFAULT_PRESETS.cool,
  ];

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-10"
          >
            <div
              className="h-5 w-5 rounded border"
              style={{ backgroundColor: value }}
            />
            <span className="flex-1 text-left font-mono text-sm">{value}</span>
            <Pipette className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Tabs defaultValue="picker" className="w-full">
            <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
              <TabsTrigger value="picker" className="rounded-none">
                Picker
              </TabsTrigger>
              <TabsTrigger value="presets" className="rounded-none">
                Presets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="picker" className="p-4 space-y-4">
              {/* Saturation/Lightness gradient */}
              <div
                ref={gradientRef}
                className="relative h-40 rounded-lg cursor-crosshair overflow-hidden"
                style={{
                  background: `
                    linear-gradient(to top, #000, transparent),
                    linear-gradient(to right, #fff, hsl(${hsl.h}, 100%, 50%))
                  `,
                }}
                onMouseDown={(e) => {
                  setIsDragging("gradient");
                  handleGradientInteraction(e);
                }}
              >
                {/* Picker indicator */}
                <div
                  className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none"
                  style={{
                    left: `${hsl.s}%`,
                    top: `${100 - hsl.l}%`,
                    backgroundColor: value,
                  }}
                />
              </div>

              {/* Hue slider */}
              <div
                ref={hueRef}
                className="relative h-4 rounded-full cursor-pointer"
                style={{
                  background:
                    "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
                }}
                onMouseDown={(e) => {
                  setIsDragging("hue");
                  handleHueInteraction(e);
                }}
              >
                {/* Hue indicator */}
                <div
                  className="absolute w-4 h-4 -translate-x-1/2 top-0 rounded-full border-2 border-white shadow-md pointer-events-none"
                  style={{
                    left: `${(hsl.h / 360) * 100}%`,
                    backgroundColor: `hsl(${hsl.h}, 100%, 50%)`,
                  }}
                />
              </div>

              {/* HSL values */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">H</label>
                  <Input
                    type="number"
                    min={0}
                    max={360}
                    value={hsl.h}
                    onChange={(e) =>
                      updateColor({ ...hsl, h: parseInt(e.target.value) || 0 })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">S</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={hsl.s}
                    onChange={(e) =>
                      updateColor({ ...hsl, s: parseInt(e.target.value) || 0 })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">L</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={hsl.l}
                    onChange={(e) =>
                      updateColor({ ...hsl, l: parseInt(e.target.value) || 0 })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* HEX input */}
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="#000000"
                  className="flex-1 font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleReset}
                  title="Reset to default"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="presets" className="p-4 space-y-4">
              {/* Primary colors */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Primary
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {DEFAULT_PRESETS.primary.map((color) => (
                    <button
                      key={color}
                      className={`h-8 w-8 rounded-md border-2 transition-all hover:scale-110 ${
                        value === color
                          ? "border-foreground ring-2 ring-offset-2"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handlePresetClick(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Warm colors */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Warm
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {DEFAULT_PRESETS.warm.map((color) => (
                    <button
                      key={color}
                      className={`h-8 w-8 rounded-md border-2 transition-all hover:scale-110 ${
                        value === color
                          ? "border-foreground ring-2 ring-offset-2"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handlePresetClick(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Cool colors */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Cool
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {DEFAULT_PRESETS.cool.map((color) => (
                    <button
                      key={color}
                      className={`h-8 w-8 rounded-md border-2 transition-all hover:scale-110 ${
                        value === color
                          ? "border-foreground ring-2 ring-offset-2"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handlePresetClick(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Neutral colors */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Neutral
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {DEFAULT_PRESETS.neutral.map((color) => (
                    <button
                      key={color}
                      className={`h-8 w-8 rounded-md border-2 transition-all hover:scale-110 ${
                        value === color
                          ? "border-foreground ring-2 ring-offset-2"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handlePresetClick(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Light colors */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Light
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {DEFAULT_PRESETS.light.map((color) => (
                    <button
                      key={color}
                      className={`h-8 w-8 rounded-md border-2 transition-all hover:scale-110 ${
                        value === color
                          ? "border-foreground ring-2 ring-offset-2"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handlePresetClick(color)}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default AdvancedColorPicker;
