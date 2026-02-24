/**
 * Performance Dashboard Widget
 * Displays realtime connection pool stats, slow queries, and index usage
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  Database, 
  RefreshCw, 
  Activity, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Server,
  HardDrive,
  BarChart3,
  TrendingUp,
  Layers
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface PerformanceDashboardWidgetProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
}

export default function PerformanceDashboardWidget({
  autoRefresh = true,
  refreshInterval = 10,
}: PerformanceDashboardWidgetProps) {
  const [activeTab, setActiveTab] = useState("pool");
  const [poolHistory, setPoolHistory] = useState<any[]>([]);
  const [queryHistory, setQueryHistory] = useState<any[]>([]);

  // Connection pool stats
  const { data: poolStats, refetch: refetchPool, isLoading: poolLoading } = 
    trpc.connectionPool.getStats.useQuery(undefined, {
      refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    });

  // Connection pool health
  const { data: poolHealth, refetch: refetchHealth } = 
    trpc.connectionPool.getHealth.useQuery(undefined, {
      refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    });

  // Query performance stats
  const { data: queryStats, refetch: refetchQueryStats, isLoading: queryLoading } = 
    trpc.queryPerformance.getStats.useQuery(undefined, {
      refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    });

  // Slow queries
  const { data: slowQueries, refetch: refetchSlowQueries } = 
    trpc.queryPerformance.getSlowQueries.useQuery({ limit: 10 }, {
      refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    });

  // Index usage stats
  const { data: indexStats, isLoading: indexLoading } = 
    trpc.queryPerformance.getIndexUsageStats.useQuery(undefined, {
      refetchInterval: 60000, // Refresh every minute
    });

  // Table stats
  const { data: tableStats, isLoading: tableLoading } = 
    trpc.queryPerformance.getTableStats.useQuery(undefined, {
      refetchInterval: 60000,
    });

  // Update history for charts
  useEffect(() => {
    if (poolStats) {
      setPoolHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString(),
          active: poolStats.activeConnections,
          idle: poolStats.idleConnections,
          waiting: poolStats.waitingRequests,
          responseTime: poolStats.avgResponseTime,
        };
        const updated = [...prev, newEntry];
        return updated.slice(-30); // Keep last 30 data points
      });
    }
  }, [poolStats]);

  useEffect(() => {
    if (queryStats) {
      setQueryHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString(),
          total: queryStats.totalQueries,
          slow: queryStats.slowQueries,
          avgTime: queryStats.avgExecutionTime,
        };
        const updated = [...prev, newEntry];
        return updated.slice(-30);
      });
    }
  }, [queryStats]);

  const handleRefreshAll = () => {
    refetchPool();
    refetchHealth();
    refetchQueryStats();
    refetchSlowQueries();
  };

  const getHealthBadge = () => {
    if (!poolHealth) return <Badge variant="outline">Unknown</Badge>;
    
    switch (poolHealth.status) {
      case 'healthy':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Degraded</Badge>;
      case 'unhealthy':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Unhealthy</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Performance Monitor
            </CardTitle>
            <CardDescription>
              Connection pool, queries & database performance
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getHealthBadge()}
            <Button variant="outline" size="sm" onClick={handleRefreshAll}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pool" className="text-xs">
              <Server className="h-3 w-3 mr-1" />
              Pool
            </TabsTrigger>
            <TabsTrigger value="queries" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Queries
            </TabsTrigger>
            <TabsTrigger value="slow" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Slow
            </TabsTrigger>
            <TabsTrigger value="indexes" className="text-xs">
              <Layers className="h-3 w-3 mr-1" />
              Indexes
            </TabsTrigger>
          </TabsList>

          {/* Connection Pool Tab */}
          <TabsContent value="pool" className="space-y-4">
            {poolLoading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : poolStats ? (
              <>
                {/* Pool Stats Cards */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-xl font-bold">{poolStats.totalConnections}</div>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground">Active</div>
                    <div className="text-xl font-bold text-green-600">{poolStats.activeConnections}</div>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground">Idle</div>
                    <div className="text-xl font-bold text-blue-600">{poolStats.idleConnections}</div>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground">Waiting</div>
                    <div className="text-xl font-bold text-yellow-600">{poolStats.waitingRequests}</div>
                  </div>
                </div>

                {/* Pool Usage Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pool Usage</span>
                    <span>{poolStats.totalConnections > 0 
                      ? Math.round((poolStats.activeConnections / poolStats.totalConnections) * 100) 
                      : 0}%</span>
                  </div>
                  <Progress 
                    value={poolStats.totalConnections > 0 
                      ? (poolStats.activeConnections / poolStats.totalConnections) * 100 
                      : 0} 
                  />
                </div>

                {/* Response Time & Uptime */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span>Avg Response: {poolStats.avgResponseTime}ms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span>Uptime: {formatUptime(poolStats.uptime)}</span>
                  </div>
                </div>

                {/* Connection Chart */}
                {poolHistory.length > 1 && (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={poolHistory}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="active" 
                          stackId="1"
                          stroke="#22c55e" 
                          fill="#22c55e" 
                          fillOpacity={0.6}
                          name="Active"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="idle" 
                          stackId="1"
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.6}
                          name="Idle"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No pool data available
              </div>
            )}
          </TabsContent>

          {/* Query Stats Tab */}
          <TabsContent value="queries" className="space-y-4">
            {queryLoading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : queryStats ? (
              <>
                {/* Query Stats Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground">Total Queries</div>
                    <div className="text-xl font-bold">{queryStats.totalQueries}</div>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground">Slow Queries</div>
                    <div className="text-xl font-bold text-red-600">{queryStats.slowQueries}</div>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <div className="text-xs text-muted-foreground">Avg Time</div>
                    <div className="text-xl font-bold text-blue-600">{queryStats.avgExecutionTime}ms</div>
                  </div>
                </div>

                {/* Execution Time Range */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Min: {queryStats.minExecutionTime}ms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>Max: {queryStats.maxExecutionTime}ms</span>
                  </div>
                </div>

                {/* Threshold Info */}
                <div className="text-xs text-muted-foreground">
                  Slow query threshold: {queryStats.slowQueryThreshold}ms
                </div>

                {/* Query Chart */}
                {queryHistory.length > 1 && (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={queryHistory}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="avgTime" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={false}
                          name="Avg Time (ms)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No query data available
              </div>
            )}
          </TabsContent>

          {/* Slow Queries Tab */}
          <TabsContent value="slow" className="space-y-4">
            <ScrollArea className="h-64">
              {slowQueries && slowQueries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Time</TableHead>
                      <TableHead>Query</TableHead>
                      <TableHead className="w-[80px] text-right">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowQueries.map((query: any) => (
                      <TableRow key={query.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(query.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {query.query}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={query.executionTime > 500 ? "destructive" : "secondary"}>
                            {query.executionTime}ms
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>No slow queries detected</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Index Stats Tab */}
          <TabsContent value="indexes" className="space-y-4">
            {indexLoading || tableLoading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Table Stats Summary */}
                {tableStats && tableStats.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Top Tables by Size</div>
                    <ScrollArea className="h-40">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Table</TableHead>
                            <TableHead className="text-right">Rows</TableHead>
                            <TableHead className="text-right">Data</TableHead>
                            <TableHead className="text-right">Index</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableStats.slice(0, 10).map((table: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{table.tableName}</TableCell>
                              <TableCell className="text-right text-xs">{table.tableRows?.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-xs">{formatBytes(table.dataLength || 0)}</TableCell>
                              <TableCell className="text-right text-xs">{formatBytes(table.indexLength || 0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}

                {/* Index Stats Summary */}
                {indexStats && indexStats.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Total indexes: {new Set(indexStats.map((i: any) => `${i.tableName}.${i.indexName}`)).size}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
