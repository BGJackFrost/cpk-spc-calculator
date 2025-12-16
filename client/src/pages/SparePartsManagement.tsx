import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Package, Search, Plus, AlertTriangle, TrendingDown, 
  ShoppingCart, Truck, Building2, ArrowUpDown, FileText,
  CheckCircle2, Clock, XCircle, RefreshCw
} from "lucide-react";

export default function SparePartsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);

  // Queries
  const { data: parts, refetch: refetchParts } = trpc.spareParts.listParts.useQuery({
    search: searchTerm || undefined,
    lowStock: showLowStock || undefined,
    category: selectedCategory || undefined,
  });

  const { data: suppliers } = trpc.spareParts.listSuppliers.useQuery();
  const { data: purchaseOrders } = trpc.spareParts.listPurchaseOrders.useQuery({ limit: 50 });
  const { data: transactions } = trpc.spareParts.listTransactions.useQuery({ limit: 50 });
  const { data: stats } = trpc.spareParts.getStats.useQuery();
  const { data: reorderSuggestions } = trpc.spareParts.getReorderSuggestions.useQuery();

  // Mutations
  const createPartMutation = trpc.spareParts.createPart.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm phụ tùng mới");
      refetchParts();
      setIsAddPartOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const createSupplierMutation = trpc.spareParts.createSupplier.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm nhà cung cấp mới");
      setIsAddSupplierOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const createTransactionMutation = trpc.spareParts.createTransaction.useMutation({
    onSuccess: () => {
      toast.success("Đã ghi nhận giao dịch");
      refetchParts();
    },
    onError: (err) => toast.error(err.message),
  });

  const updatePOStatusMutation = trpc.spareParts.updatePurchaseOrderStatus.useMutation({
    onSuccess: () => toast.success("Đã cập nhật trạng thái đơn hàng"),
    onError: (err) => toast.error(err.message),
  });

  const { data: purchaseOrdersData, refetch: refetchPurchaseOrders } = trpc.spareParts.listPurchaseOrders.useQuery({ limit: 50 });

  const createPurchaseOrderMutation = trpc.spareParts.createPurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo đơn hàng mới");
      refetchPurchaseOrders();
      setIsCreatePOOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // State for PO form
  const [poSupplierId, setPOSupplierId] = useState<string>("");
  const [poExpectedDate, setPOExpectedDate] = useState<string>("");
  const [poNotes, setPONotes] = useState<string>("");
  const [poItems, setPOItems] = useState<Array<{ sparePartId: number; quantity: number; unitPrice: number; partName: string }>>([]);

  const handleAddPOItem = (partId: number, partName: string, unitPrice: number) => {
    const existing = poItems.find(item => item.sparePartId === partId);
    if (existing) {
      setPOItems(poItems.map(item => 
        item.sparePartId === partId ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setPOItems([...poItems, { sparePartId: partId, quantity: 1, unitPrice, partName }]);
    }
  };

  const handleRemovePOItem = (partId: number) => {
    setPOItems(poItems.filter(item => item.sparePartId !== partId));
  };

  const handleUpdatePOItemQty = (partId: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemovePOItem(partId);
    } else {
      setPOItems(poItems.map(item => 
        item.sparePartId === partId ? { ...item, quantity } : item
      ));
    }
  };

  const handleCreatePO = () => {
    if (!poSupplierId) {
      toast.error("Vui lòng chọn nhà cung cấp");
      return;
    }
    if (poItems.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 phụ tùng");
      return;
    }
    createPurchaseOrderMutation.mutate({
      supplierId: Number(poSupplierId),
      expectedDeliveryDate: poExpectedDate || undefined,
      notes: poNotes || undefined,
      items: poItems.map(item => ({
        sparePartId: item.sparePartId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
  };

  const resetPOForm = () => {
    setPOSupplierId("");
    setPOExpectedDate("");
    setPONotes("");
    setPOItems([]);
  };

  const handleAddPart = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPartMutation.mutate({
      partNumber: formData.get("partNumber") as string,
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      category: formData.get("category") as string || undefined,
      unit: formData.get("unit") as string || "pcs",
      minStock: Number(formData.get("minStock")) || undefined,
      maxStock: Number(formData.get("maxStock")) || undefined,
      reorderPoint: Number(formData.get("reorderPoint")) || undefined,
      reorderQuantity: Number(formData.get("reorderQuantity")) || undefined,
      unitPrice: Number(formData.get("unitPrice")) || undefined,
      supplierId: formData.get("supplierId") ? Number(formData.get("supplierId")) : undefined,
    });
  };

  const handleAddSupplier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createSupplierMutation.mutate({
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      contactPerson: formData.get("contactPerson") as string || undefined,
      email: formData.get("email") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      address: formData.get("address") as string || undefined,
    });
  };

  const handleQuickTransaction = (partId: number, type: "in" | "out", quantity: number) => {
    createTransactionMutation.mutate({
      sparePartId: partId,
      transactionType: type,
      quantity,
      reason: type === "in" ? "Nhập kho" : "Xuất kho sử dụng",
    });
  };

  const getStockStatus = (current: number | null, min: number | null, reorder: number | null) => {
    const stock = current || 0;
    const threshold = reorder || min || 0;
    if (stock <= 0) return { label: "Hết hàng", color: "destructive" as const };
    if (stock <= threshold) return { label: "Cần đặt hàng", color: "warning" as const };
    return { label: "Đủ hàng", color: "success" as const };
  };

  const getPOStatusBadge = (status: string | null) => {
    switch (status) {
      case "draft": return <Badge variant="outline"><FileText className="w-3 h-3 mr-1" />Nháp</Badge>;
      case "pending": return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>;
      case "approved": return <Badge className="bg-blue-500"><CheckCircle2 className="w-3 h-3 mr-1" />Đã duyệt</Badge>;
      case "ordered": return <Badge className="bg-purple-500"><ShoppingCart className="w-3 h-3 mr-1" />Đã đặt</Badge>;
      case "partial_received": return <Badge className="bg-orange-500"><Truck className="w-3 h-3 mr-1" />Nhận một phần</Badge>;
      case "received": return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Đã nhận</Badge>;
      case "cancelled": return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Đã hủy</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Phụ tùng</h1>
            <p className="text-muted-foreground">Quản lý kho phụ tùng, nhà cung cấp và đơn đặt hàng</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Building2 className="w-4 h-4 mr-2" />Thêm NCC</Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddSupplier}>
                  <DialogHeader>
                    <DialogTitle>Thêm Nhà cung cấp</DialogTitle>
                    <DialogDescription>Nhập thông tin nhà cung cấp mới</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="code">Mã NCC *</Label>
                        <Input id="code" name="code" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Tên NCC *</Label>
                        <Input id="name" name="name" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactPerson">Người liên hệ</Label>
                        <Input id="contactPerson" name="contactPerson" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Điện thoại</Label>
                        <Input id="phone" name="phone" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Địa chỉ</Label>
                      <Input id="address" name="address" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createSupplierMutation.isPending}>Thêm</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddPartOpen} onOpenChange={setIsAddPartOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Thêm Phụ tùng</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <form onSubmit={handleAddPart}>
                  <DialogHeader>
                    <DialogTitle>Thêm Phụ tùng mới</DialogTitle>
                    <DialogDescription>Nhập thông tin phụ tùng cần quản lý</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="partNumber">Mã phụ tùng *</Label>
                        <Input id="partNumber" name="partNumber" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="partName">Tên phụ tùng *</Label>
                        <Input id="partName" name="name" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Danh mục</Label>
                        <Input id="category" name="category" placeholder="VD: Điện, Cơ khí..." />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit">Đơn vị</Label>
                        <Input id="unit" name="unit" defaultValue="pcs" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unitPrice">Đơn giá</Label>
                        <Input id="unitPrice" name="unitPrice" type="number" step="0.01" />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minStock">Tồn tối thiểu</Label>
                        <Input id="minStock" name="minStock" type="number" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxStock">Tồn tối đa</Label>
                        <Input id="maxStock" name="maxStock" type="number" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reorderPoint">Điểm đặt hàng</Label>
                        <Input id="reorderPoint" name="reorderPoint" type="number" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reorderQuantity">SL đặt hàng</Label>
                        <Input id="reorderQuantity" name="reorderQuantity" type="number" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplierId">Nhà cung cấp</Label>
                      <Select name="supplierId">
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn nhà cung cấp" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers?.map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Mô tả</Label>
                      <Input id="description" name="description" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createPartMutation.isPending}>Thêm</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng phụ tùng</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalParts || 0}</div>
              <p className="text-xs text-muted-foreground">loại phụ tùng đang quản lý</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cần đặt hàng</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats?.lowStockCount || 0}</div>
              <p className="text-xs text-muted-foreground">phụ tùng dưới mức tối thiểu</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Giá trị tồn kho</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats?.inventoryValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">tổng giá trị phụ tùng</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đơn hàng chờ</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingPOs || 0}</div>
              <p className="text-xs text-muted-foreground">đơn đang xử lý</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inventory">Kho phụ tùng</TabsTrigger>
            <TabsTrigger value="reorder">Đề xuất đặt hàng</TabsTrigger>
            <TabsTrigger value="orders">Đơn đặt hàng</TabsTrigger>
            <TabsTrigger value="transactions">Lịch sử giao dịch</TabsTrigger>
            <TabsTrigger value="suppliers">Nhà cung cấp</TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Danh sách phụ tùng</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                    <Button
                      variant={showLowStock ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowLowStock(!showLowStock)}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Tồn thấp
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã PT</TableHead>
                      <TableHead>Tên phụ tùng</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead className="text-center">Tồn kho</TableHead>
                      <TableHead className="text-center">Min/Max</TableHead>
                      <TableHead>Đơn giá</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parts?.map((part) => {
                      const status = getStockStatus(part.currentStock, part.minStock, part.reorderPoint);
                      return (
                        <TableRow key={part.id}>
                          <TableCell className="font-mono">{part.partNumber}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{part.name}</div>
                              {part.supplierName && (
                                <div className="text-xs text-muted-foreground">NCC: {part.supplierName}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{part.category || "-"}</TableCell>
                          <TableCell className="text-center font-bold">{part.currentStock || 0} {part.unit}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {part.minStock || 0} / {part.maxStock || "-"}
                          </TableCell>
                          <TableCell>
                            {part.unitPrice ? new Intl.NumberFormat('vi-VN').format(Number(part.unitPrice)) : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.color === "success" ? "default" : status.color === "warning" ? "secondary" : "destructive"}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickTransaction(part.id, "in", 1)}
                              >
                                +1
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickTransaction(part.id, "out", 1)}
                                disabled={(part.currentStock || 0) <= 0}
                              >
                                -1
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!parts || parts.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Chưa có phụ tùng nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reorder Suggestions Tab */}
          <TabsContent value="reorder" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Đề xuất đặt hàng</CardTitle>
                <CardDescription>Phụ tùng cần bổ sung dựa trên mức tồn kho tối thiểu</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã PT</TableHead>
                      <TableHead>Tên phụ tùng</TableHead>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead className="text-center">Tồn hiện tại</TableHead>
                      <TableHead className="text-center">Điểm đặt hàng</TableHead>
                      <TableHead className="text-center">SL đề xuất</TableHead>
                      <TableHead>Chi phí ước tính</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reorderSuggestions?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.partNumber}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.supplierName || "-"}</TableCell>
                        <TableCell className="text-center text-red-500 font-bold">{item.currentStock || 0}</TableCell>
                        <TableCell className="text-center">{item.reorderPoint || item.minStock || 0}</TableCell>
                        <TableCell className="text-center font-bold text-blue-600">{item.suggestedQuantity}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.estimatedCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!reorderSuggestions || reorderSuggestions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                          Tất cả phụ tùng đều đủ tồn kho
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Đơn đặt hàng</CardTitle>
                    <CardDescription>Quản lý các đơn đặt hàng phụ tùng</CardDescription>
                  </div>
                  <Button onClick={() => setIsCreatePOOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />Tạo đơn hàng
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Số PO</TableHead>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Tổng tiền</TableHead>
                      <TableHead>Ngày đặt</TableHead>
                      <TableHead>Dự kiến nhận</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders?.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono font-medium">{po.poNumber}</TableCell>
                        <TableCell>{po.supplierName}</TableCell>
                        <TableCell>{getPOStatusBadge(po.status)}</TableCell>
                        <TableCell>
                          {po.total ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(po.total)) : "-"}
                        </TableCell>
                        <TableCell>
                          {po.orderDate ? new Date(po.orderDate).toLocaleDateString('vi-VN') : "-"}
                        </TableCell>
                        <TableCell>
                          {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('vi-VN') : "-"}
                        </TableCell>
                        <TableCell>
                          {po.status === "draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePOStatusMutation.mutate({ id: po.id, status: "pending" })}
                            >
                              Gửi duyệt
                            </Button>
                          )}
                          {po.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePOStatusMutation.mutate({ id: po.id, status: "approved" })}
                            >
                              Duyệt
                            </Button>
                          )}
                          {po.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePOStatusMutation.mutate({ id: po.id, status: "ordered" })}
                            >
                              Đã đặt
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!purchaseOrders || purchaseOrders.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Chưa có đơn đặt hàng nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử giao dịch</CardTitle>
                <CardDescription>Theo dõi các giao dịch nhập/xuất kho</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Phụ tùng</TableHead>
                      <TableHead>Loại GD</TableHead>
                      <TableHead className="text-center">Số lượng</TableHead>
                      <TableHead>Đơn giá</TableHead>
                      <TableHead>Thành tiền</TableHead>
                      <TableHead>Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : "-"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{tx.partName}</div>
                            <div className="text-xs text-muted-foreground">{tx.partNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.transactionType === "in" || tx.transactionType === "return" ? "default" : "secondary"}>
                            {tx.transactionType === "in" ? "Nhập" : 
                             tx.transactionType === "out" ? "Xuất" : 
                             tx.transactionType === "return" ? "Trả lại" : "Điều chỉnh"}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-center font-bold ${tx.transactionType === "in" || tx.transactionType === "return" ? "text-green-600" : "text-red-600"}`}>
                          {tx.transactionType === "in" || tx.transactionType === "return" ? "+" : "-"}{tx.quantity}
                        </TableCell>
                        <TableCell>
                          {tx.unitCost ? new Intl.NumberFormat('vi-VN').format(Number(tx.unitCost)) : "-"}
                        </TableCell>
                        <TableCell>
                          {tx.totalCost ? new Intl.NumberFormat('vi-VN').format(Number(tx.totalCost)) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{tx.reason || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {(!transactions || transactions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Chưa có giao dịch nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách nhà cung cấp</CardTitle>
                <CardDescription>Quản lý thông tin nhà cung cấp phụ tùng</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã NCC</TableHead>
                      <TableHead>Tên nhà cung cấp</TableHead>
                      <TableHead>Người liên hệ</TableHead>
                      <TableHead>Điện thoại</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Địa chỉ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers?.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-mono">{supplier.code}</TableCell>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.contactPerson || "-"}</TableCell>
                        <TableCell>{supplier.phone || "-"}</TableCell>
                        <TableCell>{supplier.email || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{supplier.address || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {(!suppliers || suppliers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Chưa có nhà cung cấp nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog tạo đơn hàng */}
        <Dialog open={isCreatePOOpen} onOpenChange={(open) => {
          setIsCreatePOOpen(open);
          if (!open) resetPOForm();
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tạo Đơn đặt hàng mới</DialogTitle>
              <DialogDescription>Chọn nhà cung cấp và thêm phụ tùng cần đặt</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nhà cung cấp *</Label>
                  <Select value={poSupplierId} onValueChange={setPOSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhà cung cấp" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ngày dự kiến nhận</Label>
                  <Input 
                    type="date" 
                    value={poExpectedDate} 
                    onChange={(e) => setPOExpectedDate(e.target.value)} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Input 
                  value={poNotes} 
                  onChange={(e) => setPONotes(e.target.value)} 
                  placeholder="Ghi chú cho đơn hàng..." 
                />
              </div>

              {/* Chọn phụ tùng */}
              <div className="space-y-2">
                <Label>Chọn phụ tùng cần đặt</Label>
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã PT</TableHead>
                        <TableHead>Tên</TableHead>
                        <TableHead>Đơn giá</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parts?.map((part) => (
                        <TableRow key={part.id}>
                          <TableCell className="font-mono text-sm">{part.partNumber}</TableCell>
                          <TableCell>{part.name}</TableCell>
                          <TableCell>
                            {part.unitPrice ? new Intl.NumberFormat('vi-VN').format(Number(part.unitPrice)) : "-"}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAddPOItem(part.id, part.name, Number(part.unitPrice) || 0)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Danh sách phụ tùng đã chọn */}
              {poItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Phụ tùng đã chọn ({poItems.length})</Label>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên phụ tùng</TableHead>
                          <TableHead className="w-32">Số lượng</TableHead>
                          <TableHead>Đơn giá</TableHead>
                          <TableHead>Thành tiền</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {poItems.map((item) => (
                          <TableRow key={item.sparePartId}>
                            <TableCell>{item.partName}</TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdatePOItemQty(item.sparePartId, Number(e.target.value))}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              {new Intl.NumberFormat('vi-VN').format(item.unitPrice)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {new Intl.NumberFormat('vi-VN').format(item.quantity * item.unitPrice)}
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleRemovePOItem(item.sparePartId)}
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-bold">Tổng cộng:</TableCell>
                          <TableCell colSpan={2} className="font-bold text-lg">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                              poItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreatePOOpen(false)}>Hủy</Button>
              <Button onClick={handleCreatePO} disabled={createPurchaseOrderMutation.isPending}>
                {createPurchaseOrderMutation.isPending ? "Đang tạo..." : "Tạo đơn hàng"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
