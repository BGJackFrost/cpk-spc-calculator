import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Database, 
  RefreshCw, 
  Trash2, 
  Shield, 
  Activity, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Server,
  HardDrive,
  BarChart3,
  Plus,
  Minus
} from "lucide-react";
import { toast } from "sonner";
import PerformanceDashboardWidget from "@/components/PerformanceDashboardWidget";
import QueryCacheWidget from "@/components/QueryCacheWidget";
import PerformanceAlertWidget from "@/components/PerformanceAlertWidget";
import PerformanceReportExport from "@/components/PerformanceReportExport";
import ScheduledChecksWidget from "@/components/ScheduledChecksWidget";
import NotificationChannelsWidget from "@/components/NotificationChannelsWidget";
import { Bell, Timer } from "lucide-react";

export default function AdminMonitoring() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("cache");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [newWhitelistIp, setNewWhitelistIp] = useState("");

  // Cache stats query
  const { data: cacheStats, refetch: refetchCache, isLoading: cacheLoading } = trpc.cache.getStats.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );

  // Rate limit stats query
  const { data: rateLimitStats, refetch: refetchRateLimit, isLoading: rateLimitLoading } = trpc.rateLimit.getStats.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );

  // Rate limit whitelist query
  const { data: whitelistData, refetch: refetchWhitelist } = trpc.rateLimit.getWhitelist.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );

  // Rate limit enabled query
  const { data: enabledData, refetch: refetchEnabled } = trpc.rateLimit.getEnabled.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );

  // Role configs query
  const { data: roleConfigs } = trpc.rateLimit.getRoleConfigs.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );

  // Mutations
  const cleanupCacheMutation = trpc.cache.cleanup.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã dọn dẹp ${data.removedCount} entries hết hạn`);
      refetchCache();
    },
    onError: (error) => toast.error(error.message),
  });

  const clearCacheMutation = trpc.cache.clear.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa toàn bộ cache");
      refetchCache();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetMetricsMutation = trpc.cache.resetMetrics.useMutation({
    onSuccess: () => {
      toast.success("Đã reset metrics");
      refetchCache();
    },
    onError: (error) => toast.error(error.message),
  });

  const invalidatePatternMutation = trpc.cache.invalidatePattern.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã xóa ${data.removedCount} entries`);
      refetchCache();
    },
    onError: (error) => toast.error(error.message),
  });

  const addWhitelistMutation = trpc.rateLimit.addToWhitelist.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm IP vào whitelist");
      setNewWhitelistIp("");
      refetchWhitelist();
    },
    onError: (error) => toast.error(error.message),
  });

  const removeWhitelistMutation = trpc.rateLimit.removeFromWhitelist.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa IP khỏi whitelist");
      refetchWhitelist();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetRateLimitStatsMutation = trpc.rateLimit.resetStats.useMutation({
    onSuccess: () => {
      toast.success("Đã reset rate limit stats");
      refetchRateLimit();
    },
    onError: (error) => toast.error(error.message),
  });

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetchCache();
      refetchRateLimit();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetchCache, refetchRateLimit]);

  // Check admin access
  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-5 w-5" />
                Truy cập bị từ chối
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Bạn cần quyền Admin để truy cập trang này.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const hitRate = cacheStats?.hitRate ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Monitoring</h1>
            <p className="text-muted-foreground">
              Giám sát Cache và Rate Limiting
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                id="auto-refresh"
              />
              <Label htmlFor="auto-refresh">Auto Refresh</Label>
            </div>
            {autoRefresh && (
              <Select
                value={refreshInterval.toString()}
                onValueChange={(v) => setRefreshInterval(parseInt(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10s</SelectItem>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">60s</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchCache();
                refetchRateLimit();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-5xl grid-cols-8">
            <TabsTrigger value="cache" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Cache
            </TabsTrigger>
            <TabsTrigger value="ratelimit" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Rate Limit
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="querycache" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Query Cache
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Scheduled
            </TabsTrigger>
            <TabsTrigger value="channels" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Channels
            </TabsTrigger>
          </TabsList>

          {/* Cache Tab */}
          <TabsContent value="cache" className="space-y-6">
            {cacheLoading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Overview Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-blue-500" />
                        Cache Size
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{cacheStats?.size ?? 0}</div>
                      <p className="text-xs text-muted-foreground">entries</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Zap className="h-4 w-4 text-green-500" />
                        Hit Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{hitRate.toFixed(1)}%</div>
                      <Progress value={hitRate} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Hits
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{cacheStats?.hits ?? 0}</div>
                      <p className="text-xs text-muted-foreground">total hits</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Misses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{cacheStats?.misses ?? 0}</div>
                      <p className="text-xs text-muted-foreground">total misses</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Stats */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Cache Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Evictions</span>
                        <span className="font-medium">{cacheStats?.evictions ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expired Removed</span>
                        <span className="font-medium">{cacheStats?.expiredRemoved ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Cleanup</span>
                        <span className="font-medium">
                          {cacheStats?.lastCleanup 
                            ? new Date(cacheStats.lastCleanup).toLocaleString('vi-VN')
                            : 'N/A'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Keys by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {cacheStats?.keysByCategory && Object.keys(cacheStats.keysByCategory).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(cacheStats.keysByCategory).map(([category, count]) => (
                            <div key={category} className="flex justify-between items-center">
                              <span className="text-muted-foreground">{category}</span>
                              <Badge variant="secondary">{count as number}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No cached data</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Cache Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Cache Actions</CardTitle>
                    <CardDescription>Quản lý và dọn dẹp cache</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => cleanupCacheMutation.mutate()}
                      disabled={cleanupCacheMutation.isPending}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Cleanup Expired
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => resetMetricsMutation.mutate()}
                      disabled={resetMetricsMutation.isPending}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Reset Metrics
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Xóa toàn bộ cache?")) {
                          clearCacheMutation.mutate();
                        }
                      }}
                      disabled={clearCacheMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All Cache
                    </Button>
                  </CardContent>
                </Card>

                {/* Invalidate by Entity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Invalidate by Entity</CardTitle>
                    <CardDescription>Xóa cache theo loại dữ liệu</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {['products', 'workstations', 'machines', 'mappings', 'spc_plans', 'users'].map((entity) => (
                      <Button
                        key={entity}
                        variant="outline"
                        size="sm"
                        onClick={() => invalidatePatternMutation.mutate({ pattern: entity })}
                        disabled={invalidatePatternMutation.isPending}
                      >
                        {entity}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Rate Limit Tab */}
          <TabsContent value="ratelimit" className="space-y-6">
            {rateLimitLoading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Overview Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        Total Requests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{rateLimitStats?.totalRequests ?? 0}</div>
                      <p className="text-xs text-muted-foreground">all time</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Blocked
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{rateLimitStats?.blockedRequests ?? 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {typeof rateLimitStats?.blockRate === 'number' ? rateLimitStats.blockRate.toFixed(2) : '0'}% block rate
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(rateLimitStats as any)?.alertsTriggered ?? 0}</div>
                      <p className="text-xs text-muted-foreground">triggered</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Server className="h-4 w-4 text-purple-500" />
                        Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={enabledData?.enabled ? "default" : "secondary"}>
                        {enabledData?.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Store: Memory
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Rate Limit Config */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Current Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">General Limit</span>
                        <span className="font-medium">5000 / 15min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Auth Limit</span>
                        <span className="font-medium">200 / 15min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Export Limit</span>
                        <span className="font-medium">100 / 15min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Alert Threshold</span>
                        <span className="font-medium">5%</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Role Configurations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {roleConfigs && roleConfigs.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Role</TableHead>
                              <TableHead>Max Requests</TableHead>
                              <TableHead>Auth</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {roleConfigs.map((config) => (
                              <TableRow key={config.role}>
                                <TableCell className="font-medium">{config.role}</TableCell>
                                <TableCell>{config.maxRequests}</TableCell>
                                <TableCell>{config.maxAuthRequests}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-sm">Using default configs</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Whitelist Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">IP Whitelist</CardTitle>
                    <CardDescription>IPs không bị giới hạn rate limit</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="IP address (e.g., 192.168.1.1)"
                        value={newWhitelistIp}
                        onChange={(e) => setNewWhitelistIp(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button
                        onClick={() => {
                          if (newWhitelistIp) {
                            addWhitelistMutation.mutate({ ip: newWhitelistIp });
                          }
                        }}
                        disabled={!newWhitelistIp || addWhitelistMutation.isPending}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(whitelistData ?? []).map((ip) => (
                        <Badge key={ip} variant="outline" className="flex items-center gap-1">
                          {ip}
                          <button
                            onClick={() => removeWhitelistMutation.mutate({ ip })}
                            className="ml-1 hover:text-destructive"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => resetRateLimitStatsMutation.mutate()}
                      disabled={resetRateLimitStatsMutation.isPending}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Reset Statistics
                    </Button>
                  </CardContent>
                </Card>


              </>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <PerformanceDashboardWidget 
              autoRefresh={autoRefresh} 
              refreshInterval={refreshInterval} 
            />
          </TabsContent>

          {/* Query Cache Tab */}
          <TabsContent value="querycache" className="space-y-6">
            <QueryCacheWidget />
          </TabsContent>

          {/* Performance Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <PerformanceAlertWidget />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <PerformanceReportExport />
          </TabsContent>

          {/* Scheduled Checks Tab */}
          <TabsContent value="scheduled" className="space-y-6">
            <ScheduledChecksWidget />
          </TabsContent>

          {/* Notification Channels Tab */}
          <TabsContent value="channels" className="space-y-6">
            <NotificationChannelsWidget />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
