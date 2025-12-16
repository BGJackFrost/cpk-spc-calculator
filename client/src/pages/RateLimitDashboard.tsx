import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Shield, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Activity,
  AlertTriangle,
  Clock,
  Server,
  BarChart3
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function RateLimitDashboard() {
  const { language } = useLanguage();
  const [newIp, setNewIp] = useState("");
  
  const { data: stats, isLoading, refetch } = trpc.rateLimit.getStats.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  const { data: whitelist, refetch: refetchWhitelist } = trpc.rateLimit.getWhitelist.useQuery();
  
  const resetStatsMutation = trpc.rateLimit.resetStats.useMutation({
    onSuccess: () => {
      toast.success(language === "vi" ? "Đã reset thống kê" : "Statistics reset");
      refetch();
    },
  });
  
  const addToWhitelistMutation = trpc.rateLimit.addToWhitelist.useMutation({
    onSuccess: () => {
      toast.success(language === "vi" ? "Đã thêm IP vào whitelist" : "IP added to whitelist");
      setNewIp("");
      refetchWhitelist();
    },
  });
  
  const removeFromWhitelistMutation = trpc.rateLimit.removeFromWhitelist.useMutation({
    onSuccess: () => {
      toast.success(language === "vi" ? "Đã xóa IP khỏi whitelist" : "IP removed from whitelist");
      refetchWhitelist();
    },
  });

  const handleAddIp = () => {
    if (!newIp.trim()) return;
    addToWhitelistMutation.mutate({ ip: newIp.trim() });
  };

  // Prepare hourly data for chart
  const hourlyData = stats?.hourlyBlocked?.map((blocked, hour) => ({
    hour: `${hour}:00`,
    blocked,
  })) || [];

  // Format uptime
  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              {language === "vi" ? "Rate Limit Dashboard" : "Rate Limit Dashboard"}
            </h1>
            <p className="text-muted-foreground">
              {language === "vi" 
                ? "Giám sát và quản lý rate limiting" 
                : "Monitor and manage rate limiting"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {language === "vi" ? "Làm mới" : "Refresh"}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => resetStatsMutation.mutate()}
              disabled={resetStatsMutation.isPending}
            >
              {language === "vi" ? "Reset thống kê" : "Reset Stats"}
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {language === "vi" ? "Tổng Requests" : "Total Requests"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalRequests?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                {language === "vi" ? "Requests bị Block" : "Blocked Requests"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats?.blockedRequests?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.blockRate || "0%"} {language === "vi" ? "tỷ lệ block" : "block rate"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Server className="h-4 w-4" />
                {language === "vi" ? "Store Type" : "Store Type"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={stats?.config ? "default" : "secondary"}>
                {stats?.config ? "Memory" : "Loading..."}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.config?.maxRequests || 0} req/{(stats?.config?.windowMs || 900000) / 60000}min
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {language === "vi" ? "Uptime" : "Uptime"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.uptime ? formatUptime(stats.uptime) : "0h 0m"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hourly Blocked Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {language === "vi" ? "Requests bị Block theo Giờ" : "Hourly Blocked Requests"}
            </CardTitle>
            <CardDescription>
              {language === "vi" 
                ? "Số lượng requests bị block trong 24 giờ qua" 
                : "Number of blocked requests in the last 24 hours"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="blocked" fill="hsl(var(--destructive))" name="Blocked" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Blocked IPs */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "vi" ? "Top IP bị Block" : "Top Blocked IPs"}
              </CardTitle>
              <CardDescription>
                {language === "vi" 
                  ? "Các IP có nhiều requests bị block nhất" 
                  : "IPs with most blocked requests"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Blocked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.topBlockedIps?.length ? (
                    stats.topBlockedIps.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{item.ip}</TableCell>
                        <TableCell className="text-right">{item.total}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          {item.blocked}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        {language === "vi" ? "Không có dữ liệu" : "No data"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Blocked Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "vi" ? "Top Endpoints bị Block" : "Top Blocked Endpoints"}
              </CardTitle>
              <CardDescription>
                {language === "vi" 
                  ? "Các endpoints có nhiều requests bị block nhất" 
                  : "Endpoints with most blocked requests"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Blocked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.topBlockedEndpoints?.length ? (
                    stats.topBlockedEndpoints.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm truncate max-w-[200px]">
                          {item.endpoint}
                        </TableCell>
                        <TableCell className="text-right">{item.total}</TableCell>
                        <TableCell className="text-right text-destructive font-medium">
                          {item.blocked}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        {language === "vi" ? "Không có dữ liệu" : "No data"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* IP Whitelist Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {language === "vi" ? "Quản lý IP Whitelist" : "IP Whitelist Management"}
            </CardTitle>
            <CardDescription>
              {language === "vi" 
                ? "Các IP trong whitelist sẽ bypass rate limiting hoàn toàn" 
                : "Whitelisted IPs bypass rate limiting completely"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new IP */}
            <div className="flex gap-2">
              <Input
                placeholder={language === "vi" ? "Nhập địa chỉ IP..." : "Enter IP address..."}
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddIp()}
              />
              <Button 
                onClick={handleAddIp}
                disabled={!newIp.trim() || addToWhitelistMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {language === "vi" ? "Thêm" : "Add"}
              </Button>
            </div>

            {/* Whitelist table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-right">
                      {language === "vi" ? "Hành động" : "Actions"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whitelist?.length ? (
                    whitelist.map((ip, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{ip}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromWhitelistMutation.mutate({ ip })}
                            disabled={removeFromWhitelistMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        {language === "vi" ? "Whitelist trống" : "Whitelist is empty"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Config info */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <h4 className="font-medium mb-2">
                {language === "vi" ? "Cấu hình Rate Limit" : "Rate Limit Configuration"}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-muted-foreground">API:</span>
                  <span className="ml-2 font-mono">{stats?.config?.maxRequests || 0}/15min</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Auth:</span>
                  <span className="ml-2 font-mono">{stats?.config?.maxAuthRequests || 0}/15min</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Export:</span>
                  <span className="ml-2 font-mono">{stats?.config?.maxExportRequests || 0}/15min</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Window:</span>
                  <span className="ml-2 font-mono">{(stats?.config?.windowMs || 900000) / 60000}min</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
