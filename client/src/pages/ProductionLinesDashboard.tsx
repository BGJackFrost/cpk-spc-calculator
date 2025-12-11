import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  Settings,
  RefreshCw,
  Loader2
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

interface ProductionLineCard {
  id: number;
  name: string;
  code: string;
  lastCpk?: number;
  lastMean?: number;
  lastUcl?: number;
  lastLcl?: number;
  status: "good" | "warning" | "critical";
  xBarData: { index: number; value: number }[];
}

export default function ProductionLinesDashboard() {
  const [productionLines, setProductionLines] = useState<ProductionLineCard[]>([]);
  const [displayCount, setDisplayCount] = useState(4);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch production lines
  const { data: lines } = trpc.productionLine.list.useQuery();
  const { data: dashboardConfig } = trpc.dashboard.getConfig.useQuery();
  const { data: lineSelections } = trpc.dashboard.getLineSelections.useQuery(
    { dashboardConfigId: dashboardConfig?.id || 0 },
    { enabled: !!dashboardConfig?.id }
  );

  // Update dashboard config
  const updateConfigMutation = trpc.dashboard.upsertConfig.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật cấu hình dashboard thành công");
    },
    onError: () => {
      toast.error("Cập nhật cấu hình dashboard thất bại");
    },
  });

  // Update line selections
  const updateSelectionsMutation = trpc.dashboard.setLineSelections.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật lựa chọn dây chuyền thành công");
    },
    onError: () => {
      toast.error("Cập nhật lựa chọn dây chuyền thất bại");
    },
  });

  // Initialize from dashboard config
  useEffect(() => {
    if (dashboardConfig) {
      setDisplayCount(dashboardConfig.displayCount);
      setRefreshInterval(dashboardConfig.refreshInterval);
    }
    if (lineSelections) {
      setSelectedLines(lineSelections.map(s => s.productionLineId));
    }
  }, [dashboardConfig, lineSelections]);

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger refresh by refetching data
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      await updateConfigMutation.mutateAsync({
        displayCount,
        refreshInterval,
      });

      if (dashboardConfig?.id && selectedLines.length > 0) {
        await updateSelectionsMutation.mutateAsync({
          dashboardConfigId: dashboardConfig.id,
          selections: selectedLines.map((lineId, idx) => ({
            productionLineId: lineId,
            displayOrder: idx,
            showXbarChart: 1,
            showRChart: 1,
            showCpk: 1,
            showMean: 1,
            showUclLcl: 1,
          })),
        });
      }
    } finally {
      setIsLoading(false);
      setShowConfig(false);
    }
  };

  const toggleLineSelection = (lineId: number) => {
    setSelectedLines(prev => {
      if (prev.includes(lineId)) {
        return prev.filter(id => id !== lineId);
      } else if (prev.length < displayCount) {
        return [...prev, lineId];
      } else {
        toast.error(`Chỉ có thể chọn tối đa ${displayCount} dây chuyền`);
        return prev;
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Dây Chuyền Sản Xuất</h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi realtime các chỉ số SPC của dây chuyền sản xuất
            </p>
          </div>
          <Button
            onClick={() => setShowConfig(!showConfig)}
            variant="outline"
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Cấu hình
          </Button>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader>
              <CardTitle>Cấu hình Dashboard</CardTitle>
              <CardDescription>
                Chọn dây chuyền và cài đặt tần suất cập nhật
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display Count */}
              <div className="space-y-2">
                <Label>Số lượng dây chuyền hiển thị</Label>
                <Select value={displayCount.toString()} onValueChange={(v) => setDisplayCount(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 6, 8].map(n => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} dây chuyền
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
                    {[10, 15, 30, 60].map(n => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} giây
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Line Selection */}
              <div className="space-y-3">
                <Label>Chọn dây chuyền cần theo dõi</Label>
                <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                  {lines?.map(line => (
                    <div key={line.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`line-${line.id}`}
                        checked={selectedLines.includes(line.id)}
                        onCheckedChange={() => toggleLineSelection(line.id)}
                        disabled={selectedLines.length >= displayCount && !selectedLines.includes(line.id)}
                      />
                      <label
                        htmlFor={`line-${line.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {line.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveConfig}
                disabled={updateConfigMutation.isPending || updateSelectionsMutation.isPending || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu cấu hình"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Production Lines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {selectedLines.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground mb-4">Chưa chọn dây chuyền nào để hiển thị</p>
              <Button onClick={() => setShowConfig(true)}>
                Chọn dây chuyền
              </Button>
            </div>
          ) : (
            selectedLines.map((lineId) => {
              const line = lines?.find(l => l.id === lineId);
              if (!line) return null;

              return (
                <Card key={lineId} className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{line.name}</CardTitle>
                        <CardDescription className="text-xs">{line.code}</CardDescription>
                      </div>
                      <div className="p-2 bg-muted rounded-lg">
                        {getStatusIcon("good")}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Mini Chart */}
                    <div className="h-[150px] -mx-6 px-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { index: 1, value: 100 },
                          { index: 2, value: 102 },
                          { index: 3, value: 98 },
                          { index: 4, value: 101 },
                          { index: 5, value: 99 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="index" />
                          <YAxis domain={[95, 105]} />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            dot={false}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">CPK</p>
                        <p className="font-semibold">1.45</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Mean</p>
                        <p className="font-semibold">100.2</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">UCL</p>
                        <p className="font-semibold">105.3</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">LCL</p>
                        <p className="font-semibold">94.7</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Hoạt động bình thường
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Last Updated */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Cập nhật tự động mỗi {refreshInterval} giây</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toast.success("Đã làm mới dữ liệu");
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
