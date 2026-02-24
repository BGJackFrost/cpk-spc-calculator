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
import { Checkbox } from "@/components/ui/checkbox";
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
  Cloud,
  HardDrive,
  FileCode,
  Copy,
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
  
  // Batch selection state
  const [selectedBackups, setSelectedBackups] = useState<Set<number>>(new Set());
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const [backups, setBackups] = useState<Backup[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [backupConfig, setBackupConfig] = useState<BackupConfig | null>(null);
  const [exportPreview, setExportPreview] = useState<{sections: {name: string; count: number; description: string}[]} | null>(null);
  const [exportPreviewLoading, setExportPreviewLoading] = useState(true);
  const [exportPreviewError, setExportPreviewError] = useState<string | null>(null);

  // S3 Cloud Backup state
  const [s3Backups, setS3Backups] = useState<any[]>([]);
  const [s3Stats, setS3Stats] = useState<any>(null);
  const [isCreatingS3, setIsCreatingS3] = useState(false);
  const [s3Loading, setS3Loading] = useState(false);
  const [restoreScript, setRestoreScript] = useState<{script: string; backup: any} | null>(null);
  const [showRestoreScriptDialog, setShowRestoreScriptDialog] = useState(false);

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

  // S3 Cloud Backup functions
  const fetchS3History = async () => {
    setS3Loading(true);
    try {
      const response = await fetch('/api/trpc/backup.s3History');
      const data = await response.json();
      if (data.result?.data) setS3Backups(data.result.data);
    } catch (error) { console.error('Error fetching S3 history:', error); }
    finally { setS3Loading(false); }
  };

  const fetchS3Stats = async () => {
    try {
      const response = await fetch('/api/trpc/backup.s3Stats');
      const data = await response.json();
      if (data.result?.data) setS3Stats(data.result.data);
    } catch (error) { console.error('Error fetching S3 stats:', error); }
  };

  const handleCreateS3Backup = async () => {
    setIsCreatingS3(true);
    try {
      const response = await fetch('/api/trpc/backup.createS3Backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeSchema: true, includeData: true, retentionDays: 30 }),
      });
      const data = await response.json();
      if (data.result?.data) {
        toast.success(`S3 Backup created: ${data.result.data.fileName || 'success'}`);
        fetchS3History();
        fetchS3Stats();
      } else {
        toast.error(data.error?.message || 'Failed to create S3 backup');
      }
    } catch (error) {
      toast.error('Failed to create S3 backup');
    } finally { setIsCreatingS3(false); }
  };

  const handleGetRestoreScript = async (backupId: string) => {
    try {
      const response = await fetch(`/api/trpc/backup.generateRestoreScript?input=${encodeURIComponent(JSON.stringify({ backupId }))}`);
      const data = await response.json();
      if (data.result?.data) {
        setRestoreScript(data.result.data);
        setShowRestoreScriptDialog(true);
      } else {
        toast.error('Failed to generate restore script');
      }
    } catch (error) { toast.error('Failed to generate restore script'); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
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

  // Batch selection handlers
  const toggleSelectBackup = (id: number) => {
    setSelectedBackups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedBackups.size === backups.length) {
      setSelectedBackups(new Set());
    } else {
      setSelectedBackups(new Set(backups.map(b => b.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedBackups.size === 0) return;
    
    setIsBatchDeleting(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const id of selectedBackups) {
      try {
        const response = await fetch('/api/trpc/backup.delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const data = await response.json();
        if (data.result?.data?.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }
    
    setIsBatchDeleting(false);
    setShowBatchDeleteDialog(false);
    setSelectedBackups(new Set());
    
    if (successCount > 0) {
      toast.success(`Đã xóa ${successCount} backup`);
    }
    if (errorCount > 0) {
      toast.error(`Lỗi xóa ${errorCount} backup`);
    }
    
    fetchBackups();
    fetchStats();
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
            <TabsTrigger value="backups"><HardDrive className="w-4 h-4 mr-1" /> Database Backup</TabsTrigger>
            <TabsTrigger value="s3-cloud" onClick={() => { fetchS3History(); fetchS3Stats(); }}><Cloud className="w-4 h-4 mr-1" /> S3 Cloud Backup</TabsTrigger>
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
                  <>
                    {/* Batch actions bar */}
                    {selectedBackups.size > 0 && (
                      <div className="flex items-center justify-between p-3 mb-4 bg-muted rounded-lg">
                        <span className="text-sm font-medium">
                          Đã chọn {selectedBackups.size} backup
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowBatchDeleteDialog(true)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Xóa đã chọn
                        </Button>
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={backups.length > 0 && selectedBackups.size === backups.length}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
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
                          <TableRow key={backup.id} className={selectedBackups.has(backup.id) ? "bg-muted/50" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={selectedBackups.has(backup.id)}
                                onCheckedChange={() => toggleSelectBackup(backup.id)}
                              />
                            </TableCell>
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
                  </>
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

          {/* S3 Cloud Backup Tab */}
          <TabsContent value="s3-cloud" className="space-y-6">
            {/* S3 Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Cloud className="w-4 h-4" /> Total S3 Backups</div>
                  <p className="text-2xl font-bold mt-1">{s3Stats?.totalBackups ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle className="w-4 h-4 text-green-500" /> Success</div>
                  <p className="text-2xl font-bold mt-1 text-green-600">{s3Stats?.successCount ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Database className="w-4 h-4" /> Total Size</div>
                  <p className="text-2xl font-bold mt-1">{s3Stats?.totalSizeFormatted ?? '0 B'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-4 h-4" /> Last Backup</div>
                  <p className="text-sm font-medium mt-1">{s3Stats?.lastBackup?.timestamp ? new Date(s3Stats.lastBackup.timestamp).toLocaleString() : 'N/A'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Create S3 Backup Button */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Cloud className="w-5 h-5" /> S3 Cloud Backup</CardTitle>
                    <CardDescription>Create full database backup and upload to S3 storage. Retention: {s3Stats?.retentionDays ?? 30} days.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { fetchS3History(); fetchS3Stats(); }}><RefreshCw className="w-4 h-4" /></Button>
                    <Button onClick={handleCreateS3Backup} disabled={isCreatingS3}>
                      {isCreatingS3 ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : <><Upload className="w-4 h-4 mr-2" /> Create S3 Backup</>}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {s3Loading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : s3Backups.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Tables</TableHead>
                        <TableHead>Rows</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s3Backups.map((b: any) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.id.slice(0, 8)}...</TableCell>
                          <TableCell>{new Date(b.timestamp).toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate">{b.fileName}</TableCell>
                          <TableCell>{(b.fileSize / 1024).toFixed(1)} KB</TableCell>
                          <TableCell>{b.tableCount}</TableCell>
                          <TableCell>{b.totalRows?.toLocaleString()}</TableCell>
                          <TableCell>{(b.duration / 1000).toFixed(1)}s</TableCell>
                          <TableCell>
                            <Badge variant={b.status === 'success' ? 'default' : 'destructive'} className={b.status === 'success' ? 'bg-green-500' : ''}>
                              {b.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {b.s3Url && <Button variant="ghost" size="sm" onClick={() => window.open(b.s3Url, '_blank')}><Download className="w-4 h-4" /></Button>}
                              <Button variant="ghost" size="sm" onClick={() => handleGetRestoreScript(b.id)}><FileCode className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Cloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No S3 backups yet. Click "Create S3 Backup" to start.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Backup Configuration</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Retention:</span> <span className="font-medium">{s3Stats?.retentionDays ?? 30} days</span></div>
                  <div><span className="text-muted-foreground">Max Backups:</span> <span className="font-medium">{s3Stats?.maxBackups ?? 30}</span></div>
                  <div><span className="text-muted-foreground">Avg Duration:</span> <span className="font-medium">{s3Stats?.avgDurationMs ? `${(s3Stats.avgDurationMs / 1000).toFixed(1)}s` : 'N/A'}</span></div>
                  <div><span className="text-muted-foreground">Next Backup:</span> <span className="font-medium">{s3Stats?.nextBackupEstimate ? new Date(s3Stats.nextBackupEstimate).toLocaleString() : 'N/A'}</span></div>
                </div>
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

        {/* Batch Delete Confirmation Dialog */}
        <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Xác nhận xóa nhiều backup
              </AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa {selectedBackups.size} backup đã chọn?
                Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isBatchDeleting}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBatchDelete}
                disabled={isBatchDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isBatchDeleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Xóa {selectedBackups.size} backup
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

        {/* Restore Script Dialog */}
        <Dialog open={showRestoreScriptDialog} onOpenChange={setShowRestoreScriptDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FileCode className="w-5 h-5" /> Restore Script</DialogTitle>
              <DialogDescription>
                Copy this script to restore the backup on your target database.
              </DialogDescription>
            </DialogHeader>
            {restoreScript && (
              <div className="space-y-3">
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Backup ID:</span> {restoreScript.backup?.id}</p>
                  <p><span className="text-muted-foreground">Created:</span> {restoreScript.backup?.timestamp ? new Date(restoreScript.backup.timestamp).toLocaleString() : 'N/A'}</p>
                  <p><span className="text-muted-foreground">Tables:</span> {restoreScript.backup?.tableCount} | <span className="text-muted-foreground">Rows:</span> {restoreScript.backup?.totalRows?.toLocaleString()}</p>
                </div>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[300px] font-mono">{restoreScript.script}</pre>
                  <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(restoreScript.script)}>
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRestoreScriptDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
