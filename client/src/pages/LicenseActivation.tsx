import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Key, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Fingerprint,
  Shield,
  Wifi,
  WifiOff,
  FileKey,
  RefreshCw,
  Building2,
  Calendar,
  Users,
  Layers,
  ClipboardList
} from "lucide-react";

// Generate hardware fingerprint from browser
function generateBrowserFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
  }
  
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 0,
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(32, '0').substring(0, 32);
}

export default function LicenseActivation() {
  const [activeTab, setActiveTab] = useState("online");
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [hardwareFingerprint, setHardwareFingerprint] = useState("");
  
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [lastValidated, setLastValidated] = useState<Date | null>(null);
  
  const activeLicenseQuery = trpc.license.getActive.useQuery();
  const activateOnlineMutation = trpc.license.activateOnline.useMutation();
  const activateOfflineMutation = trpc.license.activateOffline.useMutation();
  const validateWithRetryMutation = trpc.license.validateWithRetry.useMutation();
  const heartbeatMutation = trpc.license.heartbeat.useMutation();
  const validateQuery = trpc.license.validate.useQuery(
    { licenseKey: activeLicenseQuery.data?.licenseKey || "", hardwareFingerprint },
    { enabled: !!activeLicenseQuery.data?.licenseKey && !!hardwareFingerprint }
  );
  
  useEffect(() => {
    setHardwareFingerprint(generateBrowserFingerprint());
  }, []);
  
  // Periodic heartbeat check
  useEffect(() => {
    if (!activeLicenseQuery.data?.licenseKey || !hardwareFingerprint) return;
    
    const sendHeartbeat = async () => {
      try {
        const result = await heartbeatMutation.mutateAsync({
          licenseKey: activeLicenseQuery.data!.licenseKey,
          hardwareFingerprint,
          systemInfo: {
            hostname: window.location.hostname,
            platform: navigator.platform,
            uptime: performance.now() / 1000
          }
        });
        if (result.valid) {
          setValidationStatus('valid');
          setLastValidated(new Date());
        } else {
          setValidationStatus('invalid');
        }
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    };
    
    // Initial heartbeat
    sendHeartbeat();
    
    // Periodic heartbeat every 24 hours
    const interval = setInterval(sendHeartbeat, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeLicenseQuery.data?.licenseKey, hardwareFingerprint]);
  
  const handleValidateWithRetry = async () => {
    if (!activeLicenseQuery.data?.licenseKey) return;
    
    setValidationStatus('validating');
    try {
      const result = await validateWithRetryMutation.mutateAsync({
        licenseKey: activeLicenseQuery.data.licenseKey,
        hardwareFingerprint,
        maxRetries: 3
      });
      
      if (result.valid) {
        setValidationStatus('valid');
        setLastValidated(new Date());
        toast.success(`Xác thực thành công (lần thử ${result.attempt})`);
      } else {
        setValidationStatus('invalid');
        toast.error(result.error || 'Xác thực thất bại');
      }
    } catch (error: any) {
      setValidationStatus('invalid');
      toast.error(error.message || 'Lỗi kết nối');
    }
  };
  
  const handleOnlineActivation = async () => {
    if (!licenseKey.trim()) {
      toast.error("Vui lòng nhập License Key");
      return;
    }
    
    try {
      await activateOnlineMutation.mutateAsync({
        licenseKey: licenseKey.trim(),
        hardwareFingerprint
      });
      toast.success("Kích hoạt license thành công!");
      activeLicenseQuery.refetch();
      setLicenseKey("");
      // Trigger validation after activation
      setTimeout(handleValidateWithRetry, 1000);
    } catch (error: any) {
      toast.error(error.message || "Kích hoạt thất bại");
    }
  };
  
  const handleOfflineActivation = async () => {
    if (!licenseFile) {
      toast.error("Vui lòng chọn file license (.lic)");
      return;
    }
    
    try {
      const fileContent = await licenseFile.text();
      await activateOfflineMutation.mutateAsync({
        licenseFileContent: fileContent,
        hardwareFingerprint
      });
      toast.success("Kích hoạt license offline thành công!");
      activeLicenseQuery.refetch();
      setLicenseFile(null);
    } catch (error: any) {
      toast.error(error.message || "Kích hoạt thất bại");
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.lic')) {
        toast.error("Vui lòng chọn file có đuôi .lic");
        return;
      }
      setLicenseFile(file);
    }
  };
  
  const activeLicense = activeLicenseQuery.data;
  const isActivated = activeLicense?.isActive === 1;
  const isExpired = activeLicense?.expiresAt && new Date(activeLicense.expiresAt) < new Date();
  
  const getStatusBadge = () => {
    if (!activeLicense) return <Badge variant="secondary">Chưa có license</Badge>;
    if (isExpired) return <Badge variant="destructive">Đã hết hạn</Badge>;
    if (isActivated) return <Badge className="bg-green-500">Đang hoạt động</Badge>;
    return <Badge variant="outline">Chưa kích hoạt</Badge>;
  };
  
  const getDaysRemaining = () => {
    if (!activeLicense?.expiresAt) return null;
    const days = Math.ceil((new Date(activeLicense.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Kích hoạt License</h1>
          <p className="text-muted-foreground">Kích hoạt license để sử dụng đầy đủ tính năng của hệ thống</p>
        </div>
        
        {/* Current License Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Trạng thái License hiện tại</CardTitle>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent>
            {activeLicense ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Công ty</p>
                    <p className="font-medium">{activeLicense.companyName || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Loại License</p>
                    <p className="font-medium capitalize">{activeLicense.licenseType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ngày hết hạn</p>
                    <p className="font-medium">
                      {activeLicense.expiresAt 
                        ? new Date(activeLicense.expiresAt).toLocaleDateString('vi-VN')
                        : "Vĩnh viễn"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Còn lại</p>
                    <p className={`font-medium ${getDaysRemaining() && getDaysRemaining()! < 30 ? 'text-orange-500' : ''}`}>
                      {getDaysRemaining() !== null ? `${getDaysRemaining()} ngày` : "Không giới hạn"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertTitle>Chưa có license</AlertTitle>
                <AlertDescription>
                  Hệ thống chưa được kích hoạt. Vui lòng kích hoạt license để sử dụng đầy đủ tính năng.
                </AlertDescription>
              </Alert>
            )}
            
            {activeLicense && (
              <>
                {/* Online Validation Status */}
                <Separator className="my-4" />
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      validationStatus === 'valid' ? 'bg-green-100' :
                      validationStatus === 'invalid' ? 'bg-red-100' :
                      validationStatus === 'validating' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {validationStatus === 'valid' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                      {validationStatus === 'invalid' && <XCircle className="h-5 w-5 text-red-600" />}
                      {validationStatus === 'validating' && <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />}
                      {validationStatus === 'idle' && <Shield className="h-5 w-5 text-gray-600" />}
                    </div>
                    <div>
                      <p className="font-medium">
                        {validationStatus === 'valid' && 'License hợp lệ'}
                        {validationStatus === 'invalid' && 'License không hợp lệ'}
                        {validationStatus === 'validating' && 'Đang xác thực...'}
                        {validationStatus === 'idle' && 'Chưa xác thực'}
                      </p>
                      {lastValidated && (
                        <p className="text-sm text-muted-foreground">
                          Xác thực lần cuối: {lastValidated.toLocaleString('vi-VN')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleValidateWithRetry}
                    disabled={validateWithRetryMutation.isPending}
                  >
                    {validateWithRetryMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    Xác thực Online
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Số người dùng</p>
                      <p className="font-medium">{activeLicense.maxUsers === -1 ? "Không giới hạn" : activeLicense.maxUsers}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Layers className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Số dây chuyền</p>
                      <p className="font-medium">{activeLicense.maxProductionLines === -1 ? "Không giới hạn" : activeLicense.maxProductionLines}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <ClipboardList className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Số SPC Plans</p>
                      <p className="font-medium">{activeLicense.maxSpcPlans === -1 ? "Không giới hạn" : activeLicense.maxSpcPlans}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Hardware Fingerprint */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" />
              <CardTitle>Hardware Fingerprint</CardTitle>
            </div>
            <CardDescription>
              Mã định danh thiết bị dùng để ràng buộc license với máy tính này
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                {hardwareFingerprint}
              </code>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(hardwareFingerprint);
                  toast.success("Đã copy Hardware Fingerprint");
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Gửi mã này cho nhà cung cấp để nhận file license offline nếu không có kết nối internet.
            </p>
          </CardContent>
        </Card>
        
        {/* Activation Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Kích hoạt License</CardTitle>
            <CardDescription>
              Chọn phương thức kích hoạt phù hợp với môi trường của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="online" className="flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Online Activation
                </TabsTrigger>
                <TabsTrigger value="offline" className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4" />
                  Offline Activation
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="online" className="space-y-4 mt-4">
                <Alert>
                  <Wifi className="h-4 w-4" />
                  <AlertTitle>Kích hoạt Online</AlertTitle>
                  <AlertDescription>
                    Nhập License Key để kích hoạt trực tiếp qua internet. Yêu cầu kết nối mạng.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseKey">License Key</Label>
                    <Input
                      id="licenseKey"
                      placeholder="Nhập License Key (VD: PRO-ABC123-XXXX-XXXX)"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleOnlineActivation}
                    disabled={activateOnlineMutation.isPending || !licenseKey.trim()}
                    className="w-full"
                  >
                    {activateOnlineMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Đang kích hoạt...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Kích hoạt Online
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="offline" className="space-y-4 mt-4">
                <Alert>
                  <WifiOff className="h-4 w-4" />
                  <AlertTitle>Kích hoạt Offline</AlertTitle>
                  <AlertDescription>
                    Upload file license (.lic) để kích hoạt mà không cần kết nối internet. 
                    Liên hệ nhà cung cấp để nhận file license.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseFile">File License (.lic)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="licenseFile"
                        type="file"
                        accept=".lic"
                        onChange={handleFileChange}
                        className="cursor-pointer"
                      />
                    </div>
                    {licenseFile && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <FileKey className="h-4 w-4 text-primary" />
                        <span className="text-sm">{licenseFile.name}</span>
                        <Badge variant="outline" className="ml-auto">
                          {(licenseFile.size / 1024).toFixed(2)} KB
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    onClick={handleOfflineActivation}
                    disabled={activateOfflineMutation.isPending || !licenseFile}
                    className="w-full"
                  >
                    {activateOfflineMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Đang kích hoạt...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Kích hoạt Offline
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Validation Status */}
        {validateQuery.data && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {validateQuery.data.valid ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <CardTitle>Trạng thái xác thực</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {validateQuery.data.valid ? (
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-700">License hợp lệ</AlertTitle>
                  <AlertDescription className="text-green-600">
                    License đã được xác thực thành công và đang hoạt động trên thiết bị này.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>License không hợp lệ</AlertTitle>
                  <AlertDescription>
                    {validateQuery.data.error || "Vui lòng kiểm tra lại license hoặc liên hệ hỗ trợ."}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
