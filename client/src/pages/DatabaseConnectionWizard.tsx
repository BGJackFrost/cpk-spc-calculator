import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Database,
  Server,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Table2,
  Columns3,
  RefreshCw,
  Save,
  AlertCircle,
  Info
} from "lucide-react";

type DatabaseType = "mysql" | "postgresql" | "sqlserver" | "oracle" | "access" | "excel" | "internal";

interface ConnectionForm {
  name: string;
  databaseType: DatabaseType;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  sslEnabled: boolean;
  maxConnections: number;
  purpose: string;
  notes: string;
}

interface DetectedSchema {
  tables: Array<{
    name: string;
    rowCount: number;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
    }>;
  }>;
}

const DATABASE_TYPES = [
  { value: "mysql", label: "MySQL", icon: "🐬", defaultPort: "3306", description: "MySQL / MariaDB database" },
  { value: "postgresql", label: "PostgreSQL", icon: "🐘", defaultPort: "5432", description: "PostgreSQL database" },
  { value: "sqlserver", label: "SQL Server", icon: "🔷", defaultPort: "1433", description: "Microsoft SQL Server" },
  { value: "oracle", label: "Oracle", icon: "🔴", defaultPort: "1521", description: "Oracle Database" },
  { value: "access", label: "Access", icon: "📊", defaultPort: "", description: "Microsoft Access (.mdb, .accdb)" },
  { value: "excel", label: "Excel", icon: "📗", defaultPort: "", description: "Excel file (.xlsx, .xls)" },
];

