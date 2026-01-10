import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Unlock,
  XCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  RefreshCw,
  User,
  Clock
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mini sparkline chart component
function MiniSparkline({ data }: { data: { date: string; count: number }[] }) {
  if (!data || data.length === 0) return null;
  
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const width = 120;
  const height = 32;
  const padding = 2;
  
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (d.count / maxCount) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-red-500"
      />
      {data.map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - (d.count / maxCount) * (height - padding * 2);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2"
            className="fill-red-500"
          />
        );
      })}
    </svg>
  );
}

export default function SecurityDashboardWidget() {
  // Fetch security overview stats
  const overviewQuery = trpc.localAuth.getSecurityOverview.useQuery();
  
  // Fetch recent failed logins
  const failedLoginsQuery = trpc.localAuth.getRecentFailedLogins.useQuery({ hours: 24 });
  
  // Fetch locked accounts
  const lockedAccountsQuery = trpc.localAuth.getLockedAccounts.useQuery();
  
  // Fetch failed logins trend
  const trendQuery = trpc.localAuth.getFailedLoginsTrend.useQuery({ days: 7 });
  
  // Unlock account mutation
  const unlockMutation = trpc.localAuth.unlockAccount.useMutation({
    onSuccess: () => {
      toast.success("Đã mở khóa tài khoản");
      lockedAccountsQuery.refetch();
      overviewQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const handleUnlock = (username: string) => {
    unlockMutation.mutate({ username });
  };

  const refresh = () => {
    overviewQuery.refetch();
    failedLoginsQuery.refetch();
    lockedAccountsQuery.refetch();
    trendQuery.refetch();
    toast.success("Đã làm mới dữ liệu bảo mật");
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
    } catch {
      return dateStr;
    }
  };

  const overview = overviewQuery.data;
  const failedLogins = failedLoginsQuery.data;
  const lockedAccounts = lockedAccountsQuery.data;
  const trend = trendQuery.data || [];

  const isLoading = overviewQuery.isLoading || failedLoginsQuery.isLoading || lockedAccountsQuery.isLoading;

  // Calculate trend direction
  const trendDirection = trend.length >= 2 
    ? trend[trend.length - 1]?.count > trend[0]?.count ? 'up' : 'down'
    : 'stable';

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Security Overview</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Link href="/auth-audit-logs">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Chi tiết
              </Button>
            </Link>
          </div>
        </div>
        <CardDescription>
          Giám sát hoạt động xác thực và bảo mật hệ thống
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <Skeleton className="h-32" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Failed Logins 24h */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">Thất bại (24h)</span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {overview?.failedLogins24h || 0}
                </p>
                {trendDirection === 'up' && (
                  <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>Tăng</span>
                  </div>
                )}
                {trendDirection === 'down' && (
                  <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                    <TrendingDown className="h-3 w-3" />
                    <span>Giảm</span>
                  </div>
                )}
              </div>

              {/* Success Logins 24h */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Thành công (24h)</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {overview?.successLogins24h || 0}
                </p>
              </div>

              {/* Locked Accounts */}
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Đang khóa</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {overview?.currentlyLockedAccounts || 0}
                </p>
              </div>

              {/* Critical Events */}
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Critical (24h)</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {overview?.criticalEvents24h || 0}
                </p>
              </div>
            </div>

            {/* Failed Logins Trend */}
            {trend.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Xu hướng đăng nhập thất bại (7 ngày)</span>
                  <MiniSparkline data={trend} />
                </div>
              </div>
            )}

            {/* Locked Accounts List */}
            {lockedAccounts && lockedAccounts.count > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-orange-500" />
                    Tài khoản đang bị khóa ({lockedAccounts.count})
                  </h4>
                </div>
                <ScrollArea className="h-[120px]">
                  <div className="space-y-2">
                    {lockedAccounts.lockedAccounts.map((account: any) => (
                      <div 
                        key={account.id} 
                        className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
                            <User className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{account.username}</p>
                            <p className="text-xs text-muted-foreground">
                              {account.failed_attempts} lần thất bại • {formatTime(account.locked_at)}
                            </p>
                          </div>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleUnlock(account.username)}
                                disabled={unlockMutation.isPending}
                              >
                                <Unlock className="h-4 w-4 text-green-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Mở khóa tài khoản</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Recent Failed Logins */}
            {failedLogins && failedLogins.count > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Đăng nhập thất bại gần đây ({failedLogins.count} trong 24h)
                </h4>
                <ScrollArea className="h-[100px]">
                  <div className="space-y-1">
                    {failedLogins.recentAttempts.slice(0, 5).map((attempt: any) => (
                      <div 
                        key={attempt.id} 
                        className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{attempt.username || "Unknown"}</span>
                          <Badge variant="outline" className="text-xs">
                            {attempt.ip_address || "N/A"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(attempt.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* No issues message */}
            {(!lockedAccounts || lockedAccounts.count === 0) && 
             (!failedLogins || failedLogins.count === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">Không có vấn đề bảo mật nào cần chú ý</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
