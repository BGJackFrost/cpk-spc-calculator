import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowDownUp, 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  Factory, 
  FileDown, 
  GitCompare, 
  Medal, 
  Plus, 
  Search, 
  Trash2, 
  TrendingDown, 
  TrendingUp, 
  XCircle,
  Radar as RadarIcon
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from "recharts";
import { toast } from "sonner";

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function LineComparison() {
  const [selectedLineIds, setSelectedLineIds] = useState<number[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sessionName, setSessionName] = useState("");
  
  const { data: productionLines, isLoading: isLoadingLines } = trpc.productionLine.list.useQuery();
  const { data: sessions, refetch: refetchSessions } = trpc.lineComparison.list.useQuery();
  
  const { data: comparisonData, isLoading: isComparing, refetch: refetchComparison } = trpc.lineComparison.compare.useQuery(
    {
      productionLineIds: selectedLineIds,
      dateFrom: `${dateFrom} 00:00:00`,
      dateTo: `${dateTo} 23:59:59`,
    },
    { enabled: selectedLineIds.length >= 2 }
  );
  
  const { data: trendData, isLoading: isLoadingTrend } = trpc.lineComparison.getTrendComparison.useQuery(
    {
      productionLineIds: selectedLineIds,
      dateFrom: `${dateFrom} 00:00:00`,
      dateTo: `${dateTo} 23:59:59`,
      groupBy: 'day',
    },
    { enabled: selectedLineIds.length >= 2 }
  );
  
  const createSessionMutation = trpc.lineComparison.create.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu phiên so sánh");
      setShowSaveDialog(false);
      setSessionName("");
      refetchSessions();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteSessionMutation = trpc.lineComparison.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa phiên so sánh");
      refetchSessions();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleToggleLine = (lineId: number) => {
    setSelectedLineIds(prev => 
      prev.includes(lineId) 
        ? prev.filter(id => id !== lineId)
        : [...prev, lineId]
    );
  };
  
  const handleSaveSession = () => {
    if (!sessionName.trim()) {
      toast.error("Vui lòng nhập tên phiên so sánh");
      return;
    }
    
    createSessionMutation.mutate({
      name: sessionName,
      productionLineIds: selectedLineIds,
      dateFrom: `${dateFrom} 00:00:00`,
      dateTo: `${dateTo} 23:59:59`,
    });
  };
  
  const handleLoadSession = (session: any) => {
    const lineIds = JSON.parse(session.productionLineIds || '[]');
    setSelectedLineIds(lineIds);
    setDateFrom(session.dateFrom.slice(0, 10));
    setDateTo(session.dateTo.slice(0, 10));
    toast.success("Đã tải phiên so sánh");
  };
  
  const getCpkStatusColor = (cpk: number) => {
    if (cpk >= 1.33) return 'text-green-500';
    if (cpk >= 1.0) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good': return <Badge className="bg-green-500">Tốt</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">Cảnh báo</Badge>;
      case 'critical': return <Badge className="bg-red-500">Nguy hiểm</Badge>;
      default: return <Badge variant="outline">N/A</Badge>;
    }
  };
  
  // Prepare chart data
  const barChartData = comparisonData?.lines.map(line => ({
    name: line.lineName,
    cpk: line.metrics.cpk.avg,
    ngRate: line.metrics.ngRate,
    violations: line.metrics.violationCount,
  })) || [];
  
  const radarData = comparisonData?.lines.map(line => ({
    subject: line.lineName,
    cpk: Math.min(line.metrics.cpk.avg * 50, 100),
    stability: Math.max(100 - line.metrics.cpk.std * 100, 0),
    quality: Math.max(100 - line.metrics.ngRate, 0),
    compliance: Math.max(100 - (line.metrics.violationCount / Math.max(line.totalAnalyses, 1)) * 100, 0),
  })) || [];
  
  // Prepare trend chart data
  const trendChartData: any[] = [];
  if (trendData?.trendData) {
    const allTimes = new Set<string>();
    Object.values(trendData.trendData).forEach((data: any[]) => {
      data.forEach(d => allTimes.add(d.time));
    });
    
    Array.from(allTimes).sort().forEach(time => {
      const point: any = { time };
      Object.entries(trendData.trendData).forEach(([lineName, data]: [string, any[]]) => {
        const match = data.find(d => d.time === time);
        point[lineName] = match?.cpk || 0;
      });
      trendChartData.push(point);
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
              <GitCompare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">So sánh dây chuyền</h1>
              <p className="text-muted-foreground">So sánh hiệu suất giữa các dây chuyền sản xuất</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedLineIds.length >= 2 && (
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Lưu phiên
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Lưu phiên so sánh</DialogTitle>
                    <DialogDescription>
                      Lưu cấu hình so sánh hiện tại để sử dụng lại sau
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Tên phiên so sánh</Label>
                      <Input
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="VD: So sánh Line 1 vs Line 2"
                      />
                    </div>
                    <Button 
                      onClick={handleSaveSession}
                      disabled={createSessionMutation.isPending}
                      className="w-full"
                    >
                      Lưu
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Line Selection */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Chọn dây chuyền
              </CardTitle>
              <CardDescription>Chọn ít nhất 2 dây chuyền để so sánh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Range */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Từ ngày
                  </Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Đến ngày
                  </Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">
                  Đã chọn: {selectedLineIds.length} dây chuyền
                </p>
                
                {isLoadingLines ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {productionLines?.map((line) => (
                        <div
                          key={line.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedLineIds.includes(line.id)
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleToggleLine(line.id)}
                        >
                          <Checkbox
                            checked={selectedLineIds.includes(line.id)}
                            onCheckedChange={() => handleToggleLine(line.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{line.name}</p>
                            {line.code && (
                              <p className="text-xs text-muted-foreground">{line.code}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
              
              {/* Saved Sessions */}
              {sessions && sessions.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Phiên đã lưu</p>
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <button
                            className="text-sm font-medium text-left flex-1 hover:text-primary"
                            onClick={() => handleLoadSession(session)}
                          >
                            {session.name}
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSessionMutation.mutate({ id: session.id })}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Right Panel - Comparison Results */}
          <div className="lg:col-span-3 space-y-6">
            {selectedLineIds.length < 2 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <GitCompare className="h-16 w-16 mb-4" />
                  <p className="text-lg font-medium">Chọn ít nhất 2 dây chuyền để so sánh</p>
                  <p className="text-sm">Sử dụng panel bên trái để chọn các dây chuyền</p>
                </CardContent>
              </Card>
            ) : isComparing ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-[400px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <p>Đang so sánh...</p>
                </CardContent>
              </Card>
            ) : comparisonData ? (
              <>
                {/* Rankings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Medal className="h-4 w-4 text-yellow-500" />
                        Xếp hạng theo CPK
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {comparisonData.rankings.byCpk.slice(0, 3).map((line, index) => (
                          <div key={line.lineId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0 ? 'bg-yellow-500 text-white' :
                                index === 1 ? 'bg-gray-400 text-white' :
                                'bg-orange-600 text-white'
                              }`}>
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium truncate max-w-[100px]">{line.lineName}</span>
                            </div>
                            <span className={`font-bold ${getCpkStatusColor(line.metrics.cpk.avg)}`}>
                              {line.metrics.cpk.avg.toFixed(3)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-green-500" />
                        Tỷ lệ NG thấp nhất
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {comparisonData.rankings.byNgRate.slice(0, 3).map((line, index) => (
                          <div key={line.lineId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0 ? 'bg-green-500 text-white' :
                                index === 1 ? 'bg-green-400 text-white' :
                                'bg-green-300 text-white'
                              }`}>
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium truncate max-w-[100px]">{line.lineName}</span>
                            </div>
                            <span className="font-bold text-green-500">
                              {line.metrics.ngRate.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        Ít vi phạm nhất
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {comparisonData.rankings.byViolations.slice(0, 3).map((line, index) => (
                          <div key={line.lineId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0 ? 'bg-blue-500 text-white' :
                                index === 1 ? 'bg-blue-400 text-white' :
                                'bg-blue-300 text-white'
                              }`}>
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium truncate max-w-[100px]">{line.lineName}</span>
                            </div>
                            <span className="font-bold text-blue-500">
                              {line.metrics.violationCount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Charts */}
                <Tabs defaultValue="bar" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="bar">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Biểu đồ cột
                    </TabsTrigger>
                    <TabsTrigger value="trend">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Xu hướng
                    </TabsTrigger>
                    <TabsTrigger value="table">
                      <ArrowDownUp className="h-4 w-4 mr-2" />
                      Bảng chi tiết
                    </TabsTrigger>
                    <TabsTrigger value="radar">
                      <RadarIcon className="h-4 w-4 mr-2" />
                      Biểu đồ Radar
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="bar">
                    <Card>
                      <CardHeader>
                        <CardTitle>So sánh CPK và Tỷ lệ NG</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={barChartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="name" className="text-xs" />
                            <YAxis yAxisId="left" className="text-xs" />
                            <YAxis yAxisId="right" orientation="right" className="text-xs" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }} 
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="cpk" name="CPK" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="right" dataKey="ngRate" name="Tỷ lệ NG (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="trend">
                    <Card>
                      <CardHeader>
                        <CardTitle>Xu hướng CPK theo thời gian</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoadingTrend ? (
                          <Skeleton className="h-[400px] w-full" />
                        ) : (
                          <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={trendChartData}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="time" className="text-xs" />
                              <YAxis className="text-xs" />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }} 
                              />
                              <Legend />
                              {trendData?.lines.map((line, index) => (
                                <Line
                                  key={line.id}
                                  type="monotone"
                                  dataKey={line.name}
                                  stroke={COLORS[index % COLORS.length]}
                                  strokeWidth={2}
                                  dot={false}
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="table">
                    <Card>
                      <CardHeader>
                        <CardTitle>Bảng so sánh chi tiết</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-3 font-medium">Dây chuyền</th>
                                <th className="text-center p-3 font-medium">Phân tích</th>
                                <th className="text-center p-3 font-medium">CPK TB</th>
                                <th className="text-center p-3 font-medium">CPK Min</th>
                                <th className="text-center p-3 font-medium">CPK Max</th>
                                <th className="text-center p-3 font-medium">Tỷ lệ NG</th>
                                <th className="text-center p-3 font-medium">Vi phạm</th>
                                <th className="text-center p-3 font-medium">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {comparisonData.lines.map((line) => (
                                <tr key={line.lineId} className="border-b hover:bg-muted/50">
                                  <td className="p-3 font-medium">{line.lineName}</td>
                                  <td className="p-3 text-center">{line.totalAnalyses}</td>
                                  <td className={`p-3 text-center font-bold ${getCpkStatusColor(line.metrics.cpk.avg)}`}>
                                    {line.metrics.cpk.avg.toFixed(3)}
                                  </td>
                                  <td className="p-3 text-center text-muted-foreground">
                                    {line.metrics.cpk.min.toFixed(3)}
                                  </td>
                                  <td className="p-3 text-center text-muted-foreground">
                                    {line.metrics.cpk.max.toFixed(3)}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={line.metrics.ngRate <= 5 ? 'text-green-500' : line.metrics.ngRate <= 10 ? 'text-yellow-500' : 'text-red-500'}>
                                      {line.metrics.ngRate.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">{line.metrics.violationCount}</td>
                                  <td className="p-3 text-center">{getStatusBadge(line.status)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="radar">
                    <Card>
                      <CardHeader>
                        <CardTitle>So sánh đa chiều các dây chuyền</CardTitle>
                        <CardDescription>
                          Biểu đồ Radar so sánh 4 chỉ số chính: CPK, Độ ổn định, Chất lượng, Tuân thủ
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Radar Chart */}
                          <div className="h-[450px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                                { metric: 'CPK', fullMark: 100 },
                                { metric: 'Độ ổn định', fullMark: 100 },
                                { metric: 'Chất lượng', fullMark: 100 },
                                { metric: 'Tuân thủ', fullMark: 100 },
                              ].map((item, idx) => {
                                const dataPoint: any = { metric: item.metric, fullMark: item.fullMark };
                                comparisonData?.lines.forEach((line, lineIdx) => {
                                  const values = [
                                    Math.min(line.metrics.cpk.avg * 50, 100),
                                    Math.max(100 - line.metrics.cpk.std * 100, 0),
                                    Math.max(100 - line.metrics.ngRate, 0),
                                    Math.max(100 - (line.metrics.violationCount / Math.max(line.totalAnalyses, 1)) * 100, 0),
                                  ];
                                  dataPoint[line.lineName] = values[idx];
                                });
                                return dataPoint;
                              })}>
                                <PolarGrid stroke="hsl(var(--border))" />
                                <PolarAngleAxis 
                                  dataKey="metric" 
                                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                                />
                                <PolarRadiusAxis 
                                  angle={30} 
                                  domain={[0, 100]} 
                                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                />
                                {comparisonData?.lines.map((line, index) => (
                                  <Radar
                                    key={line.lineId}
                                    name={line.lineName}
                                    dataKey={line.lineName}
                                    stroke={COLORS[index % COLORS.length]}
                                    fill={COLORS[index % COLORS.length]}
                                    fillOpacity={0.2}
                                    strokeWidth={2}
                                  />
                                ))}
                                <Legend />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'hsl(var(--card))', 
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                  }}
                                  formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                          
                          {/* Metrics Legend */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm">Giải thích các chỉ số</h4>
                            <div className="space-y-3">
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                  <span className="font-medium text-sm">CPK (Năng lực quy trình)</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Chỉ số CPK trung bình, quy đổi về thang 0-100. CPK = 2.0 tương đương 100%.
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                  <span className="font-medium text-sm">Độ ổn định</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Đánh giá dựa trên độ lệch chuẩn của CPK. Độ lệch thấp = ổn định cao.
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                  <span className="font-medium text-sm">Chất lượng</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Tính từ tỷ lệ NG. Tỷ lệ NG thấp = chất lượng cao.
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                  <span className="font-medium text-sm">Tuân thủ</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Tỷ lệ không vi phạm quy tắc SPC. Ít vi phạm = tuân thủ cao.
                                </p>
                              </div>
                            </div>
                            
                            {/* Quick Stats */}
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="font-semibold text-sm mb-3">Tổng quan nhanh</h4>
                              <div className="space-y-2">
                                {comparisonData?.lines.map((line, index) => {
                                  const avgScore = (
                                    Math.min(line.metrics.cpk.avg * 50, 100) +
                                    Math.max(100 - line.metrics.cpk.std * 100, 0) +
                                    Math.max(100 - line.metrics.ngRate, 0) +
                                    Math.max(100 - (line.metrics.violationCount / Math.max(line.totalAnalyses, 1)) * 100, 0)
                                  ) / 4;
                                  return (
                                    <div key={line.lineId} className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded-full" 
                                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        ></div>
                                        <span className="text-sm">{line.lineName}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                          <div 
                                            className="h-full rounded-full transition-all"
                                            style={{ 
                                              width: `${avgScore}%`,
                                              backgroundColor: COLORS[index % COLORS.length]
                                            }}
                                          ></div>
                                        </div>
                                        <span className="text-sm font-medium w-12 text-right">
                                          {avgScore.toFixed(0)}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
