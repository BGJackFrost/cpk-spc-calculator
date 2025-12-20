import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pipette, RotateCcw, Copy, Check, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

// Generate color harmonies
function getComplementary(h: number): number {
  return (h + 180) % 360;
}

function getTriadic(h: number): [number, number] {
  return [(h + 120) % 360, (h + 240) % 360];
}

function getAnalogous(h: number): [number, number] {
  return [(h + 30) % 360, (h - 30 + 360) % 360];
}

function getSplitComplementary(h: number): [number, number] {
  return [(h + 150) % 360, (h + 210) % 360];
}

export function AdvancedColorPicker({
  value,
  onChange,
  label,
  presetColors,
}: AdvancedColorPickerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  const [inputValue, setInputValue] = useState(value);
  const gradientRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<"gradient" | "hue" | "opacity" | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHarmony, setShowHarmony] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const opacityRef = useRef<HTMLDivElement>(null);

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

  // Handle opacity slider click/drag
  const handleOpacityInteraction = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!opacityRef.current) return;
      const rect = opacityRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newOpacity = Math.round(x * 100);
      setOpacity(newOpacity);
    },
    []
  );

  // Mouse event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging === "gradient") {
        handleGradientInteraction(e);
      } else if (isDragging === "hue") {
        handleHueInteraction(e);
      } else if (isDragging === "opacity") {
        handleOpacityInteraction(e);
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
  }, [isDragging, handleGradientInteraction, handleHueInteraction, handleOpacityInteraction]);

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

  // Copy color to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({
        title: "Copied!",
        description: `Color ${value} copied to clipboard`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy color",
        variant: "destructive",
      });
    }
  };

  // Paste color from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleanedText = text.trim();
      // Check if it's a valid hex color
      if (/^#?[0-9A-Fa-f]{6}$/.test(cleanedText)) {
        const hex = cleanedText.startsWith("#") ? cleanedText : `#${cleanedText}`;
        const newHsl = hexToHsl(hex);
        setHsl(newHsl);
        setInputValue(hex);
        onChange(hex);
        toast({
          title: "Pasted!",
          description: `Color ${hex} applied`,
        });
      } else {
        toast({
          title: "Invalid color",
          description: "Clipboard does not contain a valid hex color",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to paste color",
        variant: "destructive",
      });
    }
  };

  // Generate harmony colors
  const harmonyColors = {
    complementary: hslToHex(getComplementary(hsl.h), hsl.s, hsl.l),
    triadic: getTriadic(hsl.h).map(h => hslToHex(h, hsl.s, hsl.l)),
    analogous: getAnalogous(hsl.h).map(h => hslToHex(h, hsl.s, hsl.l)),
    splitComplementary: getSplitComplementary(hsl.h).map(h => hslToHex(h, hsl.s, hsl.l)),
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
            <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
              <TabsTrigger value="picker" className="rounded-none text-xs">
                Picker
              </TabsTrigger>
              <TabsTrigger value="presets" className="rounded-none text-xs">
                Presets
              </TabsTrigger>
              <TabsTrigger value="harmony" className="rounded-none text-xs">
                Harmony
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

              {/* Opacity slider */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Opacity: {opacity}%</label>
                <div
                  ref={opacityRef}
                  className="relative h-4 rounded-full cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, transparent 0%, ${value} 100%)`,
                  }}
                  onMouseDown={(e) => {
                    setIsDragging("opacity");
                    handleOpacityInteraction(e);
                  }}
                >
                  {/* Checkerboard background for transparency */}
                  <div className="absolute inset-0 rounded-full -z-10" style={{
                    backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                  }} />
                  {/* Opacity indicator */}
                  <div
                    className="absolute w-4 h-4 -translate-x-1/2 top-0 rounded-full border-2 border-white shadow-md pointer-events-none"
                    style={{
                      left: `${opacity}%`,
                      backgroundColor: value,
                    }}
                  />
                </div>
              </div>

              {/* HSL values */}
              <div className="grid grid-cols-4 gap-2">
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
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">A</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={opacity}
                    onChange={(e) =>
                      setOpacity(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* HEX input with copy/paste */}
              <div className="flex gap-1">
                <Input
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="#000000"
                  className="flex-1 font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Copy color"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePaste}
                  title="Paste color"
                >
                  <Pipette className="h-4 w-4" />
                </Button>
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

            <TabsContent value="harmony" className="p-4 space-y-4">
              {/* Current color */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Current Color
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-md border"
                    style={{ backgroundColor: value }}
                  />
                  <span className="font-mono text-sm">{value}</span>
                </div>
              </div>

              {/* Complementary */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Complementary
                </label>
                <div className="flex gap-2">
                  <button
                    className="h-8 w-8 rounded-md border-2 transition-all hover:scale-110 border-transparent"
                    style={{ backgroundColor: harmonyColors.complementary }}
                    onClick={() => handlePresetClick(harmonyColors.complementary)}
                    title={harmonyColors.complementary}
                  />
                </div>
              </div>

              {/* Triadic */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Triadic
                </label>
                <div className="flex gap-2">
                  {harmonyColors.triadic.map((color, i) => (
                    <button
                      key={i}
                      className="h-8 w-8 rounded-md border-2 transition-all hover:scale-110 border-transparent"
                      style={{ backgroundColor: color }}
                      onClick={() => handlePresetClick(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Analogous */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Analogous
                </label>
                <div className="flex gap-2">
                  {harmonyColors.analogous.map((color, i) => (
                    <button
                      key={i}
                      className="h-8 w-8 rounded-md border-2 transition-all hover:scale-110 border-transparent"
                      style={{ backgroundColor: color }}
                      onClick={() => handlePresetClick(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Split Complementary */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Split Complementary
                </label>
                <div className="flex gap-2">
                  {harmonyColors.splitComplementary.map((color, i) => (
                    <button
                      key={i}
                      className="h-8 w-8 rounded-md border-2 transition-all hover:scale-110 border-transparent"
                      style={{ backgroundColor: color }}
                      onClick={() => handlePresetClick(color)}
                      title={color}
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
