import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Building2, Search, MapPin, User } from "lucide-react";

type FactoryFormData = {
  code: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
  capacity: number;
  status: "active" | "inactive" | "maintenance";
};

const defaultFormData: FactoryFormData = {
  code: "",
  name: "",
  description: "",
  address: "",
  city: "",
  country: "Việt Nam",
  phone: "",
  email: "",
  managerName: "",
  managerPhone: "",
  managerEmail: "",
  capacity: 0,
  status: "active",
};

export default function FactoryManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FactoryFormData>(defaultFormData);

  const utils = trpc.useUtils();

  const { data: factoriesData, isLoading } = trpc.factoryWorkshop.listFactories.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? (statusFilter as "active" | "inactive" | "maintenance") : undefined,
    page,
    pageSize: 10,
  });

  const createMutation = trpc.factoryWorkshop.createFactory.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo nhà máy mới");
      utils.factoryWorkshop.listFactories.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateMutation = trpc.factoryWorkshop.updateFactory.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật nhà máy");
      utils.factoryWorkshop.listFactories.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const deleteMutation = trpc.factoryWorkshop.deleteFactory.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa nhà máy");
      utils.factoryWorkshop.listFactories.invalidate();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingId(null);
  };

  const handleEdit = (factory: any) => {
    setEditingId(factory.id);
    setFormData({
      code: factory.code || "",
      name: factory.name || "",
      description: factory.description || "",
      address: factory.address || "",
      city: factory.city || "",
      country: factory.country || "Việt Nam",
      phone: factory.phone || "",
      email: factory.email || "",
      managerName: factory.managerName || "",
      managerPhone: factory.managerPhone || "",
      managerEmail: factory.managerEmail || "",
      capacity: factory.capacity || 0,
      status: factory.status || "active",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name) {
      toast.error("Vui lòng nhập mã và tên nhà máy");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa nhà máy này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500">Hoạt động</Badge>;
      case "inactive": return <Badge variant="secondary">Ngừng</Badge>;
      case "maintenance": return <Badge className="bg-yellow-500">Bảo trì</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Quản lý Nhà máy
            </h1>
            <p className="text-muted-foreground mt-1">Quản lý thông tin các nhà máy trong hệ thống</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Thêm nhà máy</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Sửa nhà máy" : "Thêm nhà máy mới"}</DialogTitle>
                <DialogDescription>Nhập thông tin chi tiết của nhà máy</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Mã nhà máy *</Label>
                    <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="VD: HN-F01" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên nhà máy *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Nhà máy Hà Nội" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả về nhà máy..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Địa chỉ</Label>
                    <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Địa chỉ nhà máy" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Thành phố</Label>
                    <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="VD: Hà Nội" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Điện thoại</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="VD: 024-3333-4444" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="factory@company.vn" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="managerName">Quản lý</Label>
                    <Input id="managerName" value={formData.managerName} onChange={(e) => setFormData({ ...formData, managerName: e.target.value })} placeholder="Tên quản lý" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="managerPhone">SĐT quản lý</Label>
                    <Input id="managerPhone" value={formData.managerPhone} onChange={(e) => setFormData({ ...formData, managerPhone: e.target.value })} placeholder="0912-345-678" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="managerEmail">Email quản lý</Label>
                    <Input id="managerEmail" type="email" value={formData.managerEmail} onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })} placeholder="manager@company.vn" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Công suất (sản phẩm/ngày)</Label>
                    <Input id="capacity" type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} placeholder="50000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Trạng thái</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Hoạt động</SelectItem>
                        <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
                        <SelectItem value="maintenance">Bảo trì</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Cập nhật" : "Tạo mới"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Tìm theo mã, tên, thành phố..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="inactive">Ngừng</SelectItem>
                  <SelectItem value="maintenance">Bảo trì</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã</TableHead>
                      <TableHead>Tên nhà máy</TableHead>
                      <TableHead>Địa chỉ</TableHead>
                      <TableHead>Quản lý</TableHead>
                      <TableHead>Công suất</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {factoriesData?.data.map((factory) => (
                      <TableRow key={factory.id}>
                        <TableCell className="font-medium">{factory.code}</TableCell>
                        <TableCell>{factory.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {factory.city || factory.address || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {factory.managerName && (
                            <div className="flex items-center gap-1 text-sm"><User className="h-3 w-3" />{factory.managerName}</div>
                          )}
                        </TableCell>
                        <TableCell>{factory.capacity?.toLocaleString() || "-"}</TableCell>
                        <TableCell>{getStatusBadge(factory.status || "active")}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(factory)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(factory.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!factoriesData?.data || factoriesData.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có dữ liệu nhà máy</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {factoriesData && factoriesData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">Trang {page} / {factoriesData.totalPages} ({factoriesData.total} nhà máy)</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Trước</Button>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(factoriesData.totalPages, p + 1))} disabled={page === factoriesData.totalPages}>Sau</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
