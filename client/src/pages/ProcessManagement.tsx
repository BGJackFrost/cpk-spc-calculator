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
import { Loader2, Plus, Pencil, Trash2, GitBranch, Search, Filter } from "lucide-react";

interface ProcessConfig {
  id: number;
  processName: string;
  productionLineId: number;
  productId: number;
  workstationId: number;
  processOrder: number;
  standardTime: number | null;
  description: string | null;
  isActive: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductionLine {
  id: number;
  name: string;
  code: string;
}

interface Product {
  id: number;
  name: string;
  code: string;
}

interface Workstation {
  id: number;
  name: string;
  code: string;
  productionLineId: number;
}

export default function ProcessManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProcessConfig | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    processName: "",
    productionLineId: "",
    productId: "",
    workstationId: "",
    processOrder: 0,
    standardTime: "",
    description: "",
    isActive: true,
  });

  const { data: processes, isLoading, refetch } = trpc.processConfig.list.useQuery();
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();
  const { data: workstations } = trpc.workstation.listAll.useQuery();

  const createMutation = trpc.processConfig.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo quy trình mới");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateMutation = trpc.processConfig.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật quy trình");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const deleteMutation = trpc.processConfig.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa quy trình");
      refetch();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const resetForm = () => {
    setFormData({
      processName: "",
      productionLineId: "",
      productId: "",
      workstationId: "",
      processOrder: 0,
      standardTime: "",
      description: "",
      isActive: true,
    });
    setEditingProcess(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (process: ProcessConfig) => {
    setEditingProcess(process);
    setFormData({
      processName: process.processName,
      productionLineId: process.productionLineId.toString(),
      productId: process.productId.toString(),
      workstationId: process.workstationId.toString(),
      processOrder: process.processOrder,
      standardTime: process.standardTime?.toString() || "",
      description: process.description || "",
      isActive: process.isActive === 1,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.processName || !formData.productionLineId || !formData.productId || !formData.workstationId) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    const data = {
      processName: formData.processName,
      productionLineId: parseInt(formData.productionLineId),
      productId: parseInt(formData.productId),
      workstationId: parseInt(formData.workstationId),
      processOrder: formData.processOrder,
      standardTime: formData.standardTime ? parseInt(formData.standardTime) : undefined,
      description: formData.description || undefined,
    };

    if (editingProcess) {
      updateMutation.mutate({ id: editingProcess.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa quy trình này?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getProductionLineName = (lineId: number) => {
    return productionLines?.find((l: ProductionLine) => l.id === lineId)?.name || "N/A";
  };

  const getProductName = (productId: number) => {
    return products?.find((p: Product) => p.id === productId)?.name || "N/A";
  };

  const getWorkstationName = (wsId: number) => {
    return workstations?.find((ws: Workstation) => ws.id === wsId)?.name || "N/A";
  };

  // Filter by line
  const filteredWorkstations = workstations?.filter((ws: Workstation) => 
    !formData.productionLineId || ws.productionLineId.toString() === formData.productionLineId
  );

  // Filter processes
  const filteredProcesses = processes?.filter((p: ProcessConfig) => {
    const matchesLine = selectedLineId === "all" || p.productionLineId.toString() === selectedLineId;
    const matchesSearch = !searchTerm || 
      p.processName.toLowerCase().includes(searchTerm.toLowerCase());
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
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Quy trình</h1>
            <p className="text-muted-foreground mt-1">
              Quản lý các quy trình sản xuất cho từng dây chuyền và sản phẩm
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm quy trình
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
                    placeholder="Tìm kiếm theo tên quy trình..."
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
                    {productionLines?.map((line: ProductionLine) => (
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

        {/* Processes Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Danh sách Quy trình ({filteredProcesses?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thứ tự</TableHead>
                  <TableHead>Tên quy trình</TableHead>
                  <TableHead>Dây chuyền</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Công trạm</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcesses?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Chưa có quy trình nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProcesses?.map((p: ProcessConfig) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.processOrder}</TableCell>
                      <TableCell className="font-medium">{p.processName}</TableCell>
                      <TableCell>{getProductionLineName(p.productionLineId)}</TableCell>
                      <TableCell>{getProductName(p.productId)}</TableCell>
                      <TableCell>{getWorkstationName(p.workstationId)}</TableCell>
                      <TableCell>{p.standardTime ? `${p.standardTime}s` : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={p.isActive === 1 ? "default" : "secondary"}>
                          {p.isActive === 1 ? "Hoạt động" : "Tạm dừng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
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
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>
                {editingProcess ? "Chỉnh sửa Quy trình" : "Thêm Quy trình mới"}
              </DialogTitle>
              <DialogDescription>
                Cấu hình quy trình sản xuất cho dây chuyền và sản phẩm
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="processOrder">Thứ tự</Label>
                  <Input
                    id="processOrder"
                    type="number"
                    min={0}
                    value={formData.processOrder}
                    onChange={(e) => setFormData({ ...formData, processOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standardTime">Thời gian chuẩn (giây)</Label>
                  <Input
                    id="standardTime"
                    type="number"
                    min={0}
                    placeholder="VD: 60"
                    value={formData.standardTime}
                    onChange={(e) => setFormData({ ...formData, standardTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="processName">Tên quy trình *</Label>
                <Input
                  id="processName"
                  placeholder="VD: Quy trình hàn SMT"
                  value={formData.processName}
                  onChange={(e) => setFormData({ ...formData, processName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productionLineId">Dây chuyền *</Label>
                  <Select
                    value={formData.productionLineId}
                    onValueChange={(value) => setFormData({ ...formData, productionLineId: value, workstationId: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn dây chuyền" />
                    </SelectTrigger>
                    <SelectContent>
                      {productionLines?.map((line: ProductionLine) => (
                        <SelectItem key={line.id} value={line.id.toString()}>
                          {line.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productId">Sản phẩm *</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) => setFormData({ ...formData, productId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product: Product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workstationId">Công trạm *</Label>
                <Select
                  value={formData.workstationId}
                  onValueChange={(value) => setFormData({ ...formData, workstationId: value })}
                  disabled={!formData.productionLineId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.productionLineId ? "Chọn công trạm" : "Chọn dây chuyền trước"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredWorkstations?.map((ws: Workstation) => (
                      <SelectItem key={ws.id} value={ws.id.toString()}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Input
                  id="description"
                  placeholder="Mô tả quy trình..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Trạng thái hoạt động</Label>
                  <p className="text-sm text-muted-foreground">
                    Quy trình đang hoạt động hay tạm dừng
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
                {editingProcess ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
