import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, CheckCircle2, XCircle, Factory, 
  Layers, RefreshCw, Loader2, Brain, Camera, Gauge
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useFloorPlanSSE, useAviAoiSSE } from "@/hooks/useRealtimeSSE";

export default function UnifiedRealtimeDashboard() {
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // SSE hooks for real-time data
  const { 
    machines: floorPlanMachines, 
    isConnected: floorPlanConnected,
    lastUpdate: floorPlanLastUpdate 
  } = useFloorPlanSSE();
  
  const { 
    inspections: aviAoiInspections,
    isConnected: aviAoiConnected,
    lastUpdate: aviAoiLastUpdate
  } = useAviAoiSSE();

  // Query AI Vision stats
  const aiVisionStats = trpc.vision.getAnalysisStats.useQuery({
    days: 1,
  }, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Query recent AI Vision history
  const aiVisionHistory = trpc.vision.getAnalysisHistory.useQuery({
    page: 1,
    pageSize: 10,
  }, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Query machine status from tRPC
  const machineStatusQuery = trpc.realtime.getMachinesWithStatus.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Query inspection data
  const inspectionDataQuery = trpc.realtime.getInspectionData.useQuery({
    limit: 20,
  }, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Combine data sources
  const machines = useMemo(() => {
    if (machineStatusQuery.data) {
      return machineStatusQuery.data.map(m => ({
        id: m.id,
        name: m.name,
        status: m.status as 'running' | 'idle' | 'error' | 'maintenance',
        oee: m.oee,
        cycleTime: m.cycleTime,
        lastUpdate: new Date(m.lastUpdate || Date.now()),
      }));
    }
    return floorPlanMachines.map(m => ({
      id: m.id,
      name: m.name || `Machine ${m.id}`,
      status: m.status as 'running' | 'idle' | 'error' | 'maintenance',
      oee: m.oee,
      cycleTime: m.cycleTime,
      lastUpdate: new Date(),
    }));
  }, [machineStatusQuery.data, floorPlanMachines]);

  const inspections = useMemo(() => {
    if (inspectionDataQuery.data) {
      return inspectionDataQuery.data.map(i => ({
        id: i.id,
        machineId: i.machineId,
        result: i.result as 'pass' | 'fail',
        defectCount: i.defectCount,
        timestamp: new Date(i.timestamp),
        inspectionType: i.inspectionType as 'AVI' | 'AOI',
      }));
    }
    return aviAoiInspections.map(i => ({
      id: i.id,
      machineId: i.machineId,
      result: i.result as 'pass' | 'fail',
      defectCount: i.defectCount,
      timestamp: new Date(i.timestamp),
      inspectionType: i.inspectionType as 'AVI' | 'AOI',
    }));
  }, [inspectionDataQuery.data, aviAoiInspections]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const runningMachines = machines.filter(m => m.status === 'running').length;
    const errorMachines = machines.filter(m => m.status === 'error').length;
    const avgOee = machines.length > 0 
      ? machines.reduce((sum, m) => sum + (m.oee || 0), 0) / machines.length 
      : 0;
    
    const recentInspections = inspections.slice(0, 100);
    const passedInspections = recentInspections.filter(i => i.result === 'pass').length;
    const inspectionPassRate = recentInspections.length > 0 
      ? (passedInspections / recentInspections.length) * 100 
      : 0;
    
    const aiStats = aiVisionStats.data || {
      totalAnalyses: 0,
      passCount: 0,
      failCount: 0,
      warningCount: 0,
      passRate: 0,
      avgQualityScore: 0,
    };

    return {
      totalMachines: machines.length,
      runningMachines,
      errorMachines,
      avgOee,
      totalInspections: recentInspections.length,
      inspectionPassRate,
      aiVisionTotal: aiStats.totalAnalyses,
      aiVisionPassRate: aiStats.passRate,
      aiVisionAvgQuality: aiStats.avgQualityScore,
    };
  }, [machines, inspections, aiVisionStats.data]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'maintenance': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running': return 'Đang chạy';
      case 'idle': return 'Chờ';
      case 'error': return 'Lỗi';
      case 'maintenance': return 'Bảo trì';
      default: return 'N/A';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Layers className="h-8 w-8 text-primary" />
              Dashboard Tổng Hợp Realtime
            </h1>
            <p className="text-muted-foreground mt-1">
              Giám sát tất cả nguồn dữ liệu: Floor Plan, AVI/AOI, AI Vision
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${floorPlanConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">Floor Plan</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${aviAoiConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">AVI/AOI</span>
            </div>
            <Select value={String(refreshInterval)} onValueChange={(v) => setRefreshInterval(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2000">2 giây</SelectItem>
                <SelectItem value="5000">5 giây</SelectItem>
                <SelectItem value="10000">10 giây</SelectItem>
                <SelectItem value="30000">30 giây</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Đang cập nhật' : 'Tạm dừng'}
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Máy hoạt động</p>
                  <p className="text-2xl font-bold text-green-500">{summaryStats.runningMachines}</p>
                </div>
                <Factory className="h-8 w-8 text-green-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">/{summaryStats.totalMachines} tổng</p>
            </CardContent>
          </Card>
          
          <Card className={summaryStats.errorMachines > 0 ? 'border-red-500/50' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Máy lỗi</p>
                  <p className={`text-2xl font-bold ${summaryStats.errorMachines > 0 ? 'text-red-500' : ''}`}>
                    {summaryStats.errorMachines}
                  </p>
                </div>
                <AlertTriangle className={`h-8 w-8 ${summaryStats.errorMachines > 0 ? 'text-red-500' : 'text-muted-foreground/50'}`} />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">OEE Trung bình</p>
                  <p className="text-2xl font-bold">{summaryStats.avgOee.toFixed(1)}%</p>
                </div>
                <Gauge className="h-8 w-8 text-primary/50" />
              </div>
              <Progress value={summaryStats.avgOee} className="h-1 mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Kiểm tra AVI/AOI</p>
                  <p className="text-2xl font-bold">{summaryStats.totalInspections}</p>
                </div>
                <Camera className="h-8 w-8 text-blue-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pass: {summaryStats.inspectionPassRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">AI Vision</p>
                  <p className="text-2xl font-bold">{summaryStats.aiVisionTotal}</p>
                </div>
                <Brain className="h-8 w-8 text-purple-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pass: {summaryStats.aiVisionPassRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chất lượng AI</p>
                  <p className="text-2xl font-bold">{summaryStats.aiVisionAvgQuality.toFixed(0)}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/50" />
              </div>
              <Progress value={summaryStats.aiVisionAvgQuality} className="h-1 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="floorplan">Floor Plan</TabsTrigger>
            <TabsTrigger value="inspection">AVI/AOI</TabsTrigger>
            <TabsTrigger value="aivision">AI Vision</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Floor Plan Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="h-5 w-5" />
                    Floor Plan Status
                  </CardTitle>
                  <CardDescription>Trạng thái máy móc realtime</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {machines.slice(0, 5).map((machine) => (
                      <div key={machine.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(machine.status)}`} />
                          <span className="text-sm font-medium">{machine.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            OEE: {machine.oee?.toFixed(0) || 'N/A'}%
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getStatusLabel(machine.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {machines.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{machines.length - 5} máy khác
                      </p>
                    )}
                    {machines.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">Chưa có dữ liệu máy</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* AVI/AOI Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    AVI/AOI Inspections
                  </CardTitle>
                  <CardDescription>Kết quả kiểm tra gần đây</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {inspections.slice(0, 10).map((inspection) => (
                        <div key={inspection.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2">
                            {inspection.result === 'pass' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm">{inspection.inspectionType}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {inspection.defectCount} lỗi
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {inspection.timestamp.toLocaleTimeString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      ))}
                      {inspections.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">Chưa có dữ liệu kiểm tra</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* AI Vision Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Vision Analysis
                  </CardTitle>
                  <CardDescription>Phân tích AI gần đây</CardDescription>
                </CardHeader>
                <CardContent>
                  {aiVisionHistory.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {aiVisionHistory.data?.items.slice(0, 10).map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <div className="flex items-center gap-2">
                              {item.status === 'pass' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : item.status === 'fail' ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              )}
                              <span className="text-sm truncate max-w-[120px]">
                                {item.serialNumber || item.analysisId}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                Q: {item.qualityScore}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.analyzedAt).toLocaleTimeString('vi-VN')}
                              </span>
                            </div>
                          </div>
                        ))}
                        {(!aiVisionHistory.data?.items || aiVisionHistory.data.items.length === 0) && (
                          <p className="text-center text-muted-foreground py-4">Chưa có dữ liệu</p>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Floor Plan Tab */}
          <TabsContent value="floorplan">
            <Card>
              <CardHeader>
                <CardTitle>Trạng thái máy móc chi tiết</CardTitle>
                <CardDescription>
                  Cập nhật lần cuối: {floorPlanLastUpdate?.toLocaleTimeString('vi-VN') || 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {machines.map((machine) => (
                    <Card key={machine.id} className={`${machine.status === 'error' ? 'border-red-500' : ''}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{machine.name}</h4>
                          <Badge className={getStatusColor(machine.status)}>
                            {getStatusLabel(machine.status)}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">OEE</span>
                            <span className="font-medium">{machine.oee?.toFixed(1) || 'N/A'}%</span>
                          </div>
                          <Progress value={machine.oee || 0} className="h-1" />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cycle Time</span>
                            <span className="font-medium">{machine.cycleTime?.toFixed(1) || 'N/A'}s</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {machines.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Chưa có dữ liệu máy móc
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AVI/AOI Tab */}
          <TabsContent value="inspection">
            <Card>
              <CardHeader>
                <CardTitle>Kết quả kiểm tra AVI/AOI</CardTitle>
                <CardDescription>
                  Cập nhật lần cuối: {aviAoiLastUpdate?.toLocaleTimeString('vi-VN') || 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-sm text-muted-foreground">Tổng kiểm tra</p>
                        <p className="text-3xl font-bold">{inspections.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-green-500/50">
                      <CardContent className="pt-4 text-center">
                        <p className="text-sm text-muted-foreground">Đạt</p>
                        <p className="text-3xl font-bold text-green-500">
                          {inspections.filter(i => i.result === 'pass').length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-red-500/50">
                      <CardContent className="pt-4 text-center">
                        <p className="text-sm text-muted-foreground">Lỗi</p>
                        <p className="text-3xl font-bold text-red-500">
                          {inspections.filter(i => i.result === 'fail').length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <p className="text-sm text-muted-foreground">Tỷ lệ đạt</p>
                        <p className="text-3xl font-bold">{summaryStats.inspectionPassRate.toFixed(1)}%</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <ScrollArea className="h-[400px]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="text-left p-2">ID</th>
                          <th className="text-left p-2">Loại</th>
                          <th className="text-left p-2">Kết quả</th>
                          <th className="text-left p-2">Số lỗi</th>
                          <th className="text-left p-2">Thời gian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspections.map((inspection) => (
                          <tr key={inspection.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-mono text-sm">{inspection.id}</td>
                            <td className="p-2">
                              <Badge variant="outline">{inspection.inspectionType}</Badge>
                            </td>
                            <td className="p-2">
                              <Badge className={inspection.result === 'pass' ? 'bg-green-500' : 'bg-red-500'}>
                                {inspection.result === 'pass' ? 'Đạt' : 'Lỗi'}
                              </Badge>
                            </td>
                            <td className="p-2">{inspection.defectCount}</td>
                            <td className="p-2 text-muted-foreground">
                              {inspection.timestamp.toLocaleString('vi-VN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {inspections.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Chưa có dữ liệu kiểm tra
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Vision Tab */}
          <TabsContent value="aivision">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Lịch sử phân tích AI Vision</CardTitle>
                </CardHeader>
                <CardContent>
                  {aiVisionHistory.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-background">
                          <tr className="border-b">
                            <th className="text-left p-2">ID</th>
                            <th className="text-left p-2">Trạng thái</th>
                            <th className="text-left p-2">Chất lượng</th>
                            <th className="text-left p-2">Số lỗi</th>
                            <th className="text-left p-2">Thời gian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiVisionHistory.data?.items.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-mono text-sm truncate max-w-[150px]">
                                {item.serialNumber || item.analysisId}
                              </td>
                              <td className="p-2">
                                <Badge className={
                                  item.status === 'pass' ? 'bg-green-500' : 
                                  item.status === 'fail' ? 'bg-red-500' : 'bg-yellow-500'
                                }>
                                  {item.status === 'pass' ? 'Đạt' : item.status === 'fail' ? 'Lỗi' : 'Cảnh báo'}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <div className="flex items-center gap-2">
                                  <Progress value={item.qualityScore} className="w-16 h-2" />
                                  <span className="text-sm">{item.qualityScore}</span>
                                </div>
                              </td>
                              <td className="p-2">{item.defectCount}</td>
                              <td className="p-2 text-muted-foreground">
                                {new Date(item.analyzedAt).toLocaleString('vi-VN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(!aiVisionHistory.data?.items || aiVisionHistory.data.items.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          Chưa có dữ liệu phân tích
                        </div>
                      )}
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thống kê AI Vision</CardTitle>
                  <CardDescription>24 giờ qua</CardDescription>
                </CardHeader>
                <CardContent>
                  {aiVisionStats.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tổng phân tích</span>
                          <span className="font-bold">{aiVisionStats.data?.totalAnalyses || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Đạt</span>
                          <span className="font-bold text-green-500">{aiVisionStats.data?.passCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Lỗi</span>
                          <span className="font-bold text-red-500">{aiVisionStats.data?.failCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cảnh báo</span>
                          <span className="font-bold text-yellow-500">{aiVisionStats.data?.warningCount || 0}</span>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tỷ lệ đạt</span>
                            <span className="font-bold">{aiVisionStats.data?.passRate.toFixed(1) || 0}%</span>
                          </div>
                          <Progress value={aiVisionStats.data?.passRate || 0} className="h-2" />
                        </div>
                        
                        <div className="space-y-2 mt-4">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Chất lượng TB</span>
                            <span className="font-bold">{aiVisionStats.data?.avgQualityScore.toFixed(0) || 0}/100</span>
                          </div>
                          <Progress value={aiVisionStats.data?.avgQualityScore || 0} className="h-2" />
                        </div>
                        
                        <div className="flex justify-between mt-4">
                          <span className="text-muted-foreground">Thời gian xử lý TB</span>
                          <span className="font-bold">{aiVisionStats.data?.avgProcessingTime.toFixed(0) || 0}ms</span>
                        </div>
                      </div>
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
