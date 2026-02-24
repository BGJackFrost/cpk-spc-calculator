import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  GripVertical,
  Settings,
  Eye,
  FileText,
  Loader2,
  Edit,
  Copy,
  ChevronDown,
  ChevronRight,
  Filter,
  Download
} from "lucide-react";

// Types
export interface ValidationRule {
  id: string;
  name: string;
  column: string;
  type: "required" | "format" | "range" | "unique" | "regex" | "custom" | "length" | "enum" | "reference";
  enabled: boolean;
  params: ValidationRuleParams;
  errorMessage?: string;
  severity: "error" | "warning" | "info";
}

interface ValidationRuleParams {
  pattern?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  allowedValues?: string[];
  referenceTable?: string;
  referenceColumn?: string;
  customFunction?: string;
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  column: string;
  totalRecords: number;
  passedRecords: number;
  failedRecords: number;
  warningRecords: number;
  failedRows: number[];
  sampleErrors: { row: number; value: unknown; reason: string }[];
}

interface ColumnInfo {
  name: string;
  type: string;
}

interface ValidationRuleBuilderProps {
  columns: ColumnInfo[];
  onRulesChange?: (rules: ValidationRule[]) => void;
  onValidate?: (rules: ValidationRule[]) => Promise<ValidationResult[]>;
}

