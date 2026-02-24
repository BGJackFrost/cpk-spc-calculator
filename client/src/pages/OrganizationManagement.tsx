import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Building2, Users, Briefcase, UserCog, Plus, Pencil, Trash2, 
  Save, Loader2, Search, ChevronRight, Shield
} from "lucide-react";

// Types
interface Company {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxCode?: string | null;
  isActive: number;
}

interface Department {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description?: string | null;
  parentId?: number | null;
  isActive: number;
}

interface Team {
  id: number;
  departmentId: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: number;
}

interface Position {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  level: number;
  canApprove: number;
  approvalLimit?: string | null;
  isActive: number;
}

interface EmployeeProfile {
  id: number;
  userId: number;
  userType: string;
  employeeCode?: string | null;
  companyId?: number | null;
  departmentId?: number | null;
  teamId?: number | null;
  positionId?: number | null;
  managerId?: number | null;
  phone?: string | null;
  address?: string | null;
}

interface User {
  id: number;
  name: string;
  email?: string | null;
  role: string;
  isActive: number;
}

export default function OrganizationManagement() {
  const [activeTab, setActiveTab] = useState("companies");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Company state
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [companyForm, setCompanyForm] = useState({
    code: "",
    name: "",
    address: "",
    phone: "",
    email: "",
    taxCode: "",
  });

  // Department state
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [deptForm, setDeptForm] = useState({
    companyId: "",
    code: "",
    name: "",
    description: "",
    parentId: "",
  });

  // Team state
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [teamForm, setTeamForm] = useState({
    departmentId: "",
    code: "",
    name: "",
    description: "",
  });

  // Position state
  const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<any>(null);
  const [positionForm, setPositionForm] = useState({
    code: "",
    name: "",
    description: "",
    level: "5",
    canApprove: false,
    approvalLimit: "",
  });

  // Employee Profile state
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [employeeForm, setEmployeeForm] = useState({
    userId: "",
    userType: "local",
    employeeCode: "",
    companyId: "",
    departmentId: "",
    teamId: "",
    positionId: "",
    managerId: "",
    phone: "",
    address: "",
  });

  // Queries
  const { data: companies, isLoading: loadingCompanies, refetch: refetchCompanies } = 
    trpc.organization.listCompanies.useQuery();
  const { data: departments, isLoading: loadingDepts, refetch: refetchDepts } = 
    trpc.organization.listDepartments.useQuery();
  const { data: teams, isLoading: loadingTeams, refetch: refetchTeams } = 
    trpc.organization.listTeams.useQuery();
  const { data: positions, isLoading: loadingPositions, refetch: refetchPositions } = 
    trpc.organization.listPositions.useQuery();
  const { data: employeeProfiles, isLoading: loadingEmployees, refetch: refetchEmployees } = 
    trpc.organization.listEmployeeProfiles.useQuery();
  const { data: users } = trpc.user.list.useQuery();

  // Mutations
  const createCompanyMutation = trpc.organization.createCompany.useMutation({
    onSuccess: () => {
      toast.success("Tạo công ty thành công");
      refetchCompanies();
      setIsCompanyDialogOpen(false);
      resetCompanyForm();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateCompanyMutation = trpc.organization.updateCompany.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật công ty thành công");
      refetchCompanies();
      setIsCompanyDialogOpen(false);
      setEditingCompany(null);
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const createDeptMutation = trpc.organization.createDepartment.useMutation({
    onSuccess: () => {
      toast.success("Tạo phòng ban thành công");
      refetchDepts();
      setIsDeptDialogOpen(false);
      resetDeptForm();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateDeptMutation = trpc.organization.updateDepartment.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật phòng ban thành công");
      refetchDepts();
      setIsDeptDialogOpen(false);
      setEditingDept(null);
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const createTeamMutation = trpc.organization.createTeam.useMutation({
    onSuccess: () => {
      toast.success("Tạo nhóm thành công");
      refetchTeams();
      setIsTeamDialogOpen(false);
      resetTeamForm();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateTeamMutation = trpc.organization.updateTeam.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật nhóm thành công");
      refetchTeams();
      setIsTeamDialogOpen(false);
      setEditingTeam(null);
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const createPositionMutation = trpc.organization.createPosition.useMutation({
    onSuccess: () => {
      toast.success("Tạo chức vụ thành công");
      refetchPositions();
      setIsPositionDialogOpen(false);
      resetPositionForm();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const updatePositionMutation = trpc.organization.updatePosition.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật chức vụ thành công");
      refetchPositions();
      setIsPositionDialogOpen(false);
      setEditingPosition(null);
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const upsertEmployeeMutation = trpc.organization.upsertEmployeeProfile.useMutation({
    onSuccess: () => {
      toast.success(editingEmployee ? "Cập nhật thông tin nhân viên thành công" : "Gán nhân viên thành công");
      refetchEmployees();
      setIsEmployeeDialogOpen(false);
      setEditingEmployee(null);
      resetEmployeeForm();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  // Reset forms
  const resetCompanyForm = () => setCompanyForm({ code: "", name: "", address: "", phone: "", email: "", taxCode: "" });
  const resetDeptForm = () => setDeptForm({ companyId: "", code: "", name: "", description: "", parentId: "" });
  const resetTeamForm = () => setTeamForm({ departmentId: "", code: "", name: "", description: "" });
  const resetPositionForm = () => setPositionForm({ code: "", name: "", description: "", level: "5", canApprove: false, approvalLimit: "" });
  const resetEmployeeForm = () => setEmployeeForm({ userId: "", userType: "local", employeeCode: "", companyId: "", departmentId: "", teamId: "", positionId: "", managerId: "", phone: "", address: "" });

  // Handlers
  const handleEditCompany = (company: any) => {
    setEditingCompany(company);
    setCompanyForm({
      code: company.code,
      name: company.name,
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      taxCode: company.taxCode || "",
    });
    setIsCompanyDialogOpen(true);
  };

  const handleSaveCompany = () => {
    if (editingCompany) {
      updateCompanyMutation.mutate({ id: editingCompany.id, ...companyForm });
    } else {
      createCompanyMutation.mutate(companyForm);
    }
  };

  const handleEditDept = (dept: any) => {
    setEditingDept(dept);
    setDeptForm({
      companyId: String(dept.companyId),
      code: dept.code,
      name: dept.name,
      description: dept.description || "",
      parentId: dept.parentId ? String(dept.parentId) : "",
    });
    setIsDeptDialogOpen(true);
  };

  const handleSaveDept = () => {
    const data = {
      ...deptForm,
      companyId: Number(deptForm.companyId),
      parentId: deptForm.parentId ? Number(deptForm.parentId) : undefined,
    };
    if (editingDept) {
      updateDeptMutation.mutate({ id: editingDept.id, ...data });
    } else {
      createDeptMutation.mutate(data);
    }
  };

  const handleEditTeam = (team: any) => {
    setEditingTeam(team);
    setTeamForm({
      departmentId: String(team.departmentId),
      code: team.code,
      name: team.name,
      description: team.description || "",
    });
    setIsTeamDialogOpen(true);
  };

  const handleSaveTeam = () => {
    const data = { ...teamForm, departmentId: Number(teamForm.departmentId) };
    if (editingTeam) {
      updateTeamMutation.mutate({ id: editingTeam.id, ...data });
    } else {
      createTeamMutation.mutate(data);
    }
  };

  const handleEditPosition = (position: any) => {
    setEditingPosition(position);
    setPositionForm({
      code: position.code,
      name: position.name,
      description: position.description || "",
      level: String(position.level),
      canApprove: position.canApprove === 1,
      approvalLimit: position.approvalLimit || "",
    });
    setIsPositionDialogOpen(true);
  };

  const handleSavePosition = () => {
    const data = {
      ...positionForm,
      level: Number(positionForm.level),
      canApprove: positionForm.canApprove,
      approvalLimit: positionForm.approvalLimit ? Number(positionForm.approvalLimit) : undefined,
    };
    if (editingPosition) {
      updatePositionMutation.mutate({ id: editingPosition.id, ...data });
    } else {
      createPositionMutation.mutate(data);
    }
  };

  const handleEditEmployee = (profile: EmployeeProfile) => {
    setEditingEmployee(profile);
    setEmployeeForm({
      userId: String(profile.userId),
      userType: profile.userType,
      employeeCode: profile.employeeCode || "",
      companyId: profile.companyId ? String(profile.companyId) : "",
      departmentId: profile.departmentId ? String(profile.departmentId) : "",
      teamId: profile.teamId ? String(profile.teamId) : "",
      positionId: profile.positionId ? String(profile.positionId) : "",
      managerId: profile.managerId ? String(profile.managerId) : "",
      phone: profile.phone || "",
      address: profile.address || "",
    });
    setIsEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = () => {
    if (!employeeForm.userId || employeeForm.userId === "__none__") {
      toast.error("Vui lòng chọn nhân viên");
      return;
    }
    const parseValue = (val: string) => (val && val !== "__none__") ? Number(val) : undefined;
    upsertEmployeeMutation.mutate({
      userId: Number(employeeForm.userId),
      userType: employeeForm.userType as "manus" | "local",
      employeeCode: employeeForm.employeeCode || undefined,
      companyId: parseValue(employeeForm.companyId),
      departmentId: parseValue(employeeForm.departmentId),
      teamId: parseValue(employeeForm.teamId),
      positionId: parseValue(employeeForm.positionId),
      managerId: parseValue(employeeForm.managerId),
      phone: employeeForm.phone || undefined,
      address: employeeForm.address || undefined,
    });
  };

  // Helper functions
  const getCompanyName = (id: number | null | undefined) => companies?.find((c: Company) => c.id === id)?.name || "-";
  const getDeptName = (id: number | null | undefined) => departments?.find((d: Department) => d.id === id)?.name || "-";
  const getTeamName = (id: number | null | undefined) => teams?.find((t: Team) => t.id === id)?.name || "-";
  const getPositionName = (id: number | null | undefined) => positions?.find((p: Position) => p.id === id)?.name || "-";
  const getUserName = (id: number | null | undefined) => (users as User[] | undefined)?.find((u: User) => u.id === id)?.name || "-";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Cấu trúc Tổ chức</h1>
            <p className="text-muted-foreground">Công ty, Phòng ban, Nhóm và Chức vụ</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Công ty</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companies?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phòng ban</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nhóm/Tổ</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teams?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chức vụ</CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{positions?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="companies">
              <Building2 className="h-4 w-4 mr-2" />
              Công ty
            </TabsTrigger>
            <TabsTrigger value="departments">
              <Users className="h-4 w-4 mr-2" />
              Phòng ban
            </TabsTrigger>
            <TabsTrigger value="teams">
              <Briefcase className="h-4 w-4 mr-2" />
              Nhóm/Tổ
            </TabsTrigger>
            <TabsTrigger value="positions">
              <UserCog className="h-4 w-4 mr-2" />
              Chức vụ
            </TabsTrigger>
            <TabsTrigger value="employees">
              <Users className="h-4 w-4 mr-2" />
              Nhân viên
            </TabsTrigger>
          </TabsList>

          {/* Companies Tab */}
          <TabsContent value="companies">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh sách Công ty</CardTitle>
                  <CardDescription>Quản lý thông tin công ty trong hệ thống</CardDescription>
                </div>
                <Button onClick={() => { resetCompanyForm(); setEditingCompany(null); setIsCompanyDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Công ty
                </Button>
              </CardHeader>
              <CardContent>
                {loadingCompanies ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã</TableHead>
                        <TableHead>Tên công ty</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Điện thoại</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies?.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-mono">{company.code}</TableCell>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell>{company.email || "-"}</TableCell>
                          <TableCell>{company.phone || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={company.isActive ? "default" : "secondary"}>
                              {company.isActive ? "Hoạt động" : "Ngừng"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleEditCompany(company)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!companies || companies.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Chưa có công ty nào
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh sách Phòng ban</CardTitle>
                  <CardDescription>Quản lý phòng ban theo công ty</CardDescription>
                </div>
                <Button onClick={() => { resetDeptForm(); setEditingDept(null); setIsDeptDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Phòng ban
                </Button>
              </CardHeader>
              <CardContent>
                {loadingDepts ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã</TableHead>
                        <TableHead>Tên phòng ban</TableHead>
                        <TableHead>Công ty</TableHead>
                        <TableHead>Phòng ban cha</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments?.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-mono">{dept.code}</TableCell>
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell>{companies?.find(c => c.id === dept.companyId)?.name || "-"}</TableCell>
                          <TableCell>{departments?.find(d => d.id === dept.parentId)?.name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={dept.isActive ? "default" : "secondary"}>
                              {dept.isActive ? "Hoạt động" : "Ngừng"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleEditDept(dept)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!departments || departments.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Chưa có phòng ban nào
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh sách Nhóm/Tổ</CardTitle>
                  <CardDescription>Quản lý nhóm theo phòng ban</CardDescription>
                </div>
                <Button onClick={() => { resetTeamForm(); setEditingTeam(null); setIsTeamDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Nhóm
                </Button>
              </CardHeader>
              <CardContent>
                {loadingTeams ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã</TableHead>
                        <TableHead>Tên nhóm</TableHead>
                        <TableHead>Phòng ban</TableHead>
                        <TableHead>Mô tả</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams?.map((team) => (
                        <TableRow key={team.id}>
                          <TableCell className="font-mono">{team.code}</TableCell>
                          <TableCell className="font-medium">{team.name}</TableCell>
                          <TableCell>{departments?.find(d => d.id === team.departmentId)?.name || "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{team.description || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={team.isActive ? "default" : "secondary"}>
                              {team.isActive ? "Hoạt động" : "Ngừng"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleEditTeam(team)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!teams || teams.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Chưa có nhóm nào
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Positions Tab */}
          <TabsContent value="positions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh sách Chức vụ</CardTitle>
                  <CardDescription>Quản lý chức vụ và quyền phê duyệt</CardDescription>
                </div>
                <Button onClick={() => { resetPositionForm(); setEditingPosition(null); setIsPositionDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Chức vụ
                </Button>
              </CardHeader>
              <CardContent>
                {loadingPositions ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã</TableHead>
                        <TableHead>Tên chức vụ</TableHead>
                        <TableHead>Cấp bậc</TableHead>
                        <TableHead>Quyền phê duyệt</TableHead>
                        <TableHead>Hạn mức</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positions?.map((position) => (
                        <TableRow key={position.id}>
                          <TableCell className="font-mono">{position.code}</TableCell>
                          <TableCell className="font-medium">{position.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Cấp {position.level}</Badge>
                          </TableCell>
                          <TableCell>
                            {position.canApprove ? (
                              <Badge className="bg-green-500">
                                <Shield className="h-3 w-3 mr-1" />
                                Có
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Không</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {position.approvalLimit 
                              ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(position.approvalLimit))
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={position.isActive ? "default" : "secondary"}>
                              {position.isActive ? "Hoạt động" : "Ngừng"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleEditPosition(position)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!positions || positions.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Chưa có chức vụ nào
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Quản lý Nhân viên</CardTitle>
                  <CardDescription>Gán nhân viên vào cấu trúc tổ chức</CardDescription>
                </div>
                <Button onClick={() => { resetEmployeeForm(); setEditingEmployee(null); setIsEmployeeDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Gán Nhân viên
                </Button>
              </CardHeader>
              <CardContent>
                {loadingEmployees ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nhân viên</TableHead>
                        <TableHead>Mã NV</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Công ty</TableHead>
                        <TableHead>Phòng ban</TableHead>
                        <TableHead>Nhóm</TableHead>
                        <TableHead>Chức vụ</TableHead>
                        <TableHead>Quản lý</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeProfiles?.map((emp: EmployeeProfile) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{getUserName(emp.userId)}</TableCell>
                          <TableCell>{emp.employeeCode || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={emp.userType === "manus" ? "default" : "secondary"}>
                              {emp.userType === "manus" ? "Manus" : "Local"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getCompanyName(emp.companyId)}</TableCell>
                          <TableCell>{getDeptName(emp.departmentId)}</TableCell>
                          <TableCell>{getTeamName(emp.teamId)}</TableCell>
                          <TableCell>{getPositionName(emp.positionId)}</TableCell>
                          <TableCell>{getUserName(emp.managerId)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditEmployee(emp)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!employeeProfiles || employeeProfiles.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                            Chưa có nhân viên nào được gán vào tổ chức
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Company Dialog */}
        <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCompany ? "Sửa Công ty" : "Thêm Công ty"}</DialogTitle>
              <DialogDescription>Nhập thông tin công ty</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã công ty *</Label>
                  <Input
                    value={companyForm.code}
                    onChange={(e) => setCompanyForm({ ...companyForm, code: e.target.value })}
                    placeholder="VD: COMPANY01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên công ty *</Label>
                  <Input
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    placeholder="Tên công ty"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ</Label>
                <Textarea
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  placeholder="Địa chỉ công ty"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    placeholder="email@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Điện thoại</Label>
                  <Input
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    placeholder="0123456789"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mã số thuế</Label>
                <Input
                  value={companyForm.taxCode}
                  onChange={(e) => setCompanyForm({ ...companyForm, taxCode: e.target.value })}
                  placeholder="Mã số thuế"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSaveCompany} disabled={createCompanyMutation.isPending || updateCompanyMutation.isPending}>
                {(createCompanyMutation.isPending || updateCompanyMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Department Dialog */}
        <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDept ? "Sửa Phòng ban" : "Thêm Phòng ban"}</DialogTitle>
              <DialogDescription>Nhập thông tin phòng ban</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Công ty *</Label>
                <Select value={deptForm.companyId} onValueChange={(v) => setDeptForm({ ...deptForm, companyId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn công ty" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((c: Company) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã phòng ban *</Label>
                  <Input
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    placeholder="VD: DEPT01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên phòng ban *</Label>
                  <Input
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    placeholder="Tên phòng ban"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phòng ban cha</Label>
                <Select value={deptForm.parentId} onValueChange={(v) => setDeptForm({ ...deptForm, parentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phòng ban cha (nếu có)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không có</SelectItem>
                    {departments?.filter((d: Department) => d.companyId === Number(deptForm.companyId)).map((d: Department) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  placeholder="Mô tả phòng ban"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeptDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSaveDept} disabled={createDeptMutation.isPending || updateDeptMutation.isPending}>
                {(createDeptMutation.isPending || updateDeptMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Team Dialog */}
        <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTeam ? "Sửa Nhóm" : "Thêm Nhóm"}</DialogTitle>
              <DialogDescription>Nhập thông tin nhóm/tổ</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Phòng ban *</Label>
                <Select value={teamForm.departmentId} onValueChange={(v) => setTeamForm({ ...teamForm, departmentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phòng ban" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((d: Department) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã nhóm *</Label>
                  <Input
                    value={teamForm.code}
                    onChange={(e) => setTeamForm({ ...teamForm, code: e.target.value })}
                    placeholder="VD: TEAM01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên nhóm *</Label>
                  <Input
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    placeholder="Tên nhóm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={teamForm.description}
                  onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  placeholder="Mô tả nhóm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSaveTeam} disabled={createTeamMutation.isPending || updateTeamMutation.isPending}>
                {(createTeamMutation.isPending || updateTeamMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Position Dialog */}
        <Dialog open={isPositionDialogOpen} onOpenChange={setIsPositionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPosition ? "Sửa Chức vụ" : "Thêm Chức vụ"}</DialogTitle>
              <DialogDescription>Nhập thông tin chức vụ và quyền phê duyệt</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã chức vụ *</Label>
                  <Input
                    value={positionForm.code}
                    onChange={(e) => setPositionForm({ ...positionForm, code: e.target.value })}
                    placeholder="VD: MANAGER"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên chức vụ *</Label>
                  <Input
                    value={positionForm.name}
                    onChange={(e) => setPositionForm({ ...positionForm, name: e.target.value })}
                    placeholder="Tên chức vụ"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cấp bậc (1-10, 1 cao nhất)</Label>
                  <Select value={positionForm.level} onValueChange={(v) => setPositionForm({ ...positionForm, level: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map((l) => (
                        <SelectItem key={l} value={String(l)}>Cấp {l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hạn mức phê duyệt (VND)</Label>
                  <Input
                    type="number"
                    value={positionForm.approvalLimit}
                    onChange={(e) => setPositionForm({ ...positionForm, approvalLimit: e.target.value })}
                    placeholder="0"
                    disabled={!positionForm.canApprove}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={positionForm.canApprove}
                  onCheckedChange={(checked) => setPositionForm({ ...positionForm, canApprove: checked })}
                />
                <Label>Có quyền phê duyệt</Label>
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Textarea
                  value={positionForm.description}
                  onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                  placeholder="Mô tả chức vụ"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPositionDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSavePosition} disabled={createPositionMutation.isPending || updatePositionMutation.isPending}>
                {(createPositionMutation.isPending || updatePositionMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Employee Dialog */}
        <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? "Sửa Thông tin Nhân viên" : "Gán Nhân viên vào Tổ chức"}</DialogTitle>
              <DialogDescription>Chọn nhân viên và gán vào cấu trúc tổ chức</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nhân viên *</Label>
                  <Select value={employeeForm.userId} onValueChange={(v) => setEmployeeForm({ ...employeeForm, userId: v })} disabled={!!editingEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhân viên" />
                    </SelectTrigger>
                    <SelectContent>
                      {(users as User[] | undefined)?.map((u: User) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Loại tài khoản</Label>
                  <Select value={employeeForm.userType} onValueChange={(v) => setEmployeeForm({ ...employeeForm, userType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="manus">Manus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mã nhân viên</Label>
                  <Input
                    value={employeeForm.employeeCode}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employeeCode: e.target.value })}
                    placeholder="VD: NV001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    placeholder="Số điện thoại"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Công ty</Label>
                  <Select value={employeeForm.companyId} onValueChange={(v) => setEmployeeForm({ ...employeeForm, companyId: v, departmentId: "", teamId: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn công ty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Không chọn --</SelectItem>
                      {companies?.map((c: Company) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phòng ban</Label>
                  <Select value={employeeForm.departmentId} onValueChange={(v) => setEmployeeForm({ ...employeeForm, departmentId: v, teamId: "" })} disabled={!employeeForm.companyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phòng ban" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Không chọn --</SelectItem>
                      {departments?.filter((d: Department) => d.companyId === Number(employeeForm.companyId)).map((d: Department) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nhóm/Tổ</Label>
                  <Select value={employeeForm.teamId} onValueChange={(v) => setEmployeeForm({ ...employeeForm, teamId: v })} disabled={!employeeForm.departmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn nhóm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Không chọn --</SelectItem>
                      {teams?.filter((t: Team) => t.departmentId === Number(employeeForm.departmentId)).map((t: Team) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chức vụ</Label>
                  <Select value={employeeForm.positionId} onValueChange={(v) => setEmployeeForm({ ...employeeForm, positionId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chức vụ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Không chọn --</SelectItem>
                      {positions?.map((p: Position) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name} (Cấp {p.level})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quản lý trực tiếp</Label>
                <Select value={employeeForm.managerId} onValueChange={(v) => setEmployeeForm({ ...employeeForm, managerId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn quản lý" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Không có --</SelectItem>
                    {(users as User[] | undefined)?.filter((u: User) => String(u.id) !== employeeForm.userId).map((u: User) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Địa chỉ</Label>
                <Textarea
                  value={employeeForm.address}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                  placeholder="Địa chỉ nhân viên"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEmployeeDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSaveEmployee} disabled={upsertEmployeeMutation.isPending}>
                {upsertEmployeeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
