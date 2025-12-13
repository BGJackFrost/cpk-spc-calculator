import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Database,
  Download,
  RefreshCw,
  Trash2,
  Clock,
  HardDrive,
  Calendar,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface Backup {
  id: number;
  filename: string;
  fileSize: number | null;
  fileUrl: string | null;
  backupType: "daily" | "weekly" | "manual";
  status: "pending" | "completed" | "failed";
  errorMessage: string | null;
  storageLocation: "s3" | "local";
  tablesIncluded: string | null;
  createdBy: number | null;
  createdAt: Date;
  completedAt: Date | null;
}

interface BackupStats {
  total: number;
  daily: number;
  weekly: number;
  manual: number;
  lastBackup: Date | null;
  totalSize: number;
}

interface SchedulerStatus {
  running: boolean;
  dailySchedule: string;
  weeklySchedule: string;
}

export default function BackupHistory() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);

  const pageSize = 20;

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (typeFilter !== "all") {
        params.append("type", typeFilter);
      }
      
      const response = await fetch(`/api/trpc/backup.list?input=${encodeURIComponent(JSON.stringify({ page, pageSize, type: typeFilter === "all" ? undefined : typeFilter }))}`);
      const data = await response.json();
      if (data.result?.data) {
        setBackups(data.result.data.backups || []);
        setTotal(data.result.data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching backups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/trpc/backup.stats`);
      const data = await response.json();
      if (data.result?.data) {
        setStats(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchSchedulerStatus = async () => {
    try {
      const response = await fetch(`/api/trpc/backup.schedulerStatus`);
      const data = await response.json();
      if (data.result?.data) {
        setSchedulerStatus(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching scheduler status:", error);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchStats();
    fetchSchedulerStatus();
  }, [page, typeFilter]);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const response = await fetch(`/api/trpc/backup.create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "manual" }),
      });
      const data = await response.json();
      if (data.result?.data?.success) {
        toast.success("Đã tạo backup thành công");
        fetchBackups();
        fetchStats();
      } else {
        throw new Error(data.error?.message || "Lỗi tạo backup");
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi tạo backup");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBackup = async (id: number) => {
    try {
      const response = await fetch(`/api/trpc/backup.delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (data.result?.data?.success) {
        toast.success("Đã xóa backup");
        setDeleteId(null);
        fetchBackups();
        fetchStats();
      } else {
        throw new Error(data.error?.message || "Lỗi xóa backup");
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi tạo backup");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("vi-VN");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Hoàn thành</Badge>;
      case "pending":
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Đang xử lý</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Thất bại</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "daily":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Hàng ngày</Badge>;
      case "weekly":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Hàng tuần</Badge>;
      case "manual":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Thủ công</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="w-6 h-6" />
              Lịch sử Backup Database
            </h1>
            <p className="text-muted-foreground mt-1">
              Quản lý và khôi phục các bản sao lưu database
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchBackups()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Làm mới
            </Button>
            <Button onClick={handleCreateBackup} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Tạo Backup
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tổng số Backup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Backup hàng ngày</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.daily || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Backup hàng tuần</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats?.weekly || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tổng dung lượng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(stats?.totalSize || 0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Scheduler Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Lịch Backup Tự động
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${schedulerStatus?.running ? "bg-green-500" : "bg-red-500"}`} />
                <span>{schedulerStatus?.running ? "Đang hoạt động" : "Đã dừng"}</span>
              </div>
              <div className="text-muted-foreground">
                <Calendar className="w-4 h-4 inline mr-1" />
                Hàng ngày: 2:00 AM
              </div>
              <div className="text-muted-foreground">
                <Calendar className="w-4 h-4 inline mr-1" />
                Hàng tuần: Chủ nhật 3:00 AM
              </div>
              {stats?.lastBackup && (
                <div className="text-muted-foreground">
                  Backup gần nhất: {formatDate(stats.lastBackup)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Backup List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách Backup</CardTitle>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lọc theo loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="daily">Hàng ngày</SelectItem>
                  <SelectItem value="weekly">Hàng tuần</SelectItem>
                  <SelectItem value="manual">Thủ công</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có backup nào</p>
                <Button variant="outline" className="mt-4" onClick={handleCreateBackup}>
                  Tạo backup đầu tiên
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên file</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Dung lượng</TableHead>
                      <TableHead>Lưu trữ</TableHead>
                      <TableHead>Thời gian tạo</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                        <TableCell>{getTypeBadge(backup.backupType)}</TableCell>
                        <TableCell>{getStatusBadge(backup.status)}</TableCell>
                        <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <HardDrive className="w-3 h-3 mr-1" />
                            {backup.storageLocation.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(backup.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {backup.fileUrl && backup.status === "completed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(backup.fileUrl!, "_blank")}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteId(backup.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {total > pageSize && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Hiển thị {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} / {total}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                      >
                        Trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page * pageSize >= total}
                        onClick={() => setPage(p => p + 1)}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa backup</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa backup này? Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600"
                onClick={() => deleteId && handleDeleteBackup(deleteId)}
              >
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
