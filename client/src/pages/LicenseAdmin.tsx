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
  Eye
} from "lucide-react";

export default function LicenseAdmin() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [offlineDialogOpen, setOfflineDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<any>(null);
  const [hardwareFingerprint, setHardwareFingerprint] = useState("");
  const [offlineFileContent, setOfflineFileContent] = useState("");
  
  // Form state for creating license
  const [newLicense, setNewLicense] = useState({
    licenseType: "trial" as "trial" | "standard" | "professional" | "enterprise",
    companyName: "",
    contactEmail: "",
    maxUsers: 5,
    maxProductionLines: 3,
    maxSpcPlans: 10,
    expiresAt: ""
  });
  
  const licensesQuery = trpc.license.list.useQuery();
  const statisticsQuery = trpc.license.statistics.useQuery();
  const createMutation = trpc.license.create.useMutation();
  const revokeMutation = trpc.license.revoke.useMutation();
  const generateOfflineMutation = trpc.license.generateOfflineFile.useMutation();
  
  const handleCreateLicense = async () => {
    try {
      const result = await createMutation.mutateAsync({
        ...newLicense,
        expiresAt: newLicense.expiresAt ? new Date(newLicense.expiresAt) : undefined
      });
      toast.success(`License đã được tạo: ${result.licenseKey}`);
      setCreateDialogOpen(false);
      licensesQuery.refetch();
      statisticsQuery.refetch();
      setNewLicense({
        licenseType: "trial",
        companyName: "",
        contactEmail: "",
        maxUsers: 5,
        maxProductionLines: 3,
        maxSpcPlans: 10,
        expiresAt: ""
      });
    } catch (error: any) {
      toast.error(error.message || "Tạo license thất bại");
    }
  };
  
  const handleRevokeLicense = async (licenseKey: string) => {
    if (!confirm("Bạn có chắc muốn thu hồi license này?")) return;
    
    try {
      await revokeMutation.mutateAsync({ licenseKey });
      toast.success("License đã được thu hồi");
      licensesQuery.refetch();
      statisticsQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Thu hồi license thất bại");
    }
  };
  
  const handleGenerateOfflineFile = async () => {
    if (!selectedLicense || !hardwareFingerprint) {
      toast.error("Vui lòng nhập Hardware Fingerprint");
      return;
    }
    
    try {
      const result = await generateOfflineMutation.mutateAsync({
        licenseKey: selectedLicense.licenseKey,
        hardwareFingerprint
      });
      setOfflineFileContent(result.fileContent || "");
      toast.success("File license offline đã được tạo");
    } catch (error: any) {
      toast.error(error.message || "Tạo file offline thất bại");
    }
  };
  
  const downloadOfflineFile = () => {
    if (!offlineFileContent || !selectedLicense) return;
    
    const blob = new Blob([offlineFileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLicense.licenseKey}.lic`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("File đã được tải xuống");
  };
  
  const getStatusBadge = (license: any) => {
    const status = license.licenseStatus || (license.isActive ? 'active' : 'pending');
    const isExpired = license.expiresAt && new Date(license.expiresAt) < new Date();
    
    if (status === 'revoked') return <Badge variant="destructive">Thu hồi</Badge>;
    if (isExpired) return <Badge variant="destructive">Hết hạn</Badge>;
    if (status === 'active' || license.isActive) return <Badge className="bg-green-500">Hoạt động</Badge>;
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
  
  const stats = statisticsQuery.data;
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý License</h1>
            <p className="text-muted-foreground">Tạo, quản lý và theo dõi license của hệ thống</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo License mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tạo License mới</DialogTitle>
                <DialogDescription>Nhập thông tin để tạo license mới</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Loại License</Label>
                  <Select 
                    value={newLicense.licenseType} 
                    onValueChange={(v: any) => setNewLicense({...newLicense, licenseType: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial (5 users, 2 lines)</SelectItem>
                      <SelectItem value="standard">Standard (20 users, 10 lines)</SelectItem>
                      <SelectItem value="professional">Professional (50 users, 30 lines)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (Unlimited)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tên công ty</Label>
                  <Input 
                    value={newLicense.companyName}
                    onChange={(e) => setNewLicense({...newLicense, companyName: e.target.value})}
                    placeholder="Nhập tên công ty"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email liên hệ</Label>
                  <Input 
                    type="email"
                    value={newLicense.contactEmail}
                    onChange={(e) => setNewLicense({...newLicense, contactEmail: e.target.value})}
                    placeholder="email@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ngày hết hạn (để trống = vĩnh viễn)</Label>
                  <Input 
                    type="date"
                    value={newLicense.expiresAt}
                    onChange={(e) => setNewLicense({...newLicense, expiresAt: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleCreateLicense} disabled={createMutation.isPending}>
                  {createMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Tạo License
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Statistics Cards */}
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
                    <p className="text-sm text-muted-foreground">Sắp hết hạn (30 ngày)</p>
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
                    <p className="text-sm text-muted-foreground">Đã hết hạn/Thu hồi</p>
                    <p className="text-2xl font-bold">{stats.byStatus.expired + stats.byStatus.revoked}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* License Type Distribution */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Phân bố theo loại License</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold">{stats.byType.trial}</p>
                  <p className="text-sm text-muted-foreground">Trial</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{stats.byType.standard}</p>
                  <p className="text-sm text-muted-foreground">Standard</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-3xl font-bold text-purple-600">{stats.byType.professional}</p>
                  <p className="text-sm text-muted-foreground">Professional</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <p className="text-3xl font-bold text-amber-600">{stats.byType.enterprise}</p>
                  <p className="text-sm text-muted-foreground">Enterprise</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* License List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách License</CardTitle>
            <CardDescription>Tất cả license đã được tạo trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Key</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Công ty</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày hết hạn</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licensesQuery.data?.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {license.licenseKey.substring(0, 20)}...
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => {
                            navigator.clipboard.writeText(license.licenseKey);
                            toast.success("Đã copy License Key");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(license.licenseType)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {license.companyName || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(license)}</TableCell>
                    <TableCell>
                      {license.expiresAt 
                        ? new Date(license.expiresAt).toLocaleDateString('vi-VN')
                        : "Vĩnh viễn"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedLicense(license);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedLicense(license);
                            setHardwareFingerprint("");
                            setOfflineFileContent("");
                            setOfflineDialogOpen(true);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRevokeLicense(license.licenseKey)}
                          disabled={license.licenseStatus === 'revoked'}
                        >
                          <Ban className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!licensesQuery.data || licensesQuery.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Chưa có license nào. Nhấn "Tạo License mới" để bắt đầu.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Generate Offline File Dialog */}
        <Dialog open={offlineDialogOpen} onOpenChange={setOfflineDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tạo File License Offline</DialogTitle>
              <DialogDescription>
                Tạo file .lic để kích hoạt license trên máy không có internet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedLicense && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm"><strong>License:</strong> {selectedLicense.licenseKey}</p>
                  <p className="text-sm"><strong>Công ty:</strong> {selectedLicense.companyName || "N/A"}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Hardware Fingerprint của máy đích</Label>
                <Input 
                  value={hardwareFingerprint}
                  onChange={(e) => setHardwareFingerprint(e.target.value)}
                  placeholder="Nhập Hardware Fingerprint từ máy khách hàng"
                />
                <p className="text-xs text-muted-foreground">
                  Khách hàng có thể lấy mã này từ trang Kích hoạt License trên máy của họ.
                </p>
              </div>
              
              {offlineFileContent && (
                <div className="space-y-2">
                  <Label>File License đã tạo</Label>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <FileKey className="h-5 w-5" />
                      <span className="font-medium">{selectedLicense?.licenseKey}.lic</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">File license đã sẵn sàng để tải xuống</p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOfflineDialogOpen(false)}>Đóng</Button>
              {offlineFileContent ? (
                <Button onClick={downloadOfflineFile}>
                  <Download className="h-4 w-4 mr-2" />
                  Tải xuống .lic
                </Button>
              ) : (
                <Button onClick={handleGenerateOfflineFile} disabled={generateOfflineMutation.isPending || !hardwareFingerprint}>
                  {generateOfflineMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Tạo File
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* License Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Chi tiết License</DialogTitle>
            </DialogHeader>
            {selectedLicense && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">License Key</p>
                    <code className="text-xs break-all">{selectedLicense.licenseKey}</code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Loại</p>
                    <p className="font-medium capitalize">{selectedLicense.licenseType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Công ty</p>
                    <p className="font-medium">{selectedLicense.companyName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedLicense.contactEmail || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Max Users</p>
                    <p className="font-medium">{selectedLicense.maxUsers === -1 ? "Unlimited" : selectedLicense.maxUsers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Max Lines</p>
                    <p className="font-medium">{selectedLicense.maxProductionLines === -1 ? "Unlimited" : selectedLicense.maxProductionLines}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ngày tạo</p>
                    <p className="font-medium">{new Date(selectedLicense.issuedAt || selectedLicense.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ngày hết hạn</p>
                    <p className="font-medium">{selectedLicense.expiresAt ? new Date(selectedLicense.expiresAt).toLocaleDateString('vi-VN') : "Vĩnh viễn"}</p>
                  </div>
                </div>
                {selectedLicense.hardwareFingerprint && (
                  <div>
                    <p className="text-sm text-muted-foreground">Hardware Fingerprint</p>
                    <code className="text-xs break-all">{selectedLicense.hardwareFingerprint}</code>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Đóng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
