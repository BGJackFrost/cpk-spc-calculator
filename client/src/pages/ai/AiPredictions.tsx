import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Brain, RefreshCw, Download, Search, Eye, TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle, Clock, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Mock predictions data
// Mock data removed - mockPredictionsData (data comes from tRPC or is not yet implemented)

export default function AiPredictions() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [modelFilter, setModelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleExport = () => {
    toast({ title: "Đang xuất", description: "Đang xuất danh sách predictions..." });
  };

  const handleRefresh = () => {
    toast({ title: "Đã làm mới", description: "Danh sách predictions đã được cập nhật" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified": return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Đã xác minh</Badge>;
      case "pending": return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Chờ xác minh</Badge>;
      case "incorrect": return <Badge className="bg-red-500"><AlertTriangle className="w-3 h-3 mr-1" />Sai</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAccuracyIndicator = (predicted: number | string, actual: number | string | null) => {
    if (actual === null) return <Minus className="w-4 h-4 text-gray-400" />;
    if (typeof predicted === "string") {
      return predicted === actual ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    const diff = Math.abs((predicted as number) - (actual as number));
    const pct = diff / (actual as number) * 100;
    if (pct <= 2) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (pct <= 5) return <TrendingUp className="w-4 h-4 text-yellow-500" />;
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  const filteredPredictions = mockPredictionsData.predictions.filter((pred) => {
    if (modelFilter !== "all" && pred.model !== modelFilter) return false;
    if (statusFilter !== "all" && pred.status !== statusFilter) return false;
    if (searchQuery && !pred.input.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-500" />
              AI Predictions
            </h1>
            <p className="text-muted-foreground mt-1">Danh sách và theo dõi các dự đoán AI</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />Làm mới
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />Xuất dữ liệu
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tổng predictions</p>
              <p className="text-3xl font-bold">{mockPredictionsData.summary.total.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Hôm nay</p>
              <p className="text-3xl font-bold">{mockPredictionsData.summary.today}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-4">
              <p className="text-sm text-green-700">Accuracy</p>
              <p className="text-3xl font-bold text-green-800">{(mockPredictionsData.summary.accuracy * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Latency TB</p>
              <p className="text-3xl font-bold">{mockPredictionsData.summary.avgLatency}ms</p>
            </CardContent>
          </Card>
        </div>

        {/* Accuracy Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Xu hướng Accuracy</CardTitle>
            <CardDescription>Accuracy và số lượng predictions theo ngày</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockPredictionsData.accuracyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" domain={[90, 100]} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="accuracy" stroke="#22c55e" name="Accuracy (%)" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="predictions" stroke="#3b82f6" name="Predictions" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Model Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {mockPredictionsData.modelStats.map((stat, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{stat.model}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Predictions</span>
                    <span className="font-medium">{stat.predictions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Accuracy</span>
                    <span className="font-medium text-green-600">{(stat.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Latency</span>
                    <span className="font-medium">{stat.avgLatency}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm kiếm theo input..." className="pl-10" />
                </div>
              </div>
              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Model" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả models</SelectItem>
                  <SelectItem value="CPK Predictor v2.1">CPK Predictor v2.1</SelectItem>
                  <SelectItem value="OEE Forecaster v3.0">OEE Forecaster v3.0</SelectItem>
                  <SelectItem value="Defect Classifier">Defect Classifier</SelectItem>
                  <SelectItem value="Anomaly Detector">Anomaly Detector</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="verified">Đã xác minh</SelectItem>
                  <SelectItem value="pending">Chờ xác minh</SelectItem>
                  <SelectItem value="incorrect">Sai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Predictions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Predictions</CardTitle>
            <CardDescription>Hiển thị {filteredPredictions.length} predictions gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Input</TableHead>
                  <TableHead className="text-center">Predicted</TableHead>
                  <TableHead className="text-center">Actual</TableHead>
                  <TableHead className="text-center">Confidence</TableHead>
                  <TableHead className="text-center">Latency</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPredictions.map((pred) => (
                  <TableRow key={pred.id}>
                    <TableCell className="font-mono text-sm">{pred.timestamp}</TableCell>
                    <TableCell><Badge variant="outline">{pred.model}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{pred.input}</TableCell>
                    <TableCell className="text-center font-medium">{pred.predicted}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {pred.actual !== null ? pred.actual : "-"}
                        {getAccuracyIndicator(pred.predicted, pred.actual)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{(pred.confidence * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-center">{pred.latency}ms</TableCell>
                    <TableCell>{getStatusBadge(pred.status)}</TableCell>
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
