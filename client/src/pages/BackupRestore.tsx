import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Clock,
  Calendar,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  RotateCcw,
  FileJson,
  AlertTriangle,
  HardDrive,
  Cloud,
  Shield,
  History,
  Archive,
  Eye,
  FileText,
  Mail,
  Bell
} from "lucide-react";

// Types
interface BackupItem {
  id: number;
  filename: string;
  fileSize: number;
  backupType: "full" | "incremental" | "differential" | "manual";
  status: "completed" | "in_progress" | "failed" | "scheduled";
  storageLocation: "local" | "s3" | "both";
  tablesIncluded: string[];
  rowsBackedUp: number;
  compressionRatio: number;
  encryptionEnabled: boolean;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  errorMessage?: string;
}

interface BackupSchedule {
  id: string;
  name: string;
  type: "full" | "incremental" | "differential";
  frequency: "hourly" | "daily" | "weekly" | "monthly";
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  retentionDays: number;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notifyEmails: string[];
}

interface RestorePoint {
  id: number;
  backupId: number;
  backupFilename: string;
  backupDate: Date;
  tables: string[];
  totalRows: number;
  canRestore: boolean;
  estimatedTime: number;
}

interface BackupStats {
  totalBackups: number;
  totalSize: number;
  lastBackup?: Date;
  nextScheduledBackup?: Date;
  successRate: number;
  storageUsed: {
    local: number;
    s3: number;
  };
}

// Mock data
// Mock data removed - ([] as any[]) (data comes from tRPC or is not yet implemented)

// Mock data removed - ([] as any[]) (data comes from tRPC or is not yet implemented)

// Mock data removed - ({ totalBackups: 0, totalSize: "0 GB", lastBackup: "N/A", nextScheduled: "N/A", successRate: 0, avgDuration: "0m" } as any) (data comes from tRPC or is not yet implemented)

