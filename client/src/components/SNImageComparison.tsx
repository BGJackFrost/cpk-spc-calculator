/**
 * SNImageComparison - Component so sánh ảnh giữa các Serial Number
 * Hỗ trợ side-by-side, overlay, slider và zoom đồng bộ
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc';
import { 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Columns,
  Layers,
  SlidersHorizontal,
  Plus,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Move,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageData {
  id: number;
  serialNumber: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  analysisResult?: 'ok' | 'ng' | 'warning' | 'pending' | null;
  qualityScore?: string | null;
  capturedAt?: string | null;
  measurementsCount?: number;
  defectsFound?: number;
}

interface ComparisonSlot {
  id: string;
  image: ImageData | null;
  label?: string;
}

const resultConfig = {
  ok: { label: 'OK', color: 'bg-green-500', icon: <CheckCircle className="h-4 w-4" /> },
  ng: { label: 'NG', color: 'bg-red-500', icon: <XCircle className="h-4 w-4" /> },
  warning: { label: 'Warning', color: 'bg-yellow-500', icon: <AlertTriangle className="h-4 w-4" /> },
  pending: { label: 'Pending', color: 'bg-gray-500', icon: null },
};

type ComparisonMode = 'side-by-side' | 'overlay' | 'slider';

interface SNImageComparisonProps {
  className?: string;
  maxSlots?: number;
  initialMode?: ComparisonMode;
}

export function SNImageComparison({ 
  className, 
  maxSlots = 4,
  initialMode = 'side-by-side' 
}: SNImageComparisonProps) {
  const [slots, setSlots] = useState<ComparisonSlot[]>([
    { id: '1', image: null, label: 'Ảnh 1' },
    { id: '2', image: null, label: 'Ảnh 2' },
  ]);
  const [mode, setMode] = useState<ComparisonMode>(initialMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  // Zoom and pan state (synchronized across all images)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Overlay mode state
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [overlayBlendMode, setOverlayBlendMode] = useState<'normal' | 'difference' | 'multiply'>('difference');
  
  // Slider mode state
  const [sliderPosition, setSliderPosition] = useState(50);

  const containerRef = useRef<HTMLDivElement>(null);

  // Search for serial numbers
  const { data: searchResults, isLoading: isSearching } = trpc.snImage.list.useQuery(
    { serialNumber: searchQuery, limit: 20 },
    { enabled: searchQuery.length > 0 }
  );

  // Add new slot
  const addSlot = () => {
    if (slots.length >= maxSlots) {
      toast.error(`Tối đa ${maxSlots} ảnh`);
      return;
    }
    setSlots(prev => [
      ...prev,
      { id: String(Date.now()), image: null, label: `Ảnh ${prev.length + 1}` }
    ]);
  };

  // Remove slot
  const removeSlot = (slotId: string) => {
    if (slots.length <= 2) {
      toast.error('Cần ít nhất 2 ảnh để so sánh');
      return;
    }
    setSlots(prev => prev.filter(s => s.id !== slotId));
  };

  // Select image for slot
  const selectImageForSlot = (slotId: string, image: ImageData) => {
    setSlots(prev => prev.map(s => 
      s.id === slotId ? { ...s, image, label: image.serialNumber } : s
    ));
    setSelectedSlot(null);
    setSearchQuery('');
  };

  // Clear slot
  const clearSlot = (slotId: string) => {
    setSlots(prev => prev.map(s => 
      s.id === slotId ? { ...s, image: null, label: `Ảnh ${slots.findIndex(slot => slot.id === slotId) + 1}` } : s
    ));
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(Math.max(z + delta, 0.5), 4));
  }, []);

  // Get images with content
  const imagesWithContent = slots.filter(s => s.image !== null);

  // Render image with zoom/pan
  const renderImage = (slot: ComparisonSlot, index: number) => {
    if (!slot.image) {
      return (
        <div 
          className="flex-1 flex flex-col items-center justify-center bg-muted rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setSelectedSlot(slot.id)}
        >
          <Plus className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Chọn ảnh</p>
        </div>
      );
    }

    const result = slot.image.analysisResult as keyof typeof resultConfig;

    return (
      <div className="flex-1 flex flex-col min-w-0">
        {/* Image header */}
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-t-lg">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{slot.image.serialNumber}</span>
            {result && resultConfig[result] && (
              <Badge className={cn("text-xs", resultConfig[result].color)}>
                {resultConfig[result].icon}
                <span className="ml-1">{resultConfig[result].label}</span>
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setSelectedSlot(slot.id)}
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => clearSlot(slot.id)}
            >
              <X className="h-3 w-3" />
            </Button>
            {slots.length > 2 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive"
                onClick={() => removeSlot(slot.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Image container */}
        <div 
          className="flex-1 overflow-hidden bg-black rounded-b-lg cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s',
            }}
            className="w-full h-full flex items-center justify-center"
          >
            <img
              src={slot.image.imageUrl}
              alt={slot.image.serialNumber}
              className="max-w-full max-h-full object-contain"
              draggable={false}
            />
          </div>
        </div>

        {/* Image info */}
        <div className="p-2 text-xs text-muted-foreground bg-muted/30 rounded-b-lg">
          <div className="flex justify-between">
            <span>Score: {slot.image.qualityScore ? `${parseFloat(slot.image.qualityScore).toFixed(1)}%` : 'N/A'}</span>
            <span>Đo: {slot.image.measurementsCount || 0} | Lỗi: {slot.image.defectsFound || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render overlay mode
  const renderOverlayMode = () => {
    if (imagesWithContent.length < 2) {
      return (
        <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
          <p className="text-muted-foreground">Cần ít nhất 2 ảnh để so sánh overlay</p>
        </div>
      );
    }

    const baseImage = imagesWithContent[0].image!;
    const overlayImage = imagesWithContent[1].image!;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label>Độ trong suốt overlay</Label>
            <Slider
              value={[overlayOpacity * 100]}
              onValueChange={([v]) => setOverlayOpacity(v / 100)}
              max={100}
              step={1}
            />
          </div>
          <div className="w-40">
            <Label>Blend mode</Label>
            <Select value={overlayBlendMode} onValueChange={(v: typeof overlayBlendMode) => setOverlayBlendMode(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="difference">Difference</SelectItem>
                <SelectItem value="multiply">Multiply</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="relative aspect-video bg-black rounded-lg overflow-hidden cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s',
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Base image */}
            <img
              src={baseImage.imageUrl}
              alt={baseImage.serialNumber}
              className="absolute max-w-full max-h-full object-contain"
              draggable={false}
            />
            {/* Overlay image */}
            <img
              src={overlayImage.imageUrl}
              alt={overlayImage.serialNumber}
              className="absolute max-w-full max-h-full object-contain"
              style={{
                opacity: overlayOpacity,
                mixBlendMode: overlayBlendMode,
              }}
              draggable={false}
            />
          </div>

          {/* Labels */}
          <div className="absolute top-2 left-2 flex gap-2">
            <Badge variant="secondary">{baseImage.serialNumber} (Base)</Badge>
            <Badge variant="outline">{overlayImage.serialNumber} (Overlay)</Badge>
          </div>
        </div>
      </div>
    );
  };

  // Render slider mode
  const renderSliderMode = () => {
    if (imagesWithContent.length < 2) {
      return (
        <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
          <p className="text-muted-foreground">Cần ít nhất 2 ảnh để so sánh slider</p>
        </div>
      );
    }

    const leftImage = imagesWithContent[0].image!;
    const rightImage = imagesWithContent[1].image!;

    return (
      <div className="space-y-4">
        <div 
          ref={containerRef}
          className="relative aspect-video bg-black rounded-lg overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s',
            }}
            className="absolute inset-0"
          >
            {/* Right image (full) */}
            <img
              src={rightImage.imageUrl}
              alt={rightImage.serialNumber}
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
            
            {/* Left image (clipped) */}
            <div 
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src={leftImage.imageUrl}
                alt={leftImage.serialNumber}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ width: `${100 / (sliderPosition / 100)}%` }}
                draggable={false}
              />
            </div>

            {/* Slider line */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
              style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                <SlidersHorizontal className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary">{leftImage.serialNumber}</Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="outline">{rightImage.serialNumber}</Badge>
          </div>
        </div>

        <div>
          <Label>Vị trí slider: {sliderPosition}%</Label>
          <Slider
            value={[sliderPosition]}
            onValueChange={([v]) => setSliderPosition(v)}
            max={100}
            step={1}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Columns className="h-5 w-5" />
            So sánh ảnh SN
            {imagesWithContent.length > 0 && (
              <Badge variant="secondary">{imagesWithContent.length} ảnh</Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Add slot button */}
            <Button variant="outline" size="sm" onClick={addSlot} disabled={slots.length >= maxSlots}>
              <Plus className="h-4 w-4 mr-1" />
              Thêm ảnh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mode selector */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as ComparisonMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="side-by-side" className="flex items-center gap-1">
              <Columns className="h-4 w-4" />
              Side by Side
            </TabsTrigger>
            <TabsTrigger value="overlay" className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              Overlay
            </TabsTrigger>
            <TabsTrigger value="slider" className="flex items-center gap-1">
              <SlidersHorizontal className="h-4 w-4" />
              Slider
            </TabsTrigger>
          </TabsList>

          <TabsContent value="side-by-side" className="mt-4">
            <div className="flex gap-2 h-[400px]">
              {slots.map((slot, index) => renderImage(slot, index))}
            </div>
          </TabsContent>

          <TabsContent value="overlay" className="mt-4">
            {renderOverlayMode()}
          </TabsContent>

          <TabsContent value="slider" className="mt-4">
            {renderSliderMode()}
          </TabsContent>
        </Tabs>

        {/* Image selector dialog */}
        {selectedSlot && (
          <Card className="mt-4 border-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Chọn ảnh cho {slots.find(s => s.id === selectedSlot)?.label}</CardTitle>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSelectedSlot(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo Serial Number..."
                  className="pl-10"
                />
              </div>

              <ScrollArea className="h-[200px]">
                {isSearching ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : searchResults?.items.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'Không tìm thấy kết quả' : 'Nhập SN để tìm kiếm'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults?.items.map((image) => {
                      const result = image.analysisResult as keyof typeof resultConfig;
                      return (
                        <div
                          key={image.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => selectImageForSlot(selectedSlot, image as ImageData)}
                        >
                          <div className="w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={image.thumbnailUrl || image.imageUrl}
                              alt={image.serialNumber}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{image.serialNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {image.capturedAt ? new Date(image.capturedAt).toLocaleString('vi-VN') : 'N/A'}
                            </p>
                          </div>
                          {result && resultConfig[result] && (
                            <Badge className={cn("text-xs", resultConfig[result].color)}>
                              {resultConfig[result].label}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

export default SNImageComparison;
