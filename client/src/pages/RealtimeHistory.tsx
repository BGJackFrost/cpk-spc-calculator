/**
 * Realtime History Page
 * Xem lịch sử dữ liệu realtime với chức năng replay và phân tích hồi cứu
 */

import { useState, useEffect, useRef, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Play, Pause, SkipBack, SkipForward, FastForward, 
  Download, Calendar, Clock, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, Search, Filter, History
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush, ComposedChart, Area } from "recharts";

interface HistoryDataPoint {
  id: number;
  timestamp: Date;
  value: number;
  ucl: number;
  lcl: number;
  mean: number;
  isViolation: boolean;
  violatedRules: string[];
}

// Generate sample history data
function generateHistoryData(startDate: Date, endDate: Date, intervalMs: number = 5000): HistoryDataPoint[] {
  const data: HistoryDataPoint[] = [];
  const baseValue = 50;
  const ucl = 55;
  const lcl = 45;
  let currentTime = startDate.getTime();
  let id = 1;
  
  while (currentTime <= endDate.getTime()) {
    const randomVariation = (Math.random() - 0.5) * 10;
    const trendComponent = Math.sin(id / 50) * 2; // Add some trend
    const value = baseValue + randomVariation + trendComponent;
    const isViolation = value > ucl || value < lcl;
    
    data.push({
      id: id++,
      timestamp: new Date(currentTime),
      value: Math.round(value * 100) / 100,
      ucl,
      lcl,
      mean: baseValue,
      isViolation,
      violatedRules: isViolation ? ['Rule 1'] : []
    });
    
    currentTime += intervalMs;
  }
  
  return data;
}

