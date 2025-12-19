import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { 
  BarChart3, TrendingUp, TrendingDown, Award, Target, AlertTriangle,
  RefreshCw, Download, Gauge, Activity, Zap, CheckCircle, Settings, Info,
  FileSpreadsheet, FileText, Mail, GitCompare, Save
} from "lucide-react";
import { toast } from "sonner";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, LineChart, Line, Area, AreaChart
} from "recharts";

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function OEEComparisonDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [comparisonType, setComparisonType] = useState<"machines" | "lines">("machines");
  
  // Prediction settings state
  const [predictionSettingsOpen, setPredictionSettingsOpen] = useState(false);
  const [predictionDays, setPredictionDays] = useState(14);
  const [algorithm, setAlgorithm] = useState<"linear" | "moving_avg" | "exp_smoothing">("linear");
  const [confidenceLevel, setConfidenceLevel] = useState(95);
  const [alertThreshold, setAlertThreshold] = useState(65);
  const [movingAvgWindow, setMovingAvgWindow] = useState(7);
  const [smoothingFactor, setSmoothingFactor] = useState(0.3);
  
  // State for save config dialog
  const [saveConfigOpen, setSaveConfigOpen] = useState(false);
  const [configName, setConfigName] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(false);

  // Queries
  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: savedConfigs, refetch: refetchConfigs } = trpc.oee.listPredictionConfigs.useQuery({ configType: "oee" });
  const { data: defaultConfig } = trpc.oee.getDefaultConfig.useQuery({ configType: "oee" });
  const { data: oeeComparison, isLoading } = trpc.oee.getComparison.useQuery({
    type: comparisonType,
    days: Number(selectedPeriod),
  });
  const { data: oeePrediction, refetch: refetchPrediction } = trpc.oee.getPrediction.useQuery({
    days: Number(selectedPeriod),
    predictionDays,
    algorithm,
    confidenceLevel,
    alertThreshold,
    movingAvgWindow: algorithm === "moving_avg" ? movingAvgWindow : undefined,
    smoothingFactor: algorithm === "exp_smoothing" ? smoothingFactor : undefined,
  });

  // Compare algorithms query
  const { data: algorithmComparison } = trpc.oee.compareAlgorithms.useQuery({
    days: Number(selectedPeriod),
    predictionDays,
  });

  // Export mutations
  const exportExcelMutation = trpc.oee.exportComparisonExcel.useMutation({
    onSuccess: (data) => {
      toast.success("Xuất Excel thành công!");
      window.open(data.url, "_blank");
    },
    onError: (error) => {
      toast.error(`Lỗi xuất Excel: ${error.message}`);
    },
  });

  const exportPdfMutation = trpc.oee.exportComparisonPdf.useMutation({
    onSuccess: (data) => {
      toast.success("Xuất PDF thành công!");
      window.open(data.url, "_blank");
    },
    onError: (error) => {
      toast.error(`Lỗi xuất PDF: ${error.message}`);
    },
  });

  const sendAlertMutation = trpc.oee.sendOeeAlert.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã gửi email cảnh báo đến ${data.sentTo} người!`);
    },
    onError: (error) => {
      toast.error(`Lỗi gửi email: ${error.message}`);
    },
  });

  const saveConfigMutation = trpc.oee.savePredictionConfig.useMutation({
    onSuccess: () => {
      toast.success("Lưu cấu hình thành công!");
      setSaveConfigOpen(false);
      setConfigName("");
      refetchConfigs();
    },
    onError: (error) => {
      toast.error(`Lỗi lưu cấu hình: ${error.message}`);
    },
  });

  const deleteConfigMutation = trpc.oee.deletePredictionConfig.useMutation({
    onSuccess: () => {
      toast.success("Xóa cấu hình thành công!");
      refetchConfigs();
    },
  });

  // Load default config on mount
  useEffect(() => {
    if (defaultConfig) {
      setAlgorithm(defaultConfig.algorithm as any);
      setPredictionDays(defaultConfig.predictionDays);
      setConfidenceLevel(Number(defaultConfig.confidenceLevel));
      setAlertThreshold(Number(defaultConfig.alertThreshold));
      if (defaultConfig.movingAvgWindow) setMovingAvgWindow(defaultConfig.movingAvgWindow);
      if (defaultConfig.smoothingFactor) setSmoothingFactor(Number(defaultConfig.smoothingFactor));
    }
  }, [defaultConfig]);

  // Load saved config
  const loadConfig = (config: any) => {
    setAlgorithm(config.algorithm);
    setPredictionDays(config.predictionDays);
    setConfidenceLevel(Number(config.confidenceLevel));
    setAlertThreshold(Number(config.alertThreshold));
    if (config.movingAvgWindow) setMovingAvgWindow(config.movingAvgWindow);
    if (config.smoothingFactor) setSmoothingFactor(Number(config.smoothingFactor));
    toast.success(`Đã tải cấu hình: ${config.configName}`);
  };

  // Prepare radar chart data
  const radarData = useMemo(() => {
    if (!oeeComparison?.items) return [];
    return [
      { metric: 'OEE', fullMark: 100, ...Object.fromEntries(oeeComparison.items.map(i => [i.name, i.oee])) },
      { metric: 'Availability', fullMark: 100, ...Object.fromEntries(oeeComparison.items.map(i => [i.name, i.availability])) },
      { metric: 'Performance', fullMark: 100, ...Object.fromEntries(oeeComparison.items.map(i => [i.name, i.performance])) },
      { metric: 'Quality', fullMark: 100, ...Object.fromEntries(oeeComparison.items.map(i => [i.name, i.quality])) },
    ];
  }, [oeeComparison]);

  // Ranking data sorted by OEE
  const rankingData = useMemo(() => {
    if (!oeeComparison?.items) return [];
    return [...oeeComparison.items].sort((a, b) => b.oee - a.oee);
  }, [oeeComparison]);

  // Get status badge
  const getStatusBadge = (oee: number) => {
    if (oee >= 85) return <Badge className="bg-green-500">Xuất sắc</Badge>;
    if (oee >= 75) return <Badge className="bg-blue-500">Tốt</Badge>;
    if (oee >= 65) return <Badge className="bg-yellow-500">Trung bình</Badge>;
    return <Badge className="bg-red-500">Cần cải thiện</Badge>;
  };

  // Get trend icon
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">So sánh OEE</h1>
            <p className="text-muted-foreground mt-1">
              So sánh hiệu suất thiết bị giữa các máy và dây chuyền sản xuất
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={comparisonType} onValueChange={(v) => setComparisonType(v as "machines" | "lines")}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="machines">Theo máy</SelectItem>
                <SelectItem value="lines">Theo dây chuyền</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            {/* Export Dropdown */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Xuất báo cáo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Xuất báo cáo So sánh OEE</DialogTitle>
                  <DialogDescription>
                    Chọn định dạng xuất báo cáo
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Button
                    variant="outline"
                    className="justify-start gap-3 h-auto py-4"
                    onClick={() => exportExcelMutation.mutate({ type: comparisonType, days: Number(selectedPeriod) })}
                    disabled={exportExcelMutation.isPending}
                  >
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div className="text-left">
                      <div className="font-medium">Xuất Excel (.xlsx)</div>
                      <div className="text-sm text-muted-foreground">
                        Bảng xếp hạng, dữ liệu theo ngày, tổng hợp
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start gap-3 h-auto py-4"
                    onClick={() => exportPdfMutation.mutate({ type: comparisonType, days: Number(selectedPeriod) })}
                    disabled={exportPdfMutation.isPending}
                  >
                    <FileText className="h-8 w-8 text-red-600" />
                    <div className="text-left">
                      <div className="font-medium">Xuất PDF (.html)</div>
                      <div className="text-sm text-muted-foreground">
                        Báo cáo định dạng in ấn chuyên nghiệp
                      </div>
                    </div>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-500" />
                OEE Trung bình
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {oeeComparison?.summary && 'avgOee' in oeeComparison.summary ? oeeComparison.summary.avgOee?.toFixed(1) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {comparisonType === "machines" ? "Tất cả máy" : "Tất cả dây chuyền"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4 text-green-500" />
                Cao nhất
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {oeeComparison?.summary && 'maxOee' in oeeComparison.summary ? oeeComparison.summary.maxOee?.toFixed(1) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {oeeComparison?.summary && 'topPerformer' in oeeComparison.summary ? oeeComparison.summary.topPerformer : "N/A"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Thấp nhất
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {oeeComparison?.summary && 'minOee' in oeeComparison.summary ? oeeComparison.summary.minOee?.toFixed(1) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {oeeComparison?.summary && 'bottomPerformer' in oeeComparison.summary ? oeeComparison.summary.bottomPerformer : "N/A"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                Đạt mục tiêu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {oeeComparison?.summary && 'achievedTarget' in oeeComparison.summary ? oeeComparison.summary.achievedTarget : 0}/{oeeComparison?.summary && 'totalItems' in oeeComparison.summary ? oeeComparison.summary.totalItems : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Mục tiêu: 85%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="radar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="radar">Biểu đồ Radar</TabsTrigger>
            <TabsTrigger value="ranking">Bảng xếp hạng</TabsTrigger>
            <TabsTrigger value="trend">Xu hướng</TabsTrigger>
            <TabsTrigger value="prediction">Dự báo</TabsTrigger>
            <TabsTrigger value="compare-algorithms">
              <GitCompare className="h-4 w-4 mr-1" />
              So sánh thuật toán
            </TabsTrigger>
          </TabsList>

          {/* Radar Chart Tab */}
          <TabsContent value="radar">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>So sánh đa chiều</CardTitle>
                  <CardDescription>
                    Biểu đồ radar so sánh OEE, Availability, Performance, Quality
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        {oeeComparison?.items?.slice(0, 5).map((item, index: number) => (
                          <Radar
                            key={item.name || index}
                            name={item.name || `Item ${index}`}
                            dataKey={item.name || `item_${index}`}
                            stroke={COLORS[index % COLORS.length]}
                            fill={COLORS[index % COLORS.length]}
                            fillOpacity={0.2}
                          />
                        ))}
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>So sánh OEE</CardTitle>
                  <CardDescription>
                    Biểu đồ cột so sánh OEE giữa các {comparisonType === "machines" ? "máy" : "dây chuyền"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rankingData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip />
                        <Bar dataKey="oee" name="OEE">
                          {rankingData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.oee >= 85 ? '#22c55e' : entry.oee >= 75 ? '#3b82f6' : entry.oee >= 65 ? '#f59e0b' : '#ef4444'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Bảng xếp hạng OEE
                </CardTitle>
                <CardDescription>
                  Xếp hạng {comparisonType === "machines" ? "máy" : "dây chuyền"} theo hiệu suất OEE
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Hạng</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead className="text-right">OEE</TableHead>
                      <TableHead className="text-right">Availability</TableHead>
                      <TableHead className="text-right">Performance</TableHead>
                      <TableHead className="text-right">Quality</TableHead>
                      <TableHead className="text-right">Xu hướng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankingData.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right font-bold">{item.oee.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{item.availability.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{item.performance.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{item.quality.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {getTrendIcon(item.trend || 0)}
                            <span className={item.trend > 0 ? 'text-green-600' : item.trend < 0 ? 'text-red-600' : ''}>
                              {item.trend > 0 ? '+' : ''}{item.trend?.toFixed(1) || 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.oee)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trend Tab */}
          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng OEE theo thời gian</CardTitle>
                <CardDescription>
                  So sánh xu hướng OEE của các {comparisonType === "machines" ? "máy" : "dây chuyền"} trong {selectedPeriod} ngày qua
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={oeeComparison?.trendData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      {oeeComparison?.items?.slice(0, 5).map((item, index: number) => (
                        <Line
                          key={item.name || index}
                          type="monotone"
                          dataKey={item.name || `item_${index}`}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prediction Tab */}
          <TabsContent value="prediction">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Dự báo OEE
                      </CardTitle>
                      <CardDescription>
                        Dự báo xu hướng OEE trong {predictionDays} ngày tới ({algorithm === "linear" ? "Linear Regression" : algorithm === "moving_avg" ? "Moving Average" : "Exponential Smoothing"})
                      </CardDescription>
                    </div>
                    <Dialog open={predictionSettingsOpen} onOpenChange={setPredictionSettingsOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Cấu hình
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Cấu hình mô hình dự báo</DialogTitle>
                          <DialogDescription>
                            Tùy chỉnh các tham số của mô hình dự báo OEE
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          {/* Thuật toán */}
                          <div className="space-y-2">
                            <Label>Thuật toán dự báo</Label>
                            <Select value={algorithm} onValueChange={(v: any) => setAlgorithm(v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="linear">Linear Regression</SelectItem>
                                <SelectItem value="moving_avg">Moving Average</SelectItem>
                                <SelectItem value="exp_smoothing">Exponential Smoothing</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              {algorithm === "linear" && "Phù hợp khi dữ liệu có xu hướng tuyến tính rõ ràng"}
                              {algorithm === "moving_avg" && "Phù hợp khi dữ liệu có nhiều biến động ngắn hạn"}
                              {algorithm === "exp_smoothing" && "Phù hợp khi dữ liệu gần đây quan trọng hơn"}
                            </p>
                          </div>

                          {/* Khoảng thời gian dự báo */}
                          <div className="space-y-2">
                            <Label>Khoảng thời gian dự báo: {predictionDays} ngày</Label>
                            <Slider
                              value={[predictionDays]}
                              onValueChange={(v) => setPredictionDays(v[0])}
                              min={7}
                              max={60}
                              step={1}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>7 ngày</span>
                              <span>60 ngày</span>
                            </div>
                          </div>

                          {/* Confidence Level */}
                          <div className="space-y-2">
                            <Label>Độ tin cậy: {confidenceLevel}%</Label>
                            <Slider
                              value={[confidenceLevel]}
                              onValueChange={(v) => setConfidenceLevel(v[0])}
                              min={80}
                              max={99}
                              step={1}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>80%</span>
                              <span>99%</span>
                            </div>
                          </div>

                          {/* Ngưỡng cảnh báo */}
                          <div className="space-y-2">
                            <Label>Ngưỡng cảnh báo OEE: {alertThreshold}%</Label>
                            <Slider
                              value={[alertThreshold]}
                              onValueChange={(v) => setAlertThreshold(v[0])}
                              min={50}
                              max={85}
                              step={1}
                            />
                            <p className="text-xs text-muted-foreground">
                              Cảnh báo khi OEE dự báo thấp hơn ngưỡng này
                            </p>
                          </div>

                          {/* Moving Average Window */}
                          {algorithm === "moving_avg" && (
                            <div className="space-y-2">
                              <Label>Cửa sổ Moving Average: {movingAvgWindow} ngày</Label>
                              <Slider
                                value={[movingAvgWindow]}
                                onValueChange={(v) => setMovingAvgWindow(v[0])}
                                min={3}
                                max={14}
                                step={1}
                              />
                            </div>
                          )}

                          {/* Smoothing Factor */}
                          {algorithm === "exp_smoothing" && (
                            <div className="space-y-2">
                              <Label>Hệ số làm mịn (α): {smoothingFactor.toFixed(2)}</Label>
                              <Slider
                                value={[smoothingFactor * 100]}
                                onValueChange={(v) => setSmoothingFactor(v[0] / 100)}
                                min={10}
                                max={90}
                                step={5}
                              />
                              <p className="text-xs text-muted-foreground">
                                Giá trị cao hơn = ưu tiên dữ liệu gần đây hơn
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Saved Configs */}
                        {savedConfigs && savedConfigs.length > 0 && (
                          <div className="space-y-2 pt-4 border-t">
                            <Label>Cấu hình đã lưu</Label>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto">
                              {savedConfigs.map((cfg) => (
                                <div key={cfg.id} className="flex items-center justify-between p-2 border rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{cfg.configName}</span>
                                    {cfg.isDefault === 1 && <Badge variant="secondary">Mặc định</Badge>}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => loadConfig(cfg)}>
                                      Tải
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteConfigMutation.mutate({ id: cfg.id })}>
                                      Xóa
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <DialogFooter className="flex-col sm:flex-row gap-2">
                          <Button variant="outline" onClick={() => setSaveConfigOpen(true)} className="gap-2">
                            <Save className="h-4 w-4" />
                            Lưu cấu hình
                          </Button>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setPredictionSettingsOpen(false)}>
                              Hủy
                            </Button>
                            <Button onClick={() => {
                              refetchPrediction();
                              setPredictionSettingsOpen(false);
                            }}>
                              Áp dụng
                            </Button>
                          </div>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Save Config Dialog */}
                    <Dialog open={saveConfigOpen} onOpenChange={setSaveConfigOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Lưu cấu hình dự báo</DialogTitle>
                          <DialogDescription>
                            Lưu cấu hình hiện tại để sử dụng lại sau
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Tên cấu hình</Label>
                            <Input
                              value={configName}
                              onChange={(e) => setConfigName(e.target.value)}
                              placeholder="VD: Cấu hình OEE hàng tuần"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="setAsDefault"
                              checked={setAsDefault}
                              onChange={(e) => setSetAsDefault(e.target.checked)}
                              className="h-4 w-4"
                            />
                            <Label htmlFor="setAsDefault">Sử dụng làm cấu hình mặc định</Label>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setSaveConfigOpen(false)}>
                            Hủy
                          </Button>
                          <Button
                            onClick={() => {
                              if (!configName.trim()) {
                                toast.error("Vui lòng nhập tên cấu hình");
                                return;
                              }
                              saveConfigMutation.mutate({
                                configName: configName.trim(),
                                configType: "oee",
                                algorithm,
                                predictionDays,
                                confidenceLevel,
                                alertThreshold,
                                movingAvgWindow: algorithm === "moving_avg" ? movingAvgWindow : undefined,
                                smoothingFactor: algorithm === "exp_smoothing" ? smoothingFactor : undefined,
                                historicalDays: Number(selectedPeriod),
                                isDefault: setAsDefault,
                              });
                            }}
                            disabled={saveConfigMutation.isPending}
                          >
                            {saveConfigMutation.isPending ? "Đang lưu..." : "Lưu"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={oeePrediction?.chartData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="actual"
                          name="Thực tế"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.3}
                        />
                        <Area
                          type="monotone"
                          dataKey="predicted"
                          name="Dự báo"
                          stroke="#22c55e"
                          fill="#22c55e"
                          fillOpacity={0.3}
                          strokeDasharray="5 5"
                        />
                        <Area
                          type="monotone"
                          dataKey="upperBound"
                          name="Giới hạn trên"
                          stroke="#94a3b8"
                          fill="none"
                          strokeDasharray="3 3"
                        />
                        <Area
                          type="monotone"
                          dataKey="lowerBound"
                          name="Giới hạn dưới"
                          stroke="#94a3b8"
                          fill="none"
                          strokeDasharray="3 3"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Cảnh báo sớm
                      </CardTitle>
                      <CardDescription>
                        Phát hiện các máy/dây chuyền có nguy cơ giảm hiệu suất
                      </CardDescription>
                    </div>
                    {oeePrediction?.alerts && oeePrediction.alerts.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Mail className="h-4 w-4" />
                            Gửi email
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Gửi email cảnh báo OEE</DialogTitle>
                            <DialogDescription>
                              Gửi thông báo cảnh báo đến quản lý qua email
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Chọn cảnh báo để gửi</Label>
                              {oeePrediction.alerts.map((alert, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                                  <AlertTriangle className={`h-4 w-4 ${
                                    alert.severity === 'high' ? 'text-red-500' : 'text-yellow-500'
                                  }`} />
                                  <span className="flex-1 text-sm">{alert.name}</span>
                                  <Badge variant={alert.severity === 'high' ? 'destructive' : 'default'}>
                                    {alert.severity === 'high' ? 'Cao' : 'TB'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-2">
                              <Label>Email người nhận (cách nhau bởi dấu phẩy)</Label>
                              <Input
                                id="alert-emails"
                                placeholder="admin@company.com, manager@company.com"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={() => {
                                const emailInput = document.getElementById('alert-emails') as HTMLInputElement;
                                const emails = emailInput?.value.split(',').map(e => e.trim()).filter(e => e);
                                if (!emails || emails.length === 0) {
                                  toast.error('Vui lòng nhập ít nhất một email');
                                  return;
                                }
                                // Send all high severity alerts
                                const highAlerts = oeePrediction.alerts.filter(a => a.severity === 'high');
                                const alertToSend = highAlerts[0] || oeePrediction.alerts[0];
                                sendAlertMutation.mutate({
                                  machineName: alertToSend.name,
                                  currentOee: alertToSend.currentOee,
                                  predictedOee: alertToSend.predictedOee,
                                  change: alertToSend.predictedOee - alertToSend.currentOee,
                                  severity: alertToSend.severity as any,
                                  recipients: emails,
                                });
                              }}
                              disabled={sendAlertMutation.isPending}
                            >
                              {sendAlertMutation.isPending ? 'Đang gửi...' : 'Gửi cảnh báo'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {oeePrediction?.alerts?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                        <p>Không có cảnh báo nào</p>
                        <p className="text-sm">Tất cả thiết bị đang hoạt động ổn định</p>
                      </div>
                    ) : (
                      oeePrediction?.alerts?.map((alert, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${
                          alert.severity === 'high' ? 'border-red-200 bg-red-50' :
                          alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                          'border-blue-200 bg-blue-50'
                        }`}>
                          <div className="flex items-start gap-3">
                            <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                              alert.severity === 'high' ? 'text-red-500' :
                              alert.severity === 'medium' ? 'text-yellow-500' :
                              'text-blue-500'
                            }`} />
                            <div className="flex-1">
                              <div className="font-medium">{alert.name}</div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {alert.message}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span>OEE hiện tại: <strong>{alert.currentOee?.toFixed(1)}%</strong></span>
                                <span>Dự báo: <strong className={alert.predictedOee < alert.currentOee ? 'text-red-600' : 'text-green-600'}>
                                  {alert.predictedOee?.toFixed(1)}%
                                </strong></span>
                              </div>
                            </div>
                            <Badge variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'default' : 'secondary'}>
                              {alert.severity === 'high' ? 'Cao' : alert.severity === 'medium' ? 'Trung bình' : 'Thấp'}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Prediction Summary */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Tổng hợp dự báo</CardTitle>
                  <CardDescription>
                    Dự báo OEE cho từng {comparisonType === "machines" ? "máy" : "dây chuyền"} trong 7 ngày tới
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead className="text-right">OEE hiện tại</TableHead>
                        <TableHead className="text-right">Dự báo 7 ngày</TableHead>
                        <TableHead className="text-right">Thay đổi</TableHead>
                        <TableHead className="text-right">Độ tin cậy</TableHead>
                        <TableHead>Khuyến nghị</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {oeePrediction?.predictions?.map((pred) => (
                        <TableRow key={pred.id}>
                          <TableCell className="font-medium">{pred.name}</TableCell>
                          <TableCell className="text-right">{pred.currentOee?.toFixed(1)}%</TableCell>
                          <TableCell className="text-right font-bold">{pred.predictedOee?.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            <span className={pred.change > 0 ? 'text-green-600' : pred.change < 0 ? 'text-red-600' : ''}>
                              {pred.change > 0 ? '+' : ''}{pred.change?.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{pred.confidence?.toFixed(0)}%</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{pred.recommendation}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Compare Algorithms Tab */}
          <TabsContent value="compare-algorithms">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Algorithm Comparison Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitCompare className="h-5 w-5" />
                    So sánh kết quả dự báo giữa các thuật toán
                  </CardTitle>
                  <CardDescription>
                    Biểu đồ so sánh dự báo OEE từ 3 thuật toán: Linear Regression, Moving Average, Exponential Smoothing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={algorithmComparison?.chartData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          name="Thực tế"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="linear"
                          name="Linear Regression"
                          stroke="#22c55e"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="movingAvg"
                          name="Moving Average"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="expSmoothing"
                          name="Exp. Smoothing"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Algorithm Metrics Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Bảng so sánh độ chính xác</CardTitle>
                  <CardDescription>
                    So sánh R² và RMSE của các thuật toán
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thuật toán</TableHead>
                        <TableHead className="text-right">R² (%)</TableHead>
                        <TableHead className="text-right">RMSE</TableHead>
                        <TableHead>Đánh giá</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {algorithmComparison?.algorithms?.map((alg) => (
                        <TableRow key={alg.code}>
                          <TableCell className="font-medium">{alg.name}</TableCell>
                          <TableCell className="text-right">
                            <span className={alg.r2 >= 0.7 ? 'text-green-600 font-bold' : alg.r2 >= 0.5 ? 'text-yellow-600' : 'text-red-600'}>
                              {(alg.r2 * 100).toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{alg.rmse.toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{alg.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Recommendation Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    Khuyến nghị thuật toán
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {algorithmComparison?.recommendation ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-bold text-green-800">
                            {algorithmComparison.recommendation.algorithm}
                          </span>
                        </div>
                        <p className="text-sm text-green-700">
                          {algorithmComparison.recommendation.reason}
                        </p>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => {
                          setAlgorithm(algorithmComparison.recommendation!.code as any);
                          toast.success(`Đã chọn thuật toán ${algorithmComparison.recommendation!.algorithm}`);
                        }}
                      >
                        Áp dụng thuật toán này
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Info className="h-12 w-12 mx-auto mb-3" />
                      <p>Chưa có dữ liệu để so sánh</p>
                      <p className="text-sm">Cần ít nhất 7 ngày dữ liệu OEE</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
