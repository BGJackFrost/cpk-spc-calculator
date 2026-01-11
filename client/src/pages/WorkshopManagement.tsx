import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Factory, Search, Building2, User, Link2, Unlink } from "lucide-react";

type WorkshopFormData = {
  factoryId: number;
  code: string;
  name: string;
  description: string;
  building: string;
  floor: string;
  area: number;
  capacity: number;
  supervisorName: string;
  supervisorPhone: string;
  supervisorEmail: string;
  status: "active" | "inactive" | "maintenance";
  productionLineIds: number[];
};

const defaultFormData: WorkshopFormData = {
  factoryId: 0,
  code: "",
  name: "",
  description: "",
  building: "",
  floor: "",
  area: 0,
  capacity: 0,
  supervisorName: "",
  supervisorPhone: "",
  supervisorEmail: "",
  status: "active",
  productionLineIds: [],
};

export default function WorkshopManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [factoryFilter, setFactoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<WorkshopFormData>(defaultFormData);

  const utils = trpc.useUtils();

  const { data: workshopsData, isLoading } = trpc.factoryWorkshop.listWorkshops.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? (statusFilter as "active" | "inactive" | "maintenance") : undefined,
    factoryId: factoryFilter !== "all" ? parseInt(factoryFilter) : undefined,
    page,
    pageSize: 10,
  });

  const { data: factoriesData } = trpc.factoryWorkshop.listFactories.useQuery({ pageSize: 100 });
  
  // Get all production lines for assignment
  const { data: allProductionLines } = trpc.factoryWorkshop.getAllProductionLines.useQuery({
    factoryId: formData.factoryId > 0 ? formData.factoryId : undefined,
  });
  
  // Get assigned production lines for editing workshop
  const { data: assignedLines, refetch: refetchAssignedLines } = trpc.factoryWorkshop.getWorkshopProductionLines.useQuery(
    { workshopId: editingId || 0 },
    { enabled: editingId !== null && editingId > 0 }
  );

  // Update form when assigned lines are loaded
  useEffect(() => {
    if (assignedLines && editingId) {
      setFormData(prev => ({
        ...prev,
        productionLineIds: assignedLines.map(a => a.productionLineId),
      }));
    }
  }, [assignedLines, editingId]);

  const createMutation = trpc.factoryWorkshop.createWorkshop.useMutation({
    onSuccess: async (result) => {
      // Assign production lines if any selected
      if (formData.productionLineIds.length > 0 && result.id) {
        await assignLinesMutation.mutateAsync({
          workshopId: result.id,
          productionLineIds: formData.productionLineIds,
        });
      }
      toast.success("Đã tạo xưởng mới");
      utils.factoryWorkshop.listWorkshops.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateMutation = trpc.factoryWorkshop.updateWorkshop.useMutation({
    onSuccess: async () => {
      // Update production line assignments
      if (editingId) {
        await assignLinesMutation.mutateAsync({
          workshopId: editingId,
          productionLineIds: formData.productionLineIds,
        });
      }
      toast.success("Đã cập nhật xưởng");
      utils.factoryWorkshop.listWorkshops.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const deleteMutation = trpc.factoryWorkshop.deleteWorkshop.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa xưởng");
      utils.factoryWorkshop.listWorkshops.invalidate();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const assignLinesMutation = trpc.factoryWorkshop.assignProductionLines.useMutation({
    onError: (error) => toast.error(`Lỗi gán dây chuyền: ${error.message}`),
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingId(null);
  };

  const handleEdit = (workshop: any) => {
    setEditingId(workshop.id);
    setFormData({
      factoryId: workshop.factoryId || 0,
      code: workshop.code || "",
      name: workshop.name || "",
      description: workshop.description || "",
      building: workshop.building || "",
      floor: workshop.floor || "",
      area: workshop.area || 0,
      capacity: workshop.capacity || 0,
      supervisorName: workshop.supervisorName || "",
      supervisorPhone: workshop.supervisorPhone || "",
      supervisorEmail: workshop.supervisorEmail || "",
      status: workshop.status || "active",
      productionLineIds: [], // Will be loaded via useEffect
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name || !formData.factoryId) {
      toast.error("Vui lòng nhập mã, tên xưởng và chọn nhà máy");
      return;
    }
    const { productionLineIds, ...workshopData } = formData;
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...workshopData });
    } else {
      createMutation.mutate(workshopData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa xưởng này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const toggleProductionLine = (lineId: number) => {
    setFormData(prev => {
      const isSelected = prev.productionLineIds.includes(lineId);
      return {
        ...prev,
        productionLineIds: isSelected
          ? prev.productionLineIds.filter(id => id !== lineId)
          : [...prev.productionLineIds, lineId],
      };
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500">Hoạt động</Badge>;
      case "inactive": return <Badge variant="secondary">Ngừng</Badge>;
      case "maintenance": return <Badge className="bg-yellow-500">Bảo trì</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFactoryName = (factoryId: number) => {
    const factory = factoriesData?.data.find(f => f.id === factoryId);
    return factory?.name || "-";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Factory className="h-8 w-8" />
              Quản lý Xưởng sản xuất
            </h1>
            <p className="text-muted-foreground mt-1">Quản lý thông tin các xưởng và gán dây chuyền sản xuất</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Thêm xưởng</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Sửa xưởng" : "Thêm xưởng mới"}</DialogTitle>
                <DialogDescription>Nhập thông tin chi tiết của xưởng sản xuất và gán dây chuyền</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="factoryId">Nhà máy *</Label>
                  <Select value={formData.factoryId.toString()} onValueChange={(v) => setFormData({ ...formData, factoryId: parseInt(v), productionLineIds: [] })}>
                    <SelectTrigger><SelectValue placeholder="Chọn nhà máy" /></SelectTrigger>
                    <SelectContent>
                      {factoriesData?.data.map((factory) => (
                        <SelectItem key={factory.id} value={factory.id.toString()}>{factory.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Mã xưởng *</Label>
                    <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="VD: HN-SMT" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên xưởng *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Xưởng SMT" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả về xưởng..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="building">Tòa nhà</Label>
                    <Input id="building" value={formData.building} onChange={(e) => setFormData({ ...formData, building: e.target.value })} placeholder="VD: Tòa A" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="floor">Tầng</Label>
                    <Input id="floor" value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} placeholder="VD: Tầng 1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="area">Diện tích (m²)</Label>
                    <Input id="area" type="number" value={formData.area} onChange={(e) => setFormData({ ...formData, area: parseInt(e.target.value) || 0 })} placeholder="500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Công suất (sản phẩm/ngày)</Label>
                    <Input id="capacity" type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} placeholder="10000" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supervisorName">Giám sát</Label>
                    <Input id="supervisorName" value={formData.supervisorName} onChange={(e) => setFormData({ ...formData, supervisorName: e.target.value })} placeholder="Tên giám sát" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisorPhone">SĐT giám sát</Label>
                    <Input id="supervisorPhone" value={formData.supervisorPhone} onChange={(e) => setFormData({ ...formData, supervisorPhone: e.target.value })} placeholder="0912-345-678" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supervisorEmail">Email giám sát</Label>
                    <Input id="supervisorEmail" type="email" value={formData.supervisorEmail} onChange={(e) => setFormData({ ...formData, supervisorEmail: e.target.value })} placeholder="supervisor@company.vn" />
                  </div>
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
                
                {/* Production Line Assignment Section */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Gán dây chuyền sản xuất
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Chọn các dây chuyền sản xuất sẽ hoạt động trong xưởng này
                  </p>
                  {formData.factoryId === 0 ? (
                    <div className="text-sm text-muted-foreground italic p-4 border rounded-lg bg-muted/50">
                      Vui lòng chọn nhà máy trước để xem danh sách dây chuyền
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px] border rounded-lg p-2">
                      {allProductionLines && allProductionLines.length > 0 ? (
                        <div className="space-y-2">
                          {allProductionLines.map((line) => (
                            <div
                              key={line.id}
                              className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer ${
                                formData.productionLineIds.includes(line.id) ? 'bg-primary/10 border border-primary/30' : ''
                              }`}
                              onClick={() => toggleProductionLine(line.id)}
                            >
                              <Checkbox
                                checked={formData.productionLineIds.includes(line.id)}
                                onCheckedChange={() => toggleProductionLine(line.id)}
                              />
                              <div className="flex-1">
                                <p className="font-medium">{line.name}</p>
                                <p className="text-xs text-muted-foreground">Mã: {line.code}</p>
                              </div>
                              {formData.productionLineIds.includes(line.id) && (
                                <Badge variant="secondary" className="text-xs">Đã chọn</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground italic p-4 text-center">
                          Không có dây chuyền nào trong nhà máy này
                        </div>
                      )}
                    </ScrollArea>
                  )}
                  {formData.productionLineIds.length > 0 && (
                    <p className="text-sm text-primary">
                      Đã chọn {formData.productionLineIds.length} dây chuyền
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Hủy</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending || assignLinesMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending || assignLinesMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Cập nhật" : "Tạo mới"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Tìm theo mã, tên..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
              </div>
              <Select value={factoryFilter} onValueChange={(v) => { setFactoryFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Nhà máy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả nhà máy</SelectItem>
                  {factoriesData?.data.map((factory) => (
                    <SelectItem key={factory.id} value={factory.id.toString()}>{factory.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
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
                      <TableHead>Tên xưởng</TableHead>
                      <TableHead>Nhà máy</TableHead>
                      <TableHead>Vị trí</TableHead>
                      <TableHead>Giám sát</TableHead>
                      <TableHead>Công suất</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workshopsData?.data.map((workshop) => (
                      <TableRow key={workshop.id}>
                        <TableCell className="font-medium">{workshop.code}</TableCell>
                        <TableCell>{workshop.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Building2 className="h-3 w-3" />
                            {getFactoryName(workshop.factoryId)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {workshop.building && workshop.floor ? `${workshop.building}, ${workshop.floor}` : workshop.building || workshop.floor || "-"}
                        </TableCell>
                        <TableCell>
                          {workshop.supervisorName && (
                            <div className="flex items-center gap-1 text-sm"><User className="h-3 w-3" />{workshop.supervisorName}</div>
                          )}
                        </TableCell>
                        <TableCell>{workshop.capacity?.toLocaleString() || "-"}</TableCell>
                        <TableCell>{getStatusBadge(workshop.status || "active")}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(workshop)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(workshop.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!workshopsData?.data || workshopsData.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Không có dữ liệu xưởng</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {workshopsData && workshopsData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">Trang {page} / {workshopsData.totalPages} ({workshopsData.total} xưởng)</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Trước</Button>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(workshopsData.totalPages, p + 1))} disabled={page === workshopsData.totalPages}>Sau</Button>
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