export default function DatabaseConnectionWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<ConnectionForm>({
    name: "",
    databaseType: "mysql",
    host: "localhost",
    port: "3306",
    database: "",
    username: "",
    password: "",
    sslEnabled: false,
    maxConnections: 10,
    purpose: "spc_data",
    notes: "",
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [detectedSchema, setDetectedSchema] = useState<DetectedSchema | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createConnection = trpc.databaseConnection.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã tạo kết nối database mới",
      });
      setLocation("/database-connections");
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnection = trpc.databaseConnection.test.useMutation();
  const getSchema = trpc.databaseConnection.getSchema?.useMutation?.();

  const handleDatabaseTypeChange = (type: DatabaseType) => {
    const dbType = DATABASE_TYPES.find(d => d.value === type);
    setForm(prev => ({
      ...prev,
      databaseType: type,
      port: dbType?.defaultPort || prev.port,
    }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection.mutateAsync({
        databaseType: form.databaseType,
        host: form.host,
        port: parseInt(form.port) || 3306,
        database: form.database,
        username: form.username,
        password: form.password,
      });
      setTestResult({ success: result.success, message: result.error || "Kết nối thành công" });
      if (result.success) {
        toast({
          title: "Kết nối thành công",
          description: "Database đã sẵn sàng để sử dụng",
        });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || "Không thể kết nối" });
      toast({
        title: "Kết nối thất bại",
        description: error.message || "Không thể kết nối đến database",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDetectSchema = async () => {
    setIsDetecting(true);
    try {
      // Simulate schema detection - in real implementation, call API
      const mockSchema: DetectedSchema = {
        tables: [
          {
            name: "measurements",
            rowCount: 1500,
            columns: [
              { name: "id", type: "INT", nullable: false },
              { name: "product_code", type: "VARCHAR(50)", nullable: false },
              { name: "station_name", type: "VARCHAR(100)", nullable: false },
              { name: "value", type: "DECIMAL(10,4)", nullable: false },
              { name: "measured_at", type: "DATETIME", nullable: false },
            ]
          },
          {
            name: "products",
            rowCount: 25,
            columns: [
              { name: "id", type: "INT", nullable: false },
              { name: "code", type: "VARCHAR(50)", nullable: false },
              { name: "name", type: "VARCHAR(200)", nullable: false },
              { name: "usl", type: "DECIMAL(10,4)", nullable: true },
              { name: "lsl", type: "DECIMAL(10,4)", nullable: true },
            ]
          },
          {
            name: "stations",
            rowCount: 10,
            columns: [
              { name: "id", type: "INT", nullable: false },
              { name: "name", type: "VARCHAR(100)", nullable: false },
              { name: "line_id", type: "INT", nullable: true },
            ]
          },
        ]
      };
      setDetectedSchema(mockSchema);
      setSelectedTables(mockSchema.tables.map(t => t.name));
      toast({
        title: "Phát hiện schema",
        description: `Tìm thấy ${mockSchema.tables.length} bảng`,
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể phát hiện schema",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSaveConnection = () => {
    createConnection.mutate({
      name: form.name,
      databaseType: form.databaseType,
      host: form.host,
      port: parseInt(form.port) || 3306,
      database: form.database,
      username: form.username,
      password: form.password,
      maxConnections: form.maxConnections,
      purpose: form.purpose,
      description: form.notes,
      isDefault: false,
      healthCheckEnabled: true,
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return form.databaseType.length > 0;
      case 2:
        return form.name && form.host && form.database && form.username;
      case 3:
        return testResult?.success === true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Chọn loại Database</h2>
        <p className="text-muted-foreground">Chọn loại database bạn muốn kết nối</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {DATABASE_TYPES.map((db) => (
          <Card
            key={db.value}
            className={`cursor-pointer transition-all hover:border-primary ${
              form.databaseType === db.value ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => handleDatabaseTypeChange(db.value as DatabaseType)}
          >
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-3">{db.icon}</div>
              <h3 className="font-semibold">{db.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{db.description}</p>
              {form.databaseType === db.value && (
                <Badge className="mt-2" variant="default">Đã chọn</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Thông tin kết nối</h2>
        <p className="text-muted-foreground">Nhập thông tin để kết nối đến database</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Tên kết nối *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="VD: Production Database"
            />
          </div>

          <div>
            <Label htmlFor="host">Host / Server *</Label>
            <Input
              id="host"
              value={form.host}
              onChange={(e) => setForm(prev => ({ ...prev, host: e.target.value }))}
              placeholder="localhost hoặc IP address"
            />
          </div>

          <div>
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              value={form.port}
              onChange={(e) => setForm(prev => ({ ...prev, port: e.target.value }))}
              placeholder={DATABASE_TYPES.find(d => d.value === form.databaseType)?.defaultPort}
            />
          </div>

          <div>
            <Label htmlFor="database">Tên Database *</Label>
            <Input
              id="database"
              value={form.database}
              onChange={(e) => setForm(prev => ({ ...prev, database: e.target.value }))}
              placeholder="database_name"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
              placeholder="root"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••"
            />
          </div>

          <div>
            <Label htmlFor="purpose">Mục đích sử dụng</Label>
            <Select value={form.purpose} onValueChange={(v) => setForm(prev => ({ ...prev, purpose: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spc_data">Dữ liệu SPC/CPK</SelectItem>
                <SelectItem value="oee_data">Dữ liệu OEE</SelectItem>
                <SelectItem value="production">Dữ liệu sản xuất</SelectItem>
                <SelectItem value="backup">Backup database</SelectItem>
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ssl"
              checked={form.sslEnabled}
              onCheckedChange={(checked) => setForm(prev => ({ ...prev, sslEnabled: checked }))}
            />
            <Label htmlFor="ssl">Bật SSL/TLS</Label>
          </div>

          <div>
            <Label htmlFor="maxConnections">Số kết nối tối đa</Label>
            <Input
              id="maxConnections"
              type="number"
              value={form.maxConnections}
              onChange={(e) => setForm(prev => ({ ...prev, maxConnections: parseInt(e.target.value) || 10 }))}
              min={1}
              max={100}
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Ghi chú</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Ghi chú thêm về kết nối này..."
          rows={3}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Kiểm tra kết nối</h2>
        <p className="text-muted-foreground">Test kết nối và phát hiện schema database</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Thông tin kết nối
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Loại:</span>
              <span className="ml-2 font-medium">{DATABASE_TYPES.find(d => d.value === form.databaseType)?.label}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Host:</span>
              <span className="ml-2 font-medium">{form.host}:{form.port}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Database:</span>
              <span className="ml-2 font-medium">{form.database}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Username:</span>
              <span className="ml-2 font-medium">{form.username}</span>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Button onClick={handleTestConnection} disabled={isTesting}>
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Test kết nối
                </>
              )}
            </Button>

            {testResult?.success && (
              <Button variant="outline" onClick={handleDetectSchema} disabled={isDetecting}>
                {isDetecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang phát hiện...
                  </>
                ) : (
                  <>
                    <Table2 className="mr-2 h-4 w-4" />
                    Phát hiện Schema
                  </>
                )}
              </Button>
            )}
          </div>

          {testResult && (
            <div className={`mt-4 p-4 rounded-lg ${testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={testResult.success ? "text-green-700" : "text-red-700"}>
                  {testResult.message}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {detectedSchema && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              Schema đã phát hiện ({detectedSchema.tables.length} bảng)
            </CardTitle>
            <CardDescription>
              Chọn các bảng bạn muốn sử dụng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {detectedSchema.tables.map((table) => (
                <div key={table.name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedTables.includes(table.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTables(prev => [...prev, table.name]);
                          } else {
                            setSelectedTables(prev => prev.filter(t => t !== table.name));
                          }
                        }}
                      />
                      <span className="font-medium">{table.name}</span>
                      <Badge variant="secondary">{table.rowCount} rows</Badge>
                    </div>
                  </div>
                  <div className="ml-6 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {table.columns.map((col) => (
                      <div key={col.name} className="flex items-center gap-1 text-muted-foreground">
                        <Columns3 className="h-3 w-3" />
                        <span>{col.name}</span>
                        <span className="text-xs">({col.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Xác nhận và Lưu</h2>
        <p className="text-muted-foreground">Kiểm tra lại thông tin trước khi lưu kết nối</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Tổng quan kết nối
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-y-4">
            <div>
              <span className="text-muted-foreground">Tên kết nối:</span>
              <p className="font-medium">{form.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Loại database:</span>
              <p className="font-medium">{DATABASE_TYPES.find(d => d.value === form.databaseType)?.label}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Host:</span>
              <p className="font-medium">{form.host}:{form.port}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Database:</span>
              <p className="font-medium">{form.database}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Username:</span>
              <p className="font-medium">{form.username}</p>
            </div>
            <div>
              <span className="text-muted-foreground">SSL:</span>
              <p className="font-medium">{form.sslEnabled ? "Bật" : "Tắt"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Mục đích:</span>
              <p className="font-medium">{form.purpose}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Max connections:</span>
              <p className="font-medium">{form.maxConnections}</p>
            </div>
          </div>

          {form.notes && (
            <div className="mt-4">
              <span className="text-muted-foreground">Ghi chú:</span>
              <p className="mt-1">{form.notes}</p>
            </div>
          )}

          {detectedSchema && selectedTables.length > 0 && (
            <div className="mt-4">
              <span className="text-muted-foreground">Bảng đã chọn:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTables.map(table => (
                  <Badge key={table} variant="secondary">{table}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-5 w-5 text-blue-600" />
        <span className="text-blue-700">
          Sau khi lưu, bạn có thể đặt kết nối này làm mặc định hoặc sử dụng trong các Mapping SPC.
        </span>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-6 w-6" />
                  Wizard Tạo Kết nối Database
                </CardTitle>
                <CardDescription>
                  Hướng dẫn từng bước để cấu hình kết nối database mới
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === currentStep
                        ? "bg-primary text-primary-foreground"
                        : step < currentStep
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step < currentStep ? <CheckCircle2 className="h-4 w-4" /> : step}
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}

            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Quay lại
              </Button>

              {currentStep < 4 ? (
                <Button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceed()}
                >
                  Tiếp theo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSaveConnection}
                  disabled={createConnection.isPending}
                >
                  {createConnection.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Lưu kết nối
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
