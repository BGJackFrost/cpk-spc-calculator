import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Camera, CameraOff, RefreshCw, Download, Trash2, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface CameraCaptureProps {
  onCapture?: (imageData: string, blob: Blob) => void;
  onError?: (error: string) => void;
  width?: number;
  height?: number;
  showPreview?: boolean;
  maxCaptures?: number;
}

interface CapturedImage {
  id: string;
  dataUrl: string;
  blob: Blob;
  timestamp: Date;
}

interface CameraDevice {
  deviceId: string;
  label: string;
}

export function CameraCapture({
  onCapture,
  onError,
  width = 640,
  height = 480,
  showPreview = true,
  maxCaptures = 10,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Camera settings
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(100);

  // Get available camera devices
  const getDevices = useCallback(async () => {
    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
        }));
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (err) {
      const errorMsg = "Không thể lấy danh sách camera";
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [selectedDevice, onError]);

  useEffect(() => {
    getDevices();
  }, [getDevices]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          width: { ideal: width },
          height: { ideal: height },
          facingMode: "environment", // Prefer back camera on mobile
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      let errorMsg = "Không thể truy cập camera";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMsg = "Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.";
        } else if (err.name === "NotFoundError") {
          errorMsg = "Không tìm thấy camera. Vui lòng kiểm tra kết nối camera.";
        } else if (err.name === "NotReadableError") {
          errorMsg = "Camera đang được sử dụng bởi ứng dụng khác.";
        }
      }
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDevice, width, height, onError]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Capture image from video stream
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Reset filter
    ctx.filter = "none";

    // Get image data
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const newImage: CapturedImage = {
            id: `img_${Date.now()}`,
            dataUrl,
            blob,
            timestamp: new Date(),
          };

          setCapturedImages((prev) => {
            const updated = [newImage, ...prev];
            return updated.slice(0, maxCaptures);
          });

          onCapture?.(dataUrl, blob);
        }
      },
      "image/jpeg",
      0.9
    );
  }, [isStreaming, brightness, contrast, maxCaptures, onCapture]);

  // Delete captured image
  const deleteImage = useCallback((id: string) => {
    setCapturedImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  // Download captured image
  const downloadImage = useCallback((image: CapturedImage) => {
    const link = document.createElement("a");
    link.href = image.dataUrl;
    link.download = `capture_${image.timestamp.toISOString().replace(/[:.]/g, "-")}.jpg`;
    link.click();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Camera Capture
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Camera Settings Dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" disabled={!isStreaming}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cài đặt Camera</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label>Độ sáng: {brightness}%</Label>
                      <Slider
                        value={[brightness]}
                        onValueChange={([v]) => setBrightness(v)}
                        min={50}
                        max={150}
                        step={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Độ tương phản: {contrast}%</Label>
                      <Slider
                        value={[contrast]}
                        onValueChange={([v]) => setContrast(v)}
                        min={50}
                        max={150}
                        step={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Zoom: {zoom}%</Label>
                      <Slider
                        value={[zoom]}
                        onValueChange={([v]) => setZoom(v)}
                        min={100}
                        max={300}
                        step={10}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground mb-1 block">Chọn Camera</Label>
              <Select value={selectedDevice} onValueChange={setSelectedDevice} disabled={isStreaming}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn camera..." />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-5">
              {!isStreaming ? (
                <Button onClick={startCamera} disabled={isLoading || !selectedDevice}>
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Camera className="h-4 w-4 mr-2" />
                  )}
                  Bật Camera
                </Button>
              ) : (
                <Button variant="destructive" onClick={stopCamera}>
                  <CameraOff className="h-4 w-4 mr-2" />
                  Tắt Camera
                </Button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Video Preview */}
          <div className="relative bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: `${width}/${height}` }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                transform: `scale(${zoom / 100})`,
              }}
              playsInline
              muted
            />
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center text-muted-foreground">
                  <CameraOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Camera chưa được bật</p>
                </div>
              </div>
            )}
            
            {/* Capture Button Overlay */}
            {isStreaming && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <Button
                  size="lg"
                  onClick={captureImage}
                  className="rounded-full w-16 h-16 p-0 shadow-lg"
                >
                  <Camera className="h-8 w-8" />
                </Button>
              </div>
            )}
          </div>

          {/* Hidden Canvas for Capture */}
          <canvas ref={canvasRef} className="hidden" />
        </CardContent>
      </Card>

      {/* Captured Images Preview */}
      {showPreview && capturedImages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Ảnh đã chụp ({capturedImages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {capturedImages.map((image) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.dataUrl}
                    alt={`Captured at ${image.timestamp.toLocaleTimeString()}`}
                    className="w-full aspect-square object-cover rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => downloadImage(image)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => deleteImage(image.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    {image.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CameraCapture;
