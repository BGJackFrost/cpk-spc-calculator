import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Factory, 
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Users,
  Cog,
  Package,
  GitBranch,
  Camera,
  Image
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProductionLine {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  productId?: number | null;
  processTemplateId?: number | null;
  supervisorId?: number | null;
  isActive: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Product {
  id: number;
  code: string;
  name: string;
}

interface ProcessTemplate {
  id: number;
  code: string;
  name: string;
}

interface User {
  id: number;
  name: string | null;
  email: string | null;
}

interface LineMachine {
  id: number;
  productionLineId: number;
  machineId: number;
  machineName?: string;
  machineCode?: string;
}

export default function ProductionLineManagement() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null);
  const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null);
  const [machineDialogOpen, setMachineDialogOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    location: "",
    imageUrl: "",
    productId: "",
    processTemplateId: "",
    supervisorId: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch data
  const { data: productionLines, isLoading, refetch } = trpc.productionLine.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();
  const { data: processTemplates } = trpc.processTemplate.list.useQuery();
  const { data: users } = trpc.user.list.useQuery();
  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: lineMachines, refetch: refetchLineMachines } = trpc.productionLine.listMachines.useQuery(
    { lineId: selectedLine?.id ?? 0 },
    { enabled: !!selectedLine }
  );

  // Mutations
  const createMutation = trpc.productionLine.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo dây chuyền thành công");
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(`Lỗi: ${err.message}`),
  });

  const updateMutation = trpc.productionLine.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật dây chuyền thành công");
      refetch();
      setEditingLine(null);
      resetForm();
    },
    onError: (err: any) => toast.error(`Lỗi: ${err.message}`),
  });

  const deleteMutation = trpc.productionLine.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa dây chuyền thành công");
      refetch();
      setSelectedLine(null);
    },
    onError: (err: any) => toast.error(`Lỗi: ${err.message}`),
  });

  const addMachineMutation = trpc.productionLine.addMachine.useMutation({
    onSuccess: () => {
      toast.success("Thêm máy thành công");
      refetchLineMachines();
      setMachineDialogOpen(false);
      setSelectedMachineId("");
    },
    onError: (err: any) => toast.error(`Lỗi: ${err.message}`),
  });

  const removeMachineMutation = trpc.productionLine.removeMachine.useMutation({
    onSuccess: () => {
      toast.success("Xóa máy thành công");
      refetchLineMachines();
    },
    onError: (err: any) => toast.error(`Lỗi: ${err.message}`),
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      location: "",
      imageUrl: "",
      productId: "",
      processTemplateId: "",
      supervisorId: "",
    });
  };

  const openEditDialog = (line: ProductionLine) => {
    setEditingLine(line);
    setFormData({
      code: line.code,
      name: line.name,
      description: line.description || "",
      location: line.location || "",
      imageUrl: line.imageUrl || "",
      productId: line.productId?.toString() || "",
      processTemplateId: line.processTemplateId?.toString() || "",
      supervisorId: line.supervisorId?.toString() || "",
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      code: formData.code,
      name: formData.name,
      description: formData.description || undefined,
      location: formData.location || undefined,
      imageUrl: formData.imageUrl || undefined,
      productId: formData.productId ? parseInt(formData.productId) : undefined,
      processTemplateId: formData.processTemplateId ? parseInt(formData.processTemplateId) : undefined,
      supervisorId: formData.supervisorId ? parseInt(formData.supervisorId) : undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingLine) return;
    updateMutation.mutate({
      id: editingLine.id,
      code: formData.code,
      name: formData.name,
      description: formData.description || undefined,
      location: formData.location || undefined,
      imageUrl: formData.imageUrl || undefined,
      productId: formData.productId ? parseInt(formData.productId) : undefined,
      processTemplateId: formData.processTemplateId ? parseInt(formData.processTemplateId) : undefined,
      supervisorId: formData.supervisorId ? parseInt(formData.supervisorId) : undefined,
    });
  };

  const handleAddMachine = () => {
    if (!selectedLine || !selectedMachineId) return;
    addMachineMutation.mutate({
      lineId: selectedLine.id,
      machineId: parseInt(selectedMachineId),
    });
  };

  const filteredLines = (productionLines || []).filter((line: ProductionLine) =>
    line.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    line.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProductName = (productId: number | null | undefined) => {
    if (!productId) return "-";
    const product = (products || []).find((p: Product) => p.id === productId);
    return product ? product.name : "-";
  };

  const getProcessName = (processId: number | null | undefined) => {
    if (!processId) return "-";
    const process = (processTemplates || []).find((p: ProcessTemplate) => p.id === processId);
    return process ? process.name : "-";
  };

  const getSupervisorName = (userId: number | null | undefined) => {
    if (!userId) return "-";
    const supervisor = (users || []).find((u: User) => u.id === userId);
    return supervisor ? (supervisor.name || supervisor.email || "-") : "-";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Dây chuyền Sản xuất</h1>
            <p className="text-muted-foreground">
              Cấu hình dây chuyền với Sản phẩm, Quy trình, Máy móc và Người phụ trách
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Thêm dây chuyền
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lines List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Danh sách Dây chuyền</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã</TableHead>
                      <TableHead>Tên dây chuyền</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Quy trình</TableHead>
                      <TableHead>Người phụ trách</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLines.map((line: ProductionLine) => (
                      <TableRow 
                        key={line.id} 
                        className={`cursor-pointer ${selectedLine?.id === line.id ? "bg-muted" : ""}`}
                        onClick={() => setSelectedLine(line)}
                      >
                        <TableCell className="font-medium">{line.code}</TableCell>
                        <TableCell>{line.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            {getProductName(line.productId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3 text-muted-foreground" />
                            {getProcessName(line.processTemplateId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {getSupervisorName(line.supervisorId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={line.isActive ? "default" : "secondary"}>
                            {line.isActive ? "Hoạt động" : "Tạm dừng"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditDialog(line); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: line.id }); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredLines.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Chưa có dây chuyền nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Line Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5" />
                {selectedLine ? `Máy móc - ${selectedLine.name}` : "Chi tiết dây chuyền"}
              </CardTitle>
              <CardDescription>
                {selectedLine ? "Danh sách máy được gán vào dây chuyền" : "Chọn một dây chuyền để xem chi tiết"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedLine ? (
                <div className="space-y-4">
                  <Button size="sm" onClick={() => setMachineDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Thêm máy
                  </Button>
                  <div className="divide-y">
                    {(lineMachines || []).map((lm: any) => (
                      <div key={lm.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{lm.machineName || `Máy #${lm.machineId}`}</p>
                          <div className="flex items-center gap-2">
                            {lm.machineCode && <span className="text-sm text-muted-foreground">{lm.machineCode}</span>}
                            {lm.machineTypeName && (
                              <Badge variant="outline" className="text-xs">{lm.machineTypeName}</Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeMachineMutation.mutate({ id: lm.id })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {(!lineMachines || lineMachines.length === 0) && (
                      <p className="text-center py-4 text-muted-foreground">Chưa có máy nào</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Chọn một dây chuyền để xem máy móc</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateDialogOpen || !!editingLine} onOpenChange={(open) => { if (!open) { setIsCreateDialogOpen(false); setEditingLine(null); resetForm(); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLine ? "Sửa Dây chuyền" : "Thêm Dây chuyền"}</DialogTitle>
              <DialogDescription>Cấu hình thông tin dây chuyền sản xuất</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mã dây chuyền *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="VD: LINE-SMT-01"
                />
              </div>
              <div className="space-y-2">
                <Label>Tên dây chuyền *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Dây chuyền SMT 1"
                />
              </div>
              <div className="space-y-2">
                <Label>Sản phẩm</Label>
                <Select value={formData.productId} onValueChange={(v) => setFormData({ ...formData, productId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    {(products || []).map((p: Product) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quy trình sản xuất</Label>
                <Select value={formData.processTemplateId} onValueChange={(v) => setFormData({ ...formData, processTemplateId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn quy trình" />
                  </SelectTrigger>
                  <SelectContent>
                    {(processTemplates || []).map((p: ProcessTemplate) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Người phụ trách</Label>
                <Select value={formData.supervisorId} onValueChange={(v) => setFormData({ ...formData, supervisorId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn người phụ trách" />
                  </SelectTrigger>
                  <SelectContent>
                    {(users || []).map((u: User) => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vị trí</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="VD: Nhà xưởng A, Tầng 2"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả dây chuyền..."
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Ảnh dây chuyền</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 rounded-lg">
                    {formData.imageUrl ? (
                      <AvatarImage src={formData.imageUrl} alt="Ảnh dây chuyền" className="object-cover" />
                    ) : null}
                    <AvatarFallback className="rounded-lg bg-muted">
                      <Factory className="h-8 w-8 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("Ảnh phải nhỏ hơn 2MB");
                          return;
                        }
                        setUploadingImage(true);
                        try {
                          const reader = new FileReader();
                          reader.onload = async () => {
                            const base64 = reader.result as string;
                            const res = await fetch("/api/upload", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ data: base64, filename: file.name }),
                            });
                            const json = await res.json();
                            if (json.url) {
                              setFormData({ ...formData, imageUrl: json.url });
                              toast.success("Upload ảnh thành công");
                            }
                            setUploadingImage(false);
                          };
                          reader.readAsDataURL(file);
                        } catch (err) {
                          toast.error("Lỗi upload ảnh");
                          setUploadingImage(false);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                      {uploadingImage ? "Đang tải..." : "Chọn ảnh"}
                    </Button>
                    {formData.imageUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, imageUrl: "" })}
                      >
                        Xóa ảnh
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setEditingLine(null); resetForm(); }}>Hủy</Button>
              <Button onClick={editingLine ? handleUpdate : handleCreate}>
                {editingLine ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Machine Dialog */}
        <Dialog open={machineDialogOpen} onOpenChange={setMachineDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm Máy vào Dây chuyền</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Chọn máy</Label>
                <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn máy" />
                  </SelectTrigger>
                  <SelectContent>
                    {(machines || []).map((m: any) => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.name} ({m.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMachineDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleAddMachine}>Thêm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
