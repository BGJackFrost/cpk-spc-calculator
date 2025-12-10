import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileSpreadsheet, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface MappingFormData {
  productCode: string;
  stationName: string;
  connectionId: number;
  tableName: string;
  productCodeColumn: string;
  stationColumn: string;
  valueColumn: string;
  timestampColumn: string;
  usl?: number;
  lsl?: number;
  target?: number;
}

const defaultFormData: MappingFormData = {
  productCode: "",
  stationName: "",
  connectionId: 0,
  tableName: "",
  productCodeColumn: "product_code",
  stationColumn: "station",
  valueColumn: "value",
  timestampColumn: "timestamp",
};

export default function Mappings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MappingFormData>(defaultFormData);

  const { data: mappings, refetch } = trpc.mapping.list.useQuery();
  const { data: connections } = trpc.databaseConnection.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.mapping.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo mapping thành công!");
      setIsDialogOpen(false);
      resetForm();
      utils.mapping.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.mapping.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật mapping thành công!");
      setIsDialogOpen(false);
      resetForm();
      utils.mapping.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.mapping.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa mapping thành công!");
      utils.mapping.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingId(null);
  };

  const handleEdit = (mapping: typeof mappings extends (infer T)[] | undefined ? T : never) => {
    if (!mapping) return;
    setEditingId(mapping.id);
    setFormData({
      productCode: mapping.productCode,
      stationName: mapping.stationName,
      connectionId: mapping.connectionId,
      tableName: mapping.tableName,
      productCodeColumn: mapping.productCodeColumn,
      stationColumn: mapping.stationColumn,
      valueColumn: mapping.valueColumn,
      timestampColumn: mapping.timestampColumn,
      usl: mapping.usl ?? undefined,
      lsl: mapping.lsl ?? undefined,
      target: mapping.target ?? undefined,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.productCode || !formData.stationName || !formData.connectionId || !formData.tableName) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa mapping này?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="elegant-card max-w-md">
            <CardHeader>
              <CardTitle>Không có quyền truy cập</CardTitle>
              <CardDescription>
                Chỉ admin mới có thể quản lý cấu hình mapping
              </CardDescription>
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
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              Quản lý Mapping
            </h1>
            <p className="text-muted-foreground mt-1">
              Cấu hình mapping giữa sản phẩm, trạm và bảng dữ liệu
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Thêm Mapping
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Sửa Mapping" : "Thêm Mapping mới"}</DialogTitle>
                <DialogDescription>
                  Cấu hình mapping giữa sản phẩm/trạm và bảng dữ liệu trong database
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mã sản phẩm *</Label>
                    <Input
                      value={formData.productCode}
                      onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                      placeholder="VD: PROD-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tên trạm *</Label>
                    <Input
                      value={formData.stationName}
                      onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                      placeholder="VD: Station-A"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Database Connection *</Label>
                    <Select
                      value={formData.connectionId.toString()}
                      onValueChange={(value) => setFormData({ ...formData, connectionId: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn connection" />
                      </SelectTrigger>
                      <SelectContent>
                        {connections?.map((conn) => (
                          <SelectItem key={conn.id} value={conn.id.toString()}>
                            {conn.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tên bảng *</Label>
                    <Input
                      value={formData.tableName}
                      onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
                      placeholder="VD: machine_data"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cột mã sản phẩm</Label>
                    <Input
                      value={formData.productCodeColumn}
                      onChange={(e) => setFormData({ ...formData, productCodeColumn: e.target.value })}
                      placeholder="product_code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cột trạm</Label>
                    <Input
                      value={formData.stationColumn}
                      onChange={(e) => setFormData({ ...formData, stationColumn: e.target.value })}
                      placeholder="station"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cột giá trị</Label>
                    <Input
                      value={formData.valueColumn}
                      onChange={(e) => setFormData({ ...formData, valueColumn: e.target.value })}
                      placeholder="value"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cột thời gian</Label>
                    <Input
                      value={formData.timestampColumn}
                      onChange={(e) => setFormData({ ...formData, timestampColumn: e.target.value })}
                      placeholder="timestamp"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>USL (Upper Spec Limit)</Label>
                    <Input
                      type="number"
                      value={formData.usl ?? ""}
                      onChange={(e) => setFormData({ ...formData, usl: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="VD: 100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LSL (Lower Spec Limit)</Label>
                    <Input
                      type="number"
                      value={formData.lsl ?? ""}
                      onChange={(e) => setFormData({ ...formData, lsl: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="VD: 80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target</Label>
                    <Input
                      type="number"
                      value={formData.target ?? ""}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="VD: 90"
                    />
                  </div>
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
                  {editingId ? "Cập nhật" : "Tạo mới"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mappings Table */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle>Danh sách Mapping</CardTitle>
            <CardDescription>
              {mappings?.length || 0} mapping đã được cấu hình
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mappings && mappings.length > 0 ? (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã sản phẩm</TableHead>
                      <TableHead>Trạm</TableHead>
                      <TableHead>Bảng dữ liệu</TableHead>
                      <TableHead>USL</TableHead>
                      <TableHead>LSL</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-medium">{mapping.productCode}</TableCell>
                        <TableCell>{mapping.stationName}</TableCell>
                        <TableCell className="font-mono text-sm">{mapping.tableName}</TableCell>
                        <TableCell>{mapping.usl ?? "-"}</TableCell>
                        <TableCell>{mapping.lsl ?? "-"}</TableCell>
                        <TableCell>{mapping.target ?? "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(mapping)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(mapping.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Chưa có mapping nào</h3>
                <p className="text-muted-foreground mt-1">
                  Thêm mapping để bắt đầu phân tích SPC/CPK
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
