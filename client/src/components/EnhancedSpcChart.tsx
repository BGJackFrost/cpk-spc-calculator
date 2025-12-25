/**
 * Enhanced SPC Chart Component
 * Biểu đồ SPC nâng cao với annotations, markers, timeline slider
 * Task: SPC-01
 */

import { useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Brush,
  ComposedChart,
  Area,
  Scatter,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  Flag,
  MessageSquare,
  Clock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Settings,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface ChartData {
  index: number;
  value: number;
  timestamp?: Date;
  isViolation?: boolean;
  violationRule?: string;
}

interface Annotation {
  id: string;
  index: number;
  type: "note" | "event" | "alert" | "milestone";
  title: string;
  description?: string;
  color: string;
  createdAt: Date;
  createdBy?: string;
}

interface Marker {
  id: string;
  startIndex: number;
  endIndex: number;
  type: "shift" | "batch" | "maintenance" | "custom";
  label: string;
  color: string;
}

interface EnhancedSpcChartProps {
  data: ChartData[];
  mean: number;
  ucl: number;
  lcl: number;
  usl?: number | null;
  lsl?: number | null;
  title?: string;
  description?: string;
  showSigmaZones?: boolean;
  annotations?: Annotation[];
  markers?: Marker[];
  onAnnotationAdd?: (annotation: Omit<Annotation, "id" | "createdAt">) => void;
  onAnnotationDelete?: (id: string) => void;
  onMarkerAdd?: (marker: Omit<Marker, "id">) => void;
  onMarkerDelete?: (id: string) => void;
  readOnly?: boolean;
}

const ANNOTATION_TYPES = [
  { value: "note", label: "Ghi chú", color: "#3b82f6" },
  { value: "event", label: "Sự kiện", color: "#10b981" },
  { value: "alert", label: "Cảnh báo", color: "#ef4444" },
  { value: "milestone", label: "Mốc quan trọng", color: "#8b5cf6" },
];

const MARKER_TYPES = [
  { value: "shift", label: "Ca làm việc", color: "#fbbf24" },
  { value: "batch", label: "Lô sản xuất", color: "#06b6d4" },
  { value: "maintenance", label: "Bảo trì", color: "#f97316" },
  { value: "custom", label: "Tùy chỉnh", color: "#ec4899" },
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  const isViolation = data?.isViolation;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold">Mẫu #{label}</span>
        {isViolation && (
          <Badge variant="destructive" className="text-xs">
            Vi phạm
          </Badge>
        )}
      </div>
      {data?.timestamp && (
        <div className="text-xs text-muted-foreground mb-2">
          <Clock className="inline h-3 w-3 mr-1" />
          {format(new Date(data.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between text-sm">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-medium">{entry.value?.toFixed(4)}</span>
          </div>
        ))}
      </div>
      {isViolation && data?.violationRule && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {data.violationRule}
          </div>
        </div>
      )}
    </div>
  );
};

// Annotation marker component
const AnnotationMarker = ({
  annotation,
  x,
  y,
  onClick,
}: {
  annotation: Annotation;
  x: number;
  y: number;
  onClick: () => void;
}) => {
  const iconMap = {
    note: MessageSquare,
    event: Flag,
    alert: AlertTriangle,
    milestone: CheckCircle2,
  };
  const Icon = iconMap[annotation.type];

  return (
    <g transform={`translate(${x}, ${y})`} onClick={onClick} style={{ cursor: "pointer" }}>
      <circle r={12} fill={annotation.color} opacity={0.2} />
      <circle r={8} fill={annotation.color} />
      <foreignObject x={-6} y={-6} width={12} height={12}>
        <Icon className="h-3 w-3 text-white" />
      </foreignObject>
    </g>
  );
};

export default function EnhancedSpcChart({
  data,
  mean,
  ucl,
  lcl,
  usl,
  lsl,
  title = "Biểu đồ X-Bar",
  description = "Biểu đồ kiểm soát giá trị trung bình",
  showSigmaZones = true,
  annotations = [],
  markers = [],
  onAnnotationAdd,
  onAnnotationDelete,
  onMarkerAdd,
  onMarkerDelete,
  readOnly = false,
}: EnhancedSpcChartProps) {
  // State
  const [timelineRange, setTimelineRange] = useState<[number, number]>([0, 100]);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showSigma, setShowSigma] = useState(showSigmaZones);
  const [showSpec, setShowSpec] = useState(true);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState({
    index: 0,
    type: "note" as const,
    title: "",
    description: "",
  });
  const [newMarker, setNewMarker] = useState({
    startIndex: 0,
    endIndex: 0,
    type: "shift" as const,
    label: "",
  });

  // Calculate sigma zones
  const sigma = (ucl - mean) / 3;
  const sigma1Up = mean + sigma;
  const sigma1Down = mean - sigma;
  const sigma2Up = mean + 2 * sigma;
  const sigma2Down = mean - 2 * sigma;

  // Filter data based on timeline range
  const filteredData = useMemo(() => {
    const startIdx = Math.floor((timelineRange[0] / 100) * data.length);
    const endIdx = Math.ceil((timelineRange[1] / 100) * data.length);
    return data.slice(startIdx, endIdx);
  }, [data, timelineRange]);

  // Calculate statistics for filtered data
  const filteredStats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const values = filteredData.map((d) => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const violations = filteredData.filter((d) => d.isViolation).length;

    return { avg, stdDev, min, max, count: values.length, violations };
  }, [filteredData]);

  // Handle zoom
  const handleZoomIn = () => {
    const range = timelineRange[1] - timelineRange[0];
    if (range > 20) {
      const center = (timelineRange[0] + timelineRange[1]) / 2;
      const newRange = range * 0.7;
      setTimelineRange([
        Math.max(0, center - newRange / 2),
        Math.min(100, center + newRange / 2),
      ]);
    }
  };

  const handleZoomOut = () => {
    const range = timelineRange[1] - timelineRange[0];
    if (range < 100) {
      const center = (timelineRange[0] + timelineRange[1]) / 2;
      const newRange = Math.min(100, range * 1.4);
      setTimelineRange([
        Math.max(0, center - newRange / 2),
        Math.min(100, center + newRange / 2),
      ]);
    }
  };

  const handleReset = () => {
    setTimelineRange([0, 100]);
  };

  // Handle annotation add
  const handleAddAnnotation = () => {
    if (!newAnnotation.title.trim()) return;
    const typeConfig = ANNOTATION_TYPES.find((t) => t.value === newAnnotation.type);
    onAnnotationAdd?.({
      index: newAnnotation.index,
      type: newAnnotation.type,
      title: newAnnotation.title,
      description: newAnnotation.description,
      color: typeConfig?.color || "#3b82f6",
    });
    setNewAnnotation({ index: 0, type: "note", title: "", description: "" });
    setIsAddingAnnotation(false);
  };

  // Handle marker add
  const handleAddMarker = () => {
    if (!newMarker.label.trim()) return;
    const typeConfig = MARKER_TYPES.find((t) => t.value === newMarker.type);
    onMarkerAdd?.({
      startIndex: newMarker.startIndex,
      endIndex: newMarker.endIndex,
      type: newMarker.type,
      label: newMarker.label,
      color: typeConfig?.color || "#fbbf24",
    });
    setNewMarker({ startIndex: 0, endIndex: 0, type: "shift", label: "" });
    setIsAddingMarker(false);
  };

  // Prepare chart data with annotations
  const chartData = useMemo(() => {
    return filteredData.map((d) => ({
      ...d,
      mean,
      ucl,
      lcl,
      sigma1Up,
      sigma1Down,
      sigma2Up,
      sigma2Down,
      usl: usl ?? undefined,
      lsl: lsl ?? undefined,
    }));
  }, [filteredData, mean, ucl, lcl, sigma1Up, sigma1Down, sigma2Up, sigma2Down, usl, lsl]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Settings popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Hiển thị</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-annotations" className="text-sm">
                        Annotations
                      </Label>
                      <Switch
                        id="show-annotations"
                        checked={showAnnotations}
                        onCheckedChange={setShowAnnotations}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-markers" className="text-sm">
                        Markers
                      </Label>
                      <Switch
                        id="show-markers"
                        checked={showMarkers}
                        onCheckedChange={setShowMarkers}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-sigma" className="text-sm">
                        Vùng Sigma
                      </Label>
                      <Switch
                        id="show-sigma"
                        checked={showSigma}
                        onCheckedChange={setShowSigma}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-spec" className="text-sm">
                        Giới hạn Spec
                      </Label>
                      <Switch
                        id="show-spec"
                        checked={showSpec}
                        onCheckedChange={setShowSpec}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Add buttons */}
            {!readOnly && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingAnnotation(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Annotation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingMarker(true)}
                >
                  <Flag className="h-4 w-4 mr-1" />
                  Marker
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Statistics summary */}
        {filteredStats && (
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Số mẫu:</span>
              <span className="font-medium">{filteredStats.count}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">TB:</span>
              <span className="font-medium">{filteredStats.avg.toFixed(4)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">StdDev:</span>
              <span className="font-medium">{filteredStats.stdDev.toFixed(4)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Min:</span>
              <span className="font-medium">{filteredStats.min.toFixed(4)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Max:</span>
              <span className="font-medium">{filteredStats.max.toFixed(4)}</span>
            </div>
            {filteredStats.violations > 0 && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">{filteredStats.violations} vi phạm</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Main chart */}
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="index"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `#${value}`}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              domain={["auto", "auto"]}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Sigma zones */}
            {showSigma && (
              <>
                <ReferenceArea
                  y1={sigma2Up}
                  y2={ucl}
                  fill="#fef3c7"
                  fillOpacity={0.3}
                  label={{ value: "+2σ to +3σ", position: "right", fontSize: 10 }}
                />
                <ReferenceArea
                  y1={sigma1Up}
                  y2={sigma2Up}
                  fill="#fef9c3"
                  fillOpacity={0.3}
                  label={{ value: "+1σ to +2σ", position: "right", fontSize: 10 }}
                />
                <ReferenceArea
                  y1={mean}
                  y2={sigma1Up}
                  fill="#dcfce7"
                  fillOpacity={0.3}
                />
                <ReferenceArea
                  y1={sigma1Down}
                  y2={mean}
                  fill="#dcfce7"
                  fillOpacity={0.3}
                />
                <ReferenceArea
                  y1={sigma2Down}
                  y2={sigma1Down}
                  fill="#fef9c3"
                  fillOpacity={0.3}
                  label={{ value: "-1σ to -2σ", position: "right", fontSize: 10 }}
                />
                <ReferenceArea
                  y1={lcl}
                  y2={sigma2Down}
                  fill="#fef3c7"
                  fillOpacity={0.3}
                  label={{ value: "-2σ to -3σ", position: "right", fontSize: 10 }}
                />
              </>
            )}

            {/* Markers */}
            {showMarkers &&
              markers.map((marker) => (
                <ReferenceArea
                  key={marker.id}
                  x1={marker.startIndex}
                  x2={marker.endIndex}
                  fill={marker.color}
                  fillOpacity={0.15}
                  label={{
                    value: marker.label,
                    position: "top",
                    fontSize: 10,
                    fill: marker.color,
                  }}
                />
              ))}

            {/* Control limits */}
            <ReferenceLine
              y={ucl}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: `UCL: ${ucl.toFixed(4)}`, position: "right", fontSize: 10 }}
            />
            <ReferenceLine
              y={mean}
              stroke="#3b82f6"
              strokeWidth={2}
              label={{ value: `Mean: ${mean.toFixed(4)}`, position: "right", fontSize: 10 }}
            />
            <ReferenceLine
              y={lcl}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: `LCL: ${lcl.toFixed(4)}`, position: "right", fontSize: 10 }}
            />

            {/* Spec limits */}
            {showSpec && usl && (
              <ReferenceLine
                y={usl}
                stroke="#8b5cf6"
                strokeDasharray="10 5"
                label={{ value: `USL: ${usl.toFixed(4)}`, position: "right", fontSize: 10 }}
              />
            )}
            {showSpec && lsl && (
              <ReferenceLine
                y={lsl}
                stroke="#8b5cf6"
                strokeDasharray="10 5"
                label={{ value: `LSL: ${lsl.toFixed(4)}`, position: "right", fontSize: 10 }}
              />
            )}

            {/* Data line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.isViolation) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="#ef4444"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  );
                }
                return <circle cx={cx} cy={cy} r={4} fill="#3b82f6" />;
              }}
              name="Giá trị"
              activeDot={{ r: 8 }}
            />

            {/* Brush for timeline selection */}
            <Brush
              dataKey="index"
              height={30}
              stroke="#3b82f6"
              startIndex={Math.floor((timelineRange[0] / 100) * data.length)}
              endIndex={Math.ceil((timelineRange[1] / 100) * data.length) - 1}
              onChange={(e: any) => {
                if (e.startIndex !== undefined && e.endIndex !== undefined) {
                  setTimelineRange([
                    (e.startIndex / data.length) * 100,
                    ((e.endIndex + 1) / data.length) * 100,
                  ]);
                }
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Timeline slider */}
        <div className="mt-4 px-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Timeline:</span>
            <Slider
              value={timelineRange}
              onValueChange={(value) => setTimelineRange(value as [number, number])}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-24 text-right">
              {Math.floor((timelineRange[0] / 100) * data.length)} -{" "}
              {Math.ceil((timelineRange[1] / 100) * data.length)}
            </span>
          </div>
        </div>

        {/* Annotations list */}
        {showAnnotations && annotations.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Annotations</h4>
            <div className="space-y-2">
              {annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted cursor-pointer"
                  onClick={() => setSelectedAnnotation(annotation)}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: annotation.color }}
                  />
                  <span className="text-sm font-medium">#{annotation.index}</span>
                  <span className="text-sm">{annotation.title}</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {ANNOTATION_TYPES.find((t) => t.value === annotation.type)?.label}
                  </Badge>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnnotationDelete?.(annotation.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Markers list */}
        {showMarkers && markers.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Markers</h4>
            <div className="flex flex-wrap gap-2">
              {markers.map((marker) => (
                <Badge
                  key={marker.id}
                  variant="outline"
                  className="flex items-center gap-1"
                  style={{ borderColor: marker.color, color: marker.color }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: marker.color }}
                  />
                  {marker.label} (#{marker.startIndex} - #{marker.endIndex})
                  {!readOnly && (
                    <button
                      className="ml-1 hover:opacity-70"
                      onClick={() => onMarkerDelete?.(marker.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Add Annotation Dialog */}
      <Dialog open={isAddingAnnotation} onOpenChange={setIsAddingAnnotation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Annotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vị trí (Index)</Label>
                <Input
                  type="number"
                  min={1}
                  max={data.length}
                  value={newAnnotation.index}
                  onChange={(e) =>
                    setNewAnnotation({ ...newAnnotation, index: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Loại</Label>
                <Select
                  value={newAnnotation.type}
                  onValueChange={(value: any) =>
                    setNewAnnotation({ ...newAnnotation, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNOTATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: type.color }}
                          />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input
                value={newAnnotation.title}
                onChange={(e) =>
                  setNewAnnotation({ ...newAnnotation, title: e.target.value })
                }
                placeholder="Nhập tiêu đề annotation..."
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả (tùy chọn)</Label>
              <Textarea
                value={newAnnotation.description}
                onChange={(e) =>
                  setNewAnnotation({ ...newAnnotation, description: e.target.value })
                }
                placeholder="Nhập mô tả chi tiết..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingAnnotation(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddAnnotation}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Marker Dialog */}
      <Dialog open={isAddingMarker} onOpenChange={setIsAddingMarker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Marker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Từ Index</Label>
                <Input
                  type="number"
                  min={1}
                  max={data.length}
                  value={newMarker.startIndex}
                  onChange={(e) =>
                    setNewMarker({ ...newMarker, startIndex: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Đến Index</Label>
                <Input
                  type="number"
                  min={1}
                  max={data.length}
                  value={newMarker.endIndex}
                  onChange={(e) =>
                    setNewMarker({ ...newMarker, endIndex: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Loại</Label>
              <Select
                value={newMarker.type}
                onValueChange={(value: any) => setNewMarker({ ...newMarker, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nhãn</Label>
              <Input
                value={newMarker.label}
                onChange={(e) => setNewMarker({ ...newMarker, label: e.target.value })}
                placeholder="Nhập nhãn marker..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingMarker(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddMarker}>Thêm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Annotation Detail Dialog */}
      <Dialog open={!!selectedAnnotation} onOpenChange={() => setSelectedAnnotation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedAnnotation?.color }}
              />
              {selectedAnnotation?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Vị trí: #{selectedAnnotation?.index}</span>
              <Badge variant="outline">
                {ANNOTATION_TYPES.find((t) => t.value === selectedAnnotation?.type)?.label}
              </Badge>
            </div>
            {selectedAnnotation?.description && (
              <p className="text-sm">{selectedAnnotation.description}</p>
            )}
            <div className="text-xs text-muted-foreground">
              Tạo lúc:{" "}
              {selectedAnnotation?.createdAt &&
                format(new Date(selectedAnnotation.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAnnotation(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
