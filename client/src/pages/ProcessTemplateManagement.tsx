import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, Settings, ArrowUp, ArrowDown, Cog, Camera, X, Loader2 } from "lucide-react";
import { useRef } from "react";

interface ProcessTemplate {
  id: number;
  name: string;
  code: string;
  description: string | null;
  version: string | null;
  imageUrl: string | null;
  isActive: number;
  createdAt: Date;
}

interface ProcessStep {
  id: number;
  processTemplateId: number;
  name: string;
  code: string;
  description: string | null;
  sequenceOrder: number;
  standardTime: number | null;
  isRequired: number;
  isActive: number;
}

interface ProcessStepMachine {
  id: number;
  processStepId: number;
  machineName: string;
  machineCode: string | null;
  isRequired: number;
  quantity: number;
}

export default function ProcessTemplateManagement() {
  const [selectedTemplate, setSelectedTemplate] = useState<ProcessTemplate | null>(null);
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null);
  
  // Template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProcessTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    code: "",
    description: "",
    version: "1.0",
    imageUrl: "",
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step dialog
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ProcessStep | null>(null);
  const [stepForm, setStepForm] = useState({
    name: "",
    code: "",
    description: "",
    standardTime: 0,
    isRequired: true,
  });

  // Machine dialog
  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<ProcessStepMachine | null>(null);
  const [machineForm, setMachineForm] = useState({
    machineName: "",
    machineCode: "",
    isRequired: true,
    quantity: 1,
  });

  // Queries
  const templatesQuery = trpc.processTemplate.list.useQuery();
  const stepsQuery = trpc.processTemplate.listSteps.useQuery(
    { templateId: selectedTemplate?.id ?? 0 },
    { enabled: !!selectedTemplate }
  );
  const machinesQuery = trpc.processTemplate.listStepMachines.useQuery(
    { stepId: selectedStep?.id ?? 0 },
    { enabled: !!selectedStep }
  );

  // Mutations
  const createTemplateMutation = trpc.processTemplate.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo quy trình thành công");
      templatesQuery.refetch();
      setTemplateDialogOpen(false);
      resetTemplateForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateTemplateMutation = trpc.processTemplate.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật quy trình thành công");
      templatesQuery.refetch();
      setTemplateDialogOpen(false);
      resetTemplateForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTemplateMutation = trpc.processTemplate.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa quy trình thành công");
      templatesQuery.refetch();
      setSelectedTemplate(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createStepMutation = trpc.processTemplate.createStep.useMutation({
    onSuccess: () => {
      toast.success("Thêm công đoạn thành công");
      stepsQuery.refetch();
      setStepDialogOpen(false);
      resetStepForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStepMutation = trpc.processTemplate.updateStep.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật công đoạn thành công");
      stepsQuery.refetch();
      setStepDialogOpen(false);
      resetStepForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteStepMutation = trpc.processTemplate.deleteStep.useMutation({
    onSuccess: () => {
      toast.success("Xóa công đoạn thành công");
      stepsQuery.refetch();
      setSelectedStep(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const moveStepMutation = trpc.processTemplate.moveStep.useMutation({
    onSuccess: () => {
      stepsQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createMachineMutation = trpc.processTemplate.createStepMachine.useMutation({
    onSuccess: () => {
      toast.success("Thêm máy thành công");
      machinesQuery.refetch();
      setMachineDialogOpen(false);
      resetMachineForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMachineMutation = trpc.processTemplate.deleteStepMachine.useMutation({
    onSuccess: () => {
      toast.success("Xóa máy thành công");
      machinesQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Form handlers
  const resetTemplateForm = () => {
    setTemplateForm({ name: "", code: "", description: "", version: "1.0", imageUrl: "" });
    setEditingTemplate(null);
  };

  const resetStepForm = () => {
    setStepForm({ name: "", code: "", description: "", standardTime: 0, isRequired: true });
    setEditingStep(null);
  };

  const resetMachineForm = () => {
    setMachineForm({ machineName: "", machineCode: "", isRequired: true, quantity: 1 });
    setEditingMachine(null);
  };

  const openEditTemplate = (template: ProcessTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      code: template.code,
      description: template.description || "",
      version: template.version || "1.0",
      imageUrl: template.imageUrl || "",
    });
    setTemplateDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setTemplateForm(prev => ({ ...prev, imageUrl: data.url }));
      toast.success("Đã tải ảnh lên thành công");
    } catch (error) {
      toast.error("Lỗi khi tải ảnh lên");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openEditStep = (step: ProcessStep) => {
    setEditingStep(step);
    setStepForm({
      name: step.name,
      code: step.code,
      description: step.description || "",
      standardTime: step.standardTime || 0,
      isRequired: step.isRequired === 1,
    });
    setStepDialogOpen(true);
  };

  const handleCreateTemplate = () => {
    createTemplateMutation.mutate(templateForm);
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return;
    updateTemplateMutation.mutate({ id: editingTemplate.id, ...templateForm });
  };

  const handleCreateStep = () => {
    if (!selectedTemplate) return;
    const steps = stepsQuery.data || [];
    createStepMutation.mutate({
      processTemplateId: selectedTemplate.id,
      ...stepForm,
      sequenceOrder: steps.length + 1,
      isRequired: stepForm.isRequired ? 1 : 0,
    });
  };

  const handleUpdateStep = () => {
    if (!editingStep) return;
    updateStepMutation.mutate({
      id: editingStep.id,
      ...stepForm,
      isRequired: stepForm.isRequired ? 1 : 0,
    });
  };

  const handleMoveStep = (stepId: number, direction: "up" | "down") => {
    moveStepMutation.mutate({ stepId, direction });
  };

  const handleCreateMachine = () => {
    if (!selectedStep) return;
    createMachineMutation.mutate({
      processStepId: selectedStep.id,
      ...machineForm,
      isRequired: machineForm.isRequired ? 1 : 0,
    });
  };

  const templates = templatesQuery.data || [];
  const steps = stepsQuery.data || [];
  const machines = machinesQuery.data || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Quy trình Sản xuất</h1>
            <p className="text-muted-foreground">
              Tạo và quản lý các mẫu quy trình sản xuất với các công đoạn và máy móc
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Danh sách Quy trình</CardTitle>
              <Button size="sm" onClick={() => { resetTemplateForm(); setTemplateDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Thêm
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {templates.map((template: ProcessTemplate) => (
                  <div
                    key={template.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedTemplate?.id === template.id ? "bg-muted" : ""
                    }`}
                    onClick={() => { setSelectedTemplate(template); setSelectedStep(null); }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Hoạt động" : "Tạm dừng"}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditTemplate(template); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteTemplateMutation.mutate({ id: template.id }); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    )}
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    Chưa có quy trình nào
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Steps List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Công đoạn {selectedTemplate ? `- ${selectedTemplate.name}` : ""}
              </CardTitle>
              {selectedTemplate && (
                <Button size="sm" onClick={() => { resetStepForm(); setStepDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Thêm
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {selectedTemplate ? (
                <div className="divide-y">
                  {steps.map((step: ProcessStep, index: number) => (
                    <div
                      key={step.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedStep?.id === step.id ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedStep(step)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {step.sequenceOrder}
                          </div>
                          <div>
                            <p className="font-medium">{step.name}</p>
                            <p className="text-sm text-muted-foreground">{step.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === 0}
                            onClick={(e) => { e.stopPropagation(); handleMoveStep(step.id, "up"); }}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === steps.length - 1}
                            onClick={(e) => { e.stopPropagation(); handleMoveStep(step.id, "down"); }}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditStep(step); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteStepMutation.mutate({ id: step.id }); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {step.standardTime && (
                        <p className="text-sm text-muted-foreground mt-1 ml-11">
                          Thời gian: {step.standardTime}s
                        </p>
                      )}
                    </div>
                  ))}
                  {steps.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      Chưa có công đoạn nào
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Chọn một quy trình để xem công đoạn
                </div>
              )}
            </CardContent>
          </Card>

          {/* Machines List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Máy móc {selectedStep ? `- ${selectedStep.name}` : ""}
              </CardTitle>
              {selectedStep && (
                <Button size="sm" onClick={() => { resetMachineForm(); setMachineDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Thêm
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {selectedStep ? (
                <div className="divide-y">
                  {machines.map((machine: ProcessStepMachine) => (
                    <div key={machine.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Cog className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{machine.machineName}</p>
                            {machine.machineCode && (
                              <p className="text-sm text-muted-foreground">{machine.machineCode}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">x{machine.quantity}</Badge>
                          <Badge variant={machine.isRequired ? "default" : "secondary"}>
                            {machine.isRequired ? "Bắt buộc" : "Tùy chọn"}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => deleteMachineMutation.mutate({ id: machine.id })}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {machines.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      Chưa có máy nào
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Chọn một công đoạn để xem máy móc
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Template Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Sửa Quy trình" : "Thêm Quy trình"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên quy trình *</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="VD: Quy trình SMT"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã quy trình *</Label>
                  <Input
                    value={templateForm.code}
                    onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value })}
                    placeholder="VD: QT-SMT-001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phiên bản</Label>
                <Input
                  value={templateForm.version}
                  onChange={(e) => setTemplateForm({ ...templateForm, version: e.target.value })}
                  placeholder="VD: 1.0"
                />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Mô tả quy trình..."
                />
              </div>
              <div className="space-y-2">
                <Label>Ảnh quy trình</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted">
                    {templateForm.imageUrl ? (
                      <>
                        <img src={templateForm.imageUrl} alt="Quy trình" className="w-full h-full object-cover" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => setTemplateForm(prev => ({ ...prev, imageUrl: "" }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải...</>
                      ) : (
                        <><Camera className="mr-2 h-4 w-4" /> Chọn ảnh</>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">Tối đa 2MB, định dạng JPG/PNG</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Hủy</Button>
              <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
                {editingTemplate ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Step Dialog */}
        <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStep ? "Sửa Công đoạn" : "Thêm Công đoạn"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên công đoạn *</Label>
                  <Input
                    value={stepForm.name}
                    onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })}
                    placeholder="VD: In kem hàn"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã công đoạn *</Label>
                  <Input
                    value={stepForm.code}
                    onChange={(e) => setStepForm({ ...stepForm, code: e.target.value })}
                    placeholder="VD: SMT-01"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Thời gian tiêu chuẩn (giây)</Label>
                <Input
                  type="number"
                  value={stepForm.standardTime}
                  onChange={(e) => setStepForm({ ...stepForm, standardTime: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={stepForm.description}
                  onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                  placeholder="Mô tả công đoạn..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={stepForm.isRequired}
                  onCheckedChange={(checked) => setStepForm({ ...stepForm, isRequired: checked })}
                />
                <Label>Công đoạn bắt buộc</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStepDialogOpen(false)}>Hủy</Button>
              <Button onClick={editingStep ? handleUpdateStep : handleCreateStep}>
                {editingStep ? "Cập nhật" : "Thêm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Machine Dialog */}
        <Dialog open={machineDialogOpen} onOpenChange={setMachineDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm Máy vào Công đoạn</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên máy *</Label>
                  <Input
                    value={machineForm.machineName}
                    onChange={(e) => setMachineForm({ ...machineForm, machineName: e.target.value })}
                    placeholder="VD: Máy in kem hàn DEK"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mã máy</Label>
                  <Input
                    value={machineForm.machineCode}
                    onChange={(e) => setMachineForm({ ...machineForm, machineCode: e.target.value })}
                    placeholder="VD: DEK-001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Số lượng</Label>
                <Input
                  type="number"
                  min={1}
                  value={machineForm.quantity}
                  onChange={(e) => setMachineForm({ ...machineForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={machineForm.isRequired}
                  onCheckedChange={(checked) => setMachineForm({ ...machineForm, isRequired: checked })}
                />
                <Label>Máy bắt buộc</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMachineDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleCreateMachine}>Thêm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
