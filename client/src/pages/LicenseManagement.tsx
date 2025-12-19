import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Key, 
  Plus, 
  Download, 
  Ban, 
  RefreshCw,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Copy,
  Users,
  Layers,
  TrendingUp,
  Calendar,
  Package,
  ArrowUpRight,
  BarChart3,
  Search,
  MoreHorizontal,
  Power,
  PowerOff,
  Trash2,
  DollarSign
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function LicenseManagement() {
  const [activeTab, setActiveTab] = useState("licenses");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all"); // all, free, paid, high
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedLicenseKey, setSelectedLicenseKey] = useState("");
  
  // Create form
  const [newLicense, setNewLicense] = useState({
    licenseType: "standard" as "trial" | "standard" | "professional" | "enterprise",
    companyName: "",
    contactEmail: "",
    maxUsers: 10,
    maxProductionLines: 5,
    maxSpcPlans: 20,
    durationDays: 365,
    price: 0,
    currency: "VND"
  });
  
  // Bulk create form
  const [bulkForm, setBulkForm] = useState({
    count: 10,
    licenseType: "standard" as "trial" | "standard" | "professional" | "enterprise",
    durationDays: 365
  });
  
  // Extend form
  const [extendDays, setExtendDays] = useState(30);
  
  // Transfer form
  const [newFingerprint, setNewFingerprint] = useState("");
  const [transferReason, setTransferReason] = useState("");
  
  // Revenue filters
  const [revenuePeriod, setRevenuePeriod] = useState<"month" | "quarter" | "year">("month");
  const [revenueYear, setRevenueYear] = useState(new Date().getFullYear());
  const [revenueCurrency, setRevenueCurrency] = useState("all");
  
  // Queries
  const statisticsQuery = trpc.license.statistics.useQuery();
  const analyticsQuery = trpc.license.getUsageAnalytics.useQuery();
  const licensesQuery = trpc.license.list.useQuery();
  const generatedKeyQuery = trpc.license.generateKey.useQuery();
  const revenueQuery = trpc.license.getRevenue.useQuery();
  const revenueByPeriodQuery = trpc.license.getRevenueByPeriod.useQuery({
    period: revenuePeriod,
    year: revenueYear,
    currency: revenueCurrency === "all" ? undefined : revenueCurrency
  });
  
  // Mutations
  const createMutation = trpc.license.create.useMutation();
  const bulkCreateMutation = trpc.license.bulkCreate.useMutation();
  const extendMutation = trpc.license.extendExpiration.useMutation();
  const transferMutation = trpc.license.transferLicense.useMutation();
  const revokeMutation = trpc.license.revoke.useMutation();
  const activateMutation = trpc.license.activate.useMutation();
  const deactivateMutation = trpc.license.deactivate.useMutation();
  const deleteMutation = trpc.license.delete.useMutation();
  
  const stats = statisticsQuery.data;
  const analytics = analyticsQuery.data;
  const licenses = licensesQuery.data || [];
  
  // Filter licenses
  const filteredLicenses = licenses.filter(lic => {
    const matchesSearch = !searchQuery || 
      lic.licenseKey?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lic.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lic.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (lic.licenseStatus === statusFilter) ||
      (statusFilter === "active" && lic.isActive === 1) ||
      (statusFilter === "pending" && lic.isActive === 0 && lic.licenseStatus !== 'revoked') ||
      (statusFilter === "expired" && lic.expiresAt && new Date(lic.expiresAt) < new Date());
    
    const matchesType = typeFilter === "all" || lic.licenseType === typeFilter;
    
    const licPrice = Number((lic as any).price) || 0;
    const licCurrency = (lic as any).currency || "VND";
    
    const matchesCurrency = currencyFilter === "all" || licCurrency === currencyFilter;
    
    const matchesPrice = priceFilter === "all" ||
      (priceFilter === "free" && licPrice === 0) ||
      (priceFilter === "paid" && licPrice > 0) ||
      (priceFilter === "high" && licPrice >= 10000000); // >= 10M VND or equivalent
    
    return matchesSearch && matchesStatus && matchesType && matchesCurrency && matchesPrice;
  });
  
  const handleCreate = async () => {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + newLicense.durationDays);
      
      const result = await createMutation.mutateAsync({
        licenseKey: generatedKeyQuery.data?.licenseKey,
        licenseType: newLicense.licenseType,
        companyName: newLicense.companyName || undefined,
        contactEmail: newLicense.contactEmail || undefined,
        maxUsers: newLicense.maxUsers,
        maxProductionLines: newLicense.maxProductionLines,
        maxSpcPlans: newLicense.maxSpcPlans,
        expiresAt,
        // Note: price and currency are handled separately if needed
        // currency: newLicense.currency || "VND"
      });
      
      toast.success(`Đã tạo license: ${result.licenseKey}`);
      setCreateDialogOpen(false);
      setNewLicense({
        licenseType: "standard",
        companyName: "",
        contactEmail: "",
        maxUsers: 10,
        maxProductionLines: 5,
        maxSpcPlans: 20,
        durationDays: 365,
        price: 0,
        currency: "VND"
      });
      licensesQuery.refetch();
      statisticsQuery.refetch();
      generatedKeyQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Tạo license thất bại");
    }
  };
  
  const handleBulkCreate = async () => {
    try {
      const result = await bulkCreateMutation.mutateAsync(bulkForm);
      toast.success(`Đã tạo ${result.count} license thành công`);
      setBulkCreateOpen(false);
      licensesQuery.refetch();
      statisticsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Tạo license thất bại");
    }
  };
  
  const handleExtend = async () => {
    if (!selectedLicenseKey) return;
    try {
      const result = await extendMutation.mutateAsync({
        licenseKey: selectedLicenseKey,
        additionalDays: extendDays
      });
      toast.success(`Đã gia hạn đến ${new Date(result.newExpiresAt).toLocaleDateString('vi-VN')}`);
      setExtendDialogOpen(false);
      licensesQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Gia hạn thất bại");
    }
  };
  
  const handleTransfer = async () => {
    if (!selectedLicenseKey || !newFingerprint) return;
    try {
      await transferMutation.mutateAsync({
        licenseKey: selectedLicenseKey,
        newHardwareFingerprint: newFingerprint,
        reason: transferReason
      });
      toast.success("Đã chuyển license sang thiết bị mới");
      setTransferDialogOpen(false);
      setNewFingerprint("");
      setTransferReason("");
      licensesQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Chuyển license thất bại");
    }
  };
  
  const handleRevoke = async (licenseKey: string) => {
    if (!confirm("Bạn có chắc muốn thu hồi license này? Hành động này không thể hoàn tác.")) return;
    try {
      await revokeMutation.mutateAsync({ licenseKey });
      toast.success("Đã thu hồi license");
      licensesQuery.refetch();
      statisticsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Thu hồi thất bại");
    }
  };
  
  const handleActivate = async (licenseKey: string) => {
    try {
      await activateMutation.mutateAsync({ licenseKey });
      toast.success("Kích hoạt license thành công");
      licensesQuery.refetch();
      statisticsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Kích hoạt thất bại");
    }
  };
  
  const handleDeactivate = async (id: number) => {
    try {
      await deactivateMutation.mutateAsync({ id });
      toast.success("Hủy kích hoạt license thành công");
      licensesQuery.refetch();
      statisticsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Hủy kích hoạt thất bại");
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa license này?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Đã xóa license");
      licensesQuery.refetch();
      statisticsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Xóa thất bại");
    }
  };
  
  const handleExportCsv = async () => {
    const headers = ["License Key", "Type", "Status", "Company", "Email", "Max Users", "Max Lines", "Max Plans", "Issued At", "Expires At", "Activated At"];
    const rows = filteredLicenses.map(l => [
      l.licenseKey,
      l.licenseType,
      l.isActive === 1 ? "Active" : (l.licenseStatus === 'revoked' ? "Revoked" : "Pending"),
      l.companyName || "",
      l.contactEmail || "",
      l.maxUsers === -1 ? "Unlimited" : l.maxUsers,
      l.maxProductionLines === -1 ? "Unlimited" : l.maxProductionLines,
      l.maxSpcPlans === -1 ? "Unlimited" : l.maxSpcPlans,
      l.issuedAt ? format(new Date(l.issuedAt), "dd/MM/yyyy") : "",
      l.expiresAt ? format(new Date(l.expiresAt), "dd/MM/yyyy") : "Never",
      l.activatedAt ? format(new Date(l.activatedAt), "dd/MM/yyyy") : ""
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licenses_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${filteredLicenses.length} license`);
  };
  
  const getStatusBadge = (license: any) => {
    const isExpired = license.expiresAt && new Date(license.expiresAt) < new Date();
    if (license.licenseStatus === 'revoked') return <Badge variant="destructive">Thu hồi</Badge>;
    if (isExpired) return <Badge variant="destructive">Hết hạn</Badge>;
    if (license.isActive === 1) return <Badge className="bg-green-500">Hoạt động</Badge>;
    return <Badge variant="outline">Chờ kích hoạt</Badge>;
  };
  
  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      trial: "bg-gray-500",
      standard: "bg-blue-500",
      professional: "bg-purple-500",
      enterprise: "bg-amber-500"
    };
    return <Badge className={colors[type] || "bg-gray-500"}>{type}</Badge>;
  };
  
  const getLicenseTypeDefaults = (type: string) => {
    const defaults: Record<string, { maxUsers: number; maxProductionLines: number; maxSpcPlans: number; durationDays: number }> = {
      trial: { maxUsers: 5, maxProductionLines: 3, maxSpcPlans: 10, durationDays: 30 },
      standard: { maxUsers: 20, maxProductionLines: 10, maxSpcPlans: 50, durationDays: 365 },
      professional: { maxUsers: 50, maxProductionLines: 20, maxSpcPlans: 200, durationDays: 365 },
      enterprise: { maxUsers: 999, maxProductionLines: 100, maxSpcPlans: 999, durationDays: 730 },
    };
    return defaults[type] || defaults.standard;
  };
  
  const handleTypeChange = (type: "trial" | "standard" | "professional" | "enterprise") => {
    const defaults = getLicenseTypeDefaults(type);
    setNewLicense({
      ...newLicense,
      licenseType: type,
      ...defaults,
    });
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Quản lý License
            </h1>
            <p className="text-muted-foreground">Quản lý và phân phối license cho khách hàng</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="h-4 w-4 mr-2" />
              Xuất CSV
            </Button>
            <Dialog open={bulkCreateOpen} onOpenChange={setBulkCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Package className="h-4 w-4 mr-2" />
                  Tạo hàng loạt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tạo License hàng loạt</DialogTitle>
                  <DialogDescription>Tạo nhiều license cùng lúc để phân phối cho khách hàng</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Số lượng</Label>
                    <Input 
                      type="number" 
                      min={1} 
                      max={100}
                      value={bulkForm.count}
                      onChange={(e) => setBulkForm({...bulkForm, count: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại License</Label>
                    <Select 
                      value={bulkForm.licenseType}
                      onValueChange={(v: any) => setBulkForm({...bulkForm, licenseType: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Thời hạn (ngày)</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={bulkForm.durationDays}
                      onChange={(e) => setBulkForm({...bulkForm, durationDays: parseInt(e.target.value) || 365})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBulkCreateOpen(false)}>Hủy</Button>
                  <Button onClick={handleBulkCreate} disabled={bulkCreateMutation.isPending}>
                    {bulkCreateMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Tạo {bulkForm.count} License
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => generatedKeyQuery.refetch()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo License mới
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tạo License mới</DialogTitle>
                  <DialogDescription>Tạo license key mới cho khách hàng</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>License Key (tự động tạo)</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-sm">
                        {generatedKeyQuery.data?.licenseKey || "Đang tạo..."}
                      </code>
                      <Button variant="outline" size="icon" onClick={() => generatedKeyQuery.refetch()}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (generatedKeyQuery.data?.licenseKey) {
                            navigator.clipboard.writeText(generatedKeyQuery.data.licenseKey);
                            toast.success("Đã copy license key");
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Loại License</Label>
                    <Select 
                      value={newLicense.licenseType}
                      onValueChange={handleTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">Trial (30 ngày)</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tên công ty</Label>
                    <Input 
                      value={newLicense.companyName}
                      onChange={(e) => setNewLicense({...newLicense, companyName: e.target.value})}
                      placeholder="VD: Công ty ABC"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email liên hệ</Label>
                    <Input 
                      type="email"
                      value={newLicense.contactEmail}
                      onChange={(e) => setNewLicense({...newLicense, contactEmail: e.target.value})}
                      placeholder="contact@company.com"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label>Max Users</Label>
                      <Input 
                        type="number"
                        min={1}
                        value={newLicense.maxUsers}
                        onChange={(e) => setNewLicense({...newLicense, maxUsers: parseInt(e.target.value) || 1})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Lines</Label>
                      <Input 
                        type="number"
                        min={1}
                        value={newLicense.maxProductionLines}
                        onChange={(e) => setNewLicense({...newLicense, maxProductionLines: parseInt(e.target.value) || 1})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Plans</Label>
                      <Input 
                        type="number"
                        min={1}
                        value={newLicense.maxSpcPlans}
                        onChange={(e) => setNewLicense({...newLicense, maxSpcPlans: parseInt(e.target.value) || 1})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Thời hạn (ngày)</Label>
                    <Input 
                      type="number"
                      min={1}
                      value={newLicense.durationDays}
                      onChange={(e) => setNewLicense({...newLicense, durationDays: parseInt(e.target.value) || 365})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Giá tiền</Label>
                      <Input 
                        type="number"
                        min={0}
                        value={newLicense.price}
                        onChange={(e) => setNewLicense({...newLicense, price: parseFloat(e.target.value) || 0})}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Loại tiền</Label>
                      <Select 
                        value={newLicense.currency}
                        onValueChange={(v) => setNewLicense({...newLicense, currency: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VND">VND</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Hủy</Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Tạo License
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="licenses">
              <Key className="h-4 w-4 mr-2" />
              Danh sách License
            </TabsTrigger>
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Thống kê
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Phân tích
            </TabsTrigger>
            <TabsTrigger value="revenue">
              <DollarSign className="h-4 w-4 mr-2" />
              Doanh thu
            </TabsTrigger>
          </TabsList>
          
          {/* Licenses Tab */}
          <TabsContent value="licenses" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng License</p>
                      <p className="text-2xl font-bold">{licenses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                      <p className="text-2xl font-bold">{licenses.filter(l => l.isActive === 1).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Chờ kích hoạt</p>
                      <p className="text-2xl font-bold">{licenses.filter(l => l.isActive === 0 && l.licenseStatus !== 'revoked').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sắp hết hạn</p>
                      <p className="text-2xl font-bold">
                        {licenses.filter(l => {
                          if (!l.expiresAt) return false;
                          const days = Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                          return days > 0 && days <= 30;
                        }).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Đã hết hạn</p>
                      <p className="text-2xl font-bold">
                        {licenses.filter(l => l.expiresAt && new Date(l.expiresAt) < new Date()).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Tìm theo key, công ty, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="active">Hoạt động</SelectItem>
                      <SelectItem value="pending">Chờ kích hoạt</SelectItem>
                      <SelectItem value="expired">Hết hạn</SelectItem>
                      <SelectItem value="revoked">Thu hồi</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Tiền tệ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="VND">VND</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priceFilter} onValueChange={setPriceFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Giá" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="free">Miễn phí</SelectItem>
                      <SelectItem value="paid">Có giá</SelectItem>
                      <SelectItem value="high">Cao (≥10M)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            {/* License Table */}
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>License Key</TableHead>
                      <TableHead>Công ty</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Hết hạn</TableHead>
                      <TableHead>Giới hạn</TableHead>
                      <TableHead className="text-right">Giá tiền</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLicenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Không tìm thấy license nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLicenses.map((lic) => {
                        const isExpired = lic.expiresAt && new Date(lic.expiresAt) < new Date();
                        return (
                          <TableRow key={lic.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {lic.licenseKey?.substring(0, 20)}...
                                </code>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={() => {
                                    navigator.clipboard.writeText(lic.licenseKey || "");
                                    toast.success("Đã copy license key");
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{lic.companyName || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">{lic.contactEmail || ""}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getTypeBadge(lic.licenseType || "trial")}</TableCell>
                            <TableCell>{getStatusBadge(lic)}</TableCell>
                            <TableCell>
                              {lic.expiresAt 
                                ? format(new Date(lic.expiresAt), "dd/MM/yyyy", { locale: vi })
                                : "Vĩnh viễn"}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs space-y-1">
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {lic.maxUsers === -1 ? "∞" : lic.maxUsers}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Layers className="h-3 w-3" />
                                  {lic.maxProductionLines === -1 ? "∞" : lic.maxProductionLines}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {(lic as any).price ? (
                                <span className="font-medium">
                                  {Number((lic as any).price).toLocaleString("vi-VN")} {(lic as any).currency || "VND"}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {lic.isActive === 1 ? (
                                    <DropdownMenuItem onClick={() => handleDeactivate(lic.id)}>
                                      <PowerOff className="h-4 w-4 mr-2" />
                                      Hủy kích hoạt
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem 
                                      onClick={() => handleActivate(lic.licenseKey || "")}
                                      disabled={!!isExpired}
                                    >
                                      <Power className="h-4 w-4 mr-2" />
                                      Kích hoạt
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedLicenseKey(lic.licenseKey || "");
                                    setExtendDialogOpen(true);
                                  }}>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Gia hạn
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedLicenseKey(lic.licenseKey || "");
                                    setTransferDialogOpen(true);
                                  }}>
                                    <ArrowUpRight className="h-4 w-4 mr-2" />
                                    Chuyển thiết bị
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-orange-600"
                                    onClick={() => handleRevoke(lic.licenseKey || "")}
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Thu hồi
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => handleDelete(lic.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Xóa
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {stats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Phân bố theo loại License</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(stats.byType).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getTypeBadge(type)}
                              <span className="capitalize">{type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${(count / stats.total) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-8 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Kích hoạt gần đây</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics?.recentActivations && analytics.recentActivations.length > 0 ? (
                        <div className="space-y-3">
                          {analytics.recentActivations.slice(0, 5).map((lic, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                              <div>
                                <p className="font-medium text-sm">{lic.companyName || "N/A"}</p>
                                <p className="text-xs text-muted-foreground font-mono">{lic.licenseKey?.substring(0, 20)}...</p>
                              </div>
                              <div className="text-right">
                                {getTypeBadge(lic.licenseType || "trial")}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {lic.activatedAt ? format(new Date(lic.activatedAt), "dd/MM/yyyy", { locale: vi }) : "N/A"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">Chưa có kích hoạt nào</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
          
          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {analytics && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Kích hoạt theo tháng</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.monthlyActivations && analytics.monthlyActivations.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.monthlyActivations.map((item) => (
                          <div key={item.month} className="flex items-center gap-4">
                            <span className="w-20 text-sm text-muted-foreground">{item.month}</span>
                            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full flex items-center justify-end pr-2"
                                style={{ 
                                  width: `${Math.max(10, (item.count / Math.max(...analytics.monthlyActivations.map(m => m.count))) * 100)}%` 
                                }}
                              >
                                <span className="text-xs text-primary-foreground font-medium">{item.count}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
                    )}
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Thống kê theo loại</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(analytics.byType).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              {getTypeBadge(type)}
                            </div>
                            <span className="text-2xl font-bold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Thống kê theo trạng thái</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(analytics.byStatus).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="capitalize">{status}</span>
                            <span className="text-2xl font-bold">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
          
          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            {/* Revenue Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng VND</p>
                      <p className="text-2xl font-bold">{(revenueQuery.data?.totalVND || 0).toLocaleString("vi-VN")} ₫</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng USD</p>
                      <p className="text-2xl font-bold">${(revenueQuery.data?.totalUSD || 0).toLocaleString("en-US")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng EUR</p>
                      <p className="text-2xl font-bold">€{(revenueQuery.data?.totalEUR || 0).toLocaleString("de-DE")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">License có giá</p>
                      <p className="text-2xl font-bold">{revenueQuery.data?.paidLicenses || 0} / {revenueQuery.data?.totalLicenses || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Revenue by Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Doanh thu theo loại License</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {revenueQuery.data?.byType && Object.entries(revenueQuery.data.byType).map(([type, data]: [string, any]) => (
                      <div key={type} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getTypeBadge(type)}
                            <span className="text-sm text-muted-foreground">({data.count} licenses)</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">VND: </span>
                            <span className="font-medium">{(data.revenue?.VND || 0).toLocaleString("vi-VN")}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">USD: </span>
                            <span className="font-medium">${data.revenue?.USD || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">EUR: </span>
                            <span className="font-medium">€{data.revenue?.EUR || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Báo cáo theo thời gian</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-2">
                        <Label>Chu kỳ</Label>
                        <Select value={revenuePeriod} onValueChange={(v: any) => setRevenuePeriod(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="month">Theo tháng</SelectItem>
                            <SelectItem value="quarter">Theo quý</SelectItem>
                            <SelectItem value="year">Theo năm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Năm</Label>
                        <Select value={String(revenueYear)} onValueChange={(v) => setRevenueYear(Number(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2023, 2024, 2025, 2026].map(y => (
                              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Loại tiền</Label>
                        <Select value={revenueCurrency} onValueChange={setRevenueCurrency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="VND">VND</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Summary */}
                    {revenueByPeriodQuery.data?.summary && (
                      <div className="p-4 bg-primary/5 rounded-lg">
                        <h4 className="font-medium mb-2">Tổng kết {revenueByPeriodQuery.data.year}</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Số license: <span className="font-bold">{('totalCount' in revenueByPeriodQuery.data.summary) ? revenueByPeriodQuery.data.summary.totalCount : 0}</span></div>
                          <div>TB/kỳ: <span className="font-bold">{('avgPerPeriod' in revenueByPeriodQuery.data.summary) ? (revenueByPeriodQuery.data.summary.avgPerPeriod || 0).toFixed(1) : '0.0'}</span></div>
                          <div>VND: <span className="font-bold">{('totalVND' in revenueByPeriodQuery.data.summary) ? (revenueByPeriodQuery.data.summary.totalVND || 0).toLocaleString("vi-VN") : '0'}</span></div>
                          <div>USD: <span className="font-bold">${('totalUSD' in revenueByPeriodQuery.data.summary) ? revenueByPeriodQuery.data.summary.totalUSD || 0 : 0}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Biểu đồ doanh thu {revenuePeriod === "month" ? "theo tháng" : revenuePeriod === "quarter" ? "theo quý" : "theo năm"} - {revenueYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByPeriodQuery.data?.data && revenueByPeriodQuery.data.data.length > 0 ? (
                  <div className="space-y-2">
                    {revenueByPeriodQuery.data.data.map((item: any) => {
                      const maxRevenue = Math.max(
                        ...revenueByPeriodQuery.data!.data.map((d: any) => 
                          Math.max(d.totalVND / 1000000, d.totalUSD * 25, d.totalEUR * 27)
                        )
                      ) || 1;
                      const currentRevenue = Math.max(item.totalVND / 1000000, item.totalUSD * 25, item.totalEUR * 27);
                      const percentage = (currentRevenue / maxRevenue) * 100;
                      
                      return (
                        <div key={item.period} className="flex items-center gap-4">
                          <span className="w-24 text-sm text-muted-foreground">{item.period}</span>
                          <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-end pr-3"
                              style={{ width: `${Math.max(10, percentage)}%` }}
                            >
                              <span className="text-xs text-white font-medium">
                                {item.count} licenses
                              </span>
                            </div>
                          </div>
                          <div className="w-40 text-right text-sm">
                            {item.totalVND > 0 && <span className="text-green-600">{(item.totalVND / 1000000).toFixed(1)}M₫ </span>}
                            {item.totalUSD > 0 && <span className="text-blue-600">${item.totalUSD} </span>}
                            {item.totalEUR > 0 && <span className="text-purple-600">€{item.totalEUR}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Chưa có dữ liệu doanh thu trong kỳ này</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Extend Dialog */}
        <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gia hạn License</DialogTitle>
              <DialogDescription>
                License: {selectedLicenseKey.substring(0, 30)}...
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Số ngày gia hạn thêm</Label>
                <Input 
                  type="number" 
                  min={1}
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value) || 30)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleExtend} disabled={extendMutation.isPending}>
                {extendMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Gia hạn {extendDays} ngày
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Transfer Dialog */}
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Chuyển License sang thiết bị mới</DialogTitle>
              <DialogDescription>
                License: {selectedLicenseKey.substring(0, 30)}...
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Hardware Fingerprint mới</Label>
                <Input 
                  value={newFingerprint}
                  onChange={(e) => setNewFingerprint(e.target.value)}
                  placeholder="Nhập fingerprint của thiết bị mới"
                />
              </div>
              <div className="space-y-2">
                <Label>Lý do chuyển (tùy chọn)</Label>
                <Textarea 
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="VD: Khách hàng thay máy tính mới"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleTransfer} disabled={transferMutation.isPending || !newFingerprint}>
                {transferMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Chuyển License
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
