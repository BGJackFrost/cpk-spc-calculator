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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Building2, 
  Plus, 
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Key,
  RefreshCw,
  MoreHorizontal,
  Users,
  Factory,
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface Customer {
  id: number;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  industry: string | null;
  notes: string | null;
  isActive: number;
  createdAt: Date;
}

export default function LicenseCustomers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Form
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    industry: "",
    notes: ""
  });
  
  // Queries
  const customersQuery = trpc.licenseCustomer.list.useQuery();
  const licensesQuery = trpc.license.list.useQuery();
  
  // Mutations
  const createMutation = trpc.licenseCustomer.create.useMutation();
  const updateMutation = trpc.licenseCustomer.update.useMutation();
  const deleteMutation = trpc.licenseCustomer.delete.useMutation();
  
  const customers = customersQuery.data || [];
  const licenses = licensesQuery.data || [];
  
  // Get license count per customer
  const getLicenseCount = (companyName: string) => {
    return licenses.filter(l => l.companyName === companyName).length;
  };
  
  const getActiveLicenseCount = (companyName: string) => {
    return licenses.filter(l => l.companyName === companyName && l.isActive === 1).length;
  };
  
  // Industries for filter
  const industries = Array.from(new Set(customers.map((c: Customer) => c.industry).filter(Boolean)));
  
  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !searchQuery || 
      c.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesIndustry = industryFilter === "all" || c.industry === industryFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && c.isActive === 1) ||
      (statusFilter === "inactive" && c.isActive === 0);
    
    return matchesSearch && matchesIndustry && matchesStatus;
  });
  
  const resetForm = () => {
    setFormData({
      companyName: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      industry: "",
      notes: ""
    });
  };
  
  const handleCreate = async () => {
    if (!formData.companyName.trim()) {
      toast.error("Vui lòng nhập tên công ty");
      return;
    }
    
    try {
      await createMutation.mutateAsync({
        companyName: formData.companyName,
        contactName: formData.contactName || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        address: formData.address || undefined,
        industry: formData.industry || undefined,
        notes: formData.notes || undefined
      });
      toast.success("Đã tạo khách hàng mới");
      setCreateDialogOpen(false);
      resetForm();
      customersQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Tạo khách hàng thất bại");
    }
  };
  
  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      companyName: customer.companyName,
      contactName: customer.contactName || "",
      contactEmail: customer.contactEmail || "",
      contactPhone: customer.contactPhone || "",
      address: customer.address || "",
      industry: customer.industry || "",
      notes: customer.notes || ""
    });
    setEditDialogOpen(true);
  };
  
  const handleUpdate = async () => {
    if (!selectedCustomer || !formData.companyName.trim()) return;
    
    try {
      await updateMutation.mutateAsync({
        id: selectedCustomer.id,
        companyName: formData.companyName,
        contactName: formData.contactName || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        address: formData.address || undefined,
        industry: formData.industry || undefined,
        notes: formData.notes || undefined
      });
      toast.success("Đã cập nhật khách hàng");
      setEditDialogOpen(false);
      setSelectedCustomer(null);
      resetForm();
      customersQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Cập nhật thất bại");
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa khách hàng này?")) return;
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Đã xóa khách hàng");
      customersQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Xóa thất bại");
    }
  };
  
  const handleToggleStatus = async (customer: Customer) => {
    try {
      await updateMutation.mutateAsync({
        id: customer.id,
        isActive: customer.isActive === 1 ? 0 : 1
      });
      toast.success(customer.isActive === 1 ? "Đã vô hiệu hóa" : "Đã kích hoạt");
      customersQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Cập nhật thất bại");
    }
  };
  
  // Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.isActive === 1).length;
  const totalLicenses = licenses.length;
  const activeLicenses = licenses.filter(l => l.isActive === 1).length;
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Quản lý Khách hàng
            </h1>
            <p className="text-muted-foreground">Quản lý thông tin khách hàng và license liên kết</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm Khách hàng
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Thêm Khách hàng mới</DialogTitle>
                <DialogDescription>Nhập thông tin khách hàng để quản lý license</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tên công ty *</Label>
                  <Input 
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    placeholder="VD: Công ty ABC"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Người liên hệ</Label>
                    <Input 
                      value={formData.contactName}
                      onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ngành nghề</Label>
                    <Input 
                      value={formData.industry}
                      onChange={(e) => setFormData({...formData, industry: e.target.value})}
                      placeholder="Sản xuất điện tử"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                      placeholder="contact@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Số điện thoại</Label>
                    <Input 
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                      placeholder="0901234567"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Địa chỉ</Label>
                  <Textarea 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ghi chú</Label>
                  <Textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Ghi chú thêm về khách hàng..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Tạo Khách hàng
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng Khách hàng</p>
                  <p className="text-2xl font-bold">{totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                  <p className="text-2xl font-bold">{activeCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Key className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng License</p>
                  <p className="text-2xl font-bold">{totalLicenses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Factory className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">License Active</p>
                  <p className="text-2xl font-bold">{activeLicenses}</p>
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
                    placeholder="Tìm theo tên công ty, người liên hệ, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ngành nghề" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ngành</SelectItem>
                  {industries.map(ind => (
                    <SelectItem key={ind} value={ind!}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="inactive">Vô hiệu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Customer Table */}
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Công ty</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead>Ngành nghề</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Không tìm thấy khách hàng nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">{customer.companyName}</div>
                        {customer.address && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {customer.address.substring(0, 40)}...
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          {customer.contactName && (
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="h-3 w-3" />
                              {customer.contactName}
                            </div>
                          )}
                          {customer.contactEmail && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {customer.contactEmail}
                            </div>
                          )}
                          {customer.contactPhone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {customer.contactPhone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.industry ? (
                          <Badge variant="outline">{customer.industry}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {getLicenseCount(customer.companyName)} license
                          </Badge>
                          {getActiveLicenseCount(customer.companyName) > 0 && (
                            <Badge className="bg-green-500">
                              {getActiveLicenseCount(customer.companyName)} active
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.isActive === 1 ? (
                          <Badge className="bg-green-500">Hoạt động</Badge>
                        ) : (
                          <Badge variant="destructive">Vô hiệu</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(customer.createdAt), "dd/MM/yyyy", { locale: vi })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(customer)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(customer)}>
                              {customer.isActive === 1 ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Vô hiệu hóa
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Kích hoạt
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDelete(customer.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xóa
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
        
        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa Khách hàng</DialogTitle>
              <DialogDescription>Cập nhật thông tin khách hàng</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tên công ty *</Label>
                <Input 
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Người liên hệ</Label>
                  <Input 
                    value={formData.contactName}
                    onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ngành nghề</Label>
                  <Input 
                    value={formData.industry}
                    onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input 
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ</Label>
                <Textarea 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Cập nhật
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
