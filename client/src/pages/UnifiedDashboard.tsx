import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import TimePeriodComparison from "@/components/TimePeriodComparison";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  Target,
  Gauge,
  Factory,
  RefreshCw,
  Download,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  ComposedChart,
  Area,
} from "recharts";

export default function UnifiedDashboard() {
  const [timeRange, setTimeRange] = useState("30");
  const [compareBy, setCompareBy] = useState<"line" | "workstation">("line");
  const [selectedTab, setSelectedTab] = useState("overview");

  // Queries
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: oeeRecords, isLoading: oeeLoading } = trpc.oee.listRecords.useQuery({
    limit: 1000,
  });
  const { data: spcHistory, isLoading: cpkLoading } = trpc.spc.getAnalysisHistory.useQuery({
    limit: 500,
  });
  const { data: machines } = trpc.machine.list.useQuery();

  // Process data for unified view
  const unifiedData = useMemo(() => {
    if (!oeeRecords || !spcHistory || !machines) return null;

    const now = new Date();
    const daysBack = parseInt(timeRange);
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Filter OEE records
    const filteredOee = oeeRecords.filter(r => new Date(r.recordDate) >= startDate);
    
    // Filter CPK records
    const filteredCpk = spcHistory.filter(r => new Date(r.createdAt) >= startDate);

    // Group by machine/line
    const machineStats: Record<number, {
      id: number;
      name: string;
      lineId?: number;
      lineName?: string;
      avgOee: number;
      avgCpk: number;
      oeeCount: number;
      cpkCount: number;
      oeeRecords: typeof filteredOee;
      cpkRecords: typeof filteredCpk;
    }> = {};

    // Process OEE
    filteredOee.forEach(r => {
      if (!machineStats[r.machineId]) {
        const machine = machines.find(m => m.id === r.machineId);
        machineStats[r.machineId] = {
          id: r.machineId,
          name: machine?.name || `Machine ${r.machineId}`,
          lineId: machine?.workstationId || undefined,
          avgOee: 0,
          avgCpk: 0,
          oeeCount: 0,
          cpkCount: 0,
          oeeRecords: [],
          cpkRecords: [],
        };
      }
      machineStats[r.machineId].oeeRecords.push(r);
    });

    // Calculate OEE averages
    Object.values(machineStats).forEach(stat => {
      if (stat.oeeRecords.length > 0) {
        stat.avgOee = stat.oeeRecords.reduce((sum, r) => sum + Number(r.oee), 0) / stat.oeeRecords.length;
        stat.oeeCount = stat.oeeRecords.length;
      }
    });

    // Process CPK (map by station/product to machines)
    filteredCpk.forEach(r => {
      // Find matching machine by station name
      const machine = machines.find(m => 
        m.name?.toLowerCase().includes(r.stationName?.toLowerCase() || '') ||
        r.stationName?.toLowerCase().includes(m.name?.toLowerCase() || '')
      );
      
      if (machine && machineStats[machine.id]) {
        machineStats[machine.id].cpkRecords.push(r);
      }
    });

    // Calculate CPK averages
    Object.values(machineStats).forEach(stat => {
      if (stat.cpkRecords.length > 0) {
        stat.avgCpk = stat.cpkRecords.reduce((sum, r) => sum + Number(r.cpk || 0), 0) / stat.cpkRecords.length;
        stat.cpkCount = stat.cpkRecords.length;
      }
    });

    // Get line names
    Object.values(machineStats).forEach(stat => {
      if (stat.lineId && productionLines) {
        const line = productionLines.find(l => l.id === stat.lineId);
        stat.lineName = line?.name;
      }
    });

    // Calculate overall stats
    const allStats = Object.values(machineStats).filter(s => s.oeeCount > 0 || s.cpkCount > 0);
    const overallOee = allStats.reduce((sum, s) => sum + s.avgOee, 0) / (allStats.filter(s => s.oeeCount > 0).length || 1);
    const overallCpk = allStats.reduce((sum, s) => sum + s.avgCpk, 0) / (allStats.filter(s => s.cpkCount > 0).length || 1);

    // Identify alerts
    const alerts = allStats.filter(s => 
      (s.avgOee > 0 && s.avgOee < 70) || 
      (s.avgCpk > 0 && s.avgCpk < 1.0)
    );

    const warnings = allStats.filter(s => 
      (s.avgOee >= 70 && s.avgOee < 85) || 
      (s.avgCpk >= 1.0 && s.avgCpk < 1.33)
    );

    // Correlation data for scatter plot
    const correlationData = allStats
      .filter(s => s.avgOee > 0 && s.avgCpk > 0)
      .map(s => ({
        name: s.name,
        oee: s.avgOee,
        cpk: s.avgCpk,
      }));

    // Time series data
    const timeSeriesData: Record<string, { date: string; oee: number; cpk: number; oeeCount: number; cpkCount: number }> = {};
    
    filteredOee.forEach(r => {
      const date = new Date(r.recordDate).toISOString().split('T')[0];
      if (!timeSeriesData[date]) {
        timeSeriesData[date] = { date, oee: 0, cpk: 0, oeeCount: 0, cpkCount: 0 };
      }
      timeSeriesData[date].oee += Number(r.oee);
      timeSeriesData[date].oeeCount++;
    });

    filteredCpk.forEach(r => {
      const date = new Date(r.createdAt).toISOString().split('T')[0];
      if (!timeSeriesData[date]) {
        timeSeriesData[date] = { date, oee: 0, cpk: 0, oeeCount: 0, cpkCount: 0 };
      }
      timeSeriesData[date].cpk += Number(r.cpk || 0);
      timeSeriesData[date].cpkCount++;
    });

    const timeSeries = Object.values(timeSeriesData)
      .map(d => ({
        date: d.date,
        oee: d.oeeCount > 0 ? d.oee / d.oeeCount : null,
        cpk: d.cpkCount > 0 ? d.cpk / d.cpkCount : null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      machineStats: allStats,
      overallOee,
      overallCpk,
      alerts,
      warnings,
      correlationData,
      timeSeries,
      totalMachines: allStats.length,
      totalOeeRecords: filteredOee.length,
      totalCpkRecords: filteredCpk.length,
    };
  }, [oeeRecords, spcHistory, machines, productionLines, timeRange]);

  const isLoading = oeeLoading || cpkLoading;

  // Get OEE status
  const getOeeStatus = (oee: number) => {
    if (oee >= 85) return { color: "text-green-500", bg: "bg-green-100", label: "Tốt" };
    if (oee >= 70) return { color: "text-yellow-500", bg: "bg-yellow-100", label: "Cảnh báo" };
    return { color: "text-red-500", bg: "bg-red-100", label: "Kém" };
  };

  // Get CPK status
  const getCpkStatus = (cpk: number) => {
    if (cpk >= 1.67) return { color: "text-green-500", bg: "bg-green-100", label: "Xuất sắc" };
    if (cpk >= 1.33) return { color: "text-blue-500", bg: "bg-blue-100", label: "Tốt" };
    if (cpk >= 1.0) return { color: "text-yellow-500", bg: "bg-yellow-100", label: "Chấp nhận" };
    return { color: "text-red-500", bg: "bg-red-100", label: "Cần cải thiện" };
  };

  // Get combined status
  const getCombinedStatus = (oee: number, cpk: number) => {
    const oeeGood = oee >= 85;
    const cpkGood = cpk >= 1.33;
    
    if (oeeGood && cpkGood) return { color: "text-green-500", icon: CheckCircle, label: "Xuất sắc" };
    if (oeeGood || cpkGood) return { color: "text-yellow-500", icon: AlertTriangle, label: "Cần chú ý" };
    return { color: "text-red-500", icon: AlertTriangle, label: "Cần cải thiện" };
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Dashboard Tổng hợp OEE & CPK
          </h1>
          <p className="text-muted-foreground mt-1">
            So sánh và phân tích hiệu suất thiết bị (OEE) và năng lực quy trình (CPK)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="14">14 ngày</SelectItem>
              <SelectItem value="30">30 ngày</SelectItem>
              <SelectItem value="60">60 ngày</SelectItem>
              <SelectItem value="90">90 ngày</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              OEE Trung bình
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${unifiedData ? getOeeStatus(unifiedData.overallOee).color : ''}`}>
                {unifiedData ? unifiedData.overallOee.toFixed(1) : '--'}%
              </span>
              {unifiedData && (
                <Badge variant="outline" className={getOeeStatus(unifiedData.overallOee).bg}>
                  {getOeeStatus(unifiedData.overallOee).label}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {unifiedData?.totalOeeRecords || 0} bản ghi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              CPK Trung bình
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${unifiedData ? getCpkStatus(unifiedData.overallCpk).color : ''}`}>
                {unifiedData ? unifiedData.overallCpk.toFixed(3) : '--'}
              </span>
              {unifiedData && (
                <Badge variant="outline" className={getCpkStatus(unifiedData.overallCpk).bg}>
                  {getCpkStatus(unifiedData.overallCpk).label}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {unifiedData?.totalCpkRecords || 0} phân tích
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Cảnh báo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-red-500">
                {unifiedData?.alerts.length || 0}
              </span>
              <span className="text-sm text-muted-foreground">máy</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              OEE &lt; 70% hoặc CPK &lt; 1.0
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Factory className="h-4 w-4" />
              Thiết bị theo dõi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {unifiedData?.totalMachines || 0}
              </span>
              <span className="text-sm text-muted-foreground">máy</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {unifiedData?.warnings.length || 0} cần chú ý
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="comparison">So sánh</TabsTrigger>
          <TabsTrigger value="correlation">Tương quan</TabsTrigger>
          <TabsTrigger value="ranking">Xếp hạng</TabsTrigger>
          <TabsTrigger value="alerts">Cảnh báo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Time Series Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng OEE & CPK theo thời gian</CardTitle>
              <CardDescription>So sánh biến động OEE và CPK trong {timeRange} ngày qua</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {unifiedData && unifiedData.timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={unifiedData.timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      />
                      <YAxis 
                        yAxisId="oee" 
                        orientation="left" 
                        domain={[0, 100]}
                        label={{ value: 'OEE (%)', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis 
                        yAxisId="cpk" 
                        orientation="right" 
                        domain={[0, 2.5]}
                        label={{ value: 'CPK', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          name === 'oee' ? `${Number(value).toFixed(1)}%` : Number(value).toFixed(3),
                          name === 'oee' ? 'OEE' : 'CPK'
                        ]}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('vi-VN')}
                      />
                      <Legend />
                      <ReferenceLine yAxisId="oee" y={85} stroke="#22c55e" strokeDasharray="3 3" label="OEE Target" />
                      <ReferenceLine yAxisId="cpk" y={1.33} stroke="#3b82f6" strokeDasharray="3 3" label="CPK Target" />
                      <Area 
                        yAxisId="oee" 
                        type="monotone" 
                        dataKey="oee" 
                        fill="#3b82f6" 
                        fillOpacity={0.2} 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="OEE"
                        connectNulls
                      />
                      <Line 
                        yAxisId="cpk" 
                        type="monotone" 
                        dataKey="cpk" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        dot={{ fill: '#22c55e' }}
                        name="CPK"
                        connectNulls
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {isLoading ? "Đang tải dữ liệu..." : "Không có dữ liệu"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <TimePeriodComparison />
        </TabsContent>

        <TabsContent value="correlation" className="space-y-4">
          {/* Correlation Scatter Plot */}
          <Card>
            <CardHeader>
              <CardTitle>Tương quan OEE - CPK</CardTitle>
              <CardDescription>
                Phân tích mối quan hệ giữa hiệu suất thiết bị và năng lực quy trình
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                {unifiedData && unifiedData.correlationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        dataKey="oee" 
                        name="OEE" 
                        domain={[0, 100]}
                        label={{ value: 'OEE (%)', position: 'bottom' }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="cpk" 
                        name="CPK" 
                        domain={[0, 2.5]}
                        label={{ value: 'CPK', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value: any, name: string) => [
                          name === 'OEE' ? `${Number(value).toFixed(1)}%` : Number(value).toFixed(3),
                          name
                        ]}
                      />
                      <ReferenceLine x={85} stroke="#22c55e" strokeDasharray="3 3" />
                      <ReferenceLine y={1.33} stroke="#3b82f6" strokeDasharray="3 3" />
                      <Scatter 
                        name="Máy" 
                        data={unifiedData.correlationData} 
                        fill="#8884d8"
                      >
                        {unifiedData.correlationData.map((entry, index) => {
                          const status = getCombinedStatus(entry.oee, entry.cpk);
                          const color = entry.oee >= 85 && entry.cpk >= 1.33 ? '#22c55e' :
                                        entry.oee < 70 || entry.cpk < 1.0 ? '#dc2626' : '#f59e0b';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {isLoading ? "Đang tải dữ liệu..." : "Không có dữ liệu tương quan"}
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">OEE ≥ 85% & CPK ≥ 1.33</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">Cần chú ý</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">OEE &lt; 70% hoặc CPK &lt; 1.0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking" className="space-y-4">
          {/* Ranking Table */}
          <Card>
            <CardHeader>
              <CardTitle>Xếp hạng tổng hợp</CardTitle>
              <CardDescription>So sánh OEE và CPK theo từng thiết bị</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Hạng</th>
                      <th className="text-left p-3">Thiết bị</th>
                      <th className="text-center p-3">OEE</th>
                      <th className="text-center p-3">CPK</th>
                      <th className="text-center p-3">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unifiedData?.machineStats
                      .sort((a, b) => {
                        // Sort by combined score (OEE normalized + CPK normalized)
                        const scoreA = (a.avgOee / 100) + (a.avgCpk / 2);
                        const scoreB = (b.avgOee / 100) + (b.avgCpk / 2);
                        return scoreB - scoreA;
                      })
                      .map((stat, index) => {
                        const status = getCombinedStatus(stat.avgOee, stat.avgCpk);
                        return (
                          <tr key={stat.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 font-medium">{index + 1}</td>
                            <td className="p-3">
                              <div>
                                <div className="font-medium">{stat.name}</div>
                                {stat.lineName && (
                                  <div className="text-sm text-muted-foreground">{stat.lineName}</div>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {stat.avgOee > 0 ? (
                                <div className="flex items-center justify-center gap-2">
                                  <span className={`font-medium ${getOeeStatus(stat.avgOee).color}`}>
                                    {stat.avgOee.toFixed(1)}%
                                  </span>
                                  <Badge variant="outline" className={`text-xs ${getOeeStatus(stat.avgOee).bg}`}>
                                    {stat.oeeCount}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">--</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {stat.avgCpk > 0 ? (
                                <div className="flex items-center justify-center gap-2">
                                  <span className={`font-medium ${getCpkStatus(stat.avgCpk).color}`}>
                                    {stat.avgCpk.toFixed(3)}
                                  </span>
                                  <Badge variant="outline" className={`text-xs ${getCpkStatus(stat.avgCpk).bg}`}>
                                    {stat.cpkCount}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">--</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className={`flex items-center justify-center gap-1 ${status.color}`}>
                                <status.icon className="h-4 w-4" />
                                <span className="text-sm">{status.label}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {/* Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Cảnh báo nghiêm trọng
                </CardTitle>
                <CardDescription>Thiết bị có OEE &lt; 70% hoặc CPK &lt; 1.0</CardDescription>
              </CardHeader>
              <CardContent>
                {unifiedData?.alerts && unifiedData.alerts.length > 0 ? (
                  <div className="space-y-3">
                    {unifiedData.alerts.map(alert => (
                      <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <div className="font-medium">{alert.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {alert.lineName || 'Không xác định'}
                          </div>
                        </div>
                        <div className="text-right">
                          {alert.avgOee > 0 && alert.avgOee < 70 && (
                            <div className="text-red-600 font-medium">
                              OEE: {alert.avgOee.toFixed(1)}%
                            </div>
                          )}
                          {alert.avgCpk > 0 && alert.avgCpk < 1.0 && (
                            <div className="text-red-600 font-medium">
                              CPK: {alert.avgCpk.toFixed(3)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>Không có cảnh báo nghiêm trọng</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <Activity className="h-5 w-5" />
                  Cần chú ý
                </CardTitle>
                <CardDescription>Thiết bị có OEE 70-85% hoặc CPK 1.0-1.33</CardDescription>
              </CardHeader>
              <CardContent>
                {unifiedData?.warnings && unifiedData.warnings.length > 0 ? (
                  <div className="space-y-3">
                    {unifiedData.warnings.map(warning => (
                      <div key={warning.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div>
                          <div className="font-medium">{warning.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {warning.lineName || 'Không xác định'}
                          </div>
                        </div>
                        <div className="text-right">
                          {warning.avgOee >= 70 && warning.avgOee < 85 && (
                            <div className="text-yellow-600 font-medium">
                              OEE: {warning.avgOee.toFixed(1)}%
                            </div>
                          )}
                          {warning.avgCpk >= 1.0 && warning.avgCpk < 1.33 && (
                            <div className="text-yellow-600 font-medium">
                              CPK: {warning.avgCpk.toFixed(3)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>Tất cả thiết bị hoạt động tốt</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Combined Alert Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Tổng hợp cảnh báo kép</CardTitle>
              <CardDescription>Thiết bị có cả OEE và CPK cần cải thiện</CardDescription>
            </CardHeader>
            <CardContent>
              {unifiedData?.machineStats.filter(s => 
                s.avgOee > 0 && s.avgOee < 85 && s.avgCpk > 0 && s.avgCpk < 1.33
              ).length ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Thiết bị</th>
                        <th className="text-center p-3">OEE</th>
                        <th className="text-center p-3">CPK</th>
                        <th className="text-left p-3">Khuyến nghị</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unifiedData.machineStats
                        .filter(s => s.avgOee > 0 && s.avgOee < 85 && s.avgCpk > 0 && s.avgCpk < 1.33)
                        .map(stat => (
                          <tr key={stat.id} className="border-b">
                            <td className="p-3 font-medium">{stat.name}</td>
                            <td className={`p-3 text-center ${getOeeStatus(stat.avgOee).color}`}>
                              {stat.avgOee.toFixed(1)}%
                            </td>
                            <td className={`p-3 text-center ${getCpkStatus(stat.avgCpk).color}`}>
                              {stat.avgCpk.toFixed(3)}
                            </td>
                            <td className="p-3 text-sm">
                              {stat.avgOee < 70 && stat.avgCpk < 1.0 
                                ? "Ưu tiên cao: Kiểm tra toàn diện thiết bị và quy trình"
                                : stat.avgOee < 70 
                                ? "Tập trung cải thiện hiệu suất thiết bị"
                                : stat.avgCpk < 1.0
                                ? "Tập trung cải thiện năng lực quy trình"
                                : "Theo dõi và duy trì ổn định"
                              }
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Không có thiết bị nào cần cải thiện cả OEE và CPK</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
