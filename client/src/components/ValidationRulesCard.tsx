import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/Sparkline";
import { trpc } from "@/lib/trpc";
import { ShieldCheck, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface ValidationRulesCardProps {
  className?: string;
}

export function ValidationRulesCard({ className }: ValidationRulesCardProps) {
  const { data: rules, isLoading: rulesLoading } = trpc.validationRule.list.useQuery();
  const { data: violationsByDay, isLoading: violationsLoading } = trpc.validationRule.getViolationsByDay.useQuery({ days: 7 });
  const { data: recentViolations, isLoading: recentLoading } = trpc.validationRule.getRecentViolations.useQuery({ limit: 3 });

  const activeRules = rules?.filter((r: any) => r.isActive === 1) || [];
  const violationData = violationsByDay?.map((d: any) => d.violations) || [];
  const totalViolations = violationData.reduce((a: number, b: number) => a + b, 0);

  const isLoading = rulesLoading || violationsLoading || recentLoading;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  return (
    <Card className={`bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-chart-4" />
          <CardTitle className="text-sm font-medium">Validation Rules</CardTitle>
        </div>
        <Link href="/validation-rules">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            Xem tất cả <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{activeRules.length}</div>
                <p className="text-xs text-muted-foreground">Quy tắc đang hoạt động</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  {totalViolations > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : null}
                  <span className={`text-lg font-semibold ${totalViolations > 0 ? 'text-destructive' : 'text-chart-3'}`}>
                    {totalViolations}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Vi phạm 7 ngày qua</p>
              </div>
            </div>

            {/* Sparkline */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Xu hướng:</span>
              <Sparkline
                data={violationData}
                width={120}
                height={24}
                strokeColor={totalViolations > 0 ? "hsl(var(--destructive))" : "hsl(var(--chart-3))"}
                fillColor={totalViolations > 0 ? "hsl(var(--destructive))" : "hsl(var(--chart-3))"}
                strokeWidth={1.5}
                className="flex-1"
              />
            </div>

            {/* Recent Violations */}
            {recentViolations && recentViolations.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground">Vi phạm gần đây:</p>
                <div className="space-y-1.5">
                  {recentViolations.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge className={`${getSeverityColor(v.severity)} text-[10px] px-1.5 py-0`}>
                          {v.severity === "critical" ? "Nghiêm trọng" : 
                           v.severity === "high" ? "Cao" : 
                           v.severity === "medium" ? "TB" : "Thấp"}
                        </Badge>
                        <span className="truncate">{v.ruleName || `Rule #${v.ruleId}`}</span>
                      </div>
                      <span className="text-muted-foreground text-[10px] whitespace-nowrap ml-2">
                        {formatDistanceToNow(new Date(v.executedAt), { addSuffix: true, locale: vi })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!recentViolations || recentViolations.length === 0) && totalViolations === 0 && (
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">Không có vi phạm nào trong 7 ngày qua</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ValidationRulesCard;
