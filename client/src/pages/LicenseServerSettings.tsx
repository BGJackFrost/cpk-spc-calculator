import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Database, 
  Server,
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
  Play,
  AlertTriangle,
  Key,
  Users,
  Activity,
  Shield
} from "lucide-react";

export default function LicenseServerSettings() {
  // Connection config state
  const [config, setConfig] = useState({
    host: "",
    port: "3306",
    user: "",
    password: "",
    database: "license_server"
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Queries
  const configQuery = trpc.licenseServer.getConfig.useQuery();
  const statusQuery = trpc.licenseServer.getStatus.useQuery(undefined, {
    refetchInterval: isConnected ? 30000 : false
  });
  const statsQuery = trpc.licenseServer.getStats.useQuery(undefined, {
    enabled: isConnected
  });
  
  // Mutations
  const testConnectionMutation = trpc.licenseServer.testConnection.useMutation();
  const saveConfigMutation = trpc.licenseServer.saveConfig.useMutation();
  const initSchemaMutation = trpc.licenseServer.initSchema.useMutation();
  const connectMutation = trpc.licenseServer.connect.useMutation();
  
  // Load saved config
  useEffect(() => {
    if (configQuery.data) {
      setConfig({
        host: configQuery.data.host || "",
        port: configQuery.data.port?.toString() || "3306",
        user: configQuery.data.user || "",
        password: "", // Don't load password for security
        database: configQuery.data.database || "license_server"
      });
    }
  }, [configQuery.data]);
  
  // Update connection status
  useEffect(() => {
    if (statusQuery.data) {
      setIsConnected(statusQuery.data.connected);
    }
  }, [statusQuery.data]);
  
  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testConnectionMutation.mutateAsync({
        host: config.host,
        port: parseInt(config.port),
        user: config.user,
        password: config.password,
        database: config.database
      });
      
      if (result.success) {
        toast.success("Kết nối thành công!");
        setIsConnected(true);
      } else {
        toast.error(result.error || "Kết nối thất bại");
        setIsConnected(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi kết nối");
      setIsConnected(false);
    } finally {
      setIsTesting(false);
    }
  };
  
  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await saveConfigMutation.mutateAsync({
        host: config.host,
        port: parseInt(config.port),
        user: config.user,
        password: config.password,
        database: config.database
      });
      toast.success("Đã lưu cấu hình");
      configQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Lưu cấu hình thất bại");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleInitSchema = async () => {
    if (!confirm("Bạn có chắc muốn khởi tạo schema? Thao tác này sẽ tạo các bảng cần thiết trong database.")) {
      return;
    }
    
    setIsInitializing(true);
    try {
      const result = await initSchemaMutation.mutateAsync();
      if (result.success) {
        toast.success("Đã khởi tạo schema thành công");
        statusQuery.refetch();
        statsQuery.refetch();
      } else {
        toast.error(result.error || "Khởi tạo schema thất bại");
      }
    } catch (error: any) {
      toast.error(error.message || "Khởi tạo schema thất bại");
    } finally {
      setIsInitializing(false);
    }
  };
  
  const handleConnect = async () => {
    try {
      const result = await connectMutation.mutateAsync();
      if (result.success) {
        toast.success("Đã kết nối License Server");
        setIsConnected(true);
        statusQuery.refetch();
        statsQuery.refetch();
      } else {
        toast.error(result.error || "Kết nối thất bại");
      }
    } catch (error: any) {
      toast.error(error.message || "Kết nối thất bại");
    }
  };
  
  const stats = statsQuery.data || {
    totalLicenses: 0,
    activeLicenses: 0,
    expiredLicenses: 0,
    totalActivations: 0,
    activeActivations: 0,
    totalCustomers: 0
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="h-6 w-6 text-primary" />
              Cài đặt License Server
            </h1>
            <p className="text-muted-foreground">Cấu hình kết nối database riêng cho License Server</p>
          </div>
          <Badge 
            className={isConnected ? "bg-green-500" : "bg-red-500"}
          >
            {isConnected ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Đã kết nối</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Chưa kết nối</>
            )}
          </Badge>
        </div>
        
        <Tabs defaultValue="connection">
          <TabsList>
            <TabsTrigger value="connection">Kết nối Database</TabsTrigger>
            <TabsTrigger value="status" disabled={!isConnected}>Trạng thái Server</TabsTrigger>
            <TabsTrigger value="api" disabled={!isConnected}>API Endpoints</TabsTrigger>
          </TabsList>
          
          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Cấu hình Database License Server
                </CardTitle>
                <CardDescription>
                  License Server sử dụng database riêng biệt với hệ thống SPC/CPK Calculator
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Lưu ý quan trọng</AlertTitle>
                  <AlertDescription>
                    Database này sẽ lưu trữ thông tin license, khách hàng và lịch sử kích hoạt. 
                    Hãy đảm bảo database được backup định kỳ và bảo mật.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Host</Label>
                    <Input 
                      value={config.host}
                      onChange={(e) => setConfig({...config, host: e.target.value})}
                      placeholder="localhost hoặc IP/hostname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input 
                      value={config.port}
                      onChange={(e) => setConfig({...config, port: e.target.value})}
                      placeholder="3306"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input 
                      value={config.user}
                      onChange={(e) => setConfig({...config, user: e.target.value})}
                      placeholder="root"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input 
                      type="password"
                      value={config.password}
                      onChange={(e) => setConfig({...config, password: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Database Name</Label>
                  <Input 
                    value={config.database}
                    onChange={(e) => setConfig({...config, database: e.target.value})}
                    placeholder="license_server"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={handleTestConnection}
                    disabled={isTesting || !config.host || !config.user}
                  >
                    {isTesting && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Test Kết nối
                  </Button>
                  <Button 
                    onClick={handleSaveConfig}
                    disabled={isSaving || !config.host || !config.user}
                  >
                    {isSaving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    Lưu Cấu hình
                  </Button>
                  {isConnected && (
                    <Button 
                      variant="secondary"
                      onClick={handleInitSchema}
                      disabled={isInitializing}
                    >
                      {isInitializing && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      <Play className="h-4 w-4 mr-2" />
                      Khởi tạo Schema
                    </Button>
                  )}
                  {!isConnected && configQuery.data?.host && (
                    <Button onClick={handleConnect}>
                      Kết nối
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Status Tab */}
          <TabsContent value="status" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Key className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng License</p>
                      <p className="text-2xl font-bold">{stats.totalLicenses}</p>
                      <p className="text-xs text-green-600">{stats.activeLicenses} đang hoạt động</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Activity className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Kích hoạt</p>
                      <p className="text-2xl font-bold">{stats.totalActivations}</p>
                      <p className="text-xs text-green-600">{stats.activeActivations} đang online</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Khách hàng</p>
                      <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {stats.expiredLicenses > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Cảnh báo</AlertTitle>
                <AlertDescription>
                  Có {stats.expiredLicenses} license đã hết hạn cần xử lý.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          {/* API Tab */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  API Endpoints cho Client
                </CardTitle>
                <CardDescription>
                  Các endpoint API để Client (ứng dụng SPC/CPK) gọi đến License Server
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge>POST</Badge>
                      <code className="text-sm font-mono">/api/license-server/validate</code>
                    </div>
                    <p className="text-sm text-muted-foreground">Xác thực license key và device ID</p>
                    <pre className="text-xs bg-background p-2 rounded mt-2">
{`{
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "deviceId": "unique-device-id"
}`}
                    </pre>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge>POST</Badge>
                      <code className="text-sm font-mono">/api/license-server/activate</code>
                    </div>
                    <p className="text-sm text-muted-foreground">Kích hoạt license trên thiết bị</p>
                    <pre className="text-xs bg-background p-2 rounded mt-2">
{`{
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "deviceId": "unique-device-id",
  "deviceName": "PC-001",
  "deviceInfo": "{...}"
}`}
                    </pre>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge>POST</Badge>
                      <code className="text-sm font-mono">/api/license-server/heartbeat</code>
                    </div>
                    <p className="text-sm text-muted-foreground">Gửi heartbeat định kỳ từ Client</p>
                    <pre className="text-xs bg-background p-2 rounded mt-2">
{`{
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "deviceId": "unique-device-id"
}`}
                    </pre>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">GET</Badge>
                      <code className="text-sm font-mono">/api/license-server/status/:licenseKey</code>
                    </div>
                    <p className="text-sm text-muted-foreground">Lấy trạng thái license</p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive">POST</Badge>
                      <code className="text-sm font-mono">/api/license-server/deactivate</code>
                    </div>
                    <p className="text-sm text-muted-foreground">Hủy kích hoạt license trên thiết bị</p>
                    <pre className="text-xs bg-background p-2 rounded mt-2">
{`{
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "deviceId": "unique-device-id",
  "reason": "User request"
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
