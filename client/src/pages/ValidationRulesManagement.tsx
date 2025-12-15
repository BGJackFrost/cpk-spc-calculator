import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Loader2, Plus, Pencil, Trash2, Search, Filter, 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
  Play, History, Wand2
} from "lucide-react";
import { ValidationRulesWizard } from "@/components/ValidationRulesWizard";

interface ValidationRule {
  id: number;
  name: string;
  description: string | null;
  productId: number | null;
  workstationId: number | null;
  ruleType: string;
  ruleConfig: string | null;
  actionOnViolation: string;
  severity: string;
  violationMessage: string | null;
  isActive: number;
  priority: number;
  createdBy: number;
  createdAt: Date;
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

const RULE_TYPES = [
  { value: "range_check", label: "Kiểm tra khoảng", description: "Kiểm tra giá trị nằm trong khoảng min-max" },
  { value: "trend_check", label: "Kiểm tra xu hướng", description: "Phát hiện xu hướng tăng/giảm liên tục" },
  { value: "pattern_check", label: "Kiểm tra mẫu", description: "Phát hiện các mẫu bất thường trong dữ liệu" },
  { value: "comparison_check", label: "So sánh giá trị", description: "So sánh với giá trị tham chiếu hoặc trung bình" },
  { value: "formula_check", label: "Công thức", description: "Kiểm tra theo công thức tùy chỉnh" },
  { value: "custom_script", label: "Script tùy chỉnh", description: "Chạy script JavaScript để kiểm tra" },
];

const ACTIONS = [
  { value: "warning", label: "Cảnh báo", color: "bg-yellow-100 text-yellow-800" },
  { value: "alert", label: "Gửi thông báo", color: "bg-orange-100 text-orange-800" },
  { value: "reject", label: "Từ chối dữ liệu", color: "bg-red-100 text-red-800" },
  { value: "log_only", label: "Chỉ ghi log", color: "bg-gray-100 text-gray-800" },
];

const SEVERITIES = [
  { value: "low", label: "Thấp", color: "bg-blue-100 text-blue-800" },
  { value: "medium", label: "Trung bình", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "Cao", color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "Nghiêm trọng", color: "bg-red-100 text-red-800" },
];

export default function ValidationRulesManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ValidationRule | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    productId: "",
    workstationId: "",
    ruleType: "range_check",
    ruleConfig: JSON.stringify({ minValue: 0, maxValue: 100 }, null, 2),
    actionOnViolation: "warning",
    severity: "medium",
    violationMessage: "",
    priority: 100,
  });

  // Queries
  const { data: rules, isLoading, refetch } = trpc.validationRule.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();
  const { data: workstations } = trpc.workstation.listAll.useQuery();

  // Mutations
  const createMutation = trpc.validationRule.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo quy tắc kiểm tra mới");
      refetch();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateMutation = trpc.validationRule.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật quy tắc kiểm tra");
      refetch();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = trpc.validationRule.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa quy tắc kiểm tra");
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const toggleActiveMutation = trpc.validationRule.toggleActive.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      productId: "",
      workstationId: "",
      ruleType: "range_check",
      ruleConfig: JSON.stringify({ minValue: 0, maxValue: 100 }, null, 2),
      actionOnViolation: "warning",
      severity: "medium",
      violationMessage: "",
      priority: 100,
    });
    setEditingRule(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: ValidationRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || "",
      productId: rule.productId?.toString() || "",
      workstationId: rule.workstationId?.toString() || "",
      ruleType: rule.ruleType,
      ruleConfig: rule.ruleConfig || JSON.stringify({ minValue: 0, maxValue: 100 }, null, 2),
      actionOnViolation: rule.actionOnViolation,
      severity: rule.severity,
      violationMessage: rule.violationMessage || "",
      priority: rule.priority,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên quy tắc");
      return;
    }

    // Validate JSON config
    try {
      JSON.parse(formData.ruleConfig);
    } catch {
      toast.error("Cấu hình quy tắc không phải JSON hợp lệ");
      return;
    }

    const data = {
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
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa quy tắc này?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Filter rules
  const filteredRules = useMemo(() => {
    if (!rules) return [];
    return rules.filter((r: ValidationRule) => {
      const matchSearch = !searchTerm || 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProduct = filterProduct === "all" || 
        (filterProduct === "global" && !r.productId) ||
        r.productId?.toString() === filterProduct;
      const matchSeverity = filterSeverity === "all" || r.severity === filterSeverity;
      return matchSearch && matchProduct && matchSeverity;
    });
  }, [rules, searchTerm, filterProduct, filterSeverity]);

  // Stats
  const stats = useMemo(() => {
    if (!rules) return { total: 0, active: 0, critical: 0 };
    return {
      total: rules.length,
      active: rules.filter((r: ValidationRule) => r.isActive === 1).length,
      critical: rules.filter((r: ValidationRule) => r.severity === "critical").length,
    };
  }, [rules]);

  const getProductName = (id: number | null) => {
    if (!id) return "Tất cả sản phẩm";
    return products?.find((p: Product) => p.id === id)?.name || "N/A";
  };

  const getWorkstationName = (id: number | null) => {
    if (!id) return "Tất cả công trạm";
    return workstations?.find((w: Workstation) => w.id === id)?.name || "N/A";
  };

  const getRuleTypeLabel = (type: string) => {
    return RULE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getActionBadge = (action: string) => {
    const a = ACTIONS.find(x => x.value === action);
    return <Badge className={a?.color || ""}>{a?.label || action}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const s = SEVERITIES.find(x => x.value === severity);
    return <Badge className={s?.color || ""}>{s?.label || severity}</Badge>;
  };

  // Get rule config template based on type
  const getRuleConfigTemplate = (type: string) => {
    switch (type) {
      case "range_check":
        return JSON.stringify({ minValue: 0, maxValue: 100, inclusive: true }, null, 2);
      case "trend_check":
        return JSON.stringify({ direction: "increasing", consecutivePoints: 7, threshold: 0.01 }, null, 2);
      case "pattern_check":
        return JSON.stringify({ pattern: "alternating", minOccurrences: 14 }, null, 2);
      case "comparison_check":
        return JSON.stringify({ compareWith: "mean", operator: "greater_than", threshold: 2 }, null, 2);
      case "formula_check":
        return JSON.stringify({ formula: "(value - mean) / stdDev", operator: "less_than", threshold: 3 }, null, 2);
      case "custom_script":
        return JSON.stringify({ script: "return value >= 0 && value <= 100;" }, null, 2);
      default:
        return "{}";
    }
  };

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
            <h1 className="text-3xl font-bold tracking-tight">Quy tắc Kiểm tra Tùy chỉnh</h1>
            <p className="text-muted-foreground mt-1">
              Định nghĩa các quy tắc kiểm tra riêng cho từng sản phẩm và công trạm
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsWizardOpen(true)}>
              <Wand2 className="mr-2 h-4 w-4" />
              Hướng dẫn tạo
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm quy tắc
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng quy tắc</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Quy tắc kiểm tra</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đang hoạt động</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Quy tắc active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mức nghiêm trọng</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <p className="text-xs text-muted-foreground">Quy tắc critical</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm quy tắc..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sản phẩm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                  <SelectItem value="global">Quy tắc toàn cục</SelectItem>
                  {products?.map((p: Product) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Mức độ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả mức độ</SelectItem>
                  {SEVERITIES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Rules Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Quy tắc</CardTitle>
            <CardDescription>
              {filteredRules.length} quy tắc được tìm thấy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên quy tắc</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Phạm vi</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Mức độ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Chưa có quy tắc kiểm tra nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRules.map((rule: ValidationRule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{rule.name}</div>
                          {rule.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {rule.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRuleTypeLabel(rule.ruleType)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{getProductName(rule.productId)}</div>
                          <div className="text-muted-foreground">{getWorkstationName(rule.workstationId)}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(rule.actionOnViolation)}</TableCell>
                      <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.isActive === 1}
                          onCheckedChange={() => toggleActiveMutation.mutate({ id: rule.id })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(rule)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? "Sửa Quy tắc" : "Thêm Quy tắc mới"}</DialogTitle>
              <DialogDescription>
                Định nghĩa quy tắc kiểm tra tùy chỉnh cho dữ liệu SPC
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên quy tắc *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Kiểm tra giới hạn nhiệt độ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Độ ưu tiên</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })}
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground">Số nhỏ = ưu tiên cao</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả chi tiết về quy tắc kiểm tra..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sản phẩm áp dụng</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(v) => setFormData({ ...formData, productId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Tất cả sản phẩm</SelectItem>
                      {products?.map((p: Product) => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Công trạm áp dụng</Label>
                  <Select
                    value={formData.workstationId}
                    onValueChange={(v) => setFormData({ ...formData, workstationId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả công trạm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Tất cả công trạm</SelectItem>
                      {workstations?.map((w: Workstation) => (
                        <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Loại quy tắc</Label>
                <Select
                  value={formData.ruleType}
                  onValueChange={(v) => setFormData({ 
                    ...formData, 
                    ruleType: v,
                    ruleConfig: getRuleConfigTemplate(v)
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div>
                          <div className="font-medium">{t.label}</div>
                          <div className="text-xs text-muted-foreground">{t.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cấu hình quy tắc (JSON)</Label>
                <Textarea
                  value={formData.ruleConfig}
                  onChange={(e) => setFormData({ ...formData, ruleConfig: e.target.value })}
                  className="font-mono text-sm"
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hành động khi vi phạm</Label>
                  <Select
                    value={formData.actionOnViolation}
                    onValueChange={(v) => setFormData({ ...formData, actionOnViolation: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIONS.map(a => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mức độ nghiêm trọng</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(v) => setFormData({ ...formData, severity: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Thông báo khi vi phạm</Label>
                <Textarea
                  value={formData.violationMessage}
                  onChange={(e) => setFormData({ ...formData, violationMessage: e.target.value })}
                  placeholder="VD: Giá trị vượt quá giới hạn cho phép"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingRule ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Wizard Dialog */}
        <ValidationRulesWizard
          open={isWizardOpen}
          onOpenChange={setIsWizardOpen}
          onSuccess={() => refetch()}
        />
      </div>
    </DashboardLayout>
  );
}
