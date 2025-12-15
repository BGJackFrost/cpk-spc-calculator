import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Download, Calendar, Clock, TrendingUp, TrendingDown, 
  Activity, AlertTriangle, CheckCircle, XCircle, BarChart3
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function MachineStatusReport() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("daily");

  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: statusHistory } = trpc.machineStatus.getHistory.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    machineId: selectedMachine === "all" ? undefined : parseInt(selectedMachine),
  });

  // Calculate uptime/downtime statistics
  const statistics = useMemo(() => {
    if (!statusHistory || statusHistory.length === 0) {
      return {
        totalUptime: 0,
        totalDowntime: 0,
        uptimePercent: 0,
        avgUptimePerDay: 0,
        statusBreakdown: [],
        dailyData: [],
        machineComparison: [],
      };
    }

    const totalMinutes = statusHistory.reduce((sum, h) => sum + (h.durationMinutes || 0), 0);
    const uptimeMinutes = statusHistory
      .filter(h => ["online", "running"].includes(h.status))
      .reduce((sum, h) => sum + (h.durationMinutes || 0), 0);
    const downtimeMinutes = statusHistory
      .filter(h => ["offline", "maintenance"].includes(h.status))
      .reduce((sum, h) => sum + (h.durationMinutes || 0), 0);

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    statusHistory.forEach(h => {
      statusCounts[h.status] = (statusCounts[h.status] || 0) + (h.durationMinutes || 0);
    });
    const statusBreakdown = Object.entries(statusCounts).map(([status, minutes]) => ({
      name: status,
      value: minutes,
      percent: totalMinutes > 0 ? (minutes / totalMinutes * 100).toFixed(1) : 0,
    }));

    // Daily data for chart
    const dailyMap = new Map<string, { uptime: number; downtime: number; warning: number }>();
    statusHistory.forEach(h => {
      const date = new Date(h.startTime).toISOString().split("T")[0];
      const current = dailyMap.get(date) || { uptime: 0, downtime: 0, warning: 0 };
      if (["online", "running"].includes(h.status)) {
        current.uptime += h.durationMinutes || 0;
      } else if (["offline", "maintenance"].includes(h.status)) {
        current.downtime += h.durationMinutes || 0;
      } else if (["warning", "critical"].includes(h.status)) {
        current.warning += h.durationMinutes || 0;
      }
      dailyMap.set(date, current);
    });
    const dailyData = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Machine comparison
    const machineMap = new Map<number, { uptime: number; downtime: number; total: number }>();
    statusHistory.forEach(h => {
      const current = machineMap.get(h.machineId) || { uptime: 0, downtime: 0, total: 0 };
      current.total += h.durationMinutes || 0;
      if (["online", "running"].includes(h.status)) {
        current.uptime += h.durationMinutes || 0;
      } else if (["offline", "maintenance"].includes(h.status)) {
        current.downtime += h.durationMinutes || 0;
      }
      machineMap.set(h.machineId, current);
    });
    const machineComparison = Array.from(machineMap.entries()).map(([machineId, data]) => {
      const machine = machines?.find(m => m.id === machineId);
      return {
        machineId,
        machineName: machine?.name || `Máy ${machineId}`,
        machineCode: machine?.code || "",
        uptimePercent: data.total > 0 ? (data.uptime / data.total * 100) : 0,
        uptimeHours: (data.uptime / 60).toFixed(1),
        downtimeHours: (data.downtime / 60).toFixed(1),
      };
    }).sort((a, b) => b.uptimePercent - a.uptimePercent);

    const days = Math.max(1, Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (24 * 60 * 60 * 1000)));

    return {
      totalUptime: uptimeMinutes,
      totalDowntime: downtimeMinutes,
      uptimePercent: totalMinutes > 0 ? (uptimeMinutes / totalMinutes * 100) : 0,
      avgUptimePerDay: uptimeMinutes / days / 60,
      statusBreakdown,
      dailyData,
      machineComparison,
    };
  }, [statusHistory, machines, dateRange]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const exportToCSV = () => {
    if (!statusHistory || statusHistory.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }

    const headers = ["Máy", "Trạng thái", "Bắt đầu", "Kết thúc", "Thời lượng (phút)", "Lý do"];
    const rows = statusHistory.map(h => {
      const machine = machines?.find(m => m.id === h.machineId);
      return [
        machine?.name || `Máy ${h.machineId}`,
        h.status,
        new Date(h.startTime).toLocaleString("vi-VN"),
        h.endTime ? new Date(h.endTime).toLocaleString("vi-VN") : "Đang diễn ra",
        h.durationMinutes || 0,
        h.reason || "",
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `machine_status_report_${dateRange.startDate}_${dateRange.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất báo cáo CSV");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Báo cáo Trạng thái Máy</h1>
            <p className="text-muted-foreground">
              Thống kê uptime/downtime và hiệu suất hoạt động
            </p>
          </div>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Xuất CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Từ ngày</Label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Đến ngày</Label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Máy</Label>
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả máy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả máy</SelectItem>
                    {machines?.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loại báo cáo</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Theo ngày</SelectItem>
                    <SelectItem value="weekly">Theo tuần</SelectItem>
                    <SelectItem value="monthly">Theo tháng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng Uptime</p>
                  <p className="text-2xl font-bold">{formatDuration(statistics.totalUptime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng Downtime</p>
                  <p className="text-2xl font-bold">{formatDuration(statistics.totalDowntime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tỷ lệ Uptime</p>
                  <p className="text-2xl font-bold">{statistics.uptimePercent.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">TB Uptime/Ngày</p>
                  <p className="text-2xl font-bold">{statistics.avgUptimePerDay.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="chart">
          <TabsList>
            <TabsTrigger value="chart">Biểu đồ</TabsTrigger>
            <TabsTrigger value="comparison">So sánh máy</TabsTrigger>
            <TabsTrigger value="breakdown">Phân tích</TabsTrigger>
            <TabsTrigger value="history">Lịch sử</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng Uptime/Downtime</CardTitle>
                <CardDescription>Biểu đồ theo thời gian</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={statistics.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis label={{ value: "Phút", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="uptime" stackId="1" stroke="#22c55e" fill="#22c55e" name="Uptime" />
                      <Area type="monotone" dataKey="downtime" stackId="1" stroke="#ef4444" fill="#ef4444" name="Downtime" />
                      <Area type="monotone" dataKey="warning" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Warning" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>So sánh Hiệu suất Máy</CardTitle>
                <CardDescription>Xếp hạng theo tỷ lệ uptime</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Xếp hạng</TableHead>
                      <TableHead>Máy</TableHead>
                      <TableHead>Mã máy</TableHead>
                      <TableHead>Tỷ lệ Uptime</TableHead>
                      <TableHead>Uptime</TableHead>
                      <TableHead>Downtime</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statistics.machineComparison.map((m, idx) => (
                      <TableRow key={m.machineId}>
                        <TableCell>
                          <Badge variant={idx < 3 ? "default" : "secondary"}>#{idx + 1}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{m.machineName}</TableCell>
                        <TableCell>{m.machineCode}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={m.uptimePercent} className="w-24" />
                            <span className="text-sm">{m.uptimePercent.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-green-600">{m.uptimeHours}h</TableCell>
                        <TableCell className="text-red-600">{m.downtimeHours}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố Trạng thái</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statistics.statusBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name}: ${percent}%`}
                        >
                          {statistics.statusBreakdown.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Thống kê chi tiết</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {statistics.statusBreakdown.map((s, idx) => (
                      <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="capitalize">{s.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{formatDuration(s.value)}</span>
                          <span className="text-muted-foreground ml-2">({s.percent}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử Trạng thái</CardTitle>
                <CardDescription>Chi tiết các thay đổi trạng thái</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Máy</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Bắt đầu</TableHead>
                      <TableHead>Kết thúc</TableHead>
                      <TableHead>Thời lượng</TableHead>
                      <TableHead>Lý do</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusHistory?.slice(0, 50).map((h) => {
                      const machine = machines?.find(m => m.id === h.machineId);
                      return (
                        <TableRow key={h.id}>
                          <TableCell>{machine?.name || `Máy ${h.machineId}`}</TableCell>
                          <TableCell>
                            <Badge variant={
                              ["online", "running"].includes(h.status) ? "default" :
                              ["offline", "maintenance"].includes(h.status) ? "destructive" :
                              "secondary"
                            }>
                              {h.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(h.startTime).toLocaleString("vi-VN")}</TableCell>
                          <TableCell>
                            {h.endTime ? new Date(h.endTime).toLocaleString("vi-VN") : "Đang diễn ra"}
                          </TableCell>
                          <TableCell>{h.durationMinutes ? formatDuration(h.durationMinutes) : "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{h.reason || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
