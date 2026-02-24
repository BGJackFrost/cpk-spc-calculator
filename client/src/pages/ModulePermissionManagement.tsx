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
  ChevronRight, ChevronDown, Search, RefreshCw, Save, Copy
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

interface RoleTemplate {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: "production" | "quality" | "maintenance" | "management" | "system";
  permissionIds: string;
  isDefault: number;
  isActive: number;
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
  
  // Permission search and filter state
  const [permSearchTerm, setPermSearchTerm] = useState("");
  const [permFilterModule, setPermFilterModule] = useState<string>("all");
  const [permFilterAction, setPermFilterAction] = useState<string>("all");
  
  // Copy permissions state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [sourceRoleId, setSourceRoleId] = useState<number | null>(null);

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
  const { data: roleTemplates = [], refetch: refetchTemplates } = trpc.permissionModule.listRoleTemplates.useQuery();

  // Template state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RoleTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    code: "",
    name: "",
    description: "",
    category: "production" as "production" | "quality" | "maintenance" | "management" | "system",
    permissionIds: [] as number[],
  });
  const [applyTemplateDialogOpen, setApplyTemplateDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

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

  const copyRolePermissionsMutation = trpc.permissionModule.copyRolePermissions.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        setCopyDialogOpen(false);
        setSourceRoleId(null);
        // Reload permissions for current role
        if (selectedRoleId) {
          // Trigger re-fetch by toggling role
          const currentRole = selectedRoleId;
          setSelectedRoleId(null);
          setTimeout(() => setSelectedRoleId(currentRole), 100);
        }
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  // Template mutations
  const createTemplateMutation = trpc.permissionModule.createRoleTemplate.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo mẫu vai trò");
      refetchTemplates();
      setTemplateDialogOpen(false);
      resetTemplateForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTemplateMutation = trpc.permissionModule.updateRoleTemplate.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật mẫu vai trò");
      refetchTemplates();
      setTemplateDialogOpen(false);
      resetTemplateForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteTemplateMutation = trpc.permissionModule.deleteRoleTemplate.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa mẫu vai trò");
      refetchTemplates();
    },
    onError: (error) => toast.error(error.message),
  });

  const initializeTemplatesMutation = trpc.permissionModule.initializeDefaultTemplates.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      refetchTemplates();
    },
    onError: (error) => toast.error(error.message),
  });

  const applyTemplateMutation = trpc.permissionModule.applyRoleTemplate.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setApplyTemplateDialogOpen(false);
      setSelectedTemplateId(null);
      // Reload permissions for current role
      if (selectedRoleId) {
        const currentRole = selectedRoleId;
        setSelectedRoleId(null);
        setTimeout(() => setSelectedRoleId(currentRole), 100);
      }
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

  const resetTemplateForm = () => {
    setEditingTemplate(null);
    setTemplateForm({
      code: "",
      name: "",
      description: "",
      category: "production",
      permissionIds: [],
    });
  };

  const handleEditTemplate = (template: RoleTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      code: template.code,
      name: template.name,
      description: template.description || "",
      category: template.category,
      permissionIds: JSON.parse(template.permissionIds || "[]"),
    });
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, ...templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  const handleApplyTemplate = () => {
    if (!selectedRoleId || !selectedTemplateId) return;
    applyTemplateMutation.mutate({ templateId: selectedTemplateId, roleId: selectedRoleId });
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

  // Filter permissions for Quyền hạn tab
  const filteredPermissions = useMemo(() => {
    return permissions.filter((permission: Permission) => {
      const matchesSearch = permission.name.toLowerCase().includes(permSearchTerm.toLowerCase()) ||
                           permission.code.toLowerCase().includes(permSearchTerm.toLowerCase());
      const matchesModule = permFilterModule === "all" || permission.moduleId === Number(permFilterModule);
      const matchesAction = permFilterAction === "all" || permission.actionType === permFilterAction;
      return matchesSearch && matchesModule && matchesAction;
    });
  }, [permissions, permSearchTerm, permFilterModule, permFilterAction]);

  // Handle copy permissions
  const handleCopyPermissions = () => {
    if (!sourceRoleId || !selectedRoleId) return;
    copyRolePermissionsMutation.mutate({
      sourceRoleId,
      targetRoleId: selectedRoleId,
    });
  };

  // Select all permissions for a module
  const handleSelectAllModulePermissions = (moduleId: number, modulePermissions: Array<{id: number}>) => {
    const newSelected = new Set(selectedPermissions);
    const allSelected = modulePermissions.every(p => newSelected.has(p.id));
    
    if (allSelected) {
      // Deselect all
      modulePermissions.forEach(p => newSelected.delete(p.id));
    } else {
      // Select all
      modulePermissions.forEach(p => newSelected.add(p.id));
    }
    setSelectedPermissions(newSelected);
  };

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
            <TabsTrigger value="templates">
              <Package className="w-4 h-4 mr-2" />
              Mẫu Vai trò
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
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm quyền..."
                  value={permSearchTerm}
                  onChange={(e) => setPermSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={permFilterModule}
                onValueChange={setPermFilterModule}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Lọc theo module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả modules</SelectItem>
                  {modules.map((module: Module) => (
                    <SelectItem key={module.id} value={module.id.toString()}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={permFilterAction}
                onValueChange={setPermFilterAction}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Loại quyền" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {ACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedModuleId?.toString() || ""}
                onValueChange={(v) => setSelectedModuleId(v ? Number(v) : null)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Chọn module để thêm quyền" />
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
            
            <div className="text-sm text-muted-foreground">
              Hiển thị {filteredPermissions.length} / {permissions.length} quyền
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Danh sách Quyền hạn</CardTitle>
                <CardDescription>
                  {permFilterModule !== "all" && `Module: ${modules.find((m: Module) => m.id === Number(permFilterModule))?.name || ""}`}
                  {permFilterAction !== "all" && ` | Loại: ${ACTION_TYPES.find(a => a.value === permFilterAction)?.label || ""}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPermissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Không tìm thấy quyền nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPermissions.map((permission: Permission) => (
                        <TableRow key={permission.id}>
                          <TableCell className="font-mono text-sm">{permission.code}</TableCell>
                          <TableCell>{permission.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {modules.find((m: Module) => m.id === permission.moduleId)?.name || "N/A"}
                            </Badge>
                          </TableCell>
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Role Permissions Tab */}
          <TabsContent value="role-permissions" className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
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
              
              {selectedRoleId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Đã chọn: {selectedPermissions.size} quyền</span>
                </div>
              )}
              
              <div className="flex-1" />
              
              <Button
                variant="outline"
                onClick={() => setApplyTemplateDialogOpen(true)}
                disabled={!selectedRoleId}
              >
                <Package className="w-4 h-4 mr-2" />
                Áp dụng mẫu
              </Button>
              <Button
                variant="outline"
                onClick={() => setCopyDialogOpen(true)}
                disabled={!selectedRoleId}
              >
                <Copy className="w-4 h-4 mr-2" />
                Sao chép từ vai trò khác
              </Button>
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
                          {systemModules.map((module: ModuleWithPermissions) => {
                            const allSelected = module.permissions.length > 0 && module.permissions.every(p => selectedPermissions.has(p.id));
                            const someSelected = module.permissions.some(p => selectedPermissions.has(p.id));
                            return (
                              <div key={module.id} className="border rounded-lg">
                                <div className="flex items-center gap-2 p-3 hover:bg-muted/50">
                                  <Checkbox
                                    checked={allSelected}
                                    className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
                                    onCheckedChange={() => handleSelectAllModulePermissions(module.id, module.permissions)}
                                  />
                                  <button
                                    className="flex-1 flex items-center justify-between"
                                    onClick={() => handleToggleModuleExpand(module.id)}
                                  >
                                    <span className="font-medium">{module.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        {module.permissions.filter(p => selectedPermissions.has(p.id)).length}/{module.permissions.length}
                                      </span>
                                      {expandedModules.has(module.id) ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </div>
                                  </button>
                                </div>
                                {expandedModules.has(module.id) && (
                                  <div className="px-3 pb-3 space-y-2 ml-6">
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
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold">Mẫu vai trò định sẵn</h3>
                <Badge variant="secondary">{roleTemplates.length} mẫu</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => initializeTemplatesMutation.mutate()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Khởi tạo mẫu mặc định
                </Button>
                <Button onClick={() => { resetTemplateForm(); setTemplateDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo mẫu mới
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roleTemplates.map((template) => {
                const permIds = JSON.parse(template.permissionIds || "[]");
                const categoryColors: Record<string, string> = {
                  production: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                  quality: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                  maintenance: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
                  management: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                  system: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                };
                const categoryLabels: Record<string, string> = {
                  production: "Sản xuất",
                  quality: "Chất lượng",
                  maintenance: "Bảo trì",
                  management: "Quản lý",
                  system: "Hệ thống",
                };
                return (
                  <Card key={template.id} className="relative">
                    {template.isDefault === 1 && (
                      <Badge className="absolute top-2 right-2" variant="secondary">Mặc định</Badge>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className={categoryColors[template.category]}>
                            {categoryLabels[template.category]}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{permIds.length} quyền</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Sửa
                          </Button>
                          {template.isDefault === 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteTemplateMutation.mutate({ id: template.id })}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Xóa
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {roleTemplates.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">Chưa có mẫu vai trò nào. Click "Khởi tạo mẫu mặc định" để tạo các mẫu cơ bản.</p>
              </Card>
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

        {/* Copy Permissions Dialog */}
        <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sao chép quyền từ vai trò khác</DialogTitle>
              <DialogDescription>
                Chọn vai trò nguồn để sao chép quyền sang vai trò hiện tại.
                Lưu ý: Quyền hiện tại sẽ bị ghi đè hoàn toàn.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vai trò đích</Label>
                <Input
                  value={roles.find(r => r.id === selectedRoleId)?.name || ""}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Sao chép quyền từ</Label>
                <Select
                  value={sourceRoleId?.toString() || ""}
                  onValueChange={(v) => setSourceRoleId(v ? Number(v) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò nguồn" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles
                      .filter(r => r.id !== selectedRoleId)
                      .map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Cảnh báo:</strong> Tất cả quyền hiện tại của vai trò "{roles.find(r => r.id === selectedRoleId)?.name}" sẽ bị thay thế bằng quyền của vai trò nguồn.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCopyDialogOpen(false); setSourceRoleId(null); }}>Hủy</Button>
              <Button onClick={handleCopyPermissions} disabled={!sourceRoleId}>
                <Copy className="w-4 h-4 mr-2" />
                Sao chép quyền
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Apply Template Dialog */}
        <Dialog open={applyTemplateDialogOpen} onOpenChange={setApplyTemplateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Áp dụng mẫu vai trò</DialogTitle>
              <DialogDescription>
                Chọn mẫu để áp dụng quyền cho vai trò "{roles.find(r => r.id === selectedRoleId)?.name}".
                Lưu ý: Quyền hiện tại sẽ bị ghi đè hoàn toàn.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Chọn mẫu vai trò</Label>
                <Select
                  value={selectedTemplateId?.toString() || ""}
                  onValueChange={(v) => setSelectedTemplateId(v ? Number(v) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mẫu" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name} ({JSON.parse(template.permissionIds || "[]").length} quyền)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTemplateId && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm">
                    <strong>Mô tả:</strong> {roleTemplates.find(t => t.id === selectedTemplateId)?.description || "Không có mô tả"}
                  </p>
                </div>
              )}
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Cảnh báo:</strong> Tất cả quyền hiện tại của vai trò sẽ bị thay thế bằng quyền của mẫu.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setApplyTemplateDialogOpen(false); setSelectedTemplateId(null); }}>Hủy</Button>
              <Button onClick={handleApplyTemplate} disabled={!selectedTemplateId}>
                <Package className="w-4 h-4 mr-2" />
                Áp dụng mẫu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Chỉnh sửa mẫu vai trò" : "Tạo mẫu vai trò mới"}</DialogTitle>
              <DialogDescription>
                Cấu hình thông tin và chọn quyền cho mẫu vai trò
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 flex-1 overflow-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã mẫu</Label>
                  <Input
                    value={templateForm.code}
                    onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value })}
                    placeholder="custom_role"
                    disabled={!!editingTemplate}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên mẫu</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="Vai trò tùy chỉnh"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Input
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Mô tả chi tiết về mẫu vai trò"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phân loại</Label>
                  <Select
                    value={templateForm.category}
                    onValueChange={(v) => setTemplateForm({ ...templateForm, category: v as typeof templateForm.category })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Sản xuất</SelectItem>
                      <SelectItem value="quality">Chất lượng</SelectItem>
                      <SelectItem value="maintenance">Bảo trì</SelectItem>
                      <SelectItem value="management">Quản lý</SelectItem>
                      <SelectItem value="system">Hệ thống</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Permission Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Chọn quyền cho mẫu ({templateForm.permissionIds.length} quyền)</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allIds = permissions.map(p => p.id);
                        setTemplateForm({ ...templateForm, permissionIds: allIds });
                      }}
                    >
                      Chọn tất cả
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTemplateForm({ ...templateForm, permissionIds: [] })}
                    >
                      Bỏ chọn tất cả
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-lg p-3 max-h-[300px] overflow-auto">
                  {modulesWithPermissions && SYSTEM_TYPES.map((systemType) => {
                    const systemModules = modulesWithPermissions[systemType.value as keyof typeof modulesWithPermissions] || [];
                    if (systemModules.length === 0) return null;
                    
                    return (
                      <div key={systemType.value} className="mb-4 last:mb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded ${systemType.color}`}>
                            <systemType.icon className="w-3 h-3 text-white" />
                          </div>
                          <span className="font-medium text-sm">{systemType.label}</span>
                        </div>
                        <div className="space-y-2 ml-6">
                          {systemModules.map((module: ModuleWithPermissions) => {
                            const modulePermIds = module.permissions.map(p => p.id);
                            const allSelected = modulePermIds.length > 0 && modulePermIds.every(id => templateForm.permissionIds.includes(id));
                            const someSelected = modulePermIds.some(id => templateForm.permissionIds.includes(id));
                            
                            return (
                              <div key={module.id} className="border rounded p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <Checkbox
                                    checked={allSelected}
                                    className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
                                    onCheckedChange={() => {
                                      let newIds = [...templateForm.permissionIds];
                                      if (allSelected) {
                                        newIds = newIds.filter(id => !modulePermIds.includes(id));
                                      } else {
                                        modulePermIds.forEach(id => {
                                          if (!newIds.includes(id)) newIds.push(id);
                                        });
                                      }
                                      setTemplateForm({ ...templateForm, permissionIds: newIds });
                                    }}
                                  />
                                  <span className="font-medium text-sm">{module.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({modulePermIds.filter(id => templateForm.permissionIds.includes(id)).length}/{modulePermIds.length})
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2 ml-6">
                                  {module.permissions.map((perm) => (
                                    <label key={perm.id} className="flex items-center gap-1 text-xs cursor-pointer">
                                      <Checkbox
                                        checked={templateForm.permissionIds.includes(perm.id)}
                                        onCheckedChange={() => {
                                          const newIds = templateForm.permissionIds.includes(perm.id)
                                            ? templateForm.permissionIds.filter(id => id !== perm.id)
                                            : [...templateForm.permissionIds, perm.id];
                                          setTemplateForm({ ...templateForm, permissionIds: newIds });
                                        }}
                                        className="w-3 h-3"
                                      />
                                      <span>{perm.name}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSaveTemplate} disabled={!templateForm.code || !templateForm.name}>
                {editingTemplate ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
