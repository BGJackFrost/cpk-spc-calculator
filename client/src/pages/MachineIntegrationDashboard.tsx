import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Key,
  Plus,
  RefreshCw,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  Database,
  FileJson,
  Settings,
  BarChart3,
  Download,
  Webhook,
  ArrowRightLeft,
  Play,
  Zap,
  Radio,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function MachineIntegrationDashboard() {
  const [selectedTab, setSelectedTab] = useState("api-keys");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    name: "",
    vendorName: "",
    machineType: "aoi",
    rateLimit: 100,
    expiresAt: "",
  });
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<number | null>(null);

  // Queries
  const { data: apiKeys, isLoading: loadingKeys, refetch: refetchKeys } = trpc.machineIntegration.listApiKeys.useQuery();
  const { data: apiStats } = trpc.machineIntegration.getApiStats.useQuery({ days: 7 });
  const { data: apiLogs } = trpc.machineIntegration.listApiLogs.useQuery({ limit: 50 });

  // Mutations
  const createApiKeyMutation = trpc.machineIntegration.createApiKey.useMutation({
    onSuccess: (data) => {
      setCreatedApiKey(data.apiKey);
      toast.success("API Key đã được tạo thành công!");
      refetchKeys();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const updateApiKeyMutation = trpc.machineIntegration.updateApiKey.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật API Key");
      refetchKeys();
    },
  });

  const deleteApiKeyMutation = trpc.machineIntegration.deleteApiKey.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa API Key");
      refetchKeys();
    },
  });

  const regenerateApiKeyMutation = trpc.machineIntegration.regenerateApiKey.useMutation({
    onSuccess: (data) => {
      setCreatedApiKey(data.apiKey);
      toast.success("API Key đã được tạo lại!");
    },
  });

  const handleCreateApiKey = () => {
    createApiKeyMutation.mutate({
      name: newKeyData.name,
      vendorName: newKeyData.vendorName,
      machineType: newKeyData.machineType,
      rateLimit: newKeyData.rateLimit,
      expiresAt: newKeyData.expiresAt || undefined,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép vào clipboard");
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("vi-VN");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tích hợp Máy (Machine Integration)</h1>
          <p className="text-muted-foreground">
            Quản lý API keys và theo dõi dữ liệu từ máy AOI, AVI, SPI
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo API Key
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Key className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">API Keys</p>
                <p className="text-2xl font-bold">{apiKeys?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Keys</p>
                <p className="text-2xl font-bold">
                  {apiKeys?.filter(k => k.isActive === 1).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Server className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requests (7d)</p>
                <p className="text-2xl font-bold">
                  {apiStats?.reduce((sum, s) => sum + (s.totalRequests || 0), 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Errors (7d)</p>
                <p className="text-2xl font-bold">
                  {apiStats?.reduce((sum, s) => sum + (s.errorRequests || 0), 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="api-keys"><Key className="h-4 w-4 mr-1" />API Keys</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="h-4 w-4 mr-1" />Webhooks</TabsTrigger>
          <TabsTrigger value="field-mapping"><ArrowRightLeft className="h-4 w-4 mr-1" />Field Mapping</TabsTrigger>
          <TabsTrigger value="realtime"><Radio className="h-4 w-4 mr-1" />Realtime</TabsTrigger>
          <TabsTrigger value="statistics"><BarChart3 className="h-4 w-4 mr-1" />Thống kê</TabsTrigger>
          <TabsTrigger value="logs"><Database className="h-4 w-4 mr-1" />Logs</TabsTrigger>
          <TabsTrigger value="documentation"><FileJson className="h-4 w-4 mr-1" />Tài liệu API</TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách API Keys</CardTitle>
              <CardDescription>
                Quản lý API keys cho các nhà cung cấp máy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingKeys ? (
                <div className="text-center py-8">Đang tải...</div>
              ) : apiKeys?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có API key nào. Nhấn "Tạo API Key" để bắt đầu.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead>Loại máy</TableHead>
                      <TableHead>API Key</TableHead>
                      <TableHead>Rate Limit</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Sử dụng lần cuối</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys?.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>{key.vendorName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{key.machineType.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {key.apiKey}
                          </code>
                        </TableCell>
                        <TableCell>{key.rateLimit}/phút</TableCell>
                        <TableCell>
                          <Switch
                            checked={key.isActive === 1}
                            onCheckedChange={(checked) => {
                              updateApiKeyMutation.mutate({
                                id: key.id,
                                isActive: checked ? 1 : 0,
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>{formatDate(key.lastUsedAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm("Tạo lại API key? Key cũ sẽ không còn hoạt động.")) {
                                  regenerateApiKeyMutation.mutate({ id: key.id });
                                }
                              }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm("Xóa API key này?")) {
                                  deleteApiKeyMutation.mutate({ id: key.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Thống kê API Requests (7 ngày)</CardTitle>
            </CardHeader>
            <CardContent>
              {apiStats && apiStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={apiStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="successRequests" name="Thành công" fill="#22c55e" />
                    <Bar dataKey="errorRequests" name="Lỗi" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có dữ liệu thống kê
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thời gian xử lý trung bình</CardTitle>
            </CardHeader>
            <CardContent>
              {apiStats && apiStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={apiStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="avgProcessingTime"
                      name="Thời gian (ms)"
                      stroke="#8884d8"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Request Logs</CardTitle>
              <CardDescription>50 requests gần nhất</CardDescription>
            </CardHeader>
            <CardContent>
              {apiLogs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có log nào
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processing Time</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(log.createdAt)}</TableCell>
                        <TableCell>
                          <code className="text-xs">{log.endpoint}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.method}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={log.responseStatus < 400 ? "default" : "destructive"}
                          >
                            {log.responseStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.processingTimeMs}ms</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.errorMessage || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>
                Hướng dẫn tích hợp cho nhà cung cấp máy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Base URL</h3>
                <code className="block bg-muted p-3 rounded">
                  {window.location.origin}/api/trpc/machineApi
                </code>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Authentication</h3>
                <p className="text-muted-foreground mb-2">
                  Tất cả requests cần gửi kèm API key trong body:
                </p>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "apiKey": "mak_your_api_key_here",
  "data": [...]
}`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">1. Push Inspection Data (AOI/AVI)</h3>
                <p className="text-muted-foreground mb-2">
                  Endpoint: <code>POST /pushInspectionData</code>
                </p>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "apiKey": "mak_xxx",
  "data": [{
    "batchId": "BATCH001",
    "productCode": "PCB-A001",
    "serialNumber": "SN123456",
    "inspectionType": "aoi",
    "inspectionResult": "pass|fail|rework",
    "defectCount": 0,
    "defectTypes": ["solder_bridge", "missing_component"],
    "defectDetails": { "location": "U1", "severity": "high" },
    "imageUrls": ["https://..."],
    "inspectedAt": "2024-01-15T10:30:00Z",
    "cycleTimeMs": 1500,
    "operatorId": "OP001",
    "shiftId": "SHIFT-A"
  }]
}`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">2. Push Measurement Data (SPC)</h3>
                <p className="text-muted-foreground mb-2">
                  Endpoint: <code>POST /pushMeasurementData</code>
                </p>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "apiKey": "mak_xxx",
  "data": [{
    "batchId": "BATCH001",
    "productCode": "PCB-A001",
    "serialNumber": "SN123456",
    "parameterName": "Solder Height",
    "parameterCode": "SH001",
    "measuredValue": 0.125,
    "unit": "mm",
    "lsl": 0.100,
    "usl": 0.150,
    "target": 0.125,
    "measuredAt": "2024-01-15T10:30:00Z",
    "operatorId": "OP001",
    "shiftId": "SHIFT-A"
  }]
}`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">3. Push OEE Data</h3>
                <p className="text-muted-foreground mb-2">
                  Endpoint: <code>POST /pushOeeData</code>
                </p>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "apiKey": "mak_xxx",
  "data": [{
    "shiftId": "SHIFT-A",
    "recordDate": "2024-01-15",
    "plannedProductionTime": 480,
    "actualProductionTime": 450,
    "downtime": 30,
    "downtimeReasons": [
      { "reason": "Maintenance", "duration": 20 },
      { "reason": "Material shortage", "duration": 10 }
    ],
    "idealCycleTime": 1.5,
    "actualCycleTime": 1.8,
    "totalCount": 1000,
    "goodCount": 980,
    "rejectCount": 15,
    "reworkCount": 5,
    "availability": 93.75,
    "performance": 83.33,
    "quality": 98.0,
    "oee": 76.56,
    "recordedAt": "2024-01-15T18:00:00Z"
  }]
}`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">4. Health Check</h3>
                <p className="text-muted-foreground mb-2">
                  Endpoint: <code>GET /healthCheck?input={"{"}"apiKey":"mak_xxx"{"}"}</code>
                </p>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`Response:
{
  "success": true,
  "status": "healthy",
  "keyInfo": {
    "name": "AOI Machine 1",
    "vendorName": "Vendor A",
    "machineType": "aoi",
    "rateLimit": 100,
    "expiresAt": null
  }
}`}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Response Format</h3>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`Success:
{
  "success": true,
  "message": "Successfully received X records",
  "count": X
}

Error:
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}

Error Codes:
- INVALID_API_KEY: API key không hợp lệ hoặc đã hết hạn
- PROCESSING_ERROR: Lỗi xử lý dữ liệu
- RATE_LIMIT_EXCEEDED: Vượt quá giới hạn requests`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <WebhooksTab />
        </TabsContent>

        {/* Field Mapping Tab */}
        <TabsContent value="field-mapping" className="space-y-4">
          <FieldMappingTab />
        </TabsContent>

        {/* Realtime Tab */}
        <TabsContent value="realtime" className="space-y-4">
          <RealtimeTab />
        </TabsContent>
      </Tabs>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo API Key mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên API Key</Label>
              <Input
                value={newKeyData.name}
                onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                placeholder="VD: AOI Machine Line 1"
              />
            </div>
            <div>
              <Label>Nhà cung cấp</Label>
              <Input
                value={newKeyData.vendorName}
                onChange={(e) => setNewKeyData({ ...newKeyData, vendorName: e.target.value })}
                placeholder="VD: Koh Young, Omron, Mirtec"
              />
            </div>
            <div>
              <Label>Loại máy</Label>
              <Select
                value={newKeyData.machineType}
                onValueChange={(value) => setNewKeyData({ ...newKeyData, machineType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aoi">AOI (Automated Optical Inspection)</SelectItem>
                  <SelectItem value="avi">AVI (Automated Visual Inspection)</SelectItem>
                  <SelectItem value="spi">SPI (Solder Paste Inspection)</SelectItem>
                  <SelectItem value="xray">X-Ray Inspection</SelectItem>
                  <SelectItem value="ict">ICT (In-Circuit Test)</SelectItem>
                  <SelectItem value="fct">FCT (Functional Test)</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rate Limit (requests/phút)</Label>
              <Input
                type="number"
                value={newKeyData.rateLimit}
                onChange={(e) => setNewKeyData({ ...newKeyData, rateLimit: parseInt(e.target.value) })}
                min={1}
                max={1000}
              />
            </div>
            <div>
              <Label>Ngày hết hạn (tùy chọn)</Label>
              <Input
                type="datetime-local"
                value={newKeyData.expiresAt}
                onChange={(e) => setNewKeyData({ ...newKeyData, expiresAt: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateApiKey} disabled={createApiKeyMutation.isPending}>
              {createApiKeyMutation.isPending ? "Đang tạo..." : "Tạo API Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Created API Key Dialog */}
      <Dialog open={!!createdApiKey} onOpenChange={() => setCreatedApiKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key đã được tạo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm font-medium mb-2">
                ⚠️ Lưu ý: API key này chỉ hiển thị một lần. Hãy sao chép và lưu trữ an toàn.
              </p>
            </div>
            <div>
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input value={createdApiKey || ""} readOnly className="font-mono" />
                <Button
                  variant="outline"
                  onClick={() => createdApiKey && copyToClipboard(createdApiKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedApiKey(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// ==================== Webhooks Tab ====================
function WebhooksTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWebhook, setNewWebhook] = useState<{
    name: string;
    webhookUrl: string;
    webhookSecret: string;
    triggerType: "inspection_fail" | "oee_low" | "measurement_out_of_spec" | "all";
    oeeThreshold: number;
    retryCount: number;
    retryDelaySeconds: number;
  }>({
    name: "",
    webhookUrl: "",
    webhookSecret: "",
    triggerType: "all",
    oeeThreshold: 85,
    retryCount: 3,
    retryDelaySeconds: 60,
  });

  const { data: webhooks, isLoading, refetch } = trpc.machineIntegration.listWebhookConfigs.useQuery();
  const { data: webhookLogs } = trpc.machineIntegration.listWebhookLogs.useQuery({ limit: 20 });

  const createMutation = trpc.machineIntegration.createWebhookConfig.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo webhook config");
      setShowCreateDialog(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.machineIntegration.deleteWebhookConfig.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa webhook");
      refetch();
    },
  });

  const testMutation = trpc.machineIntegration.testWebhook.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Test thành công! Status: ${data.status}, Time: ${data.responseTime}ms`);
      } else {
        toast.error(`Test thất bại! Status: ${data.status}`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.machineIntegration.updateWebhookConfig.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Webhook Configurations</CardTitle>
            <CardDescription>Cấu hình webhook để nhận thông báo khi có sự kiện từ máy</CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm Webhook
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : webhooks?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có webhook nào. Nhấn "Thêm Webhook" để bắt đầu.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks?.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{webhook.webhookUrl}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{webhook.triggerType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={webhook.isActive === 1}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: webhook.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testMutation.mutate({ id: webhook.id })}
                          disabled={testMutation.isPending}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate({ id: webhook.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Webhook Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Logs</CardTitle>
          <CardDescription>Lịch sử gọi webhook gần đây</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Attempt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhookLogs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.triggeredAt).toLocaleString("vi-VN")}</TableCell>
                  <TableCell><Badge variant="outline">{log.triggerType}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.responseTime ? `${log.responseTime}ms` : "-"}</TableCell>
                  <TableCell>{log.attempt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Webhook mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên Webhook</Label>
              <Input
                value={newWebhook.name}
                onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                placeholder="VD: Slack Alert"
              />
            </div>
            <div>
              <Label>Webhook URL</Label>
              <Input
                value={newWebhook.webhookUrl}
                onChange={(e) => setNewWebhook({ ...newWebhook, webhookUrl: e.target.value })}
                placeholder="https://hooks.slack.com/..."
              />
            </div>
            <div>
              <Label>Secret (tùy chọn)</Label>
              <Input
                value={newWebhook.webhookSecret}
                onChange={(e) => setNewWebhook({ ...newWebhook, webhookSecret: e.target.value })}
                placeholder="Để xác thực webhook"
              />
            </div>
            <div>
              <Label>Trigger Type</Label>
              <Select
                value={newWebhook.triggerType}
                onValueChange={(v: any) => setNewWebhook({ ...newWebhook, triggerType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả sự kiện</SelectItem>
                  <SelectItem value="inspection_fail">Kiểm tra thất bại</SelectItem>
                  <SelectItem value="oee_low">OEE thấp</SelectItem>
                  <SelectItem value="measurement_out_of_spec">Đo lường ngoài spec</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newWebhook.triggerType === "oee_low" && (
              <div>
                <Label>Ngưỡng OEE (%)</Label>
                <Input
                  type="number"
                  value={newWebhook.oeeThreshold}
                  onChange={(e) => setNewWebhook({ ...newWebhook, oeeThreshold: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Hủy</Button>
            <Button onClick={() => createMutation.mutate(newWebhook)}>Tạo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Field Mapping Tab ====================
function FieldMappingTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sampleJson, setSampleJson] = useState("");
  const [detectedFields, setDetectedFields] = useState<Array<{ name: string; type: string; sample: unknown }>>([]);
  const [newMapping, setNewMapping] = useState({
    name: "",
    sourceField: "",
    targetField: "",
    targetTable: "measurements" as const,
    transformType: "direct" as const,
    transformValue: 1,
  });

  const { data: mappings, isLoading, refetch } = trpc.machineIntegration.listFieldMappings.useQuery({});

  const createMutation = trpc.machineIntegration.createFieldMapping.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo field mapping");
      setShowCreateDialog(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.machineIntegration.deleteFieldMapping.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa mapping");
      refetch();
    },
  });

  const detectMutation = trpc.machineIntegration.detectFields.useMutation({
    onSuccess: (data) => {
      setDetectedFields(data);
      toast.success(`Phát hiện ${data.length} fields`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDetectFields = () => {
    try {
      const parsed = JSON.parse(sampleJson);
      detectMutation.mutate({ sampleData: parsed });
    } catch {
      toast.error("JSON không hợp lệ");
    }
  };

  return (
    <div className="space-y-4">
      {/* Field Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Phát hiện Fields tự động</CardTitle>
          <CardDescription>Paste JSON mẫu từ máy để phát hiện các fields có thể mapping</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>JSON mẫu từ máy</Label>
            <textarea
              className="w-full h-32 p-2 border rounded font-mono text-sm"
              value={sampleJson}
              onChange={(e) => setSampleJson(e.target.value)}
              placeholder='{"machineId": "AOI-001", "value": 1.234, ...}'
            />
          </div>
          <Button onClick={handleDetectFields} disabled={detectMutation.isPending}>
            <Zap className="h-4 w-4 mr-2" />
            Phát hiện Fields
          </Button>
          {detectedFields.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sample Value</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detectedFields.map((field, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{field.name}</TableCell>
                    <TableCell><Badge variant="outline">{field.type}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{String(field.sample)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewMapping({ ...newMapping, sourceField: field.name });
                          setShowCreateDialog(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Existing Mappings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Field Mappings</CardTitle>
            <CardDescription>Cấu hình mapping từ dữ liệu máy sang hệ thống SPC</CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm Mapping
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : mappings?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có mapping nào. Sử dụng "Phát hiện Fields" hoặc "Thêm Mapping" để bắt đầu.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Source Field</TableHead>
                  <TableHead>Target Field</TableHead>
                  <TableHead>Target Table</TableHead>
                  <TableHead>Transform</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings?.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-medium">{mapping.name}</TableCell>
                    <TableCell className="font-mono text-sm">{mapping.sourceField}</TableCell>
                    <TableCell className="font-mono text-sm">{mapping.targetField}</TableCell>
                    <TableCell><Badge variant="outline">{mapping.targetTable}</Badge></TableCell>
                    <TableCell>
                      {mapping.transformType}
                      {mapping.transformValue && ` (${mapping.transformValue})`}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate({ id: mapping.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Mapping Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Field Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên Mapping</Label>
              <Input
                value={newMapping.name}
                onChange={(e) => setNewMapping({ ...newMapping, name: e.target.value })}
                placeholder="VD: AOI Value to Measurement"
              />
            </div>
            <div>
              <Label>Source Field (từ máy)</Label>
              <Input
                value={newMapping.sourceField}
                onChange={(e) => setNewMapping({ ...newMapping, sourceField: e.target.value })}
                placeholder="VD: data.value"
              />
            </div>
            <div>
              <Label>Target Field (trong SPC)</Label>
              <Input
                value={newMapping.targetField}
                onChange={(e) => setNewMapping({ ...newMapping, targetField: e.target.value })}
                placeholder="VD: measuredValue"
              />
            </div>
            <div>
              <Label>Target Table</Label>
              <Select
                value={newMapping.targetTable}
                onValueChange={(v: any) => setNewMapping({ ...newMapping, targetTable: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="measurements">Measurements (SPC)</SelectItem>
                  <SelectItem value="inspection_data">Inspection Data (AOI/AVI)</SelectItem>
                  <SelectItem value="oee_records">OEE Records</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transform Type</Label>
              <Select
                value={newMapping.transformType}
                onValueChange={(v: any) => setNewMapping({ ...newMapping, transformType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct (không đổi)</SelectItem>
                  <SelectItem value="multiply">Multiply (nhân)</SelectItem>
                  <SelectItem value="divide">Divide (chia)</SelectItem>
                  <SelectItem value="add">Add (cộng)</SelectItem>
                  <SelectItem value="subtract">Subtract (trừ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newMapping.transformType !== "direct" && (
              <div>
                <Label>Transform Value</Label>
                <Input
                  type="number"
                  value={newMapping.transformValue}
                  onChange={(e) => setNewMapping({ ...newMapping, transformValue: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Hủy</Button>
            <Button onClick={() => createMutation.mutate(newMapping)}>Tạo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Realtime Tab ====================
function RealtimeTab() {
  const [timeRange, setTimeRange] = useState<'1h' | '4h' | '8h' | '24h'>('1h');
  const [activeSubTab, setActiveSubTab] = useState<'events' | 'inspection' | 'measurement'>('events');
  
  const { data: events, isLoading, refetch } = trpc.machineIntegration.listRealtimeEvents.useQuery({ limit: 50 });
  const { data: stats } = trpc.machineIntegration.getRealtimeStats.useQuery();
  const { data: inspectionStats, refetch: refetchInspection } = trpc.machineIntegration.getInspectionStats.useQuery({ timeRange });
  const { data: measurementStats, refetch: refetchMeasurement } = trpc.machineIntegration.getMeasurementStats.useQuery({ timeRange });

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      refetchInspection();
      refetchMeasurement();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch, refetchInspection, refetchMeasurement]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "error": return "destructive";
      case "warning": return "secondary";
      default: return "outline";
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "inspection": return <Eye className="h-4 w-4" />;
      case "measurement": return <Activity className="h-4 w-4" />;
      case "oee": return <BarChart3 className="h-4 w-4" />;
      case "alert": return <AlertTriangle className="h-4 w-4" />;
      default: return <Server className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
            <p className="text-sm text-muted-foreground">Events (1h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-500">{stats?.criticalCount || 0}</div>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-500">{stats?.errorCount || 0}</div>
            <p className="text-sm text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">{stats?.warningCount || 0}</div>
            <p className="text-sm text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs for different views */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={activeSubTab === 'events' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSubTab('events')}
        >
          <Radio className="h-4 w-4 mr-1" />
          Event Stream
        </Button>
        <Button
          variant={activeSubTab === 'inspection' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSubTab('inspection')}
        >
          <Eye className="h-4 w-4 mr-1" />
          Inspection Chart
        </Button>
        <Button
          variant={activeSubTab === 'measurement' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveSubTab('measurement')}
        >
          <Activity className="h-4 w-4 mr-1" />
          Measurement Stats
        </Button>
        <div className="ml-auto">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 giờ</SelectItem>
              <SelectItem value="4h">4 giờ</SelectItem>
              <SelectItem value="8h">8 giờ</SelectItem>
              <SelectItem value="24h">24 giờ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Event Stream */}
      {activeSubTab === 'events' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-green-500 animate-pulse" />
                Realtime Event Stream
              </CardTitle>
              <CardDescription>Dữ liệu từ máy được cập nhật tự động mỗi 5 giây</CardDescription>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Đang tải...</div>
            ) : events?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có sự kiện nào. Dữ liệu sẽ xuất hiện khi máy gửi dữ liệu qua API.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {events?.map((event) => {
                  let eventData: Record<string, unknown> = {};
                  try {
                    eventData = JSON.parse(event.eventData);
                  } catch {}

                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="mt-1">{getEventIcon(event.eventType)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(event.severity)}>{event.severity}</Badge>
                          <Badge variant="outline">{event.eventType}</Badge>
                          {event.machineName && (
                            <span className="text-sm text-muted-foreground">{event.machineName}</span>
                          )}
                        </div>
                        <div className="text-sm mt-1">
                          {eventData.type && <span className="font-medium">{String(eventData.type)}: </span>}
                          {eventData.message && <span>{String(eventData.message)}</span>}
                          {eventData.failedCount !== undefined && (
                            <span>Failed: {String(eventData.failedCount)}/{String(eventData.totalCount)}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(event.createdAt).toLocaleString("vi-VN")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inspection Live Chart */}
      {activeSubTab === 'inspection' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Summary Cards */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Tổng quan Inspection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tổng kiểm tra</span>
                  <span className="text-2xl font-bold">{inspectionStats?.summary.totalInspections || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pass Rate</span>
                  <span className="text-2xl font-bold text-green-500">{inspectionStats?.summary.passRate || 0}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-500">{inspectionStats?.summary.totalPass || 0}</div>
                    <div className="text-xs text-muted-foreground">Pass</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-500">{inspectionStats?.summary.totalFail || 0}</div>
                    <div className="text-xs text-muted-foreground">Fail</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-yellow-500">{inspectionStats?.summary.totalRework || 0}</div>
                    <div className="text-xs text-muted-foreground">Rework</div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg Cycle Time</span>
                    <span>{inspectionStats?.summary.avgCycleTime || 0} ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Defects</span>
                    <span>{inspectionStats?.summary.totalDefects || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pass/Fail Pie Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Tỷ lệ Pass/Fail</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    { name: 'Pass', value: inspectionStats?.summary.totalPass || 0, fill: '#22c55e' },
                    { name: 'Fail', value: inspectionStats?.summary.totalFail || 0, fill: '#ef4444' },
                    { name: 'Rework', value: inspectionStats?.summary.totalRework || 0, fill: '#eab308' },
                  ]}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={60} />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pass Rate Gauge */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Pass Rate Gauge</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke={parseFloat(inspectionStats?.summary.passRate || '0') >= 95 ? '#22c55e' : parseFloat(inspectionStats?.summary.passRate || '0') >= 85 ? '#eab308' : '#ef4444'}
                    strokeWidth="12"
                    strokeDasharray={`${(parseFloat(inspectionStats?.summary.passRate || '0') / 100) * 440} 440`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">{inspectionStats?.summary.passRate || 0}%</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Pass Rate ({timeRange})</p>
            </CardContent>
          </Card>

          {/* Time Series Chart */}
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                  Live Inspection Pass/Fail Rate
                </CardTitle>
                <CardDescription>Cập nhật tự động mỗi 5 giây</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {!inspectionStats?.chartData || inspectionStats.chartData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Chưa có dữ liệu inspection trong khoảng thời gian này
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={inspectionStats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => value.split(' ')[1] || value}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => `Thời gian: ${value}`}
                      formatter={(value: number, name: string) => {
                        if (name === 'passRate') return [`${value}%`, 'Pass Rate'];
                        return [value, name === 'pass' ? 'Pass' : name === 'fail' ? 'Fail' : 'Rework'];
                      }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="pass" stroke="#22c55e" strokeWidth={2} name="Pass" dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="fail" stroke="#ef4444" strokeWidth={2} name="Fail" dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey="rework" stroke="#eab308" strokeWidth={2} name="Rework" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="passRate" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" name="Pass Rate %" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Measurement Stats */}
      {activeSubTab === 'measurement' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Tổng quan Measurement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tổng đo lường</span>
                  <span className="text-2xl font-bold">{measurementStats?.summary.totalMeasurements || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">In-Spec Rate</span>
                  <span className="text-2xl font-bold text-green-500">{measurementStats?.summary.inSpecRate || 0}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-500">{measurementStats?.summary.inSpecCount || 0}</div>
                    <div className="text-xs text-muted-foreground">In Spec</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-500">{measurementStats?.summary.outOfSpecCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Out of Spec</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-500">{measurementStats?.summary.unknownSpecCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Unknown</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Out of Spec by Parameter */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Out-of-Spec by Parameter</CardTitle>
            </CardHeader>
            <CardContent>
              {!measurementStats?.byParameter || measurementStats.byParameter.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Không có dữ liệu out-of-spec
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {measurementStats.byParameter.map((param, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate max-w-[200px]">{param.parameterName}</span>
                          <span className="text-red-500">{param.outOfSpecCount}/{param.totalCount}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${param.outOfSpecRate}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{param.outOfSpecRate}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
