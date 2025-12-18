import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Target, 
  Plus,
  Loader2,
  Search,
  CheckCircle,
  AlertTriangle,
  Factory,
  Package,
  Cog,
  Cpu,
  Zap,
  ArrowRight,
  Info,
  Sparkles,
  Clock,
  Mail,
  Save,
  FileText,
  Trash2,
  Copy
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useLocation } from "wouter";

interface MeasurementStandard {
  id: number;
  productId: number | null;
  workstationId: number | null;
  machineId: number | null;
  measurementName: string;
  usl: number | null;
  lsl: number | null;
  target: number | null;
  unit: string | null;
  sampleSize: number | null;
  sampleFrequency: number | null;
  samplingMethod: string | null;
  appliedSpcRules: string | null;
  appliedCpkRules: string | null;
  appliedCaRules: string | null;
  cpkWarningThreshold: number | null;
  cpkCriticalThreshold: number | null;
  notes: string | null;
  isActive: number;
}

export default function QuickSpcPlan() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStandardId, setSelectedStandardId] = useState<number | null>(null);
  const [selectedStandardIds, setSelectedStandardIds] = useState<number[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [createMode, setCreateMode] = useState<"auto" | "manual">("auto"); // Thêm chế độ tạo
  
  // Form state for additional options
  const [formData, setFormData] = useState({
    name: "",
    productionLineId: 0,
    isRecurring: true,
    notifyOnViolation: true,
    notifyEmail: "",
  });
  
  // Manual form state for manual mode
  const [manualFormData, setManualFormData] = useState({
    name: "",
    productionLineId: 0,
    productId: 0,
    workstationId: 0,
    machineId: 0,
    samplingConfigId: 0,
    measurementName: "",
    usl: "",
    lsl: "",
    target: "",
    unit: "",
    sampleSize: 5,
    sampleFrequency: 60,
    isRecurring: true,
    notifyOnViolation: true,
    notifyEmail: "",
    enabledSpcRules: [] as number[],
    enabledCpkRules: [] as number[],
  });

  // Fetch data
  const { data: standards = [], isLoading: loadingStandards } = trpc.measurementStandard.list.useQuery();
  const { data: products = [] } = trpc.product.list.useQuery();
  const { data: workstations = [] } = trpc.workstation.listAll.useQuery();
  const { data: machines = [] } = trpc.machine.listAll.useQuery();
  const { data: productionLines = [] } = trpc.productionLine.list.useQuery();
  const { data: samplingConfigs = [] } = trpc.sampling.list.useQuery();
  const { data: spcRules = [] } = trpc.rules.getSpcRules.useQuery();
  const { data: cpkRules = [] } = trpc.rules.getCpkRules.useQuery();
  const { data: caRules = [] } = trpc.rules.getCaRules.useQuery();
  const { data: templates = [], refetch: refetchTemplates } = trpc.spcPlan.listTemplates.useQuery();
  
  // Template states
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showLoadTemplateDialog, setShowLoadTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateIsPublic, setTemplateIsPublic] = useState(false);

  // Create mutation
  const createMutation = trpc.spcPlan.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo kế hoạch SPC thành công!");
      navigate("/spc-plans");
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });
  
  // Template mutations
  const createTemplateMutation = trpc.spcPlan.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Lưu template thành công!");
      setShowSaveTemplateDialog(false);
      setTemplateName("");
      setTemplateDescription("");
      refetchTemplates();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });
  
  const deleteTemplateMutation = trpc.spcPlan.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Xóa template thành công!");
      refetchTemplates();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });
  
  // Save current manual form as template
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Vui lòng nhập tên template");
      return;
    }
    createTemplateMutation.mutate({
      name: templateName,
      description: templateDescription,
      measurementName: manualFormData.measurementName,
      usl: manualFormData.usl ? parseFloat(manualFormData.usl) : undefined,
      lsl: manualFormData.lsl ? parseFloat(manualFormData.lsl) : undefined,
      target: manualFormData.target ? parseFloat(manualFormData.target) : undefined,
      unit: manualFormData.unit,
      sampleSize: manualFormData.sampleSize,
      sampleFrequency: manualFormData.sampleFrequency,
      enabledSpcRules: JSON.stringify(manualFormData.enabledSpcRules),
      enabledCpkRules: JSON.stringify(manualFormData.enabledCpkRules),
      isRecurring: manualFormData.isRecurring,
      notifyOnViolation: manualFormData.notifyOnViolation,
      isPublic: templateIsPublic,
    });
  };
  
  // Load template into manual form
  const handleLoadTemplate = (template: any) => {
    setManualFormData(prev => ({
      ...prev,
      measurementName: template.measurementName || "",
      usl: template.usl ? String(parseFloat(template.usl) / 10000) : "",
      lsl: template.lsl ? String(parseFloat(template.lsl) / 10000) : "",
      target: template.target ? String(parseFloat(template.target) / 10000) : "",
      unit: template.unit || "",
      sampleSize: template.sampleSize || 5,
      sampleFrequency: template.sampleFrequency || 60,
      enabledSpcRules: template.enabledSpcRules ? JSON.parse(template.enabledSpcRules) : [],
      enabledCpkRules: template.enabledCpkRules ? JSON.parse(template.enabledCpkRules) : [],
      isRecurring: template.isRecurring === 1,
      notifyOnViolation: template.notifyOnViolation === 1,
    }));
    setShowLoadTemplateDialog(false);
    toast.success(`Đã tải template "${template.name}"`);
  };

  // Filter standards
  const filteredStandards = useMemo(() => {
    return standards.filter((s: MeasurementStandard) => {
      if (s.isActive !== 1) return false;
      if (!searchTerm) return true;
      const product = products.find((p: any) => p.id === s.productId);
      const ws = workstations.find((w: any) => w.id === s.workstationId);
      const searchLower = searchTerm.toLowerCase();
      return (
        s.measurementName.toLowerCase().includes(searchLower) ||
        (product?.name || "").toLowerCase().includes(searchLower) ||
        (ws?.name || "").toLowerCase().includes(searchLower)
      );
    });
  }, [standards, searchTerm, products, workstations]);

  // Get selected standard details
  const selectedStandard = useMemo(() => {
    if (!selectedStandardId) return null;
    return standards.find((s: MeasurementStandard) => s.id === selectedStandardId) || null;
  }, [selectedStandardId, standards]);

  // Helper functions
  const getProductName = (id: number | null) => {
    if (!id) return "-";
    return products.find((p: any) => p.id === id)?.name || "-";
  };

  const getWorkstationName = (id: number | null) => {
    if (!id) return "-";
    return workstations.find((w: any) => w.id === id)?.name || "-";
  };

  const getMachineName = (id: number | null) => {
    if (!id) return "-";
    return machines.find((m: any) => m.id === id)?.name || "-";
  };

  const formatValue = (value: number | null, decimals: number = 2) => {
    if (value === null) return "-";
    return (value / Math.pow(10, decimals)).toFixed(decimals);
  };

  const getRulesCount = (rulesJson: string | null) => {
    if (!rulesJson) return 0;
    try {
      const rules = JSON.parse(rulesJson);
      return Array.isArray(rules) ? rules.length : 0;
    } catch {
      return 0;
    }
  };

  const getRuleNames = (rulesJson: string | null, rulesList: any[]) => {
    if (!rulesJson) return [];
    try {
      const ruleIds = JSON.parse(rulesJson);
      if (!Array.isArray(ruleIds)) return [];
      return ruleIds.map(id => {
        const rule = rulesList.find((r: any) => r.id === id);
        return rule ? rule.code : `Rule ${id}`;
      });
    } catch {
      return [];
    }
  };

  // Toggle selection for batch mode
  const toggleStandardSelection = (id: number) => {
    setSelectedStandardIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Select all filtered standards
  const selectAllFiltered = () => {
    const filteredIds = filteredStandards.map((s: MeasurementStandard) => s.id);
    setSelectedStandardIds(filteredIds);
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedStandardIds([]);
  };

  // Handle create SPC Plan (Auto mode)
  const handleCreate = () => {
    if (!selectedStandard || !formData.productionLineId) {
      toast.error("Vui lòng chọn đầy đủ thông tin");
      return;
    }

    // Find or create a default sampling config
    const defaultSampling = samplingConfigs.find((s: any) => s.name.toLowerCase().includes("default")) || samplingConfigs[0];
    if (!defaultSampling) {
      toast.error("Chưa có phương pháp lấy mẫu. Vui lòng tạo phương pháp lấy mẫu trước.");
      return;
    }

    createMutation.mutate({
      name: formData.name || `SPC Plan - ${selectedStandard.measurementName}`,
      productionLineId: formData.productionLineId,
      productId: selectedStandard.productId || undefined,
      workstationId: selectedStandard.workstationId || undefined,
      machineId: selectedStandard.machineId || undefined,
      samplingConfigId: defaultSampling.id,
      isRecurring: formData.isRecurring,
      notifyOnViolation: formData.notifyOnViolation,
      notifyEmail: formData.notifyEmail || undefined,
      enabledSpcRules: selectedStandard.appliedSpcRules || "[]",
      enabledCpkRules: selectedStandard.appliedCpkRules || "[]",
      enabledCaRules: selectedStandard.appliedCaRules || "[]",
    });
  };
  
  // Handle create SPC Plan (Manual mode)
  const handleManualCreate = () => {
    if (!manualFormData.name || !manualFormData.productionLineId || !manualFormData.measurementName) {
      toast.error("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }
    
    if (!manualFormData.usl || !manualFormData.lsl) {
      toast.error("Vui lòng nhập giới hạn USL và LSL");
      return;
    }

    const samplingConfig = manualFormData.samplingConfigId 
      ? samplingConfigs.find((s: any) => s.id === manualFormData.samplingConfigId)
      : samplingConfigs.find((s: any) => s.name.toLowerCase().includes("default")) || samplingConfigs[0];
    
    if (!samplingConfig) {
      toast.error("Chưa có phương pháp lấy mẫu. Vui lòng tạo phương pháp lấy mẫu trước.");
      return;
    }

    createMutation.mutate({
      name: manualFormData.name,
      productionLineId: manualFormData.productionLineId,
      productId: manualFormData.productId || undefined,
      workstationId: manualFormData.workstationId || undefined,
      machineId: manualFormData.machineId || undefined,
      samplingConfigId: samplingConfig.id,
      isRecurring: manualFormData.isRecurring,
      notifyOnViolation: manualFormData.notifyOnViolation,
      notifyEmail: manualFormData.notifyEmail || undefined,
      enabledSpcRules: JSON.stringify(manualFormData.enabledSpcRules),
      enabledCpkRules: JSON.stringify(manualFormData.enabledCpkRules),
      enabledCaRules: "[]",
    });
  };

  // Handle batch create SPC Plans
  const handleBatchCreate = async () => {
    if (selectedStandardIds.length === 0 || !formData.productionLineId) {
      toast.error("Vui lòng chọn ít nhất một tiêu chuẩn đo và dây chuyền");
      return;
    }

    const defaultSampling = samplingConfigs.find((s: any) => s.name.toLowerCase().includes("default")) || samplingConfigs[0];
    if (!defaultSampling) {
      toast.error("Chưa có phương pháp lấy mẫu. Vui lòng tạo phương pháp lấy mẫu trước.");
      return;
    }

    setIsCreatingBatch(true);
    setBatchProgress({ current: 0, total: selectedStandardIds.length, success: 0, failed: 0 });

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < selectedStandardIds.length; i++) {
      const standardId = selectedStandardIds[i];
      const standard = standards.find((s: MeasurementStandard) => s.id === standardId);
      
      if (!standard) {
        failedCount++;
        setBatchProgress(prev => ({ ...prev, current: i + 1, failed: failedCount }));
        continue;
      }

      try {
        await createMutation.mutateAsync({
          name: `SPC Plan - ${standard.measurementName}`,
          productionLineId: formData.productionLineId,
          productId: standard.productId || undefined,
          workstationId: standard.workstationId || undefined,
          machineId: standard.machineId || undefined,
          samplingConfigId: defaultSampling.id,
          isRecurring: formData.isRecurring,
          notifyOnViolation: formData.notifyOnViolation,
          notifyEmail: formData.notifyEmail || undefined,
          enabledSpcRules: standard.appliedSpcRules || "[]",
          enabledCpkRules: standard.appliedCpkRules || "[]",
          enabledCaRules: standard.appliedCaRules || "[]",
        });
        successCount++;
      } catch (error) {
        failedCount++;
      }
      
      setBatchProgress({ current: i + 1, total: selectedStandardIds.length, success: successCount, failed: failedCount });
    }

    setIsCreatingBatch(false);
    
    if (successCount > 0) {
      toast.success(`Đã tạo thành công ${successCount} kế hoạch SPC`);
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} kế hoạch tạo thất bại`);
    }
    
    if (successCount > 0) {
      navigate("/spc-plans");
    }
  };

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
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Tạo nhanh SPC Plan
            </h1>
            <p className="text-muted-foreground mt-1">
              {createMode === "auto" 
                ? "Tạo kế hoạch SPC tự động từ Tiêu chuẩn đo lường" 
                : "Tạo kế hoạch SPC bằng cách nhập thông tin thủ công"}
            </p>
          </div>
        </div>
        
        {/* Mode Selection */}
        <div className="flex gap-4">
          <Card 
            className={`flex-1 cursor-pointer transition-all hover:shadow-md ${createMode === "auto" ? "ring-2 ring-primary bg-primary/5" : ""}`}
            onClick={() => { setCreateMode("auto"); setStep(1); }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${createMode === "auto" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Tải tự động từ Tiêu chuẩn</h3>
                  <p className="text-sm text-muted-foreground">Chọn tiêu chuẩn đo lường đã cấu hình sẵn</p>
                </div>
                {createMode === "auto" && <CheckCircle className="h-5 w-5 text-primary ml-auto" />}
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`flex-1 cursor-pointer transition-all hover:shadow-md ${createMode === "manual" ? "ring-2 ring-primary bg-primary/5" : ""}`}
            onClick={() => { setCreateMode("manual"); setStep(1); }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${createMode === "manual" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <Cog className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Nhập thủ công</h3>
                  <p className="text-sm text-muted-foreground">Tự nhập thông tin cho SPC Plan</p>
                </div>
                {createMode === "manual" && <CheckCircle className="h-5 w-5 text-primary ml-auto" />}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              1
            </div>
            <span className="font-medium">Chọn Tiêu chuẩn</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              2
            </div>
            <span className="font-medium">Xác nhận thông tin</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step >= 3 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              3
            </div>
            <span className="font-medium">Tạo kế hoạch</span>
          </div>
        </div>

        {/* Step 1: Select Measurement Standard (Auto Mode) */}
        {step === 1 && createMode === "auto" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Bước 1: Chọn Tiêu chuẩn Đo lường
                  </CardTitle>
                  <CardDescription>
                    {isBatchMode 
                      ? `Chọn nhiều tiêu chuẩn để tạo SPC Plan hàng loạt (đã chọn ${selectedStandardIds.length})`
                      : "Chọn một tiêu chuẩn đo lường đã được cấu hình sẵn"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="batch-mode" className="text-sm">Tạo hàng loạt</Label>
                  <Switch
                    id="batch-mode"
                    checked={isBatchMode}
                    onCheckedChange={(checked) => {
                      setIsBatchMode(checked);
                      if (!checked) {
                        setSelectedStandardIds([]);
                      } else {
                        setSelectedStandardId(null);
                      }
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and batch actions */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm theo tên, sản phẩm, công trạm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {isBatchMode && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                      Chọn tất cả ({filteredStandards.length})
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      Bỏ chọn
                    </Button>
                  </div>
                )}
              </div>

              {/* Standards List */}
              {loadingStandards ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredStandards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Không tìm thấy tiêu chuẩn đo lường nào</p>
                  <Button variant="link" onClick={() => navigate("/measurement-standards")}>
                    Tạo tiêu chuẩn mới
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
                  {filteredStandards.map((std: MeasurementStandard) => (
                    <Card
                      key={std.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isBatchMode 
                          ? selectedStandardIds.includes(std.id) ? "ring-2 ring-primary bg-primary/5" : ""
                          : selectedStandardId === std.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => isBatchMode ? toggleStandardSelection(std.id) : setSelectedStandardId(std.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            <span className="font-medium">{std.measurementName}</span>
                          </div>
                          {(isBatchMode ? selectedStandardIds.includes(std.id) : selectedStandardId === std.id) && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Package className="h-3 w-3" />
                            <span>{getProductName(std.productId)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Cog className="h-3 w-3" />
                            <span>{getWorkstationName(std.workstationId)}</span>
                          </div>
                          {std.machineId && (
                            <div className="flex items-center gap-2">
                              <Cpu className="h-3 w-3" />
                              <span>{getMachineName(std.machineId)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          {std.usl !== null && std.lsl !== null && (
                            <Badge variant="outline" className="text-xs">
                              {formatValue(std.lsl)} - {formatValue(std.usl)} {std.unit || ''}
                            </Badge>
                          )}
                          {getRulesCount(std.appliedSpcRules) > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {getRulesCount(std.appliedSpcRules)} SPC Rules

                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(isBatchMode ? 3 : 2)}
                  disabled={isBatchMode ? selectedStandardIds.length === 0 : !selectedStandardId}
                >
                  {isBatchMode ? `Tiếp tục với ${selectedStandardIds.length} tiêu chuẩn` : "Tiếp tục"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review Information (Auto Mode) */}
        {step === 2 && createMode === "auto" && selectedStandard && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Bước 2: Xác nhận thông tin
              </CardTitle>
              <CardDescription>
                Kiểm tra thông tin sẽ được áp dụng cho kế hoạch SPC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selected Standard Summary */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-primary" />
                  Tiêu chuẩn: {selectedStandard.measurementName}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Sản phẩm</Label>
                    <p className="font-medium">{getProductName(selectedStandard.productId)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Công trạm</Label>
                    <p className="font-medium">{getWorkstationName(selectedStandard.workstationId)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Máy</Label>
                    <p className="font-medium">{getMachineName(selectedStandard.machineId)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Giới hạn USL/LSL</Label>
                    <p className="font-medium">
                      {selectedStandard.usl !== null && selectedStandard.lsl !== null
                        ? `${formatValue(selectedStandard.lsl)} - ${formatValue(selectedStandard.usl)} ${selectedStandard.unit || ''}`
                        : "Chưa cấu hình"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sampling Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    Phương pháp lấy mẫu
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p>Kích thước mẫu: <span className="font-medium">{selectedStandard.sampleSize || 5}</span></p>
                    <p>Tần suất: <span className="font-medium">{selectedStandard.sampleFrequency || 60} phút</span></p>
                    <p>Phương pháp: <span className="font-medium">{selectedStandard.samplingMethod || "random"}</span></p>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4" />
                    Rules được áp dụng
                  </h4>
                  <div className="space-y-2">
                    {getRulesCount(selectedStandard.appliedSpcRules) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {getRuleNames(selectedStandard.appliedSpcRules, spcRules).map((name, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                        ))}
                      </div>
                    )}
                    {getRulesCount(selectedStandard.appliedCpkRules) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {getRuleNames(selectedStandard.appliedCpkRules, cpkRules).map((name, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                        ))}
                      </div>
                    )}
                    {getRulesCount(selectedStandard.appliedSpcRules) === 0 && getRulesCount(selectedStandard.appliedCpkRules) === 0 && (
                      <p className="text-sm text-muted-foreground">Chưa cấu hình rules</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Quay lại
                </Button>
                <Button onClick={() => setStep(3)}>
                  Tiếp tục
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Final Configuration (Auto Mode) */}
        {step === 3 && createMode === "auto" && (selectedStandard || (isBatchMode && selectedStandardIds.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Bước 3: Hoàn tất cấu hình
              </CardTitle>
              <CardDescription>
                Chọn dây chuyền và các tùy chọn cuối cùng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên kế hoạch</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={isBatchMode ? "SPC Plan hàng loạt" : `SPC Plan - ${selectedStandard?.measurementName || ''}`}
                  />
                </div>
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
                      {productionLines.map((line: any) => (
                        <SelectItem key={line.id} value={line.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4" />
                            {line.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    Email nhận thông báo
                  </Label>
                  <Input
                    type="email"
                    value={formData.notifyEmail}
                    onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              )}

              {/* Summary */}
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Tóm tắt kế hoạch SPC</h4>
                {isBatchMode ? (
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• Số lượng tiêu chuẩn: {selectedStandardIds.length}</li>
                    <li>• Dây chuyền: {productionLines.find((l: any) => l.id === formData.productionLineId)?.name || "Chưa chọn"}</li>
                    <li>• Sẽ tạo {selectedStandardIds.length} kế hoạch SPC riêng biệt</li>
                  </ul>
                ) : selectedStandard && (
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• Tiêu chuẩn: {selectedStandard.measurementName}</li>
                    <li>• Sản phẩm: {getProductName(selectedStandard.productId)}</li>
                    <li>• Công trạm: {getWorkstationName(selectedStandard.workstationId)}</li>
                    <li>• Dây chuyền: {productionLines.find((l: any) => l.id === formData.productionLineId)?.name || "Chưa chọn"}</li>
                    <li>• SPC Rules: {getRulesCount(selectedStandard.appliedSpcRules)} rules</li>
                  </ul>
                )}
              </div>

              {/* Batch progress */}
              {isCreatingBatch && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Đang tạo kế hoạch SPC...</span>
                    <span>{batchProgress.current}/{batchProgress.total}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">Thành công: {batchProgress.success}</span>
                    <span className="text-red-600">Thất bại: {batchProgress.failed}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(isBatchMode ? 1 : 2)} disabled={isCreatingBatch}>
                  Quay lại
                </Button>
                <Button
                  onClick={isBatchMode ? handleBatchCreate : handleCreate}
                  disabled={!formData.productionLineId || createMutation.isPending || isCreatingBatch}
                >
                  {(createMutation.isPending || isCreatingBatch) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isBatchMode ? `Tạo ${selectedStandardIds.length} kế hoạch SPC` : "Tạo kế hoạch SPC"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Manual Mode Form */}
        {createMode === "manual" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5" />
                Nhập thông tin SPC Plan thủ công
              </CardTitle>
              <CardDescription>
                Điền đầy đủ thông tin để tạo kế hoạch SPC mới
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên kế hoạch SPC *</Label>
                  <Input
                    value={manualFormData.name}
                    onChange={(e) => setManualFormData({ ...manualFormData, name: e.target.value })}
                    placeholder="VD: SPC Plan - Đường kính trục"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên phép đo *</Label>
                  <Input
                    value={manualFormData.measurementName}
                    onChange={(e) => setManualFormData({ ...manualFormData, measurementName: e.target.value })}
                    placeholder="VD: Đường kính trục chính"
                  />
                </div>
              </div>
              
              {/* Selection fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Dây chuyền sản xuất *</Label>
                  <Select
                    value={manualFormData.productionLineId.toString()}
                    onValueChange={(v) => setManualFormData({ ...manualFormData, productionLineId: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn dây chuyền" />
                    </SelectTrigger>
                    <SelectContent>
                      {productionLines.map((line: any) => (
                        <SelectItem key={line.id} value={line.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4" />
                            {line.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sản phẩm</Label>
                  <Select
                    value={manualFormData.productId.toString()}
                    onValueChange={(v) => setManualFormData({ ...manualFormData, productId: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">-- Không chọn --</SelectItem>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {p.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Công trạm</Label>
                  <Select
                    value={manualFormData.workstationId.toString()}
                    onValueChange={(v) => setManualFormData({ ...manualFormData, workstationId: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn công trạm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">-- Không chọn --</SelectItem>
                      {workstations.map((w: any) => (
                        <SelectItem key={w.id} value={w.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Cog className="h-4 w-4" />
                            {w.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Máy</Label>
                  <Select
                    value={manualFormData.machineId.toString()}
                    onValueChange={(v) => setManualFormData({ ...manualFormData, machineId: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn máy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">-- Không chọn --</SelectItem>
                      {machines.map((m: any) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4" />
                            {m.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Specification Limits */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4" />
                  Giới hạn kỹ thuật (Specification Limits)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>USL (Giới hạn trên) *</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={manualFormData.usl}
                      onChange={(e) => setManualFormData({ ...manualFormData, usl: e.target.value })}
                      placeholder="VD: 10.05"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LSL (Giới hạn dưới) *</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={manualFormData.lsl}
                      onChange={(e) => setManualFormData({ ...manualFormData, lsl: e.target.value })}
                      placeholder="VD: 9.95"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target (Mục tiêu)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={manualFormData.target}
                      onChange={(e) => setManualFormData({ ...manualFormData, target: e.target.value })}
                      placeholder="VD: 10.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Đơn vị</Label>
                    <Input
                      value={manualFormData.unit}
                      onChange={(e) => setManualFormData({ ...manualFormData, unit: e.target.value })}
                      placeholder="VD: mm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Sampling Config */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4" />
                  Cấu hình lấy mẫu
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Phương pháp lấy mẫu</Label>
                    <Select
                      value={manualFormData.samplingConfigId.toString()}
                      onValueChange={(v) => setManualFormData({ ...manualFormData, samplingConfigId: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn phương pháp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">-- Mặc định --</SelectItem>
                        {samplingConfigs.map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kích thước mẫu</Label>
                    <Input
                      type="number"
                      min="1"
                      value={manualFormData.sampleSize}
                      onChange={(e) => setManualFormData({ ...manualFormData, sampleSize: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tần suất (phút)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={manualFormData.sampleFrequency}
                      onChange={(e) => setManualFormData({ ...manualFormData, sampleFrequency: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                </div>
              </div>
              
              {/* Rules Selection */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2 mb-4">
                  <Zap className="h-4 w-4" />
                  Chọn Rules áp dụng
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">SPC Rules</Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {spcRules.map((rule: any) => (
                        <Badge
                          key={rule.id}
                          variant={manualFormData.enabledSpcRules.includes(rule.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setManualFormData(prev => ({
                              ...prev,
                              enabledSpcRules: prev.enabledSpcRules.includes(rule.id)
                                ? prev.enabledSpcRules.filter(id => id !== rule.id)
                                : [...prev.enabledSpcRules, rule.id]
                            }));
                          }}
                        >
                          {rule.code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">CPK Rules</Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {cpkRules.map((rule: any) => (
                        <Badge
                          key={rule.id}
                          variant={manualFormData.enabledCpkRules.includes(rule.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setManualFormData(prev => ({
                              ...prev,
                              enabledCpkRules: prev.enabledCpkRules.includes(rule.id)
                                ? prev.enabledCpkRules.filter(id => id !== rule.id)
                                : [...prev.enabledCpkRules, rule.id]
                            }));
                          }}
                        >
                          {rule.code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notification Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Lặp lại tự động</Label>
                    <p className="text-xs text-muted-foreground">Chạy kế hoạch theo chu kỳ</p>
                  </div>
                  <Switch
                    checked={manualFormData.isRecurring}
                    onCheckedChange={(v) => setManualFormData({ ...manualFormData, isRecurring: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Thông báo khi vi phạm</Label>
                    <p className="text-xs text-muted-foreground">Gửi email khi phát hiện lỗi SPC</p>
                  </div>
                  <Switch
                    checked={manualFormData.notifyOnViolation}
                    onCheckedChange={(v) => setManualFormData({ ...manualFormData, notifyOnViolation: v })}
                  />
                </div>
              </div>
              
              {manualFormData.notifyOnViolation && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email nhận thông báo
                  </Label>
                  <Input
                    type="email"
                    value={manualFormData.notifyEmail}
                    onChange={(e) => setManualFormData({ ...manualFormData, notifyEmail: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              )}
              
              {/* Summary */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Tóm tắt thông tin</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Tên: {manualFormData.name || "Chưa nhập"}</li>
                  <li>• Phép đo: {manualFormData.measurementName || "Chưa nhập"}</li>
                  <li>• Giới hạn: {manualFormData.lsl || "?"} - {manualFormData.usl || "?"} {manualFormData.unit}</li>
                  <li>• Dây chuyền: {productionLines.find((l: any) => l.id === manualFormData.productionLineId)?.name || "Chưa chọn"}</li>
                  <li>• SPC Rules: {manualFormData.enabledSpcRules.length} rules</li>
                  <li>• CPK Rules: {manualFormData.enabledCpkRules.length} rules</li>
                </ul>
              </div>
              
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowLoadTemplateDialog(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Tải Template
                  </Button>
                  <Button variant="outline" onClick={() => setShowSaveTemplateDialog(true)}>
                    <Save className="h-4 w-4 mr-2" />
                    Lưu Template
                  </Button>
                </div>
                <Button
                  onClick={handleManualCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Tạo kế hoạch SPC
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Save Template Dialog */}
        <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                Lưu Template SPC Plan
              </DialogTitle>
              <DialogDescription>
                Lưu cấu hình hiện tại để tái sử dụng cho các sản phẩm tương tự
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tên Template *</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="VD: Template đo đường kính trục"
                />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Input
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Mô tả ngắn gọn về template"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label>Chia sẻ công khai</Label>
                  <p className="text-xs text-muted-foreground">Cho phép người dùng khác sử dụng template này</p>
                </div>
                <Switch
                  checked={templateIsPublic}
                  onCheckedChange={setTemplateIsPublic}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
                Hủy
              </Button>
              <Button onClick={handleSaveTemplate} disabled={createTemplateMutation.isPending}>
                {createTemplateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang lưu...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Lưu Template</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Load Template Dialog */}
        <Dialog open={showLoadTemplateDialog} onOpenChange={setShowLoadTemplateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Chọn Template SPC Plan
              </DialogTitle>
              <DialogDescription>
                Chọn một template để tải cấu hình vào form
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có template nào</p>
                  <p className="text-sm">Hãy tạo template đầu tiên bằng cách nhập thông tin và nhấn "Lưu Template"</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {templates.map((template: any) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{template.name}</h4>
                          {template.isPublic === 1 && (
                            <Badge variant="secondary" className="text-xs">Công khai</Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          {template.measurementName && <span>Phép đo: {template.measurementName}</span>}
                          {template.usl && template.lsl && (
                            <span>Giới hạn: {parseFloat(template.lsl)/10000} - {parseFloat(template.usl)/10000}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleLoadTemplate(template)}>
                          <Copy className="h-4 w-4 mr-1" />
                          Sử dụng
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteTemplateMutation.mutate({ id: template.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
