import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
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
  MoreHorizontal, Pencil, Trash2, QrCode, BarChart3, Camera, Printer, ScanLine, Mail, BookOpen, HelpCircle,
  ChevronDown, FileSpreadsheet, PackageCheck, Eye
} from "lucide-react";
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
    supplierId: "", description: "", emailAlertThreshold: 0
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
  
  // Reorder selection states
  const [selectedReorderItems, setSelectedReorderItems] = useState<Array<{id: number; qty: number}>>([]);
  
  // Stock status filter
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("all");
  
  // Xuất kho hàng loạt states
  const [isBulkExportOpen, setIsBulkExportOpen] = useState(false);
  const [selectedPartsForExport, setSelectedPartsForExport] = useState<Array<{id: number; name: string; quantity: number; maxQty: number}>>([]);
  const [exportPurpose, setExportPurpose] = useState<string>("normal");
  const [exportReason, setExportReason] = useState("");
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerDepartment, setBorrowerDepartment] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  
  // Nhập kho lại states
  const [isReturnStockOpen, setIsReturnStockOpen] = useState(false);
  const [selectedReturnTx, setSelectedReturnTx] = useState<any>(null);
  const [returnQuantity, setReturnQuantity] = useState(0);
  const [returnReason, setReturnReason] = useState("");
  
  // Từ chối đơn hàng states
  const [isRejectPOOpen, setIsRejectPOOpen] = useState(false);
  const [rejectPOId, setRejectPOId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  
  // Nhập kho từng phần states
  const [isReceivePOOpen, setIsReceivePOOpen] = useState(false);
  const [receivePOId, setReceivePOId] = useState<number | null>(null);
  const [receiveItems, setReceiveItems] = useState<Array<{
    itemId: number;
    sparePartName: string;
    orderedQty: number;
    receivedQty: number;
    remainingQty: number;
    receiveNow: number;
    notes: string;
    batchNumber: string;
    qualityStatus: "good" | "damaged" | "rejected";
  }>>([]);
  const [isReceiveHistoryOpen, setIsReceiveHistoryOpen] = useState(false);
  const [receiveHistoryPOId, setReceiveHistoryPOId] = useState<number | null>(null);
  
  // Xem chi tiết đơn hàng
  const [isViewPODetailOpen, setIsViewPODetailOpen] = useState(false);
  const [viewPODetailId, setViewPODetailId] = useState<number | null>(null);

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

  // Mutations cho quy trình đơn hàng
  const submitPOForApprovalMutation = trpc.spareParts.submitPurchaseOrderForApproval.useMutation({
    onSuccess: () => {
      toast.success("Đã gửi đơn chờ duyệt");
      refetchPurchaseOrders();
    },
    onError: (err) => toast.error(err.message),
  });

  const approvePOMutation = trpc.spareParts.approvePurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success("Đã duyệt đơn hàng");
      refetchPurchaseOrders();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectPOMutation = trpc.spareParts.rejectPurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success("Đã từ chối đơn hàng");
      refetchPurchaseOrders();
      setIsRejectPOOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const sendPOMutation = trpc.spareParts.sendPurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success("Đã gửi đơn đặt hàng");
      refetchPurchaseOrders();
    },
    onError: (err) => toast.error(err.message),
  });

  const receivePOMutation = trpc.spareParts.receivePurchaseOrder.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận nhận hàng");
      refetchPurchaseOrders();
      refetchParts();
    },
    onError: (err) => toast.error(err.message),
  });

  // Mutation nhập kho từng item
  const receivePOItemMutation = trpc.spareParts.receivePurchaseOrderItem.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã nhập kho thành công. Còn lại: ${data.remainingQty}`);
      refetchPurchaseOrders();
      refetchParts();
    },
    onError: (err) => toast.error(err.message),
  });

  // Query lịch sử nhập kho
  const { data: receivingHistory, refetch: refetchReceivingHistory } = trpc.spareParts.getReceivingHistory.useQuery(
    { purchaseOrderId: receiveHistoryPOId || 0 },
    { enabled: !!receiveHistoryPOId }
  );

  // Mutations cho xuất kho hàng loạt
  const bulkExportMutation = trpc.spareParts.bulkExportStock.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchParts();
      refetchTransactions();
      setIsBulkExportOpen(false);
      setSelectedPartsForExport([]);
    },
    onError: (err) => toast.error(err.message),
  });

  // Mutations cho nhập kho lại
  const returnStockMutation = trpc.spareParts.returnStock.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchParts();
      refetchTransactions();
      refetchPendingReturns();
      setIsReturnStockOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // Query cho danh sách cần trả
  const { data: pendingReturns, refetch: refetchPendingReturns } = trpc.spareParts.getPendingReturns.useQuery();

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

// Create order from reorder suggestions
  const createOrderFromSuggestions = () => {
    if (selectedReorderItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 phụ tùng");
      return;
    }
    
    // Group by supplier
    const itemsBySupplier = new Map<number, Array<{sparePartId: number; quantity: number; unitPrice: number}>>();
    
    selectedReorderItems.forEach(selected => {
      const suggestion = reorderSuggestions?.find(s => s.id === selected.id);
      if (suggestion) {
        const supplierId = suggestion.supplierId || 0;
        if (!itemsBySupplier.has(supplierId)) {
          itemsBySupplier.set(supplierId, []);
        }
        itemsBySupplier.get(supplierId)!.push({
          sparePartId: suggestion.id,
          quantity: Number(selected.qty),
          unitPrice: Number(suggestion.unitPrice) || 0,
        });
      }
    });
    
    // Create orders for each supplier
    let createdCount = 0;
    itemsBySupplier.forEach((items, supplierId) => {
      createPurchaseOrderMutation.mutate({
        supplierId: supplierId || 0,
        notes: `Tạo từ đề xuất đặt hàng - ${new Date().toLocaleDateString('vi-VN')}`,
        items,
      }, {
        onSuccess: () => {
          createdCount++;
          if (createdCount === itemsBySupplier.size) {
            toast.success(`Đã tạo ${createdCount} đơn hàng từ đề xuất`);
            setSelectedReorderItems([]);
          }
        }
      });
    });
  };

  const handleCreatePO = () => {
    if (!poSupplierId) {
      toast.error("Vui lòng chọn nhà cung cấp");
      return;
    }
    if (poItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 phụ tùng");
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
      description: part.description || "",
      emailAlertThreshold: part.emailAlertThreshold || 0
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

  // Filter parts by stock status
  const filteredParts = useMemo(() => {
    if (!parts) return [];
    if (stockStatusFilter === "all") return parts;
    return parts.filter(part => {
      const stock = Number(part.currentStock) || 0;
      const min = Number(part.minStock) || 0;
      const reorder = Number(part.reorderPoint) || min;
      if (stockStatusFilter === "out") return stock <= 0;
      if (stockStatusFilter === "low") return stock > 0 && stock <= reorder;
      if (stockStatusFilter === "ok") return stock > reorder;
      return true;
    });
  }, [parts, stockStatusFilter]);

  // Export selected parts to Excel
  const exportSelectedToExcel = () => {
    const selectedParts = parts?.filter(p => selectedPartsForQR.includes(p.id)) || [];
    if (selectedParts.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 phụ tùng");
      return;
    }

    const data = selectedParts.map(part => ({
      "Mã phụ tùng": part.partNumber,
      "Tên": part.name,
      "Danh mục": part.category || "",
      "Đơn vị": part.unit || "pcs",
      "Tồn kho": part.currentStock || 0,
      "Tồn tối thiểu": part.minStock || 0,
      "Điểm đặt hàng": part.reorderPoint || 0,
      "Đơn giá": part.unitPrice || 0,
      "Giá trị tồn": (Number(part.currentStock) || 0) * (Number(part.unitPrice) || 0),
      "Nhà cung cấp": part.supplierName || "",
      "Trạng thái": getStockStatus(part.currentStock, part.minStock, part.reorderPoint).label
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Phụ tùng");
    XLSX.writeFile(wb, `phu_tung_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`Đã xuất ${selectedParts.length} phụ tùng ra Excel`);
  };

  // Print thermal labels (58mm width format)
  const printThermalLabels = () => {
    const selectedParts = parts?.filter(p => selectedPartsForQR.includes(p.id)) || [];
    if (selectedParts.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 phụ tùng");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Không thể mở cửa sổ in. Vui lòng cho phép popup.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>In nhãn Thermal - Phụ tùng</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .label {
            width: 54mm;
            padding: 2mm;
            border-bottom: 1px dashed #000;
            page-break-after: always;
            text-align: center;
          }
          .label:last-child { border-bottom: none; }
          .label img { width: 35mm; height: 35mm; }
          .label .part-number { font-family: monospace; font-weight: bold; font-size: 14pt; margin-top: 2mm; }
          .label .part-name { font-size: 10pt; margin-top: 1mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .label .stock-info { font-size: 9pt; color: #333; margin-top: 1mm; }
          .label .barcode { font-family: 'Libre Barcode 39', monospace; font-size: 28pt; }
          .no-print { display: none; }
          @media screen {
            body { padding: 10px; background: #f0f0f0; }
            .label { background: white; margin: 10px auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .no-print { display: block; text-align: center; margin-bottom: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-right: 10px;">In nhãn Thermal</button>
          <span>Tổng: ${selectedParts.length} nhãn (58mm)</span>
        </div>
        ${selectedParts.map(part => `
          <div class="label">
            <img src="${bulkQRDataUrls.get(part.id) || ''}" alt="QR" />
            <div class="part-number">${part.partNumber}</div>
            <div class="part-name">${part.name}</div>
            <div class="stock-info">Tồn: ${part.currentStock || 0} ${part.unit || 'pcs'} | Min: ${part.minStock || 0}</div>
          </div>
        `).join('')}
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
            <Link href="/spare-parts-cost-report">
              <Button variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />Báo cáo chi phí
              </Button>
            </Link>
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
          <TabsList className="flex-wrap">
            <TabsTrigger value="dashboard"><BarChart3 className="w-4 h-4 mr-1" />Dashboard</TabsTrigger>
            <TabsTrigger value="inventory">Kho phụ tùng</TabsTrigger>
            <TabsTrigger value="reorder">Đề xuất đặt hàng</TabsTrigger>
            <TabsTrigger value="orders">Đơn đặt hàng</TabsTrigger>
            <TabsTrigger value="returns"><RefreshCw className="w-4 h-4 mr-1" />Nhập kho lại</TabsTrigger>
            <TabsTrigger value="transactions">Lịch sử giao dịch</TabsTrigger>
            <TabsTrigger value="suppliers">Nhà cung cấp</TabsTrigger>
            <TabsTrigger value="stockcheck"><ScanLine className="w-4 h-4 mr-1" />Kiểm kê</TabsTrigger>
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
                    <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="ok">Đủ hàng</SelectItem>
                        <SelectItem value="low">Cần đặt hàng</SelectItem>
                        <SelectItem value="out">Hết hàng</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedPartsForQR.length > 0 && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={generateBulkQRCodes}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          In {selectedPartsForQR.length} nhãn QR
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={printThermalLabels}
                          title="In nhãn cho máy in nhiệt 58mm"
                        >
                          <ScanLine className="h-4 w-4 mr-1" />
                          Thermal
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const selectedItems = parts?.filter(p => selectedPartsForQR.includes(p.id)).map(p => ({
                              id: p.id,
                              name: p.name,
                              quantity: 1,
                              maxQty: p.currentStock || 0
                            })) || [];
                            setSelectedPartsForExport(selectedItems);
                            setExportPurpose("normal");
                            setExportReason("");
                            setBorrowerName("");
                            setBorrowerDepartment("");
                            setExpectedReturnDate("");
                            setIsBulkExportOpen(true);
                          }}
                        >
                          <TrendingDown className="h-4 w-4 mr-1" />
                          Xuất kho
                        </Button>
                        </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Xuất Excel
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {selectedPartsForQR.length > 0 && (
                          <DropdownMenuItem onClick={exportSelectedToExcel}>
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Xuất {selectedPartsForQR.length} mục đã chọn
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => {
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
                        }}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Xuất toàn bộ ({parts?.length || 0} mục)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                    {filteredParts?.slice((partsPage - 1) * pageSize, partsPage * pageSize).map((part) => {
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
                    {(!filteredParts || filteredParts.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {stockStatusFilter !== "all" ? "Không có phụ tùng nào phù hợp bộ lọc" : "Chưa có phụ tùng nào"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {/* Pagination for Parts */}
                {filteredParts && filteredParts.length > pageSize && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <div className="text-sm text-muted-foreground">
                      Hiển thị {((partsPage - 1) * pageSize) + 1} - {Math.min(partsPage * pageSize, filteredParts.length)} / {filteredParts.length} phụ tùng
                      {stockStatusFilter !== "all" && ` (đang lọc)`}
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
                        Trang {partsPage} / {Math.ceil(filteredParts.length / pageSize)}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPartsPage(p => Math.min(Math.ceil(filteredParts.length / pageSize), p + 1))}
                        disabled={partsPage >= Math.ceil(filteredParts.length / pageSize)}
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Đề xuất đặt hàng</CardTitle>
                    <CardDescription>Phụ tùng cần bổ sung dựa trên mức tồn kho tối thiểu</CardDescription>
                  </div>
                  {selectedReorderItems.length > 0 && (
                    <Button onClick={createOrderFromSuggestions}>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Tạo đơn hàng ({selectedReorderItems.length})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedReorderItems.length === (reorderSuggestions?.length || 0) && (reorderSuggestions?.length || 0) > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReorderItems(reorderSuggestions?.map(s => ({ id: s.id, qty: s.suggestedQuantity })) || []);
                            } else {
                              setSelectedReorderItems([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>Mã PT</TableHead>
                      <TableHead>Tên phụ tùng</TableHead>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead className="text-center">Tồn hiện tại</TableHead>
                      <TableHead className="text-center">Điểm đặt hàng</TableHead>
                      <TableHead className="text-center w-28">SL đặt</TableHead>
                      <TableHead>Chi phí ước tính</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reorderSuggestions?.map((item) => {
                      const selectedItem = selectedReorderItems.find(s => s.id === item.id);
                      const qty = selectedItem?.qty || item.suggestedQuantity;
                      return (
                        <TableRow key={item.id} className={selectedItem ? "bg-blue-50 dark:bg-blue-950/20" : ""}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={!!selectedItem}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedReorderItems([...selectedReorderItems, { id: item.id, qty: item.suggestedQuantity }]);
                                } else {
                                  setSelectedReorderItems(selectedReorderItems.filter(s => s.id !== item.id));
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                          </TableCell>
                          <TableCell className="font-mono">{item.partNumber}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.supplierName || "-"}</TableCell>
                          <TableCell className="text-center text-red-500 font-bold">{item.currentStock || 0}</TableCell>
                          <TableCell className="text-center">{item.reorderPoint || item.minStock || 0}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={qty}
                              onChange={(e) => {
                                const newQty = Number(e.target.value) || 1;
                                if (selectedItem) {
                                  setSelectedReorderItems(selectedReorderItems.map(s => 
                                    s.id === item.id ? { ...s, qty: newQty } : s
                                  ));
                                } else {
                                  setSelectedReorderItems([...selectedReorderItems, { id: item.id, qty: newQty }]);
                                }
                              }}
                              className="w-20 h-8 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                              Number(selectedItem?.qty || item.suggestedQuantity) * Number(item.unitPrice || 0)
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!reorderSuggestions || reorderSuggestions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                          Tất cả phụ tùng đều đủ tồn kho
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {selectedReorderItems.length > 0 && (
                  <div className="mt-4 p-4 bg-muted rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-medium">Đã chọn {selectedReorderItems.length} phụ tùng</span>
                      <span className="text-muted-foreground ml-2">
                        Tổng: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                          selectedReorderItems.reduce((sum, s) => {
                            const item = reorderSuggestions?.find(r => r.id === s.id);
                            return sum + (Number(s.qty) * Number(item?.unitPrice || 0));
                          }, 0)
                        )}
                      </span>
                    </div>
                    <Button onClick={createOrderFromSuggestions}>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Tạo đơn đặt hàng
                    </Button>
                  </div>
                )}
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
                          <div className="flex gap-1 flex-wrap">
                            {/* Nhân viên: Gửi duyệt */}
                            {po.status === "draft" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => submitPOForApprovalMutation.mutate({ id: po.id })}
                              >
                                Gửi duyệt
                              </Button>
                            )}
                            {/* Quản lý: Duyệt/Từ chối */}
                            {po.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => approvePOMutation.mutate({ id: po.id })}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />Duyệt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setRejectPOId(po.id);
                                    setRejectReason("");
                                    setIsRejectPOOpen(true);
                                  }}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />Từ chối
                                </Button>
                              </>
                            )}
                            {/* Nhân viên: Gửi đơn đặt hàng */}
                            {po.status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendPOMutation.mutate({ id: po.id })}
                              >
                                <Truck className="w-3 h-3 mr-1" />Gửi đặt hàng
                              </Button>
                            )}
                            {/* Trạng thái đã đặt - chờ nhận hàng */}
                            {(po.status === "ordered" || po.status === "partial_received") && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => {
                                    setReceivePOId(po.id);
                                    setIsReceivePOOpen(true);
                                  }}
                                >
                                  <PackageCheck className="w-3 h-3 mr-1" />Nhập kho
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => receivePOMutation.mutate({ id: po.id })}
                                >
                                  Nhận tất cả
                                </Button>
                              </>
                            )}
                            {/* Xem lịch sử nhập kho */}
                            {(po.status === "partial_received" || po.status === "received") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setReceiveHistoryPOId(po.id);
                                  setIsReceiveHistoryOpen(true);
                                }}
                              >
                                <Clock className="w-3 h-3 mr-1" />Lịch sử
                              </Button>
                            )}
                            {/* Trạng thái đã nhận */}
                            {po.status === "received" && (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />Đã nhận đủ
                              </Badge>
                            )}
                            {po.status === "partial_received" && (
                              <Badge variant="outline" className="text-amber-600">
                                <Clock className="w-3 h-3 mr-1" />Nhận một phần
                              </Badge>
                            )}
                            {/* Nút xem chi tiết */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setViewPODetailId(po.id);
                                setIsViewPODetailOpen(true);
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" />Chi tiết
                            </Button>
                          </div>
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

          {/* Returns Tab - Nhập kho lại */}
          <TabsContent value="returns" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5" />
                      Nhập kho lại (Trả hàng)
                    </CardTitle>
                    <CardDescription>Quản lý các phụ tùng đã cho mượn hoặc xuất tạm thời cần trả lại</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(!pendingReturns || pendingReturns.length === 0) ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Không có phụ tùng nào cần trả lại</p>
                    <p className="text-sm mt-2">Các phụ tùng xuất kho với mục đích "Cho mượn" sẽ xuất hiện ở đây</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã PT</TableHead>
                        <TableHead>Tên phụ tùng</TableHead>
                        <TableHead>Người mượn</TableHead>
                        <TableHead>Phòng ban</TableHead>
                        <TableHead className="text-center">SL xuất</TableHead>
                        <TableHead className="text-center">SL đã trả</TableHead>
                        <TableHead>Ngày dự kiến trả</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingReturns.map((tx: any) => {
                        const remaining = tx.quantity - (tx.returnedQuantity || 0);
                        const isOverdue = tx.expectedReturnDate && new Date(tx.expectedReturnDate) < new Date();
                        return (
                          <TableRow key={tx.id} className={isOverdue ? "bg-red-50" : ""}>
                            <TableCell className="font-mono">{tx.partNumber}</TableCell>
                            <TableCell>{tx.partName}</TableCell>
                            <TableCell>{tx.borrowerName || "-"}</TableCell>
                            <TableCell>{tx.borrowerDepartment || "-"}</TableCell>
                            <TableCell className="text-center">{tx.quantity}</TableCell>
                            <TableCell className="text-center">
                              <span className="font-medium">{tx.returnedQuantity || 0}</span>
                              <span className="text-muted-foreground">/{tx.quantity}</span>
                            </TableCell>
                            <TableCell>
                              {tx.expectedReturnDate ? (
                                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                                  {new Date(tx.expectedReturnDate).toLocaleDateString('vi-VN')}
                                  {isOverdue && " (Quá hạn)"}
                                </span>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              {tx.returnStatus === "pending" && (
                                <Badge variant="outline" className="text-orange-600">Chưa trả</Badge>
                              )}
                              {tx.returnStatus === "partial" && (
                                <Badge variant="outline" className="text-blue-600">Trả một phần</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setSelectedReturnTx(tx);
                                  setReturnQuantity(remaining);
                                  setReturnReason("");
                                  setIsReturnStockOpen(true);
                                }}
                                disabled={remaining <= 0}
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Trả hàng
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
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

          {/* Stock Check Tab - Kiểm kê */}
          <TabsContent value="stockcheck" className="space-y-4">
            <StockCheckTab parts={parts || []} />
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Đơn giá</Label>
                  <Input 
                    type="number" 
                    value={editPartForm.unitPrice} 
                    onChange={(e) => setEditPartForm({...editPartForm, unitPrice: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ngưỡng cảnh báo Email</Label>
                  <Input 
                    type="number" 
                    value={editPartForm.emailAlertThreshold} 
                    onChange={(e) => setEditPartForm({...editPartForm, emailAlertThreshold: Number(e.target.value)})}
                    placeholder="0 = dùng mức tồn tối thiểu"
                  />
                  <p className="text-xs text-muted-foreground">0 = sử dụng mức tồn tối thiểu</p>
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

        {/* Từ chối đơn hàng Dialog */}
        <AlertDialog open={isRejectPOOpen} onOpenChange={setIsRejectPOOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Từ chối đơn hàng</AlertDialogTitle>
              <AlertDialogDescription>
                Vui lòng nhập lý do từ chối đơn hàng này.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (rejectPOId && rejectReason.trim()) {
                    rejectPOMutation.mutate({ id: rejectPOId, reason: rejectReason });
                  } else {
                    toast.error("Vui lòng nhập lý do từ chối");
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Xác nhận từ chối
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Xuất kho hàng loạt Dialog */}
        <Dialog open={isBulkExportOpen} onOpenChange={setIsBulkExportOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Xuất kho hàng loạt</DialogTitle>
              <DialogDescription>
                Xuất {selectedPartsForExport.length} phụ tùng cùng lúc
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Mục đích xuất kho *</Label>
                <Select value={exportPurpose} onValueChange={setExportPurpose}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mục đích" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Xuất kho bình thường</SelectItem>
                    <SelectItem value="repair">Sửa chữa</SelectItem>
                    <SelectItem value="borrow">Cho mượn tạm thời</SelectItem>
                    <SelectItem value="destroy">Tiêu hủy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {exportPurpose === "borrow" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Người mượn</Label>
                    <Input
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      placeholder="Tên người mượn"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phòng ban</Label>
                    <Input
                      value={borrowerDepartment}
                      onChange={(e) => setBorrowerDepartment(e.target.value)}
                      placeholder="Phòng ban"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Ngày dự kiến trả</Label>
                    <Input
                      type="date"
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Lý do xuất kho</Label>
                <Textarea
                  value={exportReason}
                  onChange={(e) => setExportReason(e.target.value)}
                  placeholder="Nhập lý do xuất kho..."
                  rows={2}
                />
              </div>
              
              <div className="border rounded-lg p-3">
                <Label className="mb-2 block">Danh sách phụ tùng xuất kho:</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedPartsForExport.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={item.maxQty}
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = Math.min(Number(e.target.value), item.maxQty);
                            setSelectedPartsForExport(prev => 
                              prev.map(p => p.id === item.id ? {...p, quantity: qty} : p)
                            );
                          }}
                          className="w-20 h-8"
                        />
                        <span className="text-muted-foreground">/ {item.maxQty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkExportOpen(false)}>Hủy</Button>
              <Button
                onClick={() => {
                  bulkExportMutation.mutate({
                    items: selectedPartsForExport.map(p => ({ sparePartId: p.id, quantity: p.quantity })),
                    exportPurpose: exportPurpose as any,
                    reason: exportReason,
                    borrowerName: borrowerName || undefined,
                    borrowerDepartment: borrowerDepartment || undefined,
                    expectedReturnDate: expectedReturnDate || undefined,
                  });
                }}
              >
                Xác nhận xuất kho
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Nhập kho lại Dialog */}
        <Dialog open={isReturnStockOpen} onOpenChange={setIsReturnStockOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nhập kho lại (Trả hàng)</DialogTitle>
              <DialogDescription>
                Trả lại phụ tùng đã mượn hoặc xuất tạm thời
              </DialogDescription>
            </DialogHeader>
            {selectedReturnTx && (
              <div className="space-y-4 py-4">
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <p><strong>Phụ tùng:</strong> {selectedReturnTx.partName}</p>
                  <p><strong>Người mượn:</strong> {selectedReturnTx.borrowerName || "-"}</p>
                  <p><strong>Số lượng đã xuất:</strong> {selectedReturnTx.quantity}</p>
                  <p><strong>Đã trả:</strong> {selectedReturnTx.returnedQuantity || 0}</p>
                  <p><strong>Còn lại:</strong> {selectedReturnTx.quantity - (selectedReturnTx.returnedQuantity || 0)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Số lượng trả</Label>
                  <Input
                    type="number"
                    min={1}
                    max={selectedReturnTx.quantity - (selectedReturnTx.returnedQuantity || 0)}
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ghi chú</Label>
                  <Textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Ghi chú khi trả hàng..."
                    rows={2}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReturnStockOpen(false)}>Hủy</Button>
              <Button
                onClick={() => {
                  if (selectedReturnTx && returnQuantity > 0) {
                    returnStockMutation.mutate({
                      originalTransactionId: selectedReturnTx.id,
                      quantity: returnQuantity,
                      reason: returnReason,
                    });
                  }
                }}
              >
                Xác nhận trả hàng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        {/* Dialog nhập kho từng phần */}
        <Dialog open={isReceivePOOpen} onOpenChange={setIsReceivePOOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nhập kho theo đơn đặt hàng</DialogTitle>
              <DialogDescription>
                Nhập số lượng thực tế nhận được cho từng mặt hàng. Có thể nhập nhiều lần cho mỗi đơn.
              </DialogDescription>
            </DialogHeader>
            <ReceivePOContent 
              poId={receivePOId}
              onClose={() => setIsReceivePOOpen(false)}
              onReceive={(itemId, qty, notes, batchNumber, qualityStatus) => {
                receivePOItemMutation.mutate({
                  itemId,
                  receivedQuantity: qty,
                  notes,
                  batchNumber,
                  qualityStatus,
                });
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog lịch sử nhập kho */}
        <Dialog open={isReceiveHistoryOpen} onOpenChange={setIsReceiveHistoryOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lịch sử nhập kho</DialogTitle>
              <DialogDescription>
                Danh sách các lần nhập kho cho đơn hàng này
              </DialogDescription>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phụ tùng</TableHead>
                  <TableHead>Số lượng</TableHead>
                  <TableHead>Số lô</TableHead>
                  <TableHead>Chất lượng</TableHead>
                  <TableHead>Ngày nhận</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivingHistory?.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{h.sparePartName}</span>
                        <span className="text-xs text-muted-foreground ml-2">({h.sparePartCode})</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{h.quantityReceived}</TableCell>
                    <TableCell>{h.batchNumber || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={h.qualityStatus === "good" ? "default" : h.qualityStatus === "damaged" ? "secondary" : "destructive"}>
                        {h.qualityStatus === "good" ? "Đạt" : h.qualityStatus === "damaged" ? "Hư hỏng" : "Từ chối"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(h.receivedAt).toLocaleString("vi-VN")}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{h.notes || "-"}</TableCell>
                  </TableRow>
                ))}
                {(!receivingHistory || receivingHistory.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Chưa có lịch sử nhập kho
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>

        {/* Dialog xem chi tiết đơn đặt hàng */}
        <Dialog open={isViewPODetailOpen} onOpenChange={setIsViewPODetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <PODetailView poId={viewPODetailId} />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Component xem chi tiết đơn đặt hàng
function PODetailView({ poId }: { poId: number | null }) {
  const { data: poDetails } = trpc.spareParts.getPurchaseOrder.useQuery(
    { id: poId || 0 },
    { enabled: !!poId }
  );

  if (!poDetails) return <div className="text-center py-8">Loading...</div>;

  const getPOStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="secondary">Nháp</Badge>;
      case "pending": return <Badge variant="outline">Chờ duyệt</Badge>;
      case "approved": return <Badge className="bg-blue-600">Đã duyệt</Badge>;
      case "rejected": return <Badge variant="destructive">Từ chối</Badge>;
      case "ordered": return <Badge className="bg-purple-600">Đã đặt hàng</Badge>;
      case "partial_received": return <Badge className="bg-amber-600">Nhận một phần</Badge>;
      case "received": return <Badge className="bg-green-600">Đã nhận đủ</Badge>;
      case "cancelled": return <Badge variant="destructive">Đã hủy</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Chi tiết Đơn đặt hàng {poDetails.poNumber}
        </DialogTitle>
        <DialogDescription>
          Thông tin chi tiết và danh sách phụ tùng trong đơn hàng
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Thông tin chung */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Trạng thái</Label>
            <div>{getPOStatusBadge(poDetails.status || "")}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Nhà cung cấp</Label>
            <div className="font-medium">{(poDetails as any).supplierName || "-"}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Ngày đặt</Label>
            <div>{poDetails.orderDate ? new Date(poDetails.orderDate).toLocaleDateString("vi-VN") : "-"}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Dự kiến nhận</Label>
            <div>{poDetails.expectedDeliveryDate ? new Date(poDetails.expectedDeliveryDate).toLocaleDateString("vi-VN") : "-"}</div>
          </div>
        </div>

        {/* Tổng tiền */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Tổng giá trị đơn hàng</span>
            <span className="text-2xl font-bold">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number((poDetails as any).totalAmount || poDetails.total) || 0)}
            </span>
          </div>
        </div>

        {/* Ghi chú */}
        {poDetails.notes && (
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Ghi chú</Label>
            <div className="text-sm bg-muted/30 p-3 rounded">{poDetails.notes}</div>
          </div>
        )}

        {/* Danh sách phụ tùng */}
        <div>
          <Label className="text-muted-foreground text-xs mb-2 block">Danh sách phụ tùng ({poDetails.items?.length || 0} mục)</Label>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã PT</TableHead>
                  <TableHead>Tên phụ tùng</TableHead>
                  <TableHead className="text-center">Số lượng đặt</TableHead>
                  <TableHead className="text-center">Đã nhận</TableHead>
                  <TableHead className="text-center">Còn lại</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poDetails.items?.map((item: any) => {
                  const remaining = item.quantity - (item.receivedQuantity || 0);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.partNumber}</TableCell>
                      <TableCell className="font-medium">{item.partName}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{item.receivedQuantity || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={remaining > 0 ? "destructive" : "default"}>{remaining}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('vi-VN').format(Number(item.unitPrice) || 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('vi-VN').format((Number(item.unitPrice) || 0) * item.quantity)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Thông tin phê duyệt */}
        {(poDetails.approvedBy || poDetails.rejectedBy) && (
          <div className="border-t pt-4">
            <Label className="text-muted-foreground text-xs mb-2 block">Thông tin phê duyệt</Label>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {poDetails.approvedBy && (
                <div>
                  <span className="text-muted-foreground">Người duyệt: </span>
                  <span className="font-medium">User #{poDetails.approvedBy}</span>
                  {poDetails.approvedAt && (
                    <span className="text-muted-foreground ml-2">({new Date(poDetails.approvedAt).toLocaleString("vi-VN")})</span>
                  )}
                </div>
              )}
              {poDetails.rejectedBy && (
                <div>
                  <span className="text-muted-foreground">Người từ chối: </span>
                  <span className="font-medium">User #{poDetails.rejectedBy}</span>
                  {poDetails.rejectionReason && (
                    <div className="text-destructive mt-1">Lý do: {poDetails.rejectionReason}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Component con cho nhập kho từng phần
function ReceivePOContent({ 
  poId, 
  onClose, 
  onReceive 
}: { 
  poId: number | null; 
  onClose: () => void;
  onReceive: (itemId: number, qty: number, notes: string, batchNumber: string, qualityStatus: "good" | "damaged" | "rejected") => void;
}) {
  const { data: poDetails } = trpc.spareParts.getPurchaseOrder.useQuery(
    { id: poId || 0 },
    { enabled: !!poId }
  );

  const [receiveData, setReceiveData] = useState<Map<number, {
    quantity: number;
    notes: string;
    batchNumber: string;
    qualityStatus: "good" | "damaged" | "rejected";
  }>>(new Map());

  const updateItem = (itemId: number, field: string, value: any) => {
    setReceiveData(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(itemId) || { quantity: 0, notes: "", batchNumber: "", qualityStatus: "good" as const };
      newMap.set(itemId, { ...existing, [field]: value });
      return newMap;
    });
  };

  if (!poDetails) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phụ tùng</TableHead>
              <TableHead className="text-center">Đặt</TableHead>
              <TableHead className="text-center">Đã nhận</TableHead>
              <TableHead className="text-center">Còn lại</TableHead>
              <TableHead className="text-center">Nhận lần này</TableHead>
              <TableHead>Số lô</TableHead>
              <TableHead>Chất lượng</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {poDetails.items?.map((item: any) => {
              const remaining = item.quantity - (item.receivedQuantity || 0);
              const data = receiveData.get(item.id) || { quantity: 0, notes: "", batchNumber: "", qualityStatus: "good" as const };
              
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{item.partName}</span>
                      <span className="text-xs text-muted-foreground block">{item.partNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">{item.quantity}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{item.receivedQuantity || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={remaining > 0 ? "destructive" : "default"}>{remaining}</Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={remaining}
                      value={data.quantity || ""}
                      onChange={(e) => updateItem(item.id, "quantity", Math.min(Number(e.target.value), remaining))}
                      className="w-20 text-center"
                      disabled={remaining <= 0}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={data.batchNumber}
                      onChange={(e) => updateItem(item.id, "batchNumber", e.target.value)}
                      placeholder="Số lô"
                      className="w-24"
                      disabled={remaining <= 0}
                    />
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={data.qualityStatus} 
                      onValueChange={(v) => updateItem(item.id, "qualityStatus", v)}
                      disabled={remaining <= 0}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Đạt</SelectItem>
                        <SelectItem value="damaged">Hư hỏng</SelectItem>
                        <SelectItem value="rejected">Từ chối</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={data.notes}
                      onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                      placeholder="Ghi chú"
                      className="w-32"
                      disabled={remaining <= 0}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      disabled={!data.quantity || data.quantity <= 0 || remaining <= 0}
                      onClick={() => {
                        onReceive(item.id, data.quantity, data.notes, data.batchNumber, data.qualityStatus);
                        setReceiveData(prev => {
                          const newMap = new Map(prev);
                          newMap.delete(item.id);
                          return newMap;
                        });
                      }}
                    >
                      Nhập
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Hoàn tất</Button>
      </DialogFooter>
    </div>
  );
}


// Component kiểm kê kho
function StockCheckTab({ parts }: { parts: any[] }) {
  const [isCreateCheckOpen, setIsCreateCheckOpen] = useState(false);
  const [checkType, setCheckType] = useState<"full" | "partial" | "cycle" | "spot">("full");
  const [checkCategory, setCheckCategory] = useState("");
  const [checkNotes, setCheckNotes] = useState("");
  const [selectedCheckId, setSelectedCheckId] = useState<number | null>(null);
  const [isCheckDetailOpen, setIsCheckDetailOpen] = useState(false);

  const { data: inventoryChecks, refetch: refetchChecks } = trpc.spareParts.listInventoryChecks.useQuery({ limit: 50 });
  const { data: checkDetail, refetch: refetchCheckDetail } = trpc.spareParts.getInventoryCheck.useQuery(
    { id: selectedCheckId || 0 },
    { enabled: !!selectedCheckId }
  );

  const createCheckMutation = trpc.spareParts.createInventoryCheck.useMutation({
    onSuccess: (data) => {
      toast.success(`Đã tạo phiếu kiểm kê ${data.checkNumber}`);
      refetchChecks();
      setIsCreateCheckOpen(false);
      setSelectedCheckId(data.id);
      setIsCheckDetailOpen(true);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateCheckItemMutation = trpc.spareParts.updateCheckItem.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật số lượng thực tế");
      refetchCheckDetail();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const completeCheckMutation = trpc.spareParts.completeInventoryCheck.useMutation({
    onSuccess: () => {
      toast.success("Đã hoàn thành kiểm kê và điều chỉnh tồn kho");
      refetchChecks();
      refetchCheckDetail();
      setIsCheckDetailOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="secondary">Nháp</Badge>;
      case "in_progress": return <Badge variant="default">Đang kiểm</Badge>;
      case "completed": return <Badge className="bg-green-600">Hoàn thành</Badge>;
      case "cancelled": return <Badge variant="destructive">Đã hủy</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getCheckTypeName = (type: string) => {
    switch (type) {
      case "full": return "Toàn bộ";
      case "partial": return "Một phần";
      case "cycle": return "Định kỳ";
      case "spot": return "Đột xuất";
      default: return type;
    }
  };

  // Get unique categories from parts
  const categories = Array.from(new Set(parts.map(p => p.category).filter(Boolean)));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="w-5 h-5" />
                Kiểm kê kho
              </CardTitle>
              <CardDescription>Quản lý và thực hiện kiểm kê tồn kho phụ tùng</CardDescription>
            </div>
            <Button onClick={() => setIsCreateCheckOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Tạo phiếu kiểm kê
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số phiếu</TableHead>
                <TableHead>Loại kiểm kê</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày kiểm</TableHead>
                <TableHead>Số mặt hàng</TableHead>
                <TableHead>Chênh lệch</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryChecks?.map((check) => (
                <TableRow key={check.id}>
                  <TableCell className="font-mono font-medium">{check.checkNumber}</TableCell>
                  <TableCell>{getCheckTypeName(check.checkType)}</TableCell>
                  <TableCell>{getStatusBadge(check.status || "")}</TableCell>
                  <TableCell>{new Date(check.checkDate).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell className="text-center">{check.totalItems || 0}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCheckId(check.id);
                        setIsCheckDetailOpen(true);
                      }}
                    >
                      {check.status === "draft" || check.status === "in_progress" ? "Tiếp tục" : "Xem"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!inventoryChecks || inventoryChecks.length === 0) && (
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

      {/* Dialog tạo phiếu kiểm kê */}
      <Dialog open={isCreateCheckOpen} onOpenChange={setIsCreateCheckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo phiếu kiểm kê mới</DialogTitle>
            <DialogDescription>Chọn loại kiểm kê và phạm vi áp dụng</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Loại kiểm kê</Label>
              <Select value={checkType} onValueChange={(v: any) => setCheckType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Toàn bộ kho</SelectItem>
                  <SelectItem value="partial">Một phần (theo danh mục)</SelectItem>
                  <SelectItem value="cycle">Kiểm kê định kỳ</SelectItem>
                  <SelectItem value="spot">Kiểm kê đột xuất</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {checkType === "partial" && (
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Select value={checkCategory} onValueChange={setCheckCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea
                value={checkNotes}
                onChange={(e) => setCheckNotes(e.target.value)}
                placeholder="Ghi chú cho phiếu kiểm kê..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateCheckOpen(false)}>Hủy</Button>
            <Button onClick={() => createCheckMutation.mutate({
              checkType,
              category: checkType === "partial" ? checkCategory : undefined,
              notes: checkNotes || undefined,
            })}>
              Tạo phiếu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog chi tiết kiểm kê */}
      <Dialog open={isCheckDetailOpen} onOpenChange={setIsCheckDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Phiếu kiểm kê {checkDetail?.checkNumber}
              <span className="ml-2">{getStatusBadge(checkDetail?.status || "")}</span>
            </DialogTitle>
            <DialogDescription>
              {getCheckTypeName(checkDetail?.checkType || "")} - {checkDetail?.checkDate ? new Date(checkDetail.checkDate).toLocaleDateString("vi-VN") : ""}
              {checkDetail?.notes && <span className="ml-2">- {checkDetail.notes}</span>}
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã PT</TableHead>
                  <TableHead>Tên phụ tùng</TableHead>
                  <TableHead className="text-center">Tồn hệ thống</TableHead>
                  <TableHead className="text-center">Tồn thực tế</TableHead>
                  <TableHead className="text-center">Chênh lệch</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  {(checkDetail?.status === "draft" || checkDetail?.status === "in_progress") && (
                    <TableHead></TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkDetail?.items?.map((item: any) => {
                  const discrepancy = (item.actualQuantity || 0) - item.systemQuantity;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.partNumber}</TableCell>
                      <TableCell>{item.partName}</TableCell>
                      <TableCell className="text-center font-medium">{item.systemQuantity}</TableCell>
                      <TableCell className="text-center">
                        {(checkDetail?.status === "draft" || checkDetail?.status === "in_progress") ? (
                          <Input
                            type="number"
                            min={0}
                            value={item.actualQuantity ?? ""}
                            onChange={(e) => {
                              const newVal = Number(e.target.value);
                              updateCheckItemMutation.mutate({
                                itemId: item.id,
                                actualQuantity: newVal,
                              });
                            }}
                            className="w-20 text-center"
                          />
                        ) : (
                          <span className="font-medium">{item.actualQuantity ?? "-"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.actualQuantity !== null && (
                          <Badge variant={discrepancy === 0 ? "secondary" : discrepancy > 0 ? "default" : "destructive"}>
                            {discrepancy > 0 ? "+" : ""}{discrepancy}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-muted-foreground">
                        {item.notes || "-"}
                      </TableCell>
                      {(checkDetail?.status === "draft" || checkDetail?.status === "in_progress") && (
                        <TableCell>
                          <Input
                            placeholder="Ghi chú"
                            className="w-32"
                            defaultValue={item.notes || ""}
                            onBlur={(e) => {
                              if (e.target.value !== item.notes) {
                                updateCheckItemMutation.mutate({
                                  itemId: item.id,
                                  actualQuantity: item.actualQuantity ?? item.systemQuantity,
                                  notes: e.target.value,
                                });
                              }
                            }}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCheckDetailOpen(false)}>Đóng</Button>
            {(checkDetail?.status === "draft" || checkDetail?.status === "in_progress") && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => completeCheckMutation.mutate({
                    checkId: checkDetail.id,
                    adjustInventory: false,
                  })}
                >
                  Hoàn thành (không điều chỉnh)
                </Button>
                <Button
                  onClick={() => completeCheckMutation.mutate({
                    checkId: checkDetail.id,
                    adjustInventory: true,
                  })}
                >
                  Hoàn thành & Điều chỉnh tồn kho
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
