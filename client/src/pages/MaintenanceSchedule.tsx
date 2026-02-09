import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GanttChart, GanttTask } from "@/components/GanttChart";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar, Plus, Users, Wrench, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { format, addDays } from "date-fns";

export default function MaintenanceSchedule() {
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [selectedTechnician, setSelectedTechnician] = useState("all");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);

  // Queries
  const { data: workOrders, refetch: refetchWorkOrders } = trpc.maintenance.listWorkOrders.useQuery({});
  const { data: schedules } = trpc.maintenance.listSchedules.useQuery({});
  const { data: technicians } = trpc.maintenance.listTechnicians.useQuery({});
  const { data: machines } = trpc.machine.listAll.useQuery();

  const createWorkOrderMutation = trpc.maintenance.createWorkOrder.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo công việc mới");
      refetchWorkOrders();
      setIsAddTaskOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateWorkOrderMutation = trpc.maintenance.updateWorkOrder.useMutation({
    onSuccess: () => {
      refetchWorkOrders();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteWorkOrderMutation = trpc.maintenance.deleteWorkOrder.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa lịch bảo trì");
      refetchWorkOrders();
      setSelectedTask(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // Convert work orders to Gantt tasks
  const ganttTasks: GanttTask[] = useMemo(() => {
    if (!workOrders) return [];
    
    return workOrders.map(wo => ({
      id: wo.id,
      title: wo.title,
      startDate: wo.scheduledStartAt ? new Date(wo.scheduledStartAt) : new Date(),
      endDate: wo.completedAt ? new Date(wo.completedAt) : 
               wo.scheduledStartAt ? addDays(new Date(wo.scheduledStartAt), 1) : 
               addDays(new Date(), 1),
      assignee: wo.technicianName || "Chưa phân công",
      status: wo.status === "completed" ? "completed" :
              wo.status === "in_progress" ? "in_progress" :
              wo.scheduledStartAt && new Date(wo.scheduledStartAt) < new Date() ? "overdue" : "pending",
      type: wo.typeCategory as "preventive" | "corrective" | "predictive" || "preventive",
      machineId: wo.machineId,
      machineName: wo.machineName || undefined,
      priority: wo.priority as "low" | "medium" | "high" | "critical",
      progress: wo.status === "completed" ? 100 :
               wo.status === "in_progress" ? 50 :
               wo.status === "on_hold" ? 25 : 0,
    }));
  }, [workOrders]);

  // Filter tasks by technician
  const filteredTasks = useMemo(() => {
    if (selectedTechnician === "all") return ganttTasks;
    return ganttTasks.filter(t => t.assignee === selectedTechnician);
  }, [ganttTasks, selectedTechnician]);

  // Stats
  const stats = useMemo(() => {
    const pending = ganttTasks.filter(t => t.status === "pending").length;
    const inProgress = ganttTasks.filter(t => t.status === "in_progress").length;
    const completed = ganttTasks.filter(t => t.status === "completed").length;
    const overdue = ganttTasks.filter(t => t.status === "overdue").length;
    return { pending, inProgress, completed, overdue, total: ganttTasks.length };
  }, [ganttTasks]);

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createWorkOrderMutation.mutate({
      machineId: Number(formData.get("machineId")),
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      maintenanceTypeId: formData.get("type") === "preventive" ? 1 : formData.get("type") === "corrective" ? 2 : 3,
      priority: formData.get("priority") as "low" | "medium" | "high" | "critical",
      scheduledStartAt: formData.get("scheduledDate") as string,
      assignedTo: formData.get("assignedTo") ? Number(formData.get("assignedTo")) : undefined,
    });
  };

  const handleTaskClick = (task: GanttTask) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = (taskId: number, newStartDate: Date, newEndDate: Date) => {
    updateWorkOrderMutation.mutate({
      id: taskId,
      scheduledStartAt: newStartDate.toISOString().split('T')[0],
    });
  };

  const handleTaskDelete = (taskId: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa lịch bảo trì này?')) {
      deleteWorkOrderMutation.mutate({ id: taskId });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Lịch trình Bảo trì</h1>
            <p className="text-muted-foreground">
              Biểu đồ Gantt trực quan hóa lịch trình và phân công công việc
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tất cả KTV" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả KTV</SelectItem>
                {technicians?.map((t) => (
                  <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Thêm công việc</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <form onSubmit={handleAddTask}>
                  <DialogHeader>
                    <DialogTitle>Thêm công việc bảo trì</DialogTitle>
                    <DialogDescription>Tạo công việc mới và phân công cho kỹ thuật viên</DialogDescription>
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
                        <Label htmlFor="type">Loại *</Label>
                        <Select name="type" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="preventive">Định kỳ</SelectItem>
                            <SelectItem value="corrective">Sửa chữa</SelectItem>
                            <SelectItem value="predictive">Dự đoán</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Tiêu đề *</Label>
                      <Input id="title" name="title" required placeholder="Mô tả ngắn gọn công việc" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Mô tả chi tiết</Label>
                      <Textarea id="description" name="description" placeholder="Chi tiết công việc cần thực hiện" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="priority">Độ ưu tiên</Label>
                        <Select name="priority" defaultValue="medium">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Thấp</SelectItem>
                            <SelectItem value="medium">Trung bình</SelectItem>
                            <SelectItem value="high">Cao</SelectItem>
                            <SelectItem value="critical">Khẩn cấp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assignedTo">Phân công cho</Label>
                        <Select name="assignedTo">
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn KTV" />
                          </SelectTrigger>
                          <SelectContent>
                            {technicians?.map((t) => (
                              <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheduledDate">Ngày dự kiến *</Label>
                        <Input id="scheduledDate" name="scheduledDate" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estimatedHours">Thời gian (giờ)</Label>
                        <Input id="estimatedHours" name="estimatedHours" type="number" placeholder="8" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createWorkOrderMutation.isPending}>
                      Tạo công việc
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tổng</span>
              </div>
              <div className="text-2xl font-bold mt-1">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-muted-foreground">Chờ</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-gray-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Đang làm</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-blue-600">{stats.inProgress}</div>
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
        </div>

        {/* Gantt Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Biểu đồ Gantt</CardTitle>
                <CardDescription>Lịch trình bảo trì theo kỹ thuật viên</CardDescription>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "month")}>
                <TabsList>
                  <TabsTrigger value="week">Tuần</TabsTrigger>
                  <TabsTrigger value="month">Tháng</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <GanttChart 
              tasks={filteredTasks} 
              viewMode={viewMode}
              onTaskClick={handleTaskClick}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              enableDragDrop={true}
            />
          </CardContent>
        </Card>

        {/* Task Detail Dialog */}
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTask?.title}</DialogTitle>
              <DialogDescription>Chi tiết công việc bảo trì</DialogDescription>
            </DialogHeader>
            {selectedTask && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Máy</Label>
                    <p className="font-medium">{selectedTask.machineName || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Kỹ thuật viên</Label>
                    <p className="font-medium">{selectedTask.assignee}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Ngày bắt đầu</Label>
                    <p className="font-medium">{format(selectedTask.startDate, "dd/MM/yyyy")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Ngày kết thúc</Label>
                    <p className="font-medium">{format(selectedTask.endDate, "dd/MM/yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    selectedTask.status === "completed" ? "default" :
                    selectedTask.status === "in_progress" ? "secondary" :
                    selectedTask.status === "overdue" ? "destructive" : "outline"
                  }>
                    {selectedTask.status === "completed" ? "Hoàn thành" :
                     selectedTask.status === "in_progress" ? "Đang làm" :
                     selectedTask.status === "overdue" ? "Quá hạn" : "Chờ"}
                  </Badge>
                  <Badge variant="outline">
                    {selectedTask.type === "preventive" ? "Định kỳ" :
                     selectedTask.type === "corrective" ? "Sửa chữa" : "Dự đoán"}
                  </Badge>
                  {selectedTask.priority && (
                    <Badge variant={
                      selectedTask.priority === "critical" ? "destructive" :
                      selectedTask.priority === "high" ? "default" : "secondary"
                    }>
                      {selectedTask.priority === "critical" ? "Khẩn cấp" :
                       selectedTask.priority === "high" ? "Cao" :
                       selectedTask.priority === "medium" ? "TB" : "Thấp"}
                    </Badge>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="flex justify-between">
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (selectedTask && confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
                    deleteWorkOrderMutation.mutate({ id: selectedTask.id });
                  }
                }}
                disabled={deleteWorkOrderMutation.isPending}
              >
                {deleteWorkOrderMutation.isPending ? "Đang xóa..." : "Xóa công việc"}
              </Button>
              <Button variant="outline" onClick={() => setSelectedTask(null)}>Đóng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
