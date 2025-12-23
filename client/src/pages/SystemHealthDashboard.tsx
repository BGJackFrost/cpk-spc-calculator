import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSystemHealthData, useRealtimeData } from '@/hooks/useRealtimeData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Server, 
  Shield, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function SystemHealthDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time data subscription
  const { data: realtimeHealth, isConnected, lastUpdate } = useSystemHealthData();
  
  // Real-time event subscription for multiple channels
  const { messages: realtimeEvents } = useRealtimeData({
    channels: ['system:health', 'system:metrics', 'system:errors'],
    onMessage: (event) => {
      console.log('[SystemHealth] Realtime event:', event.type);
    }
  });

  // Mock data for demonstration
  const systemHealth = {
    status: 'healthy',
    uptime: '15d 7h 23m',
    lastCheck: new Date().toISOString(),
    services: [
      { name: 'Database', status: 'healthy', latency: 12 },
      { name: 'Cache', status: 'healthy', latency: 2 },
      { name: 'API Server', status: 'healthy', latency: 45 },
      { name: 'WebSocket', status: 'healthy', latency: 8 },
      { name: 'Job Queue', status: 'healthy', latency: 15 },
    ],
    metrics: {
      cpuUsage: 35,
      memoryUsage: 62,
      diskUsage: 45,
      networkLatency: 25,
      activeConnections: 127,
      requestsPerMinute: 450,
    },
  };

  const queryPerformance = {
    avgResponseTime: 45,
    slowQueries: 3,
    totalQueries: 15420,
    cacheHitRate: 87,
    topSlowQueries: [
      { query: 'SELECT * FROM spc_analysis_history...', avgTime: 1250, count: 45 },
      { query: 'SELECT * FROM measurements WHERE...', avgTime: 890, count: 123 },
      { query: 'INSERT INTO audit_logs...', avgTime: 450, count: 567 },
    ],
  };

  const errorStats = {
    totalErrors: 23,
    operationalErrors: 18,
    criticalErrors: 5,
    errorRate: 0.15,
    recentErrors: [
      { code: 'VALIDATION_ERROR', message: 'Invalid input data', count: 12, lastSeen: '5m ago' },
      { code: 'DATABASE_ERROR', message: 'Connection timeout', count: 5, lastSeen: '1h ago' },
      { code: 'RATE_LIMIT', message: 'Too many requests', count: 6, lastSeen: '30m ago' },
    ],
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-500">Healthy</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">Warning</Badge>;
      case 'critical': return <Badge className="bg-red-500">Critical</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Health Dashboard</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">
                Monitor system performance, errors, and resource usage
              </p>
              {/* Realtime Connection Indicator */}
              <div className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Button onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Activity className={`h-4 w-4 ${getStatusColor(systemHealth.status)}`} />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getStatusBadge(systemHealth.status)}
                <span className="text-sm text-muted-foreground">Uptime: {systemHealth.uptime}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queryPerformance.avgResponseTime}ms</div>
              <p className="text-xs text-muted-foreground">
                Cache hit rate: {queryPerformance.cacheHitRate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{errorStats.errorRate}%</div>
              <p className="text-xs text-muted-foreground">
                {errorStats.totalErrors} errors today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
              <Wifi className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.metrics.activeConnections}</div>
              <p className="text-xs text-muted-foreground">
                {systemHealth.metrics.requestsPerMinute} req/min
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Services Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Services Status
                  </CardTitle>
                  <CardDescription>Real-time status of all system services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {systemHealth.services.map((service) => (
                      <div key={service.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {service.status === 'healthy' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span>{service.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{service.latency}ms</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Resource Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    Resource Usage
                  </CardTitle>
                  <CardDescription>Current system resource utilization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPU Usage</span>
                      <span>{systemHealth.metrics.cpuUsage}%</span>
                    </div>
                    <Progress value={systemHealth.metrics.cpuUsage} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory Usage</span>
                      <span>{systemHealth.metrics.memoryUsage}%</span>
                    </div>
                    <Progress value={systemHealth.metrics.memoryUsage} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Disk Usage</span>
                      <span>{systemHealth.metrics.diskUsage}%</span>
                    </div>
                    <Progress value={systemHealth.metrics.diskUsage} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Query Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Query Performance
                  </CardTitle>
                  <CardDescription>Database query statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{queryPerformance.totalQueries.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total Queries</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{queryPerformance.slowQueries}</div>
                      <div className="text-xs text-muted-foreground">Slow Queries</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Slow Queries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Top Slow Queries
                  </CardTitle>
                  <CardDescription>Queries taking longest to execute</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {queryPerformance.topSlowQueries.map((query, index) => (
                      <div key={index} className="p-2 bg-muted rounded-lg">
                        <div className="text-sm font-mono truncate">{query.query}</div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Avg: {query.avgTime}ms</span>
                          <span>Count: {query.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Error Summary
                </CardTitle>
                <CardDescription>Recent errors and their frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{errorStats.totalErrors}</div>
                    <div className="text-xs text-muted-foreground">Total Errors</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-500">{errorStats.operationalErrors}</div>
                    <div className="text-xs text-muted-foreground">Operational</div>
                  </div>
                  <div className="text-center p-3 bg-red-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-red-500">{errorStats.criticalErrors}</div>
                    <div className="text-xs text-muted-foreground">Critical</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {errorStats.recentErrors.map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{error.code}</div>
                        <div className="text-sm text-muted-foreground">{error.message}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{error.count}x</div>
                        <div className="text-xs text-muted-foreground">{error.lastSeen}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    CPU
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-2">{systemHealth.metrics.cpuUsage}%</div>
                  <Progress value={systemHealth.metrics.cpuUsage} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {systemHealth.metrics.cpuUsage < 70 ? 'Normal load' : 'High load detected'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Memory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-2">{systemHealth.metrics.memoryUsage}%</div>
                  <Progress value={systemHealth.metrics.memoryUsage} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {systemHealth.metrics.memoryUsage < 80 ? 'Sufficient memory' : 'Memory pressure'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Disk
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold mb-2">{systemHealth.metrics.diskUsage}%</div>
                  <Progress value={systemHealth.metrics.diskUsage} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {systemHealth.metrics.diskUsage < 80 ? 'Adequate space' : 'Low disk space'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
