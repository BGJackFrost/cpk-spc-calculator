import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Key, 
  Wifi, 
  WifiOff, 
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Copy,
  RefreshCw,
  Shield,
  Loader2,
  Monitor,
  Cpu,
  HardDrive
} from "lucide-react";

interface LicenseActivationFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licenseKey?: string;
  onSuccess?: () => void;
}

// Generate hardware fingerprint from browser
async function generateHardwareFingerprint(): Promise<string> {
  const components: string[] = [];
  
  // Screen info
  components.push(`screen:${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
  
  // Timezone
  components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  
  // Language
  components.push(`lang:${navigator.language}`);
  
  // Platform
  components.push(`platform:${navigator.platform}`);
  
  // Hardware concurrency
  components.push(`cores:${navigator.hardwareConcurrency || 'unknown'}`);
  
  // Device memory (if available)
  const nav = navigator as any;
  if (nav.deviceMemory) {
    components.push(`mem:${nav.deviceMemory}GB`);
  }
  
  // WebGL renderer
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        components.push(`gpu:${renderer}`);
      }
    }
  } catch (e) {
    // Ignore WebGL errors
  }
  
  // Create hash from components
  const data = components.join('|');
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.substring(0, 32).toUpperCase();
}

export default function LicenseActivationFlow({ open, onOpenChange, licenseKey: initialKey, onSuccess }: LicenseActivationFlowProps) {
  const [step, setStep] = useState(1); // 1: Enter Key, 2: Choose Mode, 3: Activate, 4: Success
  const [licenseKey, setLicenseKey] = useState(initialKey || "");
  const [activationMode, setActivationMode] = useState<"online" | "offline">("online");
  const [deviceId, setHardwareFingerprint] = useState("");
  const [offlineLicenseFile, setOfflineLicenseFile] = useState("");
  const [isGeneratingFingerprint, setIsGeneratingFingerprint] = useState(false);
  const [activationResult, setActivationResult] = useState<any>(null);
  
  // Queries
  const licenseInfoQuery = trpc.license.getByKey.useQuery(
    { licenseKey },
    { enabled: !!licenseKey && licenseKey.length > 10 }
  );
  
  // Mutations
  const activateMutation = trpc.license.activate.useMutation();
  const generateOfflineMutation = trpc.license.generateOfflineLicense.useMutation();
  const validateOfflineMutation = trpc.license.validateOfflineLicense.useMutation();
  
  // Generate fingerprint on mount
  useEffect(() => {
    if (open) {
      generateFingerprint();
    }
  }, [open]);
  
  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStep(initialKey ? 2 : 1);
      setLicenseKey(initialKey || "");
      setActivationMode("online");
      setOfflineLicenseFile("");
      setActivationResult(null);
    }
  }, [open, initialKey]);
  
  const generateFingerprint = async () => {
    setIsGeneratingFingerprint(true);
    try {
      const fp = await generateHardwareFingerprint();
      setHardwareFingerprint(fp);
    } catch (error) {
      console.error("Failed to generate fingerprint:", error);
      toast.error("Không thể tạo Hardware Fingerprint");
    } finally {
      setIsGeneratingFingerprint(false);
    }
  };
  
  const copyFingerprint = () => {
    navigator.clipboard.writeText(deviceId);
    toast.success("Đã sao chép Hardware Fingerprint");
  };
  
  const handleOnlineActivation = async () => {
    try {
      const result = await activateMutation.mutateAsync({
        licenseKey
      });
      setActivationResult(result);
      setStep(4);
      toast.success("Kích hoạt license thành công!");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Kích hoạt thất bại");
    }
  };
  
  const handleGenerateOfflineLicense = async () => {
    try {
      const result = await generateOfflineMutation.mutateAsync({
        licenseKey,
        hardwareFingerprint: deviceId
      });
      setOfflineLicenseFile(result.offlineLicenseFile);
      toast.success("Đã tạo file license offline");
    } catch (error: any) {
      toast.error(error.message || "Tạo license offline thất bại");
    }
  };
  
  const handleOfflineActivation = async () => {
    if (!offlineLicenseFile) {
      toast.error("Vui lòng nhập hoặc tạo file license offline");
      return;
    }
    
    try {
      const result = await validateOfflineMutation.mutateAsync({
        offlineLicenseFile,
        hardwareFingerprint: deviceId
      });
      
      if (result.valid) {
        // Activate with offline mode
        const activateResult = await activateMutation.mutateAsync({
          licenseKey
        });
        setActivationResult(activateResult);
        setStep(4);
        toast.success("Kích hoạt license offline thành công!");
        onSuccess?.();
      } else {
        toast.error(result.error || "File license không hợp lệ");
      }
    } catch (error: any) {
      toast.error(error.message || "Kích hoạt offline thất bại");
    }
  };
  
  const downloadOfflineLicense = () => {
    if (!offlineLicenseFile) return;
    
    const blob = new Blob([offlineLicenseFile], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license_${licenseKey.substring(0, 8)}.lic`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Đã tải file license");
  };
  
  const licenseInfo = licenseInfoQuery.data;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Kích hoạt License
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Nhập License Key để bắt đầu"}
            {step === 2 && "Chọn phương thức kích hoạt"}
            {step === 3 && "Xác nhận thông tin kích hoạt"}
            {step === 4 && "Kích hoạt thành công!"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress */}
        <div className="flex items-center gap-2 px-1">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step ? "bg-primary text-primary-foreground" : 
                s < step ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`flex-1 h-1 mx-2 rounded ${s < step ? "bg-green-500" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
        
        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Enter License Key */}
          {step === 1 && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>License Key</Label>
                <Input 
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="font-mono text-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Nhập License Key bạn đã nhận được từ nhà cung cấp
                </p>
              </div>
              
              {licenseInfo && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Thông tin License
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loại:</span>
                      <Badge>{licenseInfo.licenseType}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Công ty:</span>
                      <span>{licenseInfo.companyName || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trạng thái:</span>
                      <Badge variant={licenseInfo.isActive ? "default" : "secondary"}>
                        {licenseInfo.isActive ? "Đã kích hoạt" : "Chưa kích hoạt"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hết hạn:</span>
                      <span>
                        {licenseInfo.expiresAt 
                          ? new Date(licenseInfo.expiresAt).toLocaleDateString('vi-VN')
                          : "Vĩnh viễn"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {licenseInfoQuery.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>License không hợp lệ</AlertTitle>
                  <AlertDescription>
                    Không tìm thấy license với key này. Vui lòng kiểm tra lại.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          {/* Step 2: Choose Activation Mode */}
          {step === 2 && (
            <div className="space-y-6 py-4">
              {/* Hardware Fingerprint */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Fingerprint className="h-4 w-4" />
                    Hardware Fingerprint
                  </CardTitle>
                  <CardDescription>
                    Định danh duy nhất của thiết bị này
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={deviceId}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={copyFingerprint}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={generateFingerprint}
                      disabled={isGeneratingFingerprint}
                    >
                      {isGeneratingFingerprint ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Device Info */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      {window.screen.width}x{window.screen.height}
                    </div>
                    <div className="flex items-center gap-1">
                      <Cpu className="h-3 w-3" />
                      {navigator.hardwareConcurrency || '?'} cores
                    </div>
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {(navigator as any).deviceMemory || '?'}GB RAM
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Activation Mode */}
              <div className="space-y-4">
                <Label>Phương thức kích hoạt</Label>
                <RadioGroup value={activationMode} onValueChange={(v: any) => setActivationMode(v)}>
                  <Card 
                    className={`cursor-pointer transition-colors ${activationMode === 'online' ? 'border-primary' : ''}`}
                    onClick={() => setActivationMode('online')}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <RadioGroupItem value="online" id="online" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4 text-green-500" />
                          <Label htmlFor="online" className="font-medium cursor-pointer">
                            Kích hoạt Online
                          </Label>
                          <Badge variant="secondary">Khuyến nghị</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Kích hoạt trực tiếp qua internet. Nhanh chóng và tự động cập nhật.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-colors ${activationMode === 'offline' ? 'border-primary' : ''}`}
                    onClick={() => setActivationMode('offline')}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <RadioGroupItem value="offline" id="offline" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <WifiOff className="h-4 w-4 text-orange-500" />
                          <Label htmlFor="offline" className="font-medium cursor-pointer">
                            Kích hoạt Offline
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Sử dụng file license cho môi trường không có internet.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </RadioGroup>
              </div>
            </div>
          )}
          
          {/* Step 3: Confirm & Activate */}
          {step === 3 && (
            <div className="space-y-6 py-4">
              {activationMode === 'online' ? (
                <>
                  <Alert>
                    <Wifi className="h-4 w-4" />
                    <AlertTitle>Kích hoạt Online</AlertTitle>
                    <AlertDescription>
                      License sẽ được kích hoạt và liên kết với thiết bị này. 
                      Bạn có thể chuyển license sang thiết bị khác sau này nếu cần.
                    </AlertDescription>
                  </Alert>
                  
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">License Key:</span>
                        <span className="font-mono">{licenseKey}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hardware Fingerprint:</span>
                        <span className="font-mono text-xs">{deviceId.substring(0, 16)}...</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Phương thức:</span>
                        <Badge>Online</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Alert>
                    <WifiOff className="h-4 w-4" />
                    <AlertTitle>Kích hoạt Offline</AlertTitle>
                    <AlertDescription>
                      Tạo hoặc nhập file license offline để kích hoạt mà không cần internet.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={handleGenerateOfflineLicense}
                        disabled={generateOfflineMutation.isPending}
                        className="flex-1"
                      >
                        {generateOfflineMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Key className="h-4 w-4 mr-2" />
                        )}
                        Tạo file license
                      </Button>
                      {offlineLicenseFile && (
                        <Button variant="outline" onClick={downloadOfflineLicense}>
                          <Download className="h-4 w-4 mr-2" />
                          Tải xuống
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>File License Offline</Label>
                      <Textarea 
                        value={offlineLicenseFile}
                        onChange={(e) => setOfflineLicenseFile(e.target.value)}
                        placeholder="Dán nội dung file license vào đây hoặc click 'Tạo file license' ở trên"
                        className="font-mono text-xs h-32"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Step 4: Success */}
          {step === 4 && (
            <div className="space-y-6 py-4 text-center">
              <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold">Kích hoạt thành công!</h3>
                <p className="text-muted-foreground mt-1">
                  License đã được kích hoạt và sẵn sàng sử dụng
                </p>
              </div>
              
              {activationResult && (
                <Card>
                  <CardContent className="p-4 space-y-2 text-left text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">License Key:</span>
                      <span className="font-mono">{activationResult.licenseKey}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kích hoạt lúc:</span>
                      <span>{new Date().toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phương thức:</span>
                      <Badge>{activationMode === 'online' ? 'Online' : 'Offline'}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Alert className="text-left">
                <Shield className="h-4 w-4" />
                <AlertTitle>Lưu ý quan trọng</AlertTitle>
                <AlertDescription>
                  License đã được liên kết với thiết bị này. Nếu cần chuyển sang thiết bị khác, 
                  vui lòng sử dụng chức năng "Chuyển License" trong phần quản lý.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && step < 4 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Quay lại
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step < 4 && (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
            )}
            
            {step === 1 && (
              <Button 
                onClick={() => setStep(2)}
                disabled={!licenseKey || licenseInfoQuery.isLoading || licenseInfoQuery.isError}
              >
                Tiếp tục
              </Button>
            )}
            
            {step === 2 && (
              <Button onClick={() => setStep(3)}>
                Tiếp tục
              </Button>
            )}
            
            {step === 3 && (
              <Button 
                onClick={activationMode === 'online' ? handleOnlineActivation : handleOfflineActivation}
                disabled={activateMutation.isPending || (activationMode === 'offline' && !offlineLicenseFile)}
              >
                {activateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang kích hoạt...
                  </>
                ) : (
                  "Kích hoạt"
                )}
              </Button>
            )}
            
            {step === 4 && (
              <Button onClick={() => onOpenChange(false)}>
                Hoàn tất
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
