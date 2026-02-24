import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  History,
  TrendingUp,
  Target,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  BarChart3,
  Activity,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// Simple comparison chart
function ComparisonChart({ data }: { data: Array<{ date: string; predicted: number; actual: number | null }> }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        Chưa có dữ liệu để hiển thị
      </div>
    );
  }

  const validData = data.filter(d => d.actual !== null);
  if (validData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        Chưa có dữ liệu thực tế để so sánh
      </div>
    );
  }

  // Filter out NaN values and ensure valid numbers
  const safeData = data.filter(d => 
    typeof d.predicted === 'number' && !isNaN(d.predicted) && isFinite(d.predicted)
  );
  
  if (safeData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        Dữ liệu không hợp lệ
      </div>
    );
  }

  const maxValue = Math.max(...safeData.map(d => Math.max(d.predicted, d.actual || 0)));
  const minValue = Math.min(...validData.map(d => Math.min(d.predicted, d.actual || Infinity)));
  const range = maxValue - minValue || 1;

  // Safe point calculation helper
  const safePoint = (x: number, y: number) => {
    const safeX = isNaN(x) || !isFinite(x) ? 10 : x;
    const safeY = isNaN(y) || !isFinite(y) ? 75 : y;
    return `${safeX},${safeY}`;
  };

  return (
    <div className="h-48 relative">
      <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
        {[0, 1, 2, 3, 4].map(i => (
          <line key={i} x1="0" y1={30 * i + 15} x2="400" y2={30 * i + 15} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
        ))}
        
        {safeData.length > 1 && (
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={safeData.map((d, i) => {
              const x = (i / (safeData.length - 1)) * 380 + 10;
              const y = 135 - ((d.predicted - minValue) / range) * 120;
              return safePoint(x, y);
            }).join(" ")}
          />
        )}
        
        {validData.length > 1 && (
          <polyline
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            strokeDasharray="4"
            points={validData.map((d, i) => {
              const x = (i / (validData.length - 1)) * 380 + 10;
              const y = 135 - (((d.actual || 0) - minValue) / range) * 120;
              return safePoint(x, y);
            }).join(" ")}
          />
        )}
        
        {safeData.map((d, i) => {
          const x = (i / (safeData.length - 1 || 1)) * 380 + 10;
          const yPred = 135 - ((d.predicted - minValue) / range) * 120;
          const yActual = d.actual !== null ? 135 - ((d.actual - minValue) / range) * 120 : null;
          const safeX = isNaN(x) || !isFinite(x) ? 10 : x;
          const safeYPred = isNaN(yPred) || !isFinite(yPred) ? 75 : yPred;
          const safeYActual = yActual !== null && !isNaN(yActual) && isFinite(yActual) ? yActual : null;
          return (
            <g key={i}>
              <circle cx={safeX} cy={safeYPred} r="3" fill="#3b82f6" />
              {safeYActual !== null && <circle cx={safeX} cy={safeYActual} r="3" fill="#22c55e" />}
            </g>
          );
        })}
      </svg>
      
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500"></div>
          <span>Dự đoán</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-green-500"></div>
          <span>Thực tế</span>
        </div>
      </div>
    </div>
  );
}

