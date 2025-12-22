import { useState, useCallback, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { 
  Users, 
  Shield, 
  UserPlus,
  Pencil,
  Loader2,
  Search,
  CheckSquare,
  UserCog,
  RefreshCw
} from "lucide-react";

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkRole, setBulkRole] = useState<"user" | "manager" | "admin">("user");
  
  // Cursor pagination state
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSize = 20;

  // Fetch users with cursor pagination
  const { data: paginatedData, isLoading, refetch } = trpc.user.listWithCursor.useQuery({
    cursor,
    limit: pageSize,
    direction: 'forward',
  });

  // Also fetch all users for stats (lightweight query)
  const { data: allUsersStats } = trpc.user.list.useQuery();

  // Update allUsers when data changes
  useEffect(() => {
    if (paginatedData?.items) {
      if (!cursor) {
        // First load - replace all
        setAllUsers(paginatedData.items);
      } else if (isLoadingMore) {
        // Loading more - append
        setAllUsers(prev => {
          const existingIds = new Set(prev.map(u => u.id));
          const newItems = paginatedData.items.filter(u => !existingIds.has(u.id));
          return [...prev, ...newItems];
        });
        setIsLoadingMore(false);
      }
    }
  }, [paginatedData, cursor, isLoadingMore]);

  // Update user role mutation
  const updateRoleMutation = trpc.user.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật quyền người dùng thành công");
      handleRefresh();
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Bulk update role mutation
  const bulkUpdateRoleMutation = trpc.user.bulkUpdateRole.useMutation({
    onSuccess: (result) => {
      toast.success(`Đã cập nhật vai trò cho ${result.updated} người dùng`);
      handleRefresh();
      setIsBulkDialogOpen(false);
      setSelectedUsers([]);
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  // Filter users by search term
  const filteredUsers = allUsers?.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleUpdateRole = () => {
    if (!editingUser) return;
    updateRoleMutation.mutate({
      userId: editingUser.id,
      role: editingUser.role,
    });
  };

  const handleBulkUpdateRole = () => {
    if (selectedUsers.length === 0) return;
    bulkUpdateRoleMutation.mutate({
      userIds: selectedUsers,
      role: bulkRole,
    });
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (!filteredUsers) return;
    const selectableUsers = filteredUsers.filter(u => u.id !== currentUser?.id);
    if (selectedUsers.length === selectableUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(selectableUsers.map(u => u.id));
    }
  };

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (paginatedData?.nextCursor && !isLoading && !isLoadingMore) {
      setIsLoadingMore(true);
      setCursor(paginatedData.nextCursor);
    }
  }, [paginatedData?.nextCursor, isLoading, isLoadingMore]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setAllUsers([]);
    setCursor(undefined);
    setIsLoadingMore(false);
    refetch();
  }, [refetch]);

  // Check if current user is admin
  if (currentUser?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-5 w-5" />
                Không có quyền truy cập
              </CardTitle>
              <CardDescription>
                Bạn cần quyền Admin để truy cập trang này
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý người dùng</h1>
            <p className="text-muted-foreground mt-1">
              Quản lý tài khoản và phân quyền người dùng
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng người dùng</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paginatedData?.totalCount || allUsersStats?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allUsersStats?.filter(u => u.role === "admin").length || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card rounded-xl border border-border/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allUsersStats?.filter(u => u.role === "user").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-card rounded-xl border border-border/50 shadow-md">
          <CardHeader>
            <CardTitle>Danh sách người dùng</CardTitle>
            <CardDescription>
              Tìm kiếm và quản lý quyền người dùng • Đang hiển thị {filteredUsers?.length || 0} / {paginatedData?.totalCount || 0} người dùng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên hoặc email..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Đã chọn {selectedUsers.length} người dùng</span>
                  <Button size="sm" onClick={() => setIsBulkDialogOpen(true)}>
                    <UserCog className="h-4 w-4 mr-1" />
                    Gán vai trò
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>
                    Bỏ chọn
                  </Button>
                </div>
              )}
            </div>

            {isLoading && allUsers.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <Checkbox
                          checked={filteredUsers && filteredUsers.filter(u => u.id !== currentUser?.id).length > 0 && 
                            filteredUsers.filter(u => u.id !== currentUser?.id).every(u => selectedUsers.includes(u.id))}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">Tên</th>
                      <th className="px-4 py-3 text-left font-semibold">Email</th>
                      <th className="px-4 py-3 text-left font-semibold">Quyền</th>
                      <th className="px-4 py-3 text-left font-semibold">Đăng nhập gần nhất</th>
                      <th className="px-4 py-3 text-left font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers?.map((user) => (
                      <tr key={user.id} className={`border-b hover:bg-muted/30 ${selectedUsers.includes(user.id) ? 'bg-primary/5' : ''}`}>
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                            disabled={user.id === currentUser?.id}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {user.name?.charAt(0).toUpperCase() || "U"}
                              </span>
                            </div>
                            <span className="font-medium">{user.name || "Chưa đặt tên"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {user.email || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === "admin" 
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
                              : user.role === "manager"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {user.role === "admin" ? "Admin" : user.role === "manager" ? "Manager" : "User"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {user.lastSignedIn 
                            ? new Date(user.lastSignedIn).toLocaleString("vi-VN")
                            : "N/A"
                          }
                        </td>
                        <td className="px-4 py-3">
                          <Dialog open={isEditDialogOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                            setIsEditDialogOpen(open);
                            if (!open) setEditingUser(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingUser({ ...user })}
                                disabled={user.id === currentUser?.id}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Chỉnh sửa quyền người dùng</DialogTitle>
                                <DialogDescription>
                                  Thay đổi quyền truy cập cho {editingUser?.name || editingUser?.email}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Quyền</Label>
                                  <Select 
                                    value={editingUser?.role} 
                                    onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User - Người dùng cơ bản</SelectItem>
                                      <SelectItem value="manager">Manager - Quản lý</SelectItem>
                                      <SelectItem value="admin">Admin - Quản trị viên</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                  Hủy
                                </Button>
                                <Button 
                                  onClick={handleUpdateRole}
                                  disabled={updateRoleMutation.isPending}
                                >
                                  {updateRoleMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : null}
                                  Lưu
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Load More Button */}
                <LoadMoreButton
                  hasMore={paginatedData?.hasMore ?? false}
                  isLoading={isLoadingMore}
                  onLoadMore={handleLoadMore}
                  onRefresh={handleRefresh}
                  totalCount={paginatedData?.totalCount}
                  loadedCount={allUsers.length}
                  showRefresh={false}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Assign Role Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gán vai trò hàng loạt</DialogTitle>
            <DialogDescription>
              Gán vai trò cho {selectedUsers.length} người dùng đã chọn
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Chọn vai trò</Label>
            <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as "user" | "manager" | "admin")}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Người dùng</SelectItem>
                <SelectItem value="manager">Quản lý</SelectItem>
                <SelectItem value="admin">Quản trị viên</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-4">
              Lưu ý: Thao tác này sẽ thay đổi vai trò của tất cả người dùng đã chọn.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleBulkUpdateRole}
              disabled={bulkUpdateRoleMutation.isPending}
            >
              {bulkUpdateRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Áp dụng cho {selectedUsers.length} người dùng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
