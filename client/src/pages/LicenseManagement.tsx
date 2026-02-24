import { useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import LicenseCreateDialog from "@/components/license/LicenseCreateDialog";
import LicenseActivationFlow from "@/components/license/LicenseActivationFlow";
import LicenseAnalyticsDashboard from "@/components/license/LicenseAnalyticsDashboard";
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
import { useCursorPagination } from "@/hooks/useCursorPagination";
import LoadMoreButton from "@/components/LoadMoreButton";
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

// License type definition
type License = {
  id: number;
  licenseKey: string;
  licenseType: string;
  companyName: string | null;
  contactEmail: string | null;
  isActive: number;
  licenseStatus: string;
  expiresAt: Date | null;
  activatedAt: Date | null;
  maxUsers: number;
  maxProductionLines: number;
  maxSpcPlans: number;
  price: number | null;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function LicenseManagement() {
  const [activeTab, setActiveTab] = useState("licenses");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [activationDialogOpen, setActivationDialogOpen] = useState(false);
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
  
  // Use cursor pagination for licenses
  const {
    items: licenses,
    hasMore,
    isLoading,
    isLoadingMore,
    totalCount,
    loadMore,
    refresh: refreshLicenses,
  } = useCursorPagination<License, { items: License[]; nextCursor: string | null; prevCursor: string | null; hasMore: boolean; totalCount?: number }>(
    (params) => {
      const query = trpc.license.listWithCursor.useQuery({
        cursor: params.cursor,
        limit: params.limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
        licenseType: typeFilter !== 'all' ? typeFilter : undefined,
        currency: currencyFilter !== 'all' ? currencyFilter : undefined,
        priceFilter: priceFilter !== 'all' ? priceFilter as any : undefined,
      });
      return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error as Error | null,
        refetch: query.refetch,
      };
    },
    { pageSize: 50 }
  );
  
  // Queries
  const statisticsQuery = trpc.license.statistics.useQuery();
  const analyticsQuery = trpc.license.getUsageAnalytics.useQuery();
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
      refreshLicenses();
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
      refreshLicenses();
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
      refreshLicenses();
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
      refreshLicenses();
    } catch (error: any) {
      toast.error(error.message || "Chuyển license thất bại");
    }
  };
  
  const handleRevoke = async (licenseKey: string) => {
    if (!confirm("Bạn có chắc muốn thu hồi license này? Hành động này không thể hoàn tác.")) return;
    try {
      await revokeMutation.mutateAsync({ licenseKey });
      toast.success("Đã thu hồi license");
      refreshLicenses();
      statisticsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Thu hồi thất bại");
    }
  };
  
  const handleActivate = async (licenseKey: string) => {
    try {
      await activateMutation.mutateAsync({ licenseKey });
      toast.success("Kích hoạt license thành công");
      refreshLicenses();
      statisticsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Kích hoạt thất bại");
    }
  };
  
  const handleDeactivate = async (id: number) => {
    try {
      await deactivateMutation.mutateAsync({ id });
      toast.success("Hủy kích hoạt license thành công");
      refreshLicenses();
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
      refreshLicenses();
      statisticsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Xóa thất bại");
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã copy vào clipboard");
  };
  
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "trial":
        return <Badge variant="outline">Trial</Badge>;
      case "standard":
        return <Badge className="bg-blue-500">Standard</Badge>;
      case "professional":
        return <Badge className="bg-purple-500">Professional</Badge>;
      case "enterprise":
        return <Badge className="bg-amber-500">Enterprise</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  const getStatusBadge = (lic: any) => {
    if (lic.licenseStatus === 'revoked') {
      return <Badge variant="destructive">Thu hồi</Badge>;
    }
    if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) {
      return <Badge variant="destructive">Hết hạn</Badge>;
    }
    if (lic.isActive === 1) {
      return <Badge className="bg-green-500">Hoạt động</Badge>;
    }
    return <Badge variant="secondary">Chờ kích hoạt</Badge>;
  };
  
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setCurrencyFilter("all");
    setPriceFilter("all");
    refreshLicenses();
  }, [refreshLicenses]);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý License</h1>
            <p className="text-muted-foreground">Quản lý license và theo dõi doanh thu</p>
          </div>
          <div className="flex gap-2">
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
                  <DialogDescription>Tạo nhiều license cùng lúc</DialogDescription>
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
                      onValueChange={(v) => setBulkForm({...bulkForm, licenseType: v as any})}
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
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo License
            </Button>
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
          
          {/* Analytics Tab with Dashboard */}
          <TabsContent value="analytics">
            <LicenseAnalyticsDashboard />
          </TabsContent>
          
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
                      <p className="text-2xl font-bold">{totalCount || licenses.length}</p>
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
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Xóa bộ lọc
                  </Button>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  Hiển thị {licenses.length} {totalCount ? `/ ${totalCount}` : ''} license
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
                    {licenses.length === 0 && !isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Không tìm thấy license nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      licenses.map((lic) => {
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
                                  onClick={() => copyToClipboard(lic.licenseKey || "")}
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
                
                {/* Load More Button */}
                <LoadMoreButton
                  hasMore={hasMore}
                  isLoading={isLoading || isLoadingMore}
                  onLoadMore={loadMore}
                  onRefresh={refreshLicenses}
                  totalCount={totalCount}
                  loadedCount={licenses.length}
                  showRefresh={false}
                />
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
                            </div>
                            <span className="font-medium">{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Phân bố theo trạng thái</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-green-500">Hoạt động</Badge>
                          <span className="font-medium">{stats.byStatus.active}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">Chờ kích hoạt</Badge>
                          <span className="font-medium">{stats.byStatus.pending}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="destructive">Hết hạn</Badge>
                          <span className="font-medium">{stats.byStatus.expired}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Thu hồi</Badge>
                          <span className="font-medium">{stats.byStatus.revoked}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
          
          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            {revenueQuery.data && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tổng doanh thu (VND)</p>
                        <p className="text-2xl font-bold">
                          {revenueQuery.data.totalVND.toLocaleString('vi-VN')} ₫
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tổng doanh thu (USD)</p>
                        <p className="text-2xl font-bold">
                          ${revenueQuery.data.totalUSD.toLocaleString('en-US')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Key className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">License có giá</p>
                        <p className="text-2xl font-bold">{revenueQuery.data.paidCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Extend Dialog */}
        <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gia hạn License</DialogTitle>
              <DialogDescription>Thêm thời gian sử dụng cho license</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>License Key</Label>
                <code className="block p-2 bg-muted rounded text-sm">{selectedLicenseKey}</code>
              </div>
              <div className="space-y-2">
                <Label>Số ngày gia hạn</Label>
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
                Gia hạn
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Transfer Dialog */}
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Chuyển License</DialogTitle>
              <DialogDescription>Chuyển license sang thiết bị mới</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>License Key</Label>
                <code className="block p-2 bg-muted rounded text-sm">{selectedLicenseKey}</code>
              </div>
              <div className="space-y-2">
                <Label>Hardware Fingerprint mới</Label>
                <Input 
                  value={newFingerprint}
                  onChange={(e) => setNewFingerprint(e.target.value)}
                  placeholder="Nhập fingerprint thiết bị mới"
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
        
        {/* New License Create Dialog with Systems/Features */}
        <LicenseCreateDialog 
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => {
            refreshLicenses();
            statisticsQuery.refetch();
          }}
        />
        
        {/* License Activation Flow Dialog */}
        <LicenseActivationFlow
          open={activationDialogOpen}
          onOpenChange={setActivationDialogOpen}
          licenseKey={selectedLicenseKey}
          onSuccess={() => {
            refreshLicenses();
            statisticsQuery.refetch();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
