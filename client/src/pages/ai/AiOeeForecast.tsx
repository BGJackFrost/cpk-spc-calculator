import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { Target, RefreshCw, Download, Brain, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Gauge, Clock, Zap, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar, ReferenceLine, RadialBarChart, RadialBar, PieChart, Pie, Cell } from "recharts";

// Mock OEE forecast data
// Mock data removed - mockOeeData (data comes from tRPC or is not yet implemented)

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

export default function AiOeeForecast() {
  const { toast } = useToast();
  const [selectedLine, setSelectedLine] = useState("all");
  const [forecastDays, setForecastDays] = useState("7");

  // Export mutation
  const exportMutation = trpc.predictiveAnalytics.exportOeeForecastReport.useMutation({
    onSuccess: (data) => {
      if (data.format === 'excel') {
        // Download Excel file
        const byteCharacters = atob(data.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Open HTML in new tab
        const blob = new Blob([data.data], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
      toast({ title: "Thành công", description: `Đã xuất báo cáo ${data.format.toUpperCase()}` });
    },
    onError: (error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const handleAnalyze = () => {
    toast({ title: "Đang phân tích", description: "Đang dự báo OEE với AI..." });
    setTimeout(() => {
      toast({ title: "Hoàn thành", description: "Đã dự báo OEE thành công" });
    }, 1500);
  };

  const handleExport = (format: 'html' | 'excel') => {
    exportMutation.mutate({
      format,
      forecastDays: parseInt(forecastDays),
      includeRecommendations: true,
      title: 'Báo cáo Dự báo OEE',
      companyName: 'Hệ thống SPC/CPK',
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high": return <Badge className="bg-red-500">Cao</Badge>;
      case "medium": return <Badge className="bg-orange-500">Trung bình</Badge>;
      case "low": return <Badge className="bg-blue-500">Thấp</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Target className="w-8 h-8 text-green-500" />
              AI OEE Forecast
            </h1>
            <p className="text-muted-foreground mt-1">Dự báo OEE với AI và khuyến nghị cải tiến</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedLine} onValueChange={setSelectedLine}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả Line</SelectItem>
                <SelectItem value="line1">Line 1</SelectItem>
                <SelectItem value="line2">Line 2</SelectItem>
                <SelectItem value="line3">Line 3</SelectItem>
                <SelectItem value="line4">Line 4</SelectItem>
              </SelectContent>
            </Select>
            <Select value={forecastDays} onValueChange={setForecastDays}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleAnalyze}>
              <RefreshCw className="w-4 h-4 mr-2" />Dự báo
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={exportMutation.isPending}>
                  {exportMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Xuất báo cáo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('html')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Xuất PDF/HTML
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Xuất Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Current OEE Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">OEE Hiện tại</p>
                  <p className="text-3xl font-bold text-green-800">{mockOeeData.currentOee.overall}%</p>
                </div>
                <Gauge className="w-10 h-10 text-green-500" />
              </div>
              <Progress value={mockOeeData.currentOee.overall} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Availability</p>
                  <p className="text-2xl font-bold">{mockOeeData.currentOee.availability}%</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
              <Progress value={mockOeeData.currentOee.availability} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Performance</p>
                  <p className="text-2xl font-bold">{mockOeeData.currentOee.performance}%</p>
                </div>
                <Zap className="w-8 h-8 text-orange-500" />
              </div>
              <Progress value={mockOeeData.currentOee.performance} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quality</p>
                  <p className="text-2xl font-bold">{mockOeeData.currentOee.quality}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <Progress value={mockOeeData.currentOee.quality} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="w-5 h-5 text-green-500" />AI Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Phân tích</h4>
                {mockOeeData.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-white">
                    {insight.type === "positive" && <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />}
                    {insight.type === "warning" && <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />}
                    {insight.type === "info" && <Brain className="w-4 h-4 text-blue-500 mt-0.5" />}
                    <span className="text-sm">{insight.message}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Khuyến nghị hành động</h4>
                {mockOeeData.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-white">
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(rec.priority)}
                      <span className="text-sm">{rec.action}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">{rec.impact}</p>
                      <p className="text-xs text-muted-foreground">Hạn: {rec.deadline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="forecast" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forecast">Dự báo OEE</TabsTrigger>
            <TabsTrigger value="byline">Theo dây chuyền</TabsTrigger>
            <TabsTrigger value="loss">Phân tích tổn thất</TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dự báo OEE 7 ngày tới</CardTitle>
                <CardDescription>Giá trị thực tế và dự báo với các thành phần A/P/Q</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mockOeeData.forecast}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[70, 100]} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={85} stroke="#22c55e" strokeDasharray="5 5" label="Mục tiêu" />
                      <Area type="monotone" dataKey="availability" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Availability" />
                      <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="OEE Dự báo" />
                      <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={2} name="OEE Thực tế" dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="byline" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockOeeData.byLine.map((line, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {line.line}
                      {line.trend === "up" ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Hiện tại</span>
                      <span className="font-bold">{line.current}%</span>
                    </div>
                    <Progress value={line.current} className="h-2 mb-4" />
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Dự báo (7 ngày)</span>
                      <span className="font-bold text-blue-600">{line.forecast}%</span>
                    </div>
                    <Progress value={line.forecast} className="h-2" />
                    <p className={`text-sm mt-2 ${line.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                      {line.trend === "up" ? "+" : ""}{(line.forecast - line.current).toFixed(1)}% so với hiện tại
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="loss" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Phân tích tổn thất OEE</CardTitle>
                <CardDescription>Breakdown các yếu tố ảnh hưởng đến OEE</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockOeeData.lossAnalysis}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {mockOeeData.lossAnalysis.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
