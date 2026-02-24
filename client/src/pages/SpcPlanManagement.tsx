import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { CameraStream } from "@/components/CameraStream";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Calendar, 
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Clock,
  Factory,
  Mail,
  Shield,
  Zap,
  Target,
  Sparkles,
  FileText,
  Camera,
  Video
} from "lucide-react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useKeyboardShortcuts, createCommonShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";

interface SpcPlan {
  id: number;
  name: string;
  description?: string | null;
  productionLineId: number;
  productId?: number | null;
  workstationId?: number | null;
  samplingConfigId: number;
  specificationId?: number | null;
  mappingId?: number | null;
  machineId?: number | null;
  fixtureId?: number | null;
  startTime?: Date | null;
  endTime?: Date | null;
  status: "draft" | "active" | "paused" | "completed";
  isRecurring: number;
  notifyOnViolation: number;
  notifyEmail?: string | null;
  enabledSpcRules?: string | null;
  enabledCaRules?: string | null;
  enabledCpkRules?: string | null;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
  isActive: number;
  // CPK Alert fields
  cpkAlertEnabled?: number | null;
  cpkUpperLimit?: string | null;
  cpkLowerLimit?: string | null;
  alertThresholdId?: number | null;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
};

const statusLabels: Record<string, string> = {
  draft: "Nháp",
  active: "Đang chạy",
  paused: "Tạm dừng",
  completed: "Hoàn thành",
};

