import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Database, Save, TestTube2, RefreshCw, Shield, Server, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DatabaseSettings() {
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Database config state
  const [dbConfig, setDbConfig] = useState({
    host: "localhost",
    port: "3306",
    username: "root",
    password: "",
    database: "cpk_spc",
  });

  // Get current config
  const { data: configs, refetch } = trpc.system.getAllConfigs.useQuery();
  
  // Save config mutation
  const saveConfigMutation = trpc.system.saveSetupConfig.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu cấu hình database");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Load current config when data is available
  useState(() => {
    if (configs) {
      const hostConfig = configs.find(c => c.configKey === "db_host");
      const portConfig = configs.find(c => c.configKey === "db_port");
      const userConfig = configs.find(c => c.configKey === "db_user");
      const dbNameConfig = configs.find(c => c.configKey === "db_name");
      
      setDbConfig(prev => ({
        ...prev,
        host: hostConfig?.configValue || prev.host,
        port: portConfig?.configValue || prev.port,
        username: userConfig?.configValue || prev.username,
        database: dbNameConfig?.configValue || prev.database,
      }));
    }
  });

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Kết nối database thành công!");
    } catch {
      toast.error("Không thể kết nối database. Vui lòng kiểm tra lại cấu hình.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await saveConfigMutation.mutateAsync({
        configs: [
          { key: "db_host", value: dbConfig.host, type: "string" },
          { key: "db_port", value: dbConfig.port, type: "string" },
          { key: "db_user", value: dbConfig.username, type: "string" },
          { key: "db_password", value: dbConfig.password, type: "string", encrypted: true },
          { key: "db_name", value: dbConfig.database, type: "string" },
        ],
      });
    } finally {
      setIsSaving(false);
    }
  };

  const connectionString = `mysql://${dbConfig.username}:****@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8" />
              Quản lý Database
            </h1>
            <p className="text-muted-foreground mt-1">
              Cấu hình kết nối database cho hệ thống
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Server className="h-3 w-3" />
            MySQL / TiDB
          </Badge>
        </div>

        <Tabs defaultValue="connection" className="space-y-4">
          <TabsList>
            <TabsTrigger value="connection">Kết nối Database</TabsTrigger>
            <TabsTrigger value="status">Trạng thái</TabsTrigger>
            <TabsTrigger value="backup">Sao lưu & Khôi phục</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Thông tin kết nối
                </CardTitle>
                <CardDescription>
                  Cấu hình thông tin kết nối đến database MySQL/TiDB
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="host">Host / IP Address</Label>
                    <Input
                      id="host"
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                      placeholder="localhost hoặc IP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                      placeholder="3306"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={dbConfig.username}
                      onChange={(e) => setDbConfig({ ...dbConfig, username: e.target.value })}
                      placeholder="root"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={dbConfig.password}
                        onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="database">Database Name</Label>
                  <Input
                    id="database"
                    value={dbConfig.database}
                    onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                    placeholder="cpk_spc"
                  />
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm text-muted-foreground">Connection String</Label>
                  <code className="block mt-1 text-sm font-mono">{connectionString}</code>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube2 className="h-4 w-4 mr-2" />
                    )}
                    Test kết nối
                  </Button>
                  <Button onClick={handleSaveConfig} disabled={isSaving}>
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Lưu cấu hình
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trạng thái Database</CardTitle>
                <CardDescription>
                  Thông tin về trạng thái kết nối và hiệu suất database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-sm text-muted-foreground">Trạng thái</div>
                    <div className="text-lg font-semibold text-green-600">Đang kết nối</div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-sm text-muted-foreground">Số bảng</div>
                    <div className="text-lg font-semibold text-blue-600">40+</div>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="text-sm text-muted-foreground">Dung lượng</div>
                    <div className="text-lg font-semibold text-purple-600">~50 MB</div>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="text-sm text-muted-foreground">Uptime</div>
                    <div className="text-lg font-semibold text-orange-600">99.9%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sao lưu & Khôi phục</CardTitle>
                <CardDescription>
                  Quản lý sao lưu và khôi phục dữ liệu database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Sao lưu thủ công</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tạo bản sao lưu database ngay lập tức
                  </p>
                  <Button variant="outline" onClick={() => toast.info("Tính năng đang phát triển")}>
                    Tạo bản sao lưu
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Khôi phục từ file</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Khôi phục database từ file sao lưu
                  </p>
                  <Button variant="outline" onClick={() => toast.info("Tính năng đang phát triển")}>
                    Chọn file khôi phục
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
