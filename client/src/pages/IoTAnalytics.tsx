import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  BarChart3,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  FileText,
  Calendar,
  Clock,
  Play,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutGrid,
  PieChart,
  LineChart,
  Activity,
  Database,
  AlertTriangle,
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
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ============ Reports Tab ============
function ReportsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    name: '',
    description: '',
    reportType: 'device_health' as const,
    metrics: ['temperature', 'humidity'],
    timeRange: '7d',
    aggregation: 'hour' as const,
    scheduleEnabled: false,
    scheduleFrequency: 'daily' as const,
  });
  
  const { data: reports, refetch } = trpc.iotAnalytics.getReports.useQuery();
  const createMutation = trpc.iotAnalytics.createReport.useMutation({
    onSuccess: () => {
      toast.success('Report created');
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const generateMutation = trpc.iotAnalytics.generateReport.useMutation({
    onSuccess: (data) => {
      toast.success(`Report generated with ${data.data.length} data points`);
    },
    onError: (error) => toast.error(error.message),
  });
  
  const deleteMutation = trpc.iotAnalytics.deleteReport.useMutation({
    onSuccess: () => {
      toast.success('Report deleted');
      refetch();
    },
  });
  
  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'device_health': return <Activity className="h-4 w-4" />;
      case 'energy_consumption': return <TrendingUp className="h-4 w-4" />;
      case 'utilization': return <PieChart className="h-4 w-4" />;
      case 'maintenance': return <Calendar className="h-4 w-4" />;
      case 'alerts': return <AlertTriangle className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Analytics Reports</h3>
          <p className="text-sm text-muted-foreground">Create and manage custom reports</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create Analytics Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label>Report Name</Label>
                <Input 
                  value={newReport.name}
                  onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                  placeholder="Weekly Device Health Report"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                  placeholder="Describe the report purpose"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Report Type</Label>
                  <Select 
                    value={newReport.reportType}
                    onValueChange={(v: any) => setNewReport({ ...newReport, reportType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="device_health">Device Health</SelectItem>
                      <SelectItem value="energy_consumption">Energy Consumption</SelectItem>
                      <SelectItem value="utilization">Utilization</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="alerts">Alerts</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Time Range</Label>
                  <Select 
                    value={newReport.timeRange}
                    onValueChange={(v) => setNewReport({ ...newReport, timeRange: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1d">Last 24 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Aggregation</Label>
                <Select 
                  value={newReport.aggregation}
                  onValueChange={(v: any) => setNewReport({ ...newReport, aggregation: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minute">Minute</SelectItem>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={newReport.scheduleEnabled}
                    onCheckedChange={(v) => setNewReport({ ...newReport, scheduleEnabled: v })}
                  />
                  <Label>Enable Scheduled Generation</Label>
                </div>
                {newReport.scheduleEnabled && (
                  <Select 
                    value={newReport.scheduleFrequency}
                    onValueChange={(v: any) => setNewReport({ ...newReport, scheduleFrequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createMutation.mutate(newReport)}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-4">
        {reports?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              No reports created yet
            </CardContent>
          </Card>
        ) : (
          reports?.map((report) => (
            <Card key={report.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getReportTypeIcon(report.reportType)}
                    <CardTitle className="text-base">{report.name}</CardTitle>
                    <Badge variant="outline">{report.reportType}</Badge>
                    {report.scheduleEnabled && (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {report.scheduleFrequency}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => generateMutation.mutate({ reportId: report.id })}
                      disabled={generateMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteMutation.mutate({ id: report.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{report.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Time Range: {report.timeRange}</span>
                  <span>Aggregation: {report.aggregation}</span>
                  {report.lastGeneratedAt && (
                    <span>
                      Last Generated: {new Date(report.lastGeneratedAt).toLocaleString('vi-VN')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ============ Trend Analysis Tab ============
function TrendAnalysisTab() {
  const [deviceId, setDeviceId] = useState(1);
  const [metric, setMetric] = useState('temperature');
  const [days, setDays] = useState(30);
  
  const { data: trends, refetch, isLoading } = trpc.iotAnalytics.analyzeTrends.useQuery({
    deviceId,
    metric,
    days,
  });
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'decreasing': return <TrendingDown className="h-5 w-5 text-red-500" />;
      default: return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Trend Analysis</h3>
          <p className="text-sm text-muted-foreground">Analyze data trends over time</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Device ID</Label>
              <Input 
                type="number"
                value={deviceId}
                onChange={(e) => setDeviceId(parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temperature">Temperature</SelectItem>
                  <SelectItem value="humidity">Humidity</SelectItem>
                  <SelectItem value="pressure">Pressure</SelectItem>
                  <SelectItem value="power">Power</SelectItem>
                  <SelectItem value="vibration">Vibration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Days</Label>
              <Input 
                type="number"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Analyze
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {trends && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                {getTrendIcon(trends.trend)}
                <div>
                  <div className="text-2xl font-bold capitalize">{trends.trend}</div>
                  <div className="text-xs text-muted-foreground">Trend</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {trends.changePercent > 0 ? '+' : ''}{trends.changePercent}%
                  </div>
                  <div className="text-xs text-muted-foreground">Change</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{trends.average.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Average</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{trends.dataPoints}</div>
                  <div className="text-xs text-muted-foreground">Data Points</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {trends && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statistical Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Minimum</TableCell>
                  <TableCell>{trends.min.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Maximum</TableCell>
                  <TableCell>{trends.max.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Average</TableCell>
                  <TableCell>{trends.average.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Standard Deviation</TableCell>
                  <TableCell>{trends.stdDev.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Change Percent</TableCell>
                  <TableCell>{trends.changePercent.toFixed(2)}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ Data Aggregation Tab ============
function DataAggregationTab() {
  const [params, setParams] = useState({
    deviceIds: [] as number[],
    metrics: ['value'],
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    aggregation: 'hour' as const,
  });
  
  const { data: aggregatedData, refetch, isLoading } = trpc.iotAnalytics.getAggregatedData.useQuery({
    ...params,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Data Aggregation</h3>
          <p className="text-sm text-muted-foreground">Aggregate and visualize historical data</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Query Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input 
                type="date"
                value={params.startDate}
                onChange={(e) => setParams({ ...params, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input 
                type="date"
                value={params.endDate}
                onChange={(e) => setParams({ ...params, endDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Aggregation</Label>
              <Select 
                value={params.aggregation}
                onValueChange={(v: any) => setParams({ ...params, aggregation: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minute">Minute</SelectItem>
                  <SelectItem value="hour">Hour</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-end">
              <Button onClick={() => refetch()} disabled={isLoading} className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Query Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {aggregatedData && aggregatedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aggregated Data Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aggregatedData.slice(0, 100)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(v) => new Date(v).toLocaleDateString('vi-VN')}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(v) => new Date(v).toLocaleString('vi-VN')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
      {aggregatedData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Table</CardTitle>
            <CardDescription>{aggregatedData.length} records found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Device ID</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregatedData.slice(0, 50).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {new Date(row.timestamp).toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell>{row.deviceId || '-'}</TableCell>
                      <TableCell>{row.metric}</TableCell>
                      <TableCell>{row.value.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ Main Page ============
export default function IoTAnalytics() {
  const { data: stats, refetch } = trpc.iotAnalytics.getStats.useQuery();
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">IoT Analytics</h1>
            <p className="text-muted-foreground">
              Reports, trend analysis, and data aggregation
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.totalReports || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Reports</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.scheduledReports || 0}</div>
                  <div className="text-xs text-muted-foreground">Scheduled</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.dataPointsToday || 0}</div>
                  <div className="text-xs text-muted-foreground">Data Points Today</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{stats?.alertsToday || 0}</div>
                  <div className="text-xs text-muted-foreground">Alerts Today</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reports">
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="trends">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trend Analysis
            </TabsTrigger>
            <TabsTrigger value="aggregation">
              <BarChart3 className="h-4 w-4 mr-2" />
              Data Aggregation
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>
          
          <TabsContent value="trends">
            <TrendAnalysisTab />
          </TabsContent>
          
          <TabsContent value="aggregation">
            <DataAggregationTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
