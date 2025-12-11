import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  Clock,
  Play,
  Pause,
  Info
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface SpcPlan {
  id: number;
  name: string;
  description?: string | null;
  productionLineId: number;
  productId?: number | null;
  samplingConfigId: number;
  mappingId?: number | null;
  status: string;
  startTime?: Date | null;
  endTime?: Date | null;
}

interface RealtimePlanCardProps {
  plan: SpcPlan;
  lineName: string;
  samplingName: string;
}

export default function RealtimePlanCard({ plan, lineName, samplingName }: RealtimePlanCardProps) {
  // Fetch realtime data for this plan
  const { data: realtimeData, isLoading } = trpc.dashboard.getRealtimeData.useQuery(
    { planId: plan.id },
    { refetchInterval: 30000 } // Refetch every 30 seconds
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good": return "text-green-600";
      case "warning": return "text-yellow-600";
      case "critical": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good": return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "critical": return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return null;
    }
  };

  const getPlanStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700"><Play className="h-3 w-3 mr-1" />Đang chạy</Badge>;
      case "paused":
        return <Badge className="bg-yellow-100 text-yellow-700"><Pause className="h-3 w-3 mr-1" />Tạm dừng</Badge>;
      case "completed":
        return <Badge className="bg-gray-100 text-gray-700">Hoàn thành</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Determine status based on CPK
  const cpk = realtimeData?.cpk;
  const status = cpk === null || cpk === undefined 
    ? "unknown" 
    : cpk >= 1.33 ? "good" : cpk >= 1.0 ? "warning" : "critical";

  // Chart data
  const chartData = realtimeData?.data || [];
  const mean = realtimeData?.mean || 0;
  const ucl = realtimeData?.ucl || 0;
  const lcl = realtimeData?.lcl || 0;

  return (
    <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{plan.name}</CardTitle>
          </div>
          {realtimeData?.hasData && getStatusIcon(status)}
        </div>
        <CardDescription className="space-y-1">
          <div className="flex items-center justify-between">
            <span>Dây chuyền: {lineName}</span>
            {getPlanStatusBadge(plan.status)}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {samplingName}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !realtimeData?.hasData ? (
          <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
            <Info className="h-8 w-8 mb-2" />
            <p className="text-sm">Chưa có dữ liệu phân tích</p>
            <p className="text-xs">Thực hiện phân tích để hiển thị dữ liệu</p>
          </div>
        ) : (
          <>
            {/* Mini Chart */}
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value: number) => [value.toFixed(3), 'Giá trị']}
                  />
                  {ucl > 0 && <ReferenceLine y={ucl} stroke="#ef4444" strokeDasharray="5 5" />}
                  {mean > 0 && <ReferenceLine y={mean} stroke="#22c55e" strokeDasharray="3 3" />}
                  {lcl > 0 && <ReferenceLine y={lcl} stroke="#ef4444" strokeDasharray="5 5" />}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">CPK</div>
                <div className={`font-bold ${getStatusColor(status)}`}>
                  {cpk?.toFixed(3) || 'N/A'}
                </div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">Mean</div>
                <div className="font-bold">{mean?.toFixed(3) || 'N/A'}</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">UCL</div>
                <div className="font-bold text-red-600">{ucl?.toFixed(3) || 'N/A'}</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">LCL</div>
                <div className="font-bold text-red-600">{lcl?.toFixed(3) || 'N/A'}</div>
              </div>
            </div>

            {/* Last updated */}
            {realtimeData.lastUpdated && (
              <div className="text-xs text-muted-foreground text-center">
                Cập nhật: {new Date(realtimeData.lastUpdated).toLocaleString('vi-VN')}
              </div>
            )}
          </>
        )}

        {/* Time info */}
        {(plan.startTime || plan.endTime) && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            {plan.startTime && (
              <div>Bắt đầu: {new Date(plan.startTime).toLocaleString('vi-VN')}</div>
            )}
            {plan.endTime ? (
              <div>Kết thúc: {new Date(plan.endTime).toLocaleString('vi-VN')}</div>
            ) : (
              <div className="text-green-600">Chạy liên tục</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
