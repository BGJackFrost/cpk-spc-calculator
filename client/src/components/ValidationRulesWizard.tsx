import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  ChevronLeft, ChevronRight, Check, Loader2, 
  Ruler, TrendingUp, Grid3X3, GitCompare, Calculator, Code,
  AlertTriangle, Bell, XCircle, FileText
} from "lucide-react";

interface ValidationRulesWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const RULE_TYPES = [
  { 
    value: "range_check", 
    label: "Kiểm tra khoảng", 
    description: "Kiểm tra giá trị nằm trong khoảng min-max",
    icon: Ruler,
    config: { minValue: 0, maxValue: 100, inclusive: true },
    example: "Ví dụ: Giá trị phải nằm trong khoảng 0-100"
  },
  { 
    value: "trend_check", 
    label: "Kiểm tra xu hướng", 
    description: "Phát hiện xu hướng tăng/giảm liên tục",
    icon: TrendingUp,
    config: { direction: "increasing", consecutivePoints: 7, threshold: 0.01 },
    example: "Ví dụ: Phát hiện 7 điểm liên tiếp tăng"
  },
  { 
    value: "pattern_check", 
    label: "Kiểm tra mẫu", 
    description: "Phát hiện các mẫu bất thường trong dữ liệu",
    icon: Grid3X3,
    config: { pattern: "alternating", minOccurrences: 14 },
    example: "Ví dụ: Phát hiện 14 điểm dao động xen kẽ"
  },
  { 
    value: "comparison_check", 
    label: "So sánh giá trị", 
    description: "So sánh với giá trị tham chiếu hoặc trung bình",
    icon: GitCompare,
    config: { compareWith: "mean", operator: "greater_than", threshold: 2 },
    example: "Ví dụ: Giá trị > trung bình + 2 sigma"
  },
  { 
    value: "formula_check", 
    label: "Công thức", 
    description: "Kiểm tra theo công thức tùy chỉnh",
    icon: Calculator,
    config: { formula: "(value - mean) / stdDev", operator: "less_than", threshold: 3 },
    example: "Ví dụ: Z-score < 3"
  },
  { 
    value: "custom_script", 
    label: "Script tùy chỉnh", 
    description: "Chạy script JavaScript để kiểm tra",
    icon: Code,
    config: { script: "return value >= 0 && value <= 100;" },
    example: "Ví dụ: Kiểm tra logic phức tạp"
  },
];

const ACTIONS = [
  { value: "warning", label: "Cảnh báo", icon: AlertTriangle, color: "bg-yellow-100 text-yellow-800" },
  { value: "alert", label: "Gửi thông báo", icon: Bell, color: "bg-orange-100 text-orange-800" },
  { value: "reject", label: "Từ chối dữ liệu", icon: XCircle, color: "bg-red-100 text-red-800" },
  { value: "log_only", label: "Chỉ ghi log", icon: FileText, color: "bg-gray-100 text-gray-800" },
];

const SEVERITIES = [
  { value: "low", label: "Thấp", color: "bg-blue-100 text-blue-800" },
  { value: "medium", label: "Trung bình", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "Cao", color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "Nghiêm trọng", color: "bg-red-100 text-red-800" },
];

