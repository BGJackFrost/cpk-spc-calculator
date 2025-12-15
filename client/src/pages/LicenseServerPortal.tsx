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
  FileKey,
  Copy,
  Eye,
  Users,
  Layers,
  TrendingUp,
  Calendar,
  Package,
  ArrowUpRight,
  BarChart3,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Send,
  FileText,
  Activity
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LicenseServerPortal() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Dialogs
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedLicenseKey, setSelectedLicenseKey] = useState("");
  
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
  
  // Queries
  const statisticsQuery = trpc.license.statistics.useQuery();
  const analyticsQuery = trpc.license.getUsageAnalytics.useQuery();
  const licensesQuery = trpc.license.list.useQuery();
  
  // Mutations
  const bulkCreateMutation = trpc.license.bulkCreate.useMutation();
  const extendMutation = trpc.license.extendExpiration.useMutation();
  const transferMutation = trpc.license.transferLicense.useMutation();
  const revokeMutation = trpc.license.revoke.useMutation();
  const exportCsvMutation = trpc.license.exportToCsv.useQuery(
    { status: statusFilter === "all" ? undefined : statusFilter as any },
    { enabled: false }
  );
  
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
      (statusFilter === "expired" && lic.expiresAt && new Date(lic.expiresAt) < new Date());
    
    const matchesType = typeFilter === "all" || lic.licenseType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });
  
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
  
  const handleExportCsv = async () => {
    const result = await exportCsvMutation.refetch();
    if (result.data) {
      const blob = new Blob([result.data.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `licenses_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Đã xuất ${result.data.count} license`);
    }
  };
  
  const getStatusBadge = (license: any) => {
    const status = license.licenseStatus;
    const isExpired = license.expiresAt && new Date(license.expiresAt) < new Date();
    
    if (status === 'revoked') return <Badge variant="destructive">Thu hồi</Badge>;
    if (isExpired) return <Badge variant="destructive">Hết hạn</Badge>;
    if (status === 'active') return <Badge className="bg-green-500">Hoạt động</Badge>;
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
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              License Server Portal
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
                <Button>
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
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="licenses">
              <Key className="h-4 w-4 mr-2" />
              Danh sách License
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Phân tích
            </TabsTrigger>
          </TabsList>
          
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Key className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tổng License</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
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
                        <p className="text-2xl font-bold">{stats.byStatus.active}</p>
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
                        <p className="text-2xl font-bold">{stats.byStatus.pending}</p>
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
                        <p className="text-2xl font-bold">{stats.expiringIn30Days}</p>
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
                        <p className="text-sm text-muted-foreground">Đã thu hồi</p>
                        <p className="text-2xl font-bold">{stats.byStatus.revoked}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* License Type Distribution */}
            {stats && (
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
                                {lic.activatedAt ? new Date(lic.activatedAt).toLocaleDateString('vi-VN') : "N/A"}
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
            )}
          </TabsContent>
          
          {/* Licenses Tab */}
          <TabsContent value="licenses" className="space-y-4">
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
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLicenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Không tìm thấy license nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLicenses.map((lic) => (
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
                              ? new Date(lic.expiresAt).toLocaleDateString('vi-VN')
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
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
                                  className="text-red-600"
                                  onClick={() => handleRevoke(lic.licenseKey || "")}
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Thu hồi
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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
