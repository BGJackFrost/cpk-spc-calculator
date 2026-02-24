import { useState } from "react";
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
import { Plus, Pencil, Trash2, Cpu } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "assembly", label: "Assembly (Lắp ráp)" },
  { value: "inspection", label: "Inspection (Kiểm tra)" },
  { value: "soldering", label: "Soldering (Hàn)" },
  { value: "printing", label: "Printing (In)" },
  { value: "testing", label: "Testing (Test)" },
  { value: "packaging", label: "Packaging (Đóng gói)" },
  { value: "other", label: "Other (Khác)" },
];

export default function MachineTypeManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    category: "",
  });

  const { data: machineTypes, isLoading, refetch } = trpc.machineType.list.useQuery();
  const createMutation = trpc.machineType.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo loại máy thành công");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });
  const updateMutation = trpc.machineType.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật loại máy thành công");
      setIsEditOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });
  const deleteMutation = trpc.machineType.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa loại máy thành công");
      refetch();
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ code: "", name: "", description: "", category: "" });
    setSelectedType(null);
  };

  const handleCreate = () => {
    if (!formData.code || !formData.name) {
      toast.error("Vui lòng nhập mã và tên loại máy");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedType) return;
    updateMutation.mutate({ id: selectedType.id, ...formData });
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa loại máy này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const openEditDialog = (type: any) => {
    setSelectedType(type);
    setFormData({
      code: type.code,
      name: type.name,
      description: type.description || "",
      category: type.category || "",
    });
    setIsEditOpen(true);
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  return (
    <DashboardLayout>
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="h-6 w-6" />
            Quản lý Loại Máy
          </h1>
          <p className="text-muted-foreground">
            Quản lý các loại máy trong hệ thống sản xuất (SMT, AOI, Reflow, etc.)
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm Loại Máy
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm Loại Máy Mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã loại máy *</Label>
                  <Input
                    placeholder="VD: SMT, AOI, REFLOW"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên loại máy *</Label>
                  <Input
                    placeholder="VD: Surface Mount Technology"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nhóm</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nhóm" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  placeholder="Mô tả chi tiết về loại máy"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Danh sách Loại Máy</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : !machineTypes?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có loại máy nào. Nhấn "Thêm Loại Máy" để bắt đầu.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Nhóm</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machineTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-mono font-medium">{type.code}</TableCell>
                    <TableCell>{type.name}</TableCell>
                    <TableCell>
                      {type.category && (
                        <Badge variant="outline">{getCategoryLabel(type.category)}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{type.description}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(type)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(type.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Loại Máy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mã loại máy *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tên loại máy *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nhóm</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhóm" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
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
    </DashboardLayout>
  );
}
