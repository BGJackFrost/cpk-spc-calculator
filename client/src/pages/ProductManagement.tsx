import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Package, 
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Keyboard
} from "lucide-react";
import { useKeyboardShortcuts, createCommonShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";

interface Product {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unit?: string | null;
  isActive: number;
  createdAt: Date;
}

export default function ProductManagement() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    category: "",
    unit: "pcs",
  });

  // Fetch products
  const { data: products, isLoading, refetch } = trpc.product.list.useQuery();

  // Create product mutation
  const createMutation = trpc.product.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo sản phẩm thành công");
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Update product mutation
  const updateMutation = trpc.product.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật sản phẩm thành công");
      refetch();
      setEditingProduct(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Delete product mutation
  const deleteMutation = trpc.product.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa sản phẩm thành công");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      category: "",
      unit: "pcs",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingProduct) return;
    updateMutation.mutate({
      id: editingProduct.id,
      ...formData,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      description: product.description || "",
      category: product.category || "",
      unit: product.unit || "pcs",
    });
  };

  // Keyboard shortcuts
  const shortcuts = createCommonShortcuts({
    onSave: () => {
      if (isCreateDialogOpen) {
        handleCreate();
      } else if (editingProduct) {
        handleUpdate();
      }
    },
    onNew: () => setIsCreateDialogOpen(true),
    onClose: () => {
      setIsCreateDialogOpen(false);
      setEditingProduct(null);
    },
  });
  
  // Add help shortcut
  shortcuts.push({
    key: "/",
    ctrl: true,
    action: () => setShowShortcutsHelp(true),
    description: "Hiển thị phím tắt (Ctrl+/)",
  });
  
  useKeyboardShortcuts({ shortcuts });

  const filteredProducts = products?.filter((p: Product) =>
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-3xl font-bold tracking-tight">Quản lý sản phẩm</h1>
            <p className="text-muted-foreground mt-1">Quản lý danh mục sản phẩm trong hệ thống</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm sản phẩm
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm sản phẩm mới</DialogTitle>
                <DialogDescription>Nhập thông tin sản phẩm</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Mã sản phẩm *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="VD: SP001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên sản phẩm *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Sản phẩm A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Danh mục</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="VD: Điện tử"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Đơn vị</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="VD: pcs, kg, m"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả sản phẩm..."
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

        {/* Search */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Danh sách sản phẩm
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
                      <th className="px-4 py-3 text-left font-semibold">Tên</th>
                      <th className="px-4 py-3 text-left font-semibold">Danh mục</th>
                      <th className="px-4 py-3 text-left font-semibold">Đơn vị</th>
                      <th className="px-4 py-3 text-left font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts?.map((product: Product) => (
                      <tr key={product.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono">{product.code}</td>
                        <td className="px-4 py-3">{product.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{product.category || "-"}</td>
                        <td className="px-4 py-3">{product.unit}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Dialog open={editingProduct?.id === product.id} onOpenChange={(open) => !open && setEditingProduct(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(product)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Chỉnh sửa sản phẩm</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Mã sản phẩm</Label>
                                    <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Tên sản phẩm</Label>
                                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Danh mục</Label>
                                    <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Đơn vị</Label>
                                    <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Mô tả</Label>
                                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingProduct(null)}>Hủy</Button>
                                  <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                                    {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Lưu
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProducts?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Chưa có sản phẩm nào
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
      />
    </DashboardLayout>
  );
}