export default function BackupRestore() {
  const [activeTab, setActiveTab] = useState("overview");
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [stats, setStats] = useState<BackupStats>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [restoreOptions, setRestoreOptions] = useState({
    tables: [] as string[],
    dropExisting: false,
    validateBeforeRestore: true,
  });
  const [newSchedule, setNewSchedule] = useState<Partial<BackupSchedule>>({
    type: "full",
    frequency: "daily",
    time: "02:00",
    retentionDays: 30,
    enabled: true,
    notifyOnSuccess: false,
    notifyOnFailure: true,
    notifyEmails: [],
  });
  const { toast } = useToast();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const handleCreateBackup = async (type: "full" | "incremental" | "differential") => {
    setIsCreatingBackup(true);
    setBackupProgress(0);

    // Simulate backup progress
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      setBackupProgress(100);
      setIsCreatingBackup(false);
      
      const newBackup: BackupItem = {
        id: backups.length + 1,
        filename: `backup_${type}_${new Date().toISOString().replace(/[:.]/g, "-")}.sql.gz`,
        fileSize: Math.floor(Math.random() * 100000000) + 50000000,
        backupType: type === "full" ? "full" : type === "incremental" ? "incremental" : "differential",
        status: "completed",
        storageLocation: "both",
        tablesIncluded: ["measurements", "products", "stations", "machines", "users"],
        rowsBackedUp: Math.floor(Math.random() * 100000) + 50000,
        compressionRatio: 0.3 + Math.random() * 0.2,
        encryptionEnabled: true,
        createdAt: new Date(),
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000 * 30),
      };
      
      setBackups([newBackup, ...backups]);
      toast({
        title: "Backup hoàn thành",
        description: `Đã tạo backup ${type} thành công`,
      });
    }, 5000);
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    
    toast({
      title: "Đang khôi phục",
      description: "Quá trình khôi phục đang được thực hiện...",
    });
    
    setShowRestoreDialog(false);
    
    // Simulate restore
    setTimeout(() => {
      toast({
        title: "Khôi phục hoàn thành",
        description: `Đã khôi phục từ backup ${selectedBackup.filename}`,
      });
    }, 3000);
  };

  const handleDeleteBackup = async () => {
    if (!selectedBackup) return;
    
    setBackups(backups.filter(b => b.id !== selectedBackup.id));
    setShowDeleteDialog(false);
    setSelectedBackup(null);
    
    toast({
      title: "Đã xóa backup",
      description: `Backup ${selectedBackup.filename} đã được xóa`,
    });
  };

  const handleToggleSchedule = (scheduleId: string, enabled: boolean) => {
    setSchedules(schedules.map(s => 
      s.id === scheduleId ? { ...s, enabled } : s
    ));
    
    toast({
      title: enabled ? "Đã bật lịch backup" : "Đã tắt lịch backup",
      description: `Lịch backup đã được ${enabled ? "kích hoạt" : "vô hiệu hóa"}`,
    });
  };

  const getStatusBadge = (status: BackupItem["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Hoàn thành</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Đang chạy</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Thất bại</Badge>;
      case "scheduled":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Đã lên lịch</Badge>;
    }
  };

  const getTypeBadge = (type: BackupItem["backupType"]) => {
    switch (type) {
      case "full":
        return <Badge variant="outline" className="border-purple-500 text-purple-500">Full</Badge>;
      case "incremental":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Incremental</Badge>;
      case "differential":
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Differential</Badge>;
      case "manual":
        return <Badge variant="outline" className="border-gray-500 text-gray-500">Manual</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Archive className="h-6 w-6" />
              Backup & Khôi phục
            </h1>
            <p className="text-muted-foreground">
              Quản lý backup và khôi phục dữ liệu hệ thống
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleCreateBackup("incremental")}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Backup Incremental
            </Button>
            <Button onClick={() => handleCreateBackup("full")}>
              <Download className="h-4 w-4 mr-2" />
              Backup Full
            </Button>
          </div>
        </div>

        {/* Progress bar khi đang backup */}
        {isCreatingBackup && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Đang tạo backup...</span>
                  <span>{Math.round(backupProgress)}%</span>
                </div>
                <Progress value={backupProgress} />
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">
              <HardDrive className="h-4 w-4 mr-2" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="backups">
              <Archive className="h-4 w-4 mr-2" />
              Danh sách Backup
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Lịch Backup
            </TabsTrigger>
            <TabsTrigger value="restore">
              <RotateCcw className="h-4 w-4 mr-2" />
              Khôi phục
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Cài đặt
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổng số Backup
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBackups}</div>
                  <p className="text-xs text-muted-foreground">
                    Tổng dung lượng: {formatBytes(stats.totalSize)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Backup gần nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.lastBackup ? formatDuration(Date.now() - stats.lastBackup.getTime()) : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.lastBackup?.toLocaleString("vi-VN")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Backup tiếp theo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.nextScheduledBackup 
                      ? formatDuration(stats.nextScheduledBackup.getTime() - Date.now())
                      : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.nextScheduledBackup?.toLocaleString("vi-VN")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tỷ lệ thành công
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {stats.successRate}%
                  </div>
                  <Progress value={stats.successRate} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* Storage Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Dung lượng lưu trữ</CardTitle>
                <CardDescription>Phân bổ dung lượng backup theo vị trí lưu trữ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        <span>Local Storage</span>
                      </div>
                      <span className="font-medium">{formatBytes(stats.storageUsed.local)}</span>
                    </div>
                    <Progress value={(stats.storageUsed.local / stats.totalSize) * 100} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4" />
                        <span>S3 Storage</span>
                      </div>
                      <span className="font-medium">{formatBytes(stats.storageUsed.s3)}</span>
                    </div>
                    <Progress value={(stats.storageUsed.s3 / stats.totalSize) * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Backups */}
            <Card>
              <CardHeader>
                <CardTitle>Backup gần đây</CardTitle>
                <CardDescription>5 backup mới nhất của hệ thống</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên file</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Kích thước</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.slice(0, 5).map(backup => (
                      <TableRow key={backup.id}>
                        <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                        <TableCell>{getTypeBadge(backup.backupType)}</TableCell>
                        <TableCell>{formatBytes(backup.fileSize)}</TableCell>
                        <TableCell>{getStatusBadge(backup.status)}</TableCell>
                        <TableCell>{backup.createdAt.toLocaleString("vi-VN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backups List Tab */}
          <TabsContent value="backups" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Danh sách Backup</CardTitle>
                    <CardDescription>Tất cả các bản backup của hệ thống</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Lọc theo loại" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="full">Full</SelectItem>
                        <SelectItem value="incremental">Incremental</SelectItem>
                        <SelectItem value="differential">Differential</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên file</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Kích thước</TableHead>
                        <TableHead>Số dòng</TableHead>
                        <TableHead>Nén</TableHead>
                        <TableHead>Lưu trữ</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map(backup => (
                        <TableRow key={backup.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileJson className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{backup.filename}</span>
                              {backup.encryptionEnabled && (
                                <Shield className="h-3 w-3 text-green-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(backup.backupType)}</TableCell>
                          <TableCell>{formatBytes(backup.fileSize)}</TableCell>
                          <TableCell>{backup.rowsBackedUp.toLocaleString()}</TableCell>
                          <TableCell>
                            {backup.compressionRatio > 0 
                              ? `${Math.round(backup.compressionRatio * 100)}%`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {(backup.storageLocation === "local" || backup.storageLocation === "both") && (
                                <HardDrive className="h-4 w-4" />
                              )}
                              {(backup.storageLocation === "s3" || backup.storageLocation === "both") && (
                                <Cloud className="h-4 w-4" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(backup.status)}</TableCell>
                          <TableCell>{backup.createdAt.toLocaleString("vi-VN")}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedBackup(backup);
                                  setRestoreOptions({
                                    ...restoreOptions,
                                    tables: backup.tablesIncluded,
                                  });
                                  setShowRestoreDialog(true);
                                }}
                                disabled={backup.status !== "completed"}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Download backup
                                  toast({
                                    title: "Đang tải xuống",
                                    description: "File backup đang được tải xuống...",
                                  });
                                }}
                                disabled={backup.status !== "completed"}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedBackup(backup);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lịch Backup tự động</CardTitle>
                    <CardDescription>Cấu hình các lịch backup định kỳ</CardDescription>
                  </div>
                  <Button onClick={() => setShowScheduleDialog(true)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Thêm lịch mới
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schedules.map(schedule => (
                    <Card key={schedule.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{schedule.name}</h3>
                              {getTypeBadge(schedule.type as BackupItem["backupType"])}
                              <Badge variant={schedule.enabled ? "default" : "secondary"}>
                                {schedule.enabled ? "Đang hoạt động" : "Đã tắt"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {schedule.frequency === "hourly" && `Mỗi giờ vào phút ${schedule.time}`}
                              {schedule.frequency === "daily" && `Hàng ngày lúc ${schedule.time}`}
                              {schedule.frequency === "weekly" && `Hàng tuần vào ${["CN", "T2", "T3", "T4", "T5", "T6", "T7"][schedule.dayOfWeek || 0]} lúc ${schedule.time}`}
                              {schedule.frequency === "monthly" && `Hàng tháng ngày ${schedule.dayOfMonth} lúc ${schedule.time}`}
                            </p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Giữ lại: {schedule.retentionDays} ngày</span>
                              {schedule.lastRun && (
                                <span>Chạy lần cuối: {schedule.lastRun.toLocaleString("vi-VN")}</span>
                              )}
                              {schedule.nextRun && (
                                <span>Chạy tiếp theo: {schedule.nextRun.toLocaleString("vi-VN")}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {schedule.notifyOnFailure && (
                                <Bell className="h-4 w-4 text-muted-foreground" />
                              )}
                              {schedule.notifyEmails.length > 0 && (
                                <Mail className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <Switch
                              checked={schedule.enabled}
                              onCheckedChange={(checked) => handleToggleSchedule(schedule.id, checked)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restore Tab */}
          <TabsContent value="restore" className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cảnh báo</AlertTitle>
              <AlertDescription>
                Khôi phục dữ liệu sẽ ghi đè lên dữ liệu hiện tại. Hãy đảm bảo bạn đã backup dữ liệu hiện tại trước khi thực hiện khôi phục.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Chọn điểm khôi phục</CardTitle>
                <CardDescription>Chọn một bản backup để khôi phục hệ thống</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {backups.filter(b => b.status === "completed").map(backup => (
                    <Card 
                      key={backup.id}
                      className={`cursor-pointer transition-colors ${selectedBackup?.id === backup.id ? "border-primary" : ""}`}
                      onClick={() => {
                        setSelectedBackup(backup);
                        setRestoreOptions({
                          ...restoreOptions,
                          tables: backup.tablesIncluded,
                        });
                      }}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Checkbox checked={selectedBackup?.id === backup.id} />
                              <span className="font-mono">{backup.filename}</span>
                              {getTypeBadge(backup.backupType)}
                            </div>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>{formatBytes(backup.fileSize)}</span>
                              <span>{backup.rowsBackedUp.toLocaleString()} dòng</span>
                              <span>{backup.tablesIncluded.length} bảng</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{backup.createdAt.toLocaleDateString("vi-VN")}</div>
                            <div className="text-sm text-muted-foreground">{backup.createdAt.toLocaleTimeString("vi-VN")}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {selectedBackup && (
                  <div className="mt-6 space-y-4">
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-semibold">Tùy chọn khôi phục</h3>
                      
                      <div className="space-y-2">
                        <Label>Chọn bảng để khôi phục</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {selectedBackup.tablesIncluded.map(table => (
                            <div key={table} className="flex items-center gap-2">
                              <Checkbox
                                checked={restoreOptions.tables.includes(table)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setRestoreOptions({
                                      ...restoreOptions,
                                      tables: [...restoreOptions.tables, table],
                                    });
                                  } else {
                                    setRestoreOptions({
                                      ...restoreOptions,
                                      tables: restoreOptions.tables.filter(t => t !== table),
                                    });
                                  }
                                }}
                              />
                              <span>{table}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={restoreOptions.dropExisting}
                          onCheckedChange={(checked) => setRestoreOptions({ ...restoreOptions, dropExisting: checked })}
                        />
                        <Label>Xóa dữ liệu hiện tại trước khi khôi phục</Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={restoreOptions.validateBeforeRestore}
                          onCheckedChange={(checked) => setRestoreOptions({ ...restoreOptions, validateBeforeRestore: checked })}
                        />
                        <Label>Kiểm tra tính toàn vẹn trước khi khôi phục</Label>
                      </div>

                      <Button 
                        className="w-full" 
                        onClick={() => setShowRestoreDialog(true)}
                        disabled={restoreOptions.tables.length === 0}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Khôi phục {restoreOptions.tables.length} bảng
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt Backup</CardTitle>
                <CardDescription>Cấu hình các tùy chọn backup hệ thống</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Lưu trữ</h3>
                    
                    <div className="space-y-2">
                      <Label>Vị trí lưu trữ mặc định</Label>
                      <Select defaultValue="both">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local only</SelectItem>
                          <SelectItem value="s3">S3 only</SelectItem>
                          <SelectItem value="both">Cả hai</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Thời gian giữ backup (ngày)</Label>
                      <Input type="number" defaultValue={30} />
                    </div>

                    <div className="space-y-2">
                      <Label>Số backup tối đa</Label>
                      <Input type="number" defaultValue={50} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Bảo mật</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Mã hóa backup</Label>
                        <p className="text-sm text-muted-foreground">Mã hóa AES-256 cho các file backup</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Nén dữ liệu</Label>
                        <p className="text-sm text-muted-foreground">Nén GZIP để giảm dung lượng</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Kiểm tra checksum</Label>
                        <p className="text-sm text-muted-foreground">Xác minh tính toàn vẹn sau backup</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Thông báo</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Thông báo khi backup thành công</Label>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Thông báo khi backup thất bại</Label>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email nhận thông báo</Label>
                    <Input placeholder="admin@example.com, backup@example.com" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>Lưu cài đặt</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Restore Dialog */}
        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận khôi phục</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn khôi phục dữ liệu từ backup này?
              </DialogDescription>
            </DialogHeader>
            
            {selectedBackup && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-mono text-sm">{selectedBackup.filename}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedBackup.createdAt.toLocaleString("vi-VN")} • {formatBytes(selectedBackup.fileSize)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium">Các bảng sẽ được khôi phục:</p>
                  <p className="text-sm text-muted-foreground">{restoreOptions.tables.join(", ")}</p>
                </div>

                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Thao tác này không thể hoàn tác. Dữ liệu hiện tại sẽ bị ghi đè.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleRestore}>
                Xác nhận khôi phục
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận xóa</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa backup này? Thao tác này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            
            {selectedBackup && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-mono text-sm">{selectedBackup.filename}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedBackup.createdAt.toLocaleString("vi-VN")} • {formatBytes(selectedBackup.fileSize)}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleDeleteBackup}>
                Xóa backup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
