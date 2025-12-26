/**
 * CameraStream Component
 * Component hiển thị video stream từ camera với các controls
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  CameraOff, 
  RefreshCw, 
  Aperture, 
  SwitchCamera,
  AlertCircle,
  Loader2,
  Settings
} from 'lucide-react';
import { useWebRTCCamera, CameraSettings } from '@/hooks/useWebRTCCamera';
import { cn } from '@/lib/utils';

export interface CameraStreamProps {
  onCapture?: (imageData: string) => void;
  onCaptureBlob?: (blob: Blob) => void;
  autoCapture?: boolean;
  autoCaptureInterval?: number; // ms
  showControls?: boolean;
  showDeviceSelector?: boolean;
  className?: string;
  settings?: CameraSettings;
  overlayContent?: React.ReactNode;
}

export function CameraStream({
  onCapture,
  onCaptureBlob,
  autoCapture = false,
  autoCaptureInterval = 1000,
  showControls = true,
  showDeviceSelector = true,
  className,
  settings,
  overlayContent,
}: CameraStreamProps) {
  const {
    isStreaming,
    isLoading,
    error,
    devices,
    selectedDevice,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    captureFrame,
    captureBlob,
    switchCamera,
    refreshDevices,
  } = useWebRTCCamera();
  
  const [captureCount, setCaptureCount] = useState(0);
  const [lastCaptureTime, setLastCaptureTime] = useState<Date | null>(null);
  
  // Auto capture effect
  useEffect(() => {
    if (!autoCapture || !isStreaming) return;
    
    const interval = setInterval(async () => {
      if (onCapture) {
        const frame = captureFrame();
        if (frame) {
          onCapture(frame);
          setCaptureCount(prev => prev + 1);
          setLastCaptureTime(new Date());
        }
      }
      
      if (onCaptureBlob) {
        const blob = await captureBlob();
        if (blob) {
          onCaptureBlob(blob);
          setCaptureCount(prev => prev + 1);
          setLastCaptureTime(new Date());
        }
      }
    }, autoCaptureInterval);
    
    return () => clearInterval(interval);
  }, [autoCapture, autoCaptureInterval, isStreaming, onCapture, onCaptureBlob, captureFrame, captureBlob]);
  
  // Handle manual capture
  const handleCapture = async () => {
    if (onCapture) {
      const frame = captureFrame();
      if (frame) {
        onCapture(frame);
        setCaptureCount(prev => prev + 1);
        setLastCaptureTime(new Date());
      }
    }
    
    if (onCaptureBlob) {
      const blob = await captureBlob();
      if (blob) {
        onCaptureBlob(blob);
        setCaptureCount(prev => prev + 1);
        setLastCaptureTime(new Date());
      }
    }
  };
  
  // Handle camera toggle
  const handleToggleCamera = async () => {
    if (isStreaming) {
      stopCamera();
    } else {
      await startCamera(selectedDevice || undefined, settings);
    }
  };
  
  // Handle device change
  const handleDeviceChange = async (deviceId: string) => {
    await switchCamera(deviceId);
  };
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5" />
            Camera Stream
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {isStreaming && (
              <Badge variant="default" className="bg-green-500">
                <span className="mr-1 h-2 w-2 rounded-full bg-white animate-pulse inline-block" />
                Live
              </Badge>
            )}
            
            {autoCapture && isStreaming && (
              <Badge variant="secondary">
                Auto: {captureCount} captures
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Video Container */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            muted
          />
          
          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Overlay content (e.g., detection boxes) */}
          {overlayContent && (
            <div className="absolute inset-0 pointer-events-none">
              {overlayContent}
            </div>
          )}
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Đang khởi động camera...</p>
              </div>
            </div>
          )}
          
          {/* Not streaming overlay */}
          {!isStreaming && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center text-muted-foreground">
                <CameraOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Camera chưa được bật</p>
                <p className="text-sm">Nhấn nút bên dưới để bắt đầu</p>
              </div>
            </div>
          )}
          
          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
              <div className="text-center text-red-500 p-4">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">Lỗi Camera</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Controls */}
        {showControls && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Start/Stop button */}
            <Button
              onClick={handleToggleCamera}
              disabled={isLoading}
              variant={isStreaming ? 'destructive' : 'default'}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isStreaming ? (
                <CameraOff className="h-4 w-4 mr-2" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              {isStreaming ? 'Dừng' : 'Bắt đầu'}
            </Button>
            
            {/* Capture button */}
            {isStreaming && (onCapture || onCaptureBlob) && (
              <Button
                onClick={handleCapture}
                variant="secondary"
              >
                <Aperture className="h-4 w-4 mr-2" />
                Chụp ảnh
              </Button>
            )}
            
            {/* Refresh devices */}
            <Button
              onClick={refreshDevices}
              variant="outline"
              size="icon"
              title="Làm mới danh sách camera"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            {/* Device selector */}
            {showDeviceSelector && devices.length > 1 && (
              <Select
                value={selectedDevice || ''}
                onValueChange={handleDeviceChange}
                disabled={!isStreaming}
              >
                <SelectTrigger className="w-[200px]">
                  <SwitchCamera className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Chọn camera" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
        
        {/* Stats */}
        {isStreaming && (onCapture || onCaptureBlob) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span>Captures: {captureCount}</span>
            </div>
            {lastCaptureTime && (
              <div>
                Last: {lastCaptureTime.toLocaleTimeString()}
              </div>
            )}
            {autoCapture && (
              <div>
                Interval: {autoCaptureInterval}ms
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CameraStream;
