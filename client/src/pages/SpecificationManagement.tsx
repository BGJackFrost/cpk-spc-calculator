import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Ruler, 
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Target
} from "lucide-react";

interface Specification {
  id: number;
  productId: number;
  workstationId?: number | null;
  parameterName: string;
  usl: number;
  lsl: number;
  target?: number | null;
  unit?: string | null;
  description?: string | null;
  isActive: number;
}

export default function SpecificationManagement() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specification | null>(null);
  const [formData, setFormData] = useState({
    productId: 0,
    workstationId: undefined as number | undefined,
    parameterName: "",
    usl: 0,
    lsl: 0,
    target: undefined as number | undefined,
    unit: "",
    description: "",
  });

  // Fetch data
  const { data: products } = trpc.product.list.useQuery();
  const { data: workstations } = trpc.workstation.listByLine.useQuery({ productionLineId: 0 });
  const { data: specifications, isLoading, refetch } = trpc.productSpec.list.useQuery(
    selectedProductId ? { productId: selectedProductId } : undefined
  );

  // Mutations
  const createMutation = trpc.productSpec.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo tiêu chuẩn thành công");
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const updateMutation = trpc.productSpec.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật tiêu chuẩn thành công");
      refetch();
      setEditingSpec(null);
      resetForm();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const deleteMutation = trpc.productSpec.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa tiêu chuẩn thành công");
      refetch();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const resetForm = () => {
    setFormData({
      productId: 0,
      workstationId: undefined,
      parameterName: "",
      usl: 0,
      lsl: 0,
      target: undefined,
      unit: "",
      description: "",
    });
  };

  const handleCreate = () => {
    if (!formData.productId) {
      toast.error("Vui lòng chọn sản phẩm");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingSpec) return;
    updateMutation.mutate({
      id: editingSpec.id,
      parameterName: formData.parameterName,
      usl: formData.usl,
      lsl: formData.lsl,
      target: formData.target,
      unit: formData.unit,
      description: formData.description,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa tiêu chuẩn này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const openEditDialog = (spec: Specification) => {
    setEditingSpec(spec);
    setFormData({
      productId: spec.productId,
      workstationId: spec.workstationId ?? undefined,
      parameterName: spec.parameterName,
      usl: spec.usl,
      lsl: spec.lsl,
      target: spec.target ?? undefined,
      unit: spec.unit || "",
      description: spec.description || "",
    });
  };

  const getProductName = (productId: number) => {
    const product = products?.find((p: { id: number; name: string }) => p.id === productId);
    return product?.name || "N/A";
  };

  const filteredSpecs = specifications?.filter((s: Specification) =>
    s.parameterName.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-3xl font-bold tracking-tight">Tiêu chuẩn USL/LSL</h1>
            <p className="text-muted-foreground mt-1">Quản lý giới hạn kiểm soát cho từng sản phẩm</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm tiêu chuẩn
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Thêm tiêu chuẩn mới</DialogTitle>
                <DialogDescription>Định nghĩa USL/LSL cho thông số kiểm tra</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Sản phẩm *</Label>
                  <Select 
                    value={formData.productId?.toString()} 
                    onValueChange={(v) => setFormData({ ...formData, productId: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((p: { id: number; name: string; code: string }) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.code} - {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tên thông số *</Label>
                  <Input
                    value={formData.parameterName}
                    onChange={(e) => setFormData({ ...formData, parameterName: e.target.value })}
                    placeholder="VD: Chiều dài, Điện áp, Trọng lượng..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>LSL (Giới hạn dưới) *</Label>
                    <Input
                      type="number"
                      value={formData.lsl}
                      onChange={(e) => setFormData({ ...formData, lsl: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target (Mục tiêu)</Label>
                    <Input
                      type="number"
                      value={formData.target || ""}
                      onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>USL (Giới hạn trên) *</Label>
                    <Input
                      type="number"
                      value={formData.usl}
                      onChange={(e) => setFormData({ ...formData, usl: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Đơn vị</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="VD: mm, V, kg..."
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

        {/* Filter & Table */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Danh sách tiêu chuẩn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-64">
                <Select 
                  value={selectedProductId?.toString() || "all"} 
                  onValueChange={(v) => setSelectedProductId(v === "all" ? undefined : parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lọc theo sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                    {products?.map((p: { id: number; name: string; code: string }) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.code} - {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên thông số..."
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
                      <th className="px-4 py-3 text-left font-semibold">Sản phẩm</th>
                      <th className="px-4 py-3 text-left font-semibold">Thông số</th>
                      <th className="px-4 py-3 text-center font-semibold">LSL</th>
                      <th className="px-4 py-3 text-center font-semibold">Target</th>
                      <th className="px-4 py-3 text-center font-semibold">USL</th>
                      <th className="px-4 py-3 text-left font-semibold">Đơn vị</th>
                      <th className="px-4 py-3 text-left font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSpecs?.map((spec: Specification) => (
                      <tr key={spec.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">{getProductName(spec.productId)}</td>
                        <td className="px-4 py-3 font-medium">{spec.parameterName}</td>
                        <td className="px-4 py-3 text-center text-blue-600 font-mono">{spec.lsl}</td>
                        <td className="px-4 py-3 text-center text-green-600 font-mono">
                          {spec.target ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-center text-red-600 font-mono">{spec.usl}</td>
                        <td className="px-4 py-3 text-muted-foreground">{spec.unit || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Dialog open={editingSpec?.id === spec.id} onOpenChange={(open) => !open && setEditingSpec(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(spec)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Chỉnh sửa tiêu chuẩn</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Tên thông số</Label>
                                    <Input value={formData.parameterName} onChange={(e) => setFormData({ ...formData, parameterName: e.target.value })} />
                                  </div>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label>LSL</Label>
                                      <Input type="number" value={formData.lsl} onChange={(e) => setFormData({ ...formData, lsl: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Target</Label>
                                      <Input type="number" value={formData.target || ""} onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) || undefined })} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>USL</Label>
                                      <Input type="number" value={formData.usl} onChange={(e) => setFormData({ ...formData, usl: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Đơn vị</Label>
                                    <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingSpec(null)}>Hủy</Button>
                                  <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                                    {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Lưu
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(spec.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredSpecs?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có tiêu chuẩn nào</p>
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
