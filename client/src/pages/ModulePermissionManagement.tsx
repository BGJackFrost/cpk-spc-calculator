import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Plus, Edit, Trash2, Settings, Shield, Database, 
  LayoutDashboard, Wrench, Package, BarChart3, Users, Building2,
  ChevronRight, ChevronDown, Search, RefreshCw, Save
} from "lucide-react";

interface Module {
  id: number;
  code: string;
  name: string;
  description: string | null;
  systemType: string;
  parentId: number | null;
  icon: string | null;
  path: string | null;
  sortOrder: number;
  isActive: number;
}

interface Permission {
  id: number;
  moduleId: number;
  code: string;
  name: string;
  description: string | null;
  actionType: string;
  isActive: number;
}

interface ModuleWithPermissions {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  path: string | null;
  permissions: Array<{
    id: number;
    code: string;
    name: string;
    actionType: string;
  }>;
}

const SYSTEM_TYPES = [
  { value: "mms", label: "MMS - Bảo trì", icon: Wrench, color: "bg-blue-500" },
  { value: "spc", label: "SPC/CPK - Chất lượng", icon: BarChart3, color: "bg-green-500" },
  { value: "system", label: "Hệ thống", icon: Settings, color: "bg-purple-500" },
  { value: "common", label: "Chung", icon: LayoutDashboard, color: "bg-gray-500" },
];

const ACTION_TYPES = [
  { value: "view", label: "Xem" },
  { value: "create", label: "Tạo mới" },
  { value: "edit", label: "Chỉnh sửa" },
  { value: "delete", label: "Xóa" },
  { value: "export", label: "Xuất dữ liệu" },
  { value: "import", label: "Nhập dữ liệu" },
  { value: "approve", label: "Phê duyệt" },
  { value: "manage", label: "Quản lý" },
];

