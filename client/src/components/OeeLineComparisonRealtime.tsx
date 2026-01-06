import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Factory, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  BarChart3,
  LineChart as LineChartIcon,
  Activity,
  AlertTriangle,
  CheckCircle,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LineOeeData {
  lineId: number;
  lineName: string;
  lineCode: string;
  currentOee: number;
  targetOee: number;
  availability: number;
  performance: number;
  quality: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  lastUpdated: string;
}

interface OeeTrendPoint {
  time: string;
  timestamp: number;
  [key: string]: string | number;
}

const LINE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// Export Dropdown Component
function ExportDropdown({ lineIds, timeRange, disabled }: { lineIds: number[]; timeRange: string; disabled: boolean }) {
  const exportExcel = trpc.oee.exportLineComparisonExcel.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.success('Đã xuất file Excel thành công');
    },
    onError: (error) => toast.error('Lỗi xuất Excel: ' + error.message),
  });

  const exportPdf = trpc.oee.exportLineComparisonPdf.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.success('Đã xuất báo cáo thành công');
    },
    onError: (error) => toast.error('Lỗi xuất báo cáo: ' + error.message),
  });

  const isExporting = exportExcel.isPending || exportPdf.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={disabled || isExporting}>
          <Download className={`h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportExcel.mutate({ lineIds, timeRange })} disabled={exportExcel.isPending}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Xuất Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportPdf.mutate({ lineIds, timeRange })} disabled={exportPdf.isPending}>
          <FileText className="h-4 w-4 mr-2" />
          Xuất PDF/HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function OeeLineComparisonRealtime({ className = '' }: { className?: string }) {
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '4h' | '8h' | '24h'>('4h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('bar');
  
  // Store OEE history for trend chart
  const [oeeHistory, setOeeHistory] = useState<Map<number, OeeTrendPoint[]>>(new Map());

  // Fetch production lines
  const { data: productionLines, isLoading: loadingLines } = trpc.productionLine.list.useQuery();

  // Fetch OEE data for selected lines
  const { data: oeeData, isLoading: loadingOee, refetch: refetchOee } = trpc.oee.getRealtimeOeeByLines.useQuery(
    { lineIds: selectedLines },
    { enabled: selectedLines.length > 0, refetchInterval: autoRefresh ? 30000 : false }
  );

  // Update OEE history when data changes
  useEffect(() => {
    if (!oeeData || oeeData.length === 0) return;

    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    setOeeHistory(prev => {
      const newHistory = new Map(prev);
      
      oeeData.forEach((line: LineOeeData) => {
        const lineHistory = newHistory.get(line.lineId) || [];
        
        // Add new point
        const newPoint: OeeTrendPoint = {
          time: timeStr,
          timestamp: now,
          [line.lineCode]: line.currentOee,
        };
        
        lineHistory.push(newPoint);
        
        // Keep only points within time range
        const rangeMs = timeRange === '1h' ? 3600000 : timeRange === '4h' ? 14400000 : timeRange === '8h' ? 28800000 : 86400000;
        const cutoff = now - rangeMs;
        const filteredHistory = lineHistory.filter(p => p.timestamp >= cutoff);
        
        newHistory.set(line.lineId, filteredHistory);
      });
      
      return newHistory;
    });
  }, [oeeData, timeRange]);

  // Toggle line selection
  const toggleLine = (lineId: number) => {
    setSelectedLines(prev => {
      if (prev.includes(lineId)) {
        return prev.filter(id => id !== lineId);
      }
      if (prev.length >= 8) {
        toast.error('Tối đa 8 dây chuyền để so sánh');
        return prev;
      }
      return [...prev, lineId];
    });
  };

  // Prepare bar chart data
  const barChartData = useMemo(() => {
    if (!oeeData) return [];
    return oeeData.map((line: LineOeeData) => ({
      name: line.lineCode,
      fullName: line.lineName,
      oee: line.currentOee,
      availability: line.availability,
      performance: line.performance,
      quality: line.quality,
      target: line.targetOee,
    }));
  }, [oeeData]);

  // Prepare line chart data
  const lineChartData = useMemo(() => {
    if (selectedLines.length === 0) return [];
    
    // Merge all history points
    const allPoints: Map<number, OeeTrendPoint> = new Map();
    
    selectedLines.forEach(lineId => {
      const history = oeeHistory.get(lineId) || [];
      history.forEach(point => {
        const existing = allPoints.get(point.timestamp) || { time: point.time, timestamp: point.timestamp };
        allPoints.set(point.timestamp, { ...existing, ...point });
      });
    });
    
    return Array.from(allPoints.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [selectedLines, oeeHistory]);

  // Prepare radar chart data
  const radarChartData = useMemo(() => {
    if (!oeeData || oeeData.length === 0) return [];
    
    return [
      { metric: 'OEE', ...Object.fromEntries(oeeData.map((l: LineOeeData) => [l.lineCode, l.currentOee])) },
      { metric: 'Availability', ...Object.fromEntries(oeeData.map((l: LineOeeData) => [l.lineCode, l.availability])) },
      { metric: 'Performance', ...Object.fromEntries(oeeData.map((l: LineOeeData) => [l.lineCode, l.performance])) },
      { metric: 'Quality', ...Object.fromEntries(oeeData.map((l: LineOeeData) => [l.lineCode, l.quality])) },
    ];
  }, [oeeData]);

  // Render trend indicator
  const TrendIndicator = ({ trend, changePercent }: { trend: string; changePercent: number }) => {
    if (trend === 'up') return <span className="flex items-center text-green-500 text-xs"><TrendingUp className="h-3 w-3 mr-1" />+{changePercent.toFixed(1)}%</span>;
    if (trend === 'down') return <span className="flex items-center text-red-500 text-xs"><TrendingDown className="h-3 w-3 mr-1" />-{changePercent.toFixed(1)}%</span>;
    return <span className="flex items-center text-gray-400 text-xs"><Minus className="h-3 w-3 mr-1" />0%</span>;
  };

  // Get OEE status color
  const getOeeStatus = (oee: number, target: number) => {
    if (oee >= target) return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
    if (oee >= target * 0.9) return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle };
    return { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle };
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-blue-500" />
              So sánh OEE Dây chuyền Realtime
            </CardTitle>
            <CardDescription>
              So sánh OEE giữa các dây chuyền theo thời gian thực
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v: '1h' | '4h' | '8h' | '24h') => setTimeRange(v)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 giờ</SelectItem>
                <SelectItem value="4h">4 giờ</SelectItem>
                <SelectItem value="8h">8 giờ</SelectItem>
                <SelectItem value="24h">24 giờ</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetchOee()} disabled={loadingOee}>
              <RefreshCw className={`h-4 w-4 ${loadingOee ? 'animate-spin' : ''}`} />
            </Button>
            <ExportDropdown lineIds={selectedLines} timeRange={timeRange} disabled={selectedLines.length === 0} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Line Selection */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Dây chuyền ({selectedLines.length}/8)</Label>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="autoRefresh" 
                    checked={autoRefresh} 
                    onCheckedChange={(v) => setAutoRefresh(!!v)} 
                  />
                  <Label htmlFor="autoRefresh" className="text-xs">Auto</Label>
                </div>
              </div>
              
              <ScrollArea className="h-[400px] pr-4">
                {loadingLines ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {productionLines?.map((line, index) => {
                      const isSelected = selectedLines.includes(line.id);
                      const lineOee = oeeData?.find((d: LineOeeData) => d.lineId === line.id);
                      const status = lineOee ? getOeeStatus(lineOee.currentOee, lineOee.targetOee) : null;
                      
                      return (
                        <div
                          key={line.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => toggleLine(line.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: LINE_COLORS[selectedLines.indexOf(line.id) % LINE_COLORS.length] }}
                                />
                              )}
                              <div>
                                <div className="font-medium text-sm">{line.code}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[120px]">{line.name}</div>
                              </div>
                            </div>
                            {lineOee && (
                              <div className="text-right">
                                <div className={`font-bold ${status?.color}`}>{lineOee.currentOee.toFixed(1)}%</div>
                                <TrendIndicator trend={lineOee.trend} changePercent={lineOee.changePercent} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Charts */}
          <div className="lg:col-span-3">
            {selectedLines.length === 0 ? (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chọn dây chuyền để xem so sánh OEE</p>
                </div>
              </div>
            ) : loadingOee ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="bar"><BarChart3 className="h-4 w-4 mr-1" />Bar Chart</TabsTrigger>
                  <TabsTrigger value="line"><LineChartIcon className="h-4 w-4 mr-1" />Trend</TabsTrigger>
                  <TabsTrigger value="radar"><Activity className="h-4 w-4 mr-1" />Radar</TabsTrigger>
                </TabsList>

                <TabsContent value="bar">
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip 
                          formatter={(value: number) => `${value.toFixed(1)}%`}
                          labelFormatter={(label) => barChartData.find(d => d.name === label)?.fullName || label}
                        />
                        <Legend />
                        <ReferenceLine x={85} stroke="#22c55e" strokeDasharray="3 3" label="Target" />
                        <Bar dataKey="oee" name="OEE" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="availability" name="Availability" fill="#22c55e" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="performance" name="Performance" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="quality" name="Quality" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="line">
                  <div className="h-[350px]">
                    {lineChartData.length < 2 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
                          <p>Đang thu thập dữ liệu trend...</p>
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(value: number) => `${value?.toFixed(1)}%`} />
                          <Legend />
                          <ReferenceLine y={85} stroke="#22c55e" strokeDasharray="3 3" label="Target" />
                          {selectedLines.map((lineId, index) => {
                            const line = productionLines?.find(l => l.id === lineId);
                            return (
                              <Line
                                key={lineId}
                                type="monotone"
                                dataKey={line?.code || `Line ${lineId}`}
                                name={line?.name || `Line ${lineId}`}
                                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                                strokeWidth={2}
                                dot={false}
                                connectNulls
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="radar">
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarChartData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis domain={[0, 100]} />
                        <Tooltip formatter={(value: number) => `${value?.toFixed(1)}%`} />
                        <Legend />
                        {selectedLines.map((lineId, index) => {
                          const line = productionLines?.find(l => l.id === lineId);
                          return (
                            <Radar
                              key={lineId}
                              name={line?.name || `Line ${lineId}`}
                              dataKey={line?.code || `Line ${lineId}`}
                              stroke={LINE_COLORS[index % LINE_COLORS.length]}
                              fill={LINE_COLORS[index % LINE_COLORS.length]}
                              fillOpacity={0.2}
                            />
                          );
                        })}
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {/* Summary Cards */}
            {oeeData && oeeData.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {oeeData.slice(0, 4).map((line: LineOeeData, index: number) => {
                  const status = getOeeStatus(line.currentOee, line.targetOee);
                  const StatusIcon = status.icon;
                  return (
                    <div key={line.lineId} className={`p-3 rounded-lg ${status.bg}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{line.lineCode}</span>
                        <StatusIcon className={`h-4 w-4 ${status.color}`} />
                      </div>
                      <div className={`text-2xl font-bold ${status.color}`}>{line.currentOee.toFixed(1)}%</div>
                      <TrendIndicator trend={line.trend} changePercent={line.changePercent} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
