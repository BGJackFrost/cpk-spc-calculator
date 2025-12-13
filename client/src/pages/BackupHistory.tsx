import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Clock,
  Calendar,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  RotateCcw,
  FileJson,
  AlertTriangle,
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
  createdAt: string;
  completedAt: string | null;
}

interface BackupStats {
  total: number;
  daily: number;
  weekly: number;
  manual: number;
  lastBackup: string | null;
  totalSize: number;
  schedulerRunning: boolean;
}

interface BackupConfig {
  dailyEnabled: boolean;
  dailySchedule: string;
  weeklyEnabled: boolean;
  weeklySchedule: string;
  maxBackupsToKeep: number;
  retentionDays: number;
}

interface SchedulerStatus {
  running: boolean;
  dailyEnabled: boolean;
  dailySchedule: string;
  weeklyEnabled: boolean;
  weeklySchedule: string;
}

export default function BackupHistory() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [restoreId, setRestoreId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState<unknown>(null);
  const [importValidation, setImportValidation] = useState<{valid: boolean; errors: string[]; sections: string[]} | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [backups, setBackups] = useState<Backup[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [backupConfig, setBackupConfig] = useState<BackupConfig | null>(null);
  const [exportPreview, setExportPreview] = useState<{sections: {name: string; count: number; description: string}[]} | null>(null);
  const [exportPreviewLoading, setExportPreviewLoading] = useState(true);
  const [exportPreviewError, setExportPreviewError] = useState<string | null>(null);

  const pageSize = 20;

  // Fetch functions
  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const params = { page, pageSize, type: typeFilter === "all" ? undefined : typeFilter };
      const response = await fetch(`/api/trpc/backup.list?input=${encodeURIComponent(JSON.stringify(params))}`);
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
      const response = await fetch('/api/trpc/backup.stats');
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
      const response = await fetch('/api/trpc/backup.schedulerStatus');
      const data = await response.json();
      if (data.result?.data) {
        setSchedulerStatus(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching scheduler status:", error);
    }
  };

  const fetchBackupConfig = async () => {
    try {
      const response = await fetch('/api/trpc/backup.getConfig');
      const data = await response.json();
      if (data.result?.data) {
        setBackupConfig(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching backup config:", error);
    }
  };

  const fetchExportPreview = async () => {
    setExportPreviewLoading(true);
    setExportPreviewError(null);
    try {
      const response = await fetch('/api/trpc/settingsExport.preview');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.result?.data) {
        setExportPreview(data.result.data);
      } else if (data.error) {
        throw new Error(data.error.message || 'Lỗi tải dữ liệu preview');
      }
    } catch (error) {
      console.error("Error fetching export preview:", error);
      setExportPreviewError(error instanceof Error ? error.message : 'Không thể tải dữ liệu preview');
    } finally {
      setExportPreviewLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchStats();
    fetchSchedulerStatus();
    fetchBackupConfig();
    fetchExportPreview();
  }, [page, typeFilter]);

  // Action handlers
  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/trpc/backup.create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Lỗi tạo backup");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBackup = async (id: number) => {
    try {
      const response = await fetch('/api/trpc/backup.delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Lỗi xóa backup");
    }
  };

  const handleRestore = async () => {
    if (!restoreId) return;
    setIsRestoring(true);
    try {
      const response = await fetch('/api/trpc/backup.restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: restoreId }),
      });
      const data = await response.json();
      if (data.result?.data?.success) {
        toast.success("Đã khôi phục database thành công");
        setRestoreId(null);
        fetchBackups();
      } else {
        throw new Error(data.error?.message || "Lỗi khôi phục");
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Lỗi khôi phục");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleToggleSchedule = async (type: "daily" | "weekly", enabled: boolean) => {
    try {
      const response = await fetch('/api/trpc/backup.toggleSchedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, enabled }),
      });
      const data = await response.json();
      if (data.result?.data?.success) {
        toast.success("Đã cập nhật lịch backup");
        fetchBackupConfig();
        fetchSchedulerStatus();
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Lỗi cập nhật lịch");
    }
  };

  const handleSaveConfig = async (config: Partial<BackupConfig>) => {
    try {
      const response = await fetch('/api/trpc/backup.saveConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (data.result?.data?.success) {
        toast.success("Đã lưu cấu hình backup");
        fetchBackupConfig();
        fetchSchedulerStatus();
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Lỗi lưu cấu hình");
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/trpc/settingsExport.export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeSystemConfig: true,
          includeCompanyInfo: true,
          includeAlertSettings: true,
          includeMasterData: true,
          includeMappings: true,
        }),
      });
      const data = await response.json();
      if (data.result?.data?.url) {
        window.open(data.result.data.url, '_blank');
        toast.success('Đã xuất cấu hình thành công');
      }
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Lỗi xuất cấu hình');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setImportData(data);
      
      const response = await fetch('/api/trpc/settingsExport.validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const result = await response.json();
      setImportValidation(result.result?.data || { valid: false, errors: ['Lỗi kiểm tra file'], sections: [] });
      setShowImportDialog(true);
    } catch {
      toast.error("File không hợp lệ. Vui lòng chọn file JSON đã xuất từ hệ thống.");
    }
  };

  const handleImport = async () => {
    if (!importData) return;
    setIsImporting(true);
    try {
      const response = await fetch('/api/trpc/settingsExport.import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: importData, overwrite: false }),
      });
      const result = await response.json();
      if (result.result?.data?.success) {
        toast.success(`Đã nhập ${result.result.data.imported.length} phần thành công`);
      } else {
        toast.error(`Có lỗi khi nhập`);
      }
      setShowImportDialog(false);
      setImportData(null);
      setImportValidation(null);
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || 'Lỗi nhập cấu hình');
    } finally {
      setIsImporting(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: string | null) => {
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
              Backup & Khôi phục
            </h1>
            <p className="text-muted-foreground mt-1">
              Quản lý backup database và cấu hình hệ thống
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowConfigDialog(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Cấu hình
            </Button>
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

        <Tabs defaultValue="backups">
          <TabsList>
            <TabsTrigger value="backups">Database Backup</TabsTrigger>
            <TabsTrigger value="settings">Export/Import Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="backups" className="space-y-6">
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
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${schedulerStatus?.running ? "bg-green-500" : "bg-red-500"}`} />
                    <span>{schedulerStatus?.running ? "Đang hoạt động" : "Đã dừng"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={backupConfig?.dailyEnabled || false}
                      onCheckedChange={(checked) => handleToggleSchedule("daily", checked)}
                    />
                    <span className="text-muted-foreground">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Hàng ngày: 2:00 AM
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={backupConfig?.weeklyEnabled || false}
                      onCheckedChange={(checked) => handleToggleSchedule("weekly", checked)}
                    />
                    <span className="text-muted-foreground">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Hàng tuần: CN 3:00 AM
                    </span>
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
                    <SelectTrigger className="w-40">
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
                    <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Chưa có backup nào</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên file</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Kích thước</TableHead>
                        <TableHead>Ngày tạo</TableHead>
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
                          <TableCell>{formatDate(backup.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {backup.status === "completed" && (
                                <>
                                  {backup.fileUrl && (
                                    <Button variant="ghost" size="sm" asChild>
                                      <a href={backup.fileUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRestoreId(backup.id)}
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(backup.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Pagination */}
                {total > pageSize && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} / {total}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page * pageSize >= total}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Export Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Xuất Cấu hình
                  </CardTitle>
                  <CardDescription>
                    Xuất toàn bộ cấu hình hệ thống ra file JSON
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Bao gồm: Cấu hình hệ thống, thông tin công ty, cài đặt cảnh báo, 
                    danh sách sản phẩm, dây chuyền, máy móc, và mapping.
                  </div>
                  
                  {/* Loading State */}
                  {exportPreviewLoading && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Dữ liệu sẽ xuất:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="flex justify-between items-center">
                            <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
                            <div className="h-5 bg-muted rounded animate-pulse w-8"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Error State */}
                  {!exportPreviewLoading && exportPreviewError && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-destructive">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm">{exportPreviewError}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchExportPreview}
                        className="w-full"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Thử lại
                      </Button>
                    </div>
                  )}
                  
                  {/* Success State */}
                  {!exportPreviewLoading && !exportPreviewError && exportPreview && exportPreview.sections && exportPreview.sections.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Dữ liệu sẽ xuất:</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={fetchExportPreview}
                          className="h-6 px-2"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {exportPreview.sections.slice(0, 6).map((s) => (
                          <div key={s.name} className="flex justify-between">
                            <span>{s.description}</span>
                            <Badge variant="secondary">{s.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Empty State */}
                  {!exportPreviewLoading && !exportPreviewError && (!exportPreview || !exportPreview.sections || exportPreview.sections.length === 0) && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Không có dữ liệu để xuất</p>
                    </div>
                  )}
                  
                  <Button onClick={handleExport} disabled={isExporting || exportPreviewLoading} className="w-full">
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileJson className="w-4 h-4 mr-2" />
                    )}
                    Xuất Cấu hình
                  </Button>
                </CardContent>
              </Card>

              {/* Import Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Nhập Cấu hình
                  </CardTitle>
                  <CardDescription>
                    Nhập cấu hình từ file JSON đã xuất trước đó
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Chọn file JSON chứa cấu hình đã xuất từ hệ thống. 
                    Dữ liệu mới sẽ được thêm vào, không ghi đè dữ liệu hiện có.
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Chọn file JSON
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

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
              <AlertDialogAction onClick={() => deleteId && handleDeleteBackup(deleteId)}>
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Restore Confirmation Dialog */}
        <AlertDialog open={restoreId !== null} onOpenChange={() => setRestoreId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Xác nhận khôi phục database
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Bạn có chắc chắn muốn khôi phục database từ backup này?</p>
                <p className="text-yellow-600 font-medium">
                  Cảnh báo: Dữ liệu hiện tại sẽ được backup trước khi khôi phục.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
                {isRestoring ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                Khôi phục
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Config Dialog */}
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cấu hình Backup</DialogTitle>
              <DialogDescription>
                Thiết lập lịch backup tự động và chính sách lưu trữ
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Backup hàng ngày</Label>
                <Switch
                  checked={backupConfig?.dailyEnabled || false}
                  onCheckedChange={(checked) => handleSaveConfig({ dailyEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Backup hàng tuần</Label>
                <Switch
                  checked={backupConfig?.weeklyEnabled || false}
                  onCheckedChange={(checked) => handleSaveConfig({ weeklyEnabled: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>Số backup tối đa giữ lại</Label>
                <Input
                  type="number"
                  value={backupConfig?.maxBackupsToKeep || 30}
                  onChange={(e) => handleSaveConfig({ maxBackupsToKeep: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Thời gian lưu trữ (ngày)</Label>
                <Input
                  type="number"
                  value={backupConfig?.retentionDays || 90}
                  onChange={(e) => handleSaveConfig({ retentionDays: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận nhập cấu hình</DialogTitle>
              <DialogDescription>
                Kiểm tra dữ liệu trước khi nhập
              </DialogDescription>
            </DialogHeader>
            {importValidation && (
              <div className="space-y-4">
                {importValidation.valid ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span>File hợp lệ</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-5 h-5" />
                      <span>File không hợp lệ</span>
                    </div>
                    <ul className="text-sm text-red-600 list-disc pl-5">
                      {importValidation.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {importValidation.sections.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Các phần sẽ được nhập:</p>
                    <div className="flex flex-wrap gap-2">
                      {importValidation.sections.map((section) => (
                        <Badge key={section} variant="secondary">{section}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importValidation?.valid || isImporting}
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Nhập
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
