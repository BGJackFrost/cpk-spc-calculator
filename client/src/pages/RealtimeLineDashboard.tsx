import { useState, useEffect, useRef, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  Settings,
  Play,
  Pause,
  RefreshCw
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts";

interface RealtimeDataPoint {
  id: number;
  timestamp: string;
  value: number;
  subgroupMean: number | null;
  subgroupRange: number | null;
  ucl: number | null;
  lcl: number | null;
  isOutOfSpec: boolean;
  isOutOfControl: boolean;
  violatedRules: string | null;
}

interface SpcMetrics {
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
  ca: number | null;
  mean: number;
  stdDev: number;
  sampleCount: number;
}

interface RealtimeAlert {
  id: number;
  alertType: string;
  severity: string;
  message: string;
  ruleNumber: number | null;
  createdAt: string;
}

// Simulated data for demo
function generateSimulatedData(count: number): RealtimeDataPoint[] {
  const baseValue = 50;
  const ucl = 55;
  const lcl = 45;
  const now = Date.now();
  
  return Array.from({ length: count }, (_, i) => {
    const randomVariation = (Math.random() - 0.5) * 8;
    const value = baseValue + randomVariation;
    const isOutOfControl = value > ucl || value < lcl;
    
    return {
      id: i + 1,
      timestamp: new Date(now - (count - i) * 5000).toISOString(),
      value: Math.round(value * 100) / 100,
      subgroupMean: Math.round((baseValue + (Math.random() - 0.5) * 4) * 100) / 100,
      subgroupRange: Math.round(Math.random() * 3 * 100) / 100,
      ucl,
      lcl,
      isOutOfSpec: Math.random() < 0.05,
      isOutOfControl,
      violatedRules: isOutOfControl ? "1" : null
    };
  });
}

function calculateMetrics(data: RealtimeDataPoint[]): SpcMetrics {
  if (data.length === 0) {
    return { cp: null, cpk: null, pp: null, ppk: null, ca: null, mean: 0, stdDev: 0, sampleCount: 0 };
  }
  
  const values = data.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const usl = 55;
  const lsl = 45;
  
  const cp = stdDev > 0 ? (usl - lsl) / (6 * stdDev) : null;
  const cpu = stdDev > 0 ? (usl - mean) / (3 * stdDev) : null;
  const cpl = stdDev > 0 ? (mean - lsl) / (3 * stdDev) : null;
  const cpk = cpu !== null && cpl !== null ? Math.min(cpu, cpl) : null;
  const ca = (usl - lsl) > 0 ? Math.abs((mean - (usl + lsl) / 2) / ((usl - lsl) / 2)) : null;
  
  return {
    cp: cp ? Math.round(cp * 100) / 100 : null,
    cpk: cpk ? Math.round(cpk * 100) / 100 : null,
    pp: cp ? Math.round(cp * 100) / 100 : null,
    ppk: cpk ? Math.round(cpk * 100) / 100 : null,
    ca: ca ? Math.round(ca * 100) / 100 : null,
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    sampleCount: values.length
  };
}

function MetricCard({ title, value, status, trend }: { title: string; value: number | null; status: string; trend?: 'up' | 'down' | 'stable' }) {
  const statusColors = {
    excellent: "text-green-600 bg-green-100",
    good: "text-blue-600 bg-blue-100",
    acceptable: "text-yellow-600 bg-yellow-100",
    poor: "text-orange-600 bg-orange-100",
    critical: "text-red-600 bg-red-100"
  };
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value !== null ? value.toFixed(2) : "N/A"}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.good}>
              {status}
            </Badge>
            {trend && <TrendIcon className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SpcRulesStatus({ data }: { data: RealtimeDataPoint[] }) {
  const rules = [
    { number: 1, name: "Điểm ngoài 3σ", status: "ok" },
    { number: 2, name: "9 điểm liên tiếp cùng phía", status: "ok" },
    { number: 3, name: "6 điểm tăng/giảm liên tục", status: "ok" },
    { number: 4, name: "14 điểm dao động", status: "ok" },
    { number: 5, name: "2/3 điểm ngoài 2σ", status: "warning" },
    { number: 6, name: "4/5 điểm ngoài 1σ", status: "ok" },
    { number: 7, name: "15 điểm trong 1σ", status: "ok" },
    { number: 8, name: "8 điểm ngoài 1σ", status: "ok" }
  ];
  
  // Check actual violations from data
  const violatedRules = new Set<number>();
  data.forEach(d => {
    if (d.violatedRules) {
      d.violatedRules.split(',').forEach(r => violatedRules.add(parseInt(r)));
    }
  });
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Trạng thái SPC Rules</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {rules.map(rule => {
            const isViolated = violatedRules.has(rule.number);
            return (
              <div key={rule.number} className="flex items-center gap-2 text-sm">
                {isViolated ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <span className={isViolated ? "text-red-600 font-medium" : ""}>
                  Rule {rule.number}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertsPanel({ alerts }: { alerts: RealtimeAlert[] }) {
  const severityColors = {
    warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
    critical: "bg-red-100 text-red-800 border-red-300"
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Cảnh báo gần đây
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Không có cảnh báo</p>
          ) : (
            alerts.map(alert => (
              <div 
                key={alert.id} 
                className={`p-2 rounded border text-xs ${severityColors[alert.severity as keyof typeof severityColors]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {alert.alertType === 'rule_violation' ? `Rule ${alert.ruleNumber} violated` : alert.alertType}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(alert.createdAt).toLocaleTimeString('vi-VN')}
                  </span>
                </div>
                {alert.message && <p className="mt-1">{alert.message}</p>}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RealtimeLineDashboard() {
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [data, setData] = useState<RealtimeDataPoint[]>([]);
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch machines
  const { data: machines } = trpc.machine.listAll.useQuery();
  
  // Simulated realtime data
  useEffect(() => {
    if (isRunning && selectedMachine) {
      // Initial data
      setData(generateSimulatedData(50));
      
      // Add new data every 2 seconds
      intervalRef.current = setInterval(() => {
        setData(prev => {
          const newPoint = generateSimulatedData(1)[0];
          newPoint.id = prev.length + 1;
          newPoint.timestamp = new Date().toISOString();
          
          // Check for violations and add alert
          if (newPoint.isOutOfControl) {
            setAlerts(prevAlerts => [{
              id: Date.now(),
              alertType: 'rule_violation',
              severity: 'warning',
              message: `Giá trị ${newPoint.value} vượt giới hạn kiểm soát`,
              ruleNumber: 1,
              createdAt: new Date().toISOString()
            }, ...prevAlerts.slice(0, 9)]);
          }
          
          return [...prev.slice(-99), newPoint];
        });
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, selectedMachine]);
  
  const metrics = useMemo(() => calculateMetrics(data), [data]);
  
  const chartData = useMemo(() => {
    return data.map(d => ({
      time: new Date(d.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: d.value,
      mean: d.subgroupMean,
      ucl: d.ucl,
      lcl: d.lcl,
      isViolation: d.isOutOfControl
    }));
  }, [data]);
  
  const getMetricStatus = (value: number | null) => {
    if (value === null) return 'poor';
    if (value >= 1.67) return 'excellent';
    if (value >= 1.33) return 'good';
    if (value >= 1.0) return 'acceptable';
    if (value >= 0.67) return 'poor';
    return 'critical';
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Dây chuyền RealTime</h1>
            <p className="text-muted-foreground">Giám sát SPC/CPK theo thời gian thực</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Chọn máy" />
              </SelectTrigger>
              <SelectContent>
                {machines?.map((m: { id: number; name: string }) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.name}
                  </SelectItem>
                ))}
                <SelectItem value="demo">Demo Mode</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant={isRunning ? "destructive" : "default"}
              onClick={() => setIsRunning(!isRunning)}
              disabled={!selectedMachine}
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Dừng
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Bắt đầu
                </>
              )}
            </Button>
            
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Connection Status */}
        <Card className={isRunning ? "border-green-500" : "border-muted"}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="font-medium">
                  {isRunning ? "Đang kết nối" : "Chưa kết nối"}
                </span>
                {isRunning && (
                  <Badge variant="outline" className="ml-2">
                    <Activity className="h-3 w-3 mr-1 animate-pulse" />
                    Live
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Mẫu: {metrics.sampleCount}</span>
                <span>Cập nhật: {data.length > 0 ? new Date(data[data.length - 1].timestamp).toLocaleTimeString('vi-VN') : '--:--:--'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Metrics Cards */}
        <div className="grid grid-cols-5 gap-4">
          <MetricCard title="CPK" value={metrics.cpk} status={getMetricStatus(metrics.cpk)} trend="up" />
          <MetricCard title="CP" value={metrics.cp} status={getMetricStatus(metrics.cp)} />
          <MetricCard title="PPK" value={metrics.ppk} status={getMetricStatus(metrics.ppk)} />
          <MetricCard title="PP" value={metrics.pp} status={getMetricStatus(metrics.pp)} />
          <MetricCard title="Ca" value={metrics.ca} status={metrics.ca !== null && metrics.ca < 0.25 ? 'good' : 'warning'} />
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-3 gap-4">
          {/* Control Chart */}
          <div className="col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">X-bar Control Chart</CardTitle>
                <CardDescription>Biểu đồ kiểm soát giá trị trung bình</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis domain={['auto', 'auto']} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={55} stroke="#ef4444" strokeDasharray="5 5" label="UCL" />
                      <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="5 5" label="LCL" />
                      <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="3 3" label="CL" />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (payload.isViolation) {
                            return <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#ef4444" />;
                          }
                          return <circle cx={cx} cy={cy} r={3} fill="#3b82f6" stroke="#3b82f6" />;
                        }}
                        name="Giá trị"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Side Panel */}
          <div className="space-y-4">
            <SpcRulesStatus data={data} />
            <AlertsPanel alerts={alerts} />
          </div>
        </div>
        
        {/* Statistics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Thống kê</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Trung bình</p>
                <p className="text-lg font-semibold">{metrics.mean}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Độ lệch chuẩn</p>
                <p className="text-lg font-semibold">{metrics.stdDev}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Số mẫu</p>
                <p className="text-lg font-semibold">{metrics.sampleCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ngoài spec</p>
                <p className="text-lg font-semibold text-orange-600">
                  {data.filter(d => d.isOutOfSpec).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ngoài control</p>
                <p className="text-lg font-semibold text-red-600">
                  {data.filter(d => d.isOutOfControl).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tỷ lệ OK</p>
                <p className="text-lg font-semibold text-green-600">
                  {metrics.sampleCount > 0 
                    ? ((1 - data.filter(d => d.isOutOfSpec || d.isOutOfControl).length / metrics.sampleCount) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
