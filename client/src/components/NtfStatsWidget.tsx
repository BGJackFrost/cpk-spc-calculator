import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Link } from "wouter";

export default function NtfStatsWidget() {
  const { data: stats, isLoading } = trpc.ntfConfig.getCurrentStats.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            NTF Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            NTF Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Không có dữ liệu</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = () => {
    if (stats.ntfRate >= stats.criticalThreshold) return "text-red-500";
    if (stats.ntfRate >= stats.warningThreshold) return "text-yellow-500";
    return "text-green-500";
  };

  const getStatusBadge = () => {
    if (stats.ntfRate >= stats.criticalThreshold) {
      return <Badge variant="destructive">Nghiêm trọng</Badge>;
    }
    if (stats.ntfRate >= stats.warningThreshold) {
      return <Badge className="bg-yellow-500">Cảnh báo</Badge>;
    }
    return <Badge className="bg-green-500">Bình thường</Badge>;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            NTF Statistics (7 ngày)
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main NTF Rate */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">NTF Rate</p>
            <p className={`text-3xl font-bold ${getStatusColor()}`}>
              {stats.ntfRate.toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              7 ngày qua
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-lg font-semibold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Tổng lỗi</p>
          </div>
          <div className="p-2 bg-yellow-500/10 rounded">
            <p className="text-lg font-semibold text-yellow-600">{stats.ntfCount}</p>
            <p className="text-xs text-muted-foreground">NTF</p>
          </div>
          <div className="p-2 bg-red-500/10 rounded">
            <p className="text-lg font-semibold text-red-600">{stats.realNgCount}</p>
            <p className="text-xs text-muted-foreground">Real NG</p>
          </div>
        </div>

        {/* Mini Trend Chart */}
        {stats.trend && stats.trend.length > 0 && (
          <div className="h-16 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="ntfMiniGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={stats.ntfRate >= stats.criticalThreshold ? "#dc2626" : stats.ntfRate >= stats.warningThreshold ? "#f59e0b" : "#22c55e"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={stats.ntfRate >= stats.criticalThreshold ? "#dc2626" : stats.ntfRate >= stats.warningThreshold ? "#f59e0b" : "#22c55e"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="ntfRate" 
                  stroke={stats.ntfRate >= stats.criticalThreshold ? "#dc2626" : stats.ntfRate >= stats.warningThreshold ? "#f59e0b" : "#22c55e"}
                  fill="url(#ntfMiniGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pending Alert */}
        {stats.pendingCount > 0 && (
          <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded text-sm">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>{stats.pendingCount} lỗi chưa xác nhận</span>
          </div>
        )}

        {/* Link to config page */}
        <Link href="/ntf-config" className="block">
          <div className="flex items-center justify-center gap-1 text-xs text-primary hover:underline cursor-pointer">
            <TrendingUp className="w-3 h-3" />
            Xem chi tiết & cấu hình
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