export default function ModulePermissionManagement() {
  const [activeTab, setActiveTab] = useState("modules");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSystemType, setSelectedSystemType] = useState<string>("all");
  
  // Module dialog state
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState({
    code: "",
    name: "",
    description: "",
    systemType: "mms" as "mms" | "spc" | "system" | "common",
    icon: "",
    path: "",
    sortOrder: 0,
  });
  
  // Permission dialog state
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [permissionForm, setPermissionForm] = useState({
    code: "",
    name: "",
    description: "",
    actionType: "view" as "view" | "create" | "edit" | "delete" | "export" | "import" | "approve" | "manage",
  });
  
  // Role permission state
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());

  // Queries
  const { data: modules = [], refetch: refetchModules } = trpc.permissionModule.listModules.useQuery();
  const { data: permissions = [], refetch: refetchPermissions } = trpc.permissionModule.listPermissions.useQuery();
  const { data: modulesWithPermissions } = trpc.permissionModule.getModulesWithPermissions.useQuery();
  // Use local auth roles instead
  const roles = [
    { id: 1, name: "Admin" },
    { id: 2, name: "Manager" },
    { id: 3, name: "User" },
  ];
  const { data: rolePermissions = [] } = trpc.permissionModule.getRolePermissions.useQuery(
    { roleId: selectedRoleId! },
    { enabled: !!selectedRoleId }
  );

  // Mutations
  const createModuleMutation = trpc.permissionModule.createModule.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo module mới");
      refetchModules();
      setModuleDialogOpen(false);
      resetModuleForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateModuleMutation = trpc.permissionModule.updateModule.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật module");
      refetchModules();
      setModuleDialogOpen(false);
      resetModuleForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteModuleMutation = trpc.permissionModule.deleteModule.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa module");
      refetchModules();
      refetchPermissions();
    },
    onError: (error) => toast.error(error.message),
  });

  const createPermissionMutation = trpc.permissionModule.createPermission.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo quyền mới");
      refetchPermissions();
      setPermissionDialogOpen(false);
      resetPermissionForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePermissionMutation = trpc.permissionModule.updatePermission.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật quyền");
      refetchPermissions();
      setPermissionDialogOpen(false);
      resetPermissionForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePermissionMutation = trpc.permissionModule.deletePermission.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa quyền");
      refetchPermissions();
    },
    onError: (error) => toast.error(error.message),
  });

  const initializeModulesMutation = trpc.permissionModule.initializeDefaultModules.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      refetchModules();
      refetchPermissions();
    },
    onError: (error) => toast.error(error.message),
  });

  const setRolePermissionsMutation = trpc.permissionModule.setRolePermissions.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu quyền cho vai trò");
    },
    onError: (error) => toast.error(error.message),
  });

  // Helpers
  const resetModuleForm = () => {
    setEditingModule(null);
    setModuleForm({
      code: "",
      name: "",
      description: "",
      systemType: "mms",
      icon: "",
      path: "",
      sortOrder: 0,
    });
  };

  const resetPermissionForm = () => {
    setEditingPermission(null);
    setPermissionForm({
      code: "",
      name: "",
      description: "",
      actionType: "view",
    });
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleForm({
      code: module.code,
      name: module.name,
      description: module.description || "",
      systemType: module.systemType as "mms" | "spc" | "system" | "common",
      icon: module.icon || "",
      path: module.path || "",
      sortOrder: module.sortOrder,
    });
    setModuleDialogOpen(true);
  };

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setPermissionForm({
      code: permission.code,
      name: permission.name,
      description: permission.description || "",
      actionType: permission.actionType as "view" | "create" | "edit" | "delete" | "export" | "import" | "approve" | "manage",
    });
    setSelectedModuleId(permission.moduleId);
    setPermissionDialogOpen(true);
  };

  const handleSaveModule = () => {
    if (editingModule) {
      updateModuleMutation.mutate({ id: editingModule.id, ...moduleForm });
    } else {
      createModuleMutation.mutate(moduleForm);
    }
  };

  const handleSavePermission = () => {
    if (!selectedModuleId) {
      toast.error("Vui lòng chọn module");
      return;
    }
    if (editingPermission) {
      updatePermissionMutation.mutate({ id: editingPermission.id, ...permissionForm });
    } else {
      createPermissionMutation.mutate({ moduleId: selectedModuleId, ...permissionForm });
    }
  };

  const handleToggleModuleExpand = (moduleId: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleTogglePermission = (permissionId: number) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleSaveRolePermissions = () => {
    if (!selectedRoleId) return;
    setRolePermissionsMutation.mutate({
      roleId: selectedRoleId,
      permissionIds: Array.from(selectedPermissions),
    });
  };

  // Load role permissions when role is selected
  useEffect(() => {
    const newPermIds = rolePermissions.map((rp: { permissionId: number }) => rp.permissionId);
    const currentPermIds = Array.from(selectedPermissions);
    
    // Only update if permissions actually changed
    const hasChanged = newPermIds.length !== currentPermIds.length || 
      !newPermIds.every(id => currentPermIds.includes(id));
    
    if (hasChanged) {
      setSelectedPermissions(new Set(newPermIds));
    }
  }, [rolePermissions]);

  // Filter modules
  const filteredModules = useMemo(() => {
    return modules.filter((module: Module) => {
      const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           module.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSystem = selectedSystemType === "all" || module.systemType === selectedSystemType;
      return matchesSearch && matchesSystem;
    });
  }, [modules, searchTerm, selectedSystemType]);

  // Group modules by system type
  const groupedModules = useMemo(() => {
    const groups: Record<string, Module[]> = { mms: [], spc: [], system: [], common: [] };
    filteredModules.forEach((module: Module) => {
      if (module.systemType in groups) {
        groups[module.systemType].push(module);
      }
    });
    return groups;
  }, [filteredModules]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Phân quyền & Quản lý Module</h1>
            <p className="text-muted-foreground">Quản lý phân quyền người dùng, cấu hình module và quyền hạn trong hệ thống</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => initializeModulesMutation.mutate()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Khởi tạo mặc định
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="modules">
              <Database className="w-4 h-4 mr-2" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Shield className="w-4 h-4 mr-2" />
              Quyền hạn
            </TabsTrigger>
            <TabsTrigger value="role-permissions">
              <Users className="w-4 h-4 mr-2" />
              Phân quyền Vai trò
            </TabsTrigger>
          </TabsList>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm module..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedSystemType} onValueChange={setSelectedSystemType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Lọc theo hệ thống" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {SYSTEM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => { resetModuleForm(); setModuleDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm Module
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SYSTEM_TYPES.map((systemType) => (
                <Card key={systemType.value}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className={`p-2 rounded-lg ${systemType.color}`}>
                        <systemType.icon className="w-4 h-4 text-white" />
                      </div>
                      {systemType.label}
                      <Badge variant="secondary" className="ml-auto">
                        {groupedModules[systemType.value]?.length || 0}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {groupedModules[systemType.value]?.map((module: Module) => (
                        <div
                          key={module.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant={module.isActive ? "default" : "secondary"}>
                              {module.code}
                            </Badge>
                            <span className="font-medium">{module.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditModule(module)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Bạn có chắc muốn xóa module này?")) {
                                  deleteModuleMutation.mutate({ id: module.id });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(!groupedModules[systemType.value] || groupedModules[systemType.value].length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Chưa có module nào
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4">
            <div className="flex items-center justify-between">
              <Select
                value={selectedModuleId?.toString() || ""}
                onValueChange={(v) => setSelectedModuleId(v ? Number(v) : null)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Chọn module để xem quyền" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((module: Module) => (
                    <SelectItem key={module.id} value={module.id.toString()}>
                      [{module.systemType.toUpperCase()}] {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => { resetPermissionForm(); setPermissionDialogOpen(true); }}
                disabled={!selectedModuleId}
              >
                <Plus className="w-4 h-4 mr-2" />
                Thêm Quyền
              </Button>
            </div>

            {selectedModuleId && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Quyền của module: {modules.find((m: Module) => m.id === selectedModuleId)?.name || ""}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã</TableHead>
                        <TableHead>Tên</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions
                        .filter((p: Permission) => p.moduleId === selectedModuleId)
                        .map((permission: Permission) => (
                          <TableRow key={permission.id}>
                            <TableCell className="font-mono text-sm">{permission.code}</TableCell>
                            <TableCell>{permission.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {ACTION_TYPES.find((a) => a.value === permission.actionType)?.label || permission.actionType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={permission.isActive ? "default" : "secondary"}>
                                {permission.isActive ? "Hoạt động" : "Tắt"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleEditPermission(permission)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm("Bạn có chắc muốn xóa quyền này?")) {
                                    deletePermissionMutation.mutate({ id: permission.id });
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Role Permissions Tab */}
          <TabsContent value="role-permissions" className="space-y-4">
            <div className="flex items-center justify-between">
              <Select
                value={selectedRoleId?.toString() || ""}
                onValueChange={(v) => setSelectedRoleId(v ? Number(v) : null)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role: { id: number; name: string }) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSaveRolePermissions} disabled={!selectedRoleId}>
                <Save className="w-4 h-4 mr-2" />
                Lưu quyền
              </Button>
            </div>

            {selectedRoleId && modulesWithPermissions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SYSTEM_TYPES.map((systemType) => {
                  const systemModules = modulesWithPermissions[systemType.value as keyof typeof modulesWithPermissions] || [];
                  if (systemModules.length === 0) return null;
                  
                  return (
                    <Card key={systemType.value}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <div className={`p-2 rounded-lg ${systemType.color}`}>
                            <systemType.icon className="w-4 h-4 text-white" />
                          </div>
                          {systemType.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {systemModules.map((module: ModuleWithPermissions) => (
                            <div key={module.id} className="border rounded-lg">
                              <button
                                className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
                                onClick={() => handleToggleModuleExpand(module.id)}
                              >
                                <span className="font-medium">{module.name}</span>
                                {expandedModules.has(module.id) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              {expandedModules.has(module.id) && (
                                <div className="px-3 pb-3 space-y-2">
                                  {module.permissions.map((perm) => (
                                    <div key={perm.id} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`perm-${perm.id}`}
                                        checked={selectedPermissions.has(perm.id)}
                                        onCheckedChange={() => handleTogglePermission(perm.id)}
                                      />
                                      <label
                                        htmlFor={`perm-${perm.id}`}
                                        className="text-sm cursor-pointer"
                                      >
                                        {perm.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Module Dialog */}
        <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingModule ? "Chỉnh sửa Module" : "Thêm Module mới"}</DialogTitle>
              <DialogDescription>
                Cấu hình thông tin module trong hệ thống
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã module</Label>
                  <Input
                    value={moduleForm.code}
                    onChange={(e) => setModuleForm({ ...moduleForm, code: e.target.value })}
                    placeholder="mms_machines"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên module</Label>
                  <Input
                    value={moduleForm.name}
                    onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                    placeholder="Quản lý Máy móc"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Input
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                  placeholder="Mô tả chức năng của module"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hệ thống</Label>
                  <Select
                    value={moduleForm.systemType}
                    onValueChange={(v) => setModuleForm({ ...moduleForm, systemType: v as "mms" | "spc" | "system" | "common" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Thứ tự</Label>
                  <Input
                    type="number"
                    value={moduleForm.sortOrder}
                    onChange={(e) => setModuleForm({ ...moduleForm, sortOrder: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Input
                    value={moduleForm.icon}
                    onChange={(e) => setModuleForm({ ...moduleForm, icon: e.target.value })}
                    placeholder="Settings"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Đường dẫn</Label>
                  <Input
                    value={moduleForm.path}
                    onChange={(e) => setModuleForm({ ...moduleForm, path: e.target.value })}
                    placeholder="/machines"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSaveModule}>
                {editingModule ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permission Dialog */}
        <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPermission ? "Chỉnh sửa Quyền" : "Thêm Quyền mới"}</DialogTitle>
              <DialogDescription>
                Cấu hình quyền hạn cho module
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã quyền</Label>
                  <Input
                    value={permissionForm.code}
                    onChange={(e) => setPermissionForm({ ...permissionForm, code: e.target.value })}
                    placeholder="mms_machines_view"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên quyền</Label>
                  <Input
                    value={permissionForm.name}
                    onChange={(e) => setPermissionForm({ ...permissionForm, name: e.target.value })}
                    placeholder="Xem danh sách máy"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Input
                  value={permissionForm.description}
                  onChange={(e) => setPermissionForm({ ...permissionForm, description: e.target.value })}
                  placeholder="Mô tả chi tiết quyền"
                />
              </div>
              <div className="space-y-2">
                <Label>Loại hành động</Label>
                <Select
                  value={permissionForm.actionType}
                  onValueChange={(v) => setPermissionForm({ ...permissionForm, actionType: v as "view" | "create" | "edit" | "delete" | "export" | "import" | "approve" | "manage" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSavePermission}>
                {editingPermission ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
