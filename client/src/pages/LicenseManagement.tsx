import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Key, Trash2, Power, PowerOff, RefreshCw, Copy, CheckCircle, XCircle, Calendar, Users, Factory, Shield, Keyboard } from "lucide-react";
import { useKeyboardShortcuts, createCommonShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface License {
  id: number;
  licenseKey: string;
  licenseType: "trial" | "standard" | "professional" | "enterprise";
  companyName: string | null;
  contactEmail: string | null;
  maxUsers: number;
  maxProductionLines: number;
  maxSpcPlans: number;
  features: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  activatedAt: Date | null;
  activatedBy: number | null;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function LicenseManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [formData, setFormData] = useState({
    licenseType: "standard" as "trial" | "standard" | "professional" | "enterprise",
    companyName: "",
    contactEmail: "",
    maxUsers: 20,
    maxProductionLines: 10,
    maxSpcPlans: 50,
    expiresInDays: 365,
  });

  const { data: licenses, refetch } = trpc.license.list.useQuery();
  const { data: generatedKey, refetch: regenerateKey } = trpc.license.generateKey.useQuery();

  const createMutation = trpc.license.create.useMutation({
    onSuccess: (data) => {
      toast.success(`License đã được tạo: ${data.licenseKey}`);
      setIsCreateDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Tạo license thất bại");
    },
  });

  const activateMutation = trpc.license.activate.useMutation({
    onSuccess: () => {
      toast.success("Kích hoạt license thành công");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Kích hoạt thất bại");
    },
  });

  const deactivateMutation = trpc.license.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Hủy kích hoạt license thành công");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Hủy kích hoạt thất bại");
    },
  });

  const deleteMutation = trpc.license.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa license thành công");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Xóa license thất bại");
    },
  });

  const resetForm = () => {
    setFormData({
      licenseType: "standard",
      companyName: "",
      contactEmail: "",
      maxUsers: 20,
      maxProductionLines: 10,
      maxSpcPlans: 50,
      expiresInDays: 365,
    });
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: createCommonShortcuts({
      onNew: () => {
        regenerateKey();
        setIsCreateDialogOpen(true);
      },
      onClose: () => {
        setIsCreateDialogOpen(false);
      },
      onHelp: () => setShowShortcutsHelp(true),
    }),
  });

  const handleCreate = () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + formData.expiresInDays);

    createMutation.mutate({
      licenseKey: generatedKey?.licenseKey,
      licenseType: formData.licenseType,
      companyName: formData.companyName || undefined,
      contactEmail: formData.contactEmail || undefined,
      maxUsers: formData.maxUsers,
      maxProductionLines: formData.maxProductionLines,
      maxSpcPlans: formData.maxSpcPlans,
      expiresAt: expiresAt,
    });
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Đã sao chép license key");
  };

  const getLicenseTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      trial: "bg-yellow-100 text-yellow-800",
      standard: "bg-blue-100 text-blue-800",
      professional: "bg-purple-100 text-purple-800",
      enterprise: "bg-green-100 text-green-800",
    };
    const labels: Record<string, string> = {
      trial: "Trial",
      standard: "Standard",
      professional: "Professional",
      enterprise: "Enterprise",
    };
    return <Badge className={styles[type] || "bg-gray-100 text-gray-800"}>{labels[type] || type}</Badge>;
  };

  const getLicenseTypeDefaults = (type: string) => {
    const defaults: Record<string, { maxUsers: number; maxProductionLines: number; maxSpcPlans: number; expiresInDays: number }> = {
      trial: { maxUsers: 5, maxProductionLines: 3, maxSpcPlans: 10, expiresInDays: 30 },
      standard: { maxUsers: 20, maxProductionLines: 10, maxSpcPlans: 50, expiresInDays: 365 },
      professional: { maxUsers: 50, maxProductionLines: 20, maxSpcPlans: 200, expiresInDays: 365 },
      enterprise: { maxUsers: 999, maxProductionLines: 100, maxSpcPlans: 999, expiresInDays: 730 },
    };
    return defaults[type] || defaults.standard;
  };

  const handleTypeChange = (type: "trial" | "standard" | "professional" | "enterprise") => {
    const defaults = getLicenseTypeDefaults(type);
    setFormData({
      ...formData,
      licenseType: type,
      ...defaults,
    });
  };

  // Stats
  const totalLicenses = licenses?.length || 0;
  const activeLicenses = licenses?.filter((l: License) => l.isActive === 1).length || 0;
  const expiredLicenses = licenses?.filter((l: License) => l.expiresAt && new Date(l.expiresAt) < new Date()).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý License</h1>
            <p className="text-muted-foreground">Quản lý tất cả licenses của hệ thống</p>
          </div>
          <Button onClick={() => { regenerateKey(); setIsCreateDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo License mới
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tổng License</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLicenses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Đang Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeLicenses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Đã hết hạn</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{expiredLicenses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Chưa kích hoạt</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLicenses - activeLicenses}</div>
            </CardContent>
          </Card>
        </div>

        {/* License Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách License</CardTitle>
            <CardDescription>Tất cả licenses đã được tạo trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Key</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Công ty</TableHead>
                  <TableHead>Giới hạn</TableHead>
                  <TableHead>Hết hạn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses?.map((license: License) => {
                  const isExpired = license.expiresAt && new Date(license.expiresAt) < new Date();
                  return (
                    <TableRow key={license.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {license.licenseKey}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyKey(license.licenseKey)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{getLicenseTypeBadge(license.licenseType)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{license.companyName || "-"}</div>
                          <div className="text-xs text-muted-foreground">{license.contactEmail || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {license.maxUsers} users
                          </div>
                          <div className="flex items-center gap-1">
                            <Factory className="h-3 w-3" />
                            {license.maxProductionLines} lines
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {license.expiresAt ? (
                          <div className={`flex items-center gap-1 ${isExpired ? "text-red-600" : ""}`}>
                            <Calendar className="h-3 w-3" />
                            {format(new Date(license.expiresAt), "dd/MM/yyyy", { locale: vi })}
                            {isExpired && <Badge variant="destructive" className="ml-1 text-xs">Hết hạn</Badge>}
                          </div>
                        ) : (
                          <span className="text-green-600">Vĩnh viễn</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {license.isActive === 1 ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {license.isActive === 1 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deactivateMutation.mutate({ id: license.id })}
                              disabled={deactivateMutation.isPending}
                            >
                              <PowerOff className="h-3 w-3 mr-1" />
                              Hủy
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => activateMutation.mutate({ licenseKey: license.licenseKey })}
                              disabled={activateMutation.isPending || !!isExpired}
                            >
                              <Power className="h-3 w-3 mr-1" />
                              Kích hoạt
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm("Bạn có chắc muốn xóa license này?")) {
                                deleteMutation.mutate({ id: license.id });
                              }
                            }}
                            disabled={deleteMutation.isPending || false}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!licenses || licenses.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Chưa có license nào. Nhấn "Tạo License mới" để bắt đầu.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create License Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tạo License mới</DialogTitle>
              <DialogDescription>Tạo license key mới cho khách hàng</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Generated Key */}
              <div className="space-y-2">
                <Label>License Key (tự động tạo)</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-sm">
                    {generatedKey?.licenseKey || "Đang tạo..."}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => regenerateKey()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => generatedKey && handleCopyKey(generatedKey.licenseKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* License Type */}
              <div className="space-y-2">
                <Label>Loại License</Label>
                <Select value={formData.licenseType} onValueChange={(v) => handleTypeChange(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial (30 ngày)</SelectItem>
                    <SelectItem value="standard">Standard (1 năm)</SelectItem>
                    <SelectItem value="professional">Professional (1 năm)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (2 năm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Company Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên công ty</Label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Công ty ABC"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email liên hệ</Label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="contact@company.com"
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Max Users</Label>
                  <Input
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Lines</Label>
                  <Input
                    type="number"
                    value={formData.maxProductionLines}
                    onChange={(e) => setFormData({ ...formData, maxProductionLines: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Plans</Label>
                  <Input
                    type="number"
                    value={formData.maxSpcPlans}
                    onChange={(e) => setFormData({ ...formData, maxSpcPlans: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Expires In */}
              <div className="space-y-2">
                <Label>Thời hạn (ngày)</Label>
                <Input
                  type="number"
                  value={formData.expiresInDays}
                  onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Đang tạo..." : "Tạo License"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
      />
    </DashboardLayout>
  );
}
