import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Square,
  Circle,
  ArrowRight,
  Pencil,
  Type,
  Highlighter,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Save,
  Palette,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

type AnnotationTool = "rectangle" | "circle" | "arrow" | "freehand" | "text" | "highlight";

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
  opacity: number;
  points: Point[];
  text?: string;
  startPoint?: Point;
  endPoint?: Point;
}

interface ImageAnnotatorProps {
  imageUrl: string;
  initialAnnotations?: Annotation[];
  onSave?: (annotations: Annotation[], imageWithAnnotations: string) => void;
  readOnly?: boolean;
}

const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#000000", // black
  "#ffffff", // white
];

export function ImageAnnotator({
  imageUrl,
  initialAnnotations = [],
  onSave,
  readOnly = false,
}: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [currentTool, setCurrentTool] = useState<AnnotationTool>("rectangle");
  const [currentColor, setCurrentColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [opacity, setOpacity] = useState(100);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw everything on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;

    if (!canvas || !ctx || !img) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw all annotations
    const allAnnotations = currentAnnotation
      ? [...annotations, currentAnnotation]
      : annotations;

    allAnnotations.forEach((annotation) => {
      ctx.save();
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      ctx.lineWidth = annotation.strokeWidth;
      ctx.globalAlpha = annotation.opacity / 100;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      switch (annotation.tool) {
        case "rectangle":
          if (annotation.startPoint && annotation.endPoint) {
            const width = annotation.endPoint.x - annotation.startPoint.x;
            const height = annotation.endPoint.y - annotation.startPoint.y;
            ctx.strokeRect(annotation.startPoint.x, annotation.startPoint.y, width, height);
          }
          break;

        case "circle":
          if (annotation.startPoint && annotation.endPoint) {
            const centerX = (annotation.startPoint.x + annotation.endPoint.x) / 2;
            const centerY = (annotation.startPoint.y + annotation.endPoint.y) / 2;
            const radiusX = Math.abs(annotation.endPoint.x - annotation.startPoint.x) / 2;
            const radiusY = Math.abs(annotation.endPoint.y - annotation.startPoint.y) / 2;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;

        case "arrow":
          if (annotation.startPoint && annotation.endPoint) {
            const { startPoint, endPoint } = annotation;
            const headLength = 15;
            const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();

            // Arrow head
            ctx.beginPath();
            ctx.moveTo(endPoint.x, endPoint.y);
            ctx.lineTo(
              endPoint.x - headLength * Math.cos(angle - Math.PI / 6),
              endPoint.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(endPoint.x, endPoint.y);
            ctx.lineTo(
              endPoint.x - headLength * Math.cos(angle + Math.PI / 6),
              endPoint.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
          }
          break;

        case "freehand":
          if (annotation.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
            annotation.points.forEach((point) => {
              ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
          }
          break;

        case "text":
          if (annotation.startPoint && annotation.text) {
            ctx.font = `${annotation.strokeWidth * 6}px sans-serif`;
            ctx.fillText(annotation.text, annotation.startPoint.x, annotation.startPoint.y);
          }
          break;

        case "highlight":
          if (annotation.startPoint && annotation.endPoint) {
            ctx.globalAlpha = 0.3;
            const width = annotation.endPoint.x - annotation.startPoint.x;
            const height = annotation.endPoint.y - annotation.startPoint.y;
            ctx.fillRect(annotation.startPoint.x, annotation.startPoint.y, width, height);
          }
          break;
      }

      ctx.restore();
    });
  }, [annotations, currentAnnotation]);

  // Redraw when dependencies change
  useEffect(() => {
    if (imageLoaded) {
      draw();
    }
  }, [draw, imageLoaded]);

  // Set canvas size when image loads
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const container = containerRef.current;

    if (!canvas || !img || !container || !imageLoaded) return;

    const containerWidth = container.clientWidth;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const canvasWidth = containerWidth;
    const canvasHeight = containerWidth / aspectRatio;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    draw();
  }, [imageLoaded, draw]);

  // Get mouse position relative to canvas
  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readOnly) return;

      const pos = getMousePos(e);

      if (currentTool === "text") {
        setTextPosition(pos);
        return;
      }

      setIsDrawing(true);

      const newAnnotation: Annotation = {
        id: `ann_${Date.now()}`,
        tool: currentTool,
        color: currentColor,
        strokeWidth,
        opacity,
        points: currentTool === "freehand" ? [pos] : [],
        startPoint: pos,
        endPoint: pos,
      };

      setCurrentAnnotation(newAnnotation);
    },
    [readOnly, currentTool, currentColor, strokeWidth, opacity, getMousePos]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !currentAnnotation || readOnly) return;

      const pos = getMousePos(e);

      if (currentTool === "freehand") {
        setCurrentAnnotation({
          ...currentAnnotation,
          points: [...currentAnnotation.points, pos],
        });
      } else {
        setCurrentAnnotation({
          ...currentAnnotation,
          endPoint: pos,
        });
      }
    },
    [isDrawing, currentAnnotation, currentTool, readOnly, getMousePos]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentAnnotation || readOnly) return;

    setIsDrawing(false);

    // Add to annotations
    const newAnnotations = [...annotations, currentAnnotation];
    setAnnotations(newAnnotations);

    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setCurrentAnnotation(null);
  }, [isDrawing, currentAnnotation, annotations, history, historyIndex, readOnly]);

  // Add text annotation
  const handleAddText = useCallback(() => {
    if (!textPosition || !textInput.trim()) return;

    const newAnnotation: Annotation = {
      id: `ann_${Date.now()}`,
      tool: "text",
      color: currentColor,
      strokeWidth,
      opacity,
      points: [],
      startPoint: textPosition,
      text: textInput,
    };

    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);

    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setTextInput("");
    setTextPosition(null);
  }, [textPosition, textInput, currentColor, strokeWidth, opacity, annotations, history, historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  // Clear all
  const handleClear = useCallback(() => {
    setAnnotations([]);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Export image with annotations
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `annotated_${Date.now()}.png`;
    link.click();
  }, []);

  // Save annotations
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSave?.(annotations, dataUrl);
  }, [annotations, onSave]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">Annotation Tools</CardTitle>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleUndo} disabled={historyIndex <= 0}>
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleClear}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
              {onSave && (
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Lưu
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-4">
            {/* Tool Selection */}
            <ToggleGroup
              type="single"
              value={currentTool}
              onValueChange={(value) => value && setCurrentTool(value as AnnotationTool)}
            >
              <ToggleGroupItem value="rectangle" aria-label="Rectangle">
                <Square className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="circle" aria-label="Circle">
                <Circle className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="arrow" aria-label="Arrow">
                <ArrowRight className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="freehand" aria-label="Freehand">
                <Pencil className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="text" aria-label="Text">
                <Type className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="highlight" aria-label="Highlight">
                <Highlighter className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Color Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: currentColor }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-full border-2 ${
                        currentColor === color ? "border-primary" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCurrentColor(color)}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Stroke Width */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Palette className="h-4 w-4 mr-2" />
                  {strokeWidth}px
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <Label>Độ dày nét: {strokeWidth}px</Label>
                  <Slider
                    value={[strokeWidth]}
                    onValueChange={([v]) => setStrokeWidth(v)}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* Opacity */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Opacity: {opacity}%
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <Label>Độ trong suốt: {opacity}%</Label>
                  <Slider
                    value={[opacity]}
                    onValueChange={([v]) => setOpacity(v)}
                    min={10}
                    max={100}
                    step={10}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Text Input Dialog */}
        {textPosition && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <Input
              placeholder="Nhập text..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddText()}
              autoFocus
            />
            <Button onClick={handleAddText}>Thêm</Button>
            <Button variant="outline" onClick={() => setTextPosition(null)}>
              Hủy
            </Button>
          </div>
        )}

        {/* Canvas Container */}
        <div ref={containerRef} className="relative bg-muted rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
        </div>

        {/* Annotation Count */}
        <div className="text-sm text-muted-foreground">
          {annotations.length} annotation(s)
        </div>
      </CardContent>
    </Card>
  );
}

export default ImageAnnotator;
