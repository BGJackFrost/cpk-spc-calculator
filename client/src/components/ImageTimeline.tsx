import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";

type AnalysisResult = "ok" | "ng" | "warning" | "pending";

interface ImageData {
  id: number;
  serialNumber: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  analysisResult: AnalysisResult | null;
  qualityScore?: string | null;
  defectsFound: number;
  capturedAt: string | null;
  productionLineId?: number | null;
  workstationId?: number | null;
}

interface ImageTimelineProps {
  images: ImageData[];
  onImageClick?: (image: ImageData) => void;
  isLoading?: boolean;
}

const resultConfig: Record<AnalysisResult, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  ok: { label: "OK", color: "text-green-500", bgColor: "bg-green-500", icon: <CheckCircle className="h-3 w-3" /> },
  ng: { label: "NG", color: "text-red-500", bgColor: "bg-red-500", icon: <XCircle className="h-3 w-3" /> },
  warning: { label: "Warning", color: "text-yellow-500", bgColor: "bg-yellow-500", icon: <AlertTriangle className="h-3 w-3" /> },
  pending: { label: "Pending", color: "text-gray-500", bgColor: "bg-gray-500", icon: <Clock className="h-3 w-3" /> },
};

export function ImageTimeline({ images, onImageClick, isLoading }: ImageTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState(50);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Group images by date
  const groupedImages = useMemo(() => {
    const groups: Record<string, ImageData[]> = {};
    
    images.forEach((img) => {
      const date = img.capturedAt 
        ? new Date(img.capturedAt).toLocaleDateString("vi-VN")
        : "Không xác định";
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(img);
    });

    // Sort dates descending
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === "Không xác định") return 1;
      if (b[0] === "Không xác định") return -1;
      return new Date(b[0].split("/").reverse().join("-")).getTime() - 
             new Date(a[0].split("/").reverse().join("-")).getTime();
    });
  }, [images]);

  // Calculate thumbnail size based on zoom level
  const thumbnailSize = useMemo(() => {
    const minSize = 60;
    const maxSize = 160;
    return minSize + ((maxSize - minSize) * zoomLevel) / 100;
  }, [zoomLevel]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(100, prev + 10));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0, prev - 10));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Đang tải...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (images.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Không có ảnh nào</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Timeline ({images.length} ảnh)</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={zoomLevel <= 0}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="w-32">
              <Slider
                value={[zoomLevel]}
                onValueChange={([val]) => setZoomLevel(val)}
                min={0}
                max={100}
                step={5}
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={zoomLevel >= 100}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {/* Timeline content */}
          <div className="space-y-6 pl-10">
            {groupedImages.map(([date, dateImages]) => (
              <div key={date} className="relative">
                {/* Date marker */}
                <div className="absolute -left-10 top-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">
                    {date.split("/")[0]}
                  </span>
                </div>

                {/* Date header */}
                <div className="mb-3">
                  <h3 className="font-semibold text-sm">{date}</h3>
                  <p className="text-xs text-muted-foreground">
                    {dateImages.length} ảnh • 
                    OK: {dateImages.filter(i => i.analysisResult === "ok").length} • 
                    NG: {dateImages.filter(i => i.analysisResult === "ng").length}
                  </p>
                </div>

                {/* Images grid */}
                <div className="flex flex-wrap gap-2">
                  {dateImages.map((image) => {
                    const result = image.analysisResult as AnalysisResult;
                    const config = result ? resultConfig[result] : null;

                    return (
                      <div
                        key={image.id}
                        className="relative group cursor-pointer transition-transform hover:scale-105"
                        style={{ width: thumbnailSize, height: thumbnailSize }}
                        onClick={() => onImageClick?.(image)}
                      >
                        {/* Image */}
                        <div className="w-full h-full rounded-lg overflow-hidden bg-muted border-2 border-transparent hover:border-primary transition-colors">
                          <img
                            src={image.thumbnailUrl || image.imageUrl}
                            alt={image.serialNumber}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        {/* Result badge */}
                        {config && (
                          <div className={`absolute top-1 right-1 ${config.bgColor} rounded-full p-0.5`}>
                            {config.icon}
                          </div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center p-1">
                          <span className="text-white text-xs font-medium truncate w-full text-center">
                            {image.serialNumber}
                          </span>
                          {image.qualityScore && (
                            <span className="text-white/80 text-xs">
                              {parseFloat(image.qualityScore).toFixed(0)}%
                            </span>
                          )}
                          {image.capturedAt && (
                            <span className="text-white/60 text-xs">
                              {new Date(image.capturedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>

                        {/* Defects indicator */}
                        {image.defectsFound > 0 && (
                          <div className="absolute bottom-1 left-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                            {image.defectsFound}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
