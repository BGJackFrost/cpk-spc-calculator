/**
 * RealtimeInspection - Trang kiểm tra realtime cho AOI/AVI
 */
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  RefreshCw, 
  Camera,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Activity,
  Clock,
  TrendingUp,
  Target,
  Play,
  Pause,
  Settings,
  Image as ImageIcon,
  BarChart3,
  Layers,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface InspectionResult {
  id: string;
  serialNumber: string;
  timestamp: Date;
  status: 'pass' | 'fail' | 'warning';
  machineId: number;
  machineName: string;
  confidence: number;
  defects: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    location?: { x: number; y: number };
  }>;
  imageUrl?: string;
  processingTime: number;
}

export default function RealtimeInspection() {
  const { toast } = useToast();
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [isLive, setIsLive] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const [inspectionResults, setInspectionResults] = useState<InspectionResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<InspectionResult | null>(null);

  // Fetch machines
  const { data: machinesData } = trpc.machine.getAll.useQuery();

  // Filter AOI/AVI machines
  const aoiMachines = machinesData?.filter(m => 
    m.machineType?.toLowerCase().includes('aoi') || 
    m.machineType?.toLowerCase().includes('avi') ||
    m.machineType?.toLowerCase().includes('inspection')
  ) || [];

  // Simulated realtime data (in production, this would be SSE or WebSocket)
  useEffect(() => {
    if (!isLive || !autoRefresh) return;

    // Mock data removed - generateMockResult (data comes from tRPC or is not yet implemented)

    const interval = setInterval(() => {
      // No mock data generation - waiting for real inspection data
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isLive, autoRefresh, refreshInterval, aoiMachines]);

  // Calculate statistics
  const stats = {
    total: inspectionResults.length,
    pass: inspectionResults.filter(r => r.status === 'pass').length,
    fail: inspectionResults.filter(r => r.status === 'fail').length,
    warning: inspectionResults.filter(r => r.status === 'warning').length,
    yieldRate: inspectionResults.length > 0 
      ? (inspectionResults.filter(r => r.status === 'pass').length / inspectionResults.length * 100).toFixed(1)
      : '0.0',
    avgProcessingTime: inspectionResults.length > 0
      ? (inspectionResults.reduce((sum, r) => sum + r.processingTime, 0) / inspectionResults.length).toFixed(0)
      : '0',
  };

  const handleClearResults = () => {
    setInspectionResults([]);
    setSelectedResult(null);
    toast({
      title: "Đã xóa",
      description: "Đã xóa tất cả kết quả kiểm tra.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-500';
      case 'fail': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary" />
              Kiểm tra Realtime
            </h1>
            <p className="text-muted-foreground mt-1">
              Giám sát kết quả kiểm tra AOI/AVI theo thời gian thực
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Status */}
            <Badge variant={isLive ? "default" : "secondary"} className="gap-1">
              {isLive ? (
                <>
                  <Activity className="h-3 w-3 animate-pulse" />
                  Live
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3" />
                  Paused
                </>
              )}
            </Badge>

            {/* Machine Filter */}
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="w-[180px]">
                <Camera className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Máy kiểm tra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả máy</SelectItem>
                {aoiMachines.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Live Toggle */}
            <Button
              variant={isLive ? "default" : "outline"}
              size="sm"
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {isLive ? "Dừng" : "Bắt đầu"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearResults}
            >
              Xóa
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng kiểm tra</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Eye className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đạt</p>
                  <p className="text-2xl font-bold text-green-500">{stats.pass}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lỗi</p>
                  <p className="text-2xl font-bold text-red-500">{stats.fail}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cảnh báo</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.warning}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Yield Rate</p>
                  <p className="text-2xl font-bold text-primary">{stats.yieldRate}%</p>
                </div>
                <Target className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Thời gian TB</p>
                  <p className="text-2xl font-bold">{stats.avgProcessingTime}ms</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Results List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Kết quả Kiểm tra
              </CardTitle>
              <CardDescription>
                Danh sách kết quả kiểm tra theo thời gian thực
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {inspectionResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <Eye className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Chưa có kết quả</p>
                    <p className="text-sm">Kết quả kiểm tra sẽ hiển thị tại đây</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {inspectionResults
                      .filter(r => selectedMachine === "all" || r.machineId.toString() === selectedMachine)
                      .map((result) => (
                        <div 
                          key={result.id}
                          className={cn(
                            "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                            selectedResult?.id === result.id && "bg-muted",
                          )}
                          onClick={() => setSelectedResult(result)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(result.status)}
                              <span className="font-medium">{result.serialNumber}</span>
                              <Badge variant="outline" className="text-xs">
                                {result.machineName}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {result.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Confidence: <span className="font-medium">{result.confidence.toFixed(1)}%</span>
                            </span>
                            <span className="text-muted-foreground">
                              Time: <span className="font-medium">{result.processingTime.toFixed(0)}ms</span>
                            </span>
                            {result.defects.length > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {result.defects.length} lỗi
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Detail Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Chi tiết Kiểm tra</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedResult ? (
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", getStatusColor(selectedResult.status))} />
                    <span className="font-medium capitalize">{selectedResult.status}</span>
                  </div>

                  {/* Serial Number */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Serial Number</Label>
                    <p className="font-mono">{selectedResult.serialNumber}</p>
                  </div>

                  {/* Machine */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Máy kiểm tra</Label>
                    <p>{selectedResult.machineName}</p>
                  </div>

                  {/* Timestamp */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Thời gian</Label>
                    <p>{selectedResult.timestamp.toLocaleString()}</p>
                  </div>

                  {/* Confidence */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Độ tin cậy</Label>
                    <div className="flex items-center gap-2">
                      <Progress value={selectedResult.confidence} className="flex-1" />
                      <span className="text-sm font-medium">{selectedResult.confidence.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Processing Time */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Thời gian xử lý</Label>
                    <p>{selectedResult.processingTime.toFixed(0)}ms</p>
                  </div>

                  {/* Defects */}
                  {selectedResult.defects.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Lỗi phát hiện</Label>
                      <div className="space-y-2">
                        {selectedResult.defects.map((defect, index) => (
                          <div 
                            key={index}
                            className={cn(
                              "p-2 rounded-lg border text-sm",
                              defect.severity === 'critical' && "border-red-500 bg-red-500/10",
                              defect.severity === 'high' && "border-orange-500 bg-orange-500/10",
                              defect.severity === 'medium' && "border-yellow-500 bg-yellow-500/10",
                              defect.severity === 'low' && "border-blue-500 bg-blue-500/10",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{defect.type}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {defect.severity}
                              </Badge>
                            </div>
                            {defect.location && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Vị trí: ({defect.location.x.toFixed(0)}, {defect.location.y.toFixed(0)})
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Image Preview Placeholder */}
                  <div className="border rounded-lg p-4 text-center text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Hình ảnh kiểm tra</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Chọn một kết quả để xem chi tiết</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Cài đặt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh">Tự động làm mới</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Tần suất:</Label>
                <Select 
                  value={refreshInterval.toString()} 
                  onValueChange={(v) => setRefreshInterval(parseInt(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1000">1 giây</SelectItem>
                    <SelectItem value="2000">2 giây</SelectItem>
                    <SelectItem value="5000">5 giây</SelectItem>
                    <SelectItem value="10000">10 giây</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
