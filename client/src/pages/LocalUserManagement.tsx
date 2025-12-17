import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, UserX, UserCheck, Users, Shield, User, RefreshCw } from "lucide-react";

interface LocalUser {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  role: "user" | "manager" | "admin";
}

export default function LocalUserManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LocalUser | null>(null);

  // Form states for add
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"user" | "manager" | "admin">("user");

  // Form states for edit
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"user" | "manager" | "admin">("user");

  const utils = trpc.useUtils();

  const { data: users, isLoading, refetch } = trpc.localAuth.list.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm người dùng mới");
      setIsAddDialogOpen(false);
      resetAddForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Không thể thêm người dùng");
    },
  });

  const updateMutation = trpc.localAuth.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật thông tin người dùng");
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Không thể cập nhật người dùng");
    },
  });

  const deactivateMutation = trpc.localAuth.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Đã vô hiệu hóa tài khoản");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Không thể vô hiệu hóa tài khoản");
    },
  });

  const initAdminMutation = trpc.localAuth.initAdmin.useMutation({
    onSuccess: () => {
      toast.success("Đã khởi tạo tài khoản admin mặc định");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Không thể khởi tạo admin");
    },
  });

  const resetAddForm = () => {
    setAddUsername("");
    setAddPassword("");
    setAddName("");
    setAddEmail("");
    setAddRole("user");
  };

  const handleAdd = () => {
    if (!addUsername || !addPassword) {
      toast.error("Vui lòng nhập tên đăng nhập và mật khẩu");
      return;
    }
    if (addPassword.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    registerMutation.mutate({
      username: addUsername,
      password: addPassword,
      name: addName || undefined,
      email: addEmail || undefined,
    });
  };

  const handleEdit = () => {
    if (!selectedUser) return;
    
    const updates: {
      id: number;
      name?: string;
      email?: string;
      password?: string;
      role?: "user" | "manager" | "admin";
    } = { id: selectedUser.id };

    if (editName !== (selectedUser.name || "")) {
      updates.name = editName;
    }
    if (editEmail !== (selectedUser.email || "")) {
      updates.email = editEmail || undefined;
    }
    if (editPassword) {
      if (editPassword.length < 6) {
        toast.error("Mật khẩu phải có ít nhất 6 ký tự");
        return;
      }
      updates.password = editPassword;
    }
    if (editRole !== selectedUser.role) {
      updates.role = editRole;
    }

    updateMutation.mutate(updates);
  };

  const openEditDialog = (user: LocalUser) => {
    setSelectedUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditPassword("");
    setEditRole(user.role);
    setIsEditDialogOpen(true);
  };

  const handleDeactivate = (user: LocalUser) => {
    if (confirm(`Bạn có chắc muốn vô hiệu hóa tài khoản "${user.username}"?`)) {
      deactivateMutation.mutate({ id: user.id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý Người dùng Local</h1>
            <p className="text-muted-foreground">
              Quản lý tài khoản đăng nhập local cho chế độ offline
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Làm mới
            </Button>
            <Button variant="outline" onClick={() => initAdminMutation.mutate()}>
              <Shield className="mr-2 h-4 w-4" />
              Khởi tạo Admin
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm người dùng
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm người dùng mới</DialogTitle>
                  <DialogDescription>
                    Tạo tài khoản đăng nhập local mới cho hệ thống
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-username">Tên đăng nhập *</Label>
                    <Input
                      id="add-username"
                      placeholder="Nhập tên đăng nhập"
                      value={addUsername}
                      onChange={(e) => setAddUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-password">Mật khẩu *</Label>
                    <Input
                      id="add-password"
                      type="password"
                      placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-name">Họ và tên</Label>
                    <Input
                      id="add-name"
                      placeholder="Nhập họ và tên"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-email">Email</Label>
                    <Input
                      id="add-email"
                      type="email"
                      placeholder="Nhập email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-role">Vai trò</Label>
                    <Select value={addRole} onValueChange={(v) => setAddRole(v as "user" | "manager" | "admin")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn vai trò" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Người dùng</SelectItem>
                        <SelectItem value="manager">Quản lý</SelectItem>
                        <SelectItem value="admin">Quản trị viên</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleAdd} disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang thêm...
                      </>
                    ) : (
                      "Thêm người dùng"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng người dùng</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quản trị viên</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users?.filter((u) => u.role === "admin").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Người dùng thường</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users?.filter((u) => u.role === "user").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách người dùng</CardTitle>
            <CardDescription>
              Tất cả tài khoản đăng nhập local trong hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Chưa có người dùng local nào</p>
                <p className="text-sm">Nhấn "Khởi tạo Admin" để tạo tài khoản admin mặc định</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tên đăng nhập</TableHead>
                    <TableHead>Họ và tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono">{user.id}</TableCell>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.name || "-"}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role === "admin" ? "Quản trị viên" : "Người dùng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(user)}
                            title="Sửa"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeactivate(user)}
                            title="Vô hiệu hóa"
                            className="text-destructive hover:text-destructive"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sửa thông tin người dùng</DialogTitle>
              <DialogDescription>
                Cập nhật thông tin cho tài khoản "{selectedUser?.username}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Họ và tên</Label>
                <Input
                  id="edit-name"
                  placeholder="Nhập họ và tên"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="Nhập email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Mật khẩu mới (để trống nếu không đổi)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Nhập mật khẩu mới"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Vai trò</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as "user" | "manager" | "admin")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Người dùng</SelectItem>
                    <SelectItem value="manager">Quản lý</SelectItem>
                    <SelectItem value="admin">Quản trị viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Hướng dẫn sử dụng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Tài khoản Local</strong> được sử dụng khi triển khai hệ thống offline, 
              không cần kết nối internet.
            </p>
            <p>
              <strong>Tài khoản mặc định:</strong> username <code className="bg-muted px-1 rounded">admin</code>, 
              password <code className="bg-muted px-1 rounded">admin123</code>. 
              Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu.
            </p>
            <p>
              <strong>Vai trò:</strong> Quản trị viên có quyền truy cập tất cả chức năng, 
              Người dùng thường chỉ có quyền xem và phân tích dữ liệu.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
