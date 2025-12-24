import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Radio,
  Server,
  Signal,
  Wifi,
  WifiOff,
  XCircle,
  RefreshCw,
  Bell,
  BellOff,
  Thermometer,
  Gauge,
  Zap,
  Droplets,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIotRealtime, type IotDevice, type IotAlarm } from "@/hooks/useIotRealtime";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const statusColors: Record<IotDevice["status"], string> = {
  online: "bg-green-500",
  offline: "bg-gray-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
};

const statusTextColors: Record<IotDevice["status"], string> = {
  online: "text-green-600",
  offline: "text-gray-600",
  warning: "text-yellow-600",
  error: "text-red-600",
};

const severityColors: Record<IotAlarm["severity"], string> = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  critical: "bg-red-100 text-red-800",
  emergency: "bg-red-200 text-red-900",
};

const deviceTypeIcons: Record<IotDevice["type"], React.ReactNode> = {
  sensor: <Thermometer className="h-4 w-4" />,
  plc: <Cpu className="h-4 w-4" />,
  gateway: <Server className="h-4 w-4" />,
  controller: <Zap className="h-4 w-4" />,
};

const metricIcons: Record<string, React.ReactNode> = {
  temperature: <Thermometer className="h-4 w-4" />,
  humidity: <Droplets className="h-4 w-4" />,
  pressure: <Gauge className="h-4 w-4" />,
  flow: <Activity className="h-4 w-4" />,
  cycleTime: <Clock className="h-4 w-4" />,
  output: <Zap className="h-4 w-4" />,
  connectedDevices: <Radio className="h-4 w-4" />,
  dataRate: <Signal className="h-4 w-4" />,
};

interface IotRealtimeDashboardProps {
  className?: string;
}

export function IotRealtimeDashboard({ className }: IotRealtimeDashboardProps) {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const {
    isConnected,
    lastUpdate,
    getAllDevices,
    getActiveAlarms,
    getMetricHistory,
    getStats,
    connect,
    disconnect,
  } = useIotRealtime({
    enabled: true,
    maxHistorySize: 50,
  });

  const devices = getAllDevices();
  const activeAlarms = getActiveAlarms();
  const stats = getStats();

  const chartData = useMemo(() => {
    if (!selectedDevice) return [];
    const device = devices.find((d) => d.id === selectedDevice);
    if (!device) return [];
    const metricNames = Object.keys(device.metrics);
    if (metricNames.length === 0) return [];
    const firstMetric = metricNames[0];
    const history = getMetricHistory(selectedDevice, firstMetric);
    return history.map((m, idx) => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      value: m.value,
      index: idx,
    }));
  }, [selectedDevice, devices, getMetricHistory]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          {isConnected ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
          <div>
            <p className="font-medium">{isConnected ? "Đã kết nối" : "Mất kết nối"}</p>
            {lastUpdate && <p className="text-xs text-muted-foreground">Cập nhật: {lastUpdate.toLocaleTimeString()}</p>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => (isConnected ? disconnect() : connect())}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {isConnected ? "Ngắt" : "Kết nối"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Server className="h-4 w-4" /><span className="text-sm">Tổng</span></div><p className="text-2xl font-bold mt-1">{stats.totalDevices}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="text-sm">Online</span></div><p className="text-2xl font-bold mt-1 text-green-600">{stats.onlineDevices}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-gray-500" /><span className="text-sm">Offline</span></div><p className="text-2xl font-bold mt-1">{stats.offlineDevices}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /><span className="text-sm">Warning</span></div><p className="text-2xl font-bold mt-1 text-yellow-600">{stats.warningDevices}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /><span className="text-sm">Error</span></div><p className="text-2xl font-bold mt-1 text-red-600">{stats.errorDevices}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-orange-500" /><span className="text-sm">Cảnh báo</span></div><p className="text-2xl font-bold mt-1 text-orange-600">{stats.activeAlarms}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-sm">Critical</span></div><p className="text-2xl font-bold mt-1 text-red-600">{stats.criticalAlarms}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">Thiết bị ({devices.length})</TabsTrigger>
          <TabsTrigger value="alarms">Cảnh báo ({activeAlarms.length})</TabsTrigger>
          <TabsTrigger value="metrics">Biểu đồ</TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <Card key={device.id} className={cn("cursor-pointer hover:shadow-md", selectedDevice === device.id && "ring-2 ring-primary")} onClick={() => setSelectedDevice(device.id)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">{deviceTypeIcons[device.type]}<CardTitle className="text-base">{device.name}</CardTitle></div>
                    <div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", statusColors[device.status])} /><span className={cn("text-xs", statusTextColors[device.status])}>{device.status}</span></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(device.metrics).map(([name, value]) => (
                      <div key={name} className="flex items-center gap-2 text-sm">{metricIcons[name] || <Activity className="h-3 w-3" />}<span>{name}:</span><span className="font-medium">{value.toFixed(1)}</span></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {devices.length === 0 && <div className="col-span-full text-center py-12"><Server className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Chưa có thiết bị</p></div>}
          </div>
        </TabsContent>

        <TabsContent value="alarms">
          <ScrollArea className="h-[400px]">
            {activeAlarms.map((alarm) => (
              <Card key={alarm.id} className="mb-3">
                <CardContent className="py-3 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={cn("h-5 w-5", alarm.severity === "critical" ? "text-red-500" : "text-yellow-500")} />
                    <div><p className="font-medium">{alarm.message}</p><Badge className={severityColors[alarm.severity]}>{alarm.severity}</Badge></div>
                  </div>
                  <Button variant="outline" size="sm"><BellOff className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            ))}
            {activeAlarms.length === 0 && <div className="text-center py-12"><CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" /><p>Không có cảnh báo</p></div>}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="metrics">
          {selectedDevice && chartData.length > 0 ? (
            <Card>
              <CardHeader><CardTitle>Biểu đồ - {devices.find((d) => d.id === selectedDevice)?.name}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12"><Activity className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Chọn thiết bị để xem biểu đồ</p></div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default IotRealtimeDashboard;