export default function AiPredictionHistory() {
  const [predictionType, setPredictionType] = useState<"cpk" | "oee" | "defect_rate" | "trend" | undefined>(undefined);
  const [status, setStatus] = useState<"pending" | "verified" | "expired" | undefined>(undefined);
  const [days, setDays] = useState(30);

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = trpc.ai.history.list.useQuery({
    predictionType,
    status,
    limit: 100,
  });

  const { data: accuracyData, isLoading: accuracyLoading } = trpc.ai.history.getAccuracyMetrics.useQuery({
    predictionType,
    days,
  });

  const { data: cpkComparison } = trpc.ai.history.getComparisonData.useQuery({
    predictionType: "cpk",
    days,
    limit: 30,
  });

  const { data: oeeComparison } = trpc.ai.history.getComparisonData.useQuery({
    predictionType: "oee",
    days,
    limit: 30,
  });

  const autoVerifyMutation = trpc.ai.history.autoVerify.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      refetchHistory();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Đã xác nhận</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Chờ xác nhận</Badge>;
      case "expired":
        return <Badge variant="outline" className="text-gray-500"><XCircle className="h-3 w-3 mr-1" />Hết hạn</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "cpk": return "CPK";
      case "oee": return "OEE";
      case "defect_rate": return "Tỷ lệ lỗi";
      case "trend": return "Xu hướng";
      default: return type;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6 text-purple-500" />
              Lịch sử Dự đoán AI
            </h1>
            <p className="text-muted-foreground mt-1">
              So sánh độ chính xác dự đoán với kết quả thực tế
            </p>
          </div>
          <Button onClick={() => autoVerifyMutation.mutate()} disabled={autoVerifyMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${autoVerifyMutation.isPending ? "animate-spin" : ""}`} />
            Tự động xác nhận
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Độ chính xác tổng
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accuracyLoading ? <Skeleton className="h-10 w-20" /> : (
                <div className="text-3xl font-bold">{(100 - (accuracyData?.mape || 0)).toFixed(1)}%</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Dựa trên {accuracyData?.verifiedPredictions || 0} dự đoán
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Trong khoảng tin cậy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accuracyLoading ? <Skeleton className="h-10 w-20" /> : (
                <div className="text-3xl font-bold">{accuracyData?.withinConfidenceRate?.toFixed(1) || 0}%</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Dự đoán nằm trong CI 95%</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                MAE
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accuracyLoading ? <Skeleton className="h-10 w-20" /> : (
                <div className="text-3xl font-bold">{accuracyData?.mae?.toFixed(4) || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Mean Absolute Error</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                RMSE
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accuracyLoading ? <Skeleton className="h-10 w-20" /> : (
                <div className="text-3xl font-bold">{accuracyData?.rmse?.toFixed(4) || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Root Mean Square Error</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                So sánh CPK: Dự đoán vs Thực tế
              </CardTitle>
              <CardDescription>{days} ngày gần nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <ComparisonChart data={cpkComparison?.data || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Percent className="h-4 w-4 text-green-500" />
                So sánh OEE: Dự đoán vs Thực tế
              </CardTitle>
              <CardDescription>{days} ngày gần nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <ComparisonChart data={oeeComparison?.data || []} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Chi tiết lịch sử dự đoán</CardTitle>
                <CardDescription>Tổng: {historyData?.total || 0} dự đoán</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={predictionType || "all"} onValueChange={(v) => setPredictionType(v === "all" ? undefined : v as any)}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Loại" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="cpk">CPK</SelectItem>
                    <SelectItem value="oee">OEE</SelectItem>
                    <SelectItem value="defect_rate">Tỷ lệ lỗi</SelectItem>
                    <SelectItem value="trend">Xu hướng</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v as any)}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="pending">Chờ xác nhận</SelectItem>
                    <SelectItem value="verified">Đã xác nhận</SelectItem>
                    <SelectItem value="expired">Hết hạn</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ngày</SelectItem>
                    <SelectItem value="30">30 ngày</SelectItem>
                    <SelectItem value="90">90 ngày</SelectItem>
                    <SelectItem value="365">1 năm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="text-right">Dự đoán</TableHead>
                    <TableHead className="text-right">Thực tế</TableHead>
                    <TableHead className="text-right">Sai số %</TableHead>
                    <TableHead className="text-center">CI 95%</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData?.history?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Chưa có dữ liệu lịch sử
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyData?.history?.map((record) => {
                      const predicted = parseFloat(record.predictedValue);
                      const actual = record.actualValue ? parseFloat(record.actualValue) : null;
                      const percentError = record.percentError ? parseFloat(record.percentError) : null;
                      const isGood = percentError !== null && percentError < 5;
                      
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm">{new Date(record.predictedAt).toLocaleString("vi-VN")}</TableCell>
                          <TableCell><Badge variant="outline">{getTypeLabel(record.predictionType)}</Badge></TableCell>
                          <TableCell className="text-right font-mono">{predicted.toFixed(4)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {actual !== null ? (
                              <span className={actual > predicted ? "text-green-600" : "text-red-600"}>
                                {actual.toFixed(4)}
                                {actual > predicted ? <ArrowUpRight className="inline h-3 w-3 ml-1" /> : <ArrowDownRight className="inline h-3 w-3 ml-1" />}
                              </span>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {percentError !== null ? (
                              <span className={isGood ? "text-green-600" : "text-amber-600"}>{percentError.toFixed(2)}%</span>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {record.isWithinConfidence === 1 ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                            ) : record.isWithinConfidence === 0 ? (
                              <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
