import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ClipboardList, Plus, Search, Filter, RefreshCw, Clock, User, Wrench, 
  AlertTriangle, CheckCircle, XCircle, Loader2, Calendar, MessageSquare,
  ChevronRight, Play, Pause, Check, X, FileText, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  created: { label: 'Mới tạo', color: 'bg-gray-500', icon: <FileText className="h-3 w-3" /> },
  assigned: { label: 'Đã gán', color: 'bg-blue-500', icon: <User className="h-3 w-3" /> },
  in_progress: { label: 'Đang xử lý', color: 'bg-yellow-500', icon: <Play className="h-3 w-3" /> },
  on_hold: { label: 'Tạm dừng', color: 'bg-orange-500', icon: <Pause className="h-3 w-3" /> },
  completed: { label: 'Hoàn thành', color: 'bg-green-500', icon: <Check className="h-3 w-3" /> },
  cancelled: { label: 'Đã hủy', color: 'bg-red-500', icon: <X className="h-3 w-3" /> },
  verified: { label: 'Đã xác nhận', color: 'bg-emerald-500', icon: <CheckCircle className="h-3 w-3" /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Thấp', color: 'bg-gray-400' },
  medium: { label: 'Trung bình', color: 'bg-blue-400' },
  high: { label: 'Cao', color: 'bg-orange-400' },
  critical: { label: 'Khẩn cấp', color: 'bg-red-500' },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  predictive: { label: 'Dự đoán', icon: <AlertTriangle className="h-3 w-3" /> },
  preventive: { label: 'Phòng ngừa', icon: <Settings className="h-3 w-3" /> },
  corrective: { label: 'Sửa chữa', icon: <Wrench className="h-3 w-3" /> },
  emergency: { label: 'Khẩn cấp', icon: <AlertTriangle className="h-3 w-3 text-red-500" /> },
  inspection: { label: 'Kiểm tra', icon: <Search className="h-3 w-3" /> },
};

