import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Shield, Plus, Trash2, Save, Users, Lock, Key } from "lucide-react";

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string | null;
  system: "SPC" | "MMS" | "COMMON";
  module: string;
  parentId: number | null;
  sortOrder: number;
}

interface RolePermission {
  id: number;
  role: string;
  permissionId: number;
}

const ROLES = [
  { value: "admin", label: "Quản trị viên", description: "Toàn quyền truy cập hệ thống" },
  { value: "operator", label: "Vận hành", description: "Phân tích SPC, xem dashboard, quản lý dây chuyền" },
  { value: "viewer", label: "Xem", description: "Chỉ xem báo cáo và dashboard" },
  { value: "user", label: "Người dùng", description: "Quyền cơ bản" },
];

// Hệ thống phân quyền
const SYSTEMS = [
  { value: "SPC", label: "SPC/CPK System", description: "Hệ thống phân tích chất lượng" },
  { value: "MMS", label: "MMS - Maintenance", description: "Hệ thống quản lý bảo trì" },
  { value: "COMMON", label: "Chung", description: "Quyền dùng chung" },
];

const MODULES = [
  // ===== SPC SYSTEM =====
  { value: "spc_dashboard", label: "Dashboard SPC", system: "SPC" },
  { value: "spc_realtime", label: "Realtime Dây chuyền", system: "SPC" },
  { value: "spc_overview", label: "Tổng quan SPC Plan", system: "SPC" },
  { value: "spc_analyze", label: "Phân tích SPC", system: "SPC" },
  { value: "spc_multi_analysis", label: "Phân tích đa đối tượng", system: "SPC" },
  { value: "spc_comparison", label: "So sánh dây chuyền/máy", system: "SPC" },
  { value: "spc_history", label: "Lịch sử phân tích", system: "SPC" },
  { value: "spc_report", label: "Báo cáo SPC", system: "SPC" },
  { value: "spc_defect", label: "Quản lý lỗi", system: "SPC" },
  { value: "spc_rules", label: "Cấu hình Rules", system: "SPC" },
  { value: "spc_plan", label: "Kế hoạch SPC", system: "SPC" },
  
  // ===== MMS SYSTEM =====
  { value: "mms_dashboard", label: "Dashboard MMS", system: "MMS" },
  { value: "mms_oee", label: "OEE Dashboard", system: "MMS" },
  { value: "mms_kpi", label: "Plant KPI", system: "MMS" },
  { value: "mms_maintenance", label: "Lịch bảo trì", system: "MMS" },
  { value: "mms_predictive", label: "Bảo trì dự đoán", system: "MMS" },
  { value: "mms_spare_parts", label: "Quản lý phụ tùng", system: "MMS" },
  { value: "mms_purchase_order", label: "Đơn đặt hàng", system: "MMS" },
  { value: "mms_inventory", label: "Xuất/Nhập kho", system: "MMS" },
  { value: "mms_equipment", label: "Quản lý thiết bị", system: "MMS" },
  
  // ===== COMMON =====
  { value: "production_line", label: "Dây chuyền sản xuất", system: "COMMON" },
  { value: "workstation", label: "Công trạm", system: "COMMON" },
  { value: "machine", label: "Máy móc", system: "COMMON" },
  { value: "machine_type", label: "Loại máy", system: "COMMON" },
  { value: "fixture", label: "Fixture", system: "COMMON" },
  { value: "process", label: "Quy trình", system: "COMMON" },
  { value: "product", label: "Sản phẩm", system: "COMMON" },
  { value: "specification", label: "Tiêu chuẩn USL/LSL", system: "COMMON" },
  { value: "mapping", label: "Cấu hình Mapping", system: "COMMON" },
  { value: "database_config", label: "Cấu hình Database", system: "COMMON" },
  { value: "user", label: "Quản lý người dùng", system: "COMMON" },
  { value: "local_user", label: "Người dùng Local", system: "COMMON" },
  { value: "permission", label: "Phân quyền", system: "COMMON" },
  { value: "login_history", label: "Lịch sử đăng nhập", system: "COMMON" },
  { value: "settings", label: "Cài đặt", system: "COMMON" },
  { value: "database_settings", label: "Cấu hình Database", system: "COMMON" },
  { value: "notification", label: "Thông báo Email", system: "COMMON" },
  { value: "smtp", label: "Cấu hình SMTP" },
  { value: "webhook", label: "Webhook" },
  { value: "license", label: "License" },
  { value: "audit_log", label: "Audit Log" },
  { value: "report_template", label: "Template báo cáo" },
  { value: "export_history", label: "Lịch sử xuất" },
  { value: "seed_data", label: "Khởi tạo dữ liệu" },
  { value: "system_setup", label: "Khởi tạo hệ thống" },
];