export function ValidationRulesWizard({ open, onOpenChange, onSuccess }: ValidationRulesWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    productId: "",
    workstationId: "",
    ruleType: "",
    ruleConfig: "{}",
    actionOnViolation: "warning",
    severity: "medium",
    violationMessage: "",
    priority: 100,
  });

  const { data: products } = trpc.product.list.useQuery();
  const { data: workstations } = trpc.workstation.listAll.useQuery();

  const createMutation = trpc.validationRule.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo quy tắc kiểm tra mới!");
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: "",
      description: "",
      productId: "",
      workstationId: "",
      ruleType: "",
      ruleConfig: "{}",
      actionOnViolation: "warning",
      severity: "medium",
      violationMessage: "",
      priority: 100,
    });
  };

  const handleRuleTypeSelect = (type: string) => {
    const ruleType = RULE_TYPES.find(r => r.value === type);
    setFormData({
      ...formData,
      ruleType: type,
      ruleConfig: JSON.stringify(ruleType?.config || {}, null, 2),
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.productId !== "";
      case 2: return formData.ruleType !== "";
      case 3: return formData.name.trim() !== "";
      case 4: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    try {
      JSON.parse(formData.ruleConfig);
    } catch {
      toast.error("Cấu hình quy tắc không phải JSON hợp lệ");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      productId: formData.productId && formData.productId !== "_all" ? parseInt(formData.productId) : undefined,
      workstationId: formData.workstationId && formData.workstationId !== "_all" ? parseInt(formData.workstationId) : undefined,
      ruleType: formData.ruleType,
      ruleConfig: formData.ruleConfig,
      actionOnViolation: formData.actionOnViolation,
      severity: formData.severity,
      violationMessage: formData.violationMessage || undefined,
      priority: formData.priority,
    });
  };

  const selectedRuleType = RULE_TYPES.find(r => r.value === formData.ruleType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Hướng dẫn tạo Quy tắc Kiểm tra
            <Badge variant="outline">Bước {step}/4</Badge>
          </DialogTitle>
          <DialogDescription>
            Làm theo các bước để tạo quy tắc kiểm tra tùy chỉnh cho sản phẩm của bạn
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Chọn sản phẩm */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold mb-2">Bước 1: Chọn phạm vi áp dụng</h3>
              <p className="text-sm text-muted-foreground">
                Chọn sản phẩm và công trạm mà quy tắc này sẽ áp dụng
              </p>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Sản phẩm *</Label>
                <Select value={formData.productId} onValueChange={(v) => setFormData({ ...formData, productId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn sản phẩm..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Tất cả sản phẩm (Toàn cục)</SelectItem>
                    {products?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.code} - {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Chọn "Tất cả sản phẩm" để áp dụng quy tắc cho toàn bộ hệ thống
                </p>
              </div>

              <div className="space-y-2">
                <Label>Công trạm (Tùy chọn)</Label>
                <Select value={formData.workstationId} onValueChange={(v) => setFormData({ ...formData, workstationId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn công trạm..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Tất cả công trạm</SelectItem>
                    {workstations?.map((w: any) => (
                      <SelectItem key={w.id} value={w.id.toString()}>
                        {w.code} - {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Chọn loại rule */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold mb-2">Bước 2: Chọn loại quy tắc</h3>
              <p className="text-sm text-muted-foreground">
                Chọn loại kiểm tra phù hợp với nhu cầu của bạn
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {RULE_TYPES.map((type) => {
                const IconComponent = type.icon;
                const isSelected = formData.ruleType === type.value;
                return (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleRuleTypeSelect(type.value)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-sm">{type.label}</CardTitle>
                        {isSelected && <Check className="h-4 w-4 text-primary ml-auto" />}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-xs">{type.description}</CardDescription>
                      <p className="text-xs text-muted-foreground mt-1 italic">{type.example}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Cấu hình chi tiết */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold mb-2">Bước 3: Cấu hình chi tiết</h3>
              <p className="text-sm text-muted-foreground">
                Đặt tên và cấu hình thông số cho quy tắc
              </p>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Tên quy tắc *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Kiểm tra kích thước PCB"
                />
              </div>

              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả chi tiết về quy tắc này..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Cấu hình quy tắc (JSON)</Label>
                <Textarea
                  value={formData.ruleConfig}
                  onChange={(e) => setFormData({ ...formData, ruleConfig: e.target.value })}
                  className="font-mono text-sm"
                  rows={4}
                />
                {selectedRuleType && (
                  <p className="text-xs text-muted-foreground">
                    Loại: {selectedRuleType.label} - {selectedRuleType.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Thông báo khi vi phạm</Label>
                <Input
                  value={formData.violationMessage}
                  onChange={(e) => setFormData({ ...formData, violationMessage: e.target.value })}
                  placeholder="Ví dụ: Giá trị vượt quá giới hạn cho phép"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Xác nhận */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <h3 className="text-lg font-semibold mb-2">Bước 4: Xác nhận và lưu</h3>
              <p className="text-sm text-muted-foreground">
                Chọn hành động khi vi phạm và xác nhận thông tin
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Hành động khi vi phạm</Label>
                <Select value={formData.actionOnViolation} onValueChange={(v) => setFormData({ ...formData, actionOnViolation: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        <div className="flex items-center gap-2">
                          <a.icon className="h-4 w-4" />
                          {a.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mức độ nghiêm trọng</Label>
                <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <Badge className={s.color}>{s.label}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tóm tắt quy tắc</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tên:</span>
                  <span className="font-medium">{formData.name || "Chưa đặt tên"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loại:</span>
                  <span className="font-medium">{selectedRuleType?.label || "Chưa chọn"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phạm vi:</span>
                  <span className="font-medium">
                    {formData.productId === "_all" ? "Tất cả sản phẩm" : 
                     products?.find((p: any) => p.id.toString() === formData.productId)?.name || "Chưa chọn"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hành động:</span>
                  <span className="font-medium">
                    {ACTIONS.find(a => a.value === formData.actionOnViolation)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mức độ:</span>
                  <Badge className={SEVERITIES.find(s => s.value === formData.severity)?.color}>
                    {SEVERITIES.find(s => s.value === formData.severity)?.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Quay lại
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleNext} disabled={!canProceed() || createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : step === 4 ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-1" />
              )}
              {step === 4 ? "Tạo quy tắc" : "Tiếp tục"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ValidationRulesWizard;
