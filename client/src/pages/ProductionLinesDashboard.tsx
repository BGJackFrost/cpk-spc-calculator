import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Settings,
  RefreshCw,
  Loader2,
  Calendar,
  Plus,
  Trash2,
  Activity,
  Clock,
  Play,
  Pause
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

interface ProductionLine {
  id: number;
  name: string;
  code: string;
}

interface SamplingConfig {
  id: number;
  name: string;
}

export default function ProductionLinesDashboard() {
  const { user } = useAuth();
  const [displayCount, setDisplayCount] = useState(4);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [selectedPlanIds, setSelectedPlanIds] = useState<number[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch SPC Plans
  const { data: spcPlans, refetch: refetchPlans } = trpc.spcPlan.list.useQuery();
  const { data: lines } = trpc.productionLine.list.useQuery();
  const { data: samplingConfigs } = trpc.sampling.list.useQuery();
  const { data: dashboardConfig, refetch: refetchConfig } = trpc.dashboard.getConfig.useQuery();

  // Update dashboard config
  const updateConfigMutation = trpc.dashboard.upsertConfig.useMutation({
    onSuccess: () => {
      refetchConfig();
      toast.success("Cập nhật cấu hình dashboard thành công");
    },
    onError: (err: any) => {
      toast.error(`Cập nhật thất bại: ${err.message}`);
    },
  });

  // Initialize from dashboard config
  useEffect(() => {
    if (dashboardConfig) {
      setDisplayCount(dashboardConfig.displayCount);
      setRefreshInterval(dashboardConfig.refreshInterval);
    }
  }, [dashboardConfig]);

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      refetchPlans();
      setLastRefresh(new Date());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval, refetchPlans]);

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      await updateConfigMutation.mutateAsync({
        displayCount,
        refreshInterval,
      });
    } finally {
      setIsLoading(false);
      setShowConfig(false);
    }
  };

  const togglePlanSelection = (planId: number) => {
    setSelectedPlanIds(prev => {
      if (prev.includes(planId)) {
        return prev.filter(id => id !== planId);
      } else if (prev.length < displayCount) {
        return [...prev, planId];
      } else {
        toast.error(`Chỉ có thể chọn tối đa ${displayCount} kế hoạch`);
        return prev;
      }
    });
  };

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

  const getStatusBadge = (cpk: number | undefined) => {
    if (cpk === undefined) return <Badge variant="outline">Chưa có dữ liệu</Badge>;
    if (cpk >= 1.67) return <Badge className="bg-green-100 text-green-700">Xuất sắc (CPK ≥ 1.67)</Badge>;
    if (cpk >= 1.33) return <Badge className="bg-blue-100 text-blue-700">Tốt (CPK ≥ 1.33)</Badge>;
    if (cpk >= 1.0) return <Badge className="bg-yellow-100 text-yellow-700">Chấp nhận (CPK ≥ 1.0)</Badge>;
    return <Badge className="bg-red-100 text-red-700">Cần cải tiến (CPK &lt; 1.0)</Badge>;
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

  const getLineName = (lineId: number) => {
    const line = lines?.find((l: ProductionLine) => l.id === lineId);
    return line?.name || `Line ${lineId}`;
  };

  const getSamplingName = (configId: number) => {
    const config = samplingConfigs?.find((c: SamplingConfig) => c.id === configId);
    return config?.name || `Config ${configId}`;
  };

  // Filter active plans for display
  const activePlans = spcPlans?.filter((p: SpcPlan) => p.status === "active") || [];
  
  // Get plans to display based on selection or show active plans
  const displayPlans = selectedPlanIds.length > 0
    ? spcPlans?.filter((p: SpcPlan) => selectedPlanIds.includes(p.id))
    : activePlans.slice(0, displayCount);

  // Generate mock data for demo
  const generateMockData = (planId: number) => {
    const baseValue = 50 + (planId * 3);
    return Array.from({ length: 20 }, (_, i) => ({
      index: i + 1,
      value: baseValue + (Math.random() - 0.5) * 10,
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Kế hoạch SPC Realtime</h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi realtime các kế hoạch lấy mẫu SPC đang hoạt động
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchPlans();
                setLastRefresh(new Date());
                toast.success("Đã làm mới dữ liệu");
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Button
              onClick={() => setShowConfig(!showConfig)}
              variant="outline"
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Cấu hình
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>Hiển thị {displayPlans?.length || 0} / {activePlans.length} kế hoạch đang chạy</span>
          </div>
          <div>
            Cập nhật lần cuối: {lastRefresh.toLocaleTimeString()} | Tự động làm mới mỗi {refreshInterval}s
          </div>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader>
              <CardTitle>Cấu hình Dashboard</CardTitle>
              <CardDescription>
                Chọn kế hoạch SPC và cài đặt tần suất cập nhật
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display Count */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Số lượng kế hoạch hiển thị</Label>
                  <Select value={displayCount.toString()} onValueChange={(v) => setDisplayCount(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 4, 6, 8, 10, 12].map(n => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} kế hoạch
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Refresh Interval */}
                <div className="space-y-2">
                  <Label>Tần suất cập nhật (giây)</Label>
                  <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 30, 60, 120].map(n => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} giây
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SPC Plan Selection */}
              <div className="space-y-3">
                <Label>Chọn kế hoạch SPC để theo dõi</Label>
                <p className="text-xs text-muted-foreground">
                  Chọn các kế hoạch SPC bạn muốn theo dõi realtime. Nếu không chọn, sẽ hiển thị các kế hoạch đang chạy.
                </p>
                
                {/* Selected plans */}
                {selectedPlanIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedPlanIds.map((planId) => {
                      const plan = spcPlans?.find((p: SpcPlan) => p.id === planId);
                      return (
                        <Badge key={planId} variant="secondary" className="flex items-center gap-1 py-1.5">
                          <Calendar className="h-3 w-3" />
                          {plan?.name || `Plan ${planId}`}
                          <button
                            onClick={() => togglePlanSelection(planId)}
                            className="ml-1 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Available plans */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 border rounded-lg">
                  {spcPlans?.filter((plan: SpcPlan) => !selectedPlanIds.includes(plan.id))
                    .map((plan: SpcPlan) => (
                    <div
                      key={plan.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                        plan.status === "active" ? "border-green-200 bg-green-50/30" : ""
                      }`}
                      onClick={() => togglePlanSelection(plan.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{plan.name}</span>
                        {getPlanStatusBadge(plan.status)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getSamplingName(plan.samplingConfigId)}
                        </div>
                        <div>Dây chuyền: {getLineName(plan.productionLineId)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveConfig} disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Lưu cấu hình
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SPC Plans Grid */}
        {displayPlans && displayPlans.length > 0 ? (
          <div className={`grid gap-4 ${
            displayCount <= 2 ? 'grid-cols-1 md:grid-cols-2' :
            displayCount <= 4 ? 'grid-cols-1 md:grid-cols-2' :
            displayCount <= 6 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {displayPlans.slice(0, displayCount).map((plan: SpcPlan) => {
              const mockData = generateMockData(plan.id);
              const lastValue = mockData[mockData.length - 1]?.value || 0;
              const mean = mockData.reduce((sum, d) => sum + d.value, 0) / mockData.length;
              const stdDev = Math.sqrt(mockData.reduce((sum, d) => sum + Math.pow(d.value - mean, 2), 0) / mockData.length);
              const ucl = mean + 3 * stdDev;
              const lcl = mean - 3 * stdDev;
              const mockCpk = 1.2 + (Math.random() - 0.5) * 0.8;
              const status = mockCpk >= 1.33 ? "good" : mockCpk >= 1.0 ? "warning" : "critical";

              return (
                <Card key={plan.id} className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                      </div>
                      {getStatusIcon(status)}
                    </div>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Dây chuyền: {getLineName(plan.productionLineId)}</span>
                        {getPlanStatusBadge(plan.status)}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {getSamplingName(plan.samplingConfigId)}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Mini Chart */}
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mockData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="index" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                          <Tooltip
                            contentStyle={{ fontSize: 12 }}
                            formatter={(value: number) => [value.toFixed(3), 'Giá trị']}
                          />
                          <ReferenceLine y={ucl} stroke="#ef4444" strokeDasharray="5 5" />
                          <ReferenceLine y={mean} stroke="#22c55e" strokeDasharray="3 3" />
                          <ReferenceLine y={lcl} stroke="#ef4444" strokeDasharray="5 5" />
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
                          {mockCpk.toFixed(3)}
                        </div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-muted-foreground text-xs">Mean</div>
                        <div className="font-bold">{mean.toFixed(3)}</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-muted-foreground text-xs">UCL</div>
                        <div className="font-bold text-red-600">{ucl.toFixed(3)}</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-muted-foreground text-xs">LCL</div>
                        <div className="font-bold text-red-600">{lcl.toFixed(3)}</div>
                      </div>
                    </div>

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
            })}
          </div>
        ) : (
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Chưa có kế hoạch SPC nào đang chạy</h3>
              <p className="text-muted-foreground mb-4">
                Hãy tạo và kích hoạt kế hoạch SPC để theo dõi realtime, hoặc chọn kế hoạch từ cấu hình.
              </p>
              <Button onClick={() => setShowConfig(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Cấu hình Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
