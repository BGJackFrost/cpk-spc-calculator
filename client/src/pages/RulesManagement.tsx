import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Edit,
  Info,
  Plus,
  RefreshCw,
  Shield,
  Target,
  Trash2,
  Zap,
  Keyboard,
} from "lucide-react";
import { useKeyboardShortcuts, createCommonShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";

type SpcRule = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string;
  formula: string | null;
  example: string | null;
  severity: "warning" | "critical";
  threshold: number | null;
  consecutivePoints: number | null;
  sigmaLevel: number | null;
  isEnabled: number;
  sortOrder: number;
};

type CaRule = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  formula: string | null;
  example: string | null;
  severity: "warning" | "critical";
  minValue: number | null;
  maxValue: number | null;
  isEnabled: number;
  sortOrder: number;
};

type CpkRule = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  minCpk: number | null;
  maxCpk: number | null;
  status: string;
  color: string | null;
  action: string | null;
  severity: "info" | "warning" | "critical";
  isEnabled: number;
  sortOrder: number;
};

export default function RulesManagement() {
  const [activeTab, setActiveTab] = useState("spc");
  const [editingSpcRule, setEditingSpcRule] = useState<SpcRule | null>(null);
  const [editingCaRule, setEditingCaRule] = useState<CaRule | null>(null);
  const [editingCpkRule, setEditingCpkRule] = useState<CpkRule | null>(null);
  const [isAddingSpcRule, setIsAddingSpcRule] = useState(false);
  const [isAddingCaRule, setIsAddingCaRule] = useState(false);
  const [isAddingCpkRule, setIsAddingCpkRule] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Queries
  const { data: spcRules = [], refetch: refetchSpcRules } = trpc.rules.getSpcRules.useQuery();
  const { data: caRules = [], refetch: refetchCaRules } = trpc.rules.getCaRules.useQuery();
  const { data: cpkRules = [], refetch: refetchCpkRules } = trpc.rules.getCpkRules.useQuery();

  // Mutations
  const toggleSpcRule = trpc.rules.toggleSpcRule.useMutation({
    onSuccess: () => {
      refetchSpcRules();
      toast.success("Đã cập nhật trạng thái rule");
    },
  });

  const toggleCaRule = trpc.rules.toggleCaRule.useMutation({
    onSuccess: () => {
      refetchCaRules();
      toast.success("Đã cập nhật trạng thái rule");
    },
  });

  const toggleCpkRule = trpc.rules.toggleCpkRule.useMutation({
    onSuccess: () => {
      refetchCpkRules();
      toast.success("Đã cập nhật trạng thái rule");
    },
  });

  const updateSpcRule = trpc.rules.updateSpcRule.useMutation({
    onSuccess: () => {
      refetchSpcRules();
      setEditingSpcRule(null);
      toast.success("Đã cập nhật rule");
    },
  });

  const updateCaRule = trpc.rules.updateCaRule.useMutation({
    onSuccess: () => {
      refetchCaRules();
      setEditingCaRule(null);
      toast.success("Đã cập nhật rule");
    },
  });

  const updateCpkRule = trpc.rules.updateCpkRule.useMutation({
    onSuccess: () => {
      refetchCpkRules();
      setEditingCpkRule(null);
      toast.success("Đã cập nhật rule");
    },
  });

  const createSpcRule = trpc.rules.createSpcRule.useMutation({
    onSuccess: () => {
      refetchSpcRules();
      setIsAddingSpcRule(false);
      toast.success("Đã thêm rule mới");
    },
  });

  const createCaRule = trpc.rules.createCaRule.useMutation({
    onSuccess: () => {
      refetchCaRules();
      setIsAddingCaRule(false);
      toast.success("Đã thêm rule mới");
    },
  });

  const createCpkRule = trpc.rules.createCpkRule.useMutation({
    onSuccess: () => {
      refetchCpkRules();
      setIsAddingCpkRule(false);
      toast.success("Đã thêm rule mới");
    },
  });

  const deleteSpcRule = trpc.rules.deleteSpcRule.useMutation({
    onSuccess: () => {
      refetchSpcRules();
      toast.success("Đã xóa rule");
    },
  });

  const deleteCaRule = trpc.rules.deleteCaRule.useMutation({
    onSuccess: () => {
      refetchCaRules();
      toast.success("Đã xóa rule");
    },
  });

  const deleteCpkRule = trpc.rules.deleteCpkRule.useMutation({
    onSuccess: () => {
      refetchCpkRules();
      toast.success("Đã xóa rule");
    },
  });

  const seedDefaultRules = trpc.rules.seedDefaultRules.useMutation({
    onSuccess: () => {
      refetchSpcRules();
      refetchCaRules();
      refetchCpkRules();
      toast.success("Đã khởi tạo các rules mặc định");
    },
  });

  // Keyboard shortcuts
  const shortcuts = createCommonShortcuts({
    onNew: () => {
      if (activeTab === "spc") setIsAddingSpcRule(true);
      else if (activeTab === "ca") setIsAddingCaRule(true);
      else if (activeTab === "cpk") setIsAddingCpkRule(true);
    },
    onClose: () => {
      setEditingSpcRule(null);
      setEditingCaRule(null);
      setEditingCpkRule(null);
      setIsAddingSpcRule(false);
      setIsAddingCaRule(false);
      setIsAddingCpkRule(false);
    },
  });
  
  shortcuts.push({
    key: "/",
    ctrl: true,
    action: () => setShowShortcutsHelp(true),
    description: "Hiển thị phím tắt (Ctrl+/)",
  });
  
  useKeyboardShortcuts({ shortcuts });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Nghiêm trọng</Badge>;
      case "warning":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Cảnh báo</Badge>;
      case "info":
        return <Badge variant="secondary">Thông tin</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusColor = (color: string | null) => {
    const colorMap: Record<string, string> = {
      green: "bg-green-500",
      blue: "bg-blue-500",
      yellow: "bg-yellow-500",
      orange: "bg-orange-500",
      red: "bg-red-500",
    };
    return colorMap[color || ""] || "bg-gray-500";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Quản lý Rules
            </h1>
            <p className="text-muted-foreground">
              Cấu hình các quy tắc SPC, CA và CPK cho hệ thống
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => seedDefaultRules.mutate()}
            disabled={seedDefaultRules.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${seedDefaultRules.isPending ? "animate-spin" : ""}`} />
            Khởi tạo Rules mặc định
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="spc" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              SPC Rules ({spcRules.length})
            </TabsTrigger>
            <TabsTrigger value="ca" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              CA Rules ({caRules.length})
            </TabsTrigger>
            <TabsTrigger value="cpk" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              CPK Rules ({cpkRules.length})
            </TabsTrigger>
          </TabsList>

          {/* SPC Rules Tab */}
          <TabsContent value="spc" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    SPC Rules (Western Electric Rules)
                  </CardTitle>
                  <CardDescription>
                    8 quy tắc kiểm soát quy trình thống kê theo tiêu chuẩn Western Electric
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddingSpcRule(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Rule
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Mã</TableHead>
                      <TableHead>Tên Rule</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Mức độ</TableHead>
                      <TableHead className="text-center">Bật/Tắt</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spcRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Chưa có SPC Rules. Nhấn "Khởi tạo Rules mặc định" để bắt đầu.
                        </TableCell>
                      </TableRow>
                    ) : (
                      spcRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-mono font-medium">{rule.code}</TableCell>
                          <TableCell className="font-medium">{rule.name}</TableCell>
                          <TableCell className="max-w-[300px] truncate text-muted-foreground">
                            {rule.description}
                          </TableCell>
                          <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={rule.isEnabled === 1}
                              onCheckedChange={(checked) =>
                                toggleSpcRule.mutate({ id: rule.id, isEnabled: checked })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingSpcRule(rule as SpcRule)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Bạn có chắc muốn xóa rule này?")) {
                                    deleteSpcRule.mutate({ id: rule.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
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

            {/* SPC Rules Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5" />
                  Hướng dẫn SPC Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-muted-foreground">
                  <strong>Western Electric Rules</strong> là bộ 8 quy tắc được sử dụng để phát hiện các điểm bất thường
                  trong biểu đồ kiểm soát (Control Chart). Khi một điểm vi phạm bất kỳ rule nào, đó là dấu hiệu cho thấy
                  quy trình có thể đang mất kiểm soát.
                </p>
                <ul className="text-muted-foreground space-y-1">
                  <li><strong>Rule 1:</strong> Điểm nằm ngoài giới hạn 3σ - Dấu hiệu nghiêm trọng nhất</li>
                  <li><strong>Rule 2:</strong> 9 điểm liên tiếp cùng phía - Dấu hiệu shift (dịch chuyển)</li>
                  <li><strong>Rule 3:</strong> 6 điểm tăng/giảm liên tục - Dấu hiệu trend (xu hướng)</li>
                  <li><strong>Rule 4:</strong> 14 điểm dao động xen kẽ - Dấu hiệu over-adjustment</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CA Rules Tab */}
          <TabsContent value="ca" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    CA Rules (Capability Accuracy)
                  </CardTitle>
                  <CardDescription>
                    Quy tắc đánh giá độ chính xác của quy trình (Ca - Process Accuracy)
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddingCaRule(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Rule
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Mã</TableHead>
                      <TableHead>Tên Rule</TableHead>
                      <TableHead>Công thức</TableHead>
                      <TableHead>Phạm vi</TableHead>
                      <TableHead>Mức độ</TableHead>
                      <TableHead className="text-center">Bật/Tắt</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Chưa có CA Rules. Nhấn "Khởi tạo Rules mặc định" để bắt đầu.
                        </TableCell>
                      </TableRow>
                    ) : (
                      caRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-mono font-medium">{rule.code}</TableCell>
                          <TableCell className="font-medium">{rule.name}</TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">
                            {rule.formula}
                          </TableCell>
                          <TableCell>
                            {rule.minValue !== null && rule.maxValue !== null
                              ? `${(rule.minValue / 1000).toFixed(3)} - ${(rule.maxValue / 1000).toFixed(3)}`
                              : rule.minValue !== null
                              ? `≥ ${(rule.minValue / 1000).toFixed(3)}`
                              : rule.maxValue !== null
                              ? `< ${(rule.maxValue / 1000).toFixed(3)}`
                              : "-"}
                          </TableCell>
                          <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={rule.isEnabled === 1}
                              onCheckedChange={(checked) =>
                                toggleCaRule.mutate({ id: rule.id, isEnabled: checked })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingCaRule(rule as CaRule)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Bạn có chắc muốn xóa rule này?")) {
                                    deleteCaRule.mutate({ id: rule.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
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

            {/* CA Rules Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5" />
                  Công thức tính Ca
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-muted-foreground">
                  <strong>Ca (Capability Accuracy)</strong> đo lường độ lệch tâm của quy trình so với tâm spec:
                </p>
                <div className="bg-muted p-4 rounded-lg font-mono text-center my-4">
                  Ca = (μ - M) / (T/2) × 100%
                </div>
                <p className="text-muted-foreground text-sm">
                  Trong đó: μ = Trung bình quy trình, M = Tâm spec (USL+LSL)/2, T = Dung sai (USL-LSL)
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CPK Rules Tab */}
          <TabsContent value="cpk" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    CPK Rules (Process Capability)
                  </CardTitle>
                  <CardDescription>
                    Quy tắc đánh giá năng lực quy trình (Cpk - Process Capability Index)
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddingCpkRule(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Rule
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Mã</TableHead>
                      <TableHead>Tên Rule</TableHead>
                      <TableHead>Phạm vi CPK</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Hành động</TableHead>
                      <TableHead className="text-center">Bật/Tắt</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cpkRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Chưa có CPK Rules. Nhấn "Khởi tạo Rules mặc định" để bắt đầu.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cpkRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-mono font-medium">{rule.code}</TableCell>
                          <TableCell className="font-medium">{rule.name}</TableCell>
                          <TableCell>
                            {rule.minCpk !== null && rule.maxCpk !== null
                              ? `${(rule.minCpk / 1000).toFixed(2)} - ${(rule.maxCpk / 1000).toFixed(2)}`
                              : rule.minCpk !== null
                              ? `≥ ${(rule.minCpk / 1000).toFixed(2)}`
                              : rule.maxCpk !== null
                              ? `< ${(rule.maxCpk / 1000).toFixed(2)}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${getStatusColor(rule.color)}`} />
                              <span className="capitalize">{rule.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                            {rule.action}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={rule.isEnabled === 1}
                              onCheckedChange={(checked) =>
                                toggleCpkRule.mutate({ id: rule.id, isEnabled: checked })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingCpkRule(rule as CpkRule)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm("Bạn có chắc muốn xóa rule này?")) {
                                    deleteCpkRule.mutate({ id: rule.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
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

            {/* CPK Rules Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5" />
                  Tiêu chuẩn đánh giá CPK
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="font-bold text-green-700">Xuất sắc</div>
                    <div className="text-2xl font-mono text-green-600">≥ 1.67</div>
                    <div className="text-xs text-green-600 mt-1">6σ capability</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="font-bold text-blue-700">Tốt</div>
                    <div className="text-2xl font-mono text-blue-600">1.33 - 1.67</div>
                    <div className="text-xs text-blue-600 mt-1">4σ capability</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <div className="font-bold text-yellow-700">Chấp nhận</div>
                    <div className="text-2xl font-mono text-yellow-600">1.00 - 1.33</div>
                    <div className="text-xs text-yellow-600 mt-1">3σ capability</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="font-bold text-orange-700">Kém</div>
                    <div className="text-2xl font-mono text-orange-600">0.67 - 1.00</div>
                    <div className="text-xs text-orange-600 mt-1">Cần cải tiến</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                    <div className="font-bold text-red-700">Không chấp nhận</div>
                    <div className="text-2xl font-mono text-red-600">&lt; 0.67</div>
                    <div className="text-xs text-red-600 mt-1">Dừng sản xuất</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit SPC Rule Dialog */}
        <Dialog open={!!editingSpcRule} onOpenChange={() => setEditingSpcRule(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa SPC Rule</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin và tiêu chuẩn của rule
              </DialogDescription>
            </DialogHeader>
            {editingSpcRule && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  updateSpcRule.mutate({
                    id: editingSpcRule.id,
                    code: formData.get("code") as string,
                    name: formData.get("name") as string,
                    description: formData.get("description") as string,
                    formula: formData.get("formula") as string,
                    example: formData.get("example") as string,
                    severity: formData.get("severity") as "warning" | "critical",
                    consecutivePoints: parseInt(formData.get("consecutivePoints") as string) || undefined,
                    sigmaLevel: parseInt(formData.get("sigmaLevel") as string) || undefined,
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Mã Rule</Label>
                    <Input id="code" name="code" defaultValue={editingSpcRule.code} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên Rule</Label>
                    <Input id="name" name="name" defaultValue={editingSpcRule.name} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea id="description" name="description" defaultValue={editingSpcRule.description || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formula">Công thức</Label>
                  <Input id="formula" name="formula" defaultValue={editingSpcRule.formula || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="example">Ví dụ</Label>
                  <Textarea id="example" name="example" defaultValue={editingSpcRule.example || ""} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="severity">Mức độ</Label>
                    <Select name="severity" defaultValue={editingSpcRule.severity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warning">Cảnh báo</SelectItem>
                        <SelectItem value="critical">Nghiêm trọng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consecutivePoints">Số điểm liên tiếp</Label>
                    <Input
                      id="consecutivePoints"
                      name="consecutivePoints"
                      type="number"
                      defaultValue={editingSpcRule.consecutivePoints || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sigmaLevel">Mức Sigma</Label>
                    <Input
                      id="sigmaLevel"
                      name="sigmaLevel"
                      type="number"
                      defaultValue={editingSpcRule.sigmaLevel || ""}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingSpcRule(null)}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={updateSpcRule.isPending}>
                    {updateSpcRule.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit CA Rule Dialog */}
        <Dialog open={!!editingCaRule} onOpenChange={() => setEditingCaRule(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa CA Rule</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin và tiêu chuẩn của rule
              </DialogDescription>
            </DialogHeader>
            {editingCaRule && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  updateCaRule.mutate({
                    id: editingCaRule.id,
                    code: formData.get("code") as string,
                    name: formData.get("name") as string,
                    description: formData.get("description") as string,
                    formula: formData.get("formula") as string,
                    example: formData.get("example") as string,
                    severity: formData.get("severity") as "warning" | "critical",
                    minValue: parseInt(formData.get("minValue") as string) || undefined,
                    maxValue: parseInt(formData.get("maxValue") as string) || undefined,
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Mã Rule</Label>
                    <Input id="code" name="code" defaultValue={editingCaRule.code} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên Rule</Label>
                    <Input id="name" name="name" defaultValue={editingCaRule.name} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea id="description" name="description" defaultValue={editingCaRule.description || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formula">Công thức</Label>
                  <Input id="formula" name="formula" defaultValue={editingCaRule.formula || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="example">Ví dụ</Label>
                  <Textarea id="example" name="example" defaultValue={editingCaRule.example || ""} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="severity">Mức độ</Label>
                    <Select name="severity" defaultValue={editingCaRule.severity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warning">Cảnh báo</SelectItem>
                        <SelectItem value="critical">Nghiêm trọng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minValue">Giá trị Min (×1000)</Label>
                    <Input
                      id="minValue"
                      name="minValue"
                      type="number"
                      defaultValue={editingCaRule.minValue || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxValue">Giá trị Max (×1000)</Label>
                    <Input
                      id="maxValue"
                      name="maxValue"
                      type="number"
                      defaultValue={editingCaRule.maxValue || ""}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingCaRule(null)}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={updateCaRule.isPending}>
                    {updateCaRule.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit CPK Rule Dialog */}
        <Dialog open={!!editingCpkRule} onOpenChange={() => setEditingCpkRule(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa CPK Rule</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin và tiêu chuẩn của rule
              </DialogDescription>
            </DialogHeader>
            {editingCpkRule && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  updateCpkRule.mutate({
                    id: editingCpkRule.id,
                    code: formData.get("code") as string,
                    name: formData.get("name") as string,
                    description: formData.get("description") as string,
                    status: formData.get("status") as string,
                    color: formData.get("color") as string,
                    action: formData.get("action") as string,
                    severity: formData.get("severity") as "info" | "warning" | "critical",
                    minCpk: parseInt(formData.get("minCpk") as string) || undefined,
                    maxCpk: parseInt(formData.get("maxCpk") as string) || undefined,
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Mã Rule</Label>
                    <Input id="code" name="code" defaultValue={editingCpkRule.code} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên Rule</Label>
                    <Input id="name" name="name" defaultValue={editingCpkRule.name} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea id="description" name="description" defaultValue={editingCpkRule.description || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="action">Hành động khuyến nghị</Label>
                  <Textarea id="action" name="action" defaultValue={editingCpkRule.action || ""} />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="severity">Mức độ</Label>
                    <Select name="severity" defaultValue={editingCpkRule.severity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Thông tin</SelectItem>
                        <SelectItem value="warning">Cảnh báo</SelectItem>
                        <SelectItem value="critical">Nghiêm trọng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Trạng thái</Label>
                    <Input id="status" name="status" defaultValue={editingCpkRule.status} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Màu</Label>
                    <Select name="color" defaultValue={editingCpkRule.color || ""}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="green">Xanh lá</SelectItem>
                        <SelectItem value="blue">Xanh dương</SelectItem>
                        <SelectItem value="yellow">Vàng</SelectItem>
                        <SelectItem value="orange">Cam</SelectItem>
                        <SelectItem value="red">Đỏ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minCpk">CPK Min (×1000)</Label>
                    <Input
                      id="minCpk"
                      name="minCpk"
                      type="number"
                      defaultValue={editingCpkRule.minCpk || ""}
                      placeholder="VD: 1330 = 1.33"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxCpk">CPK Max (×1000)</Label>
                    <Input
                      id="maxCpk"
                      name="maxCpk"
                      type="number"
                      defaultValue={editingCpkRule.maxCpk || ""}
                      placeholder="VD: 1670 = 1.67"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingCpkRule(null)}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={updateCpkRule.isPending}>
                    {updateCpkRule.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Add SPC Rule Dialog */}
        <Dialog open={isAddingSpcRule} onOpenChange={setIsAddingSpcRule}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Thêm SPC Rule mới</DialogTitle>
              <DialogDescription>
                Tạo quy tắc SPC mới cho hệ thống
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createSpcRule.mutate({
                  code: formData.get("code") as string,
                  name: formData.get("name") as string,
                  description: formData.get("description") as string,
                  formula: formData.get("formula") as string,
                  example: formData.get("example") as string,
                  severity: formData.get("severity") as "warning" | "critical",
                  consecutivePoints: parseInt(formData.get("consecutivePoints") as string) || undefined,
                  sigmaLevel: parseInt(formData.get("sigmaLevel") as string) || undefined,
                  sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Mã Rule *</Label>
                  <Input id="code" name="code" required placeholder="VD: RULE9" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Tên Rule *</Label>
                  <Input id="name" name="name" required placeholder="Tên mô tả rule" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea id="description" name="description" placeholder="Mô tả chi tiết rule" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="formula">Công thức</Label>
                <Input id="formula" name="formula" placeholder="Công thức/điều kiện" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="example">Ví dụ</Label>
                <Textarea id="example" name="example" placeholder="Ví dụ minh họa" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="severity">Mức độ</Label>
                  <Select name="severity" defaultValue="warning">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warning">Cảnh báo</SelectItem>
                      <SelectItem value="critical">Nghiêm trọng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consecutivePoints">Số điểm liên tiếp</Label>
                  <Input id="consecutivePoints" name="consecutivePoints" type="number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sigmaLevel">Mức Sigma</Label>
                  <Input id="sigmaLevel" name="sigmaLevel" type="number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Thứ tự</Label>
                  <Input id="sortOrder" name="sortOrder" type="number" defaultValue="0" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddingSpcRule(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={createSpcRule.isPending}>
                  {createSpcRule.isPending ? "Đang tạo..." : "Tạo Rule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add CA Rule Dialog */}
        <Dialog open={isAddingCaRule} onOpenChange={setIsAddingCaRule}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Thêm CA Rule mới</DialogTitle>
              <DialogDescription>
                Tạo quy tắc CA mới cho hệ thống
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createCaRule.mutate({
                  code: formData.get("code") as string,
                  name: formData.get("name") as string,
                  description: formData.get("description") as string,
                  formula: formData.get("formula") as string,
                  example: formData.get("example") as string,
                  severity: formData.get("severity") as "warning" | "critical",
                  minValue: parseInt(formData.get("minValue") as string) || undefined,
                  maxValue: parseInt(formData.get("maxValue") as string) || undefined,
                  sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Mã Rule *</Label>
                  <Input id="code" name="code" required placeholder="VD: CA_NEW" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Tên Rule *</Label>
                  <Input id="name" name="name" required placeholder="Tên mô tả rule" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea id="description" name="description" placeholder="Mô tả chi tiết rule" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="formula">Công thức</Label>
                <Input id="formula" name="formula" placeholder="Công thức/điều kiện" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="example">Ví dụ</Label>
                <Textarea id="example" name="example" placeholder="Ví dụ minh họa" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="severity">Mức độ</Label>
                  <Select name="severity" defaultValue="warning">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warning">Cảnh báo</SelectItem>
                      <SelectItem value="critical">Nghiêm trọng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minValue">Giá trị Min (×1000)</Label>
                  <Input id="minValue" name="minValue" type="number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxValue">Giá trị Max (×1000)</Label>
                  <Input id="maxValue" name="maxValue" type="number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Thứ tự</Label>
                  <Input id="sortOrder" name="sortOrder" type="number" defaultValue="0" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddingCaRule(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={createCaRule.isPending}>
                  {createCaRule.isPending ? "Đang tạo..." : "Tạo Rule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add CPK Rule Dialog */}
        <Dialog open={isAddingCpkRule} onOpenChange={setIsAddingCpkRule}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Thêm CPK Rule mới</DialogTitle>
              <DialogDescription>
                Tạo quy tắc CPK mới cho hệ thống
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createCpkRule.mutate({
                  code: formData.get("code") as string,
                  name: formData.get("name") as string,
                  description: formData.get("description") as string,
                  status: formData.get("status") as string,
                  color: formData.get("color") as string,
                  action: formData.get("action") as string,
                  severity: formData.get("severity") as "info" | "warning" | "critical",
                  minCpk: parseInt(formData.get("minCpk") as string) || undefined,
                  maxCpk: parseInt(formData.get("maxCpk") as string) || undefined,
                  sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Mã Rule *</Label>
                  <Input id="code" name="code" required placeholder="VD: CPK_NEW" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Tên Rule *</Label>
                  <Input id="name" name="name" required placeholder="Tên mô tả rule" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea id="description" name="description" placeholder="Mô tả chi tiết rule" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action">Hành động khuyến nghị</Label>
                <Textarea id="action" name="action" placeholder="Hành động cần thực hiện" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="severity">Mức độ</Label>
                  <Select name="severity" defaultValue="info">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Thông tin</SelectItem>
                      <SelectItem value="warning">Cảnh báo</SelectItem>
                      <SelectItem value="critical">Nghiêm trọng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Trạng thái *</Label>
                  <Input id="status" name="status" required placeholder="VD: excellent" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Màu</Label>
                  <Select name="color" defaultValue="green">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="green">Xanh lá</SelectItem>
                      <SelectItem value="blue">Xanh dương</SelectItem>
                      <SelectItem value="yellow">Vàng</SelectItem>
                      <SelectItem value="orange">Cam</SelectItem>
                      <SelectItem value="red">Đỏ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Thứ tự</Label>
                  <Input id="sortOrder" name="sortOrder" type="number" defaultValue="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minCpk">CPK Min (×1000)</Label>
                  <Input id="minCpk" name="minCpk" type="number" placeholder="VD: 1330 = 1.33" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxCpk">CPK Max (×1000)</Label>
                  <Input id="maxCpk" name="maxCpk" type="number" placeholder="VD: 1670 = 1.67" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddingCpkRule(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={createCpkRule.isPending}>
                  {createCpkRule.isPending ? "Đang tạo..." : "Tạo Rule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
      />
    </DashboardLayout>
  );
}
