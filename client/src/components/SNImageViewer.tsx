import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZoomIn, ZoomOut, RotateCcw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface MeasurementPoint {
  x: number;
  y: number;
  label: string;
  value: number;
  unit: string;
  result: 'ok' | 'ng' | 'warning';
  tolerance: { min: number; max: number };
}

interface DefectLocation {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  severity: 'high' | 'medium' | 'low';
}

interface SNImageViewerProps {
  open: boolean;
  onClose: () => void;
  image: {
    id: number;
    serialNumber: string;
    imageUrl: string;
    analysisResult?: 'ok' | 'ng' | 'warning' | 'pending' | null;
    qualityScore?: string | null;
    measurementPoints?: MeasurementPoint[] | null;
    defectLocations?: DefectLocation[] | null;
    capturedAt?: string | null;
    analyzedAt?: string | null;
  } | null;
}

const resultConfig = {
  ok: { label: 'OK', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4" /> },
  ng: { label: 'NG', color: 'bg-red-500', icon: <XCircle className="h-4 w-4" /> },
  warning: { label: 'Warning', color: 'bg-yellow-500', icon: <AlertTriangle className="h-4 w-4" /> },
  pending: { label: 'Pending', color: 'bg-gray-500', icon: null },
};

const severityColors = {
  high: 'border-red-500 bg-red-500/20',
  medium: 'border-yellow-500 bg-yellow-500/20',
  low: 'border-blue-500 bg-blue-500/20',
};

export function SNImageViewer({ open, onClose, image }: SNImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showDefects, setShowDefects] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, image?.id]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset = () => { setZoom(1); setPosition({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(Math.max(z + delta, 0.5), 4));
  };

  if (!image) return null;

  const measurementPoints = (image.measurementPoints as MeasurementPoint[]) || [];
  const defectLocations = (image.defectLocations as DefectLocation[]) || [];
  const result = image.analysisResult as keyof typeof resultConfig;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4">
            <span>Chi tiết ảnh - {image.serialNumber}</span>
            {result && resultConfig[result] && (
              <Badge className={resultConfig[result].color}>
                {resultConfig[result].icon}
                <span className="ml-1">{resultConfig[result].label}</span>
              </Badge>
            )}
            {image.qualityScore && (
              <Badge variant="outline">Score: {parseFloat(image.qualityScore).toFixed(1)}%</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Button size="sm" variant="outline" onClick={handleZoomIn}><ZoomIn className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={handleZoomOut}><ZoomOut className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={handleReset}><RotateCcw className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
              <div className="flex-1" />
              <Button size="sm" variant={showMeasurements ? 'default' : 'outline'} onClick={() => setShowMeasurements(!showMeasurements)}>Điểm đo</Button>
              <Button size="sm" variant={showDefects ? 'default' : 'outline'} onClick={() => setShowDefects(!showDefects)}>Vùng lỗi</Button>
            </div>

            <div ref={containerRef} className="flex-1 relative overflow-hidden bg-muted rounded-lg cursor-move" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
              <div className="absolute" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`, transformOrigin: 'center', transition: isDragging ? 'none' : 'transform 0.1s' }}>
                <img src={image.imageUrl} alt={image.serialNumber} className="max-w-none" draggable={false} />
                {showMeasurements && measurementPoints.map((point, idx) => (
                  <div key={`mp-${idx}`} className="absolute" style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${point.result === 'ok' ? 'border-green-500 bg-green-500/50 text-white' : point.result === 'ng' ? 'border-red-500 bg-red-500/50 text-white' : 'border-yellow-500 bg-yellow-500/50 text-white'}`}>{idx + 1}</div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap bg-background/90 px-2 py-1 rounded text-xs shadow">{point.label}: {point.value} {point.unit}</div>
                  </div>
                ))}
                {showDefects && defectLocations.map((defect, idx) => (
                  <div key={`df-${idx}`} className={`absolute border-2 ${severityColors[defect.severity]}`} style={{ left: `${defect.x}%`, top: `${defect.y}%`, width: `${defect.width}%`, height: `${defect.height}%` }}>
                    <span className="absolute -top-5 left-0 text-xs bg-background/90 px-1 rounded">{defect.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-80 flex flex-col overflow-hidden">
            <Tabs defaultValue="measurements" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="measurements">Điểm đo ({measurementPoints.length})</TabsTrigger>
                <TabsTrigger value="defects">Lỗi ({defectLocations.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="measurements" className="flex-1 overflow-auto">
                {measurementPoints.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Không có điểm đo</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Tên</TableHead><TableHead>Giá trị</TableHead><TableHead>Dung sai</TableHead><TableHead>KQ</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {measurementPoints.map((point, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-medium">{point.label}</TableCell>
                          <TableCell>{point.value} {point.unit}</TableCell>
                          <TableCell className="text-xs">{point.tolerance.min} - {point.tolerance.max}</TableCell>
                          <TableCell><Badge variant={point.result === 'ok' ? 'default' : point.result === 'ng' ? 'destructive' : 'secondary'} className="text-xs">{point.result.toUpperCase()}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
              <TabsContent value="defects" className="flex-1 overflow-auto">
                {defectLocations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Không phát hiện lỗi</p>
                ) : (
                  <div className="space-y-2">
                    {defectLocations.map((defect, idx) => (
                      <Card key={idx}>
                        <CardHeader className="py-2 px-3"><CardTitle className="text-sm flex items-center justify-between">{defect.type}<Badge variant={defect.severity === 'high' ? 'destructive' : defect.severity === 'medium' ? 'secondary' : 'outline'}>{defect.severity}</Badge></CardTitle></CardHeader>
                        <CardContent className="py-2 px-3 text-xs text-muted-foreground">Vị trí: ({defect.x.toFixed(1)}%, {defect.y.toFixed(1)}%) - Kích thước: {defect.width.toFixed(1)}% x {defect.height.toFixed(1)}%</CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            <Card className="mt-4">
              <CardHeader className="py-2 px-3"><CardTitle className="text-sm">Thông tin</CardTitle></CardHeader>
              <CardContent className="py-2 px-3 text-xs space-y-1">
                <p><span className="text-muted-foreground">Serial Number:</span> {image.serialNumber}</p>
                {image.capturedAt && <p><span className="text-muted-foreground">Chụp lúc:</span> {new Date(image.capturedAt).toLocaleString('vi-VN')}</p>}
                {image.analyzedAt && <p><span className="text-muted-foreground">Phân tích lúc:</span> {new Date(image.analyzedAt).toLocaleString('vi-VN')}</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