export default function SpcPlanManagement() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isModeSelectDialogOpen, setIsModeSelectDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SpcPlan | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    productionLineId: 0,
    productId: 0,
    workstationId: 0,
    samplingConfigId: 0,
    specificationId: 0,
    mappingId: 0,
    machineId: 0,
    fixtureId: 0,
    startTime: "",
    endTime: "",
    isRecurring: true,
    notifyOnViolation: true,
    notifyEmail: "",
    enabledSpcRules: [] as number[],
    enabledCaRules: [] as number[],
    enabledCpkRules: [] as number[],
    measurementStandardId: 0,
    // CPK Alert fields
    cpkAlertEnabled: false,
    cpkUpperLimit: "",
    cpkLowerLimit: "1.33",
  });

  // Fetch data
  const { data: spcPlans, isLoading, refetch } = trpc.spcPlan.list.useQuery();
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();
  const { data: samplingConfigs } = trpc.sampling.list.useQuery();
  const { data: specifications } = trpc.productSpec.list.useQuery();
  const { data: mappings } = trpc.mapping.list.useQuery();
  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: fixtures } = trpc.fixture.list.useQuery();
  const { data: spcRules = [] } = trpc.rules.getSpcRules.useQuery();
  const { data: caRules = [] } = trpc.rules.getCaRules.useQuery();
  const { data: cpkRules = [] } = trpc.rules.getCpkRules.useQuery();
  const { data: measurementStandards = [] } = trpc.measurementStandard.list.useQuery();
  const { data: workstations = [] } = trpc.workstation.listAll.useQuery();

  // Mutations
  const createMutation = trpc.spcPlan.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo kế hoạch SPC thành công");
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const updateMutation = trpc.spcPlan.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật kế hoạch thành công");
      refetch();
      setEditingPlan(null);
      resetForm();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const deleteMutation = trpc.spcPlan.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa kế hoạch thành công");
      refetch();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const updateStatusMutation = trpc.spcPlan.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật trạng thái thành công");
      refetch();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      productionLineId: 0,
      productId: 0,
      workstationId: 0,
      samplingConfigId: 0,
      specificationId: 0,
      mappingId: 0,
      machineId: 0,
      fixtureId: 0,
      startTime: "",
      endTime: "",
      isRecurring: true,
      notifyOnViolation: true,
      notifyEmail: "",
      enabledSpcRules: [],
      enabledCaRules: [],
      enabledCpkRules: [],
      measurementStandardId: 0,
      cpkAlertEnabled: false,
      cpkUpperLimit: "",
      cpkLowerLimit: "1.33",
    });
  };

  // Filter fixtures by selected machine
  const filteredFixtures = fixtures?.filter(f => 
    formData.machineId ? f.machineId === formData.machineId : true
  ) || [];

  const handleCreate = () => {
    if (!formData.name || !formData.productionLineId || !formData.samplingConfigId) {
      toast.error("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }
    createMutation.mutate({
      ...formData,
      productId: formData.productId || undefined,
      workstationId: formData.workstationId || undefined,
      specificationId: formData.specificationId || undefined,
      mappingId: formData.mappingId || undefined,
      machineId: formData.machineId || undefined,
      fixtureId: formData.fixtureId || undefined,
      startTime: formData.startTime ? new Date(formData.startTime).getTime() : undefined,
      endTime: formData.endTime ? new Date(formData.endTime).getTime() : undefined,
      enabledSpcRules: JSON.stringify(formData.enabledSpcRules),
      enabledCaRules: JSON.stringify(formData.enabledCaRules),
      enabledCpkRules: JSON.stringify(formData.enabledCpkRules),
      cpkAlertEnabled: formData.cpkAlertEnabled,
      cpkUpperLimit: formData.cpkUpperLimit || undefined,
      cpkLowerLimit: formData.cpkLowerLimit || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingPlan) return;
    updateMutation.mutate({
      id: editingPlan.id,
      ...formData,
      productId: formData.productId || undefined,
      workstationId: formData.workstationId || undefined,
      specificationId: formData.specificationId || undefined,
      mappingId: formData.mappingId || undefined,
      machineId: formData.machineId || undefined,
      fixtureId: formData.fixtureId || undefined,
      startTime: formData.startTime ? new Date(formData.startTime).getTime() : undefined,
      endTime: formData.endTime ? new Date(formData.endTime).getTime() : undefined,
      enabledSpcRules: JSON.stringify(formData.enabledSpcRules),
      enabledCaRules: JSON.stringify(formData.enabledCaRules),
      enabledCpkRules: JSON.stringify(formData.enabledCpkRules),
      cpkAlertEnabled: formData.cpkAlertEnabled,
      cpkUpperLimit: formData.cpkUpperLimit || undefined,
      cpkLowerLimit: formData.cpkLowerLimit || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa kế hoạch này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleStatusChange = (id: number, status: "active" | "paused") => {
    updateStatusMutation.mutate({ id, status });
  };

  // Keyboard shortcuts
  const shortcuts = createCommonShortcuts({
    onSave: () => {
      if (isCreateDialogOpen) {
        handleCreate();
      } else if (editingPlan) {
        handleUpdate();
      }
    },
    onNew: () => {
      resetForm();
      setIsCreateDialogOpen(true);
    },
    onClose: () => {
      setIsCreateDialogOpen(false);
      setEditingPlan(null);
    },
  });
  
  shortcuts.push({
    key: "/",
    ctrl: true,
    action: () => setShowShortcutsHelp(true),
    description: "Hiển thị phím tắt",
  });

  useKeyboardShortcuts({ shortcuts });

  const openEditDialog = (plan: SpcPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      productionLineId: plan.productionLineId,
      productId: plan.productId || 0,
      workstationId: plan.workstationId || 0,
      samplingConfigId: plan.samplingConfigId,
      specificationId: plan.specificationId || 0,
      mappingId: plan.mappingId || 0,
      machineId: plan.machineId || 0,
      fixtureId: plan.fixtureId || 0,
      startTime: plan.startTime ? new Date(plan.startTime).toISOString().slice(0, 16) : "",
      endTime: plan.endTime ? new Date(plan.endTime).toISOString().slice(0, 16) : "",
      isRecurring: plan.isRecurring === 1,
      notifyOnViolation: plan.notifyOnViolation === 1,
      notifyEmail: plan.notifyEmail || "",
      enabledSpcRules: plan.enabledSpcRules ? JSON.parse(plan.enabledSpcRules) : [],
      enabledCaRules: plan.enabledCaRules ? JSON.parse(plan.enabledCaRules) : [],
      enabledCpkRules: plan.enabledCpkRules ? JSON.parse(plan.enabledCpkRules) : [],
      measurementStandardId: (plan as any).measurementStandardId || 0,
      cpkAlertEnabled: plan.cpkAlertEnabled === 1,
      cpkUpperLimit: plan.cpkUpperLimit || "",
      cpkLowerLimit: plan.cpkLowerLimit || "1.33",
    });
  };

  const filteredPlans = spcPlans?.filter((p: SpcPlan) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLineName = (id: number) => productionLines?.find((l: any) => l.id === id)?.name || "-";
  const getProductName = (id: number | null | undefined) => id ? products?.find((p: any) => p.id === id)?.name || "-" : "-";
  const getSamplingName = (id: number) => samplingConfigs?.find((s: any) => s.id === id)?.name || "-";

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Không có quyền truy cập</CardTitle>
              <CardDescription>Bạn cần quyền Admin để truy cập trang này</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kế hoạch lấy mẫu SPC</h1>
            <p className="text-muted-foreground mt-1">Quản lý kế hoạch lấy mẫu tự động và gán vào dây chuyền</p>
          </div>
          {/* Mode Selection Dialog */}
          <Dialog open={isModeSelectDialogOpen} onOpenChange={setIsModeSelectDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo kế hoạch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Chọn cách tạo kế hoạch SPC</DialogTitle>
                <DialogDescription>Chọn phương thức phù hợp với nhu cầu của bạn</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div 
                  className="border rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  onClick={() => {
                    setIsModeSelectDialogOpen(false);
                    navigate("/quick-spc-plan");
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold">Tạo nhanh</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tạo từ tiêu chuẩn đo lường hoặc nhập thủ công với giao diện wizard
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">Tiêu chuẩn</Badge>
                    <Badge variant="secondary" className="text-xs">Template</Badge>
                  </div>
                </div>
                <div 
                  className="border rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  onClick={() => {
                    setIsModeSelectDialogOpen(false);
                    resetForm();
                    setIsCreateDialogOpen(true);
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold">Tạo chi tiết</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cấu hình đầy đủ các tham số SPC Plan trong form chi tiết
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">Nâng cao</Badge>
                    <Badge variant="secondary" className="text-xs">Tùy chỉnh</Badge>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Detail Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tạo kế hoạch lấy mẫu SPC</DialogTitle>
                <DialogDescription>Cấu hình kế hoạch lấy mẫu tự động cho dây chuyền</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Tên kế hoạch *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Kế hoạch SPC Line 1 - Sản phẩm A"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dây chuyền sản xuất *</Label>
                    <Select 
                      value={formData.productionLineId.toString()} 
                      onValueChange={(v) => setFormData({ ...formData, productionLineId: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn dây chuyền" />
                      </SelectTrigger>
                      <SelectContent>
                        {productionLines?.map((line: any) => (
                          <SelectItem key={line.id} value={line.id.toString()}>{line.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phương pháp lấy mẫu *</Label>
                    <Select 
                      value={formData.samplingConfigId.toString()} 
                      onValueChange={(v) => setFormData({ ...formData, samplingConfigId: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn phương pháp" />
                      </SelectTrigger>
                      <SelectContent>
                        {samplingConfigs?.map((config: any) => (
                          <SelectItem key={config.id} value={config.id.toString()}>{config.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sản phẩm (tùy chọn)</Label>
                    <Select 
                      value={formData.productId.toString()} 
                      onValueChange={(v) => setFormData({ ...formData, productId: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn sản phẩm" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">-- Không chọn --</SelectItem>
                        {products?.map((product: any) => (
                          <SelectItem key={product.id} value={product.id.toString()}>{product.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tiêu chuẩn USL/LSL (tùy chọn)</Label>
                    <Select 
                      value={formData.specificationId.toString()} 
                      onValueChange={(v) => setFormData({ ...formData, specificationId: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tiêu chuẩn" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">-- Không chọn --</SelectItem>
                        {specifications?.map((spec: any) => (
                          <SelectItem key={spec.id} value={spec.id.toString()}>{spec.parameterName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Tiêu chuẩn Đo lường (tự động áp dụng cấu hình)
                    </Label>
                    <Select 
                      value={formData.measurementStandardId.toString()} 
                      onValueChange={(v) => {
                        const stdId = parseInt(v);
                        const standard = measurementStandards.find((s: any) => s.id === stdId);
                        if (standard) {
                          // Tự động điền đầy đủ thông tin từ tiêu chuẩn đo
                          const appliedSpcRules = standard.appliedSpcRules ? JSON.parse(standard.appliedSpcRules) : [];
                          const appliedCpkRules = (standard as any).appliedCpkRules ? JSON.parse((standard as any).appliedCpkRules) : [];
                          const appliedCaRules = (standard as any).appliedCaRules ? JSON.parse((standard as any).appliedCaRules) : [];
                          
                          // Tìm mapping phù hợp với sản phẩm và công trạm
                          const product = products?.find((p: any) => p.id === standard.productId);
                          const ws = workstations.find((w: any) => w.id === standard.workstationId);
                          const matchingMapping = mappings?.find((m: any) => 
                            m.productCode === product?.code && m.stationName === ws?.name
                          );
                          
                          // Tìm dây chuyền từ công trạm
                          const workstation = workstations.find((w: any) => w.id === standard.workstationId);
                          const lineId = (workstation as any)?.productionLineId || formData.productionLineId;
                          
                          // Tự động tạo tên kế hoạch
                          const autoName = `SPC Plan - ${standard.measurementName} (${product?.name || 'N/A'})`;
                          
                          // Tìm phương pháp lấy mẫu phù hợp (nếu có trong tiêu chuẩn)
                          const samplingId = (standard as any).samplingConfigId || formData.samplingConfigId;
                          
                          // Tìm tiêu chuẩn USL/LSL phù hợp (nếu có)
                          const specId = (standard as any).specificationId || formData.specificationId;
                          
                          setFormData({ 
                            ...formData, 
                            measurementStandardId: stdId,
                            name: formData.name || autoName,
                            productId: standard.productId || formData.productId,
                            workstationId: standard.workstationId || formData.workstationId,
                            machineId: standard.machineId || formData.machineId,
                            productionLineId: lineId,
                            mappingId: matchingMapping?.id || formData.mappingId,
                            samplingConfigId: samplingId,
                            specificationId: specId,
                            enabledSpcRules: appliedSpcRules.length > 0 ? appliedSpcRules : formData.enabledSpcRules,
                            enabledCpkRules: appliedCpkRules.length > 0 ? appliedCpkRules : formData.enabledCpkRules,
                            enabledCaRules: appliedCaRules.length > 0 ? appliedCaRules : formData.enabledCaRules,
                          });
                          
                          // Hiển thị thông báo chi tiết
                          const loadedItems = [];
                          if (appliedSpcRules.length > 0) loadedItems.push(`${appliedSpcRules.length} SPC Rules`);
                          if (appliedCpkRules.length > 0) loadedItems.push(`${appliedCpkRules.length} CPK Rules`);
                          if (appliedCaRules.length > 0) loadedItems.push(`${appliedCaRules.length} CA Rules`);
                          if (samplingId) loadedItems.push('Phương pháp lấy mẫu');
                          if (specId) loadedItems.push('Tiêu chuẩn USL/LSL');
                          
                          toast.success(`Đã áp dụng tiêu chuẩn: ${standard.measurementName}${loadedItems.length > 0 ? ` (Đã tải: ${loadedItems.join(', ')})` : ''}`);
                        } else {
                          setFormData({ ...formData, measurementStandardId: stdId });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tiêu chuẩn đo lường" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">-- Không chọn --</SelectItem>
                        {measurementStandards.map((std: any) => {
                          const product = products?.find((p: any) => p.id === std.productId);
                          const ws = workstations.find((w: any) => w.id === std.workstationId);
                          return (
                            <SelectItem key={std.id} value={std.id.toString()}>
                              {std.measurementName} - {product?.name || 'N/A'} / {ws?.name || 'N/A'}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Chọn tiêu chuẩn đo để tự động áp dụng: Sản phẩm, Công trạm, Máy, Phương pháp lấy mẫu, Tiêu chuẩn USL/LSL, SPC/CPK/CA Rules
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cấu hình Mapping (nguồn dữ liệu)</Label>
                  <Select 
                    value={formData.mappingId.toString()} 
                    onValueChange={(v) => setFormData({ ...formData, mappingId: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn mapping dữ liệu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">-- Không chọn --</SelectItem>
                      {mappings?.map((m: any) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.productCode} - {m.stationName} ({m.tableName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Chọn mapping để lấy dữ liệu từ database ngoài</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Máy (tuỳ chọn)</Label>
                    <Select 
                      value={formData.machineId.toString()} 
                      onValueChange={(v) => {
                        const machineId = parseInt(v);
                        setFormData({ ...formData, machineId, fixtureId: 0 });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn máy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">-- Tất cả máy --</SelectItem>
                        {machines?.map((m: any) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.name} ({m.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fixture (tuỳ chọn)</Label>
                    <Select 
                      value={formData.fixtureId.toString()} 
                      onValueChange={(v) => setFormData({ ...formData, fixtureId: parseInt(v) })}
                      disabled={!formData.machineId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn fixture" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">-- Tất cả fixture --</SelectItem>
                        {filteredFixtures.map((f: any) => (
                          <SelectItem key={f.id} value={f.id.toString()}>
                            {f.name} ({f.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Chọn máy trước để lọc fixture</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả chi tiết về kế hoạch..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Thời gian bắt đầu</Label>
                    <Input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Để trống nếu bắt đầu ngay</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Thời gian kết thúc</Label>
                    <Input
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Để trống nếu chạy liên tục</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Lặp lại tự động</Label>
                    <p className="text-xs text-muted-foreground">Chạy kế hoạch theo chu kỳ</p>
                  </div>
                  <Switch
                    checked={formData.isRecurring}
                    onCheckedChange={(v) => setFormData({ ...formData, isRecurring: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Thông báo khi vi phạm</Label>
                    <p className="text-xs text-muted-foreground">Gửi email khi phát hiện lỗi SPC</p>
                  </div>
                  <Switch
                    checked={formData.notifyOnViolation}
                    onCheckedChange={(v) => setFormData({ ...formData, notifyOnViolation: v })}
                  />
                </div>
                {formData.notifyOnViolation && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Danh sách Email nhận thông báo
                    </Label>
                    <Textarea
                      value={formData.notifyEmail}
                      onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.value })}
                      placeholder="email1@example.com, email2@example.com, email3@example.com"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      Nhập nhiều email cách nhau bằng dấu phẩy (,). Tất cả sẽ nhận thông báo khi có vi phạm.
                    </p>
                    {formData.notifyEmail && (
                      <div className="flex flex-wrap gap-1">
                        {formData.notifyEmail.split(',').map((email, idx) => {
                          const trimmed = email.trim();
                          if (!trimmed) return null;
                          const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
                          return (
                            <Badge key={idx} variant={isValid ? "secondary" : "destructive"} className="text-xs">
                              {trimmed}
                              {!isValid && <span className="ml-1">(không hợp lệ)</span>}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Rules Configuration */}
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <Label className="text-base font-medium">Cấu hình Rules</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Chọn các rules sẽ được áp dụng cho kế hoạch này. Bỏ chọn để tắt rule.
                  </p>
                  <Tabs defaultValue="spc" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="spc" className="flex items-center gap-1">
                        <Zap className="h-3 w-3" /> SPC ({formData.enabledSpcRules.length}/{spcRules.length})
                      </TabsTrigger>
                      <TabsTrigger value="ca" className="flex items-center gap-1">
                        <Target className="h-3 w-3" /> CA ({formData.enabledCaRules.length}/{caRules.length})
                      </TabsTrigger>
                      <TabsTrigger value="cpk" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> CPK ({formData.enabledCpkRules.length}/{cpkRules.length})
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="spc" className="space-y-2 mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">SPC Rules (Western Electric)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const allIds = spcRules.filter((r: any) => r.isEnabled === 1).map((r: any) => r.id);
                            setFormData({ ...formData, enabledSpcRules: formData.enabledSpcRules.length === allIds.length ? [] : allIds });
                          }}
                        >
                          {formData.enabledSpcRules.length === spcRules.filter((r: any) => r.isEnabled === 1).length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                        {spcRules.filter((r: any) => r.isEnabled === 1).map((rule: any) => (
                          <div key={rule.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                            <Checkbox
                              id={`spc-${rule.id}`}
                              checked={formData.enabledSpcRules.includes(rule.id)}
                              onCheckedChange={(checked) => {
                                setFormData({
                                  ...formData,
                                  enabledSpcRules: checked
                                    ? [...formData.enabledSpcRules, rule.id]
                                    : formData.enabledSpcRules.filter(id => id !== rule.id)
                                });
                              }}
                            />
                            <div className="flex-1">
                              <label htmlFor={`spc-${rule.id}`} className="text-sm font-medium cursor-pointer">
                                {rule.code}: {rule.name}
                              </label>
                              <p className="text-xs text-muted-foreground">{rule.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="ca" className="space-y-2 mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">CA Rules (Độ chính xác)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const allIds = caRules.filter((r: any) => r.isEnabled === 1).map((r: any) => r.id);
                            setFormData({ ...formData, enabledCaRules: formData.enabledCaRules.length === allIds.length ? [] : allIds });
                          }}
                        >
                          {formData.enabledCaRules.length === caRules.filter((r: any) => r.isEnabled === 1).length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                        {caRules.filter((r: any) => r.isEnabled === 1).map((rule: any) => (
                          <div key={rule.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                            <Checkbox
                              id={`ca-${rule.id}`}
                              checked={formData.enabledCaRules.includes(rule.id)}
                              onCheckedChange={(checked) => {
                                setFormData({
                                  ...formData,
                                  enabledCaRules: checked
                                    ? [...formData.enabledCaRules, rule.id]
                                    : formData.enabledCaRules.filter(id => id !== rule.id)
                                });
                              }}
                            />
                            <div className="flex-1">
                              <label htmlFor={`ca-${rule.id}`} className="text-sm font-medium cursor-pointer">
                                {rule.code}: {rule.name}
                              </label>
                              <p className="text-xs text-muted-foreground">{rule.formula}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="cpk" className="space-y-2 mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">CPK Rules (Năng lực quy trình)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const allIds = cpkRules.filter((r: any) => r.isEnabled === 1).map((r: any) => r.id);
                            setFormData({ ...formData, enabledCpkRules: formData.enabledCpkRules.length === allIds.length ? [] : allIds });
                          }}
                        >
                          {formData.enabledCpkRules.length === cpkRules.filter((r: any) => r.isEnabled === 1).length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                        {cpkRules.filter((r: any) => r.isEnabled === 1).map((rule: any) => (
                          <div key={rule.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                            <Checkbox
                              id={`cpk-${rule.id}`}
                              checked={formData.enabledCpkRules.includes(rule.id)}
                              onCheckedChange={(checked) => {
                                setFormData({
                                  ...formData,
                                  enabledCpkRules: checked
                                    ? [...formData.enabledCpkRules, rule.id]
                                    : formData.enabledCpkRules.filter(id => id !== rule.id)
                                });
                              }}
                            />
                            <div className="flex-1">
                              <label htmlFor={`cpk-${rule.id}`} className="text-sm font-medium cursor-pointer">
                                {rule.code}: {rule.name}
                              </label>
                              <p className="text-xs text-muted-foreground">{rule.action}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* CPK Alert Configuration */}
                <div className="border rounded-lg p-4 space-y-4 border-orange-200 bg-orange-50/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <Label className="text-base font-medium">Cấu hình CPK Alert</Label>
                    </div>
                    <Switch
                      checked={formData.cpkAlertEnabled}
                      onCheckedChange={(v) => setFormData({ ...formData, cpkAlertEnabled: v })}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Kích hoạt cảnh báo khi chỉ số CPK vượt ngưỡng cho phép
                  </p>
                  {formData.cpkAlertEnabled && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-sm">Ngưỡng CPK tối thiểu</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.cpkLowerLimit}
                          onChange={(e) => setFormData({ ...formData, cpkLowerLimit: e.target.value })}
                          placeholder="1.33"
                        />
                        <p className="text-xs text-muted-foreground">Cảnh báo khi CPK &lt; giá trị này (mặc định: 1.33)</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Ngưỡng CPK tối đa (tùy chọn)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.cpkUpperLimit}
                          onChange={(e) => setFormData({ ...formData, cpkUpperLimit: e.target.value })}
                          placeholder="Không giới hạn"
                        />
                        <p className="text-xs text-muted-foreground">Cảnh báo khi CPK &gt; giá trị này (để trống = không giới hạn)</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Camera Preview Section */}
                <div className="border rounded-lg p-4 space-y-4 border-blue-200 bg-blue-50/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-blue-600" />
                      <Label className="text-base font-medium">Preview Camera</Label>
                    </div>
                    <Button
                      type="button"
                      variant={showCameraPreview ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setShowCameraPreview(!showCameraPreview)}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      {showCameraPreview ? "Tắt Camera" : "Bật Camera"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Xem trước stream camera để kiểm tra vị trí và góc chụp trước khi tạo kế hoạch
                  </p>
                  {showCameraPreview && (
                    <div className="space-y-4">
                      <CameraStream
                        showControls={true}
                        showDeviceSelector={true}
                        onCapture={(imageData) => {
                          setCapturedImage(imageData);
                          toast.success("Đã chụp ảnh test thành công!");
                        }}
                        className="max-h-[300px]"
                      />
                      {capturedImage && (
                        <div className="space-y-2">
                          <Label className="text-sm">Ảnh đã chụp:</Label>
                          <div className="relative rounded-lg overflow-hidden border">
                            <img 
                              src={capturedImage} 
                              alt="Captured preview" 
                              className="w-full max-h-[200px] object-contain bg-black"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => setCapturedImage(null)}
                            >
                              Xóa
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Tạo kế hoạch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Danh sách kế hoạch SPC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm kế hoạch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Tên kế hoạch</th>
                      <th className="px-4 py-3 text-left font-semibold">Dây chuyền</th>
                      <th className="px-4 py-3 text-left font-semibold">Sản phẩm</th>
                      <th className="px-4 py-3 text-left font-semibold">Phương pháp</th>
                      <th className="px-4 py-3 text-left font-semibold">Thời gian</th>
                      <th className="px-4 py-3 text-center font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 text-center font-semibold">Thông báo</th>
                      <th className="px-4 py-3 text-left font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans?.map((plan: SpcPlan) => (
                      <tr key={plan.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{plan.name}</div>
                            {plan.description && (
                              <div className="text-xs text-muted-foreground">{plan.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1">
                            <Factory className="h-3 w-3" />
                            {getLineName(plan.productionLineId)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{getProductName(plan.productId)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getSamplingName(plan.samplingConfigId)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Bắt đầu:</span>
                              {plan.startTime ? new Date(plan.startTime).toLocaleString('vi-VN') : 'Ngay'}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Kết thúc:</span>
                              {plan.endTime ? new Date(plan.endTime).toLocaleString('vi-VN') : <span className="text-green-600">Liên tục</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={statusColors[plan.status]}>
                            {statusLabels[plan.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {plan.notifyOnViolation === 1 ? (
                            <Mail className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {plan.status === "active" ? (
                              <Button variant="ghost" size="sm" onClick={() => handleStatusChange(plan.id, "paused")}>
                                <Pause className="h-4 w-4 text-yellow-600" />
                              </Button>
                            ) : plan.status !== "completed" && (
                              <Button variant="ghost" size="sm" onClick={() => handleStatusChange(plan.id, "active")}>
                                <Play className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Dialog open={editingPlan?.id === plan.id} onOpenChange={(open) => !open && setEditingPlan(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(plan)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Chỉnh sửa kế hoạch</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                                  <div className="space-y-2">
                                    <Label>Tên kế hoạch</Label>
                                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Dây chuyền</Label>
                                      <Select value={formData.productionLineId.toString()} onValueChange={(v) => setFormData({ ...formData, productionLineId: parseInt(v) })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {productionLines?.map((line: any) => (
                                            <SelectItem key={line.id} value={line.id.toString()}>{line.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Phương pháp lấy mẫu</Label>
                                      <Select value={formData.samplingConfigId.toString()} onValueChange={(v) => setFormData({ ...formData, samplingConfigId: parseInt(v) })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {samplingConfigs?.map((config: any) => (
                                            <SelectItem key={config.id} value={config.id.toString()}>{config.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Mô tả</Label>
                                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Thời gian bắt đầu</Label>
                                      <Input
                                        type="datetime-local"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Thời gian kết thúc</Label>
                                      <Input
                                        type="datetime-local"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                      />
                                      <p className="text-xs text-muted-foreground">Để trống nếu chạy liên tục</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                                    <Label>Thông báo khi vi phạm</Label>
                                    <Switch checked={formData.notifyOnViolation} onCheckedChange={(v) => setFormData({ ...formData, notifyOnViolation: v })} />
                                  </div>
                                  {formData.notifyOnViolation && (
                                    <div className="space-y-2">
                                      <Label>Email nhận thông báo</Label>
                                      <Input type="email" value={formData.notifyEmail} onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.value })} />
                                    </div>
                                  )}
                                  {/* CPK Alert Configuration */}
                                  <div className="border rounded-lg p-4 space-y-4 border-orange-200 bg-orange-50/30">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                                        <Label className="text-base font-medium">Cấu hình CPK Alert</Label>
                                      </div>
                                      <Switch
                                        checked={formData.cpkAlertEnabled}
                                        onCheckedChange={(v) => setFormData({ ...formData, cpkAlertEnabled: v })}
                                      />
                                    </div>
                                    {formData.cpkAlertEnabled && (
                                      <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                          <Label className="text-sm">Ngưỡng CPK tối thiểu</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.cpkLowerLimit}
                                            onChange={(e) => setFormData({ ...formData, cpkLowerLimit: e.target.value })}
                                            placeholder="1.33"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-sm">Ngưỡng CPK tối đa</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.cpkUpperLimit}
                                            onChange={(e) => setFormData({ ...formData, cpkUpperLimit: e.target.value })}
                                            placeholder="Không giới hạn"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingPlan(null)}>Hủy</Button>
                                  <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                                    {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Lưu
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(plan.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPlans?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có kế hoạch SPC nào</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp 
        open={showShortcutsHelp} 
        onOpenChange={setShowShortcutsHelp}
        additionalShortcuts={[
          { keys: "Ctrl + S", description: "Lưu kế hoạch" },
          { keys: "Ctrl + N", description: "Tạo kế hoạch mới" },
        ]}
      />
    </DashboardLayout>
  );
}