const DEFAULT_PERMISSIONS = [
  // Tổng quan
  { code: "dashboard.view", name: "Xem Dashboard", module: "dashboard" },
  { code: "dashboard.config", name: "Cấu hình Dashboard", module: "dashboard" },
  { code: "realtime.view", name: "Xem Realtime dây chuyền", module: "realtime" },
  { code: "spc_overview.view", name: "Xem tổng quan SPC Plan", module: "spc_overview" },
  
  // Phân tích
  { code: "analyze.view", name: "Xem phân tích SPC", module: "analyze" },
  { code: "analyze.execute", name: "Thực hiện phân tích", module: "analyze" },
  { code: "analyze.export", name: "Xuất báo cáo", module: "analyze" },
  { code: "multi_analysis.view", name: "Xem phân tích đa đối tượng", module: "multi_analysis" },
  { code: "multi_analysis.execute", name: "Thực hiện phân tích đa đối tượng", module: "multi_analysis" },
  { code: "line_comparison.view", name: "Xem so sánh dây chuyền", module: "line_comparison" },
  { code: "history.view", name: "Xem lịch sử phân tích", module: "history" },
  { code: "history.delete", name: "Xóa lịch sử phân tích", module: "history" },
  { code: "spc_report.view", name: "Xem báo cáo SPC", module: "spc_report" },
  { code: "spc_report.export", name: "Xuất báo cáo SPC", module: "spc_report" },
  
  // Chất lượng
  { code: "defect.view", name: "Xem quản lý lỗi", module: "defect" },
  { code: "defect.manage", name: "Quản lý lỗi", module: "defect" },
  { code: "pareto.view", name: "Xem biểu đồ Pareto", module: "pareto" },
  { code: "rules.view", name: "Xem quản lý Rules", module: "rules" },
  { code: "rules.manage", name: "Quản lý Rules", module: "rules" },
  
  // Sản xuất
  { code: "production_line.view", name: "Xem dây chuyền", module: "production_line" },
  { code: "production_line.manage", name: "Quản lý dây chuyền", module: "production_line" },
  { code: "workstation.view", name: "Xem công trạm", module: "workstation" },
  { code: "workstation.manage", name: "Quản lý công trạm", module: "workstation" },
  { code: "machine.view", name: "Xem máy móc", module: "machine" },
  { code: "machine.manage", name: "Quản lý máy móc", module: "machine" },
  { code: "machine_type.view", name: "Xem loại máy", module: "machine_type" },
  { code: "machine_type.manage", name: "Quản lý loại máy", module: "machine_type" },
  { code: "fixture.view", name: "Xem Fixture", module: "fixture" },
  { code: "fixture.manage", name: "Quản lý Fixture", module: "fixture" },
  { code: "process.view", name: "Xem quy trình", module: "process" },
  { code: "process.manage", name: "Quản lý quy trình", module: "process" },
  { code: "spc_plan.view", name: "Xem kế hoạch SPC", module: "spc_plan" },
  { code: "spc_plan.manage", name: "Quản lý kế hoạch SPC", module: "spc_plan" },
  
  // Dữ liệu chính
  { code: "product.view", name: "Xem sản phẩm", module: "product" },
  { code: "product.manage", name: "Quản lý sản phẩm", module: "product" },
  { code: "specification.view", name: "Xem tiêu chuẩn", module: "specification" },
  { code: "specification.manage", name: "Quản lý tiêu chuẩn", module: "specification" },
  { code: "mapping.view", name: "Xem Mapping", module: "mapping" },
  { code: "mapping.manage", name: "Quản lý Mapping", module: "mapping" },
  { code: "database_config.view", name: "Xem cấu hình Database", module: "database_config" },
  { code: "database_config.manage", name: "Quản lý cấu hình Database", module: "database_config" },
  { code: "sampling.view", name: "Xem phương pháp lấy mẫu", module: "sampling" },
  { code: "sampling.manage", name: "Quản lý phương pháp lấy mẫu", module: "sampling" },
  
  // Người dùng
  { code: "user.view", name: "Xem người dùng", module: "user" },
  { code: "user.manage", name: "Quản lý người dùng", module: "user" },
  { code: "local_user.view", name: "Xem người dùng Local", module: "local_user" },
  { code: "local_user.manage", name: "Quản lý người dùng Local", module: "local_user" },
  { code: "permission.view", name: "Xem phân quyền", module: "permission" },
  { code: "permission.manage", name: "Quản lý phân quyền", module: "permission" },
  { code: "login_history.view", name: "Xem lịch sử đăng nhập", module: "login_history" },
  { code: "login_history.export", name: "Xuất lịch sử đăng nhập", module: "login_history" },
  
  // Hệ thống
  { code: "settings.view", name: "Xem cài đặt", module: "settings" },
  { code: "settings.manage", name: "Quản lý cài đặt", module: "settings" },
  { code: "database_settings.view", name: "Xem cấu hình Database", module: "database_settings" },
  { code: "database_settings.manage", name: "Quản lý cấu hình Database", module: "database_settings" },
  { code: "notification.view", name: "Xem thông báo", module: "notification" },
  { code: "notification.manage", name: "Quản lý thông báo", module: "notification" },
  { code: "smtp.view", name: "Xem cấu hình SMTP", module: "smtp" },
  { code: "smtp.manage", name: "Quản lý cấu hình SMTP", module: "smtp" },
  { code: "webhook.view", name: "Xem Webhook", module: "webhook" },
  { code: "webhook.manage", name: "Quản lý Webhook", module: "webhook" },
  { code: "license.view", name: "Xem License", module: "license" },
  { code: "license.manage", name: "Quản lý License", module: "license" },
  { code: "license.activate", name: "Kích hoạt License", module: "license" },
  { code: "audit_log.view", name: "Xem Audit Log", module: "audit_log" },
  { code: "report_template.view", name: "Xem Template báo cáo", module: "report_template" },
  { code: "report_template.manage", name: "Quản lý Template báo cáo", module: "report_template" },
  { code: "export_history.view", name: "Xem lịch sử xuất", module: "export_history" },
  { code: "seed_data.execute", name: "Khởi tạo dữ liệu mẫu", module: "seed_data" },
  { code: "system_setup.execute", name: "Khởi tạo hệ thống", module: "system_setup" },
];

