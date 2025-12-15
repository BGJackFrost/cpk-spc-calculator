import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wrench, Clock, AlertTriangle, CheckCircle, Calendar, Users,
  Plus, Filter, Search, MoreHorizontal, Play, Pause, XCircle,
  TrendingUp, BarChart3, FileText
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

// Demo data
const demoWorkOrders = [
  { id: "WO-2024-001", machine: "CNC-001", title: "Thay thế dao cắt", priority: "high", status: "in_progress", assignee: "Nguyễn Văn A", dueDate: "2024-12-16" },
  { id: "WO-2024-002", machine: "Press-001", title: "Bảo trì định kỳ tháng 12", priority: "medium", status: "pending", assignee: "Trần Văn B", dueDate: "2024-12-18" },
  { id: "WO-2024-003", machine: "CNC-002", title: "Sửa chữa hệ thống làm mát", priority: "critical", status: "assigned", assignee: "Lê Văn C", dueDate: "2024-12-16" },
  { id: "WO-2024-004", machine: "CNC-003", title: "Kiểm tra độ chính xác", priority: "low", status: "completed", assignee: "Nguyễn Văn A", dueDate: "2024-12-15" },
  { id: "WO-2024-005", machine: "Press-002", title: "Thay dầu thủy lực", priority: "medium", status: "pending", assignee: "Trần Văn B", dueDate: "2024-12-20" },
];

const demoSchedules = [
  { id: 1, machine: "CNC-001", task: "Bảo trì định kỳ hàng tuần", frequency: "weekly", nextDue: "2024-12-18", lastDone: "2024-12-11" },
  { id: 2, machine: "CNC-002", task: "Kiểm tra hệ thống điện", frequency: "monthly", nextDue: "2024-12-25", lastDone: "2024-11-25" },
  { id: 3, machine: "Press-001", task: "Thay dầu thủy lực", frequency: "quarterly", nextDue: "2025-01-15", lastDone: "2024-10-15" },
  { id: 4, machine: "Press-002", task: "Kiểm tra van an toàn", frequency: "biweekly", nextDue: "2024-12-20", lastDone: "2024-12-06" },
];

const demoTechnicians = [
  { id: 1, name: "Nguyễn Văn A", specialty: "CNC", activeOrders: 2, completedThisMonth: 15, available: true },
  { id: 2, name: "Trần Văn B", specialty: "Hydraulics", activeOrders: 3, completedThisMonth: 12, available: true },
  { id: 3, name: "Lê Văn C", specialty: "Electrical", activeOrders: 1, completedThisMonth: 18, available: false },
  { id: 4, name: "Phạm Văn D", specialty: "General", activeOrders: 0, completedThisMonth: 10, available: true },
];

const demoTrendData = [
  { month: "T7", corrective: 12, preventive: 8, total: 20 },
  { month: "T8", corrective: 15, preventive: 10, total: 25 },
  { month: "T9", corrective: 10, preventive: 12, total: 22 },
  { month: "T10", corrective: 8, preventive: 14, total: 22 },
  { month: "T11", corrective: 6, preventive: 15, total: 21 },
  { month: "T12", corrective: 5, preventive: 16, total: 21 },
];

const demoTypeDistribution = [
  { name: "Corrective", value: 35, color: "#ef4444" },
  { name: "Preventive", value: 45, color: "#22c55e" },
  { name: "Predictive", value: 15, color: "#3b82f6" },
  { name: "Condition-based", value: 5, color: "#a855f7" },
];

