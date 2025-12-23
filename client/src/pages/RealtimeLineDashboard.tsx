import { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  Activity, Wifi, WifiOff, AlertTriangle, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, Minus, Bell, Settings, Play, Pause,
  Cpu, Wrench, BarChart3, PieChart
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine, ComposedChart, BarChart, Bar,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell
} from "recharts";
import { RealtimeAlarmPanel, Alarm } from "@/components/RealtimeAlarmPanel";
import { OEETrendChart } from "@/components/OEETrendChart";

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
  fixtureId?: number;
  fixtureName?: string;
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

interface FixtureMetrics {
  fixtureId: number;
  fixtureName: string;
  cpk: number;
  sampleCount: number;
  outOfControl: number;
  status: 'excellent' | 'good' | 'acceptable' | 'poor' | 'critical';
}

interface RealtimeAlert {
  id: number;
  alertType: string;
  severity: string;
  message: string;
  ruleNumber: number | null;
  createdAt: string;
}

function generateSimulatedData(count: number, fixtureId?: number, fixtureName?: string): RealtimeDataPoint[] {
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
      violatedRules: isOutOfControl ? "1" : null,
      fixtureId,
      fixtureName
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
    critical: "text-red-600 bg-red-100",
    warning: "text-yellow-600 bg-yellow-100"
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
    { number: 1, name: "Điểm ngoài 3σ" },
    { number: 2, name: "9 điểm liên tiếp cùng phía" },
    { number: 3, name: "6 điểm tăng/giảm liên tục" },
    { number: 4, name: "14 điểm dao động" },
    { number: 5, name: "2/3 điểm ngoài 2σ" },
    { number: 6, name: "4/5 điểm ngoài 1σ" },
    { number: 7, name: "15 điểm trong 1σ" },
    { number: 8, name: "8 điểm ngoài 1σ" }
  ];
  
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

