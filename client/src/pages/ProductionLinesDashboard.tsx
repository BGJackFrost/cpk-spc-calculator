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
import RealtimePlanCard from "@/components/RealtimePlanCard";

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
                      {[2, 4, 6, 8, 10, 12, 16, 20, 24, 30].map(n => (
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
            displayCount <= 12 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
            displayCount <= 20 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5' :
            'grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'
          }`}>
            {displayPlans.slice(0, displayCount).map((plan: SpcPlan) => (
              <RealtimePlanCard
                key={plan.id}
                plan={plan}
                lineName={getLineName(plan.productionLineId)}
                samplingName={getSamplingName(plan.samplingConfigId)}
              />
            ))}
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
