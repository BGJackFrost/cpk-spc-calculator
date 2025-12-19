import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  Database, 
  Server, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock,
  Activity,
  HardDrive,
  Layers,
  Shield,
  ArrowRightLeft,
  Play,
  Square
} from "lucide-react";

export default function DatabaseHealthDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  
  // Health check query (public)
  const healthQuery = trpc.system.databaseHealth.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });
  
  // Detailed status query (admin only)
  const statusQuery = trpc.system.databaseStatus.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });
  
  // Failover status query
  const failoverQuery = trpc.system.failoverStatus.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });
  
  const handleRefresh = () => {
    healthQuery.refetch();
    statusQuery.refetch();
    failoverQuery.refetch();
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'not_configured':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>;
      case 'disconnected':
        return <Badge variant="destructive">Disconnected</Badge>;
      case 'not_configured':
        return <Badge variant="secondary">Not Configured</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Health Monitor</h1>
          <p className="text-muted-foreground mt-1">
            Monitor MySQL and PostgreSQL database connections
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="autoRefresh" className="text-sm">Auto-refresh</label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1"
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            )}
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${healthQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Overall Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Overall Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className={`p-2 rounded-full ${healthQuery.data?.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'}`}>
                {healthQuery.data?.status === 'healthy' 
                  ? <CheckCircle2 className="h-6 w-6 text-green-600" />
                  : <XCircle className="h-6 w-6 text-red-600" />
                }
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize">{healthQuery.data?.status || 'Unknown'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="p-2 rounded-full bg-blue-100">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Database</p>
                <p className="font-semibold uppercase">{healthQuery.data?.activeDatabase || 'N/A'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="p-2 rounded-full bg-purple-100">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Response Time</p>
                <p className="font-semibold">{healthQuery.data?.responseTimeMs || 0}ms</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="p-2 rounded-full bg-orange-100">
                <Layers className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Table Count</p>
                <p className="font-semibold">{healthQuery.data?.tableCount || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Database Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MySQL Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                MySQL (TiDB)
              </span>
              {getStatusBadge(healthQuery.data?.databases?.mysql?.status || 'unknown')}
            </CardTitle>
            <CardDescription>Primary production database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Configured</p>
                <p className="font-medium flex items-center gap-2">
                  {statusQuery.data?.mysql?.configured 
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : <XCircle className="h-4 w-4 text-red-500" />
                  }
                  {statusQuery.data?.mysql?.configured ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Connected</p>
                <p className="font-medium flex items-center gap-2">
                  {statusQuery.data?.mysql?.connected 
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : <XCircle className="h-4 w-4 text-red-500" />
                  }
                  {statusQuery.data?.mysql?.connected ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Table Count</p>
                <p className="font-medium">{statusQuery.data?.mysql?.tableCount ?? 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">DATABASE_URL</p>
                <p className="font-medium text-xs">
                  {statusQuery.data?.environment?.DATABASE_URL || 'not set'}
                </p>
              </div>
            </div>
            {statusQuery.data?.mysql?.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{statusQuery.data.mysql.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* PostgreSQL Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                PostgreSQL
              </span>
              {getStatusBadge(healthQuery.data?.databases?.postgresql?.status || 'unknown')}
            </CardTitle>
            <CardDescription>Secondary/backup database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Configured</p>
                <p className="font-medium flex items-center gap-2">
                  {statusQuery.data?.postgresql?.configured 
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : <XCircle className="h-4 w-4 text-red-500" />
                  }
                  {statusQuery.data?.postgresql?.configured ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Connected</p>
                <p className="font-medium flex items-center gap-2">
                  {statusQuery.data?.postgresql?.connected 
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : <XCircle className="h-4 w-4 text-red-500" />
                  }
                  {statusQuery.data?.postgresql?.connected ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Table Count</p>
                <p className="font-medium">{statusQuery.data?.postgresql?.tableCount ?? 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pool Size</p>
                <p className="font-medium">{statusQuery.data?.postgresql?.poolSize ?? 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Idle Connections</p>
                <p className="font-medium">{statusQuery.data?.postgresql?.idleCount ?? 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">POSTGRES_URL</p>
                <p className="font-medium text-xs">
                  {statusQuery.data?.environment?.POSTGRES_URL || 'not set'}
                </p>
              </div>
            </div>
            {statusQuery.data?.postgresql?.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{statusQuery.data.postgresql.error}</p>
              </div>
            )}
            {!statusQuery.data?.postgresql?.configured && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  To enable PostgreSQL, set <code className="bg-yellow-100 px-1 rounded">POSTGRES_URL</code> or{' '}
                  <code className="bg-yellow-100 px-1 rounded">PG_LOCAL_ENABLED=true</code> in environment variables.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Configuration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Current database configuration settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">DATABASE_TYPE</p>
              <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                {statusQuery.data?.environment?.DATABASE_TYPE || 'mysql (default)'}
              </code>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Active Database</p>
              <code className="text-sm font-mono bg-background px-2 py-1 rounded uppercase">
                {statusQuery.data?.activeDatabase || 'mysql'}
              </code>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Last Check</p>
              <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                {healthQuery.data?.timestamp 
                  ? new Date(healthQuery.data.timestamp).toLocaleTimeString()
                  : 'N/A'
                }
              </code>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">How to Switch Databases</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Set <code className="bg-blue-100 px-1 rounded">DATABASE_TYPE=postgresql</code> in environment</li>
              <li>Set <code className="bg-blue-100 px-1 rounded">POSTGRES_URL</code> with connection string</li>
              <li>Restart the server</li>
              <li>Verify connection on this dashboard</li>
            </ol>
          </div>
        </CardContent>
      </Card>
      
      {/* Failover Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Database Failover
          </CardTitle>
          <CardDescription>Automatic failover to PostgreSQL when MySQL is unavailable</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Failover Enabled</p>
              <div className="flex items-center gap-2">
                {failoverQuery.data?.enabled 
                  ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                  : <XCircle className="h-4 w-4 text-red-500" />
                }
                <span className="font-medium">{failoverQuery.data?.enabled ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Active Database</p>
              <Badge variant={failoverQuery.data?.isFailoverActive ? 'destructive' : 'default'}>
                {failoverQuery.data?.activeDatabase?.toUpperCase() || 'MYSQL'}
              </Badge>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Failover Count</p>
              <span className="font-medium text-lg">{failoverQuery.data?.failoverCount || 0}</span>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Recovery Count</p>
              <span className="font-medium text-lg">{failoverQuery.data?.recoveryCount || 0}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">MySQL Health</p>
              <div className="flex items-center gap-2">
                {failoverQuery.data?.mysqlHealthy 
                  ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                  : <XCircle className="h-4 w-4 text-red-500" />
                }
                <span className="font-medium">{failoverQuery.data?.mysqlHealthy ? 'Healthy' : 'Unhealthy'}</span>
                {failoverQuery.data?.lastMysqlCheck && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({new Date(failoverQuery.data.lastMysqlCheck).toLocaleTimeString()})
                  </span>
                )}
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">PostgreSQL Health</p>
              <div className="flex items-center gap-2">
                {failoverQuery.data?.postgresqlHealthy 
                  ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                  : <XCircle className="h-4 w-4 text-red-500" />
                }
                <span className="font-medium">{failoverQuery.data?.postgresqlHealthy ? 'Healthy' : 'Unhealthy'}</span>
                {failoverQuery.data?.lastPostgresqlCheck && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({new Date(failoverQuery.data.lastPostgresqlCheck).toLocaleTimeString()})
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {failoverQuery.data?.lastFailoverAt && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                <strong>Last Failover:</strong> {new Date(failoverQuery.data.lastFailoverAt).toLocaleString()}
              </p>
            </div>
          )}
          
          {failoverQuery.data?.lastRecoveryAt && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>Last Recovery:</strong> {new Date(failoverQuery.data.lastRecoveryAt).toLocaleString()}
              </p>
            </div>
          )}
          
          {!failoverQuery.data?.enabled && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Enable Automatic Failover</h4>
              <p className="text-sm text-blue-700 mb-2">
                Set <code className="bg-blue-100 px-1 rounded">DATABASE_FAILOVER_ENABLED=true</code> in environment to enable automatic failover.
              </p>
              <p className="text-sm text-blue-600">
                When enabled, the system will automatically switch to PostgreSQL if MySQL becomes unavailable,
                and recover back to MySQL when it's healthy again.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Response Time History (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time</CardTitle>
          <CardDescription>Database query response time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">
              Current: <span className="font-bold text-foreground">{statusQuery.data?.responseTimeMs || 0}ms</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
