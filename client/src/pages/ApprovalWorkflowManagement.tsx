import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  GitBranch, Plus, Pencil, Trash2, Save, Loader2, 
  ArrowUp, ArrowDown, CheckCircle, XCircle, Clock
} from "lucide-react";

interface Workflow {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  entityType: string;
  isActive: number;
}

interface ApprovalStep {
  id: number;
  workflowId: number;
  stepOrder: number;
  name: string;
  approverType: string;
  approverId?: number | null;
  minAmount?: string | null;
  maxAmount?: string | null;
  isRequired: number;
}

interface Position {
  id: number;
  code: string;
  name: string;
  level: number;
}

const ENTITY_TYPES = [
  { value: "purchase_order", label: "Đơn đặt hàng" },
  { value: "stock_export", label: "Xuất kho" },
  { value: "maintenance_request", label: "Yêu cầu bảo trì" },
  { value: "leave_request", label: "Đơn nghỉ phép" },
];

const APPROVER_TYPES = [
  { value: "position", label: "Theo chức vụ" },
  { value: "user", label: "Người dùng cụ thể" },
  { value: "manager", label: "Quản lý trực tiếp" },
  { value: "department_head", label: "Trưởng phòng" },
];

export default function ApprovalWorkflowManagement() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [editingStep, setEditingStep] = useState<ApprovalStep | null>(null);
  
  const [workflowForm, setWorkflowForm] = useState({
    code: "",
    name: "",
    description: "",
    entityType: "purchase_order",
    isActive: true,
  });

  const [stepForm, setStepForm] = useState({
    stepOrder: "1",
    name: "",
    approverType: "position",
    approverId: "",
    minAmount: "",
    maxAmount: "",
    isRequired: true,
  });

  // Queries
  const { data: workflows, isLoading: loadingWorkflows, refetch: refetchWorkflows } = 
    trpc.approval.listWorkflows.useQuery();
  const { data: steps, refetch: refetchSteps } = 
    trpc.approval.listSteps.useQuery({ workflowId: selectedWorkflow?.id || 0 }, { enabled: !!selectedWorkflow });
  const { data: positions } = trpc.organization.listPositions.useQuery();
  const { data: users } = trpc.user.list.useQuery();

  // Mutations
  const createWorkflowMutation = trpc.approval.createWorkflow.useMutation({
    onSuccess: () => {
      toast.success("Tạo quy trình phê duyệt thành công");
      refetchWorkflows();
      setIsWorkflowDialogOpen(false);
      resetWorkflowForm();
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateWorkflowMutation = trpc.approval.updateWorkflow.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật quy trình thành công");
      refetchWorkflows();
      setIsWorkflowDialogOpen(false);
      setEditingWorkflow(null);
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  const deleteWorkflowMutation = trpc.approval.deleteWorkflow.useMutation({
    onSuccess: () => {
      toast.success("Xóa quy trình thành công");
      refetchWorkflows();
      setSelectedWorkflow(null);
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  const createStepMutation = trpc.approval.createStep.useMutation({
    onSuccess: () => {
      toast.success("Thêm bước phê duyệt thành công");
      refetchSteps();
      setIsStepDialogOpen(false);
      resetStepForm();
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateStepMutation = trpc.approval.updateStep.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật bước phê duyệt thành công");
      refetchSteps();
      setIsStepDialogOpen(false);
      setEditingStep(null);
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  const deleteStepMutation = trpc.approval.deleteStep.useMutation({
    onSuccess: () => {
      toast.success("Xóa bước phê duyệt thành công");
      refetchSteps();
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  const reorderStepMutation = trpc.approval.reorderStep.useMutation({
    onSuccess: () => {
      refetchSteps();
    },
    onError: (error: any) => toast.error(`Lỗi: ${error.message}`),
  });

  // Reset forms
  const resetWorkflowForm = () => setWorkflowForm({ code: "", name: "", description: "", entityType: "purchase_order", isActive: true });
  const resetStepForm = () => setStepForm({ stepOrder: "1", name: "", approverType: "position", approverId: "", minAmount: "", maxAmount: "", isRequired: true });

  // Handlers
  const handleEditWorkflow = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setWorkflowForm({
      code: workflow.code,
      name: workflow.name,
      description: workflow.description || "",
      entityType: workflow.entityType,
      isActive: workflow.isActive === 1,
    });
    setIsWorkflowDialogOpen(true);
  };

  const handleSaveWorkflow = () => {
    const data = {
      ...workflowForm,
      entityType: workflowForm.entityType as "purchase_order" | "stock_export" | "maintenance_request" | "leave_request",
    };
    if (editingWorkflow) {
      updateWorkflowMutation.mutate({ id: editingWorkflow.id, ...data });
    } else {
      createWorkflowMutation.mutate(data);
    }
  };

  const handleDeleteWorkflow = (workflow: Workflow) => {
    if (confirm(`Bạn có chắc muốn xóa quy trình "${workflow.name}"?`)) {
      deleteWorkflowMutation.mutate({ id: workflow.id });
    }
  };

  const handleEditStep = (step: ApprovalStep) => {
    setEditingStep(step);
    setStepForm({
      stepOrder: String(step.stepOrder),
      name: step.name,
      approverType: step.approverType,
      approverId: step.approverId ? String(step.approverId) : "",
      minAmount: step.minAmount || "",
      maxAmount: step.maxAmount || "",
      isRequired: step.isRequired === 1,
    });
    setIsStepDialogOpen(true);
  };

  const handleSaveStep = () => {
    if (!selectedWorkflow) return;
    const data = {
      workflowId: selectedWorkflow.id,
      stepOrder: Number(stepForm.stepOrder),
      name: stepForm.name,
      approverType: stepForm.approverType as "position" | "user" | "manager" | "department_head",
      approverId: stepForm.approverId ? Number(stepForm.approverId) : undefined,
      minAmount: stepForm.minAmount ? Number(stepForm.minAmount) : undefined,
      maxAmount: stepForm.maxAmount ? Number(stepForm.maxAmount) : undefined,
      isRequired: stepForm.isRequired,
    };
    if (editingStep) {
      updateStepMutation.mutate({ id: editingStep.id, ...data });
    } else {
      createStepMutation.mutate(data);
    }
  };

  const handleDeleteStep = (step: ApprovalStep) => {
    if (confirm(`Bạn có chắc muốn xóa bước "${step.name}"?`)) {
      deleteStepMutation.mutate({ id: step.id });
    }
  };

  const handleMoveStep = (step: ApprovalStep, direction: "up" | "down") => {
    reorderStepMutation.mutate({ id: step.id, direction });
  };

  const getEntityTypeLabel = (type: string) => ENTITY_TYPES.find(t => t.value === type)?.label || type;
  const getApproverTypeLabel = (type: string) => APPROVER_TYPES.find(t => t.value === type)?.label || type;
  const getPositionName = (id: number | null | undefined) => (positions as Position[] | undefined)?.find(p => p.id === id)?.name || "-";
  const getUserName = (id: number | null | undefined) => (users as any[] | undefined)?.find(u => u.id === id)?.name || "-";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Quy trình Phê duyệt</h1>
            <p className="text-muted-foreground">Cấu hình các bước phê duyệt theo chức vụ</p>
          </div>
          <Button onClick={() => { resetWorkflowForm(); setEditingWorkflow(null); setIsWorkflowDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm Quy trình
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Workflows List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Danh sách Quy trình
              </CardTitle>
              <CardDescription>Chọn quy trình để xem và cấu hình các bước</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingWorkflows ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {workflows?.map((wf: Workflow) => (
                    <div 
                      key={wf.id} 
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedWorkflow?.id === wf.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedWorkflow(wf)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{wf.name}</div>
                          <div className="text-sm text-muted-foreground">{wf.code}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={wf.isActive ? "default" : "secondary"}>
                            {getEntityTypeLabel(wf.entityType)}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditWorkflow(wf); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(wf); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {wf.description && (
                        <div className="text-sm text-muted-foreground mt-1">{wf.description}</div>
                      )}
                    </div>
                  ))}
                  {(!workflows || workflows.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      Chưa có quy trình phê duyệt nào
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Steps Configuration */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Các bước Phê duyệt</CardTitle>
                <CardDescription>
                  {selectedWorkflow ? `Quy trình: ${selectedWorkflow.name}` : "Chọn quy trình để xem các bước"}
                </CardDescription>
              </div>
              {selectedWorkflow && (
                <Button onClick={() => { resetStepForm(); setEditingStep(null); setIsStepDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Bước
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!selectedWorkflow ? (
                <div className="text-center text-muted-foreground py-8">
                  Chọn một quy trình để xem và cấu hình các bước phê duyệt
                </div>
              ) : (
                <div className="space-y-3">
                  {steps?.sort((a: ApprovalStep, b: ApprovalStep) => a.stepOrder - b.stepOrder).map((step: ApprovalStep, index: number) => (
                    <div key={step.id} className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              disabled={index === 0}
                              onClick={() => handleMoveStep(step, "up")}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              disabled={index === (steps?.length || 0) - 1}
                              onClick={() => handleMoveStep(step, "down")}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                            {step.stepOrder}
                          </div>
                          <div>
                            <div className="font-medium">{step.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {getApproverTypeLabel(step.approverType)}
                              {step.approverType === "position" && step.approverId && ` - ${getPositionName(step.approverId)}`}
                              {step.approverType === "user" && step.approverId && ` - ${getUserName(step.approverId)}`}
                            </div>
                            {(step.minAmount || step.maxAmount) && (
                              <div className="text-xs text-muted-foreground">
                                Giá trị: {step.minAmount ? `từ ${Number(step.minAmount).toLocaleString()}đ` : ""} 
                                {step.maxAmount ? ` đến ${Number(step.maxAmount).toLocaleString()}đ` : ""}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={step.isRequired ? "default" : "outline"}>
                            {step.isRequired ? "Bắt buộc" : "Tùy chọn"}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => handleEditStep(step)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteStep(step)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!steps || steps.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      Chưa có bước phê duyệt nào
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workflow Dialog */}
        <Dialog open={isWorkflowDialogOpen} onOpenChange={setIsWorkflowDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWorkflow ? "Sửa Quy trình" : "Thêm Quy trình Phê duyệt"}</DialogTitle>
              <DialogDescription>Nhập thông tin quy trình phê duyệt</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã quy trình *</Label>
                  <Input
                    value={workflowForm.code}
                    onChange={(e) => setWorkflowForm({ ...workflowForm, code: e.target.value })}
                    placeholder="VD: PO_APPROVAL"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên quy trình *</Label>
                  <Input
                    value={workflowForm.name}
                    onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
                    placeholder="Tên quy trình"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Loại đối tượng *</Label>
                <Select value={workflowForm.entityType} onValueChange={(v) => setWorkflowForm({ ...workflowForm, entityType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={workflowForm.description}
                  onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })}
                  placeholder="Mô tả quy trình"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={workflowForm.isActive}
                  onCheckedChange={(checked) => setWorkflowForm({ ...workflowForm, isActive: checked })}
                />
                <Label>Kích hoạt</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsWorkflowDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSaveWorkflow} disabled={createWorkflowMutation.isPending || updateWorkflowMutation.isPending}>
                {(createWorkflowMutation.isPending || updateWorkflowMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Step Dialog */}
        <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStep ? "Sửa Bước Phê duyệt" : "Thêm Bước Phê duyệt"}</DialogTitle>
              <DialogDescription>Cấu hình bước phê duyệt trong quy trình</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Thứ tự bước *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={stepForm.stepOrder}
                    onChange={(e) => setStepForm({ ...stepForm, stepOrder: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên bước *</Label>
                  <Input
                    value={stepForm.name}
                    onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })}
                    placeholder="VD: Trưởng phòng duyệt"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Loại người phê duyệt *</Label>
                <Select value={stepForm.approverType} onValueChange={(v) => setStepForm({ ...stepForm, approverType: v, approverId: "" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {stepForm.approverType === "position" && (
                <div className="space-y-2">
                  <Label>Chức vụ phê duyệt</Label>
                  <Select value={stepForm.approverId} onValueChange={(v) => setStepForm({ ...stepForm, approverId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chức vụ" />
                    </SelectTrigger>
                    <SelectContent>
                      {(positions as Position[] | undefined)?.map((p: Position) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name} (Cấp {p.level})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {stepForm.approverType === "user" && (
                <div className="space-y-2">
                  <Label>Người phê duyệt</Label>
                  <Select value={stepForm.approverId} onValueChange={(v) => setStepForm({ ...stepForm, approverId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn người dùng" />
                    </SelectTrigger>
                    <SelectContent>
                      {(users as any[] | undefined)?.map((u: any) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Giá trị tối thiểu (VND)</Label>
                  <Input
                    type="number"
                    value={stepForm.minAmount}
                    onChange={(e) => setStepForm({ ...stepForm, minAmount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giá trị tối đa (VND)</Label>
                  <Input
                    type="number"
                    value={stepForm.maxAmount}
                    onChange={(e) => setStepForm({ ...stepForm, maxAmount: e.target.value })}
                    placeholder="Không giới hạn"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={stepForm.isRequired}
                  onCheckedChange={(checked) => setStepForm({ ...stepForm, isRequired: checked })}
                />
                <Label>Bước bắt buộc</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStepDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSaveStep} disabled={createStepMutation.isPending || updateStepMutation.isPending}>
                {(createStepMutation.isPending || updateStepMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