export default function RolePermissionManagement() {
  const [selectedRole, setSelectedRole] = useState<string>("admin");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, number[]>>({
    admin: [],
    operator: [],
    viewer: [],
    user: [],
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPermission, setNewPermission] = useState({ code: "", name: "", description: "", module: "dashboard" });

  const { data: permissionsData, refetch: refetchPermissions } = trpc.permission.list.useQuery();
  const { data: rolePermissionsData, refetch: refetchRolePermissions } = trpc.permission.listRolePermissions.useQuery();

  const createPermissionMutation = trpc.permission.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo quyền mới!");
      refetchPermissions();
      setIsDialogOpen(false);
      setNewPermission({ code: "", name: "", description: "", module: "dashboard" });
    },
    onError: (error) => toast.error(error.message),
  });

  const initPermissionsMutation = trpc.permission.initDefaults.useMutation({
    onSuccess: () => {
      toast.success("Đã khởi tạo quyền mặc định!");
      refetchPermissions();
      refetchRolePermissions();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateRolePermissionsMutation = trpc.permission.updateRolePermissions.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật quyền cho vai trò!");
      refetchRolePermissions();
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (permissionsData) {
      setPermissions(permissionsData as Permission[]);
    }
  }, [permissionsData]);

  useEffect(() => {
    if (rolePermissionsData) {
      const grouped: Record<string, number[]> = { admin: [], operator: [], viewer: [], user: [] };
      (rolePermissionsData as RolePermission[]).forEach((rp) => {
        if (grouped[rp.role]) {
          grouped[rp.role].push(rp.permissionId);
        }
      });
      setRolePermissions(grouped);
    }
  }, [rolePermissionsData]);

  const handleTogglePermission = (permissionId: number) => {
    const currentPermissions = rolePermissions[selectedRole] || [];
    const newPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter((id) => id !== permissionId)
      : [...currentPermissions, permissionId];
    
    setRolePermissions({ ...rolePermissions, [selectedRole]: newPermissions });
  };

  const handleSaveRolePermissions = () => {
    updateRolePermissionsMutation.mutate({
      role: selectedRole,
      permissionIds: rolePermissions[selectedRole] || [],
    });
  };

  const handleCreatePermission = () => {
    if (!newPermission.code || !newPermission.name) {
      toast.error("Vui lòng điền mã và tên quyền");
      return;
    }
    createPermissionMutation.mutate(newPermission);
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Phân quyền</h1>
            <p className="text-muted-foreground mt-1">
              Cấu hình quyền truy cập cho các vai trò trong hệ thống
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => initPermissionsMutation.mutate()}>
              <Key className="mr-2 h-4 w-4" />
              Khởi tạo quyền mặc định
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm quyền
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm quyền mới</DialogTitle>
                  <DialogDescription>Tạo quyền mới trong hệ thống</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Mã quyền</Label>
                    <Input
                      placeholder="vd: dashboard.view"
                      value={newPermission.code}
                      onChange={(e) => setNewPermission({ ...newPermission, code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tên quyền</Label>
                    <Input
                      placeholder="vd: Xem Dashboard"
                      value={newPermission.name}
                      onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Module</Label>
                    <Select value={newPermission.module} onValueChange={(v) => setNewPermission({ ...newPermission, module: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODULES.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Input
                      placeholder="Mô tả quyền"
                      value={newPermission.description}
                      onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                  <Button onClick={handleCreatePermission}>Tạo</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Role Selection */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Vai trò
            </CardTitle>
            <CardDescription>Chọn vai trò để cấu hình quyền</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {ROLES.map((role) => (
                <Card
                  key={role.value}
                  className={`cursor-pointer transition-all ${
                    selectedRole === role.value
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedRole(role.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Shield className={`h-5 w-5 ${selectedRole === role.value ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <p className="font-medium">{role.label}</p>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Table */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Quyền cho vai trò: {ROLES.find((r) => r.value === selectedRole)?.label}
              </CardTitle>
              <CardDescription>
                Đánh dấu các quyền mà vai trò này được phép sử dụng
              </CardDescription>
            </div>
            <Button onClick={handleSaveRolePermissions} disabled={updateRolePermissionsMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Lưu thay đổi
            </Button>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedPermissions).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có quyền nào được định nghĩa.</p>
                <p className="text-sm">Nhấn "Khởi tạo quyền mặc định" để tạo các quyền cơ bản.</p>
              </div>
            ) : (
              <Tabs defaultValue={Object.keys(groupedPermissions)[0]} className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1">
                  {Object.keys(groupedPermissions).map((module) => (
                    <TabsTrigger key={module} value={module} className="text-xs">
                      {MODULES.find((m) => m.value === module)?.label || module}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <TabsContent key={module} value={module}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Cho phép</TableHead>
                          <TableHead>Mã quyền</TableHead>
                          <TableHead>Tên quyền</TableHead>
                          <TableHead>Mô tả</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {perms.map((perm) => (
                          <TableRow key={perm.id}>
                            <TableCell>
                              <Checkbox
                                checked={rolePermissions[selectedRole]?.includes(perm.id)}
                                onCheckedChange={() => handleTogglePermission(perm.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{perm.code}</TableCell>
                            <TableCell>{perm.name}</TableCell>
                            <TableCell className="text-muted-foreground">{perm.description || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
