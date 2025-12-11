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
  module: string;
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

const MODULES = [
  { value: "dashboard", label: "Dashboard" },
  { value: "analyze", label: "Phân tích SPC" },
  { value: "history", label: "Lịch sử" },
  { value: "mapping", label: "Quản lý Mapping" },
  { value: "product", label: "Quản lý Sản phẩm" },
  { value: "specification", label: "Tiêu chuẩn USL/LSL" },
  { value: "production_line", label: "Dây chuyền sản xuất" },
  { value: "sampling", label: "Phương pháp lấy mẫu" },
  { value: "spc_plan", label: "Kế hoạch SPC" },
  { value: "notification", label: "Thông báo Email" },
  { value: "user", label: "Quản lý người dùng" },
  { value: "settings", label: "Cài đặt hệ thống" },
];

const DEFAULT_PERMISSIONS = [
  { code: "dashboard.view", name: "Xem Dashboard", module: "dashboard" },
  { code: "dashboard.config", name: "Cấu hình Dashboard", module: "dashboard" },
  { code: "analyze.view", name: "Xem phân tích SPC", module: "analyze" },
  { code: "analyze.execute", name: "Thực hiện phân tích", module: "analyze" },
  { code: "analyze.export", name: "Xuất báo cáo", module: "analyze" },
  { code: "history.view", name: "Xem lịch sử", module: "history" },
  { code: "mapping.view", name: "Xem Mapping", module: "mapping" },
  { code: "mapping.manage", name: "Quản lý Mapping", module: "mapping" },
  { code: "product.view", name: "Xem sản phẩm", module: "product" },
  { code: "product.manage", name: "Quản lý sản phẩm", module: "product" },
  { code: "specification.view", name: "Xem tiêu chuẩn", module: "specification" },
  { code: "specification.manage", name: "Quản lý tiêu chuẩn", module: "specification" },
  { code: "production_line.view", name: "Xem dây chuyền", module: "production_line" },
  { code: "production_line.manage", name: "Quản lý dây chuyền", module: "production_line" },
  { code: "sampling.view", name: "Xem phương pháp lấy mẫu", module: "sampling" },
  { code: "sampling.manage", name: "Quản lý phương pháp lấy mẫu", module: "sampling" },
  { code: "spc_plan.view", name: "Xem kế hoạch SPC", module: "spc_plan" },
  { code: "spc_plan.manage", name: "Quản lý kế hoạch SPC", module: "spc_plan" },
  { code: "notification.view", name: "Xem thông báo", module: "notification" },
  { code: "notification.manage", name: "Quản lý thông báo", module: "notification" },
  { code: "user.view", name: "Xem người dùng", module: "user" },
  { code: "user.manage", name: "Quản lý người dùng", module: "user" },
  { code: "settings.view", name: "Xem cài đặt", module: "settings" },
  { code: "settings.manage", name: "Quản lý cài đặt", module: "settings" },
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