// Fixture Comparison Chart Component
function FixtureComparisonChart({ fixtureMetrics }: { fixtureMetrics: FixtureMetrics[] }) {
  const chartData = fixtureMetrics.map(f => ({
    name: f.fixtureName,
    cpk: f.cpk,
    samples: f.sampleCount,
    outOfControl: f.outOfControl
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          So sánh CPK theo Fixture
        </CardTitle>
        <CardDescription>Biểu đồ so sánh năng lực quy trình giữa các fixture</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 2]} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [value.toFixed(2), 'CPK']} />
              <ReferenceLine x={1.33} stroke="#22c55e" strokeDasharray="5 5" label={{ value: "Target", position: "top" }} />
              <ReferenceLine x={1.0} stroke="#f59e0b" strokeDasharray="5 5" />
              <Bar dataKey="cpk" name="CPK">
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.cpk >= 1.33 ? '#22c55e' : entry.cpk >= 1.0 ? '#f59e0b' : '#ef4444'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Fixture Radar Chart Component
function FixtureRadarChart({ fixtureMetrics }: { fixtureMetrics: FixtureMetrics[] }) {
  const radarData = fixtureMetrics.map(f => ({
    fixture: f.fixtureName,
    cpk: Math.min(f.cpk * 50, 100),
    samples: Math.min(f.sampleCount / 10, 100),
    quality: Math.max(100 - f.outOfControl * 10, 0),
    fullMark: 100
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PieChart className="h-4 w-4" />
          Hiệu suất Fixture (Radar)
        </CardTitle>
        <CardDescription>Đánh giá đa chiều hiệu suất từng fixture</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="fixture" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar name="CPK Score" dataKey="cpk" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Radar name="Sample Count" dataKey="samples" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
              <Radar name="Quality" dataKey="quality" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Fixture Detail Table Component
function FixtureDetailTable({ fixtureMetrics }: { fixtureMetrics: FixtureMetrics[] }) {
  const getStatusBadge = (status: string) => {
    const colors = {
      excellent: "bg-green-100 text-green-800",
      good: "bg-blue-100 text-blue-800",
      acceptable: "bg-yellow-100 text-yellow-800",
      poor: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || colors.good;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Chi tiết Fixture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fixture</TableHead>
              <TableHead className="text-right">CPK</TableHead>
              <TableHead className="text-right">Mẫu</TableHead>
              <TableHead className="text-right">OOC</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fixtureMetrics.map(f => (
              <TableRow key={f.fixtureId}>
                <TableCell className="font-medium">{f.fixtureName}</TableCell>
                <TableCell className="text-right font-mono">{f.cpk.toFixed(2)}</TableCell>
                <TableCell className="text-right">{f.sampleCount}</TableCell>
                <TableCell className="text-right text-red-600">{f.outOfControl}</TableCell>
                <TableCell>
                  <Badge className={getStatusBadge(f.status)}>{f.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function RealtimeLineDashboard() {
  const [viewMode, setViewMode] = useState<'spc-plan' | 'machine' | 'fixture'>('spc-plan');
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [selectedFixture, setSelectedFixture] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [data, setData] = useState<RealtimeDataPoint[]>([]);
  const [fixtureData, setFixtureData] = useState<Record<number, RealtimeDataPoint[]>>({});
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [oeeData, setOeeData] = useState<Array<{
    timestamp: Date;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  }>>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const demoFixtures = useMemo(() => [
    { id: 1, name: "Fixture A" },
    { id: 2, name: "Fixture B" },
    { id: 3, name: "Fixture C" },
    { id: 4, name: "Fixture D" },
  ], []);
  
  const handleAcknowledge = (alarmId: string) => {
    setAlarms(prev => prev.map(a => 
      a.id === alarmId ? { ...a, acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: 'Current User' } : a
    ));
  };
  
  const handleAcknowledgeAll = () => {
    setAlarms(prev => prev.map(a => ({ ...a, acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: 'Current User' })));
  };
  
  const handleClearAlarm = (alarmId: string) => {
    setAlarms(prev => prev.filter(a => a.id !== alarmId));
  };
  
  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: spcPlans } = trpc.spcPlan.list.useQuery();
  const { data: fixtures } = trpc.fixture.list.useQuery(
    { machineId: selectedMachine ? parseInt(selectedMachine) : undefined },
    { enabled: (viewMode === 'machine' || viewMode === 'fixture') && !!selectedMachine && selectedMachine !== 'demo' }
  );
  
  const fixtureMetrics = useMemo((): FixtureMetrics[] => {
    if (viewMode !== 'machine' && viewMode !== 'fixture') return [];
    
    const fixtureList = selectedMachine === 'demo' ? demoFixtures : (fixtures || []);
    
    return fixtureList.map((f: { id: number; name: string }) => {
      const fData = fixtureData[f.id] || [];
      const metrics = calculateMetrics(fData);
      const outOfControl = fData.filter(d => d.isOutOfControl).length;
      
      let status: FixtureMetrics['status'] = 'good';
      if (metrics.cpk === null || metrics.cpk < 0.67) status = 'critical';
      else if (metrics.cpk < 1.0) status = 'poor';
      else if (metrics.cpk < 1.33) status = 'acceptable';
      else if (metrics.cpk < 1.67) status = 'good';
      else status = 'excellent';
      
      return {
        fixtureId: f.id,
        fixtureName: f.name,
        cpk: metrics.cpk || 0,
        sampleCount: metrics.sampleCount,
        outOfControl,
        status
      };
    });
  }, [viewMode, fixtureData, selectedMachine, fixtures, demoFixtures]);
  
  useEffect(() => {
    const isReady = viewMode === 'spc-plan' ? !!selectedPlan : !!selectedMachine;
    if (isRunning && isReady) {
      setData(generateSimulatedData(50));
      
      if (viewMode === 'machine' || viewMode === 'fixture') {
        const fixtureList = selectedMachine === 'demo' ? demoFixtures : (fixtures || []);
        const initialFixtureData: Record<number, RealtimeDataPoint[]> = {};
        fixtureList.forEach((f: { id: number; name: string }) => {
          initialFixtureData[f.id] = generateSimulatedData(30, f.id, f.name);
        });
        setFixtureData(initialFixtureData);
      }
      
      const initialOeeData = Array.from({ length: 20 }, (_, i) => {
        const availability = 85 + Math.random() * 10;
        const performance = 80 + Math.random() * 15;
        const quality = 95 + Math.random() * 4;
        return {
          timestamp: new Date(Date.now() - (20 - i) * 5 * 60 * 1000),
          oee: (availability * performance * quality) / 10000,
          availability,
          performance,
          quality
        };
      });
      setOeeData(initialOeeData);
      
      intervalRef.current = setInterval(() => {
        setData(prev => {
          const newPoint = generateSimulatedData(1)[0];
          newPoint.id = prev.length + 1;
          newPoint.timestamp = new Date().toISOString();
          
          if (newPoint.isOutOfControl) {
            const alertId = Date.now();
            setAlerts(prevAlerts => [{
              id: alertId,
              alertType: 'rule_violation',
              severity: 'warning',
              message: `Giá trị ${newPoint.value} vượt giới hạn kiểm soát`,
              ruleNumber: 1,
              createdAt: new Date().toISOString()
            }, ...prevAlerts.slice(0, 9)]);
            
            setAlarms(prevAlarms => [{
              id: alertId.toString(),
              timestamp: new Date(),
              machineId: parseInt(selectedMachine) || 0,
              machineName: machines?.find((m: { id: number; name: string }) => m.id.toString() === selectedMachine)?.name || 'Demo Machine',
              severity: newPoint.value > 57 || newPoint.value < 43 ? 'critical' : 'warning',
              type: 'spc_violation',
              rule: 'Rule 1',
              message: `Giá trị ${newPoint.value.toFixed(2)} vượt giới hạn kiểm soát (UCL: 55, LCL: 45)`,
              value: newPoint.value,
              limit: newPoint.value > 55 ? 55 : 45,
              acknowledged: false
            }, ...prevAlarms.slice(0, 49)]);
          }
          
          return [...prev.slice(-99), newPoint];
        });
        
        if (viewMode === 'machine' || viewMode === 'fixture') {
          const fixtureList = selectedMachine === 'demo' ? demoFixtures : (fixtures || []);
          setFixtureData(prev => {
            const updated = { ...prev };
            fixtureList.forEach((f: { id: number; name: string }) => {
              const newPoint = generateSimulatedData(1, f.id, f.name)[0];
              newPoint.id = (updated[f.id]?.length || 0) + 1;
              newPoint.timestamp = new Date().toISOString();
              updated[f.id] = [...(updated[f.id] || []).slice(-49), newPoint];
            });
            return updated;
          });
        }
        
        setOeeData(prev => {
          const availability = 85 + Math.random() * 10;
          const performance = 80 + Math.random() * 15;
          const quality = 95 + Math.random() * 4;
          const newOeePoint = {
            timestamp: new Date(),
            oee: (availability * performance * quality) / 10000,
            availability,
            performance,
            quality
          };
          return [...prev.slice(-29), newOeePoint];
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
  }, [isRunning, selectedMachine, selectedPlan, viewMode, fixtures, demoFixtures, machines]);
  
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
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Dây chuyền RealTime</h1>
            <p className="text-muted-foreground">Giám sát SPC/CPK theo thời gian thực</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:gap-4">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'spc-plan' | 'machine' | 'fixture')} className="w-auto">
              <TabsList>
                <TabsTrigger value="spc-plan" className="text-xs sm:text-sm">
                  <Activity className="h-4 w-4 mr-1 hidden sm:inline" />
                  SPC Plan
                </TabsTrigger>
                <TabsTrigger value="machine" className="text-xs sm:text-sm">
                  <Cpu className="h-4 w-4 mr-1 hidden sm:inline" />
                  Machine
                </TabsTrigger>
                <TabsTrigger value="fixture" className="text-xs sm:text-sm">
                  <Wrench className="h-4 w-4 mr-1 hidden sm:inline" />
                  Fixture
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {viewMode === 'spc-plan' ? (
              <Select value={selectedPlan} onValueChange={(v) => { setSelectedPlan(v); setSelectedMachine(""); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Chọn Kế hoạch SPC" />
                </SelectTrigger>
                <SelectContent>
                  {spcPlans?.map((p: { id: number; name: string }) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="demo">Demo Mode</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <>
                <Select value={selectedMachine} onValueChange={(v) => { setSelectedMachine(v); setSelectedFixture(""); }}>
                  <SelectTrigger className="w-[150px]">
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
                
                {selectedMachine && viewMode === 'fixture' && (
                  <Select value={selectedFixture} onValueChange={setSelectedFixture}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả Fixture</SelectItem>
                      {(selectedMachine === 'demo' ? demoFixtures : fixtures || []).map((f: { id: number; name: string }) => (
                        <SelectItem key={f.id} value={f.id.toString()}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
            
            <Button 
              variant={isRunning ? "destructive" : "default"}
              onClick={() => setIsRunning(!isRunning)}
              disabled={viewMode === 'spc-plan' ? !selectedPlan : !selectedMachine}
              size="sm"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Dừng
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard title="CPK" value={metrics.cpk} status={getMetricStatus(metrics.cpk)} trend="up" />
          <MetricCard title="CP" value={metrics.cp} status={getMetricStatus(metrics.cp)} />
          <MetricCard title="PPK" value={metrics.ppk} status={getMetricStatus(metrics.ppk)} />
          <MetricCard title="PP" value={metrics.pp} status={getMetricStatus(metrics.pp)} />
          <MetricCard title="Ca" value={metrics.ca} status={metrics.ca !== null && metrics.ca < 0.25 ? 'good' : 'warning'} />
        </div>
        
        {/* Main Content - Different views based on viewMode */}
        {viewMode === 'spc-plan' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
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
                            const { cx, cy, payload, index } = props;
                            if (payload.isViolation) {
                              return <circle key={`dot-${index}`} cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#ef4444" />;
                            }
                            return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill="#3b82f6" stroke="#3b82f6" />;
                          }}
                          name="Giá trị"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-4">
              <SpcRulesStatus data={data} />
              <AlertsPanel alerts={alerts} />
            </div>
          </div>
        )}
        
        {/* Machine View - Show fixture comparison */}
        {viewMode === 'machine' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FixtureComparisonChart fixtureMetrics={fixtureMetrics} />
              <FixtureRadarChart fixtureMetrics={fixtureMetrics} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">X-bar Control Chart (Tổng hợp)</CardTitle>
                    <CardDescription>Biểu đồ kiểm soát tổng hợp tất cả fixture</CardDescription>
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
                              const { cx, cy, payload, index } = props;
                              if (payload.isViolation) {
                                return <circle key={`dot-${index}`} cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#ef4444" />;
                              }
                              return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill="#3b82f6" stroke="#3b82f6" />;
                            }}
                            name="Giá trị"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <FixtureDetailTable fixtureMetrics={fixtureMetrics} />
            </div>
          </div>
        )}
        
        {/* Fixture View - Show individual fixture details */}
        {viewMode === 'fixture' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FixtureComparisonChart fixtureMetrics={fixtureMetrics} />
              <FixtureDetailTable fixtureMetrics={fixtureMetrics} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(selectedFixture === 'all' || !selectedFixture ? fixtureMetrics : fixtureMetrics.filter(f => f.fixtureId.toString() === selectedFixture)).map(fixture => {
                const fData = fixtureData[fixture.fixtureId] || [];
                const fChartData = fData.map(d => ({
                  time: new Date(d.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  value: d.value,
                  ucl: d.ucl,
                  lcl: d.lcl,
                  isViolation: d.isOutOfControl
                }));
                
                return (
                  <Card key={fixture.fixtureId}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{fixture.fixtureName}</CardTitle>
                        <Badge className={
                          fixture.status === 'excellent' ? 'bg-green-100 text-green-800' :
                          fixture.status === 'good' ? 'bg-blue-100 text-blue-800' :
                          fixture.status === 'acceptable' ? 'bg-yellow-100 text-yellow-800' :
                          fixture.status === 'poor' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }>
                          CPK: {fixture.cpk.toFixed(2)}
                        </Badge>
                      </div>
                      <CardDescription>Mẫu: {fixture.sampleCount} | OOC: {fixture.outOfControl}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={fChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                            <YAxis domain={[40, 60]} tick={{ fontSize: 9 }} />
                            <Tooltip />
                            <ReferenceLine y={55} stroke="#ef4444" strokeDasharray="3 3" />
                            <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="3 3" />
                            <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="2 2" />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#3b82f6" 
                              strokeWidth={1.5}
                              dot={(props: any) => {
                                const { cx, cy, payload, index } = props;
                                if (payload.isViolation) {
                                  return <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill="#ef4444" />;
                                }
                                return <circle key={`dot-${index}`} cx={cx} cy={cy} r={2} fill="#3b82f6" />;
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Alarm Panel */}
        <RealtimeAlarmPanel
          alarms={alarms}
          onAcknowledge={handleAcknowledge}
          onAcknowledgeAll={handleAcknowledgeAll}
          onClear={handleClearAlarm}
        />
        
        {/* OEE Trend Chart */}
        <OEETrendChart
          data={oeeData}
          title="Xu hướng OEE Realtime"
          description="Theo dõi hiệu suất thiết bị tổng thể theo thời gian thực"
          targetOEE={85}
          height={250}
        />
        
        {/* Statistics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Thống kê</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
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