const priorityColors: Record<string, string> = {
  low: "bg-gray-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-500",
  assigned: "bg-blue-500",
  in_progress: "bg-yellow-500",
  on_hold: "bg-orange-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  pending: "Chờ xử lý",
  assigned: "Đã phân công",
  in_progress: "Đang thực hiện",
  on_hold: "Tạm dừng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export default function MaintenanceDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewWODialog, setShowNewWODialog] = useState(false);

  const stats = {
    total: demoWorkOrders.length,
    pending: demoWorkOrders.filter(w => w.status === "pending").length,
    inProgress: demoWorkOrders.filter(w => w.status === "in_progress" || w.status === "assigned").length,
    completed: demoWorkOrders.filter(w => w.status === "completed").length,
    overdue: 1,
    mttr: 4.5, // Mean Time To Repair (hours)
    mtbf: 168, // Mean Time Between Failures (hours)
  };

  const filteredWorkOrders = demoWorkOrders.filter(wo => {
    const matchesSearch = wo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wo.machine.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Maintenance Dashboard</h1>
            <p className="text-muted-foreground">Quản lý bảo trì và sửa chữa thiết bị</p>
          </div>
          <Dialog open={showNewWODialog} onOpenChange={setShowNewWODialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo Work Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Tạo Work Order mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tiêu đề</Label>
                  <Input placeholder="Mô tả công việc..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Máy</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Chọn máy" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cnc-001">CNC-001</SelectItem>
                        <SelectItem value="cnc-002">CNC-002</SelectItem>
                        <SelectItem value="press-001">Press-001</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Loại bảo trì</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrective">Sửa chữa</SelectItem>
                        <SelectItem value="preventive">Phòng ngừa</SelectItem>
                        <SelectItem value="predictive">Dự đoán</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Độ ưu tiên</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Thấp</SelectItem>
                        <SelectItem value="medium">Trung bình</SelectItem>
                        <SelectItem value="high">Cao</SelectItem>
                        <SelectItem value="critical">Khẩn cấp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phân công cho</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Chọn KTV" /></SelectTrigger>
                      <SelectContent>
                        {demoTechnicians.map(t => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mô tả chi tiết</Label>
                  <Textarea placeholder="Mô tả vấn đề và yêu cầu..." rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewWODialog(false)}>Hủy</Button>
                  <Button onClick={() => setShowNewWODialog(false)}>Tạo</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tổng WO</span>
              </div>
              <div className="text-2xl font-bold mt-1">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-muted-foreground">Chờ xử lý</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-gray-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Đang làm</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-yellow-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Hoàn thành</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Quá hạn</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-red-600">{stats.overdue}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">MTTR</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-blue-600">{stats.mttr}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">MTBF</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-purple-600">{stats.mtbf}h</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="workorders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workorders">
              <FileText className="h-4 w-4 mr-2" />
              Work Orders
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Lịch bảo trì
            </TabsTrigger>
            <TabsTrigger value="technicians">
              <Users className="h-4 w-4 mr-2" />
              Kỹ thuật viên
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Phân tích
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workorders">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle>Danh sách Work Orders</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Tìm kiếm..." 
                        className="pl-8 w-[200px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="pending">Chờ xử lý</SelectItem>
                        <SelectItem value="assigned">Đã phân công</SelectItem>
                        <SelectItem value="in_progress">Đang làm</SelectItem>
                        <SelectItem value="completed">Hoàn thành</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredWorkOrders.map((wo) => (
                    <div key={wo.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-12 rounded-full ${priorityColors[wo.priority]}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">{wo.id}</span>
                            <Badge className={statusColors[wo.status]}>{statusLabels[wo.status]}</Badge>
                          </div>
                          <div className="font-medium">{wo.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {wo.machine} • {wo.assignee} • Hạn: {wo.dueDate}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Lịch bảo trì định kỳ</CardTitle>
                <CardDescription>Các công việc bảo trì được lên lịch tự động</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {demoSchedules.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{s.task}</div>
                        <div className="text-sm text-muted-foreground">
                          {s.machine} • {s.frequency === "weekly" ? "Hàng tuần" : s.frequency === "monthly" ? "Hàng tháng" : s.frequency === "quarterly" ? "Hàng quý" : "2 tuần/lần"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Lần tới:</span>{" "}
                          <span className="font-medium">{s.nextDue}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Lần cuối: {s.lastDone}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technicians">
            <Card>
              <CardHeader>
                <CardTitle>Đội ngũ kỹ thuật viên</CardTitle>
                <CardDescription>Quản lý và phân công công việc</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {demoTechnicians.map((t) => (
                    <Card key={t.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{t.name}</div>
                          <Badge variant={t.available ? "default" : "secondary"}>
                            {t.available ? "Sẵn sàng" : "Bận"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">{t.specialty}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Đang làm</div>
                            <div className="font-medium">{t.activeOrders} WO</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Tháng này</div>
                            <div className="font-medium">{t.completedThisMonth} WO</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Xu hướng bảo trì</CardTitle>
                  <CardDescription>Corrective vs Preventive theo tháng</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={demoTrendData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="corrective" name="Sửa chữa" fill="#ef4444" fillOpacity={0.3} stroke="#ef4444" />
                        <Area type="monotone" dataKey="preventive" name="Phòng ngừa" fill="#22c55e" fillOpacity={0.3} stroke="#22c55e" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Phân bố loại bảo trì</CardTitle>
                  <CardDescription>Tỷ lệ các loại bảo trì</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={demoTypeDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {demoTypeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
