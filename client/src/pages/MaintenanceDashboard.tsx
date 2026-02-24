import { useState, useMemo } from "react";
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
  Plus, Search, MoreHorizontal, Play, XCircle,
  TrendingUp, BarChart3, Pencil, Trash2, Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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

const typeColors = ["#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#06b6d4"];

export default function MaintenanceDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewWODialog, setShowNewWODialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedWOId, setSelectedWOId] = useState<number | null>(null);
  const [showTechDialog, setShowTechDialog] = useState(false);
  const [showDeleteTechDialog, setShowDeleteTechDialog] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [newTech, setNewTech] = useState({ name: "", specialty: "", employeeCode: "" });

  // New work order form
  const [newWO, setNewWO] = useState({
    title: "", description: "", machineId: 0, priority: "medium" as string,
  });

  // === tRPC Queries ===
  const { data: workOrders = [], isLoading: woLoading } = trpc.maintenance.listWorkOrders.useQuery({ limit: 200 });
  const { data: schedules = [], isLoading: schedLoading } = trpc.maintenance.listSchedules.useQuery({});
  const { data: techList = [], isLoading: techLoading } = trpc.maintenance.listTechnicians.useQuery({});
  const { data: stats } = trpc.maintenance.getStats.useQuery({ days: 30 });
  const { data: trend = [] } = trpc.maintenance.getTrend.useQuery({ days: 180 });
  const { data: typeDistribution = [] } = trpc.maintenance.getTypeDistribution.useQuery({ days: 90 });
  const { data: machineList = [] } = trpc.maintenance.listTypes.useQuery();

  const utils = trpc.useUtils();

  // === Mutations ===
  const createWO = trpc.maintenance.createWorkOrder.useMutation({
    onSuccess: () => {
      utils.maintenance.listWorkOrders.invalidate();
      utils.maintenance.getStats.invalidate();
      toast.success("Đã tạo Work Order mới");
      setShowNewWODialog(false);
      setNewWO({ title: "", description: "", machineId: 0, priority: "medium" });
    },
    onError: (err) => toast.error("Lỗi: " + err.message),
  });

  const startWO = trpc.maintenance.startWorkOrder.useMutation({
    onSuccess: () => {
      utils.maintenance.listWorkOrders.invalidate();
      utils.maintenance.getStats.invalidate();
      toast.success("Đã bắt đầu Work Order");
    },
  });

  const completeWO = trpc.maintenance.completeWorkOrder.useMutation({
    onSuccess: () => {
      utils.maintenance.listWorkOrders.invalidate();
      utils.maintenance.getStats.invalidate();
      toast.success("Đã hoàn thành Work Order");
    },
  });

  const cancelWO = trpc.maintenance.cancelWorkOrder.useMutation({
    onSuccess: () => {
      utils.maintenance.listWorkOrders.invalidate();
      utils.maintenance.getStats.invalidate();
      toast.success("Đã hủy Work Order");
    },
  });

  const deleteWO = trpc.maintenance.deleteWorkOrder.useMutation({
    onSuccess: () => {
      utils.maintenance.listWorkOrders.invalidate();
      utils.maintenance.getStats.invalidate();
      toast.success("Đã xóa Work Order");
      setShowDeleteDialog(false);
    },
  });

  const createTech = trpc.maintenance.createTechnician.useMutation({
    onSuccess: () => {
      utils.maintenance.listTechnicians.invalidate();
      toast.success("Đã thêm kỹ thuật viên");
      setShowTechDialog(false);
      setNewTech({ name: "", specialty: "", employeeCode: "" });
    },
    onError: (err) => toast.error("Lỗi: " + err.message),
  });

  const deleteTech = trpc.maintenance.deleteTechnician.useMutation({
    onSuccess: () => {
      utils.maintenance.listTechnicians.invalidate();
      toast.success("Đã xóa kỹ thuật viên");
      setShowDeleteTechDialog(false);
    },
  });

  // === Derived data ===
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo: any) => {
      const matchesSearch = (wo.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (wo.machineName || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || wo.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workOrders, searchTerm, statusFilter]);

  const trendChartData = useMemo(() => {
    return trend.map((t: any) => ({
      date: t.date,
      count: Number(t.count) || 0,
    }));
  }, [trend]);

  const typeChartData = useMemo(() => {
    return typeDistribution.map((t: any, i: number) => ({
      name: t.action || "Khác",
      value: Number(t.count) || 0,
      color: typeColors[i % typeColors.length],
    }));
  }, [typeDistribution]);

  const isLoading = woLoading || schedLoading || techLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Đang tải dữ liệu bảo trì...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
                  <Input placeholder="Mô tả công việc..." value={newWO.title} onChange={e => setNewWO(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Mô tả chi tiết</Label>
                  <Textarea placeholder="Chi tiết..." value={newWO.description} onChange={e => setNewWO(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mức ưu tiên</Label>
                    <Select value={newWO.priority} onValueChange={v => setNewWO(p => ({ ...p, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Thấp</SelectItem>
                        <SelectItem value="medium">Trung bình</SelectItem>
                        <SelectItem value="high">Cao</SelectItem>
                        <SelectItem value="critical">Khẩn cấp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={!newWO.title || createWO.isPending}
                  onClick={() => createWO.mutate({
                    title: newWO.title,
                    description: newWO.description,
                    priority: newWO.priority as any,
                  })}
                >
                  {createWO.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Tạo Work Order
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Tổng WO</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats?.total || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Chờ xử lý</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats?.pending || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Đang xử lý</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats?.inProgress || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Hoàn thành</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats?.completed || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Quá hạn</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-red-500">{stats?.overdue || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">MTTR (h)</span>
              </div>
              <p className="text-2xl font-bold mt-1">{Number(stats?.mttr || 0).toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground">KTV</span>
              </div>
              <p className="text-2xl font-bold mt-1">{techList.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="workorders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workorders">Work Orders</TabsTrigger>
            <TabsTrigger value="schedules">Lịch bảo trì</TabsTrigger>
            <TabsTrigger value="technicians">Kỹ thuật viên</TabsTrigger>
            <TabsTrigger value="analytics">Phân tích</TabsTrigger>
          </TabsList>

          {/* Work Orders Tab */}
          <TabsContent value="workorders" className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm work order..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ xử lý</SelectItem>
                  <SelectItem value="assigned">Đã phân công</SelectItem>
                  <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredWorkOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Wrench className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Chưa có work order nào{statusFilter !== "all" ? ` với trạng thái "${statusLabels[statusFilter]}"` : ""}.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowNewWODialog(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Tạo Work Order đầu tiên
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredWorkOrders.map((wo: any) => (
                  <Card key={wo.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-muted-foreground">{wo.workOrderNumber || `WO-${wo.id}`}</span>
                              <Badge className={`${priorityColors[wo.priority] || "bg-gray-500"} text-white text-xs`}>
                                {wo.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <span className={`w-2 h-2 rounded-full mr-1 inline-block ${statusColors[wo.status] || "bg-gray-500"}`} />
                                {statusLabels[wo.status] || wo.status}
                              </Badge>
                            </div>
                            <p className="font-medium mt-1">{wo.title}</p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>Máy: {wo.machineName || "N/A"}</span>
                              <span>KTV: {wo.technicianName || "Chưa phân công"}</span>
                              {wo.scheduledStartAt && (
                                <span>Hạn: {new Date(wo.scheduledStartAt).toLocaleDateString("vi-VN")}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {wo.status === "pending" && (
                              <DropdownMenuItem onClick={() => startWO.mutate({ id: wo.id })}>
                                <Play className="h-4 w-4 mr-2" /> Bắt đầu
                              </DropdownMenuItem>
                            )}
                            {(wo.status === "in_progress" || wo.status === "assigned") && (
                              <DropdownMenuItem onClick={() => completeWO.mutate({ id: wo.id, laborHours: 0, notes: "" })}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Hoàn thành
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {wo.status !== "cancelled" && wo.status !== "completed" && (
                              <DropdownMenuItem onClick={() => cancelWO.mutate({ id: wo.id })}>
                                <XCircle className="h-4 w-4 mr-2" /> Hủy
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => { setSelectedWOId(wo.id); setShowDeleteDialog(true); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Schedules Tab */}
          <TabsContent value="schedules" className="space-y-4">
            {schedules.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Chưa có lịch bảo trì nào.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {schedules.map((s: any) => (
                  <Card key={s.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{s.name}</CardTitle>
                        <Badge variant={s.isActive ? "default" : "secondary"}>
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardDescription>{s.machineName || "N/A"} — {s.typeName || "N/A"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tần suất:</span>
                          <span className="ml-2 font-medium capitalize">{s.frequency}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ưu tiên:</span>
                          <Badge className={`ml-2 ${priorityColors[s.priority] || "bg-gray-500"} text-white text-xs`}>
                            {s.priority}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Lần cuối:</span>
                          <span className="ml-2">{s.lastPerformedAt ? new Date(s.lastPerformedAt).toLocaleDateString("vi-VN") : "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tiếp theo:</span>
                          <span className="ml-2 font-medium">{s.nextDueAt ? new Date(s.nextDueAt).toLocaleDateString("vi-VN") : "N/A"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Technicians Tab */}
          <TabsContent value="technicians" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showTechDialog} onOpenChange={setShowTechDialog}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" /> Thêm KTV</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Thêm kỹ thuật viên</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Họ tên</Label>
                      <Input value={newTech.name} onChange={e => setNewTech(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mã nhân viên</Label>
                      <Input value={newTech.employeeCode} onChange={e => setNewTech(p => ({ ...p, employeeCode: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Chuyên môn</Label>
                      <Input value={newTech.specialty} onChange={e => setNewTech(p => ({ ...p, specialty: e.target.value }))} />
                    </div>
                    <Button
                      className="w-full"
                      disabled={!newTech.name || !newTech.employeeCode || createTech.isPending}
                      onClick={() => createTech.mutate({
                        name: newTech.name,
                        employeeCode: newTech.employeeCode,
                        specialty: newTech.specialty || undefined,
                      })}
                    >
                      {createTech.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Thêm
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {techList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Chưa có kỹ thuật viên nào.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {techList.map((tech: any) => (
                  <Card key={tech.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{tech.name}</CardTitle>
                        <Badge variant={tech.isActive ? "default" : "secondary"}>
                          {tech.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardDescription>{tech.employeeCode} — {tech.specialty || "General"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {tech.email && <p>{tech.email}</p>}
                          {tech.phone && <p>{tech.phone}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => { setSelectedTechId(tech.id); setShowDeleteTechDialog(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Xu hướng bảo trì (180 ngày)</CardTitle>
                </CardHeader>
                <CardContent>
                  {trendChartData.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Chưa có dữ liệu lịch sử
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f680" name="Số lượng" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Phân bổ loại bảo trì</CardTitle>
                </CardHeader>
                <CardContent>
                  {typeChartData.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Chưa có dữ liệu phân bổ
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={typeChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                          {typeChartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete WO Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa work order này? Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => selectedWOId && deleteWO.mutate({ id: selectedWOId })}
              >
                {deleteWO.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Tech Dialog */}
        <AlertDialog open={showDeleteTechDialog} onOpenChange={setShowDeleteTechDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa kỹ thuật viên</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa kỹ thuật viên này?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => selectedTechId && deleteTech.mutate({ id: selectedTechId })}
              >
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
