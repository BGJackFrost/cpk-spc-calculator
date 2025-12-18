import { useState } from "react";
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
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="statistics">Thống kê</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="documentation">Tài liệu API</TabsTrigger>
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