export default function RealtimeHistory() {
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    end: new Date().toISOString().slice(0, 16)
  });
  
  // Replay state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [historyData, setHistoryData] = useState<HistoryDataPoint[]>([]);
  const playbackRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch machines
  const { data: machines } = trpc.machine.listAll.useQuery();
  
  // Load history data
  const loadHistory = () => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const data = generateHistoryData(start, end, 5000);
    setHistoryData(data);
    setCurrentIndex(0);
    toast.success(`Đã tải ${data.length} điểm dữ liệu`);
  };
  
  // Playback controls
  useEffect(() => {
    if (isPlaying && historyData.length > 0) {
      const intervalMs = 100 / playbackSpeed; // Base interval adjusted by speed
      
      playbackRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= historyData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
        playbackRef.current = null;
      }
    }
    
    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, historyData.length]);
  
  // Current visible data (up to current index during replay)
  const visibleData = useMemo(() => {
    if (historyData.length === 0) return [];
    return historyData.slice(0, currentIndex + 1);
  }, [historyData, currentIndex]);
  
  // Chart data
  const chartData = useMemo(() => {
    return visibleData.map(d => ({
      time: d.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      fullTime: d.timestamp.toLocaleString('vi-VN'),
      value: d.value,
      ucl: d.ucl,
      lcl: d.lcl,
      mean: d.mean,
      isViolation: d.isViolation
    }));
  }, [visibleData]);
  
  // Statistics
  const stats = useMemo(() => {
    if (visibleData.length === 0) return null;
    
    const values = visibleData.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const violations = visibleData.filter(d => d.isViolation).length;
    
    const usl = 55;
    const lsl = 45;
    const cp = stdDev > 0 ? (usl - lsl) / (6 * stdDev) : null;
    const cpu = stdDev > 0 ? (usl - mean) / (3 * stdDev) : null;
    const cpl = stdDev > 0 ? (mean - lsl) / (3 * stdDev) : null;
    const cpk = cpu !== null && cpl !== null ? Math.min(cpu, cpl) : null;
    
    return {
      count: visibleData.length,
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: Math.round(Math.min(...values) * 100) / 100,
      max: Math.round(Math.max(...values) * 100) / 100,
      violations,
      violationRate: Math.round((violations / visibleData.length) * 10000) / 100,
      cp: cp ? Math.round(cp * 100) / 100 : null,
      cpk: cpk ? Math.round(cpk * 100) / 100 : null
    };
  }, [visibleData]);
  
  // Export to CSV
  const exportToCsv = () => {
    if (historyData.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }
    
    const headers = ['ID', 'Timestamp', 'Value', 'UCL', 'LCL', 'Mean', 'Is Violation', 'Violated Rules'];
    const rows = historyData.map(d => [
      d.id,
      d.timestamp.toISOString(),
      d.value,
      d.ucl,
      d.lcl,
      d.mean,
      d.isViolation ? 'Yes' : 'No',
      d.violatedRules.join(';')
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `realtime_history_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất file CSV");
  };
  
  // Find violations
  const violations = useMemo(() => {
    return historyData.filter(d => d.isViolation);
  }, [historyData]);
  
  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6" />
              Lịch sử Dữ liệu Realtime
            </h1>
            <p className="text-muted-foreground">Xem lại và phân tích dữ liệu theo thời gian</p>
          </div>
          <Button variant="outline" onClick={exportToCsv}>
            <Download className="h-4 w-4 mr-2" />
            Xuất CSV
          </Button>
        </div>
        
        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Máy</Label>
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn máy" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines?.map((m: { id: number; name: string }) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="demo">Demo Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Từ ngày</Label>
                <Input
                  type="datetime-local"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Đến ngày</Label>
                <Input
                  type="datetime-local"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={loadHistory} className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Tải dữ liệu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {historyData.length > 0 && (
          <>
            {/* Playback Controls */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentIndex(0)}
                      disabled={currentIndex === 0}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant={isPlaying ? "destructive" : "default"}
                      size="icon"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentIndex(historyData.length - 1)}
                      disabled={currentIndex === historyData.length - 1}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Tốc độ:</Label>
                    <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(parseInt(v))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                        <SelectItem value="5">5x</SelectItem>
                        <SelectItem value="10">10x</SelectItem>
                        <SelectItem value="20">20x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <Slider
                      value={[currentIndex]}
                      max={historyData.length - 1}
                      step={1}
                      onValueChange={([value]) => {
                        setCurrentIndex(value);
                        setIsPlaying(false);
                      }}
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground min-w-[150px] text-right">
                    {currentIndex + 1} / {historyData.length}
                    {historyData[currentIndex] && (
                      <div className="text-xs">
                        {historyData[currentIndex].timestamp.toLocaleString('vi-VN')}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Main Content */}
            <Tabs defaultValue="chart" className="space-y-4">
              <TabsList>
                <TabsTrigger value="chart">Biểu đồ</TabsTrigger>
                <TabsTrigger value="data">Dữ liệu</TabsTrigger>
                <TabsTrigger value="violations">
                  Vi phạm
                  {violations.length > 0 && (
                    <Badge variant="destructive" className="ml-2">{violations.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="analysis">Phân tích</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chart">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Control Chart - Replay</CardTitle>
                    <CardDescription>
                      Biểu đồ kiểm soát với dữ liệu lịch sử
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 10 }} 
                            interval="preserveStartEnd"
                          />
                          <YAxis domain={[40, 60]} />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-background border rounded p-2 shadow-lg">
                                    <p className="font-medium">{data.fullTime}</p>
                                    <p>Giá trị: <span className="font-mono">{data.value}</span></p>
                                    <p>UCL: {data.ucl} | LCL: {data.lcl}</p>
                                    {data.isViolation && (
                                      <Badge variant="destructive" className="mt-1">Vi phạm</Badge>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend />
                          <ReferenceLine y={55} stroke="#ef4444" strokeDasharray="5 5" label="UCL" />
                          <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="5 5" label="LCL" />
                          <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="3 3" label="CL" />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            fill="#3b82f620" 
                            stroke="none"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={(props: any) => {
                              const { cx, cy, payload, index } = props;
                              const isCurrentPoint = index === chartData.length - 1;
                              if (payload.isViolation) {
                                return <circle cx={cx} cy={cy} r={isCurrentPoint ? 6 : 4} fill="#ef4444" stroke="#ef4444" />;
                              }
                              if (isCurrentPoint) {
                                return <circle cx={cx} cy={cy} r={6} fill="#3b82f6" stroke="#fff" strokeWidth={2} />;
                              }
                              return <circle cx={cx} cy={cy} r={2} fill="#3b82f6" />;
                            }}
                            name="Giá trị"
                          />
                          <Brush dataKey="time" height={30} stroke="#8884d8" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="data">
                <Card>
                  <CardContent className="pt-4">
                    <div className="max-h-[500px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Thời gian</TableHead>
                            <TableHead className="text-right">Giá trị</TableHead>
                            <TableHead className="text-right">UCL</TableHead>
                            <TableHead className="text-right">LCL</TableHead>
                            <TableHead>Trạng thái</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historyData.slice(0, 100).map((d, idx) => (
                            <TableRow 
                              key={d.id}
                              className={idx === currentIndex ? "bg-primary/10" : d.isViolation ? "bg-red-50" : ""}
                            >
                              <TableCell>{d.id}</TableCell>
                              <TableCell>{d.timestamp.toLocaleString('vi-VN')}</TableCell>
                              <TableCell className="text-right font-mono">{d.value}</TableCell>
                              <TableCell className="text-right font-mono">{d.ucl}</TableCell>
                              <TableCell className="text-right font-mono">{d.lcl}</TableCell>
                              <TableCell>
                                {d.isViolation ? (
                                  <Badge variant="destructive">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Vi phạm
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    OK
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {historyData.length > 100 && (
                        <p className="text-center text-sm text-muted-foreground py-2">
                          Hiển thị 100/{historyData.length} bản ghi
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="violations">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Danh sách Vi phạm ({violations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {violations.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Không có vi phạm trong khoảng thời gian này
                      </p>
                    ) : (
                      <div className="max-h-[400px] overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Thời gian</TableHead>
                              <TableHead className="text-right">Giá trị</TableHead>
                              <TableHead>Loại vi phạm</TableHead>
                              <TableHead>Hành động</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {violations.map((v) => (
                              <TableRow key={v.id}>
                                <TableCell>{v.timestamp.toLocaleString('vi-VN')}</TableCell>
                                <TableCell className="text-right font-mono text-red-600">
                                  {v.value}
                                </TableCell>
                                <TableCell>
                                  {v.violatedRules.map(r => (
                                    <Badge key={r} variant="destructive" className="mr-1">
                                      {r}
                                    </Badge>
                                  ))}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const idx = historyData.findIndex(d => d.id === v.id);
                                      if (idx >= 0) {
                                        setCurrentIndex(idx);
                                        setIsPlaying(false);
                                      }
                                    }}
                                  >
                                    Xem
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="analysis">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Thống kê Tổng quan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stats && (
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Số mẫu:</span>
                            <span className="font-medium">{stats.count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Trung bình:</span>
                            <span className="font-mono">{stats.mean}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Độ lệch chuẩn:</span>
                            <span className="font-mono">{stats.stdDev}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Min / Max:</span>
                            <span className="font-mono">{stats.min} / {stats.max}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Số vi phạm:</span>
                            <span className="font-medium text-red-600">{stats.violations}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tỷ lệ vi phạm:</span>
                            <span className="font-medium text-red-600">{stats.violationRate}%</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Chỉ số Năng lực</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stats && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">CP:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-lg">{stats.cp ?? 'N/A'}</span>
                              {stats.cp && (
                                <Badge variant={stats.cp >= 1.33 ? "default" : "destructive"}>
                                  {stats.cp >= 1.33 ? "Đạt" : "Không đạt"}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">CPK:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-lg">{stats.cpk ?? 'N/A'}</span>
                              {stats.cpk && (
                                <Badge variant={stats.cpk >= 1.33 ? "default" : "destructive"}>
                                  {stats.cpk >= 1.33 ? "Đạt" : "Không đạt"}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                              <strong>Phân tích:</strong> 
                              {stats.cpk && stats.cpk >= 1.33 
                                ? " Quy trình đang hoạt động ổn định và đạt yêu cầu năng lực."
                                : stats.cpk && stats.cpk >= 1.0
                                  ? " Quy trình cần cải thiện để đạt năng lực tốt hơn."
                                  : " Quy trình không đạt yêu cầu, cần điều chỉnh ngay."}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
        
        {historyData.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chọn máy và khoảng thời gian, sau đó nhấn "Tải dữ liệu" để xem lịch sử</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
