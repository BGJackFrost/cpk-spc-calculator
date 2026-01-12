/**
 * DashboardCameraWidget - Widget hiển thị camera streaming trên Dashboard
 * Hỗ trợ nhiều nguồn camera: RTSP, HTTP Stream, IP Camera, WebRTC
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { 
  Camera, 
  CameraOff, 
  Maximize2, 
  Minimize2,
  RefreshCw, 
  Settings,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Grid3X3,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CameraStreamViewProps {
  camera: {
    id: number;
    name: string;
    connectionUrl: string;
    cameraType: string;
    status: string;
  };
  isFullscreen?: boolean;
  showControls?: boolean;
}

function CameraStreamView({ camera, isFullscreen = false, showControls = true }: CameraStreamViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Determine stream type and render accordingly
  const isImageStream = camera.cameraType === 'http_stream' || 
    camera.connectionUrl.includes('.jpg') || 
    camera.connectionUrl.includes('.mjpg') ||
    camera.connectionUrl.includes('snapshot');

  const isRtspStream = camera.cameraType === 'rtsp' || camera.connectionUrl.startsWith('rtsp://');

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    // For image streams, set up refresh interval
    if (isImageStream && imgRef.current) {
      const refreshImage = () => {
        if (imgRef.current && isPlaying) {
          const url = new URL(camera.connectionUrl);
          url.searchParams.set('t', Date.now().toString());
          imgRef.current.src = url.toString();
        }
      };
      
      // Initial load
      refreshImage();
      
      // Refresh every 100ms for MJPEG-like streams
      const interval = setInterval(refreshImage, 100);
      return () => clearInterval(interval);
    }
  }, [camera.connectionUrl, isImageStream, isPlaying]);

  const handleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('Không thể kết nối camera');
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setError('Không thể phát video stream');
  };

  return (
    <div className={cn(
      "relative bg-black rounded-lg overflow-hidden",
      isFullscreen ? "w-full h-full" : "aspect-video"
    )}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted z-10">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}

      {/* Camera offline overlay */}
      {camera.status !== 'active' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted z-10">
          <CameraOff className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Camera offline</p>
          <Badge variant="secondary" className="mt-2">{camera.status}</Badge>
        </div>
      )}

      {/* Stream content */}
      {camera.status === 'active' && (
        <>
          {isImageStream ? (
            <img
              ref={imgRef}
              alt={camera.name}
              className="w-full h-full object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : isRtspStream ? (
            // RTSP streams typically need a proxy or HLS conversion
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-white">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">RTSP Stream</p>
                <p className="text-xs text-muted-foreground">{camera.connectionUrl}</p>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              autoPlay
              muted={isMuted}
              playsInline
              onLoadedData={() => setIsLoading(false)}
              onError={handleVideoError}
            >
              <source src={camera.connectionUrl} />
            </video>
          )}
        </>
      )}

      {/* Controls overlay */}
      {showControls && camera.status === 'active' && !error && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleVideoPlay}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              {!isImageStream && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={handleMuteToggle}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <span className="text-xs text-white truncate max-w-[150px]">{camera.name}</span>
          </div>
        </div>
      )}

      {/* Status badge */}
      <div className="absolute top-2 left-2">
        <Badge 
          variant={camera.status === 'active' ? 'default' : 'secondary'}
          className={cn(
            "text-xs",
            camera.status === 'active' && "bg-green-500"
          )}
        >
          {camera.status === 'active' && (
            <span className="mr-1 h-2 w-2 rounded-full bg-white animate-pulse inline-block" />
          )}
          {camera.status === 'active' ? 'Live' : camera.status}
        </Badge>
      </div>
    </div>
  );
}

interface DashboardCameraWidgetProps {
  className?: string;
  maxCameras?: number;
  layout?: '1x1' | '2x2' | '3x3' | '1x2';
}

