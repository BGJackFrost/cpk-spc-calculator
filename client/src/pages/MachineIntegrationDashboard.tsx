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
  Bell,
  Mail,
  Calendar,
  TrendingDown,
  Edit,
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
  ComposedChart,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";

export default function MachineIntegrationDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");
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
          <TabsTrigger value="overview"><Activity className="h-4 w-4 mr-1" />Tổng quan</TabsTrigger>
          <TabsTrigger value="api-keys"><Key className="h-4 w-4 mr-1" />API Keys</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="h-4 w-4 mr-1" />Webhooks</TabsTrigger>
          <TabsTrigger value="field-mapping"><ArrowRightLeft className="h-4 w-4 mr-1" />Field Mapping</TabsTrigger>
          <TabsTrigger value="realtime"><Radio className="h-4 w-4 mr-1" />Realtime</TabsTrigger>
          <TabsTrigger value="oee-dashboard"><BarChart3 className="h-4 w-4 mr-1" />OEE Dashboard</TabsTrigger>
          <TabsTrigger value="oee-hourly"><Clock className="h-4 w-4 mr-1" />OEE Theo Giờ</TabsTrigger>
          <TabsTrigger value="oee-alerts"><Bell className="h-4 w-4 mr-1" />Cảnh báo OEE</TabsTrigger>
          <TabsTrigger value="oee-reports"><Mail className="h-4 w-4 mr-1" />Báo cáo OEE</TabsTrigger>
          <TabsTrigger value="downtime-analysis"><TrendingDown className="h-4 w-4 mr-1" />Pareto Downtime</TabsTrigger>
          <TabsTrigger value="statistics"><Activity className="h-4 w-4 mr-1" />Thống kê</TabsTrigger>
          <TabsTrigger value="logs"><Database className="h-4 w-4 mr-1" />Logs</TabsTrigger>
          <TabsTrigger value="documentation"><FileJson className="h-4 w-4 mr-1" />Tài liệu API</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <OverviewTab />
        </TabsContent>

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

        <TabsContent value="oee-dashboard" className="space-y-4">
          <OeeDashboardTab />
        </TabsContent>

        <TabsContent value="oee-hourly" className="space-y-4">
          <OeeHourlyTrendTab />
        </TabsContent>

        <TabsContent value="oee-alerts" className="space-y-4">
          <OeeAlertsTab />
        </TabsContent>

        <TabsContent value="oee-reports" className="space-y-4">
          <OeeReportsTab />
        </TabsContent>

        <TabsContent value="downtime-analysis" className="space-y-4">
          <DowntimeAnalysisTab />
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
  const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(undefined);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportType, setExportType] = useState<'inspection' | 'measurement'>('inspection');
  
  const { data: machines } = trpc.machineIntegration.listMachines.useQuery();
  const { data: events, isLoading, refetch } = trpc.machineIntegration.listRealtimeEvents.useQuery({ limit: 50 });
  const { data: stats } = trpc.machineIntegration.getRealtimeStats.useQuery();
  const { data: inspectionStats, refetch: refetchInspection } = trpc.machineIntegration.getInspectionStats.useQuery({ 
    timeRange,
    machineId: selectedMachineId,
  });
  const { data: measurementStats, refetch: refetchMeasurement } = trpc.machineIntegration.getMeasurementStats.useQuery({ 
    timeRange,
    machineId: selectedMachineId,
  });

  const exportInspectionMutation = trpc.machineIntegration.exportInspectionData.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.data], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export thành công!');
      setShowExportDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const exportMeasurementMutation = trpc.machineIntegration.exportMeasurementData.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.data], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export thành công!');
      setShowExportDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleExport = () => {
    const params = {
      machineId: selectedMachineId,
      format: exportFormat,
    };
    if (exportType === 'inspection') {
      exportInspectionMutation.mutate(params);
    } else {
      exportMeasurementMutation.mutate(params);
    }
  };

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
        <div className="ml-auto flex items-center gap-2">
          {/* Machine Filter */}
          <Select 
            value={selectedMachineId?.toString() || 'all'} 
            onValueChange={(v) => setSelectedMachineId(v === 'all' ? undefined : Number(v))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tất cả máy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả máy</SelectItem>
              {machines?.map((machine) => (
                <SelectItem key={machine.id} value={machine.id.toString()}>
                  {machine.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Time Range */}
          <Select value={timeRange} onValueChange={(v: '1h' | '4h' | '8h' | '24h') => setTimeRange(v)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 giờ</SelectItem>
              <SelectItem value="4h">4 giờ</SelectItem>
              <SelectItem value="8h">8 giờ</SelectItem>
              <SelectItem value="24h">24 giờ</SelectItem>
            </SelectContent>
          </Select>
          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportDialog(true)}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Dữ liệu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Loại dữ liệu</Label>
              <Select value={exportType} onValueChange={(v: 'inspection' | 'measurement') => setExportType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspection">Inspection Data</SelectItem>
                  <SelectItem value="measurement">Measurement Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Định dạng</Label>
              <Select value={exportFormat} onValueChange={(v: 'csv' | 'json') => setExportFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Máy</Label>
              <Select 
                value={selectedMachineId?.toString() || 'all'} 
                onValueChange={(v) => setSelectedMachineId(v === 'all' ? undefined : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả máy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả máy</SelectItem>
                  {machines?.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id.toString()}>
                      {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Hủy</Button>
            <Button 
              onClick={handleExport}
              disabled={exportInspectionMutation.isPending || exportMeasurementMutation.isPending}
            >
              {(exportInspectionMutation.isPending || exportMeasurementMutation.isPending) ? 'Đang export...' : 'Export'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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


// ==================== OEE Dashboard Tab ====================
function OeeDashboardTab() {
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [showPdfExport, setShowPdfExport] = useState(false);
  
  const { data: dashboard, isLoading, refetch } = trpc.machineIntegration.getOeeDashboard.useQuery({ days });
  const { data: reportData } = trpc.machineIntegration.generateOeeReportData.useQuery(
    { days },
    { enabled: showPdfExport }
  );
  
  const exportOeeMutation = trpc.machineIntegration.exportOeeData.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.data], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export thành công!');
    },
    onError: (err) => toast.error(err.message),
  });

  const generatePdf = async () => {
    if (!reportData) return;
    
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Báo cáo OEE</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
          th { background: #f3f4f6; font-weight: bold; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
          .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; }
          .summary-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
          .summary-label { color: #6b7280; font-size: 14px; }
          .good { color: #22c55e; }
          .warning { color: #f59e0b; }
          .bad { color: #ef4444; }
          .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Báo cáo OEE</h1>
        <p><strong>Thời gian:</strong> ${new Date(reportData.period.from).toLocaleDateString('vi-VN')} - ${new Date(reportData.period.to).toLocaleDateString('vi-VN')} (${reportData.period.days} ngày)</p>
        <p><strong>Ngày xuất báo cáo:</strong> ${new Date().toLocaleString('vi-VN')}</p>
        
        <h2>Tổng quan</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-value ${reportData.summary.avgOee >= 85 ? 'good' : reportData.summary.avgOee >= 70 ? 'warning' : 'bad'}">
              ${Number(reportData.summary.avgOee).toFixed(1)}%
            </div>
            <div class="summary-label">OEE Trung bình</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${Number(reportData.summary.avgAvailability).toFixed(1)}%</div>
            <div class="summary-label">Availability</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${Number(reportData.summary.avgPerformance).toFixed(1)}%</div>
            <div class="summary-label">Performance</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${Number(reportData.summary.avgQuality).toFixed(1)}%</div>
            <div class="summary-label">Quality</div>
          </div>
        </div>
        <p><strong>OEE thấp nhất:</strong> ${Number(reportData.summary.minOee).toFixed(1)}% | <strong>OEE cao nhất:</strong> ${Number(reportData.summary.maxOee).toFixed(1)}% | <strong>Tổng bản ghi:</strong> ${reportData.summary.totalRecords}</p>

        <h2>So sánh theo máy</h2>
        <table>
          <thead>
            <tr><th>Máy</th><th>OEE</th><th>Availability</th><th>Performance</th><th>Quality</th><th>Số bản ghi</th></tr>
          </thead>
          <tbody>
            ${reportData.machineComparison.map(m => `
              <tr>
                <td>${m.machineName}</td>
                <td class="${m.oee >= 85 ? 'good' : m.oee >= 70 ? 'warning' : 'bad'}">${m.oee.toFixed(1)}%</td>
                <td>${m.availability.toFixed(1)}%</td>
                <td>${m.performance.toFixed(1)}%</td>
                <td>${m.quality.toFixed(1)}%</td>
                <td>${m.records}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>So sánh theo ca</h2>
        <table>
          <thead>
            <tr><th>Ca</th><th>OEE</th><th>Availability</th><th>Performance</th><th>Quality</th><th>Số bản ghi</th></tr>
          </thead>
          <tbody>
            ${reportData.shiftComparison.map(s => `
              <tr>
                <td>${s.shift}</td>
                <td class="${s.oee >= 85 ? 'good' : s.oee >= 70 ? 'warning' : 'bad'}">${s.oee.toFixed(1)}%</td>
                <td>${s.availability.toFixed(1)}%</td>
                <td>${s.performance.toFixed(1)}%</td>
                <td>${s.quality.toFixed(1)}%</td>
                <td>${s.records}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Trend theo ngày</h2>
        <table>
          <thead>
            <tr><th>Ngày</th><th>OEE</th><th>Availability</th><th>Performance</th><th>Quality</th></tr>
          </thead>
          <tbody>
            ${reportData.dailyTrend.map(d => `
              <tr>
                <td>${d.date}</td>
                <td class="${d.oee >= 85 ? 'good' : d.oee >= 70 ? 'warning' : 'bad'}">${d.oee.toFixed(1)}%</td>
                <td>${d.availability.toFixed(1)}%</td>
                <td>${d.performance.toFixed(1)}%</td>
                <td>${d.quality.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Báo cáo được tạo tự động bởi Hệ thống CPK/SPC</p>
        </div>
      </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
    setShowPdfExport(false);
    toast.success('Báo cáo đã sẵn sàng để in/lưu PDF!');
  };

  const getOeeColor = (oee: number) => {
    if (oee >= 85) return 'text-green-500';
    if (oee >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getOeeBgColor = (oee: number) => {
    if (oee >= 85) return 'bg-green-500';
    if (oee >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">OEE Dashboard</h2>
          <p className="text-muted-foreground">Tổng quan hiệu suất thiết bị tổng thể</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days.toString()} onValueChange={(v) => setDays(Number(v) as 7 | 14 | 30)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="14">14 ngày</SelectItem>
              <SelectItem value="30">30 ngày</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => exportOeeMutation.mutate({ format: exportFormat })}
            disabled={exportOeeMutation.isPending}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button 
            variant="default" 
            onClick={() => {
              setShowPdfExport(true);
              setTimeout(() => generatePdf(), 500);
            }}
          >
            <FileText className="h-4 w-4 mr-1" />
            Xuất PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Đang tải...</div>
      ) : !dashboard ? (
        <div className="text-center py-12 text-muted-foreground">Không có dữ liệu OEE</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className={`text-3xl font-bold ${getOeeColor(dashboard.summary.avgOee)}`}>
                  {dashboard.summary.avgOee}%
                </div>
                <p className="text-sm text-muted-foreground">OEE Trung bình</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-3xl font-bold text-blue-500">{dashboard.summary.avgAvailability}%</div>
                <p className="text-sm text-muted-foreground">Availability</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-3xl font-bold text-purple-500">{dashboard.summary.avgPerformance}%</div>
                <p className="text-sm text-muted-foreground">Performance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-3xl font-bold text-cyan-500">{dashboard.summary.avgQuality}%</div>
                <p className="text-sm text-muted-foreground">Quality</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-3xl font-bold text-orange-500">{dashboard.summary.totalDowntime}</div>
                <p className="text-sm text-muted-foreground">Downtime (phút)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-3xl font-bold">{dashboard.summary.machineCount}</div>
                <p className="text-sm text-muted-foreground">Số máy</p>
              </CardContent>
            </Card>
          </div>

          {/* Best/Worst Machine */}
          {(dashboard.summary.bestMachine || dashboard.summary.worstMachine) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboard.summary.bestMachine && (
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Máy tốt nhất</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-lg font-bold">{dashboard.summary.bestMachine.name}</span>
                      <span className="ml-2 text-green-600 font-semibold">{dashboard.summary.bestMachine.oee}% OEE</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {dashboard.summary.worstMachine && (
                <Card className="border-red-200 bg-red-50/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="font-medium">Máy cần cải thiện</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-lg font-bold">{dashboard.summary.worstMachine.name}</span>
                      <span className="ml-2 text-red-600 font-semibold">{dashboard.summary.worstMachine.oee}% OEE</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* OEE Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>OEE Trend ({days} ngày)</CardTitle>
              <CardDescription>Biểu đồ OEE và các thành phần theo ngày</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.dailyTrend.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Không có dữ liệu trend</div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={dashboard.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value}%`, name]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="oee" stroke="#22c55e" strokeWidth={3} name="OEE" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="availability" stroke="#3b82f6" strokeWidth={2} name="Availability" dot={false} />
                    <Line type="monotone" dataKey="performance" stroke="#a855f7" strokeWidth={2} name="Performance" dot={false} />
                    <Line type="monotone" dataKey="quality" stroke="#06b6d4" strokeWidth={2} name="Quality" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* OEE by Machine */}
          <Card>
            <CardHeader>
              <CardTitle>So sánh OEE giữa các máy</CardTitle>
              <CardDescription>Hiệu suất từng máy trong {days} ngày qua</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.byMachine.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Không có dữ liệu máy</div>
              ) : (
                <div className="space-y-4">
                  {/* Bar Chart */}
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboard.byMachine} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="machineName" width={150} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => [`${value}%`]} />
                      <Legend />
                      <Bar dataKey="avgOee" fill="#22c55e" name="OEE" />
                      <Bar dataKey="avgAvailability" fill="#3b82f6" name="Availability" />
                      <Bar dataKey="avgPerformance" fill="#a855f7" name="Performance" />
                      <Bar dataKey="avgQuality" fill="#06b6d4" name="Quality" />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Máy</TableHead>
                        <TableHead className="text-center">OEE</TableHead>
                        <TableHead className="text-center">Availability</TableHead>
                        <TableHead className="text-center">Performance</TableHead>
                        <TableHead className="text-center">Quality</TableHead>
                        <TableHead className="text-center">Downtime</TableHead>
                        <TableHead className="text-center">Good/Reject</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboard.byMachine.map((machine) => (
                        <TableRow key={machine.machineId}>
                          <TableCell className="font-medium">{machine.machineName}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={getOeeBgColor(machine.avgOee)}>
                              {machine.avgOee}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{machine.avgAvailability}%</TableCell>
                          <TableCell className="text-center">{machine.avgPerformance}%</TableCell>
                          <TableCell className="text-center">{machine.avgQuality}%</TableCell>
                          <TableCell className="text-center">{machine.totalDowntime} phút</TableCell>
                          <TableCell className="text-center">
                            <span className="text-green-600">{machine.totalGood}</span>
                            {' / '}
                            <span className="text-red-600">{machine.totalReject}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


// ==================== OEE Alerts Tab ====================
function OeeAlertsTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const [newAlert, setNewAlert] = useState({
    name: '',
    machineId: undefined as number | undefined,
    oeeThreshold: 85,
    consecutiveDays: 3,
    recipients: [] as string[],
    recipientInput: '',
  });

  const { data: machines } = trpc.machineIntegration.listMachines.useQuery();
  const { data: alerts, refetch } = trpc.machineIntegration.listOeeAlertConfigs.useQuery();
  const { data: alertHistory } = trpc.machineIntegration.getOeeAlertHistory.useQuery({ limit: 20 });

  const createMutation = trpc.machineIntegration.createOeeAlertConfig.useMutation({
    onSuccess: () => {
      toast.success('Tạo cảnh báo thành công!');
      setShowCreateDialog(false);
      setNewAlert({ name: '', machineId: undefined, oeeThreshold: 85, consecutiveDays: 3, recipients: [], recipientInput: '' });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.machineIntegration.updateOeeAlertConfig.useMutation({
    onSuccess: () => {
      toast.success('Cập nhật thành công!');
      setEditingAlert(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.machineIntegration.deleteOeeAlertConfig.useMutation({
    onSuccess: () => {
      toast.success('Xóa thành công!');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const testEmailMutation = trpc.machineIntegration.testSendOeeAlert.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Gửi email test thành công!');
      } else {
        toast.error(`Gửi email thất bại: ${data.message}`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const [testEmailDialog, setTestEmailDialog] = useState<{ alertId: number; alertName: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');

  const handleAddRecipient = () => {
    if (newAlert.recipientInput && newAlert.recipientInput.includes('@')) {
      setNewAlert({
        ...newAlert,
        recipients: [...newAlert.recipients, newAlert.recipientInput],
        recipientInput: '',
      });
    }
  };

  const handleCreate = () => {
    if (!newAlert.name || newAlert.recipients.length === 0) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    createMutation.mutate({
      name: newAlert.name,
      machineId: newAlert.machineId,
      oeeThreshold: newAlert.oeeThreshold,
      consecutiveDays: newAlert.consecutiveDays,
      recipients: newAlert.recipients,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Cảnh báo OEE</h2>
          <p className="text-muted-foreground">Tự động gửi email khi OEE dưới ngưỡng nhiều ngày liên tiếp</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Tạo cảnh báo
        </Button>
      </div>

      {/* Alert Configs List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách cảnh báo</CardTitle>
        </CardHeader>
        <CardContent>
          {!alerts || alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có cảnh báo nào. Nhấn "Tạo cảnh báo" để bắt đầu.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Máy</TableHead>
                  <TableHead>Ngưỡng OEE</TableHead>
                  <TableHead>Số ngày</TableHead>
                  <TableHead>Người nhận</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.name}</TableCell>
                    <TableCell>{alert.machineName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">&lt; {alert.oeeThreshold}%</Badge>
                    </TableCell>
                    <TableCell>{alert.consecutiveDays} ngày</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(alert.recipients as string[]).slice(0, 2).map((r, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
                        ))}
                        {(alert.recipients as string[]).length > 2 && (
                          <Badge variant="secondary" className="text-xs">+{(alert.recipients as string[]).length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={alert.isActive ? "default" : "secondary"}>
                        {alert.isActive ? "Hoạt động" : "Tắt"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!alert.isActive}
                          onCheckedChange={(checked) => updateMutation.mutate({ id: alert.id, isActive: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Test gửi email"
                          onClick={() => setTestEmailDialog({ alertId: alert.id, alertName: alert.name })}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate({ id: alert.id })}
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

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử cảnh báo</CardTitle>
        </CardHeader>
        <CardContent>
          {!alertHistory || alertHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có cảnh báo nào được gửi
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Máy</TableHead>
                  <TableHead>OEE</TableHead>
                  <TableHead>Số ngày dưới ngưỡng</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertHistory.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{new Date(h.createdAt).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>{h.machineName || `Machine ${h.machineId}`}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{h.oeeValue}%</Badge>
                    </TableCell>
                    <TableCell>{h.consecutiveDaysBelow} ngày</TableCell>
                    <TableCell>
                      <Badge variant={h.emailSent ? "default" : "secondary"}>
                        {h.emailSent ? "Đã gửi" : "Chưa gửi"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo cảnh báo OEE mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên cảnh báo</Label>
              <Input
                value={newAlert.name}
                onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                placeholder="VD: Cảnh báo OEE thấp - Line 1"
              />
            </div>
            <div>
              <Label>Máy (để trống = tất cả máy)</Label>
              <Select
                value={newAlert.machineId?.toString() || 'all'}
                onValueChange={(v) => setNewAlert({ ...newAlert, machineId: v === 'all' ? undefined : Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn máy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả máy</SelectItem>
                  {machines?.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ngưỡng OEE (%)</Label>
                <Input
                  type="number"
                  value={newAlert.oeeThreshold}
                  onChange={(e) => setNewAlert({ ...newAlert, oeeThreshold: Number(e.target.value) })}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label>Số ngày liên tiếp</Label>
                <Input
                  type="number"
                  value={newAlert.consecutiveDays}
                  onChange={(e) => setNewAlert({ ...newAlert, consecutiveDays: Number(e.target.value) })}
                  min={1}
                  max={30}
                />
              </div>
            </div>
            <div>
              <Label>Email người nhận</Label>
              <div className="flex gap-2">
                <Input
                  value={newAlert.recipientInput}
                  onChange={(e) => setNewAlert({ ...newAlert, recipientInput: e.target.value })}
                  placeholder="email@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
                />
                <Button type="button" onClick={handleAddRecipient}>Thêm</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {newAlert.recipients.map((r, i) => (
                  <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setNewAlert({
                    ...newAlert,
                    recipients: newAlert.recipients.filter((_, idx) => idx !== i)
                  })}>
                    {r} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo cảnh báo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={!!testEmailDialog} onOpenChange={() => setTestEmailDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test gửi email cảnh báo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Gửi email test cho cảnh báo: <strong>{testEmailDialog?.alertName}</strong>
            </p>
            <div>
              <Label>Email nhận test</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your-email@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailDialog(null)}>Hủy</Button>
            <Button
              onClick={() => {
                if (testEmailDialog && testEmail) {
                  testEmailMutation.mutate({ alertConfigId: testEmailDialog.alertId, testEmail });
                  setTestEmailDialog(null);
                  setTestEmail('');
                }
              }}
              disabled={!testEmail || testEmailMutation.isPending}
            >
              {testEmailMutation.isPending ? 'Gửi...' : 'Gửi test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== OEE Reports Tab ====================
function OeeReportsTab() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    frequency: 'weekly' as 'weekly' | 'monthly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    hour: 8,
    machineIds: [] as number[],
    recipients: [] as string[],
    recipientInput: '',
    includeCharts: true,
    includeTrend: true,
    includeComparison: true,
  });

  const { data: machines } = trpc.machineIntegration.listMachines.useQuery();
  const { data: schedules, refetch } = trpc.machineIntegration.listOeeReportSchedules.useQuery();
  const { data: reportHistory } = trpc.machineIntegration.getOeeReportHistory.useQuery({ limit: 20 });

  const createMutation = trpc.machineIntegration.createOeeReportSchedule.useMutation({
    onSuccess: () => {
      toast.success('Tạo lịch báo cáo thành công!');
      setShowCreateDialog(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.machineIntegration.updateOeeReportSchedule.useMutation({
    onSuccess: () => {
      toast.success('Cập nhật thành công!');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.machineIntegration.deleteOeeReportSchedule.useMutation({
    onSuccess: () => {
      toast.success('Xóa thành công!');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const testEmailMutation = trpc.machineIntegration.testSendOeeReport.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Gửi email test thành công!');
      } else {
        toast.error(`Gửi email thất bại: ${data.message}`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const [testEmailDialog, setTestEmailDialog] = useState<{ scheduleId: number; scheduleName: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');

  const handleAddRecipient = () => {
    if (newSchedule.recipientInput && newSchedule.recipientInput.includes('@')) {
      setNewSchedule({
        ...newSchedule,
        recipients: [...newSchedule.recipients, newSchedule.recipientInput],
        recipientInput: '',
      });
    }
  };

  const handleCreate = () => {
    if (!newSchedule.name || newSchedule.recipients.length === 0) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    createMutation.mutate({
      name: newSchedule.name,
      frequency: newSchedule.frequency,
      dayOfWeek: newSchedule.frequency === 'weekly' ? newSchedule.dayOfWeek : undefined,
      dayOfMonth: newSchedule.frequency === 'monthly' ? newSchedule.dayOfMonth : undefined,
      hour: newSchedule.hour,
      machineIds: newSchedule.machineIds.length > 0 ? newSchedule.machineIds : undefined,
      recipients: newSchedule.recipients,
      includeCharts: newSchedule.includeCharts,
      includeTrend: newSchedule.includeTrend,
      includeComparison: newSchedule.includeComparison,
    });
  };

  const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Báo cáo OEE định kỳ</h2>
          <p className="text-muted-foreground">Tự động gửi báo cáo OEE hàng tuần hoặc hàng tháng</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Tạo lịch báo cáo
        </Button>
      </div>

      {/* Schedules List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách lịch báo cáo</CardTitle>
        </CardHeader>
        <CardContent>
          {!schedules || schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có lịch báo cáo nào. Nhấn "Tạo lịch báo cáo" để bắt đầu.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Tần suất</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Người nhận</TableHead>
                  <TableHead>Lần gửi tiếp</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {schedule.frequency === 'weekly' ? 'Hàng tuần' : 'Hàng tháng'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {schedule.frequency === 'weekly'
                        ? `${dayNames[schedule.dayOfWeek || 0]}, ${schedule.hour}:00`
                        : `Ngày ${schedule.dayOfMonth}, ${schedule.hour}:00`}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(schedule.recipients as string[]).slice(0, 2).map((r, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
                        ))}
                        {(schedule.recipients as string[]).length > 2 && (
                          <Badge variant="secondary" className="text-xs">+{(schedule.recipients as string[]).length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {schedule.nextScheduledAt
                        ? new Date(schedule.nextScheduledAt).toLocaleString('vi-VN')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={schedule.isActive ? "default" : "secondary"}>
                        {schedule.isActive ? "Hoạt động" : "Tắt"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!schedule.isActive}
                          onCheckedChange={(checked) => updateMutation.mutate({ id: schedule.id, isActive: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Test gửi email"
                          onClick={() => setTestEmailDialog({ scheduleId: schedule.id, scheduleName: schedule.name })}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate({ id: schedule.id })}
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

      {/* Report History */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử báo cáo</CardTitle>
        </CardHeader>
        <CardContent>
          {!reportHistory || reportHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có báo cáo nào được gửi
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian gửi</TableHead>
                  <TableHead>Kỳ báo cáo</TableHead>
                  <TableHead>Người nhận</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportHistory.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{new Date(h.createdAt).toLocaleString('vi-VN')}</TableCell>
                    <TableCell>
                      {new Date(h.reportPeriodStart).toLocaleDateString('vi-VN')} - {new Date(h.reportPeriodEnd).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>{(h.recipients as string[]).length} người</TableCell>
                    <TableCell>
                      <Badge variant={h.emailSent ? "default" : "secondary"}>
                        {h.emailSent ? "Đã gửi" : "Chưa gửi"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo lịch báo cáo OEE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tên báo cáo</Label>
              <Input
                value={newSchedule.name}
                onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                placeholder="VD: Báo cáo OEE tuần"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tần suất</Label>
                <Select
                  value={newSchedule.frequency}
                  onValueChange={(v: 'weekly' | 'monthly') => setNewSchedule({ ...newSchedule, frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Hàng tuần</SelectItem>
                    <SelectItem value="monthly">Hàng tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{newSchedule.frequency === 'weekly' ? 'Ngày trong tuần' : 'Ngày trong tháng'}</Label>
                {newSchedule.frequency === 'weekly' ? (
                  <Select
                    value={newSchedule.dayOfWeek.toString()}
                    onValueChange={(v) => setNewSchedule({ ...newSchedule, dayOfWeek: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayNames.map((name, i) => (
                        <SelectItem key={i} value={i.toString()}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="number"
                    value={newSchedule.dayOfMonth}
                    onChange={(e) => setNewSchedule({ ...newSchedule, dayOfMonth: Number(e.target.value) })}
                    min={1}
                    max={31}
                  />
                )}
              </div>
            </div>
            <div>
              <Label>Giờ gửi (0-23)</Label>
              <Input
                type="number"
                value={newSchedule.hour}
                onChange={(e) => setNewSchedule({ ...newSchedule, hour: Number(e.target.value) })}
                min={0}
                max={23}
              />
            </div>
            <div>
              <Label>Email người nhận</Label>
              <div className="flex gap-2">
                <Input
                  value={newSchedule.recipientInput}
                  onChange={(e) => setNewSchedule({ ...newSchedule, recipientInput: e.target.value })}
                  placeholder="email@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
                />
                <Button type="button" onClick={handleAddRecipient}>Thêm</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {newSchedule.recipients.map((r, i) => (
                  <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => setNewSchedule({
                    ...newSchedule,
                    recipients: newSchedule.recipients.filter((_, idx) => idx !== i)
                  })}>
                    {r} ×
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nội dung báo cáo</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <Switch
                    checked={newSchedule.includeCharts}
                    onCheckedChange={(v) => setNewSchedule({ ...newSchedule, includeCharts: v })}
                  />
                  <span className="text-sm">Biểu đồ</span>
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={newSchedule.includeTrend}
                    onCheckedChange={(v) => setNewSchedule({ ...newSchedule, includeTrend: v })}
                  />
                  <span className="text-sm">Trend</span>
                </label>
                <label className="flex items-center gap-2">
                  <Switch
                    checked={newSchedule.includeComparison}
                    onCheckedChange={(v) => setNewSchedule({ ...newSchedule, includeComparison: v })}
                  />
                  <span className="text-sm">So sánh</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo lịch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={!!testEmailDialog} onOpenChange={() => setTestEmailDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test gửi email báo cáo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Gửi email test cho báo cáo: <strong>{testEmailDialog?.scheduleName}</strong>
            </p>
            <div>
              <Label>Email nhận test</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your-email@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailDialog(null)}>Hủy</Button>
            <Button
              onClick={() => {
                if (testEmailDialog && testEmail) {
                  testEmailMutation.mutate({ scheduleId: testEmailDialog.scheduleId, testEmail });
                  setTestEmailDialog(null);
                  setTestEmail('');
                }
              }}
              disabled={!testEmail || testEmailMutation.isPending}
            >
              {testEmailMutation.isPending ? 'Gửi...' : 'Gửi test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Downtime Analysis Tab (Pareto) ====================
function DowntimeAnalysisTab() {
  const [days, setDays] = useState<7 | 14 | 30>(30);
  const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(undefined);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDowntime, setNewDowntime] = useState({
    machineId: 0,
    reasonCode: '',
    reasonCategory: '',
    reasonDescription: '',
    durationMinutes: 30,
    occurredAt: new Date().toISOString().slice(0, 16),
  });

  const { data: machines } = trpc.machineIntegration.listMachines.useQuery();
  const { data: analysis, refetch } = trpc.machineIntegration.getDowntimeAnalysis.useQuery({
    machineId: selectedMachineId,
    days,
  });
  const { data: reasonCodes } = trpc.machineIntegration.getDowntimeReasonCodes.useQuery();

  const addMutation = trpc.machineIntegration.addDowntimeReason.useMutation({
    onSuccess: () => {
      toast.success('Thêm downtime thành công!');
      setShowAddDialog(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

  const handleAdd = () => {
    if (!newDowntime.machineId || !newDowntime.reasonCode) {
      toast.error('Vui lòng chọn máy và mã lỗi');
      return;
    }
    const selectedReason = reasonCodes?.find(r => r.code === newDowntime.reasonCode);
    addMutation.mutate({
      machineId: newDowntime.machineId,
      reasonCode: newDowntime.reasonCode,
      reasonCategory: selectedReason?.category || newDowntime.reasonCategory,
      reasonDescription: selectedReason?.description || newDowntime.reasonDescription,
      durationMinutes: newDowntime.durationMinutes,
      occurredAt: newDowntime.occurredAt,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Phân tích Downtime (Pareto)</h2>
          <p className="text-muted-foreground">Xác định nguyên nhân downtime chính để cải thiện OEE</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedMachineId?.toString() || 'all'}
            onValueChange={(v) => setSelectedMachineId(v === 'all' ? undefined : Number(v))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tất cả máy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả máy</SelectItem>
              {machines?.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={days.toString()} onValueChange={(v) => setDays(Number(v) as 7 | 14 | 30)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="14">14 ngày</SelectItem>
              <SelectItem value="30">30 ngày</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Thêm Downtime
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-red-500">{analysis?.summary.totalDowntimeHours || 0}h</div>
            <p className="text-sm text-muted-foreground">Tổng Downtime</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{analysis?.summary.totalDowntimeMinutes || 0}</div>
            <p className="text-sm text-muted-foreground">Phút Downtime</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-blue-500">{analysis?.summary.uniqueReasons || 0}</div>
            <p className="text-sm text-muted-foreground">Nguyên nhân</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-purple-500">{analysis?.summary.uniqueCategories || 0}</div>
            <p className="text-sm text-muted-foreground">Danh mục</p>
          </CardContent>
        </Card>
      </div>

      {/* Pareto Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ Pareto - Nguyên nhân Downtime</CardTitle>
          <CardDescription>80% downtime thường đến từ 20% nguyên nhân</CardDescription>
        </CardHeader>
        <CardContent>
          {!analysis?.paretoData || analysis.paretoData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Chưa có dữ liệu downtime. Nhấn "Thêm Downtime" để bắt đầu.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={analysis.paretoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="reasonCode" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'cumulativePercentage') return [`${value}%`, 'Tích lũy'];
                    if (name === 'totalMinutes') return [`${value} phút`, 'Thời gian'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="totalMinutes" name="Thời gian (phút)">
                  {analysis.paretoData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativePercentage"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Tích lũy %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* By Category Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Downtime theo Danh mục</CardTitle>
          </CardHeader>
          <CardContent>
            {!analysis?.byCategory || analysis.byCategory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analysis.byCategory}
                    dataKey="totalMinutes"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {analysis.byCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} phút`]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Downtime theo Máy</CardTitle>
          </CardHeader>
          <CardContent>
            {!analysis?.byMachine || analysis.byMachine.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analysis.byMachine} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="machineName" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${value} phút`]} />
                  <Bar dataKey="totalMinutes" fill="#ef4444" name="Downtime (phút)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Downtime Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết nguyên nhân Downtime</CardTitle>
        </CardHeader>
        <CardContent>
          {!analysis?.paretoData || analysis.paretoData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã lỗi</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="text-right">Thời gian</TableHead>
                  <TableHead className="text-right">Số lần</TableHead>
                  <TableHead className="text-right">Tỷ lệ</TableHead>
                  <TableHead className="text-right">Tích lũy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.paretoData.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono">{row.reasonCode}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.reasonCategory}</Badge>
                    </TableCell>
                    <TableCell>{row.reasonDescription}</TableCell>
                    <TableCell className="text-right">{row.totalMinutes} phút</TableCell>
                    <TableCell className="text-right">{row.occurrenceCount}</TableCell>
                    <TableCell className="text-right">{row.percentage}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.cumulativePercentage <= 80 ? "destructive" : "secondary"}>
                        {row.cumulativePercentage}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Downtime Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Downtime</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Máy</Label>
              <Select
                value={newDowntime.machineId?.toString() || ''}
                onValueChange={(v) => setNewDowntime({ ...newDowntime, machineId: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn máy" />
                </SelectTrigger>
                <SelectContent>
                  {machines?.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mã lỗi</Label>
              <Select
                value={newDowntime.reasonCode}
                onValueChange={(v) => {
                  const reason = reasonCodes?.find(r => r.code === v);
                  setNewDowntime({
                    ...newDowntime,
                    reasonCode: v,
                    reasonCategory: reason?.category || '',
                    reasonDescription: reason?.description || '',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn mã lỗi" />
                </SelectTrigger>
                <SelectContent>
                  {reasonCodes?.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.code} - {r.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Thời gian (phút)</Label>
                <Input
                  type="number"
                  value={newDowntime.durationMinutes}
                  onChange={(e) => setNewDowntime({ ...newDowntime, durationMinutes: Number(e.target.value) })}
                  min={1}
                />
              </div>
              <div>
                <Label>Thời điểm xảy ra</Label>
                <Input
                  type="datetime-local"
                  value={newDowntime.occurredAt}
                  onChange={(e) => setNewDowntime({ ...newDowntime, occurredAt: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Hủy</Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Đang thêm...' : 'Thêm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


// OEE Hourly Trend Tab Component
function OeeHourlyTrendTab() {
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [days, setDays] = useState<number>(7);

  const { data: machines } = trpc.machineIntegration.listMachines.useQuery();
  const { data: hourlyData, isLoading } = trpc.machineIntegration.getOeeHourlyTrend.useQuery({
    machineId: selectedMachine !== "all" ? parseInt(selectedMachine) : undefined,
    days,
  });

  const getOeeColor = (oee: number) => {
    if (oee >= 85) return "#22c55e";
    if (oee >= 70) return "#f59e0b";
    return "#dc2626";
  };

  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  // Generate heatmap data for all hours and days
  const generateHeatmapGrid = () => {
    const grid: { dayOfWeek: number; hour: number; avgOee: number; recordCount: number }[][] = [];
    for (let day = 1; day <= 7; day++) {
      const dayData: { dayOfWeek: number; hour: number; avgOee: number; recordCount: number }[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const found = hourlyData?.heatmapData.find(h => h.dayOfWeek === day && h.hour === hour);
        dayData.push({
          dayOfWeek: day,
          hour,
          avgOee: found?.avgOee || 0,
          recordCount: found?.recordCount || 0,
        });
      }
      grid.push(dayData);
    }
    return grid;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            OEE Trend Theo Giờ Trong Ngày
          </CardTitle>
          <CardDescription>
            Phân tích pattern OEE theo giờ để phát hiện thời điểm có hiệu suất thấp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label>Máy</Label>
              <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn máy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả máy</SelectItem>
                  {machines?.map((m) => (
                    <SelectItem key={m.machineId} value={String(m.machineId)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[150px]">
              <Label>Khoảng thời gian</Label>
              <Select value={String(days)} onValueChange={(v) => setDays(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 ngày</SelectItem>
                  <SelectItem value="14">14 ngày</SelectItem>
                  <SelectItem value="30">30 ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !hourlyData || hourlyData.hourlyData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Không có dữ liệu OEE trong khoảng thời gian đã chọn
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ca Sáng (6:00-14:00)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{ color: getOeeColor(hourlyData.shiftAverages.morning) }}>
                  {hourlyData.shiftAverages.morning.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ca Chiều (14:00-22:00)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{ color: getOeeColor(hourlyData.shiftAverages.afternoon) }}>
                  {hourlyData.shiftAverages.afternoon.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ca Đêm (22:00-6:00)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{ color: getOeeColor(hourlyData.shiftAverages.night) }}>
                  {hourlyData.shiftAverages.night.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hourly Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>OEE Trung Bình Theo Giờ</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={hourlyData.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'OEE']}
                    labelFormatter={(h) => `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="avgOee" 
                    name="OEE" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgAvailability" 
                    name="Availability" 
                    stroke="#22c55e" 
                    fill="#22c55e" 
                    fillOpacity={0.2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgPerformance" 
                    name="Performance" 
                    stroke="#f59e0b" 
                    fill="#f59e0b" 
                    fillOpacity={0.2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgQuality" 
                    name="Quality" 
                    stroke="#8b5cf6" 
                    fill="#8b5cf6" 
                    fillOpacity={0.2}
                  />
                  {/* Reference line for target */}
                  <ReferenceLine y={85} stroke="#dc2626" strokeDasharray="5 5" label="Target 85%" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Heatmap OEE (Giờ x Ngày trong tuần)</CardTitle>
              <CardDescription>
                Màu đậm = OEE cao, màu nhạt = OEE thấp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="p-1 text-left">Ngày</th>
                      {Array.from({ length: 24 }, (_, i) => (
                        <th key={i} className="p-1 text-center w-8">
                          {String(i).padStart(2, '0')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {generateHeatmapGrid().map((dayRow, dayIndex) => (
                      <tr key={dayIndex}>
                        <td className="p-1 font-medium">{dayNames[dayIndex]}</td>
                        {dayRow.map((cell, hourIndex) => (
                          <td 
                            key={hourIndex} 
                            className="p-0.5"
                            title={`${dayNames[dayIndex]} ${String(cell.hour).padStart(2, '0')}:00 - OEE: ${cell.avgOee.toFixed(1)}% (${cell.recordCount} bản ghi)`}
                          >
                            <div 
                              className="w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-medium"
                              style={{
                                backgroundColor: cell.recordCount > 0 
                                  ? `rgba(${cell.avgOee >= 85 ? '34,197,94' : cell.avgOee >= 70 ? '245,158,11' : '220,38,38'}, ${Math.max(0.2, cell.avgOee / 100)})`
                                  : '#f1f5f9',
                                color: cell.recordCount > 0 && cell.avgOee > 50 ? 'white' : '#64748b',
                              }}
                            >
                              {cell.recordCount > 0 ? Math.round(cell.avgOee) : '-'}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Giờ OEE Thấp Nhất
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hourlyData.lowestHours.map((h, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <div className="font-medium">{h.timeRange}</div>
                        <div className="text-sm text-muted-foreground">Cần cải thiện</div>
                      </div>
                      <div className="text-2xl font-bold text-red-600">{h.avgOee.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Giờ OEE Cao Nhất
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hourlyData.highestHours.map((h, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium">{h.timeRange}</div>
                        <div className="text-sm text-muted-foreground">Hiệu suất tốt</div>
                      </div>
                      <div className="text-2xl font-bold text-green-600">{h.avgOee.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Khuyến nghị
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hourlyData.lowestHours.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="font-medium text-amber-800">
                      ⚠️ OEE thấp nhất vào lúc {hourlyData.lowestHours[0].timeRange} ({hourlyData.lowestHours[0].avgOee.toFixed(1)}%)
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      Kiểm tra các yếu tố: thay ca, nghỉ giải lao, thiếu nguyên liệu, hoặc vấn đề thiết bị trong khung giờ này.
                    </p>
                  </div>
                )}
                {hourlyData.shiftAverages.night < hourlyData.shiftAverages.morning && 
                 hourlyData.shiftAverages.night < hourlyData.shiftAverages.afternoon && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="font-medium text-blue-800">
                      🌙 Ca đêm có OEE thấp hơn các ca khác
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Xem xét tăng cường giám sát, đào tạo nhân viên ca đêm, hoặc điều chỉnh lịch bảo trì.
                    </p>
                  </div>
                )}
                {Math.max(...hourlyData.hourlyData.map(h => h.avgOee)) - 
                 Math.min(...hourlyData.hourlyData.map(h => h.avgOee)) > 20 && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="font-medium text-purple-800">
                      📊 Biến động OEE lớn giữa các giờ ({">"} 20%)
                    </p>
                    <p className="text-sm text-purple-700 mt-1">
                      Cần chuẩn hóa quy trình để giảm biến động, đảm bảo hiệu suất ổn định trong ngày.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


// Overview Tab Component
function OverviewTab() {
  const { data: overview, isLoading } = trpc.machineIntegration.getDashboardOverview.useQuery();

  const getOeeColor = (oee: number) => {
    if (oee >= 85) return "text-green-600";
    if (oee >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const getOeeBgColor = (oee: number) => {
    if (oee >= 85) return "bg-green-50";
    if (oee >= 70) return "bg-amber-50";
    return "bg-red-50";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!overview) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Không có dữ liệu
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" />
              Máy đã kết nối
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.totalMachines}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overview.activeApiKeys} API keys hoạt động
            </p>
          </CardContent>
        </Card>

        <Card className={getOeeBgColor(overview.oee.today)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              OEE Hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getOeeColor(overview.oee.today)}`}>
              {overview.oee.today.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tuần: {overview.oee.week.toFixed(1)}% | Tháng: {overview.oee.month.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className={overview.pendingAlerts > 0 ? "bg-red-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Cảnh báo chờ xử lý
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${overview.pendingAlerts > 0 ? "text-red-600" : ""}`}>
              {overview.pendingAlerts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cần kiểm tra và xử lý
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Báo cáo đã gửi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overview.reportsSentThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Trong tuần này
            </p>
          </CardContent>
        </Card>
      </div>

      {/* OEE Trend and Inspection Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">OEE Trend 7 ngày</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.oeeTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={overview.oeeTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'OEE']} />
                  <Area type="monotone" dataKey="avgOee" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <ReferenceLine y={85} stroke="#dc2626" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Chưa có dữ liệu OEE
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inspection Hôm nay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tổng kiểm tra</span>
                <span className="text-2xl font-bold">{overview.inspection.total}</span>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 p-3 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{overview.inspection.passed}</div>
                  <div className="text-xs text-muted-foreground">Đạt</div>
                </div>
                <div className="flex-1 p-3 bg-red-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{overview.inspection.failed}</div>
                  <div className="text-xs text-muted-foreground">Lỗi</div>
                </div>
                <div className="flex-1 p-3 bg-blue-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{overview.inspection.passRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Tỷ lệ đạt</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lowest OEE Machines and Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Máy có OEE thấp nhất hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.lowestOeeMachines.length > 0 ? (
              <div className="space-y-3">
                {overview.lowestOeeMachines.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium">{m.machineName}</div>
                      <div className="text-xs text-muted-foreground">{m.recordCount} bản ghi</div>
                    </div>
                    <div className={`text-xl font-bold ${getOeeColor(m.avgOee)}`}>
                      {m.avgOee.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có dữ liệu OEE hôm nay
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Sự kiện gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.recentEvents.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {overview.recentEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 p-2 border-b last:border-0">
                    <Badge variant={
                      e.severity === 'critical' ? 'destructive' :
                      e.severity === 'warning' ? 'secondary' : 'outline'
                    }>
                      {e.eventType}
                    </Badge>
                    <span className="flex-1 text-sm truncate">{e.machineName || 'System'}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.createdAt!).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có sự kiện nào
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Alerts */}
      <PendingAlertsCard />

      {/* Shift Comparison */}
      <ShiftComparisonCard />
    </div>
  );
}

// Pending Alerts Card Component
function PendingAlertsCard() {
  const { data: pendingAlerts, refetch } = trpc.machineIntegration.getPendingAlerts.useQuery();
  const [resolveDialog, setResolveDialog] = useState<{ id: number; machineName: string } | null>(null);
  const [resolution, setResolution] = useState('');

  const acknowledgeMutation = trpc.machineIntegration.acknowledgeAlert.useMutation({
    onSuccess: () => {
      toast.success('Đã xác nhận cảnh báo!');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const resolveMutation = trpc.machineIntegration.resolveAlert.useMutation({
    onSuccess: () => {
      toast.success('Đã xử lý cảnh báo!');
      setResolveDialog(null);
      setResolution('');
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!pendingAlerts || pendingAlerts.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Cảnh báo chưa xử lý ({pendingAlerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-red-800">
                    {alert.machineName || 'Tất cả máy'}: OEE {Number(alert.oeeValue).toFixed(1)}%
                  </div>
                  <div className="text-xs text-red-600">
                    Dưới ngưỡng {alert.consecutiveDaysBelow} ngày liên tiếp • {new Date(alert.createdAt).toLocaleString('vi-VN')}
                  </div>
                  {alert.acknowledged === 1 && (
                    <div className="text-xs text-amber-600 mt-1">
                      Đã xác nhận bởi {alert.acknowledgedBy} lúc {alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toLocaleString('vi-VN') : ''}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!alert.acknowledged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acknowledgeMutation.mutate({ id: alert.id })}
                      disabled={acknowledgeMutation.isPending}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Xác nhận
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setResolveDialog({ id: alert.id, machineName: alert.machineName || 'Tất cả máy' })}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Xử lý
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý cảnh báo OEE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Máy: <strong>{resolveDialog?.machineName}</strong>
            </p>
            <div>
              <Label>Ghi chú xử lý *</Label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Mô tả cách xử lý vấn đề OEE thấp..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>Hủy</Button>
            <Button
              onClick={() => {
                if (resolveDialog && resolution.trim()) {
                  resolveMutation.mutate({ id: resolveDialog.id, resolution });
                }
              }}
              disabled={!resolution.trim() || resolveMutation.isPending}
            >
              {resolveMutation.isPending ? 'Xử lý...' : 'Xác nhận xử lý'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Shift Comparison Card Component
function ShiftComparisonCard() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const { data: shiftData, isLoading } = trpc.machineIntegration.getOeeByShift.useQuery({ period });

  const getOeeColor = (oee: number) => {
    if (oee >= 85) return "#22c55e";
    if (oee >= 70) return "#f59e0b";
    return "#dc2626";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!shiftData || shiftData.shifts.every(s => s.recordCount === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">So sánh OEE theo ca</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chưa có dữ liệu OEE theo ca
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">So sánh OEE theo ca</CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as 'week' | 'month')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">7 ngày</SelectItem>
              <SelectItem value="month">30 ngày</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={shiftData.shifts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="shiftName" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`]} />
                <Bar dataKey="avgOee" name="OEE">
                  {shiftData.shifts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getOeeColor(entry.avgOee)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Table */}
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ca</TableHead>
                  <TableHead className="text-center">OEE</TableHead>
                  <TableHead className="text-center">A</TableHead>
                  <TableHead className="text-center">P</TableHead>
                  <TableHead className="text-center">Q</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftData.shifts.map((s) => (
                  <TableRow key={s.shift}>
                    <TableCell className="font-medium">{s.shiftName.split(' ')[0]} {s.shiftName.split(' ')[1]}</TableCell>
                    <TableCell className="text-center font-bold" style={{ color: getOeeColor(s.avgOee) }}>
                      {s.avgOee.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">{s.avgAvailability.toFixed(1)}%</TableCell>
                    <TableCell className="text-center">{s.avgPerformance.toFixed(1)}%</TableCell>
                    <TableCell className="text-center">{s.avgQuality.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {shiftData.bestShift && shiftData.worstShift && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Ca tốt nhất</div>
                  <div className="font-medium text-green-600">{shiftData.bestShift.shiftName.split(' ')[0]} {shiftData.bestShift.shiftName.split(' ')[1]}</div>
                  <div className="text-lg font-bold text-green-600">{shiftData.bestShift.avgOee.toFixed(1)}%</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Ca cần cải thiện</div>
                  <div className="font-medium text-red-600">{shiftData.worstShift.shiftName.split(' ')[0]} {shiftData.worstShift.shiftName.split(' ')[1]}</div>
                  <div className="text-lg font-bold text-red-600">{shiftData.worstShift.avgOee.toFixed(1)}%</div>
                </div>
              </div>
            )}

            {shiftData.oeeGap > 10 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ Chênh lệch OEE giữa các ca: {shiftData.oeeGap.toFixed(1)}%</strong>
                  <br />
                  <span className="text-xs">Cần xem xét chuẩn hóa quy trình giữa các ca để giảm biến động.</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Trend Chart */}
        {shiftData.trend.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Xu hướng OEE theo ca</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={shiftData.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`]} />
                <Legend />
                <Line type="monotone" dataKey="morning" name="Ca Sáng" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="afternoon" name="Ca Chiều" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="night" name="Ca Đêm" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
