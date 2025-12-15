import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Loader2, Plus, Pencil, Trash2, Search, Filter, Settings2, 
  Target, Ruler, Clock, AlertTriangle, CheckCircle2, BarChart3
} from "lucide-react";

interface MeasurementStandard {
  id: number;
  productId: number;
  workstationId: number;
  machineId: number | null;
  measurementName: string;
  usl: number | null;
  lsl: number | null;
  target: number | null;
  unit: string | null;
  sampleSize: number;
  sampleFrequency: number;
  samplingMethod: string | null;
  appliedSpcRules: string | null;
  cpkWarningThreshold: number | null;
  cpkCriticalThreshold: number | null;
  notes: string | null;
  isActive: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Product {
  id: number;
  name: string;
  code: string;
}

interface Workstation {
  id: number;
  name: string;
  code: string;
}

interface Machine {
  id: number;
  name: string;
  code: string;
}

interface SpcRule {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string;
}

const SAMPLING_METHODS = [
  { value: "random", label: "Lấy mẫu ngẫu nhiên" },
  { value: "systematic", label: "Lấy mẫu hệ thống" },
  { value: "stratified", label: "Lấy mẫu phân tầng" },
  { value: "cluster", label: "Lấy mẫu cụm" },
  { value: "consecutive", label: "Lấy mẫu liên tiếp" },
];

export default function MeasurementStandards() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState<MeasurementStandard | null>(null);
  const [filterProductId, setFilterProductId] = useState<string>("all");
  const [filterWorkstationId, setFilterWorkstationId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    measurementName: "",
    productId: "",
    workstationId: "",
    machineId: "",
    usl: "",
    lsl: "",
    target: "",
    unit: "",
    sampleSize: "5",
    sampleFrequency: "60",
    samplingMethod: "random",
    cpkWarningThreshold: "133",
    cpkCriticalThreshold: "100",
    notes: "",
  });
  const [selectedCpkRules, setSelectedCpkRules] = useState<string[]>([]);
  const [selectedCaRules, setSelectedCaRules] = useState<string[]>([]);

  // Queries
  const { data: standards, isLoading, refetch } = trpc.measurementStandard.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();
  const { data: workstations } = trpc.workstation.listAll.useQuery();
  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: spcRules } = trpc.rules.getSpcRules.useQuery();
  const { data: cpkRules } = trpc.rules.getCpkRules.useQuery();
  const { data: caRules } = trpc.rules.getCaRules.useQuery();

  // Mutations
  const createMutation = trpc.measurementStandard.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo tiêu chuẩn đo mới");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateMutation = trpc.measurementStandard.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật tiêu chuẩn đo");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  const deleteMutation = trpc.measurementStandard.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa tiêu chuẩn đo");
      refetch();
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  const resetForm = () => {
    setFormData({
      measurementName: "",
      productId: "",
      workstationId: "",
      machineId: "",
      usl: "",
      lsl: "",
      target: "",
      unit: "",
      sampleSize: "5",
      sampleFrequency: "60",
      samplingMethod: "random",
      cpkWarningThreshold: "133",
      cpkCriticalThreshold: "100",
      notes: "",
    });
    setSelectedRules([]);
    setSelectedCpkRules([]);
    setSelectedCaRules([]);
    setEditingStandard(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (standard: MeasurementStandard) => {
    setEditingStandard(standard);
    setFormData({
      measurementName: standard.measurementName || "",
      productId: standard.productId.toString(),
      workstationId: standard.workstationId.toString(),
      machineId: standard.machineId?.toString() || "",
      usl: standard.usl ? (standard.usl / 10000).toString() : "",
      lsl: standard.lsl ? (standard.lsl / 10000).toString() : "",
      target: standard.target ? (standard.target / 10000).toString() : "",
      unit: (standard as any).unit || "",
      sampleSize: standard.sampleSize.toString(),
      sampleFrequency: standard.sampleFrequency.toString(),
      samplingMethod: standard.samplingMethod || "random",
      cpkWarningThreshold: standard.cpkWarningThreshold?.toString() || "133",
      cpkCriticalThreshold: standard.cpkCriticalThreshold?.toString() || "100",
      notes: standard.notes || "",
    });
    // Parse applied rules
    if (standard.appliedSpcRules) {
      try {
        const rules = JSON.parse(standard.appliedSpcRules);
        setSelectedRules(Array.isArray(rules) ? rules : []);
      } catch {
        setSelectedRules([]);
      }
    } else {
      setSelectedRules([]);
    }
    // Parse CPK rules
    const stdAny = standard as any;
    if (stdAny.appliedCpkRules) {
      try {
        const rules = JSON.parse(stdAny.appliedCpkRules);
        setSelectedCpkRules(Array.isArray(rules) ? rules : []);
      } catch {
        setSelectedCpkRules([]);
      }
    } else {
      setSelectedCpkRules([]);
    }
    // Parse CA rules
    if (stdAny.appliedCaRules) {
      try {
        const rules = JSON.parse(stdAny.appliedCaRules);
        setSelectedCaRules(Array.isArray(rules) ? rules : []);
      } catch {
        setSelectedCaRules([]);
      }
    } else {
      setSelectedCaRules([]);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.measurementName || !formData.productId || !formData.workstationId || !formData.usl || !formData.lsl) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    const usl = parseFloat(formData.usl);
    const lsl = parseFloat(formData.lsl);
    
    if (usl <= lsl) {
      toast.error("USL phải lớn hơn LSL");
      return;
    }

    const data = {
      measurementName: formData.measurementName,
      productId: parseInt(formData.productId),
      workstationId: parseInt(formData.workstationId),
      machineId: formData.machineId ? parseInt(formData.machineId) : undefined,
      usl,
      lsl,
      target: formData.target ? parseFloat(formData.target) : undefined,
      unit: formData.unit || undefined,
      sampleSize: parseInt(formData.sampleSize) || 5,
      sampleFrequency: parseInt(formData.sampleFrequency) || 60,
      samplingMethod: formData.samplingMethod,
      appliedSpcRules: selectedRules.length > 0 ? JSON.stringify(selectedRules) : undefined,
      appliedCpkRules: selectedCpkRules.length > 0 ? JSON.stringify(selectedCpkRules) : undefined,
      appliedCaRules: selectedCaRules.length > 0 ? JSON.stringify(selectedCaRules) : undefined,
      cpkWarningThreshold: parseInt(formData.cpkWarningThreshold) || 133,
      cpkCriticalThreshold: parseInt(formData.cpkCriticalThreshold) || 100,
      notes: formData.notes || undefined,
    };

    if (editingStandard) {
      updateMutation.mutate({ id: editingStandard.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa tiêu chuẩn đo này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const toggleRule = (ruleCode: string) => {
    setSelectedRules(prev => 
      prev.includes(ruleCode) 
        ? prev.filter(r => r !== ruleCode)
        : [...prev, ruleCode]
    );
  };

  // Helpers
  const getProductName = (id: number) => products?.find((p: Product) => p.id === id)?.name || "N/A";
  const getWorkstationName = (id: number) => workstations?.find((w: Workstation) => w.id === id)?.name || "N/A";
  const getMachineName = (id: number | null) => {
    if (!id) return "Tất cả máy";
    return machines?.find((m: Machine) => m.id === id)?.name || "N/A";
  };
  const getSamplingMethodLabel = (value: string) => 
    SAMPLING_METHODS.find(m => m.value === value)?.label || value;

  // Filter standards
  const filteredStandards = useMemo(() => {
    if (!standards) return [];
    return standards.filter((s: MeasurementStandard) => {
      const matchProduct = filterProductId === "all" || s.productId.toString() === filterProductId;
      const matchWorkstation = filterWorkstationId === "all" || s.workstationId.toString() === filterWorkstationId;
      const matchSearch = !searchTerm || 
        getProductName(s.productId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getWorkstationName(s.workstationId).toLowerCase().includes(searchTerm.toLowerCase());
      return matchProduct && matchWorkstation && matchSearch;
    });
  }, [standards, filterProductId, filterWorkstationId, searchTerm, products, workstations]);

  // Stats
  const stats = useMemo(() => {
    if (!standards) return { total: 0, withTarget: 0, withRules: 0 };
    return {
      total: standards.length,
      withTarget: standards.filter((s: MeasurementStandard) => s.target !== null).length,
      withRules: standards.filter((s: MeasurementStandard) => s.appliedSpcRules && JSON.parse(s.appliedSpcRules).length > 0).length,
    };
  }, [standards]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tiêu chuẩn Đo lường</h1>
            <p className="text-muted-foreground mt-1">
              Quản lý USL/LSL, Target và cấu hình SPC Rules cho từng Sản phẩm - Công trạm - Máy
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm tiêu chuẩn
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng tiêu chuẩn</CardTitle>
              <Ruler className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Cấu hình đo lường</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Có Target</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withTarget}</div>
              <p className="text-xs text-muted-foreground">Đã định nghĩa giá trị mục tiêu</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Có SPC Rules</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withRules}</div>
              <p className="text-xs text-muted-foreground">Đã cấu hình rules kiểm tra</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm theo sản phẩm, công trạm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={filterProductId} onValueChange={setFilterProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                    {products?.map((p: Product) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-48">
                <Select value={filterWorkstationId} onValueChange={setFilterWorkstationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Công trạm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả công trạm</SelectItem>
                    {workstations?.map((w: Workstation) => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Standards Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Danh sách Tiêu chuẩn ({filteredStandards.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Công trạm</TableHead>
                  <TableHead>Máy</TableHead>
                  <TableHead className="text-center">USL</TableHead>
                  <TableHead className="text-center">LSL</TableHead>
                  <TableHead className="text-center">Target</TableHead>
                  <TableHead className="text-center">Mẫu</TableHead>
                  <TableHead>Phương pháp</TableHead>
                  <TableHead>SPC Rules</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStandards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Chưa có tiêu chuẩn đo nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStandards.map((s: MeasurementStandard) => {
                    const appliedRules = s.appliedSpcRules ? JSON.parse(s.appliedSpcRules) : [];
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{getProductName(s.productId)}</TableCell>
                        <TableCell>{getWorkstationName(s.workstationId)}</TableCell>
                        <TableCell>
                          <Badge variant={s.machineId ? "default" : "secondary"}>
                            {getMachineName(s.machineId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono text-red-600">{s.usl}</TableCell>
                        <TableCell className="text-center font-mono text-blue-600">{s.lsl}</TableCell>
                        <TableCell className="text-center font-mono text-green-600">
                          {s.target ?? "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{s.sampleSize} / {s.sampleFrequency}h</Badge>
                        </TableCell>
                        <TableCell>{getSamplingMethodLabel(s.samplingMethod || "random")}</TableCell>
                        <TableCell>
                          {appliedRules.length > 0 ? (
                            <Badge variant="default" className="bg-green-600">
                              {appliedRules.length} rules
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Không có</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(s)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStandard ? "Chỉnh sửa Tiêu chuẩn đo" : "Thêm Tiêu chuẩn đo mới"}
              </DialogTitle>
              <DialogDescription>
                Cấu hình giới hạn đo lường và SPC Rules cho tổ hợp Sản phẩm - Công trạm - Máy
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                <TabsTrigger value="sampling">Lấy mẫu</TabsTrigger>
                <TabsTrigger value="rules">SPC Rules</TabsTrigger>
                <TabsTrigger value="cpk">CPK/CA</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Tên tiêu chuẩn đo *</Label>
                  <Input
                    placeholder="VD: Đo chiều dài sản phẩm A tại trạm 1"
                    value={formData.measurementName}
                    onChange={(e) => setFormData({ ...formData, measurementName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sản phẩm *</Label>
                    <Select
                      value={formData.productId}
                      onValueChange={(value) => setFormData({ ...formData, productId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn sản phẩm" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((p: Product) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.code} - {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Công trạm *</Label>
                    <Select
                      value={formData.workstationId}
                      onValueChange={(value) => setFormData({ ...formData, workstationId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn công trạm" />
                      </SelectTrigger>
                      <SelectContent>
                        {workstations?.map((w: Workstation) => (
                          <SelectItem key={w.id} value={w.id.toString()}>
                            {w.code} - {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Máy (tùy chọn)</Label>
                  <Select
                    value={formData.machineId || "all"}
                    onValueChange={(value) => setFormData({ ...formData, machineId: value === "all" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả máy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả máy</SelectItem>
                      {machines?.map((m: Machine) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.code} - {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Để trống nếu tiêu chuẩn áp dụng cho tất cả máy trong công trạm
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      USL (Giới hạn trên) *
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="VD: 10.5"
                      value={formData.usl}
                      onChange={(e) => setFormData({ ...formData, usl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-blue-500" />
                      LSL (Giới hạn dưới) *
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="VD: 9.5"
                      value={formData.lsl}
                      onChange={(e) => setFormData({ ...formData, lsl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      Target (Mục tiêu)
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="VD: 10.0"
                      value={formData.target}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Đơn vị</Label>
                    <Input
                      placeholder="VD: mm, kg, °C"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sampling" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Kích thước mẫu
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.sampleSize}
                      onChange={(e) => setFormData({ ...formData, sampleSize: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Số lượng mẫu trong mỗi lần lấy</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Tần suất (giờ)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      value={formData.sampleFrequency}
                      onChange={(e) => setFormData({ ...formData, sampleFrequency: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Lấy mẫu mỗi X giờ</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phương pháp lấy mẫu</Label>
                  <Select
                    value={formData.samplingMethod}
                    onValueChange={(value) => setFormData({ ...formData, samplingMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SAMPLING_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>SPC Rules áp dụng</Label>
                  <p className="text-sm text-muted-foreground">
                    Chọn các rules sẽ được kiểm tra khi phân tích SPC
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
                  {spcRules?.map((rule: SpcRule) => (
                    <div
                      key={rule.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedRules.includes(rule.code) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                      }`}
                      onClick={() => toggleRule(rule.code)}
                    >
                      <Checkbox
                        checked={selectedRules.includes(rule.code)}
                        onCheckedChange={() => toggleRule(rule.code)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rule.code}</span>
                          <Badge variant="outline" className="text-xs">{rule.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.name}</p>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                        )}
                      </div>
                      {selectedRules.includes(rule.code) && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                  {(!spcRules || spcRules.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      Chưa có SPC Rules nào. Vui lòng tạo rules trong trang Quản lý Rules.
                    </p>
                  )}
                </div>

                {selectedRules.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{selectedRules.length} rules đã chọn</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRules([])}>
                      Bỏ chọn tất cả
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="cpk" className="space-y-4 mt-4">
                {/* CPK Thresholds */}
                <div className="space-y-2">
                  <Label className="text-base font-medium">Ngưỡng cảnh báo CPK</Label>
                  <p className="text-sm text-muted-foreground">Cấu hình ngưỡng CPK để cảnh báo khi chất lượng giảm</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Ngưỡng cảnh báo (x100)
                    </Label>
                    <Input
                      type="number"
                      placeholder="133 = 1.33"
                      value={formData.cpkWarningThreshold}
                      onChange={(e) => setFormData({ ...formData, cpkWarningThreshold: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Nhập 133 cho CPK = 1.33</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Ngưỡng nguy hiểm (x100)
                    </Label>
                    <Input
                      type="number"
                      placeholder="100 = 1.00"
                      value={formData.cpkCriticalThreshold}
                      onChange={(e) => setFormData({ ...formData, cpkCriticalThreshold: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Nhập 100 cho CPK = 1.00</p>
                  </div>
                </div>

                {/* CPK Rules */}
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-base font-medium">CPK Rules</Label>
                  <p className="text-sm text-muted-foreground">Chọn các rules CPK sẽ được kiểm tra</p>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto border rounded-lg p-4">
                  {cpkRules?.map((rule: any) => (
                    <div
                      key={rule.id}
                      className={`flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedCpkRules.includes(rule.code) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedCpkRules(prev => 
                        prev.includes(rule.code) ? prev.filter(r => r !== rule.code) : [...prev, rule.code]
                      )}
                    >
                      <Checkbox checked={selectedCpkRules.includes(rule.code)} />
                      <div className="flex-1">
                        <span className="font-medium">{rule.code}: {rule.name}</span>
                        {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                      </div>
                    </div>
                  ))}
                  {(!cpkRules || cpkRules.length === 0) && (
                    <p className="text-center text-muted-foreground py-2">Chưa có CPK Rules</p>
                  )}
                </div>

                {/* CA Rules */}
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-base font-medium">CA Rules (Process Capability)</Label>
                  <p className="text-sm text-muted-foreground">Chọn các rules CA sẽ được kiểm tra</p>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto border rounded-lg p-4">
                  {caRules?.map((rule: any) => (
                    <div
                      key={rule.id}
                      className={`flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedCaRules.includes(rule.code) ? "bg-primary/10 border-primary" : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedCaRules(prev => 
                        prev.includes(rule.code) ? prev.filter(r => r !== rule.code) : [...prev, rule.code]
                      )}
                    >
                      <Checkbox checked={selectedCaRules.includes(rule.code)} />
                      <div className="flex-1">
                        <span className="font-medium">{rule.code}: {rule.name}</span>
                        {rule.description && <p className="text-xs text-muted-foreground">{rule.description}</p>}
                      </div>
                    </div>
                  ))}
                  {(!caRules || caRules.length === 0) && (
                    <p className="text-center text-muted-foreground py-2">Chưa có CA Rules</p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2 pt-4 border-t">
                  <Label>Ghi chú</Label>
                  <Input
                    placeholder="Ghi chú thêm về tiêu chuẩn đo..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingStandard ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
