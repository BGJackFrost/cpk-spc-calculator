import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Plus, Pencil, Trash2, Monitor, Search, Filter, Camera, X, Image as ImageIcon } from "lucide-react";
import ImageLightbox, { useImageLightbox } from "@/components/ImageLightbox";
import { useRef } from "react";

interface Workstation {
  id: number;
  name: string;
  code: string;
  productionLineId: number;
  description: string | null;
  sequenceOrder: number;
  cycleTime: number | null;
  imageUrl: string | null;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function WorkstationManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkstation, setEditingWorkstation] = useState<Workstation | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    productionLineId: "",
    description: "",
    sequence: 1,
    imageUrl: "",
    isActive: true,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openLightbox, LightboxComponent } = useImageLightbox();

  const { data: workstations, isLoading, refetch } = trpc.workstation.listAll.useQuery();
  const { data: productionLines } = trpc.productionLine.list.useQuery();

  const createMutation = trpc.workstation.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo công trạm mới");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateMutation = trpc.workstation.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật công trạm");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const deleteMutation = trpc.workstation.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa công trạm");
      refetch();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      productionLineId: "",
      description: "",
      sequence: 1,
      imageUrl: "",
      isActive: true,
    });
    setEditingWorkstation(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (workstation: Workstation) => {
    setEditingWorkstation(workstation);
    setFormData({
      name: workstation.name,
      code: workstation.code,
      productionLineId: workstation.productionLineId.toString(),
      description: workstation.description || "",
      sequence: workstation.sequenceOrder,
      imageUrl: workstation.imageUrl || "",
      isActive: workstation.isActive === 1,
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
            folder: "workstations" 
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
    if (!formData.name || !formData.code || !formData.productionLineId) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    const data = {
      name: formData.name,
      code: formData.code,
      productionLineId: parseInt(formData.productionLineId),
      description: formData.description || undefined,
      sequenceOrder: formData.sequence,
      imageUrl: formData.imageUrl || undefined,
    };

    if (editingWorkstation) {
      updateMutation.mutate({ id: editingWorkstation.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa công trạm này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getProductionLineName = (lineId: number) => {
    return productionLines?.find(l => l.id === lineId)?.name || "N/A";
  };

  // Filter workstations
  const filteredWorkstations = workstations?.filter((ws: Workstation) => {
    const matchesLine = selectedLineId === "all" || ws.productionLineId.toString() === selectedLineId;
    const matchesSearch = !searchTerm || 
      ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ws.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLine && matchesSearch;
  });

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
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Công trạm</h1>
            <p className="text-muted-foreground mt-1">
              Quản lý các công trạm trong dây chuyền sản xuất
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm công trạm
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-64">
                <Select value={selectedLineId} onValueChange={setSelectedLineId}>
                  <SelectTrigger>
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Lọc theo dây chuyền" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả dây chuyền</SelectItem>
                    {productionLines?.map((line) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workstations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Danh sách Công trạm ({filteredWorkstations?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Ảnh</TableHead>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên công trạm</TableHead>
                  <TableHead>Dây chuyền</TableHead>
                  <TableHead>Thứ tự</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkstations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Chưa có công trạm nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkstations?.map((ws: Workstation) => (
                    <TableRow key={ws.id}>
                      <TableCell>
                        {ws.imageUrl ? (
                          <img 
                            src={ws.imageUrl} 
                            alt={ws.name} 
                            className="w-10 h-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openLightbox(ws.imageUrl!)}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{ws.code}</TableCell>
                      <TableCell className="font-medium">{ws.name}</TableCell>
                      <TableCell>{getProductionLineName(ws.productionLineId)}</TableCell>
                      <TableCell>{ws.sequenceOrder}</TableCell>
                      <TableCell>
                        <Badge variant={ws.isActive === 1 ? "default" : "secondary"}>
                          {ws.isActive === 1 ? "Hoạt động" : "Tạm dừng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(ws)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(ws.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingWorkstation ? "Chỉnh sửa Công trạm" : "Thêm Công trạm mới"}
              </DialogTitle>
              <DialogDescription>
                Điền thông tin công trạm trong dây chuyền sản xuất
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Mã công trạm *</Label>
                  <Input
                    id="code"
                    placeholder="VD: WS-001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sequence">Thứ tự</Label>
                  <Input
                    id="sequence"
                    type="number"
                    min={1}
                    value={formData.sequence}
                    onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Tên công trạm *</Label>
                <Input
                  id="name"
                  placeholder="VD: Trạm hàn SMT"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productionLineId">Dây chuyền sản xuất *</Label>
                <Select
                  value={formData.productionLineId}
                  onValueChange={(value) => setFormData({ ...formData, productionLineId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dây chuyền" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionLines?.map((line) => (
                      <SelectItem key={line.id} value={line.id.toString()}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Input
                  id="description"
                  placeholder="Mô tả công trạm..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Ảnh công trạm</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted">
                    {formData.imageUrl ? (
                      <>
                        <img src={formData.imageUrl} alt="Công trạm" className="w-full h-full object-cover" />
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
                    Công trạm đang hoạt động hay tạm dừng
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
                {editingWorkstation ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <LightboxComponent />
    </DashboardLayout>
  );
}
