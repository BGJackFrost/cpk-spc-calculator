import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Brain, AlertTriangle, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, Bell, CheckCircle } from "lucide-react";

export default function NtfAiMonitor() {
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const monitorMutation = trpc.ntfConfig.monitorNtfTrend.useMutation({
    onSuccess: (data) => {
      if (data) {
        setLastCheck(new Date());
        if (data.isAbnormal) {
          toast.warning('Phát hiện xu hướng NTF bất thường!', {
            description: `NTF rate tăng ${data.change.toFixed(1)}% so với tuần trước`,
            duration: 10000,
          });
        }
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCheck = () => {
    monitorMutation.mutate();
  };

  // Auto-check on mount
  useEffect(() => {
    handleCheck();
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-5 h-5 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="w-5 h-5 text-green-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Nghiêm trọng</Badge>;
      case 'high':
        return <Badge className="bg-red-500">Cao</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Trung bình</Badge>;
      default:
        return <Badge className="bg-green-500">Thấp</Badge>;
    }
  };

  const data = monitorMutation.data;

  return (
    <Card className={data?.isAbnormal ? "border-red-500/50 bg-red-500/5" : "border-green-500/50 bg-green-500/5"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Giám sát NTF
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCheck} disabled={monitorMutation.isPending}>
            {monitorMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
        {lastCheck && (
          <CardDescription className="text-xs">
            Kiểm tra lúc: {lastCheck.toLocaleTimeString('vi-VN')}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {monitorMutation.isPending ? "Đang phân tích..." : "Nhấn để kiểm tra"}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Trạng thái</span>
              {data.isAbnormal ? (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Bất thường</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Bình thường</span>
                </div>
              )}
            </div>

            {/* Trend */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Xu hướng</span>
              <div className="flex items-center gap-2">
                {getTrendIcon(data.trend)}
                <span className="text-sm">
                  {data.trend === 'increasing' ? 'Tăng' : data.trend === 'decreasing' ? 'Giảm' : 'Ổn định'}
                </span>
              </div>
            </div>

            {/* Rates */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted rounded">
                <div className="text-muted-foreground text-xs">7 ngày gần</div>
                <div className="font-bold">{data.recentAvg.toFixed(1)}%</div>
              </div>
              <div className="p-2 bg-muted rounded">
                <div className="text-muted-foreground text-xs">7 ngày trước</div>
                <div className="font-bold">{data.olderAvg.toFixed(1)}%</div>
              </div>
            </div>

            {/* Change */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Thay đổi</span>
              <span className={`text-sm font-bold ${data.change > 0 ? 'text-red-500' : data.change < 0 ? 'text-green-500' : ''}`}>
                {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}%
              </span>
            </div>

            {/* AI Analysis */}
            {data.aiAnalysis && (
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Mức độ</span>
                  {getSeverityBadge(data.aiAnalysis.severity)}
                </div>
                {data.aiAnalysis.message && (
                  <p className="text-xs text-muted-foreground">{data.aiAnalysis.message}</p>
                )}
                {data.aiAnalysis.recommendations?.length > 0 && (
                  <div className="text-xs">
                    <p className="text-muted-foreground mb-1">Khuyến nghị:</p>
                    <ul className="space-y-1">
                      {data.aiAnalysis.recommendations.slice(0, 2).map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-primary">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
