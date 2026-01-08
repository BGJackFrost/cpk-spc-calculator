import { useState, useRef, useCallback, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Camera, Video, VideoOff, Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw, Settings, History } from "lucide-react";

interface CaptureResult {
  id: number;
  imageUrl: string;
  qualityScore: number | null;
  severity: string;
  passQc: boolean;
  aiAnalysis: Record<string, unknown> | null;
  timestamp: Date;
}

export default function CameraCapture() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [productCode, setProductCode] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [lastCapture, setLastCapture] = useState<CaptureResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { data: imagesData, refetch: refetchImages } = trpc.qualityImage.getImages.useQuery({ imageType: "camera_capture", limit: 20 });

  const captureMutation = trpc.qualityImage.captureFromCamera.useMutation({
    onSuccess: (data) => {
      const result: CaptureResult = { id: data.id, imageUrl: data.imageUrl, qualityScore: data.qualityScore, severity: data.severity, passQc: data.passQc, aiAnalysis: data.aiAnalysis, timestamp: new Date() };
      setLastCapture(result);
      refetchImages();
      if (!data.passQc) toast.error("Phát hiện lỗi! Sản phẩm không đạt QC", { duration: 5000 });
      else toast.success("Capture thành công - Sản phẩm đạt QC");
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  useEffect(() => {
    const getCameras = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        setCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCamera) setSelectedCamera(videoDevices[0].deviceId);
      } catch { toast.error("Không thể truy cập camera. Vui lòng cấp quyền."); }
    };
    getCameras();
  }, []);

  const startStream = useCallback(async () => {
    if (!selectedCamera) { toast.error("Vui lòng chọn camera"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: selectedCamera, width: { ideal: 1920 }, height: { ideal: 1080 } } });
      if (videoRef.current) { videoRef.current.srcObject = stream; streamRef.current = stream; setIsStreaming(true); }
    } catch { toast.error("Không thể khởi động camera"); }
  }, [selectedCamera]);

  const stopStream = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
  }, []);

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = imageData.split(",")[1];
    try { await captureMutation.mutateAsync({ imageBase64: base64, productCode: productCode || undefined, analyzeWithAi: autoAnalyze }); }
    finally { setIsCapturing(false); }
  }, [productCode, autoAnalyze, captureMutation]);

  const getSeverityColor = (severity: string) => {
    switch (severity) { case "critical": case "major": return "destructive"; case "minor": return "secondary"; default: return "default"; }
  };

  const recentCaptures = imagesData?.images || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Camera Realtime Capture</h1>
          <p className="text-muted-foreground">Capture hình ảnh trực tiếp từ camera và phân tích AI ngay lập tức</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" />Camera Feed</CardTitle></CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                  <canvas ref={canvasRef} className="hidden" />
                  {!isStreaming && <div className="absolute inset-0 flex items-center justify-center bg-muted"><div className="text-center"><VideoOff className="h-16 w-16 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">Camera chưa được bật</p></div></div>}
                  {isCapturing && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><div className="text-center text-white"><Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" /><p>Đang phân tích...</p></div></div>}
                </div>
                <div className="flex gap-4 mt-4">
                  {!isStreaming ? <Button onClick={startStream} className="flex-1"><Video className="h-4 w-4 mr-2" />Bật Camera</Button> : (
                    <>
                      <Button onClick={stopStream} variant="outline" className="flex-1"><VideoOff className="h-4 w-4 mr-2" />Tắt Camera</Button>
                      <Button onClick={captureImage} disabled={isCapturing} className="flex-1">{isCapturing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}Capture & Phân tích</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {lastCapture && (
              <Card className={lastCapture.passQc ? "border-green-500" : "border-red-500"}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Kết quả Capture gần nhất</span>
                    {lastCapture.passQc ? <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Đạt QC</Badge> : <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Không đạt</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div><img src={lastCapture.imageUrl} alt="Last capture" className="w-full h-48 object-contain rounded-lg border" /></div>
                    <div className="space-y-3">
                      <div><Label className="text-muted-foreground">Điểm chất lượng</Label><p className="text-2xl font-bold">{lastCapture.qualityScore ?? "N/A"}/10</p></div>
                      <div><Label className="text-muted-foreground">Mức độ</Label><Badge variant={getSeverityColor(lastCapture.severity)}>{lastCapture.severity}</Badge></div>
                      <div><Label className="text-muted-foreground">Thời gian</Label><p className="text-sm">{lastCapture.timestamp.toLocaleString("vi-VN")}</p></div>
                      {lastCapture.aiAnalysis && <div><Label className="text-muted-foreground">Tóm tắt AI</Label><p className="text-sm">{(lastCapture.aiAnalysis as { summary?: string }).summary || "N/A"}</p></div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Cài đặt</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Camera</Label>
                  <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                    <SelectTrigger><SelectValue placeholder="Chọn camera" /></SelectTrigger>
                    <SelectContent>{cameras.map((camera, i) => <SelectItem key={camera.deviceId} value={camera.deviceId}>{camera.label || `Camera ${i + 1}`}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Mã sản phẩm</Label><Input value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="VD: SP001" /></div>
                <div className="flex items-center justify-between"><Label>Tự động phân tích AI</Label><Switch checked={autoAnalyze} onCheckedChange={setAutoAnalyze} /></div>
                <Button variant="outline" className="w-full" onClick={() => { stopStream(); setTimeout(startStream, 500); }} disabled={!isStreaming}><RefreshCw className="h-4 w-4 mr-2" />Làm mới Camera</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Lịch sử Capture</CardTitle><CardDescription>20 capture gần nhất</CardDescription></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentCaptures.map((capture) => (
                    <div key={capture.id} className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/50">
                      <img src={capture.imageUrl} alt={`Capture ${capture.id}`} className="w-12 h-12 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={capture.severity === "none" ? "default" : getSeverityColor(capture.severity || "none")} className="text-xs">{capture.qualityScore || "N/A"}</Badge>
                          {capture.severity !== "none" && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{new Date(capture.createdAt!).toLocaleString("vi-VN")}</p>
                      </div>
                    </div>
                  ))}
                  {recentCaptures.length === 0 && <div className="text-center py-8 text-muted-foreground"><Camera className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Chưa có capture nào</p></div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
