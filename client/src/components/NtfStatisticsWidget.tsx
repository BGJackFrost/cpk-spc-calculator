import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface NtfStatisticsWidgetProps {
  machineId?: number;
  startDate?: string;
  endDate?: string;
}

export function NtfStatisticsWidget({ machineId, startDate, endDate }: NtfStatisticsWidgetProps) {
  const { data: stats, isLoading } = trpc.aviAoiEnhancement.ntfConfirmation.getStatistics.useQuery({
    machineId,
    startDate,
    endDate,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            NTF Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const reasonLabels: Record<string, string> = {
    machine_error: "Lỗi máy",
    lighting_issue: "Vấn đề ánh sáng",
    dust_particle: "Bụi/Hạt",
    false_detection: "Phát hiện sai",
    calibration_drift: "Lệch calibration",
    operator_error: "Lỗi người vận hành",
    material_variation: "Biến đổi vật liệu",
    other: "Khác",
  };

  const topReasons = stats?.byReason
    ? Object.entries(stats.byReason).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          NTF Statistics (Not True Fail)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Tổng NTF</span>
            <span className="text-2xl font-bold text-yellow-600">{stats?.total || 0}</span>
          </div>

          {topReasons.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Top nguyên nhân NTF</span>
              {topReasons.map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{reasonLabels[reason] || reason}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(count / (stats?.total || 1)) * 100}%` }} />
                    </div>
                    <span className="font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(!stats || stats.total === 0) && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              Không có NTF trong khoảng thời gian này
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default NtfStatisticsWidget;
