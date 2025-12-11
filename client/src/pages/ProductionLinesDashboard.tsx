import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  Settings,
  RefreshCw,
  Loader2,
  Factory,
  Plus,
  Trash2,
  Activity
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
  const { user } = useAuth();
  const [displayCount, setDisplayCount] = useState(4);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch production lines
  const { data: lines, refetch: refetchLines } = trpc.productionLine.list.useQuery();
  const { data: dashboardConfig, refetch: refetchConfig } = trpc.dashboard.getConfig.useQuery();
  const { data: lineSelections, refetch: refetchSelections } = trpc.dashboard.getLineSelections.useQuery(
    { dashboardConfigId: dashboardConfig?.id || 0 },
    { enabled: !!dashboardConfig?.id }
  );
  
  // User line assignments
  const { data: userLineAssignments, refetch: refetchUserLines } = trpc.userLine.list.useQuery();

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

  // Update line selections
  const updateSelectionsMutation = trpc.dashboard.setLineSelections.useMutation({
    onSuccess: () => {
      refetchSelections();
    },
    onError: (err: any) => {
      toast.error(`Cập nhật thất bại: ${err.message}`);
    },
  });

  // Add user line assignment
  const addUserLineMutation = trpc.userLine.add.useMutation({
    onSuccess: () => {
      refetchUserLines();
      toast.success("Thêm dây chuyền thành công");
    },
    onError: (err: any) => {
      toast.error(`Thêm thất bại: ${err.message}`);
    },
  });

  // Remove user line assignment
  const removeUserLineMutation = trpc.userLine.remove.useMutation({
    onSuccess: () => {
      refetchUserLines();
      toast.success("Xóa dây chuyền thành công");
    },
    onError: (err: any) => {
      toast.error(`Xóa thất bại: ${err.message}`);
    },
  });

  // Initialize from dashboard config
  useEffect(() => {
    if (dashboardConfig) {
      setDisplayCount(dashboardConfig.displayCount);
      setRefreshInterval(dashboardConfig.refreshInterval);
    }
    if (lineSelections) {
      setSelectedLines(lineSelections.map((s: { productionLineId: number }) => s.productionLineId));
    }
  }, [dashboardConfig, lineSelections]);

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      refetchLines();
      refetchUserLines();
      setLastRefresh(new Date());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval, refetchLines, refetchUserLines]);

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

  const handleAddUserLine = (lineId: number) => {
    addUserLineMutation.mutate({ productionLineId: lineId, displayOrder: userLineAssignments?.length || 0 });
  };

  const handleRemoveUserLine = (assignmentId: number) => {
    removeUserLineMutation.mutate({ id: assignmentId });
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

  // Get lines to display based on user assignments or selected lines
  const displayLines = userLineAssignments && userLineAssignments.length > 0
    ? lines?.filter((line: { id: number }) => userLineAssignments.some((a: { productionLineId: number }) => a.productionLineId === line.id))
    : selectedLines.length > 0
    ? lines?.filter((line: { id: number }) => selectedLines.includes(line.id))
    : lines?.slice(0, displayCount);

  // Generate mock data for demo
  const generateMockData = (lineId: number) => {
    const baseValue = 50 + (lineId * 5);
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
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Dây Chuyền Sản Xuất</h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi realtime các chỉ số SPC của dây chuyền sản xuất
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchLines();
                refetchUserLines();
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
            <span>Hiển thị {displayLines?.length || 0} / {lines?.length || 0} dây chuyền</span>
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
                Chọn dây chuyền và cài đặt tần suất cập nhật cho tài khoản của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display Count */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Số lượng dây chuyền hiển thị</Label>
                  <Select value={displayCount.toString()} onValueChange={(v) => setDisplayCount(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 4, 6, 8, 10, 12].map(n => (
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
                      {[5, 10, 15, 30, 60, 120].map(n => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} giây
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* User Line Assignments */}
              <div className="space-y-3">
                <Label>Dây chuyền của bạn</Label>
                <p className="text-xs text-muted-foreground">
                  Chọn các dây chuyền bạn muốn theo dõi. Các dây chuyền này sẽ được lưu vào tài khoản của bạn.
                </p>
                
                {/* Current assignments */}
                {userLineAssignments && userLineAssignments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {userLineAssignments.map((assignment: { id: number; productionLineId: number }) => {
                      const line = lines?.find((l: { id: number }) => l.id === assignment.productionLineId);
                      return (
                        <Badge key={assignment.id} variant="secondary" className="flex items-center gap-1 py-1.5">
                          <Factory className="h-3 w-3" />
                          {line?.name || `Line ${assignment.productionLineId}`}
                          <button
                            onClick={() => handleRemoveUserLine(assignment.id)}
                            className="ml-1 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Add new lines */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-2 border rounded-lg">
                  {lines?.filter((line: { id: number }) => !userLineAssignments?.some((a: { productionLineId: number }) => a.productionLineId === line.id))
                    .map((line: { id: number; name: string; code: string }) => (
                    <Button
                      key={line.id}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => handleAddUserLine(line.id)}
                      disabled={addUserLineMutation.isPending}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {line.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Global Line Selection (Admin) */}
              {user?.role === "admin" && (
                <div className="space-y-3 pt-4 border-t">
                  <Label>Cấu hình toàn cục (Admin)</Label>
                  <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                    {lines?.map((line: { id: number; name: string }) => (
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
              )}

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

        {/* Production Lines Grid */}
        {displayLines && displayLines.length > 0 ? (
          <div className={`grid gap-4 ${
            displayCount <= 2 ? 'grid-cols-1 md:grid-cols-2' :
            displayCount <= 4 ? 'grid-cols-1 md:grid-cols-2' :
            displayCount <= 6 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {displayLines.slice(0, displayCount).map((line: { id: number; name: string; code: string }) => {
              const mockData = generateMockData(line.id);
              const lastValue = mockData[mockData.length - 1]?.value || 0;
              const mean = mockData.reduce((sum, d) => sum + d.value, 0) / mockData.length;
              const stdDev = Math.sqrt(mockData.reduce((sum, d) => sum + Math.pow(d.value - mean, 2), 0) / mockData.length);
              const ucl = mean + 3 * stdDev;
              const lcl = mean - 3 * stdDev;
              const mockCpk = 1.2 + (Math.random() - 0.5) * 0.8;
              const status = mockCpk >= 1.33 ? "good" : mockCpk >= 1.0 ? "warning" : "critical";

              return (
                <Card key={line.id} className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Factory className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{line.name}</CardTitle>
                      </div>
                      {getStatusIcon(status)}
                    </div>
                    <CardDescription className="flex items-center justify-between">
                      <span>Mã: {line.code}</span>
                      {getStatusBadge(mockCpk)}
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardContent className="py-12 text-center">
              <Factory className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Chưa có dây chuyền nào</h3>
              <p className="text-muted-foreground mb-4">
                Hãy thêm dây chuyền vào danh sách theo dõi của bạn hoặc liên hệ Admin để được cấu hình.
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
