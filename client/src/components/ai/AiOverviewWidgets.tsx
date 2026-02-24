import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/sparkline";
import { trpc } from "@/lib/trpc";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Activity,
  Target,
  Gauge,
  RefreshCw,
  Download,
  ChevronRight,
  Sparkles,
  BarChart3,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

// CPK Widget with Sparkline
export function CpkWidget() {
  const { data, isLoading, refetch } = trpc.ai.predictive.getDashboardWidgets.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Get sparkline data
  const { data: sparklineData } = trpc.ai.predictive.getSparklineData.useQuery(
    { type: "cpk", points: 20 },
    { refetchInterval: 30000 }
  );

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-20 mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const cpk = data?.cpkWidget;
  const TrendIcon = cpk?.trend === "up" ? TrendingUp : cpk?.trend === "down" ? TrendingDown : Minus;
  const trendColor = cpk?.trend === "up" ? "text-green-600" : cpk?.trend === "down" ? "text-red-600" : "text-gray-500";
  const cpkStatus = (cpk?.current || 0) >= 1.33 ? "good" : (cpk?.current || 0) >= 1.0 ? "warning" : "critical";
  const sparklineColor = cpkStatus === "good" ? "#22c55e" : cpkStatus === "warning" ? "#f59e0b" : "#ef4444";

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <Target className="h-4 w-4" />
          CPK Realtime
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {cpk?.current?.toFixed(3) || "0.000"}
          </span>
          <Badge variant={cpkStatus === "good" ? "default" : cpkStatus === "warning" ? "secondary" : "destructive"}>
            {cpkStatus === "good" ? "Tốt" : cpkStatus === "warning" ? "Cảnh báo" : "Nguy hiểm"}
          </Badge>
        </div>
        
        {/* Sparkline Chart */}
        {sparklineData?.data && sparklineData.data.length > 0 && (
          <div className="mt-3 mb-2">
            <Sparkline
              data={sparklineData.data}
              color={sparklineColor}
              height={35}
              trend={cpk?.trend}
              threshold={1.33}
              thresholdColor="#f59e0b"
            />
          </div>
        )}
        
        <div className={`flex items-center gap-1 mt-2 text-sm ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          <span>{cpk?.change && cpk.change > 0 ? "+" : ""}{cpk?.change?.toFixed(3) || "0.000"}</span>
          <span className="text-gray-500 dark:text-gray-400 ml-1">so với trước</span>
        </div>
        <Link href="/ai-predictive">
          <Button variant="link" className="p-0 h-auto mt-2 text-blue-600 dark:text-blue-400">
            Xem dự đoán <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// OEE Widget with Sparkline
export function OeeWidget() {
  const { data, isLoading, refetch } = trpc.ai.predictive.getDashboardWidgets.useQuery(undefined, {
    refetchInterval: 30000,
  });
  
  // Get sparkline data
  const { data: sparklineData } = trpc.ai.predictive.getSparklineData.useQuery(
    { type: "oee", points: 20 },
    { refetchInterval: 30000 }
  );

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-20 mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const oee = data?.oeeWidget;
  const TrendIcon = oee?.trend === "up" ? TrendingUp : oee?.trend === "down" ? TrendingDown : Minus;
  const trendColor = oee?.trend === "up" ? "text-green-600" : oee?.trend === "down" ? "text-red-600" : "text-gray-500";
  const oeeStatus = (oee?.current || 0) >= 85 ? "good" : (oee?.current || 0) >= 60 ? "warning" : "critical";
  const sparklineColor = oeeStatus === "good" ? "#22c55e" : oeeStatus === "warning" ? "#f59e0b" : "#ef4444";

  return (
    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          OEE Realtime
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-green-900 dark:text-green-100">
            {oee?.current?.toFixed(1) || "0.0"}%
          </span>
          <Badge variant={oeeStatus === "good" ? "default" : oeeStatus === "warning" ? "secondary" : "destructive"}>
            {oeeStatus === "good" ? "Tốt" : oeeStatus === "warning" ? "Cảnh báo" : "Thấp"}
          </Badge>
        </div>
        
        {/* Sparkline Chart */}
        {sparklineData?.data && sparklineData.data.length > 0 && (
          <div className="mt-3 mb-2">
            <Sparkline
              data={sparklineData.data}
              color={sparklineColor}
              height={35}
              trend={oee?.trend}
              threshold={85}
              thresholdColor="#f59e0b"
            />
          </div>
        )}
        
        <div className={`flex items-center gap-1 mt-2 text-sm ${trendColor}`}>
          <TrendIcon className="h-4 w-4" />
          <span>{oee?.change && oee.change > 0 ? "+" : ""}{oee?.change?.toFixed(1) || "0.0"}%</span>
          <span className="text-gray-500 dark:text-gray-400 ml-1">so với trước</span>
        </div>
        <Link href="/ai-predictive">
          <Button variant="link" className="p-0 h-auto mt-2 text-green-600 dark:text-green-400">
            Xem dự đoán <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// AI Alerts Widget
export function AiAlertsWidget() {
  const { data, isLoading } = trpc.ai.predictive.getDashboardWidgets.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: alerts } = trpc.ai.predictive.getTrendAlerts.useQuery(undefined, {
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-20 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const alertsData = data?.alertsWidget;

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          AI Cảnh báo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-amber-900 dark:text-amber-100">
            {alertsData?.total || 0}
          </span>
          <span className="text-sm text-amber-700 dark:text-amber-300">cảnh báo</span>
        </div>
        <div className="flex gap-2 mt-2">
          {(alertsData?.high || 0) > 0 && (
            <Badge variant="destructive" className="text-xs">
              {alertsData?.high} cao
            </Badge>
          )}
          {(alertsData?.medium || 0) > 0 && (
            <Badge variant="secondary" className="text-xs bg-amber-200 text-amber-800">
              {alertsData?.medium} TB
            </Badge>
          )}
          {(alertsData?.low || 0) > 0 && (
            <Badge variant="outline" className="text-xs">
              {alertsData?.low} thấp
            </Badge>
          )}
        </div>
        {alerts && alerts.length > 0 && (
          <div className="mt-3 text-xs text-amber-800 dark:text-amber-200 truncate">
            {alerts[0].message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// AI Predictions Widget with Sparkline
export function AiPredictionsWidget() {
  const { data, isLoading } = trpc.ai.predictive.getDashboardWidgets.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: accuracy } = trpc.ai.predictive.getAccuracyMetrics.useQuery(undefined, {
    refetchInterval: 60000,
  });
  
  // Get sparkline data for predictions
  const { data: sparklineData } = trpc.ai.predictive.getSparklineData.useQuery(
    { type: "predictions", points: 20 },
    { refetchInterval: 30000 }
  );

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-20 mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const predictions = data?.predictionsWidget;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
          <Brain className="h-4 w-4" />
          AI Dự đoán
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {predictions?.accuracy || 0}%
          </span>
          <span className="text-sm text-purple-700 dark:text-purple-300">độ chính xác</span>
        </div>
        
        {/* Sparkline Chart */}
        {sparklineData?.data && sparklineData.data.length > 0 && (
          <div className="mt-3 mb-2">
            <Sparkline
              data={sparklineData.data}
              color="#a855f7"
              height={35}
              threshold={80}
              thresholdColor="#22c55e"
            />
          </div>
        )}
        
        <div className="flex items-center gap-2 mt-2 text-sm text-purple-600 dark:text-purple-400">
          <Activity className="h-4 w-4" />
          <span>{predictions?.total || 0} điểm dữ liệu</span>
        </div>
        {accuracy && (
          <div className="mt-2 text-xs text-purple-600 dark:text-purple-400">
            CPK: {Number(accuracy.cpkAccuracy || 0).toFixed(1)}% | OEE: {Number(accuracy.oeeAccuracy || 0).toFixed(1)}%
          </div>
        )}
        <Link href="/ai-models">
          <Button variant="link" className="p-0 h-auto mt-2 text-purple-600 dark:text-purple-400">
            Xem models <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// AI Model Status Widget
export function AiModelStatusWidget() {
  const { data: models, isLoading } = trpc.ai.models.list.useQuery({ limit: 5 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeModels = models?.models?.filter((m) => m.status === "active") || [];
  const totalModels = models?.models?.length || 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          Trạng thái AI Models
        </CardTitle>
        <Badge variant="outline">{activeModels.length}/{totalModels} hoạt động</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {models?.models?.slice(0, 4).map((model) => (
            <div key={model.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${model.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="text-sm font-medium truncate max-w-[150px]">{model.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{Number(model.accuracy || 0).toFixed(1)}%</span>
                <Badge variant="outline" className="text-xs">{model.modelType}</Badge>
              </div>
            </div>
          ))}
        </div>
        <Link href="/ai-models">
          <Button variant="outline" size="sm" className="w-full mt-3">
            Xem tất cả models
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// AI Quick Actions Widget
export function AiQuickActionsWidget() {
  const exportHtml = trpc.ai.export.exportModelsReportHtml.useMutation();
  const exportExcel = trpc.ai.export.exportModelsReportExcel.useMutation();

  const handleExportHtml = async () => {
    try {
      const result = await exportHtml.mutateAsync();
      if (result.url) {
        window.open(result.url, "_blank");
      }
    } catch (error) {
      console.error("Export HTML error:", error);
    }
  };

  const handleExportExcel = async () => {
    try {
      const result = await exportExcel.mutateAsync();
      if (result.url) {
        window.open(result.url, "_blank");
      }
    } catch (error) {
      console.error("Export Excel error:", error);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-500" />
          Thao tác nhanh
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleExportHtml}
            disabled={exportHtml.isPending}
          >
            <Download className="h-4 w-4" />
            {exportHtml.isPending ? "Đang xuất..." : "Xuất HTML"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleExportExcel}
            disabled={exportExcel.isPending}
          >
            <Download className="h-4 w-4" />
            {exportExcel.isPending ? "Đang xuất..." : "Xuất Excel"}
          </Button>
          <Link href="/ai-training" className="col-span-2">
            <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Training mới
            </Button>
          </Link>
          <Link href="/ai-analytics" className="col-span-2">
            <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Xem Analytics
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Combined AI Overview Dashboard
export function AiOverviewDashboard() {
  return (
    <div className="space-y-4">
      {/* Main KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CpkWidget />
        <OeeWidget />
        <AiAlertsWidget />
        <AiPredictionsWidget />
      </div>

      {/* Secondary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AiModelStatusWidget />
        <AiQuickActionsWidget />
      </div>
    </div>
  );
}
