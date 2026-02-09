import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Activity, TrendingUp, TrendingDown, Target, Clock, Package, 
  AlertTriangle, CheckCircle, XCircle, RefreshCw, Download,
  BarChart3, PieChart, Calendar, Plus, FileSpreadsheet, FileText
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend, BarChart, Bar, ComposedChart, Line
} from "recharts";

// All data comes from tRPC endpoints (oee.listRecords, oee.listLossRecords, oee.getMachineComparison)

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4'];

export default function OEEDashboard() {
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [selectedPeriod] = useState("30d");
  
  // Date range state
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return { from: startDate, to: endDate };
  });
  
  const { data: machines } = trpc.machine.listAll.useQuery();
  
  // Calculate start date string from date range
  const startDateStr = useMemo(() => {
    if (dateRange?.from) {
      return dateRange.from.toISOString().split('T')[0];
    }
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, [dateRange]);
  
  const endDateStr = useMemo(() => {
    if (dateRange?.to) {
      return dateRange.to.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  }, [dateRange]);
  
  // Calculate days for comparison query
  const days = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    }
    return 30;
  }, [dateRange]);
  
  const { data: oeeRecords, refetch: refetchOEE } = trpc.oee.listRecords.useQuery({
    machineId: selectedMachine !== "all" ? Number(selectedMachine) : undefined,
    startDate: startDateStr,
  });
  
  const { data: lossRecords } = trpc.oee.listLossRecords.useQuery({});
  
  const { data: machineOEEData } = trpc.oee.getMachineComparison.useQuery({
    days: selectedPeriod === "7d" ? 7 : selectedPeriod === "30d" ? 30 : selectedPeriod === "90d" ? 90 : 365,
  });
  
  const exportOeeExcelMutation = trpc.oee.exportOeeExcel.useMutation();
  const exportOeePdfMutation = trpc.oee.exportOeePdf.useMutation();

  const createOEEMutation = trpc.oee.createRecord.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm bản ghi OEE");
      refetchOEE();
      setIsAddRecordOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });
  
  // Process OEE records from API
  const oeeData = useMemo(() => {
    if (oeeRecords && oeeRecords.length > 0) {
      return oeeRecords.map(r => ({
        date: r.recordDate ? new Date(r.recordDate).toISOString().split('T')[0] : '',
        availability: Number(r.availability) || 0,
        performance: Number(r.performance) || 0,
        quality: Number(r.quality) || 0,
        oee: Number(r.oee) || 0,
      }));
    }
    return [];
  }, [oeeRecords]);
  
  const currentOEE = oeeData[oeeData.length - 1] || { oee: 0, availability: 0, performance: 0, quality: 0 };
  const previousOEE = oeeData[oeeData.length - 2] || currentOEE;
  const oeeChange = currentOEE.oee - previousOEE.oee;
  
  const avgOEE = oeeData.length > 0 ? oeeData.reduce((sum, d) => sum + d.oee, 0) / oeeData.length : 0;
  const avgAvailability = oeeData.length > 0 ? oeeData.reduce((sum, d) => sum + d.availability, 0) / oeeData.length : 0;
  const avgPerformance = oeeData.length > 0 ? oeeData.reduce((sum, d) => sum + d.performance, 0) / oeeData.length : 0;
  const avgQuality = oeeData.length > 0 ? oeeData.reduce((sum, d) => sum + d.quality, 0) / oeeData.length : 0;
  
  // Process loss data from API
  const processedLossData = useMemo(() => {
    if (lossRecords && lossRecords.length > 0) {
      const grouped: Record<string, { value: number; type: string; color: string }> = {};
      lossRecords.forEach(r => {
        const name = r.categoryName || 'Khác';
        if (!grouped[name]) {
          const colorMap: Record<string, string> = {
            'breakdown': '#ef4444',
            'setup': '#f97316',
            'minor_stops': '#eab308',
            'speed_loss': '#84cc16',
            'defects': '#22c55e',
            'rework': '#06b6d4',
          };
          grouped[name] = { value: 0, type: r.categoryType || '', color: colorMap[r.categoryType || ''] || '#94a3b8' };
        }
        grouped[name].value += Number(r.duration) || 0;
      });
      return Object.entries(grouped).map(([name, data]) => ({ name, ...data }));
    }
    return [];
  }, [lossRecords]);
  
  // Process machine comparison data
  const processedMachineOEE = useMemo(() => {
    if (machineOEEData && machineOEEData.length > 0) {
      return machineOEEData.map(m => ({
        machine: m.machineName || `Machine ${m.machineId}`,
        oee: Number(m.avgOee) || 0,
        availability: Number(m.avgAvailability) || 0,
        performance: Number(m.avgPerformance) || 0,
        quality: Number(m.avgQuality) || 0,
        status: Number(m.avgOee) >= 85 ? 'excellent' : Number(m.avgOee) >= 75 ? 'good' : Number(m.avgOee) >= 65 ? 'warning' : 'critical',
      }));
    }
    return [];
  }, [machineOEEData]);
  
  const handleAddRecord = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createOEEMutation.mutate({
      machineId: Number(formData.get("machineId")),
      recordDate: formData.get("recordDate") as string,
      plannedProductionTime: Number(formData.get("plannedTime")),
      actualRunTime: Number(formData.get("runTime")),
      idealCycleTime: Number(formData.get("cycleTime")),
      totalCount: Number(formData.get("totalCount")),
      goodCount: Number(formData.get("goodCount")),
    });
  };

  const getOEEStatus = (oee: number) => {
    if (oee >= 85) return { label: "Xuất sắc", color: "bg-green-500", icon: CheckCircle };
    if (oee >= 75) return { label: "Tốt", color: "bg-blue-500", icon: TrendingUp };
    if (oee >= 65) return { label: "Trung bình", color: "bg-yellow-500", icon: AlertTriangle };
    return { label: "Cần cải thiện", color: "bg-red-500", icon: XCircle };
  };

  const status = getOEEStatus(currentOEE.oee);
  const StatusIcon = status.icon;

  return (
    <DashboardLayout>
      <div id="oee-dashboard-content" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">OEE Dashboard</h1>
            <p className="text-muted-foreground">
              Overall Equipment Effectiveness - Hiệu suất thiết bị tổng thể
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              showPresets={true}
            />
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tất cả máy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả máy</SelectItem>
                {machines?.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddRecordOpen} onOpenChange={setIsAddRecordOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Thêm bản ghi</Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddRecord}>
                  <DialogHeader>
                    <DialogTitle>Thêm bản ghi OEE</DialogTitle>
                    <DialogDescription>Nhập dữ liệu OEE cho máy</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="machineId">Máy *</Label>
                        <Select name="machineId" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn máy" />
                          </SelectTrigger>
                          <SelectContent>
                            {machines?.map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recordDate">Ngày *</Label>
                        <Input id="recordDate" name="recordDate" type="date" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="plannedTime">Thời gian kế hoạch (phút)</Label>
                        <Input id="plannedTime" name="plannedTime" type="number" defaultValue="480" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="runTime">Thời gian chạy (phút)</Label>
                        <Input id="runTime" name="runTime" type="number" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cycleTime">Cycle time (giây)</Label>
                        <Input id="cycleTime" name="cycleTime" type="number" step="0.1" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="totalCount">Tổng sản phẩm</Label>
                        <Input id="totalCount" name="totalCount" type="number" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="goodCount">Sản phẩm tốt</Label>
                        <Input id="goodCount" name="goodCount" type="number" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createOEEMutation.isPending}>Thêm</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="icon" onClick={() => refetchOEE()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={exportOeeExcelMutation.isPending || exportOeePdfMutation.isPending}>
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={async () => {
                  try {
                    toast.info("Đang xuất Excel...");
                    const result = await exportOeeExcelMutation.mutateAsync({
                      startDate: dateRange?.from || new Date(new Date().setDate(new Date().getDate() - 30)),
                      endDate: dateRange?.to || new Date(),
                      language: 'vi',
                    });
                    const byteCharacters = atob(result.data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: result.contentType });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = result.filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success("Xuất Excel thành công!");
                  } catch (error: any) {
                    toast.error("Lỗi xuất Excel: " + (error?.message || 'Unknown error'));
                  }
                }}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Xuất Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  try {
                    toast.info("Đang xuất PDF...");
                    const result = await exportOeePdfMutation.mutateAsync({
                      startDate: dateRange?.from || new Date(new Date().setDate(new Date().getDate() - 30)),
                      endDate: dateRange?.to || new Date(),
                      language: 'vi',
                    });
                    window.open(result.url, '_blank');
                    toast.success("Xuất PDF thành công!");
                  } catch (error: any) {
                    toast.error("Lỗi xuất PDF: " + (error?.message || 'Unknown error'));
                  }
                }}>
                  <FileText className="h-4 w-4 mr-2" />
                  Xuất PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  try {
                    toast.info("Đang chụp màn hình...");
                    const element = document.getElementById('oee-dashboard-content');
                    if (!element) { toast.error("Không tìm thấy nội dung"); return; }
                    const html2canvas = (await import('html2canvas')).default;
                    const { jsPDF } = await import('jspdf');
                    const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const imgWidth = pdfWidth - 20;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
                    pdf.save(`oee-screenshot-${new Date().toISOString().split('T')[0]}.pdf`);
                    toast.success("Chụp màn hình thành công!");
                  } catch (error) {
                    toast.error("Lỗi chụp màn hình");
                  }
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Chụp màn hình (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* OEE Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current OEE */}
          <Card className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${status.color}`} />
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                OEE Hiện tại
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold">{currentOEE.oee}%</div>
                  <div className="flex items-center gap-1 text-sm">
                    {oeeChange >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={oeeChange >= 0 ? "text-green-500" : "text-red-500"}>
                      {oeeChange >= 0 ? "+" : ""}{oeeChange.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">vs hôm qua</span>
                  </div>
                </div>
                <Badge className={status.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Availability (Khả dụng)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{currentOEE.availability}%</div>
              <Progress value={currentOEE.availability} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">
                Mục tiêu: 90% | TB: {avgAvailability.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Performance (Hiệu suất)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{currentOEE.performance}%</div>
              <Progress value={currentOEE.performance} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">
                Mục tiêu: 95% | TB: {avgPerformance.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* Quality */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Quality (Chất lượng)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{currentOEE.quality}%</div>
              <Progress value={currentOEE.quality} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">
                Mục tiêu: 99% | TB: {avgQuality.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trend">
              <BarChart3 className="h-4 w-4 mr-2" />
              Xu hướng OEE
            </TabsTrigger>
            <TabsTrigger value="loss">
              <PieChart className="h-4 w-4 mr-2" />
              Phân tích tổn thất
            </TabsTrigger>
            <TabsTrigger value="machines">
              <Target className="h-4 w-4 mr-2" />
              So sánh máy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng OEE theo thời gian</CardTitle>
                <CardDescription>
                  Biểu đồ hiển thị OEE và các thành phần trong {selectedPeriod === "7d" ? "7 ngày" : selectedPeriod === "30d" ? "30 ngày" : selectedPeriod === "90d" ? "90 ngày" : "1 năm"} qua
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={oeeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      />
                      <YAxis domain={[60, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString('vi-VN')}
                        formatter={(value: number) => [`${value}%`]}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="availability" 
                        name="Availability" 
                        fill="#3b82f6" 
                        fillOpacity={0.1}
                        stroke="#3b82f6" 
                        strokeWidth={1}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="performance" 
                        name="Performance" 
                        fill="#22c55e" 
                        fillOpacity={0.1}
                        stroke="#22c55e" 
                        strokeWidth={1}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="quality" 
                        name="Quality" 
                        fill="#a855f7" 
                        fillOpacity={0.1}
                        stroke="#a855f7" 
                        strokeWidth={1}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="oee" 
                        name="OEE" 
                        stroke="#ef4444" 
                        strokeWidth={3}
                        dot={{ fill: '#ef4444', r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loss">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố tổn thất OEE</CardTitle>
                  <CardDescription>Các nguyên nhân gây mất OEE</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={processedLossData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {processedLossData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`]} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết tổn thất theo loại</CardTitle>
                  <CardDescription>Phân loại theo Availability, Performance, Quality</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-600">Availability Loss</span>
                        <span className="text-sm text-muted-foreground">55%</span>
                      </div>
                      <div className="space-y-2">
                        {demoLossData.filter(d => d.type === "availability").map((item) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm flex-1">{item.name}</span>
                            <span className="text-sm font-medium">{item.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-green-600">Performance Loss</span>
                        <span className="text-sm text-muted-foreground">37%</span>
                      </div>
                      <div className="space-y-2">
                        {demoLossData.filter(d => d.type === "performance").map((item) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm flex-1">{item.name}</span>
                            <span className="text-sm font-medium">{item.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-purple-600">Quality Loss</span>
                        <span className="text-sm text-muted-foreground">8%</span>
                      </div>
                      <div className="space-y-2">
                        {demoLossData.filter(d => d.type === "quality").map((item) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm flex-1">{item.name}</span>
                            <span className="text-sm font-medium">{item.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="machines">
            <Card>
              <CardHeader>
                <CardTitle>So sánh OEE theo máy</CardTitle>
                <CardDescription>Xếp hạng hiệu suất các máy</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedMachineOEE} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="machine" width={80} />
                      <Tooltip formatter={(value: number) => [`${value}%`]} />
                      <Legend />
                      <Bar dataKey="availability" name="Availability" fill="#3b82f6" stackId="a" />
                      <Bar dataKey="performance" name="Performance" fill="#22c55e" stackId="b" />
                      <Bar dataKey="quality" name="Quality" fill="#a855f7" stackId="c" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {processedMachineOEE.map((m) => (
                    <div 
                      key={m.machine} 
                      className={`p-3 rounded-lg border ${
                        m.status === "excellent" ? "border-green-500 bg-green-50 dark:bg-green-950" :
                        m.status === "good" ? "border-blue-500 bg-blue-50 dark:bg-blue-950" :
                        m.status === "warning" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950" :
                        "border-red-500 bg-red-50 dark:bg-red-950"
                      }`}
                    >
                      <div className="font-medium text-sm">{m.machine}</div>
                      <div className="text-2xl font-bold">{m.oee}%</div>
                      <Badge variant="outline" className="text-xs">
                        {m.status === "excellent" ? "Xuất sắc" :
                         m.status === "good" ? "Tốt" :
                         m.status === "warning" ? "Cảnh báo" : "Cần cải thiện"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Target vs Actual */}
        <Card>
          <CardHeader>
            <CardTitle>Mục tiêu vs Thực tế</CardTitle>
            <CardDescription>So sánh chỉ số OEE với mục tiêu đặt ra</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "OEE", actual: avgOEE, target: 85, color: "bg-red-500" },
                { label: "Availability", actual: avgAvailability, target: 90, color: "bg-blue-500" },
                { label: "Performance", actual: avgPerformance, target: 95, color: "bg-green-500" },
                { label: "Quality", actual: avgQuality, target: 99, color: "bg-purple-500" },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.label}</span>
                    <span className={`text-sm ${item.actual >= item.target ? "text-green-500" : "text-red-500"}`}>
                      {item.actual >= item.target ? "Đạt" : "Chưa đạt"}
                    </span>
                  </div>
                  <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute h-full ${item.color} opacity-80`}
                      style={{ width: `${item.actual}%` }}
                    />
                    <div 
                      className="absolute h-full w-0.5 bg-foreground"
                      style={{ left: `${item.target}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Thực tế: {item.actual.toFixed(1)}%</span>
                    <span>Mục tiêu: {item.target}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
