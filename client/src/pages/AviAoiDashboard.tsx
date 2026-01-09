import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Camera,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  BarChart3,
  RefreshCw,
  Target,
  Layers,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const generateMockInspectionData = () => {
  const data = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      time: hour.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      total: 100 + Math.floor(Math.random() * 50),
      pass: 85 + Math.floor(Math.random() * 10),
      fail: 5 + Math.floor(Math.random() * 10),
      warning: 2 + Math.floor(Math.random() * 5),
    });
  }
  return data;
};

const generateDefectTypeData = () => [
  { name: "Trầy xước", count: 45, percentage: 35 },
  { name: "Lõm/Móp", count: 28, percentage: 22 },
  { name: "Nứt", count: 18, percentage: 14 },
  { name: "Đổi màu", count: 15, percentage: 12 },
  { name: "Tạp chất", count: 12, percentage: 9 },
  { name: "Biến dạng", count: 10, percentage: 8 },
];

const generateRecentInspections = () => {
  const statuses = ["pass", "fail", "warning"];
  const machines = ["AVI-01", "AVI-02", "AOI-01", "AOI-02", "AVI-03"];
  const products = ["PROD-001", "PROD-002", "PROD-003"];
  
  return Array.from({ length: 20 }, (_, i) => ({
    id: `INS-${String(1000 - i).padStart(4, "0")}`,
    serialNumber: `SN${Date.now() - i * 1000}`,
    machine: machines[Math.floor(Math.random() * machines.length)],
    product: products[Math.floor(Math.random() * products.length)],
    status: statuses[Math.floor(Math.random() * 3)] as "pass" | "fail" | "warning",
    defectCount: Math.floor(Math.random() * 5),
    cycleTime: 200 + Math.floor(Math.random() * 100),
    timestamp: new Date(Date.now() - i * 60000).toLocaleTimeString("vi-VN"),
  }));
};

export default function AviAoiDashboard() {
  const [timeRange, setTimeRange] = useState("24h");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const inspectionData = useMemo(() => generateMockInspectionData(), []);
  const defectTypeData = useMemo(() => generateDefectTypeData(), []);
  const recentInspections = useMemo(() => generateRecentInspections(), []);

  const stats = useMemo(() => {
    const total = inspectionData.reduce((sum, d) => sum + d.total, 0);
    const pass = inspectionData.reduce((sum, d) => sum + d.pass, 0);
    const fail = inspectionData.reduce((sum, d) => sum + d.fail, 0);
    const warning = inspectionData.reduce((sum, d) => sum + d.warning, 0);
    return {
      total,
      pass,
      fail,
      warning,
      passRate: ((pass / total) * 100).toFixed(1),
      failRate: ((fail / total) * 100).toFixed(1),
    };
  }, [inspectionData]);

  const pieData = [
    { name: "Đạt", value: parseInt(stats.passRate), color: "#22c55e" },
    { name: "Không đạt", value: parseInt(stats.failRate), color: "#ef4444" },
    { name: "Cảnh báo", value: 100 - parseInt(stats.passRate) - parseInt(stats.failRate), color: "#f59e0b" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Camera className="h-8 w-8 text-primary" />
              AVI/AOI Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Tổng hợp thông tin kiểm tra từ hệ thống AVI/AOI
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 giờ</SelectItem>
                <SelectItem value="6h">6 giờ</SelectItem>
                <SelectItem value="24h">24 giờ</SelectItem>
                <SelectItem value="7d">7 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả máy</SelectItem>
                <SelectItem value="avi-01">AVI-01</SelectItem>
                <SelectItem value="avi-02">AVI-02</SelectItem>
                <SelectItem value="aoi-01">AOI-01</SelectItem>
                <SelectItem value="aoi-02">AOI-02</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="icon"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng kiểm tra</p>
                  <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đạt</p>
                  <p className="text-2xl font-bold text-green-500">{stats.pass.toLocaleString()}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Không đạt</p>
                  <p className="text-2xl font-bold text-red-500">{stats.fail.toLocaleString()}</p>
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
                  <p className="text-2xl font-bold text-yellow-500">{stats.warning.toLocaleString()}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tỷ lệ đạt</p>
                  <p className="text-2xl font-bold">{stats.passRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tỷ lệ lỗi</p>
                  <p className="text-2xl font-bold">{stats.failRate}%</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Xu hướng kiểm tra
              </CardTitle>
              <CardDescription>Số lượng kiểm tra theo thời gian</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={inspectionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area type="monotone" dataKey="pass" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Đạt" />
                    <Area type="monotone" dataKey="warning" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Cảnh báo" />
                    <Area type="monotone" dataKey="fail" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Không đạt" />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Tỷ lệ kết quả
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Phân tích loại lỗi
              </CardTitle>
              <CardDescription>Top loại lỗi phát hiện</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={defectTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Số lượng" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Kiểm tra gần đây
              </CardTitle>
              <CardDescription>20 kết quả kiểm tra mới nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {recentInspections.map((inspection) => (
                    <div key={inspection.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${inspection.status === "pass" ? "bg-green-500" : inspection.status === "fail" ? "bg-red-500" : "bg-yellow-500"}`} />
                        <div>
                          <p className="text-sm font-medium">{inspection.serialNumber}</p>
                          <p className="text-xs text-muted-foreground">{inspection.machine} • {inspection.product}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={inspection.status === "pass" ? "default" : inspection.status === "fail" ? "destructive" : "secondary"} className={inspection.status === "pass" ? "bg-green-500" : inspection.status === "warning" ? "bg-yellow-500" : ""}>
                          {inspection.status === "pass" ? "Đạt" : inspection.status === "fail" ? "Lỗi" : "Cảnh báo"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{inspection.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Trạng thái máy AVI/AOI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: "AVI-01", status: "running", oee: 92.5, inspections: 1250 },
                { name: "AVI-02", status: "running", oee: 88.3, inspections: 1180 },
                { name: "AOI-01", status: "idle", oee: 0, inspections: 0 },
                { name: "AOI-02", status: "running", oee: 95.1, inspections: 1320 },
                { name: "AVI-03", status: "maintenance", oee: 0, inspections: 0 },
              ].map((machine) => (
                <div key={machine.name} className={`p-4 rounded-lg border ${machine.status === "running" ? "border-green-500/50 bg-green-500/10" : machine.status === "idle" ? "border-yellow-500/50 bg-yellow-500/10" : "border-blue-500/50 bg-blue-500/10"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{machine.name}</span>
                    <Badge className={machine.status === "running" ? "bg-green-500" : machine.status === "idle" ? "bg-yellow-500" : "bg-blue-500"}>
                      {machine.status === "running" ? "Đang chạy" : machine.status === "idle" ? "Chờ" : "Bảo trì"}
                    </Badge>
                  </div>
                  {machine.status === "running" && (
                    <>
                      <div className="text-sm text-muted-foreground mb-1">OEE: <span className="font-medium text-foreground">{machine.oee}%</span></div>
                      <Progress value={machine.oee} className="h-1" />
                      <div className="text-xs text-muted-foreground mt-2">{machine.inspections.toLocaleString()} kiểm tra</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
