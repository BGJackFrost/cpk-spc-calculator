import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  RefreshCw,
  Download,
  Map,
  BarChart3,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Cpu,
  Factory,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings,
  Maximize2,
  Filter,
  Gauge,
  Wifi,
  WifiOff,
  Server,
  Thermometer,
  Droplets,
  Zap,
  Wind,
  Heart,
  Wrench,
  Calendar,
  Bell,
  LayoutGrid,
  List,
  Plus,
  Eye,
  Edit,
  Trash2,
  FolderTree,
  Network,
  Radio,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  LineChart,
} from 'recharts';

// Colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const STATUS_COLORS = {
  online: '#22c55e',
  offline: '#6b7280',
  error: '#ef4444',
  maintenance: '#3b82f6',
  warning: '#f59e0b',
};

// Time range options
const TIME_RANGES = [
  { value: '1h', label: '1 giờ' },
  { value: '6h', label: '6 giờ' },
  { value: '24h', label: '24 giờ' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
];

// ============ Device Health Score Card ============
function DeviceHealthCard({ deviceId, deviceName }: { deviceId: number; deviceName: string }) {
  const { data: healthHistory } = trpc.iotDeviceManagement.getHealthHistory.useQuery(
    { deviceId, days: 7 },
    { enabled: !!deviceId }
  );
  
  const latestHealth = healthHistory?.[0];
  const healthScore = latestHealth?.healthScore || 100;
  
  const getHealthColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };
  
  const healthData = [
    { name: 'Health', value: healthScore, fill: getHealthColor(healthScore) },
  ];
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Heart className="h-4 w-4" />
          {deviceName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="w-24 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="100%"
                data={healthData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: 'hsl(var(--muted))' }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 ml-4">
            <div className="text-3xl font-bold" style={{ color: getHealthColor(healthScore) }}>
              {healthScore}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">Health Score</div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
              <div>
                <span className="text-muted-foreground">Availability:</span>
                <span className="ml-1 font-medium">{latestHealth?.availabilityScore || 100}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Performance:</span>
                <span className="ml-1 font-medium">{latestHealth?.performanceScore || 100}%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Protocol Status Card ============
function ProtocolStatusCard() {
  const { data: stats } = trpc.iotProtocol.getStats.useQuery();
  const { data: connections } = trpc.iotProtocol.getAllConnectionStatuses.useQuery();
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Network className="h-4 w-4" />
          Protocol Connections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {stats?.activeConnections || 0}
            </div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">
              {stats?.totalConnections || 0}
            </div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {stats?.totalMessagesReceived || 0}
            </div>
            <div className="text-xs text-muted-foreground">Messages</div>
          </div>
        </div>
        
        {stats?.byProtocol && (
          <div className="mt-4 space-y-2">
            {Object.entries(stats.byProtocol).map(([protocol, data]) => (
              <div key={protocol} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <Radio className="h-3 w-3" />
                  {protocol.toUpperCase()}
                </span>
                <Badge variant={data.active > 0 ? 'default' : 'secondary'}>
                  {data.active}/{data.total}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Maintenance Calendar Card ============
function MaintenanceCalendarCard() {
  const { data: schedules } = trpc.iotDeviceManagement.getMaintenanceSchedules.useQuery({
    status: 'scheduled',
  });
  
  const upcomingMaintenance = schedules?.slice(0, 5) || [];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Upcoming Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingMaintenance.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No scheduled maintenance
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingMaintenance.map((m) => (
              <div key={m.id} className="flex items-start gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  m.priority === 'critical' ? 'bg-red-500' :
                  m.priority === 'high' ? 'bg-orange-500' :
                  m.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(m.scheduledDate).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {m.maintenanceType}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Alert Summary Card ============
function AlertSummaryCard() {
  const { data: escalationStats } = trpc.iotAlertEscalation.getStats.useQuery();
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alert Escalation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{escalationStats?.activeRules || 0}</div>
            <div className="text-xs text-muted-foreground">Active Rules</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{escalationStats?.escalationsToday || 0}</div>
            <div className="text-xs text-muted-foreground">Escalations Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{escalationStats?.activeCorrelations || 0}</div>
            <div className="text-xs text-muted-foreground">Correlations</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{escalationStats?.correlationsToday || 0}</div>
            <div className="text-xs text-muted-foreground">Correlated Today</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Device Groups Tree ============
function DeviceGroupsTree() {
  const { data: groups } = trpc.iotDeviceManagement.getGroups.useQuery();
  
  const renderGroup = (group: any, level: number = 0) => (
    <div key={group.id} style={{ marginLeft: level * 16 }}>
      <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
        <FolderTree className="h-4 w-4" style={{ color: group.color }} />
        <span className="text-sm">{group.name}</span>
        {group.deviceCount && (
          <Badge variant="secondary" className="text-xs ml-auto">
            {group.deviceCount}
          </Badge>
        )}
      </div>
      {group.children?.map((child: any) => renderGroup(child, level + 1))}
    </div>
  );
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FolderTree className="h-4 w-4" />
          Device Groups
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-64 overflow-y-auto">
        {groups?.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No groups defined
          </div>
        ) : (
          groups?.map((group) => renderGroup(group))
        )}
      </CardContent>
    </Card>
  );
}

// ============ Real-time Metrics Chart ============
function RealTimeMetricsChart({ deviceId }: { deviceId?: number }) {
  const [data, setData] = useState<any[]>([]);
  
  // Simulate real-time data
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setData(prev => {
        const newData = [...prev, {
          time: now.toLocaleTimeString('vi-VN'),
          temperature: 25 + Math.random() * 10,
          humidity: 50 + Math.random() * 20,
          pressure: 1000 + Math.random() * 50,
        }].slice(-20);
        return newData;
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Real-time Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="temperature" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={false}
                name="Temperature (°C)"
              />
              <Line 
                type="monotone" 
                dataKey="humidity" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                name="Humidity (%)"
              />
              <Line 
                type="monotone" 
                dataKey="pressure" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
                name="Pressure (hPa)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Device Status Overview ============
function DeviceStatusOverview() {
  const { data: stats } = trpc.iotDeviceManagement.getManagementStats.useQuery();
  
  const statusData = [
    { name: 'Online', value: stats?.onlineDevices || 0, color: STATUS_COLORS.online },
    { name: 'Offline', value: stats?.offlineDevices || 0, color: STATUS_COLORS.offline },
    { name: 'Error', value: stats?.errorDevices || 0, color: STATUS_COLORS.error },
    { name: 'Maintenance', value: stats?.maintenanceDevices || 0, color: STATUS_COLORS.maintenance },
  ];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Server className="h-4 w-4" />
          Device Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-2">
          <div className="text-2xl font-bold">{stats?.totalDevices || 0}</div>
          <div className="text-xs text-muted-foreground">Total Devices</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Analytics Summary ============
function AnalyticsSummary() {
  const { data: stats } = trpc.iotAnalytics.getStats.useQuery();
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{stats?.totalReports || 0}</div>
            <div className="text-xs text-muted-foreground">Reports</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.scheduledReports || 0}</div>
            <div className="text-xs text-muted-foreground">Scheduled</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.dataPointsToday || 0}</div>
            <div className="text-xs text-muted-foreground">Data Points Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats?.alertsToday || 0}</div>
            <div className="text-xs text-muted-foreground">Alerts Today</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Main Dashboard ============
export default function IoTEnhancedDashboard() {
  const [timeRange, setTimeRange] = useState('24h');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  
  const { data: managementStats, isLoading: statsLoading, refetch: refetchStats } = 
    trpc.iotDeviceManagement.getManagementStats.useQuery();
  
  const handleRefresh = () => {
    refetchStats();
    toast.success('Dashboard refreshed');
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">IoT Enhanced Dashboard</h1>
            <p className="text-muted-foreground">
              Advanced monitoring with device management, protocols, and analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{managementStats?.totalDevices || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Devices</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{managementStats?.onlineDevices || 0}</div>
                  <div className="text-xs text-muted-foreground">Online</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{managementStats?.errorDevices || 0}</div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{managementStats?.avgHealthScore || 100}%</div>
                  <div className="text-xs text-muted-foreground">Avg Health</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{managementStats?.pendingMaintenance || 0}</div>
                  <div className="text-xs text-muted-foreground">Pending Maint.</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-cyan-500" />
                <div>
                  <div className="text-2xl font-bold">{managementStats?.totalGroups || 0}</div>
                  <div className="text-xs text-muted-foreground">Groups</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="protocols">Protocols</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <DeviceStatusOverview />
              <ProtocolStatusCard />
              <AlertSummaryCard />
              <AnalyticsSummary />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <RealTimeMetricsChart />
              <MaintenanceCalendarCard />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DeviceGroupsTree />
            </div>
          </TabsContent>
          
          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Management</CardTitle>
                <CardDescription>
                  Manage device groups, templates, and health monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Device management features are available in the dedicated Device Management page</p>
                  <Button variant="outline" className="mt-4">
                    Go to Device Management
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="protocols" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Protocol Connections</CardTitle>
                <CardDescription>
                  MQTT, OPC-UA, and Modbus connection management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Protocol management features are available in the dedicated Protocol page</p>
                  <Button variant="outline" className="mt-4">
                    Go to Protocol Management
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Scheduling</CardTitle>
                <CardDescription>
                  Schedule and track device maintenance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceCalendarCard />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>IoT Analytics</CardTitle>
                <CardDescription>
                  Reports, widgets, and data analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics features are available in the dedicated Analytics page</p>
                  <Button variant="outline" className="mt-4">
                    Go to Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
