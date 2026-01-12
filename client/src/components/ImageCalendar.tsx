import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ImageCalendarProps {
  images: ImageData[];
  onDateClick?: (date: Date, images: ImageData[]) => void;
  onImageClick?: (image: ImageData) => void;
  isLoading?: boolean;
}

interface DayData {
  date: Date;
  images: ImageData[];
  okCount: number;
  ngCount: number;
  warningCount: number;
  pendingCount: number;
}

const DAYS_OF_WEEK = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

export function ImageCalendar({ images, onDateClick, onImageClick, isLoading }: ImageCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Group images by date
  const imagesByDate = useMemo(() => {
    const map = new Map<string, ImageData[]>();
    
    images.forEach((img) => {
      if (img.capturedAt) {
        const dateKey = new Date(img.capturedAt).toDateString();
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(img);
      }
    });

    return map;
  }, [images]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (DayData | null)[] = [];

    // Add padding for days before the first of the month
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add actual days
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toDateString();
      const dayImages = imagesByDate.get(dateKey) || [];

      days.push({
        date,
        images: dayImages,
        okCount: dayImages.filter(i => i.analysisResult === "ok").length,
        ngCount: dayImages.filter(i => i.analysisResult === "ng").length,
        warningCount: dayImages.filter(i => i.analysisResult === "warning").length,
        pendingCount: dayImages.filter(i => i.analysisResult === "pending").length,
      });
    }

    return days;
  }, [currentDate, imagesByDate]);

  // Get selected day images
  const selectedDayImages = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toDateString();
    return imagesByDate.get(dateKey) || [];
  }, [selectedDate, imagesByDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDayClick = (dayData: DayData) => {
    setSelectedDate(dayData.date);
    onDateClick?.(dayData.date, dayData.images);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate?.toDateString() === date.toDateString();
  };

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleToday}>
                Hôm nay
              </Button>
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayData, index) => {
              if (!dayData) {
                return <div key={`empty-${index}`} className="h-20" />;
              }

              const hasImages = dayData.images.length > 0;
              const hasNg = dayData.ngCount > 0;
              const hasWarning = dayData.warningCount > 0;

              return (
                <div
                  key={dayData.date.toISOString()}
                  className={cn(
                    "h-20 p-1 rounded-lg border cursor-pointer transition-colors",
                    isToday(dayData.date) && "border-primary",
                    isSelected(dayData.date) && "bg-primary/10 border-primary",
                    hasImages && !isSelected(dayData.date) && "bg-muted/50",
                    !hasImages && "hover:bg-muted/30"
                  )}
                  onClick={() => handleDayClick(dayData)}
                >
                  {/* Day number */}
                  <div className={cn(
                    "text-sm font-medium",
                    isToday(dayData.date) && "text-primary"
                  )}>
                    {dayData.date.getDate()}
                  </div>

                  {/* Image count indicators */}
                  {hasImages && (
                    <div className="mt-1 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <ImageIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{dayData.images.length}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {dayData.okCount > 0 && (
                          <div className="w-2 h-2 rounded-full bg-green-500" title={`OK: ${dayData.okCount}`} />
                        )}
                        {dayData.ngCount > 0 && (
                          <div className="w-2 h-2 rounded-full bg-red-500" title={`NG: ${dayData.ngCount}`} />
                        )}
                        {dayData.warningCount > 0 && (
                          <div className="w-2 h-2 rounded-full bg-yellow-500" title={`Warning: ${dayData.warningCount}`} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>OK</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>NG</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>Warning</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {selectedDate 
              ? selectedDate.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })
              : "Chọn ngày để xem chi tiết"
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDate ? (
            selectedDayImages.length > 0 ? (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded bg-green-500/10">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">OK: {selectedDayImages.filter(i => i.analysisResult === "ok").length}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-red-500/10">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">NG: {selectedDayImages.filter(i => i.analysisResult === "ng").length}</span>
                  </div>
                </div>

                {/* Image list */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {selectedDayImages.map((image) => (
                    <div
                      key={image.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => onImageClick?.(image)}
                    >
                      <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={image.thumbnailUrl || image.imageUrl}
                          alt={image.serialNumber}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{image.serialNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {image.capturedAt && new Date(image.capturedAt).toLocaleTimeString("vi-VN")}
                        </p>
                      </div>
                      {image.analysisResult && (
                        <Badge
                          variant={image.analysisResult === "ok" ? "default" : image.analysisResult === "ng" ? "destructive" : "secondary"}
                          className="flex-shrink-0"
                        >
                          {image.analysisResult.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <ImageIcon className="h-8 w-8 mb-2" />
                <p className="text-sm">Không có ảnh trong ngày này</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <ImageIcon className="h-8 w-8 mb-2" />
              <p className="text-sm">Chọn một ngày trên lịch</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
