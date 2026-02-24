import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";

interface YieldRateWidgetProps {
  machineId: number;
  startDate?: string;
  endDate?: string;
  targetYield?: number;
}

export function YieldRateWidget({ machineId, startDate, endDate, targetYield = 95 }: YieldRateWidgetProps) {
  const { data: stats, isLoading } = trpc.aviAoiEnhancement.yieldStats.getByMachine.useQuery({
    machineId,
    startDate,
    endDate,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            Yield Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const yieldRate = parseFloat(stats?.avgYieldRate || '0');
  const firstPassYield = parseFloat(stats?.avgFirstPassYield || '0');
  const ntfRate = parseFloat(stats?.avgNtfRate || '0');
  const isAboveTarget = yieldRate >= targetYield;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (stats?.dailyStats && stats.dailyStats.length >= 2) {
    const recent = parseFloat(stats.dailyStats[0]?.yieldRate || '0');
    const previous = parseFloat(stats.dailyStats[1]?.yieldRate || '0');
    if (recent > previous + 1) trend = 'up';
    else if (recent < previous - 1) trend = 'down';
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';
  const gaugeAngle = (yieldRate / 100) * 180;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-500" />
          Yield Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative flex justify-center">
            <svg viewBox="0 0 200 120" className="w-48 h-28">
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="currentColor" strokeWidth="16" className="text-muted" />
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={isAboveTarget ? '#22c55e' : '#ef4444'} strokeWidth="16" strokeDasharray={`${(gaugeAngle / 180) * 251.2} 251.2`} strokeLinecap="round" />
              <text x="100" y="85" textAnchor="middle" className="text-2xl font-bold fill-current">{yieldRate.toFixed(1)}%</text>
              <text x="100" y="105" textAnchor="middle" className="text-xs fill-muted-foreground">Yield Rate</text>
            </svg>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">{firstPassYield.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">FPY</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-yellow-600">{ntfRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">NTF Rate</div>
            </div>
            <div>
              <div className={`text-lg font-semibold flex items-center justify-center gap-1 ${trendColor}`}>
                <TrendIcon className="h-4 w-4" />
              </div>
              <div className="text-xs text-muted-foreground">Trend</div>
            </div>
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Tổng: </span>
            <span className="font-medium">{stats?.totalInspections || 0}</span>
            <span className="text-muted-foreground"> | OK: </span>
            <span className="font-medium text-green-600">{stats?.totalOk || 0}</span>
            <span className="text-muted-foreground"> | NG: </span>
            <span className="font-medium text-red-600">{stats?.totalNg || 0}</span>
          </div>

          <div className={`text-center text-xs ${isAboveTarget ? 'text-green-600' : 'text-red-600'}`}>
            {isAboveTarget ? '✓ Đạt target' : '✗ Chưa đạt target'} ({targetYield}%)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default YieldRateWidget;
