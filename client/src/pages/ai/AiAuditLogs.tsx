import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ScrollText, Download, RefreshCw, Search, Filter, Eye, Brain, Settings, Database, Cpu, AlertTriangle, CheckCircle, Info } from "lucide-react";

// Mock audit logs data
const mockAuditLogs = {
  logs: [
    { id: 1, timestamp: "25/12/2024 10:31:45", action: "model_prediction", user: "system", model: "CPK Predictor v2.1", details: "Batch prediction: 150 samples", status: "success", duration: "45ms" },
    { id: 2, timestamp: "25/12/2024 10:30:00", action: "auto_retrain", user: "system", model: "Anomaly Detector", details: "Auto retrain triggered due to accuracy drop", status: "success", duration: "15min" },
    { id: 3, timestamp: "25/12/2024 10:28:30", action: "threshold_update", user: "admin@example.com", model: "-", details: "CPK Warning threshold changed: 1.0 → 1.05", status: "success", duration: "120ms" },
    { id: 4, timestamp: "25/12/2024 10:25:00", action: "data_drift_check", user: "system", model: "OEE Forecaster", details: "Drift score: 0.12 (below threshold)", status: "success", duration: "2.3s" },
    { id: 5, timestamp: "25/12/2024 10:20:15", action: "model_deployment", user: "admin@example.com", model: "CPK Predictor v2.1", details: "Deployed to production", status: "success", duration: "5.2s" },
    { id: 6, timestamp: "25/12/2024 10:15:00", action: "training_job", user: "system", model: "Defect Classifier", details: "Training completed: accuracy 91.2%", status: "success", duration: "45min" },
    { id: 7, timestamp: "25/12/2024 10:10:30", action: "config_change", user: "admin@example.com", model: "-", details: "Auto retrain enabled for all models", status: "success", duration: "85ms" },
    { id: 8, timestamp: "25/12/2024 10:05:00", action: "model_prediction", user: "system", model: "Quality Predictor", details: "Prediction failed: timeout", status: "error", duration: "30s" },
    { id: 9, timestamp: "25/12/2024 10:00:00", action: "ab_test_update", user: "system", model: "CPK Predictor", details: "Traffic split updated: v2.0 (20%) → v2.1 (80%)", status: "success", duration: "150ms" },
    { id: 10, timestamp: "25/12/2024 09:55:00", action: "alert_triggered", user: "system", model: "Anomaly Detector", details: "Anomaly detected in Line 2 data", status: "warning", duration: "-" },
  ],
  summary: {
    total: 1250,
    today: 156,
    errors: 8,
    warnings: 23,
  },
  actionTypes: [
    { value: "model_prediction", label: "Model Prediction" },
    { value: "auto_retrain", label: "Auto Retrain" },
    { value: "threshold_update", label: "Threshold Update" },
    { value: "data_drift_check", label: "Data Drift Check" },
    { value: "model_deployment", label: "Model Deployment" },
    { value: "training_job", label: "Training Job" },
    { value: "config_change", label: "Config Change" },
    { value: "ab_test_update", label: "A/B Test Update" },
    { value: "alert_triggered", label: "Alert Triggered" },
  ],
};

export default function AiAuditLogs() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("today");

  const handleExport = () => {
    toast({ title: "Đang xuất", description: "Đang xuất audit logs..." });
  };

  const handleRefresh = () => {
    toast({ title: "Đã làm mới", description: "Audit logs đã được cập nhật" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success": return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case "error": return <Badge className="bg-red-500"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
      case "warning": return <Badge className="bg-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "model_prediction": return <Brain className="w-4 h-4 text-blue-500" />;
      case "auto_retrain": return <Cpu className="w-4 h-4 text-purple-500" />;
      case "threshold_update": return <Settings className="w-4 h-4 text-orange-500" />;
      case "data_drift_check": return <Database className="w-4 h-4 text-cyan-500" />;
      case "model_deployment": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "training_job": return <Cpu className="w-4 h-4 text-indigo-500" />;
      case "config_change": return <Settings className="w-4 h-4 text-gray-500" />;
      case "ab_test_update": return <Brain className="w-4 h-4 text-pink-500" />;
      case "alert_triggered": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    const found = mockAuditLogs.actionTypes.find(a => a.value === action);
    return found ? found.label : action;
  };

  const filteredLogs = mockAuditLogs.logs.filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    if (searchQuery && !log.details.toLowerCase().includes(searchQuery.toLowerCase()) && !log.model.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ScrollText className="w-8 h-8 text-slate-500" />
              AI Audit Logs
            </h1>
            <p className="text-muted-foreground mt-1">Nhật ký hoạt động hệ thống AI</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />Làm mới
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />Xuất logs
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tổng logs</p>
              <p className="text-3xl font-bold">{mockAuditLogs.summary.total.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Hôm nay</p>
              <p className="text-3xl font-bold">{mockAuditLogs.summary.today}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="pt-4">
              <p className="text-sm text-red-700">Errors</p>
              <p className="text-3xl font-bold text-red-800">{mockAuditLogs.summary.errors}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="pt-4">
              <p className="text-sm text-yellow-700">Warnings</p>
              <p className="text-3xl font-bold text-yellow-800">{mockAuditLogs.summary.warnings}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm kiếm trong logs..." className="pl-10" />
                </div>
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Loại hành động" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả hành động</SelectItem>
                  {mockAuditLogs.actionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Thời gian" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hôm nay</SelectItem>
                  <SelectItem value="yesterday">Hôm qua</SelectItem>
                  <SelectItem value="7days">7 ngày</SelectItem>
                  <SelectItem value="30days">30 ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>Hiển thị {filteredLogs.length} logs</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Thời gian</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Chi tiết</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span>{getActionLabel(log.action)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.model !== "-" ? (
                        <Badge variant="outline">{log.model}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{log.details}</TableCell>
                    <TableCell className="text-sm">{log.user}</TableCell>
                    <TableCell className="text-sm">{log.duration}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
