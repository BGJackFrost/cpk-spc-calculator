/**
 * Sensor Dashboard Page
 * Dashboard tổng hợp hiển thị tất cả sensors với IoTRealtimeChart
 */

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { trpc } from '@/lib/trpc';
import IoTRealtimeChart from '@/components/IoTRealtimeChart';
import { 
  RefreshCw, 
  LayoutGrid, 
  List, 
  Download,
  Filter,
  Settings,
  Activity,
  Thermometer,
  Gauge,
  Zap,
  Droplets,
  Wind,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Metric icons mapping
const metricIcons: Record<string, React.ReactNode> = {
  temperature: <Thermometer className="w-4 h-4" />,
  pressure: <Gauge className="w-4 h-4" />,
  power: <Zap className="w-4 h-4" />,
  humidity: <Droplets className="w-4 h-4" />,
  flow: <Wind className="w-4 h-4" />,
  default: <Activity className="w-4 h-4" />,
};

// Grid layout options
const gridOptions = [
  { value: '1', label: '1 column', cols: 'grid-cols-1' },
  { value: '2', label: '2 columns', cols: 'grid-cols-1 md:grid-cols-2' },
  { value: '3', label: '3 columns', cols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' },
  { value: '4', label: '4 columns', cols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' },
];

export default function SensorDashboard() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridCols, setGridCols] = useState('3');
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterProtocol, setFilterProtocol] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlerts, setShowAlerts] = useState(true);

  // Queries
  const { data: devices, isLoading: devicesLoading, refetch: refetchDevices } = trpc.iotDashboard.getDevices.useQuery();
  const { data: alerts } = trpc.iotAlert.getActiveAlerts.useQuery({ limit: 10 });
  const { data: mqttStatus } = trpc.mqtt.getStatus.useQuery();

  // Filter devices
  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    
    return devices.filter(device => {
      // Protocol filter
      if (filterProtocol !== 'all' && device.protocol !== filterProtocol) return false;
      
      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'online' && device.status !== 'online') return false;
        if (filterStatus === 'offline' && device.status !== 'offline') return false;
        if (filterStatus === 'warning' && device.status !== 'warning') return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          device.deviceName?.toLowerCase().includes(query) ||
          device.deviceCode?.toLowerCase().includes(query) ||
          device.location?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [devices, filterProtocol, filterStatus, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    if (!devices) return { total: 0, online: 0, offline: 0, warning: 0 };
    
    return {
      total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      offline: devices.filter(d => d.status === 'offline').length,
      warning: devices.filter(d => d.status === 'warning').length,
    };
  }, [devices]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredDevices.length) {
      toast({ title: 'Không có dữ liệu', description: 'Không có thiết bị nào để xuất', variant: 'destructive' });
      return;
    }

    const headers = ['Device Name', 'Device Code', 'Protocol', 'Status', 'Location', 'Last Update'];
    const rows = filteredDevices.map(d => [
      d.deviceName,
      d.deviceCode,
      d.protocol,
      d.status,
      d.location || '',
      d.lastDataAt ? new Date(d.lastDataAt).toLocaleString('vi-VN') : '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensors_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Xuất thành công', description: `Đã xuất ${filteredDevices.length} thiết bị` });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMetricIcon = (metric: string) => {
    const key = Object.keys(metricIcons).find(k => metric.toLowerCase().includes(k));
    return metricIcons[key || 'default'];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Sensor Dashboard</h1>
            <p className="text-muted-foreground">
              Giám sát realtime tất cả sensors và thiết bị IoT
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetchDevices()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng thiết bị</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online</p>
                  <p className="text-2xl font-bold text-green-500">{stats.online}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Offline</p>
                  <p className="text-2xl font-bold text-red-500">{stats.offline}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cảnh báo</p>
                  <p className="text-2xl font-bold text-yellow-500">{alerts?.length || 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts */}
        {showAlerts && alerts && alerts.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Cảnh báo đang hoạt động ({alerts.length})
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAlerts(false)}>
                  Ẩn
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-2 bg-background rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.alertType.includes('limit') ? 'destructive' : 'secondary'}>
                        {alert.alertType}
                      </Badge>
                      <span className="text-sm">{alert.message}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters & Settings */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48"
                  />
                </div>
                <Select value={filterProtocol} onValueChange={setFilterProtocol}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Protocol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="mqtt">MQTT</SelectItem>
                    <SelectItem value="opcua">OPC-UA</SelectItem>
                    <SelectItem value="modbus">Modbus</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Auto refresh</Label>
                  <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Interval: {refreshInterval}s</Label>
                  <Slider
                    value={[refreshInterval]}
                    onValueChange={([v]) => setRefreshInterval(v)}
                    min={1}
                    max={60}
                    step={1}
                    className="w-24"
                  />
                </div>
                <div className="flex items-center gap-1 border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
                {viewMode === 'grid' && (
                  <Select value={gridCols} onValueChange={setGridCols}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gridOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sensors Grid/List */}
        {devicesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDevices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Không tìm thấy thiết bị nào
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className={cn(
            "grid gap-4",
            gridOptions.find(o => o.value === gridCols)?.cols
          )}>
            {filteredDevices.map((device) => (
              <Card key={device.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(device.status)}
                      <CardTitle className="text-base">{device.deviceName}</CardTitle>
                    </div>
                    <Badge variant="outline">{device.protocol}</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {device.deviceCode} • {device.location || 'N/A'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <IoTRealtimeChart
                    deviceId={device.id}
                    metric="temperature"
                    title=""
                    unit="°C"
                    refreshInterval={autoRefresh ? refreshInterval : 0}
                    showStats={false}
                    height={150}
                    upperLimit={100}
                    lowerLimit={0}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3">Thiết bị</th>
                    <th className="text-left p-3">Protocol</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Location</th>
                    <th className="text-left p-3">Last Update</th>
                    <th className="text-right p-3">Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((device) => (
                    <tr key={device.id} className="border-t">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(device.status)}
                          <div>
                            <p className="font-medium">{device.deviceName}</p>
                            <p className="text-xs text-muted-foreground">{device.deviceCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{device.protocol}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={
                          device.status === 'online' ? 'default' :
                          device.status === 'offline' ? 'destructive' : 'secondary'
                        }>
                          {device.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm">{device.location || '-'}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {device.lastDataAt ? new Date(device.lastDataAt).toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="p-3 w-48">
                        <IoTRealtimeChart
                          deviceId={device.id}
                          metric="temperature"
                          title=""
                          unit="°C"
                          refreshInterval={autoRefresh ? refreshInterval : 0}
                          showStats={false}
                          height={60}
                          chartType="line"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trạng thái kết nối</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  mqttStatus?.connected ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="text-sm">MQTT: {mqttStatus?.connected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-sm">OPC-UA: Chưa kết nối</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
