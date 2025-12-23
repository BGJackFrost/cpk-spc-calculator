import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Cog, Search, Filter, Camera, X, Image as ImageIcon } from "lucide-react";
import ImageLightbox, { useImageLightbox } from "@/components/ImageLightbox";
import { useRef } from "react";

interface Machine {
  id: number;
  name: string;
  code: string;
  workstationId: number;
  machineTypeId: number | null;
  machineType: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  installDate: Date | null;
  status: "active" | "maintenance" | "inactive";
  imageUrl: string | null;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MachineType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: number;
}

interface Workstation {
  id: number;
  name: string;
  code: string;
  productionLineId: number;
}

export default function MachineManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [selectedWorkstationId, setSelectedWorkstationId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    workstationId: "",
    machineTypeId: "",
    machineType: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    imageUrl: "",
    isActive: true,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openLightbox, LightboxComponent } = useImageLightbox();

  const { data: machines, isLoading, refetch } = trpc.machine.listAll.useQuery();
  const { data: workstations } = trpc.workstation.listAll.useQuery();
  const { data: machineTypes } = trpc.machineType.list.useQuery();

  const createMutation = trpc.machine.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo máy mới");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateMutation = trpc.machine.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật máy");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const deleteMutation = trpc.machine.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa máy");
      refetch();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      workstationId: "",
      machineTypeId: "",
      machineType: "",
      manufacturer: "",
      model: "",
      serialNumber: "",
      imageUrl: "",
      isActive: true,
    });
    setEditingMachine(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (machine: Machine) => {
    setEditingMachine(machine);
    setFormData({
      name: machine.name,
      code: machine.code,
      workstationId: machine.workstationId.toString(),
      machineTypeId: machine.machineTypeId?.toString() || "none",
      machineType: machine.machineType || "",
      manufacturer: machine.manufacturer || "",
      model: machine.model || "",
      serialNumber: machine.serialNumber || "",
      imageUrl: machine.imageUrl || "",
      isActive: machine.isActive === 1,
    });
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 2MB");
      return;
    }
    
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            data: base64, 
            filename: file.name,
            contentType: file.type,
            folder: "machines" 
          }),
        });
        const result = await response.json();
        if (result.url) {
          setFormData(prev => ({ ...prev, imageUrl: result.url }));
          toast.success("Đã tải ảnh lên");
        } else {
          toast.error("Lỗi tải ảnh");
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Lỗi tải ảnh");
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.code || !formData.workstationId) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    const data = {
      name: formData.name,
      code: formData.code,
      workstationId: parseInt(formData.workstationId),
      machineTypeId: formData.machineTypeId && formData.machineTypeId !== "none" ? parseInt(formData.machineTypeId) : undefined,
      machineType: formData.machineType || undefined,
      manufacturer: formData.manufacturer || undefined,
      model: formData.model || undefined,
      serialNumber: formData.serialNumber || undefined,
      imageUrl: formData.imageUrl || undefined,
    };

    if (editingMachine) {
      updateMutation.mutate({ id: editingMachine.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa máy này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getWorkstationName = (wsId: number) => {
    return workstations?.find((ws: Workstation) => ws.id === wsId)?.name || "N/A";
  };

  // Filter machines
  const filteredMachines = machines?.filter((m: Machine) => {
    const matchesWorkstation = selectedWorkstationId === "all" || m.workstationId.toString() === selectedWorkstationId;
    const matchesSearch = !searchTerm || 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesWorkstation && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil((filteredMachines?.length || 0) / pageSize);
  const paginatedMachines = filteredMachines?.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page when filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleWorkstationChange = (value: string) => {
    setSelectedWorkstationId(value);
    setCurrentPage(1);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Máy</h1>
            <p className="text-muted-foreground mt-1">
              Quản lý các máy móc trong công trạm sản xuất
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm máy
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm theo tên hoặc mã..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-64">
                <Select value={selectedWorkstationId} onValueChange={handleWorkstationChange}>
                  <SelectTrigger>
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Lọc theo công trạm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả công trạm</SelectItem>
                    {workstations?.map((ws: Workstation) => (
                      <SelectItem key={ws.id} value={ws.id.toString()}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Machines Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog className="h-5 w-5" />
              Danh sách Máy ({filteredMachines?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Ảnh</TableHead>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên máy</TableHead>
                  <TableHead>Công trạm</TableHead>
                  <TableHead>Nhà sản xuất</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMachines?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Chưa có máy nào
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMachines?.map((m: Machine) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        {m.imageUrl ? (
                          <img 
                            src={m.imageUrl} 
                            alt={m.name} 
                            className="w-10 h-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openLightbox(m.imageUrl!)}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{m.code}</TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{getWorkstationName(m.workstationId)}</TableCell>
                      <TableCell>{m.manufacturer || "-"}</TableCell>
                      <TableCell>{m.model || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={m.isActive === 1 ? "default" : "secondary"}>
                          {m.isActive === 1 ? "Hoạt động" : "Tạm dừng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Hiển thị {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredMachines?.length || 0)} / {filteredMachines?.length || 0} máy
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </Button>
                  <span className="text-sm">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingMachine ? "Chỉnh sửa Máy" : "Thêm Máy mới"}
              </DialogTitle>
              <DialogDescription>
                Điền thông tin máy móc trong công trạm
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Mã máy *</Label>
                  <Input
                    id="code"
                    placeholder="VD: MC-001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    placeholder="VD: SN123456"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Tên máy *</Label>
                <Input
                  id="name"
                  placeholder="VD: Máy hàn tự động"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workstationId">Công trạm *</Label>
                  <Select
                    value={formData.workstationId}
                    onValueChange={(value) => setFormData({ ...formData, workstationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn công trạm" />
                    </SelectTrigger>
                    <SelectContent>
                      {workstations?.map((ws: Workstation) => (
                        <SelectItem key={ws.id} value={ws.id.toString()}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="machineTypeId">Loại máy</Label>
                  <Select
                    value={formData.machineTypeId}
                    onValueChange={(value) => setFormData({ ...formData, machineTypeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại máy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không chọn</SelectItem>
                      {machineTypes?.map((mt: MachineType) => (
                        <SelectItem key={mt.id} value={mt.id.toString()}>
                          {mt.name} ({mt.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Nhà sản xuất</Label>
                  <Input
                    id="manufacturer"
                    placeholder="VD: Panasonic"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    placeholder="VD: NPM-W2"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="machineType">Mô tả</Label>
                <Input
                  id="machineType"
                  placeholder="Mô tả máy..."
                  value={formData.machineType}
                  onChange={(e) => setFormData({ ...formData, machineType: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Ảnh máy</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted">
                    {formData.imageUrl ? (
                      <>
                        <img src={formData.imageUrl} alt="Máy" className="w-full h-full object-cover" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
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

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Trạng thái hoạt động</Label>
                  <p className="text-sm text-muted-foreground">
                    Máy đang hoạt động hay tạm dừng
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            <DialogFooter>
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
                {editingMachine ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <LightboxComponent />
    </DashboardLayout>
  );
}