export default function IoTWorkOrders() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    workOrderType: 'all',
    search: '',
  });
  const [newComment, setNewComment] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deviceId: '',
    workOrderType: 'corrective' as string,
    priority: 'medium' as string,
    estimatedDuration: 60,
    dueDate: '',
    requiredSkills: [] as string[],
  });
  
  // Queries
  const { data: workOrdersData, isLoading, refetch } = trpc.maintenanceWorkOrder.getWorkOrders.useQuery({
    status: filters.status !== 'all' ? filters.status as any : undefined,
    priority: filters.priority !== 'all' ? filters.priority as any : undefined,
    workOrderType: filters.workOrderType !== 'all' ? filters.workOrderType as any : undefined,
    search: filters.search || undefined,
  });
  
  const { data: statistics } = trpc.maintenanceWorkOrder.getStatistics.useQuery({});
  const { data: technicians } = trpc.maintenanceWorkOrder.getTechnicians.useQuery({});
  const { data: devices } = trpc.iotDeviceManagement?.getDevices?.useQuery({}) || { data: null };
  
  // Mutations
  const createMutation = trpc.maintenanceWorkOrder.createWorkOrder.useMutation({
    onSuccess: () => {
      toast.success('Đã tạo phiếu công việc');
      setIsCreateOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const updateMutation = trpc.maintenanceWorkOrder.updateWorkOrder.useMutation({
    onSuccess: () => {
      toast.success('Đã cập nhật phiếu công việc');
      refetch();
    },
  });
  
  const autoAssignMutation = trpc.maintenanceWorkOrder.autoAssignWorkOrder.useMutation({
    onSuccess: () => {
      toast.success('Đã tự động gán kỹ thuật viên');
      refetch();
    },
  });
  
  const addCommentMutation = trpc.maintenanceWorkOrder.addComment.useMutation({
    onSuccess: () => {
      toast.success('Đã thêm ghi chú');
      setNewComment('');
      // Refetch work order details
      if (selectedWorkOrder) {
        // Would need to refetch the specific work order
      }
    },
  });
  
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      deviceId: '',
      workOrderType: 'corrective',
      priority: 'medium',
      estimatedDuration: 60,
      dueDate: '',
      requiredSkills: [],
    });
  };
  
  const handleCreate = () => {
    if (!formData.title || !formData.deviceId) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    
    createMutation.mutate({
      ...formData,
      deviceId: parseInt(formData.deviceId),
      workOrderType: formData.workOrderType as any,
      priority: formData.priority as any,
      dueDate: formData.dueDate || undefined,
      requiredSkills: formData.requiredSkills.length > 0 ? formData.requiredSkills : undefined,
    });
  };
  
  const handleStatusChange = (workOrderId: number, newStatus: string) => {
    updateMutation.mutate({
      id: workOrderId,
      status: newStatus as any,
    });
  };
  
  const workOrders = workOrdersData?.workOrders || [];
  
  // Calculate stats
  const stats = {
    total: workOrders.length,
    pending: workOrders.filter((wo: any) => ['created', 'assigned'].includes(wo.status)).length,
    inProgress: workOrders.filter((wo: any) => wo.status === 'in_progress').length,
    completed: workOrders.filter((wo: any) => ['completed', 'verified'].includes(wo.status)).length,
    overdue: statistics?.overdueCount || 0,
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-blue-500" />
              Phiếu Công việc Bảo trì
            </h1>
            <p className="text-muted-foreground">
              Quản lý và theo dõi các phiếu công việc bảo trì thiết bị IoT
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo phiếu mới
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tạo phiếu công việc bảo trì</DialogTitle>
                  <DialogDescription>
                    Tạo phiếu công việc mới cho thiết bị IoT
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tiêu đề *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="VD: Thay thế cảm biến nhiệt độ"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Mô tả chi tiết công việc..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Thiết bị *</Label>
                      <Select
                        value={formData.deviceId}
                        onValueChange={(v) => setFormData({ ...formData, deviceId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn thiết bị" />
                        </SelectTrigger>
                        <SelectContent>
                          {(devices?.devices as any[])?.map((device: any) => (
                            <SelectItem key={device.id} value={device.id.toString()}>
                              {device.name}
                            </SelectItem>
                          )) || (
                            <>
                              <SelectItem value="1">PLC-001</SelectItem>
                              <SelectItem value="2">Sensor-T01</SelectItem>
                              <SelectItem value="3">Gateway-01</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Loại công việc</Label>
                      <Select
                        value={formData.workOrderType}
                        onValueChange={(v) => setFormData({ ...formData, workOrderType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                {config.icon}
                                {config.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Độ ưu tiên</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(v) => setFormData({ ...formData, priority: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${config.color}`} />
                                {config.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Thời gian ước tính (phút)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.estimatedDuration}
                        onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Hạn hoàn thành</Label>
                    <Input
                      type="datetime-local"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Tạo phiếu
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng phiếu</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chờ xử lý</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang xử lý</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
                </div>
                <Wrench className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hoàn thành</p>
                  <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quá hạn</p>
                  <p className="text-2xl font-bold text-red-500">{stats.overdue}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm phiếu công việc..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select
                value={filters.status}
                onValueChange={(v) => setFilters({ ...filters, status: v })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={filters.priority}
                onValueChange={(v) => setFilters({ ...filters, priority: v })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Độ ưu tiên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select
                value={filters.workOrderType}
                onValueChange={(v) => setFilters({ ...filters, workOrderType: v })}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Work Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách phiếu công việc</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : workOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có phiếu công việc nào</p>
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo phiếu đầu tiên
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã phiếu</TableHead>
                    <TableHead>Tiêu đề</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Độ ưu tiên</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Người thực hiện</TableHead>
                    <TableHead>Hạn</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.map((wo: any) => {
                    const statusConfig = STATUS_CONFIG[wo.status] || STATUS_CONFIG.created;
                    const priorityConfig = PRIORITY_CONFIG[wo.priority] || PRIORITY_CONFIG.medium;
                    const typeConfig = TYPE_CONFIG[wo.workOrderType] || TYPE_CONFIG.corrective;
                    const isOverdue = wo.dueDate && new Date(wo.dueDate) < new Date() && !['completed', 'verified', 'cancelled'].includes(wo.status);
                    
                    return (
                      <TableRow key={wo.id} className={isOverdue ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                        <TableCell>
                          <span className="font-mono text-sm">{wo.workOrderNumber}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{wo.title}</p>
                            {wo.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {wo.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            {typeConfig.icon}
                            {typeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${priorityConfig.color} text-white`}>
                            {priorityConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig.color} text-white flex items-center gap-1 w-fit`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {wo.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">KT</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">Kỹ thuật viên #{wo.assignedTo}</span>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => autoAssignMutation.mutate({ id: wo.id })}
                              disabled={autoAssignMutation.isPending}
                            >
                              <User className="h-3 w-3 mr-1" />
                              Tự động gán
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {wo.dueDate ? (
                            <div className={isOverdue ? 'text-red-500' : ''}>
                              <p className="text-sm">
                                {format(new Date(wo.dueDate), 'dd/MM/yyyy', { locale: vi })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(wo.dueDate), { addSuffix: true, locale: vi })}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {wo.status === 'created' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(wo.id, 'in_progress')}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {wo.status === 'in_progress' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(wo.id, 'on_hold')}
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(wo.id, 'completed')}
                                >
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                              </>
                            )}
                            {wo.status === 'on_hold' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(wo.id, 'in_progress')}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedWorkOrder(wo);
                                setIsDetailOpen(true);
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                {selectedWorkOrder?.workOrderNumber}
              </DialogTitle>
              <DialogDescription>
                Chi tiết phiếu công việc bảo trì
              </DialogDescription>
            </DialogHeader>
            
            {selectedWorkOrder && (
              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Chi tiết</TabsTrigger>
                  <TabsTrigger value="tasks">Công việc</TabsTrigger>
                  <TabsTrigger value="history">Lịch sử</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedWorkOrder.title}</h3>
                    <p className="text-muted-foreground mt-1">{selectedWorkOrder.description || 'Không có mô tả'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Trạng thái</p>
                      <Badge className={`${STATUS_CONFIG[selectedWorkOrder.status]?.color} text-white`}>
                        {STATUS_CONFIG[selectedWorkOrder.status]?.label}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Độ ưu tiên</p>
                      <Badge className={`${PRIORITY_CONFIG[selectedWorkOrder.priority]?.color} text-white`}>
                        {PRIORITY_CONFIG[selectedWorkOrder.priority]?.label}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Loại công việc</p>
                      <p className="font-medium">{TYPE_CONFIG[selectedWorkOrder.workOrderType]?.label}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Thời gian ước tính</p>
                      <p className="font-medium">{selectedWorkOrder.estimatedDuration} phút</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Ngày tạo</p>
                      <p className="font-medium">
                        {format(new Date(selectedWorkOrder.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Hạn hoàn thành</p>
                      <p className="font-medium">
                        {selectedWorkOrder.dueDate 
                          ? format(new Date(selectedWorkOrder.dueDate), 'dd/MM/yyyy HH:mm', { locale: vi })
                          : 'Không có'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Comments */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Ghi chú
                    </h4>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Thêm ghi chú..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => {
                            if (newComment.trim()) {
                              addCommentMutation.mutate({
                                workOrderId: selectedWorkOrder.id,
                                comment: newComment,
                              });
                            }
                          }}
                          disabled={!newComment.trim() || addCommentMutation.isPending}
                        >
                          Gửi
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="tasks" className="mt-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Chức năng quản lý công việc chi tiết đang phát triển</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="history" className="mt-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Lịch sử thay đổi đang phát triển</p>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