export function DashboardCameraWidget({ 
  className, 
  maxCameras = 4,
  layout: initialLayout = '2x2' 
}: DashboardCameraWidgetProps) {
  const [selectedCameras, setSelectedCameras] = useState<number[]>([]);
  const [layout, setLayout] = useState(initialLayout);
  const [fullscreenCamera, setFullscreenCamera] = useState<number | null>(null);

  const { data: cameras, isLoading, refetch } = trpc.cameraConfig.list.useQuery({ status: 'active' });
  const testConnectionMutation = trpc.cameraConfig.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Kết nối thành công');
        refetch();
      } else {
        toast.error(data.error || 'Kết nối thất bại');
      }
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  // Auto-select first cameras on load
  useEffect(() => {
    if (cameras && cameras.length > 0 && selectedCameras.length === 0) {
      const activeCameras = cameras.filter(c => c.status === 'active');
      setSelectedCameras(activeCameras.slice(0, maxCameras).map(c => c.id));
    }
  }, [cameras, maxCameras, selectedCameras.length]);

  const handleCameraSelect = (cameraId: number) => {
    setSelectedCameras(prev => {
      if (prev.includes(cameraId)) {
        return prev.filter(id => id !== cameraId);
      }
      if (prev.length >= maxCameras) {
        return [...prev.slice(1), cameraId];
      }
      return [...prev, cameraId];
    });
  };

  const handleRefreshAll = () => {
    refetch();
    toast.success('Đã làm mới danh sách camera');
  };

  const getGridClass = () => {
    switch (layout) {
      case '1x1': return 'grid-cols-1';
      case '1x2': return 'grid-cols-2';
      case '2x2': return 'grid-cols-2 grid-rows-2';
      case '3x3': return 'grid-cols-3 grid-rows-3';
      default: return 'grid-cols-2';
    }
  };

  const displayCameras = cameras?.filter(c => selectedCameras.includes(c.id)) || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5" />
            Camera Streaming
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="aspect-video" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5" />
            Camera Streaming
            {displayCameras.length > 0 && (
              <Badge variant="secondary">{displayCameras.length} camera</Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Layout selector */}
            <Select value={layout} onValueChange={(v: typeof layout) => setLayout(v)}>
              <SelectTrigger className="w-[100px] h-8">
                <Grid3X3 className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1x1">1x1</SelectItem>
                <SelectItem value="1x2">1x2</SelectItem>
                <SelectItem value="2x2">2x2</SelectItem>
                <SelectItem value="3x3">3x3</SelectItem>
              </SelectContent>
            </Select>

            {/* Camera selector */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Chọn camera
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Chọn camera hiển thị</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Chọn tối đa {maxCameras} camera để hiển thị trên Dashboard
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                    {cameras?.map(camera => (
                      <Card 
                        key={camera.id}
                        className={cn(
                          "cursor-pointer transition-all",
                          selectedCameras.includes(camera.id) 
                            ? "border-primary ring-2 ring-primary/20" 
                            : "hover:border-primary/50"
                        )}
                        onClick={() => handleCameraSelect(camera.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{camera.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {camera.cameraType}
                              </p>
                            </div>
                            <Badge 
                              variant={camera.status === 'active' ? 'default' : 'secondary'}
                              className={camera.status === 'active' ? 'bg-green-500' : ''}
                            >
                              {camera.status}
                            </Badge>
                          </div>
                          {selectedCameras.includes(camera.id) && (
                            <div className="mt-2 text-xs text-primary">
                              ✓ Đã chọn
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="ghost" size="icon" onClick={handleRefreshAll}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {displayCameras.length === 0 ? (
          <div className="aspect-video flex flex-col items-center justify-center bg-muted rounded-lg">
            <CameraOff className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Chưa có camera nào được chọn</p>
            <p className="text-sm text-muted-foreground">
              Nhấn "Chọn camera" để thêm camera
            </p>
          </div>
        ) : (
          <div className={cn("grid gap-2", getGridClass())}>
            {displayCameras.map(camera => (
              <div key={camera.id} className="relative group">
                <CameraStreamView 
                  camera={camera}
                  showControls={true}
                />
                {/* Fullscreen button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-8 w-8 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setFullscreenCamera(camera.id)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Fullscreen dialog */}
      <Dialog open={fullscreenCamera !== null} onOpenChange={() => setFullscreenCamera(null)}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              {cameras?.find(c => c.id === fullscreenCamera)?.name || 'Camera'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-full">
            {fullscreenCamera && cameras?.find(c => c.id === fullscreenCamera) && (
              <CameraStreamView 
                camera={cameras.find(c => c.id === fullscreenCamera)!}
                isFullscreen={true}
                showControls={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default DashboardCameraWidget;
