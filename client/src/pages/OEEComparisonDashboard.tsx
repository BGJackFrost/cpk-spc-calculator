import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3, TrendingUp, TrendingDown, Award, Target, AlertTriangle,
  RefreshCw, Download, Gauge, Activity, Zap, CheckCircle
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, LineChart, Line, Area, AreaChart
} from "recharts";

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function OEEComparisonDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [comparisonType, setComparisonType] = useState<"machines" | "lines">("machines");
  
  // Queries
  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: oeeComparison, isLoading } = trpc.oee.getComparison.useQuery({
    type: comparisonType,
    days: Number(selectedPeriod),
  });
  const { data: oeePrediction } = trpc.oee.getPrediction.useQuery({
    days: Number(selectedPeriod),
  });

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
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
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
                {oeeComparison?.summary?.avgOee?.toFixed(1) || 0}%
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
                {oeeComparison?.summary?.maxOee?.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {oeeComparison?.summary?.topPerformer || "N/A"}
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
                {oeeComparison?.summary?.minOee?.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                {oeeComparison?.summary?.bottomPerformer || "N/A"}
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
                {oeeComparison?.summary?.achievedTarget || 0}/{oeeComparison?.summary?.totalItems || 0}
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
                        {oeeComparison?.items?.slice(0, 5).map((item, index) => (
                          <Radar
                            key={item.name}
                            name={item.name}
                            dataKey={item.name}
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
                      {oeeComparison?.items?.slice(0, 5).map((item, index) => (
                        <Line
                          key={item.name}
                          type="monotone"
                          dataKey={item.name}
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
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Dự báo OEE
                  </CardTitle>
                  <CardDescription>
                    Dự báo xu hướng OEE trong 14 ngày tới dựa trên dữ liệu lịch sử
                  </CardDescription>
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
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Cảnh báo sớm
                  </CardTitle>
                  <CardDescription>
                    Phát hiện các máy/dây chuyền có nguy cơ giảm hiệu suất
                  </CardDescription>
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