// Predefined rule templates
const RULE_TEMPLATES: Partial<ValidationRule>[] = [
  { name: "Bắt buộc", type: "required", params: {}, errorMessage: "Giá trị không được để trống" },
  { name: "Email", type: "format", params: { pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" }, errorMessage: "Email không hợp lệ" },
  { name: "Số điện thoại", type: "format", params: { pattern: "^(0|\\+84)[0-9]{9,10}$" }, errorMessage: "Số điện thoại không hợp lệ" },
  { name: "Số dương", type: "range", params: { min: 0 }, errorMessage: "Giá trị phải lớn hơn hoặc bằng 0" },
  { name: "Phần trăm", type: "range", params: { min: 0, max: 100 }, errorMessage: "Giá trị phải từ 0 đến 100" },
  { name: "Độ dài tối thiểu", type: "length", params: { minLength: 1 }, errorMessage: "Độ dài không đủ" },
  { name: "Giá trị duy nhất", type: "unique", params: {}, errorMessage: "Giá trị bị trùng lặp" },
];

export default function ValidationRuleBuilder({ columns, onRulesChange, onValidate }: ValidationRuleBuilderProps) {
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<ValidationRule | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("rules");

  // New rule form state
  const [newRule, setNewRule] = useState<Partial<ValidationRule>>({
    name: "",
    column: "",
    type: "required",
    enabled: true,
    params: {},
    severity: "error",
    errorMessage: "",
  });

  const { toast } = useToast();

  // Add rule
  const handleAddRule = () => {
    if (!newRule.name || !newRule.column || !newRule.type) {
      toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ thông tin", variant: "destructive" });
      return;
    }

    const rule: ValidationRule = {
      id: Date.now().toString(),
      name: newRule.name,
      column: newRule.column,
      type: newRule.type as ValidationRule["type"],
      enabled: newRule.enabled ?? true,
      params: newRule.params || {},
      errorMessage: newRule.errorMessage,
      severity: newRule.severity || "error",
    };

    const updatedRules = [...rules, rule];
    setRules(updatedRules);
    onRulesChange?.(updatedRules);
    setShowAddDialog(false);
    resetNewRule();
    toast({ title: "Đã thêm rule", description: `Rule "${rule.name}" đã được thêm` });
  };

  // Update rule
  const handleUpdateRule = () => {
    if (!editingRule) return;

    const updatedRules = rules.map(r => r.id === editingRule.id ? editingRule : r);
    setRules(updatedRules);
    onRulesChange?.(updatedRules);
    setEditingRule(null);
    toast({ title: "Đã cập nhật", description: `Rule "${editingRule.name}" đã được cập nhật` });
  };

  // Delete rule
  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    setRules(updatedRules);
    onRulesChange?.(updatedRules);
    toast({ title: "Đã xóa", description: "Rule đã được xóa" });
  };

  // Toggle rule enabled
  const toggleRuleEnabled = (ruleId: string) => {
    const updatedRules = rules.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    setRules(updatedRules);
    onRulesChange?.(updatedRules);
  };

  // Duplicate rule
  const duplicateRule = (rule: ValidationRule) => {
    const newRuleCopy: ValidationRule = {
      ...rule,
      id: Date.now().toString(),
      name: `${rule.name} (Copy)`,
    };
    const updatedRules = [...rules, newRuleCopy];
    setRules(updatedRules);
    onRulesChange?.(updatedRules);
    toast({ title: "Đã sao chép", description: `Rule "${newRuleCopy.name}" đã được tạo` });
  };

  // Apply template
  const applyTemplate = (template: Partial<ValidationRule>) => {
    setNewRule({
      ...newRule,
      name: template.name || "",
      type: template.type || "required",
      params: template.params || {},
      errorMessage: template.errorMessage || "",
    });
  };

  // Reset new rule form
  const resetNewRule = () => {
    setNewRule({
      name: "",
      column: "",
      type: "required",
      enabled: true,
      params: {},
      severity: "error",
      errorMessage: "",
    });
  };

  // Run validation
  const runValidation = async () => {
    const enabledRules = rules.filter(r => r.enabled);
    if (enabledRules.length === 0) {
      toast({ title: "Lỗi", description: "Không có rule nào được bật", variant: "destructive" });
      return;
    }

    setIsValidating(true);
    setActiveTab("results");

    try {
      if (onValidate) {
        const results = await onValidate(enabledRules);
        setValidationResults(results);
      } else {
        // Mock validation results
        await new Promise(resolve => setTimeout(resolve, 1500));
        const mockResults: ValidationResult[] = enabledRules.map(rule => {
          const total = 1000;
          const failed = Math.floor(Math.random() * 50);
          const warnings = Math.floor(Math.random() * 20);
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            column: rule.column,
            totalRecords: total,
            passedRecords: total - failed - warnings,
            failedRecords: failed,
            warningRecords: warnings,
            failedRows: Array.from({ length: Math.min(failed, 10) }, (_, i) => Math.floor(Math.random() * 1000)),
            sampleErrors: Array.from({ length: Math.min(failed, 5) }, (_, i) => ({
              row: Math.floor(Math.random() * 1000),
              value: `Sample value ${i}`,
              reason: rule.errorMessage || "Validation failed",
            })),
          };
        });
        setValidationResults(mockResults);
      }

      toast({ title: "Validation hoàn tất", description: `Đã kiểm tra ${enabledRules.length} rules` });
    } catch {
      toast({ title: "Lỗi", description: "Không thể chạy validation", variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  // Toggle result expansion
  const toggleResultExpansion = (ruleId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(ruleId)) {
      newExpanded.delete(ruleId);
    } else {
      newExpanded.add(ruleId);
    }
    setExpandedResults(newExpanded);
  };

  // Get rule type label
  const getRuleTypeLabel = (type: ValidationRule["type"]) => {
    switch (type) {
      case "required": return "Bắt buộc";
      case "format": return "Định dạng";
      case "range": return "Phạm vi";
      case "unique": return "Duy nhất";
      case "regex": return "Regex";
      case "custom": return "Tùy chỉnh";
      case "length": return "Độ dài";
      case "enum": return "Danh sách";
      case "reference": return "Tham chiếu";
      default: return type;
    }
  };

  // Get severity badge
  const getSeverityBadge = (severity: ValidationRule["severity"]) => {
    switch (severity) {
      case "error": return <Badge variant="destructive">Error</Badge>;
      case "warning": return <Badge className="bg-yellow-500">Warning</Badge>;
      case "info": return <Badge variant="secondary">Info</Badge>;
    }
  };

  // Calculate overall stats
  const overallStats = validationResults.reduce(
    (acc, r) => ({
      total: acc.total + r.totalRecords,
      passed: acc.passed + r.passedRecords,
      failed: acc.failed + r.failedRecords,
      warnings: acc.warnings + r.warningRecords,
    }),
    { total: 0, passed: 0, failed: 0, warnings: 0 }
  );

  // Render rule params form
  const renderParamsForm = (rule: Partial<ValidationRule>, onChange: (params: ValidationRuleParams) => void) => {
    const params = rule.params || {};

    switch (rule.type) {
      case "format":
      case "regex":
        return (
          <div className="space-y-2">
            <Label>Pattern (Regex)</Label>
            <Input
              value={params.pattern || ""}
              onChange={(e) => onChange({ ...params, pattern: e.target.value })}
              placeholder="^[a-zA-Z0-9]+$"
            />
          </div>
        );
      case "range":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Giá trị tối thiểu</Label>
              <Input
                type="number"
                value={params.min ?? ""}
                onChange={(e) => onChange({ ...params, min: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>Giá trị tối đa</Label>
              <Input
                type="number"
                value={params.max ?? ""}
                onChange={(e) => onChange({ ...params, max: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
        );
      case "length":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Độ dài tối thiểu</Label>
              <Input
                type="number"
                value={params.minLength ?? ""}
                onChange={(e) => onChange({ ...params, minLength: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>Độ dài tối đa</Label>
              <Input
                type="number"
                value={params.maxLength ?? ""}
                onChange={(e) => onChange({ ...params, maxLength: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
        );
      case "enum":
        return (
          <div className="space-y-2">
            <Label>Giá trị cho phép (phân cách bằng dấu phẩy)</Label>
            <Input
              value={params.allowedValues?.join(", ") || ""}
              onChange={(e) => onChange({ ...params, allowedValues: e.target.value.split(",").map(v => v.trim()) })}
              placeholder="value1, value2, value3"
            />
          </div>
        );
      case "reference":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bảng tham chiếu</Label>
              <Input
                value={params.referenceTable || ""}
                onChange={(e) => onChange({ ...params, referenceTable: e.target.value })}
                placeholder="table_name"
              />
            </div>
            <div className="space-y-2">
              <Label>Cột tham chiếu</Label>
              <Input
                value={params.referenceColumn || ""}
                onChange={(e) => onChange({ ...params, referenceColumn: e.target.value })}
                placeholder="column_name"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="rules">
              <Settings className="h-4 w-4 mr-2" />
              Rules ({rules.length})
            </TabsTrigger>
            <TabsTrigger value="results">
              <Eye className="h-4 w-4 mr-2" />
              Kết quả
              {validationResults.length > 0 && (
                <Badge variant="secondary" className="ml-2">{validationResults.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Thêm Validation Rule</DialogTitle>
                  <DialogDescription>Tạo rule mới để kiểm tra dữ liệu trước khi migrate</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Templates */}
                  <div>
                    <Label className="mb-2 block">Mẫu có sẵn</Label>
                    <div className="flex flex-wrap gap-2">
                      {RULE_TEMPLATES.map((template, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => applyTemplate(template)}
                        >
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tên Rule</Label>
                      <Input
                        value={newRule.name}
                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                        placeholder="VD: Kiểm tra email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cột áp dụng</Label>
                      <Select
                        value={newRule.column}
                        onValueChange={(value) => setNewRule({ ...newRule, column: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn cột" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((col) => (
                            <SelectItem key={col.name} value={col.name}>
                              {col.name} ({col.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Loại Rule</Label>
                      <Select
                        value={newRule.type}
                        onValueChange={(value) => setNewRule({ ...newRule, type: value as ValidationRule["type"], params: {} })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="required">Bắt buộc</SelectItem>
                          <SelectItem value="format">Định dạng (Regex)</SelectItem>
                          <SelectItem value="range">Phạm vi số</SelectItem>
                          <SelectItem value="length">Độ dài chuỗi</SelectItem>
                          <SelectItem value="unique">Giá trị duy nhất</SelectItem>
                          <SelectItem value="enum">Danh sách cho phép</SelectItem>
                          <SelectItem value="reference">Tham chiếu FK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mức độ</Label>
                      <Select
                        value={newRule.severity}
                        onValueChange={(value) => setNewRule({ ...newRule, severity: value as ValidationRule["severity"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="error">Error (Chặn migrate)</SelectItem>
                          <SelectItem value="warning">Warning (Cảnh báo)</SelectItem>
                          <SelectItem value="info">Info (Thông tin)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Dynamic params form */}
                  {renderParamsForm(newRule, (params) => setNewRule({ ...newRule, params }))}

                  <div className="space-y-2">
                    <Label>Thông báo lỗi</Label>
                    <Input
                      value={newRule.errorMessage}
                      onChange={(e) => setNewRule({ ...newRule, errorMessage: e.target.value })}
                      placeholder="VD: Giá trị không hợp lệ"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowAddDialog(false); resetNewRule(); }}>
                    Hủy
                  </Button>
                  <Button onClick={handleAddRule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm Rule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button onClick={runValidation} disabled={isValidating || rules.length === 0}>
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Chạy Validation
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Rules Tab */}
        <TabsContent value="rules" className="mt-4">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có Validation Rules</h3>
                <p className="text-muted-foreground mb-4">
                  Thêm rules để kiểm tra dữ liệu trước khi migrate
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Rule đầu tiên
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Tên Rule</TableHead>
                    <TableHead>Cột</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Mức độ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id} className={!rule.enabled ? "opacity-50" : ""}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      </TableCell>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell className="font-mono text-sm">{rule.column}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getRuleTypeLabel(rule.type)}</Badge>
                      </TableCell>
                      <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => toggleRuleEnabled(rule.id)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRule(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateRule(rule)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="mt-4 space-y-4">
          {validationResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có kết quả</h3>
                <p className="text-muted-foreground">
                  Chạy validation để xem kết quả kiểm tra dữ liệu
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold">{overallStats.total.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Tổng records</div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-600">{overallStats.passed.toLocaleString()}</div>
                    <div className="text-sm text-green-600">Passed</div>
                  </CardContent>
                </Card>
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-yellow-600">{overallStats.warnings.toLocaleString()}</div>
                    <div className="text-sm text-yellow-600">Warnings</div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-red-600">{overallStats.failed.toLocaleString()}</div>
                    <div className="text-sm text-red-600">Failed</div>
                  </CardContent>
                </Card>
              </div>

              {/* Overall Progress */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Tỷ lệ Pass</span>
                    <span className="text-2xl font-bold">
                      {overallStats.total > 0 ? Math.round((overallStats.passed / overallStats.total) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={overallStats.total > 0 ? (overallStats.passed / overallStats.total) * 100 : 0} 
                    className="h-3" 
                  />
                </CardContent>
              </Card>

              {/* Detailed Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Chi tiết từng Rule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {validationResults.map((result) => (
                      <div key={result.ruleId} className="border rounded-lg">
                        <div
                          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleResultExpansion(result.ruleId)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {expandedResults.has(result.ruleId) ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                              {result.failedRecords === 0 ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : result.failedRecords < 10 ? (
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                              <div>
                                <span className="font-medium">{result.ruleName}</span>
                                <span className="text-muted-foreground ml-2">({result.column})</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-sm">
                                <span className="text-green-600">{result.passedRecords.toLocaleString()} passed</span>
                                {result.warningRecords > 0 && (
                                  <span className="text-yellow-600 ml-2">{result.warningRecords.toLocaleString()} warnings</span>
                                )}
                                {result.failedRecords > 0 && (
                                  <span className="text-red-600 ml-2">{result.failedRecords.toLocaleString()} failed</span>
                                )}
                              </div>
                              <Progress 
                                value={(result.passedRecords / result.totalRecords) * 100} 
                                className="w-24 h-2" 
                              />
                            </div>
                          </div>
                        </div>
                        {expandedResults.has(result.ruleId) && result.sampleErrors.length > 0 && (
                          <div className="border-t p-4 bg-muted/30">
                            <h4 className="text-sm font-medium mb-2">Mẫu lỗi:</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Row</TableHead>
                                  <TableHead>Giá trị</TableHead>
                                  <TableHead>Lý do</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {result.sampleErrors.map((error, i) => (
                                  <TableRow key={i}>
                                    <TableCell>{error.row}</TableCell>
                                    <TableCell className="font-mono text-sm">{String(error.value)}</TableCell>
                                    <TableCell className="text-red-600">{error.reason}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Rule Dialog */}
      <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Rule</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên Rule</Label>
                  <Input
                    value={editingRule.name}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cột áp dụng</Label>
                  <Select
                    value={editingRule.column}
                    onValueChange={(value) => setEditingRule({ ...editingRule, column: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col.name} value={col.name}>
                          {col.name} ({col.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loại Rule</Label>
                  <Select
                    value={editingRule.type}
                    onValueChange={(value) => setEditingRule({ ...editingRule, type: value as ValidationRule["type"], params: {} })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">Bắt buộc</SelectItem>
                      <SelectItem value="format">Định dạng (Regex)</SelectItem>
                      <SelectItem value="range">Phạm vi số</SelectItem>
                      <SelectItem value="length">Độ dài chuỗi</SelectItem>
                      <SelectItem value="unique">Giá trị duy nhất</SelectItem>
                      <SelectItem value="enum">Danh sách cho phép</SelectItem>
                      <SelectItem value="reference">Tham chiếu FK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mức độ</Label>
                  <Select
                    value={editingRule.severity}
                    onValueChange={(value) => setEditingRule({ ...editingRule, severity: value as ValidationRule["severity"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {renderParamsForm(editingRule, (params) => setEditingRule({ ...editingRule, params }))}

              <div className="space-y-2">
                <Label>Thông báo lỗi</Label>
                <Input
                  value={editingRule.errorMessage || ""}
                  onChange={(e) => setEditingRule({ ...editingRule, errorMessage: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateRule}>
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
