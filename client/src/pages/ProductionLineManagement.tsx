import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Settings2
} from "lucide-react";

interface ProductionLine {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  location?: string | null;
  isActive: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function ProductionLineManagement() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    location: "",
  });

  // Fetch data
  const { data: productionLines, isLoading, refetch } = trpc.productionLine.list.useQuery();

  // Mutations
  const createMutation = trpc.productionLine.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo dây chuyền thành công");
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const updateMutation = trpc.productionLine.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật dây chuyền thành công");
      refetch();
      setEditingLine(null);
      resetForm();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const deleteMutation = trpc.productionLine.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa dây chuyền thành công");
      refetch();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      location: "",
    });
  };

  const handleCreate = () => {
    if (!formData.code || !formData.name) {
      toast.error("Vui lòng nhập mã và tên dây chuyền");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingLine) return;
    updateMutation.mutate({
      id: editingLine.id,
      ...formData,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa dây chuyền này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const openEditDialog = (line: ProductionLine) => {
    setEditingLine(line);
    setFormData({
      code: line.code,
      name: line.name,
      description: line.description || "",
      location: line.location || "",
    });
  };

  const filteredLines = productionLines?.filter((l: ProductionLine) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Không có quyền truy cập</CardTitle>
              <CardDescription>Bạn cần quyền Admin để truy cập trang này</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Dây chuyền</h1>
            <p className="text-muted-foreground mt-1">Quản lý các dây chuyền sản xuất trong nhà máy</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm dây chuyền
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Thêm dây chuyền mới</DialogTitle>
                <DialogDescription>Tạo dây chuyền sản xuất mới</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mã dây chuyền *</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="VD: LINE-01"
                    />
                  </div>

                </div>
                <div className="space-y-2">
                  <Label>Tên dây chuyền *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Dây chuyền lắp ráp 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vị trí</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="VD: Nhà xưởng A, Tầng 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả chi tiết về dây chuyền..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Tạo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Danh sách dây chuyền
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo mã hoặc tên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Mã</th>
                      <th className="px-4 py-3 text-left font-semibold">Tên dây chuyền</th>
                      <th className="px-4 py-3 text-left font-semibold">Vị trí</th>
                      <th className="px-4 py-3 text-center font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 text-left font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLines?.map((line: ProductionLine) => (
                      <tr key={line.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-sm">{line.code}</td>
                        <td className="px-4 py-3 font-medium">{line.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{line.location || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            line.isActive === 1 ? "bg-green-100 text-green-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {line.isActive === 1 ? "Hoạt động" : "Ngừng"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Dialog open={editingLine?.id === line.id} onOpenChange={(open) => !open && setEditingLine(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(line)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Chỉnh sửa dây chuyền</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Mã dây chuyền</Label>
                                      <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                                    </div>

                                  </div>
                                  <div className="space-y-2">
                                    <Label>Tên dây chuyền</Label>
                                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Vị trí</Label>
                                    <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Mô tả</Label>
                                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingLine(null)}>Hủy</Button>
                                  <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                                    {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Lưu
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(line.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredLines?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có dây chuyền nào</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
