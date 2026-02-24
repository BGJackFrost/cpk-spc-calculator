import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Plus,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileText,
  Package
} from "lucide-react";

export default function InventoryCheck() {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCheckId, setSelectedCheckId] = useState<number | null>(null);
  const [createData, setCreateData] = useState({
    checkType: "full" as "full" | "partial" | "cycle" | "spot",
    warehouseLocation: "",
    category: "",
    notes: "",
  });

  // Queries
  const { data: checks, refetch: refetchChecks } = trpc.spareParts.listInventoryChecks.useQuery({});
  const { data: checkDetail, refetch: refetchDetail } = trpc.spareParts.getInventoryCheck.useQuery(
    { id: selectedCheckId! },
    { enabled: !!selectedCheckId }
  );

  // Mutations
  const createMutation = trpc.spareParts.createInventoryCheck.useMutation({
    onSuccess: (data) => {
      toast.success(`Tạo phiếu kiểm kê ${data.checkNumber} thành công`);
      setCreateOpen(false);
      refetchChecks();
      setCreateData({ checkType: "full", warehouseLocation: "", category: "", notes: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateItemMutation = trpc.spareParts.updateCheckItem.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật thành công");
      refetchDetail();
    },
    onError: (error) => toast.error(error.message),
  });

  const completeMutation = trpc.spareParts.completeInventoryCheck.useMutation({
    onSuccess: () => {
      toast.success("Hoàn thành kiểm kê");
      refetchChecks();
      refetchDetail();
    },
    onError: (error) => toast.error(error.message),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="secondary">Nháp</Badge>;
      case "in_progress": return <Badge variant="default">Đang kiểm</Badge>;
      case "completed": return <Badge className="bg-green-500">Hoàn thành</Badge>;
      case "cancelled": return <Badge variant="destructive">Đã hủy</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getCheckTypeLabel = (type: string) => {
    switch (type) {
      case "full": return "Toàn bộ";
      case "partial": return "Một phần";
      case "cycle": return "Định kỳ";
      case "spot": return "Đột xuất";
      default: return type;
    }
  };

  const openDetail = (id: number) => {
    setSelectedCheckId(id);
    setDetailOpen(true);
  };

  const handleUpdateItem = (itemId: number, actualQuantity: number, notes?: string) => {
    updateItemMutation.mutate({ itemId, actualQuantity, notes });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kiểm Kê Kho</h1>
            <p className="text-muted-foreground">Quản lý và thực hiện kiểm kê tồn kho phụ tùng</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Tạo phiếu kiểm kê
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo phiếu kiểm kê mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Loại kiểm kê</Label>
                  <Select value={createData.checkType} onValueChange={(v: any) => setCreateData({ ...createData, checkType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Toàn bộ kho</SelectItem>
                      <SelectItem value="partial">Một phần</SelectItem>
                      <SelectItem value="cycle">Định kỳ</SelectItem>
                      <SelectItem value="spot">Đột xuất</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vị trí kho (tùy chọn)</Label>
                    <Input
                      value={createData.warehouseLocation}
                      onChange={(e) => setCreateData({ ...createData, warehouseLocation: e.target.value })}
                      placeholder="Lọc theo vị trí"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Danh mục (tùy chọn)</Label>
                    <Input
                      value={createData.category}
                      onChange={(e) => setCreateData({ ...createData, category: e.target.value })}
                      placeholder="Lọc theo danh mục"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ghi chú</Label>
                  <Textarea
                    value={createData.notes}
                    onChange={(e) => setCreateData({ ...createData, notes: e.target.value })}
                    placeholder="Ghi chú về đợt kiểm kê..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
                <Button onClick={() => createMutation.mutate(createData)}>Tạo phiếu</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Tổng phiếu</p>
                  <p className="text-xl font-bold">{checks?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Đang kiểm</p>
                  <p className="text-xl font-bold">{checks?.filter((c: any) => c.status === 'in_progress').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Hoàn thành</p>
                  <p className="text-xl font-bold">{checks?.filter((c: any) => c.status === 'completed').length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Có chênh lệch</p>
                  <p className="text-xl font-bold">{checks?.filter((c: any) => (c.discrepancyItems || 0) > 0).length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Checks List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách phiếu kiểm kê</CardTitle>
            <CardDescription>Quản lý các đợt kiểm kê kho</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số phiếu</TableHead>
                  <TableHead>Ngày kiểm</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Tiến độ</TableHead>
                  <TableHead>Chênh lệch</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks?.map((check: any) => {
                  const progress = check.totalItems > 0 ? (check.checkedItems / check.totalItems) * 100 : 0;
                  return (
                    <TableRow key={check.id}>
                      <TableCell className="font-medium">{check.checkNumber}</TableCell>
                      <TableCell>{new Date(check.checkDate).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell>{getCheckTypeLabel(check.checkType)}</TableCell>
                      <TableCell>{getStatusBadge(check.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="w-20 h-2" />
                          <span className="text-sm text-muted-foreground">
                            {check.checkedItems}/{check.totalItems}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {check.discrepancyItems > 0 ? (
                          <Badge variant="destructive">{check.discrepancyItems} mục</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(check.id)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!checks || checks.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Chưa có phiếu kiểm kê nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chi tiết phiếu kiểm kê {checkDetail?.checkNumber}</DialogTitle>
            </DialogHeader>
            {checkDetail && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Ngày kiểm</p>
                    <p className="font-medium">{new Date(checkDetail.checkDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Loại</p>
                    <p className="font-medium">{getCheckTypeLabel(checkDetail.checkType)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trạng thái</p>
                    {getStatusBadge(checkDetail.status || "")}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tiến độ</p>
                    <p className="font-medium">{checkDetail.checkedItems}/{checkDetail.totalItems} mục</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã PT</TableHead>
                      <TableHead>Tên phụ tùng</TableHead>
                      <TableHead className="text-right">SL hệ thống</TableHead>
                      <TableHead className="text-right">SL thực tế</TableHead>
                      <TableHead className="text-right">Chênh lệch</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkDetail.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.partNumber}</TableCell>
                        <TableCell>{item.partName}</TableCell>
                        <TableCell className="text-right">{item.systemQuantity}</TableCell>
                        <TableCell className="text-right">
                          {checkDetail.status !== 'completed' ? (
                            <Input
                              type="number"
                              min={0}
                              className="w-20 text-right"
                              defaultValue={item.actualQuantity ?? ''}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                  handleUpdateItem(item.id, val);
                                }
                              }}
                            />
                          ) : (
                            item.actualQuantity ?? '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.discrepancy !== null && (
                            <span className={item.discrepancy === 0 ? 'text-green-600' : 'text-red-600'}>
                              {item.discrepancy > 0 ? '+' : ''}{item.discrepancy}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'counted' ? 'default' : 'secondary'}>
                            {item.status === 'pending' ? 'Chờ' : item.status === 'counted' ? 'Đã đếm' : item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {checkDetail.status !== 'completed' && (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => completeMutation.mutate({ checkId: checkDetail.id, adjustInventory: false })}
                    >
                      Hoàn thành (không điều chỉnh)
                    </Button>
                    <Button
                      onClick={() => completeMutation.mutate({ checkId: checkDetail.id, adjustInventory: true })}
                    >
                      Hoàn thành & Điều chỉnh tồn kho
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
