import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  Plus, 
  Trash2, 
  RefreshCw,
  BarChart3,
  LineChart,
  PieChart,
  Settings,
  FileText,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function QualityTrendReport() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<number | null>(null);
  const [reportParams, setReportParams] = useState({
    periodType: "weekly" as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
    comparisonPeriods: 4,
  });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    periodType: "weekly" as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
    comparisonPeriods: 4,
    includeCpk: true,
    includePpk: true,
    includeDefectRate: true,
    includeViolationCount: true,
    includeQualityScore: true,
    enableLineChart: true,
    enableBarChart: true,
    enablePieChart: true,
    enableHeatmap: false,
  });

  const utils = trpc.useUtils();
  const { data: configs, isLoading: configsLoading } = trpc.qualityTrend.listConfigs.useQuery();
  const { data: reportData, isLoading: reportLoading, refetch: refetchReport } = trpc.qualityTrend.generateReport.useQuery(
    selectedConfig 
      ? { configId: selectedConfig }
      : { periodType: reportParams.periodType, comparisonPeriods: reportParams.comparisonPeriods },
    { enabled: true }
  );

  const createMutation = trpc.qualityTrend.createConfig.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã tạo cấu hình báo cáo" });
      setIsCreateDialogOpen(false);
      utils.qualityTrend.listConfigs.invalidate();
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.qualityTrend.deleteConfig.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã xóa cấu hình báo cáo" });
      utils.qualityTrend.listConfigs.invalidate();
      setSelectedConfig(null);
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      periodType: "weekly",
      comparisonPeriods: 4,
      includeCpk: true,
      includePpk: true,
      includeDefectRate: true,
      includeViolationCount: true,
      includeQualityScore: true,
      enableLineChart: true,
      enableBarChart: true,
      enablePieChart: true,
      enableHeatmap: false,
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const getTrendIcon = (trend: string | undefined) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendBadge = (trend: string | undefined, percent: number | undefined) => {
    const percentText = percent ? `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%` : "";
    switch (trend) {
      case "improving":
        return (
          <Badge className="bg-green-500">
            <ArrowUpRight className="w-3 h-3 mr-1" />
            Cải thiện {percentText}
          </Badge>
        );
      case "declining":
        return (
          <Badge variant="destructive">
            <ArrowDownRight className="w-3 h-3 mr-1" />
            Giảm {percentText}
          </Badge>
        );
      default:
        return <Badge variant="secondary">Ổn định</Badge>;
    }
  };

  // Chart data
  const lineChartData = useMemo(() => {
    if (!reportData?.periodData) return null;
    
    return {
      labels: reportData.periodData.map(p => p.period),
      datasets: [
        {
          label: 'CPK',
          data: reportData.periodData.map(p => p.avgCpk),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'PPK',
          data: reportData.periodData.map(p => p.avgPpk),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [reportData]);

  const barChartData = useMemo(() => {
    if (!reportData?.periodData) return null;
    
    return {
      labels: reportData.periodData.map(p => p.period),
      datasets: [
        {
          label: 'Tổng mẫu',
          data: reportData.periodData.map(p => p.totalSamples),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
        {
          label: 'Vi phạm',
          data: reportData.periodData.map(p => p.totalViolations),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
        },
      ],
    };
  }, [reportData]);

  const pieChartData = useMemo(() => {
    if (!reportData?.violationDistribution) return null;
    
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
    ];
    
    return {
      labels: reportData.violationDistribution.map(v => v.violationType || 'Khác'),
      datasets: [
        {
          data: reportData.violationDistribution.map(v => v.count),
          backgroundColor: colors.slice(0, reportData.violationDistribution.length),
        },
      ],
    };
  }, [reportData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Báo cáo Xu hướng Chất lượng
            </h1>
            <p className="text-muted-foreground">
              Phân tích và so sánh xu hướng chất lượng theo thời gian
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetchReport()}
              disabled={reportLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${reportLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo cấu hình
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Tạo cấu hình báo cáo</DialogTitle>
                  <DialogDescription>
                    Cấu hình các thông số cho báo cáo xu hướng chất lượng
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Tên báo cáo</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="VD: Báo cáo tuần Line 1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="periodType">Loại chu kỳ</Label>
                      <Select
                        value={formData.periodType}
                        onValueChange={(value: "daily" | "weekly" | "monthly" | "quarterly" | "yearly") => 
                          setFormData({ ...formData, periodType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Hàng ngày</SelectItem>
                          <SelectItem value="weekly">Hàng tuần</SelectItem>
                          <SelectItem value="monthly">Hàng tháng</SelectItem>
                          <SelectItem value="quarterly">Hàng quý</SelectItem>
                          <SelectItem value="yearly">Hàng năm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Mô tả về báo cáo này..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comparisonPeriods">Số chu kỳ so sánh</Label>
                    <Input
                      id="comparisonPeriods"
                      type="number"
                      min={2}
                      max={12}
                      value={formData.comparisonPeriods}
                      onChange={(e) => setFormData({ ...formData, comparisonPeriods: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Chỉ số hiển thị</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeCpk">CPK</Label>
                        <Switch
                          id="includeCpk"
                          checked={formData.includeCpk}
                          onCheckedChange={(checked) => setFormData({ ...formData, includeCpk: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="includePpk">PPK</Label>
                        <Switch
                          id="includePpk"
                          checked={formData.includePpk}
                          onCheckedChange={(checked) => setFormData({ ...formData, includePpk: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeDefectRate">Tỷ lệ lỗi</Label>
                        <Switch
                          id="includeDefectRate"
                          checked={formData.includeDefectRate}
                          onCheckedChange={(checked) => setFormData({ ...formData, includeDefectRate: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeViolationCount">Số vi phạm</Label>
                        <Switch
                          id="includeViolationCount"
                          checked={formData.includeViolationCount}
                          onCheckedChange={(checked) => setFormData({ ...formData, includeViolationCount: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Biểu đồ</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="enableLineChart">Biểu đồ đường</Label>
                        <Switch
                          id="enableLineChart"
                          checked={formData.enableLineChart}
                          onCheckedChange={(checked) => setFormData({ ...formData, enableLineChart: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="enableBarChart">Biểu đồ cột</Label>
                        <Switch
                          id="enableBarChart"
                          checked={formData.enableBarChart}
                          onCheckedChange={(checked) => setFormData({ ...formData, enableBarChart: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="enablePieChart">Biểu đồ tròn</Label>
                        <Switch
                          id="enablePieChart"
                          checked={formData.enablePieChart}
                          onCheckedChange={(checked) => setFormData({ ...formData, enablePieChart: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="enableHeatmap">Heatmap</Label>
                        <Switch
                          id="enableHeatmap"
                          checked={formData.enableHeatmap}
                          onCheckedChange={(checked) => setFormData({ ...formData, enableHeatmap: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Đang tạo..." : "Tạo cấu hình"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Chu kỳ:</Label>
                <Select
                  value={reportParams.periodType}
                  onValueChange={(value: "daily" | "weekly" | "monthly" | "quarterly" | "yearly") => {
                    setReportParams({ ...reportParams, periodType: value });
                    setSelectedConfig(null);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Hàng ngày</SelectItem>
                    <SelectItem value="weekly">Hàng tuần</SelectItem>
                    <SelectItem value="monthly">Hàng tháng</SelectItem>
                    <SelectItem value="quarterly">Hàng quý</SelectItem>
                    <SelectItem value="yearly">Hàng năm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>Số chu kỳ:</Label>
                <Select
                  value={String(reportParams.comparisonPeriods)}
                  onValueChange={(value) => {
                    setReportParams({ ...reportParams, comparisonPeriods: parseInt(value) });
                    setSelectedConfig(null);
                  }}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {configs && configs.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label>Hoặc chọn cấu hình:</Label>
                  <Select
                    value={selectedConfig ? String(selectedConfig) : "none"}
                    onValueChange={(value) => setSelectedConfig(value === "none" ? null : parseInt(value))}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Chọn cấu hình..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Không chọn --</SelectItem>
                      {configs.map((config) => (
                        <SelectItem key={config.id} value={String(config.id)}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {reportData && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">CPK TB</span>
                  {getTrendIcon(reportData.trends.cpk.trend)}
                </div>
                <div className="text-2xl font-bold">
                  {reportData.summary.avgCpk.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {reportData.summary.cpkChange > 0 ? "+" : ""}{reportData.summary.cpkChange.toFixed(1)}% so với kỳ trước
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">PPK TB</span>
                </div>
                <div className="text-2xl font-bold">
                  {reportData.summary.avgPpk.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Tổng mẫu</span>
                </div>
                <div className="text-2xl font-bold">
                  {reportData.summary.totalSamples.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Vi phạm</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {reportData.summary.totalViolations.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Tỷ lệ lỗi</span>
                  {getTrendIcon(reportData.trends.defect.trend)}
                </div>
                <div className="text-2xl font-bold">
                  {reportData.summary.defectRate.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {reportData.summary.defectRateChange > 0 ? "+" : ""}{reportData.summary.defectRateChange.toFixed(1)}% so với kỳ trước
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Xu hướng CPK</span>
                </div>
                {getTrendBadge(reportData.trends.cpk.trend, reportData.trends.cpk.percent)}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPK/PPK Trend Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                Xu hướng CPK/PPK
              </CardTitle>
              <CardDescription>
                Biểu đồ thay đổi CPK và PPK theo thời gian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {lineChartData ? (
                  <Line data={lineChartData} options={chartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Không có dữ liệu
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Samples vs Violations Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Mẫu và Vi phạm
              </CardTitle>
              <CardDescription>
                So sánh số lượng mẫu và vi phạm theo chu kỳ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {barChartData ? (
                  <Bar data={barChartData} options={chartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Không có dữ liệu
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Violation Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Phân bố Vi phạm
              </CardTitle>
              <CardDescription>
                Tỷ lệ các loại vi phạm trong kỳ hiện tại
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {pieChartData && pieChartData.labels.length > 0 ? (
                  <Pie data={pieChartData} options={chartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Không có dữ liệu vi phạm
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Period Data Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Chi tiết theo chu kỳ
              </CardTitle>
              <CardDescription>
                Dữ liệu chi tiết của từng chu kỳ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Chu kỳ</th>
                      <th className="text-right py-2 px-2">CPK</th>
                      <th className="text-right py-2 px-2">PPK</th>
                      <th className="text-right py-2 px-2">Mẫu</th>
                      <th className="text-right py-2 px-2">Vi phạm</th>
                      <th className="text-right py-2 px-2">Tỷ lệ lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.periodData.map((period, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2 font-medium">{period.period}</td>
                        <td className="text-right py-2 px-2">{period.avgCpk.toFixed(2)}</td>
                        <td className="text-right py-2 px-2">{period.avgPpk.toFixed(2)}</td>
                        <td className="text-right py-2 px-2">{period.totalSamples.toLocaleString()}</td>
                        <td className="text-right py-2 px-2">{period.totalViolations.toLocaleString()}</td>
                        <td className="text-right py-2 px-2">{period.defectRate.toFixed(2)}%</td>
                      </tr>
                    ))}
                    {(!reportData?.periodData || reportData.periodData.length === 0) && (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-muted-foreground">
                          Không có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Saved Configurations */}
        {configs && configs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Cấu hình đã lưu
              </CardTitle>
              <CardDescription>
                Các cấu hình báo cáo đã tạo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedConfig === config.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedConfig(config.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{config.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Bạn có chắc muốn xóa cấu hình này?")) {
                            deleteMutation.mutate({ id: config.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span className="capitalize">{config.periodType}</span>
                      <span>•</span>
                      <span>{config.comparisonPeriods} chu kỳ</span>
                    </div>
                    {config.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {config.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
