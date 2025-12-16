import { useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Package, Search, Plus, AlertTriangle, TrendingDown, 
  ShoppingCart, Truck, Building2, ArrowUpDown, FileText,
  CheckCircle2, Clock, XCircle, RefreshCw, Download, Bell,
  MoreHorizontal, Pencil, Trash2, QrCode, BarChart3, Camera, Printer, ScanLine, Mail, BookOpen, HelpCircle
} from "lucide-react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import QRScanner from "@/components/QRScanner";

export default function SparePartsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);
  
  // Filter states for transactions
  const [txDateFrom, setTxDateFrom] = useState<string>("");
  const [txDateTo, setTxDateTo] = useState<string>("");
  const [txType, setTxType] = useState<string>("");
  
  // Edit/Delete states for parts
  const [isEditPartOpen, setIsEditPartOpen] = useState(false);
  const [isDeletePartOpen, setIsDeletePartOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [editPartForm, setEditPartForm] = useState({
    name: "", partNumber: "", category: "", unit: "pcs",
    minStock: 0, maxStock: 0, reorderPoint: 0, unitPrice: 0,
    supplierId: "", description: ""
  });
  
  // Edit/Delete states for suppliers
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);
  const [isDeleteSupplierOpen, setIsDeleteSupplierOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [editSupplierForm, setEditSupplierForm] = useState({
    name: "", contactPerson: "", phone: "", email: "", address: ""
  });
  
  // Pagination states
  const [partsPage, setPartsPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const pageSize = 10;
  
  // QR Code states
  const [isQROpen, setIsQROpen] = useState(false);
  const [qrPart, setQRPart] = useState<any>(null);
  const [qrDataUrl, setQRDataUrl] = useState<string>("");
  
  // QR Scanner states
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [scannedPartInfo, setScannedPartInfo] = useState<any>(null);
  
  // Bulk QR Print states
  const [isBulkQROpen, setIsBulkQROpen] = useState(false);
  const [selectedPartsForQR, setSelectedPartsForQR] = useState<number[]>([]);
  const [bulkQRDataUrls, setBulkQRDataUrls] = useState<Map<number, string>>(new Map());

  // Queries
  const { data: parts, refetch: refetchParts } = trpc.spareParts.listParts.useQuery({
    search: searchTerm || undefined,
    lowStock: showLowStock || undefined,
    category: selectedCategory || undefined,
  });

  const { data: suppliers } = trpc.spareParts.listSuppliers.useQuery();
  const { data: purchaseOrders } = trpc.spareParts.listPurchaseOrders.useQuery({ limit: 50 });
  const { data: transactions, refetch: refetchTransactions } = trpc.spareParts.listTransactions.useQuery({ 
    limit: 100,
    dateFrom: txDateFrom || undefined,
    dateTo: txDateTo || undefined,
    type: txType || undefined,
  });
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

  const updatePartMutation = trpc.spareParts.updatePart.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật phụ tùng");
      refetchParts();
      setIsEditPartOpen(false);
      setSelectedPart(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deletePartMutation = trpc.spareParts.deletePart.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa phụ tùng");
      refetchParts();
      setIsDeletePartOpen(false);
      setSelectedPart(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateSupplierMutation = trpc.spareParts.updateSupplier.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật nhà cung cấp");
      setIsEditSupplierOpen(false);
      setSelectedSupplier(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteSupplierMutation = trpc.spareParts.deleteSupplier.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa nhà cung cấp");
      setIsDeleteSupplierOpen(false);
      setSelectedSupplier(null);
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

  const sendEmailAlertMutation = trpc.spareParts.sendLowStockEmailAlert.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
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

  // Handlers for Edit/Delete Part
  const handleEditPart = (part: any) => {
    setSelectedPart(part);
    setEditPartForm({
      name: part.name || "",
      partNumber: part.partNumber || "",
      category: part.category || "",
      unit: part.unit || "pcs",
      minStock: part.minStock || 0,
      maxStock: part.maxStock || 0,
      reorderPoint: part.reorderPoint || 0,
      unitPrice: part.unitPrice || 0,
      supplierId: part.supplierId ? String(part.supplierId) : "",
      description: part.description || ""
    });
    setIsEditPartOpen(true);
  };

  const handleUpdatePart = () => {
    if (!selectedPart) return;
    updatePartMutation.mutate({
      id: selectedPart.id,
      name: editPartForm.name,
      partNumber: editPartForm.partNumber,
      category: editPartForm.category || undefined,
      unit: editPartForm.unit,
      minStock: editPartForm.minStock,
      maxStock: editPartForm.maxStock || undefined,
      reorderPoint: editPartForm.reorderPoint || undefined,
      unitPrice: editPartForm.unitPrice || undefined,
      supplierId: editPartForm.supplierId ? Number(editPartForm.supplierId) : undefined,
      description: editPartForm.description || undefined
    });
  };

  const handleDeletePart = (part: any) => {
    setSelectedPart(part);
    setIsDeletePartOpen(true);
  };

  const confirmDeletePart = () => {
    if (!selectedPart) return;
    deletePartMutation.mutate({ id: selectedPart.id });
  };

  // Handlers for Edit/Delete Supplier
  const handleEditSupplier = (supplier: any) => {
    setSelectedSupplier(supplier);
    setEditSupplierForm({
      name: supplier.name || "",
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || ""
    });
    setIsEditSupplierOpen(true);
  };

  const handleUpdateSupplier = () => {
    if (!selectedSupplier) return;
    updateSupplierMutation.mutate({
      id: selectedSupplier.id,
      name: editSupplierForm.name,
      contactPerson: editSupplierForm.contactPerson || undefined,
      phone: editSupplierForm.phone || undefined,
      email: editSupplierForm.email || undefined,
      address: editSupplierForm.address || undefined
    });
  };

  const handleDeleteSupplier = (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsDeleteSupplierOpen(true);
  };

  const confirmDeleteSupplier = () => {
    if (!selectedSupplier) return;
    deleteSupplierMutation.mutate({ id: selectedSupplier.id });
  };

  // QR Code handler
  const handleShowQR = async (part: any) => {
    setQRPart(part);
    try {
      const qrData = JSON.stringify({
        id: part.id,
        partNumber: part.partNumber,
        name: part.name,
        category: part.category,
        stock: part.currentStock
      });
      const dataUrl = await QRCode.toDataURL(qrData, { width: 256, margin: 2 });
      setQRDataUrl(dataUrl);
      setIsQROpen(true);
    } catch (err) {
      toast.error("Không thể tạo mã QR");
    }
  };

  // QR Scanner handler
  const handleQRScanSuccess = (data: any) => {
    if (data.id) {
      // Find part by ID from scanned QR
      const foundPart = parts?.find(p => p.id === data.id);
      if (foundPart) {
        setScannedPartInfo(foundPart);
        toast.success(`Tìm thấy: ${foundPart.name}`);
      } else {
        toast.error("Không tìm thấy phụ tùng trong hệ thống");
      }
    } else if (data.partNumber) {
      // Find part by partNumber
      const foundPart = parts?.find(p => p.partNumber === data.partNumber);
      if (foundPart) {
        setScannedPartInfo(foundPart);
        toast.success(`Tìm thấy: ${foundPart.name}`);
      } else {
        toast.error("Không tìm thấy phụ tùng trong hệ thống");
      }
    }
  };

  // Bulk QR handlers
  const togglePartForQR = (partId: number) => {
    setSelectedPartsForQR(prev => 
      prev.includes(partId) 
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
  };

  const selectAllPartsForQR = () => {
    if (selectedPartsForQR.length === (parts?.length || 0)) {
      setSelectedPartsForQR([]);
    } else {
      setSelectedPartsForQR(parts?.map(p => p.id) || []);
    }
  };

  const generateBulkQRCodes = async () => {
    const selectedParts = parts?.filter(p => selectedPartsForQR.includes(p.id)) || [];
    const newQRDataUrls = new Map<number, string>();
    
    for (const part of selectedParts) {
      try {
        const qrData = JSON.stringify({
          id: part.id,
          partNumber: part.partNumber,
          name: part.name,
          category: part.category,
          stock: part.currentStock
        });
        const dataUrl = await QRCode.toDataURL(qrData, { width: 150, margin: 1 });
        newQRDataUrls.set(part.id, dataUrl);
      } catch (err) {
        console.error(`Error generating QR for ${part.partNumber}:`, err);
      }
    }
    
    setBulkQRDataUrls(newQRDataUrls);
    setIsBulkQROpen(true);
  };

  const printBulkQRCodes = () => {
    const selectedParts = parts?.filter(p => selectedPartsForQR.includes(p.id)) || [];
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Không thể mở cửa sổ in. Vui lòng cho phép popup.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>In nhãn QR - Phụ tùng</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .label { border: 1px solid #ccc; padding: 10px; text-align: center; page-break-inside: avoid; }
          .label img { width: 120px; height: 120px; }
          .label .part-number { font-family: monospace; font-weight: bold; font-size: 14px; margin-top: 5px; }
          .label .part-name { font-size: 12px; color: #666; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
          .label .stock { font-size: 11px; color: #999; margin-top: 3px; }
          @media print {
            .no-print { display: none; }
            .grid { grid-template-columns: repeat(3, 1fr); }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">In nhãn</button>
          <span style="margin-left: 10px;">Tổng: ${selectedParts.length} nhãn</span>
        </div>
        <div class="grid">
          ${selectedParts.map(part => `
            <div class="label">
              <img src="${bulkQRDataUrls.get(part.id) || ''}" alt="QR" />
              <div class="part-number">${part.partNumber}</div>
              <div class="part-name">${part.name}</div>
              <div class="stock">Tồn: ${part.currentStock || 0} ${part.unit || 'pcs'}</div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
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
            <Link href="/spare-parts-guide">
              <Button variant="outline">
                <BookOpen className="w-4 h-4 mr-2" />Hướng dẫn
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setIsQRScannerOpen(true)}>
              <Camera className="w-4 h-4 mr-2" />Quét QR
            </Button>
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

          <Card className={(stats?.lowStockCount || 0) > 0 ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cần đặt hàng</CardTitle>
              <div className="flex items-center gap-2">
                {(stats?.lowStockCount || 0) > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => sendEmailAlertMutation.mutate({})}
                      title="Gửi email cảnh báo"
                      disabled={sendEmailAlertMutation.isPending}
                    >
                      <Mail className="h-4 w-4 text-orange-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const lowStockParts = parts?.filter(p => (p.currentStock || 0) < (p.minStock || 0)) || [];
                        if (lowStockParts.length === 0) {
                          toast.info("Không có phụ tùng nào cần đặt hàng");
                          return;
                        }
                        const message = lowStockParts.map(p => `- ${p.name}: ${p.currentStock}/${p.minStock}`).join("\n");
                        toast.warning(
                          <div>
                            <div className="font-bold mb-2">Cảnh báo tồn kho thấp!</div>
                            <div className="text-sm whitespace-pre-line">{message}</div>
                          </div>,
                          { duration: 10000 }
                        );
                      }}
                      title="Xem chi tiết cảnh báo"
                    >
                      <Bell className="h-4 w-4 text-orange-500 animate-pulse" />
                    </Button>
                  </>
                )}
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
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
            <TabsTrigger value="dashboard"><BarChart3 className="w-4 h-4 mr-1" />Dashboard</TabsTrigger>
            <TabsTrigger value="inventory">Kho phụ tùng</TabsTrigger>
            <TabsTrigger value="reorder">Đề xuất đặt hàng</TabsTrigger>
            <TabsTrigger value="orders">Đơn đặt hàng</TabsTrigger>
            <TabsTrigger value="transactions">Lịch sử giao dịch</TabsTrigger>
            <TabsTrigger value="suppliers">Nhà cung cấp</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Stock by Category Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Phân bố theo danh mục
                  </CardTitle>
                  <CardDescription>Số lượng phụ tùng theo từng danh mục</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const categories = parts?.reduce((acc, p) => {
                        const cat = p.category || "Khác";
                        acc[cat] = (acc[cat] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>) || {};
                      const maxCount = Math.max(...Object.values(categories), 1);
                      return Object.entries(categories).map(([cat, count]) => (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{cat}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${(count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Stock Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Tình trạng tồn kho
                  </CardTitle>
                  <CardDescription>Phân loại theo mức tồn kho</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      const stockStatus = parts?.reduce((acc, p) => {
                        const stock = p.currentStock || 0;
                        const min = p.minStock || 0;
                        if (stock <= 0) acc.outOfStock++;
                        else if (stock <= min) acc.lowStock++;
                        else acc.inStock++;
                        return acc;
                      }, { inStock: 0, lowStock: 0, outOfStock: 0 }) || { inStock: 0, lowStock: 0, outOfStock: 0 };
                      const total = stockStatus.inStock + stockStatus.lowStock + stockStatus.outOfStock || 1;
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500" />
                              <span>Đủ hàng</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{stockStatus.inStock}</span>
                              <span className="text-muted-foreground text-sm">({Math.round(stockStatus.inStock / total * 100)}%)</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-orange-500" />
                              <span>Cần đặt hàng</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{stockStatus.lowStock}</span>
                              <span className="text-muted-foreground text-sm">({Math.round(stockStatus.lowStock / total * 100)}%)</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                              <span>Hết hàng</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{stockStatus.outOfStock}</span>
                              <span className="text-muted-foreground text-sm">({Math.round(stockStatus.outOfStock / total * 100)}%)</span>
                            </div>
                          </div>
                          {/* Visual bar */}
                          <div className="h-4 flex rounded-full overflow-hidden">
                            <div className="bg-green-500" style={{ width: `${stockStatus.inStock / total * 100}%` }} />
                            <div className="bg-orange-500" style={{ width: `${stockStatus.lowStock / total * 100}%` }} />
                            <div className="bg-red-500" style={{ width: `${stockStatus.outOfStock / total * 100}%` }} />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Top Value Parts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Top giá trị tồn kho
                  </CardTitle>
                  <CardDescription>Phụ tùng có giá trị tồn kho cao nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {parts?.sort((a, b) => ((b.currentStock || 0) * Number(b.unitPrice || 0)) - ((a.currentStock || 0) * Number(a.unitPrice || 0)))
                      .slice(0, 5)
                      .map((p, i) => (
                        <div key={p.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">{i + 1}</span>
                            <span className="truncate max-w-[150px]">{p.name}</span>
                          </div>
                          <span className="font-medium text-sm">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format((p.currentStock || 0) * Number(p.unitPrice || 0))}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Transactions Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Giao dịch gần đây
                  </CardTitle>
                  <CardDescription>Tổng hợp xuất/nhập kho</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const txSummary = transactions?.reduce((acc, tx) => {
                        if (tx.transactionType === "in") acc.totalIn += tx.quantity || 0;
                        else if (tx.transactionType === "out") acc.totalOut += tx.quantity || 0;
                        return acc;
                      }, { totalIn: 0, totalOut: 0 }) || { totalIn: 0, totalOut: 0 };
                      return (
                        <>
                          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Plus className="w-4 h-4 text-green-600" />
                              </div>
                              <span>Tổng nhập</span>
                            </div>
                            <span className="font-bold text-green-600">+{txSummary.totalIn}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              </div>
                              <span>Tổng xuất</span>
                            </div>
                            <span className="font-bold text-red-600">-{txSummary.totalOut}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <span>Chênh lệch</span>
                            <span className={`font-bold ${txSummary.totalIn - txSummary.totalOut >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {txSummary.totalIn - txSummary.totalOut >= 0 ? '+' : ''}{txSummary.totalIn - txSummary.totalOut}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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
                    {selectedPartsForQR.length > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={generateBulkQRCodes}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        In {selectedPartsForQR.length} nhãn QR
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!parts || parts.length === 0) {
                          toast.error("Không có dữ liệu để xuất");
                          return;
                        }
                        const exportData = parts.map(part => ({
                          "Mã PT": part.partNumber,
                          "Tên phụ tùng": part.name,
                          "Danh mục": part.category || "-",
                          "Tồn kho": part.currentStock || 0,
                          "Min": part.minStock || 0,
                          "Max": part.maxStock || 0,
                          "Đơn giá": part.unitPrice ? Number(part.unitPrice) : 0,
                          "Giá trị tồn": (part.currentStock || 0) * (part.unitPrice ? Number(part.unitPrice) : 0),
                          "Nhà cung cấp": part.supplierName || "-",
                          "Đơn vị": part.unit || "pcs",
                        }));
                        const ws = XLSX.utils.json_to_sheet(exportData);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Tồn kho phụ tùng");
                        const fileName = `ton-kho-phu-tung-${new Date().toISOString().split('T')[0]}.xlsx`;
                        XLSX.writeFile(wb, fileName);
                        toast.success(`Đã xuất file ${fileName}`);
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Xuất Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedPartsForQR.length === (parts?.length || 0) && (parts?.length || 0) > 0}
                          onChange={selectAllPartsForQR}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </TableHead>
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
                    {parts?.slice((partsPage - 1) * pageSize, partsPage * pageSize).map((part) => {
                      const status = getStockStatus(part.currentStock, part.minStock, part.reorderPoint);
                      return (
                        <TableRow key={part.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedPartsForQR.includes(part.id)}
                              onChange={() => togglePartForQR(part.id)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                          </TableCell>
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
                            <div className="flex gap-1 items-center">
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
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleShowQR(part)}>
                                    <QrCode className="w-4 h-4 mr-2" /> Xem mã QR
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditPart(part)}>
                                    <Pencil className="w-4 h-4 mr-2" /> Sửa thông tin
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeletePart(part)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" /> Xóa phụ tùng
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                {/* Pagination for Parts */}
                {parts && parts.length > pageSize && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-muted-foreground">
                      Hiển thị {((partsPage - 1) * pageSize) + 1} - {Math.min(partsPage * pageSize, parts.length)} / {parts.length} phụ tùng
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPartsPage(p => Math.max(1, p - 1))}
                        disabled={partsPage === 1}
                      >
                        Trước
                      </Button>
                      <span className="flex items-center px-3 text-sm">
                        Trang {partsPage} / {Math.ceil(parts.length / pageSize)}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPartsPage(p => Math.min(Math.ceil(parts.length / pageSize), p + 1))}
                        disabled={partsPage >= Math.ceil(parts.length / pageSize)}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
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
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Lịch sử giao dịch</CardTitle>
                    <CardDescription>Theo dõi các giao dịch nhập/xuất kho</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">Từ ngày:</Label>
                      <Input
                        type="date"
                        value={txDateFrom}
                        onChange={(e) => setTxDateFrom(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">Đến ngày:</Label>
                      <Input
                        type="date"
                        value={txDateTo}
                        onChange={(e) => setTxDateTo(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <Select value={txType} onValueChange={setTxType}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Loại GD" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="in">Nhập kho</SelectItem>
                        <SelectItem value="out">Xuất kho</SelectItem>
                        <SelectItem value="adjustment">Điều chỉnh</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTxDateFrom("");
                        setTxDateTo("");
                        setTxType("");
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Xóa lọc
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        if (!transactions || transactions.length === 0) {
                          toast.error("Không có dữ liệu để xuất");
                          return;
                        }
                        const exportData = transactions.map(tx => ({
                          "Thời gian": tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : "-",
                          "Mã phụ tùng": tx.partNumber || "-",
                          "Tên phụ tùng": tx.partName || "-",
                          "Loại GD": tx.transactionType === "in" ? "Nhập" : tx.transactionType === "out" ? "Xuất" : tx.transactionType === "return" ? "Trả lại" : "Điều chỉnh",
                          "Số lượng": tx.quantity,
                          "Đơn giá": tx.unitCost ? Number(tx.unitCost) : 0,
                          "Thành tiền": tx.totalCost ? Number(tx.totalCost) : 0,
                          "Ghi chú": tx.reason || "-",
                        }));
                        const ws = XLSX.utils.json_to_sheet(exportData);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Lịch sử giao dịch");
                        const fileName = `lich-su-giao-dich-${new Date().toISOString().split('T')[0]}.xlsx`;
                        XLSX.writeFile(wb, fileName);
                        toast.success(`Đã xuất file ${fileName}`);
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Xuất Excel
                    </Button>
                  </div>
                </div>
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
                      <TableHead>Thao tác</TableHead>
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
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditSupplier(supplier)}>
                                <Pencil className="w-4 h-4 mr-2" /> Sửa thông tin
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteSupplier(supplier)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Xóa NCC
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!suppliers || suppliers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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

        {/* Dialog Edit Part */}
        <Dialog open={isEditPartOpen} onOpenChange={setIsEditPartOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sửa thông tin phụ tùng</DialogTitle>
              <DialogDescription>Cập nhật thông tin phụ tùng {selectedPart?.name}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã phụ tùng *</Label>
                  <Input 
                    value={editPartForm.partNumber} 
                    onChange={(e) => setEditPartForm({...editPartForm, partNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên phụ tùng *</Label>
                  <Input 
                    value={editPartForm.name} 
                    onChange={(e) => setEditPartForm({...editPartForm, name: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Danh mục</Label>
                  <Input 
                    value={editPartForm.category} 
                    onChange={(e) => setEditPartForm({...editPartForm, category: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Đơn vị tính</Label>
                  <Select value={editPartForm.unit} onValueChange={(v) => setEditPartForm({...editPartForm, unit: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">pcs</SelectItem>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tồn tối thiểu</Label>
                  <Input 
                    type="number" 
                    value={editPartForm.minStock} 
                    onChange={(e) => setEditPartForm({...editPartForm, minStock: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tồn tối đa</Label>
                  <Input 
                    type="number" 
                    value={editPartForm.maxStock} 
                    onChange={(e) => setEditPartForm({...editPartForm, maxStock: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Điểm đặt hàng</Label>
                  <Input 
                    type="number" 
                    value={editPartForm.reorderPoint} 
                    onChange={(e) => setEditPartForm({...editPartForm, reorderPoint: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Đơn giá</Label>
                  <Input 
                    type="number" 
                    value={editPartForm.unitPrice} 
                    onChange={(e) => setEditPartForm({...editPartForm, unitPrice: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nhà cung cấp</Label>
                  <Select value={editPartForm.supplierId} onValueChange={(v) => setEditPartForm({...editPartForm, supplierId: v})}>
                    <SelectTrigger><SelectValue placeholder="Chọn NCC" /></SelectTrigger>
                    <SelectContent>
                      {suppliers?.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea 
                  value={editPartForm.description} 
                  onChange={(e) => setEditPartForm({...editPartForm, description: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditPartOpen(false)}>Hủy</Button>
              <Button onClick={handleUpdatePart} disabled={updatePartMutation.isPending}>
                {updatePartMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AlertDialog Delete Part */}
        <AlertDialog open={isDeletePartOpen} onOpenChange={setIsDeletePartOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa phụ tùng</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa phụ tùng <strong>{selectedPart?.name}</strong>? 
                Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePart} className="bg-destructive text-destructive-foreground">
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog Edit Supplier */}
        <Dialog open={isEditSupplierOpen} onOpenChange={setIsEditSupplierOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sửa thông tin nhà cung cấp</DialogTitle>
              <DialogDescription>Cập nhật thông tin NCC {selectedSupplier?.name}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Tên nhà cung cấp *</Label>
                <Input 
                  value={editSupplierForm.name} 
                  onChange={(e) => setEditSupplierForm({...editSupplierForm, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Người liên hệ</Label>
                  <Input 
                    value={editSupplierForm.contactPerson} 
                    onChange={(e) => setEditSupplierForm({...editSupplierForm, contactPerson: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Điện thoại</Label>
                  <Input 
                    value={editSupplierForm.phone} 
                    onChange={(e) => setEditSupplierForm({...editSupplierForm, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={editSupplierForm.email} 
                  onChange={(e) => setEditSupplierForm({...editSupplierForm, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ</Label>
                <Textarea 
                  value={editSupplierForm.address} 
                  onChange={(e) => setEditSupplierForm({...editSupplierForm, address: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditSupplierOpen(false)}>Hủy</Button>
              <Button onClick={handleUpdateSupplier} disabled={updateSupplierMutation.isPending}>
                {updateSupplierMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AlertDialog Delete Supplier */}
        <AlertDialog open={isDeleteSupplierOpen} onOpenChange={setIsDeleteSupplierOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa nhà cung cấp</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa nhà cung cấp <strong>{selectedSupplier?.name}</strong>? 
                Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSupplier} className="bg-destructive text-destructive-foreground">
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* QR Code Dialog */}
        <Dialog open={isQROpen} onOpenChange={setIsQROpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Mã QR Phụ tùng
              </DialogTitle>
              <DialogDescription>{qrPart?.name}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
              )}
              <div className="text-center space-y-1">
                <p className="font-mono text-lg font-bold">{qrPart?.partNumber}</p>
                <p className="text-sm text-muted-foreground">{qrPart?.category || "Không phân loại"}</p>
                <p className="text-sm">Tồn kho: <span className="font-medium">{qrPart?.currentStock || 0}</span></p>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `qr-${qrPart?.partNumber}.png`;
                  link.href = qrDataUrl;
                  link.click();
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Tải mã QR
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Scanner Dialog */}
        <QRScanner
          open={isQRScannerOpen}
          onOpenChange={(open) => {
            setIsQRScannerOpen(open);
            if (!open) setScannedPartInfo(null);
          }}
          onScanSuccess={handleQRScanSuccess}
          title="Quét mã QR Phụ tùng"
          description="Đưa mã QR vào vùng quét để tra cứu thông tin phụ tùng"
        />

        {/* Scanned Part Info Dialog */}
        {scannedPartInfo && (
          <Dialog open={!!scannedPartInfo} onOpenChange={() => setScannedPartInfo(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Thông tin Phụ tùng
                </DialogTitle>
                <DialogDescription>Kết quả tra cứu từ mã QR</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Mã PT</Label>
                    <p className="font-mono font-bold">{scannedPartInfo.partNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Danh mục</Label>
                    <p>{scannedPartInfo.category || "Không phân loại"}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tên phụ tùng</Label>
                  <p className="font-medium text-lg">{scannedPartInfo.name}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Tồn kho</Label>
                    <p className="text-2xl font-bold">{scannedPartInfo.currentStock || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tối thiểu</Label>
                    <p className="text-lg">{scannedPartInfo.minStock || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Đơn vị</Label>
                    <p>{scannedPartInfo.unit || "pcs"}</p>
                  </div>
                </div>
                {scannedPartInfo.unitPrice && (
                  <div>
                    <Label className="text-muted-foreground">Đơn giá</Label>
                    <p className="font-medium">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(scannedPartInfo.unitPrice))}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleQuickTransaction(scannedPartInfo.id, "in", 1)}
                  >
                    +1 Nhập
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleQuickTransaction(scannedPartInfo.id, "out", 1)}
                    disabled={(scannedPartInfo.currentStock || 0) <= 0}
                  >
                    -1 Xuất
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Bulk QR Print Dialog */}
        <Dialog open={isBulkQROpen} onOpenChange={setIsBulkQROpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                In nhãn QR hàng loạt
              </DialogTitle>
              <DialogDescription>
                Đã chọn {selectedPartsForQR.length} phụ tùng để in nhãn
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-4 gap-4 py-4">
              {parts?.filter(p => selectedPartsForQR.includes(p.id)).map(part => (
                <div key={part.id} className="border rounded-lg p-3 text-center">
                  {bulkQRDataUrls.get(part.id) && (
                    <img 
                      src={bulkQRDataUrls.get(part.id)} 
                      alt="QR" 
                      className="w-24 h-24 mx-auto"
                    />
                  )}
                  <p className="font-mono text-xs font-bold mt-2">{part.partNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">{part.name}</p>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkQROpen(false)}>Hủy</Button>
              <Button onClick={printBulkQRCodes}>
                <Printer className="w-4 h-4 mr-2" />
                In nhãn
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
