import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Wrench, Filter, Camera, X, Loader2, Image as ImageIcon } from "lucide-react";
import ImageLightbox, { useImageLightbox } from "@/components/ImageLightbox";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "active", label: "Hoạt động", color: "bg-green-100 text-green-800" },
  { value: "maintenance", label: "Bảo trì", color: "bg-yellow-100 text-yellow-800" },
  { value: "inactive", label: "Ngừng hoạt động", color: "bg-red-100 text-red-800" },
];

export default function FixtureManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<any>(null);
  const [filterMachineId, setFilterMachineId] = useState<string>("all");
  const [formData, setFormData] = useState({
    machineId: 0,
    code: "",
    name: "",
    description: "",
    imageUrl: "",
    position: 1,
    status: "active" as "active" | "maintenance" | "inactive",
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: fixtures, isLoading, refetch } = trpc.fixture.listWithMachineInfo.useQuery();
  const { data: machines } = trpc.machine.listAll.useQuery();
  
  const createMutation = trpc.fixture.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo Fixture thành công");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });
  const updateMutation = trpc.fixture.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật Fixture thành công");
      setIsEditOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });
  const deleteMutation = trpc.fixture.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa Fixture thành công");
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      machineId: 0,
      code: "",
      name: "",
      description: "",
      imageUrl: "",
      position: 1,
      status: "active",
    });
    setSelectedFixture(null);
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
            folder: "fixtures" 
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

  const handleCreate = () => {
    if (!formData.code || !formData.name || !formData.machineId) {
      toast.error("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }
    createMutation.mutate({
      ...formData,
      imageUrl: formData.imageUrl || undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedFixture) return;
    updateMutation.mutate({ 
      id: selectedFixture.id, 
      ...formData,
      imageUrl: formData.imageUrl || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa Fixture này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const openEditDialog = (fixture: any) => {
    setSelectedFixture(fixture);
    setFormData({
      machineId: fixture.machineId,
      code: fixture.code,
      name: fixture.name,
      description: fixture.description || "",
      imageUrl: fixture.imageUrl || "",
      position: fixture.position || 1,
      status: fixture.status || "active",
    });
    setIsEditOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    return opt ? (
      <Badge className={opt.color}>{opt.label}</Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    );
  };

  const { isOpen, currentImage, openLightbox, closeLightbox, LightboxComponent } = useImageLightbox();

  const filteredFixtures = fixtures?.filter((f) => {
    if (filterMachineId === "all") return true;
    return f.machineId === parseInt(filterMachineId);
  });

  // Group fixtures by machine
  const groupedByMachine = filteredFixtures?.reduce((acc, fixture) => {
    const key = `${fixture.machineCode} - ${fixture.machineName}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(fixture);
    return acc;
  }, {} as Record<string, typeof filteredFixtures>);

  // Image upload component
  const ImageUploadSection = () => (
    <div className="space-y-2">
      <Label>Ảnh Fixture</Label>
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted">
          {formData.imageUrl ? (
            <>
              <img src={formData.imageUrl} alt="Fixture" className="w-full h-full object-cover" />
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
  );

  return (
    <DashboardLayout>
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Quản lý Fixture
          </h1>
          <p className="text-muted-foreground">
            Quản lý các Fixture thuộc từng máy trong hệ thống
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm Fixture
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Thêm Fixture Mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Máy *</Label>
                <Select
                  value={formData.machineId ? formData.machineId.toString() : ""}
                  onValueChange={(value) => setFormData({ ...formData, machineId: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn máy" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines?.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id.toString()}>
                        {machine.code} - {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã Fixture *</Label>
                  <Input
                    placeholder="VD: FIX001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên Fixture *</Label>
                  <Input
                    placeholder="VD: Fixture Left"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vị trí</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trạng thái</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  placeholder="Mô tả chi tiết về Fixture"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <ImageUploadSection />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang tạo..." : "Tạo"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label>Lọc theo máy:</Label>
            <Select value={filterMachineId} onValueChange={setFilterMachineId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Tất cả máy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả máy</SelectItem>
                {machines?.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id.toString()}>
                    {machine.code} - {machine.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fixtures grouped by machine */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
      ) : !filteredFixtures?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Chưa có Fixture nào. Nhấn "Thêm Fixture" để bắt đầu.
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByMachine || {}).map(([machineName, machineFixtures]) => (
          <Card key={machineName}>
            <CardHeader>
              <CardTitle className="text-lg">{machineName}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Ảnh</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machineFixtures?.map((fixture) => (
                    <TableRow key={fixture.id}>
                      <TableCell>
                        {fixture.imageUrl ? (
                          <img 
                            src={fixture.imageUrl} 
                            alt={fixture.name} 
                            className="w-10 h-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openLightbox(fixture.imageUrl!)}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-medium">{fixture.code}</TableCell>
                      <TableCell>{fixture.name}</TableCell>
                      <TableCell>{fixture.position}</TableCell>
                      <TableCell>{getStatusBadge(fixture.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">{fixture.description}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(fixture)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(fixture.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Fixture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Máy *</Label>
              <Select
                value={formData.machineId ? formData.machineId.toString() : ""}
                onValueChange={(value) => setFormData({ ...formData, machineId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn máy" />
                </SelectTrigger>
                <SelectContent>
                  {machines?.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id.toString()}>
                      {machine.code} - {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mã Fixture *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tên Fixture *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vị trí</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <ImageUploadSection />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
      <LightboxComponent />
    </DashboardLayout>
  );
}
