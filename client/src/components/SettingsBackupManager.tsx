/**
 * SettingsBackupManager - UI for managing settings backups
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Save,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Clock,
  HardDrive,
  Settings,
  MoreVertical,
  CheckCircle,
  AlertTriangle,
  Calendar,
  RefreshCw
} from 'lucide-react';
import {
  settingsBackupService,
  SettingsBackup,
  BackupConfig
} from '@/services/settingsBackupService';
import { toast } from 'sonner';

interface SettingsBackupManagerProps {
  className?: string;
}

export function SettingsBackupManager({ className = '' }: SettingsBackupManagerProps) {
  const [backups, setBackups] = useState<SettingsBackup[]>([]);
  const [config, setConfig] = useState<BackupConfig>(settingsBackupService.getConfig());
  const [selectedBackup, setSelectedBackup] = useState<SettingsBackup | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize and load backups
  useEffect(() => {
    settingsBackupService.init();
    setBackups(settingsBackupService.getBackups());
    setConfig(settingsBackupService.getConfig());

    // Subscribe to changes
    const unsubscribe = settingsBackupService.onBackupsChange((newBackups) => {
      setBackups(newBackups);
    });

    return unsubscribe;
  }, []);

  // Create manual backup
  const handleCreateBackup = useCallback(() => {
    const backup = settingsBackupService.createBackup('manual', 'Manual backup');
    if (backup) {
      toast.success(`Đã tạo backup v${backup.version}`);
    } else {
      toast.error('Không thể tạo backup');
    }
  }, []);

  // Restore backup
  const handleRestore = useCallback(() => {
    if (!selectedBackup) return;

    const success = settingsBackupService.restoreBackup(selectedBackup.id);
    if (success) {
      toast.success(`Đã khôi phục backup v${selectedBackup.version}`);
      // Reload page to apply settings
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      toast.error('Không thể khôi phục backup');
    }

    setShowRestoreDialog(false);
    setSelectedBackup(null);
  }, [selectedBackup]);

  // Delete backup
  const handleDelete = useCallback(() => {
    if (!selectedBackup) return;

    const success = settingsBackupService.deleteBackup(selectedBackup.id);
    if (success) {
      toast.success('Đã xóa backup');
    } else {
      toast.error('Không thể xóa backup');
    }

    setShowDeleteDialog(false);
    setSelectedBackup(null);
  }, [selectedBackup]);

  // Delete all backups
  const handleDeleteAll = useCallback(() => {
    settingsBackupService.deleteAllBackups();
    toast.success('Đã xóa tất cả backup');
    setShowDeleteAllDialog(false);
  }, []);

  // Export backup
  const handleExport = useCallback((backup: SettingsBackup) => {
    settingsBackupService.exportBackup(backup.id);
    toast.success('Đã xuất backup');
  }, []);

  // Import backup
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const backup = await settingsBackupService.importBackup(file);
    if (backup) {
      toast.success(`Đã nhập backup v${backup.version}`);
    } else {
      toast.error('File backup không hợp lệ');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Update config
  const handleConfigChange = useCallback((updates: Partial<BackupConfig>) => {
    settingsBackupService.updateConfig(updates);
    setConfig(settingsBackupService.getConfig());
    toast.success('Đã cập nhật cài đặt');
  }, []);

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get trigger badge
  const getTriggerBadge = (trigger: SettingsBackup['trigger']) => {
    switch (trigger) {
      case 'manual':
        return <Badge variant="default">Thủ công</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">Tự động</Badge>;
      case 'auto_change':
        return <Badge variant="outline">Thay đổi</Badge>;
      default:
        return <Badge variant="outline">{trigger}</Badge>;
    }
  };

  // Get stats
  const stats = settingsBackupService.getStats();

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Settings Backup
              </CardTitle>
              <CardDescription>
                Sao lưu và khôi phục cài đặt tự động
              </CardDescription>
            </div>
            <Button onClick={handleCreateBackup}>
              <Save className="mr-2 h-4 w-4" />
              Backup ngay
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Backup Settings */}
          <div className="p-4 bg-muted rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Backup tự động</p>
                  <p className="text-sm text-muted-foreground">
                    Tự động sao lưu theo lịch
                  </p>
                </div>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(enabled) => handleConfigChange({ enabled })}
              />
            </div>

            {config.enabled && (
              <>
                <div className="space-y-2">
                  <Label>Tần suất backup</Label>
                  <Select
                    value={config.intervalMinutes.toString()}
                    onValueChange={(value) => 
                      handleConfigChange({ intervalMinutes: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Mỗi 30 phút</SelectItem>
                      <SelectItem value="60">Mỗi giờ</SelectItem>
                      <SelectItem value="180">Mỗi 3 giờ</SelectItem>
                      <SelectItem value="360">Mỗi 6 giờ</SelectItem>
                      <SelectItem value="720">Mỗi 12 giờ</SelectItem>
                      <SelectItem value="1440">Mỗi ngày</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Backup khi thay đổi</p>
                    <p className="text-xs text-muted-foreground">
                      Tự động backup khi cài đặt thay đổi
                    </p>
                  </div>
                  <Switch
                    checked={config.backupOnChange}
                    onCheckedChange={(backupOnChange) => 
                      handleConfigChange({ backupOnChange })
                    }
                  />
                </div>

                {config.nextBackupAt > 0 && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Backup tiếp theo: {formatDate(config.nextBackupAt)}
                  </div>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Backup Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{stats.totalBackups}</p>
              <p className="text-xs text-muted-foreground">Backups</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">
                {settingsBackupService.formatSize(stats.totalSize)}
              </p>
              <p className="text-xs text-muted-foreground">Tổng dung lượng</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{5}</p>
              <p className="text-xs text-muted-foreground">Giới hạn</p>
            </div>
          </div>

          <Separator />

          {/* Backup List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Danh sách Backup</h3>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1 h-3 w-3" />
                  Import
                </Button>
                {backups.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteAllDialog(true)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Xóa tất cả
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="h-[300px]">
              {backups.length > 0 ? (
                <div className="space-y-2">
                  {backups.map((backup, index) => (
                    <div
                      key={backup.id}
                      className={`p-3 border rounded-lg ${
                        index === 0 ? 'border-primary/50 bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {index === 0 && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          <span className="font-medium">v{backup.version}</span>
                          {getTriggerBadge(backup.trigger)}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedBackup(backup);
                                setShowRestoreDialog(true);
                              }}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Khôi phục
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleExport(backup)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Xuất file
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedBackup(backup);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        <span>{formatDate(backup.createdAt)}</span>
                        <span className="mx-2">•</span>
                        <span>{settingsBackupService.formatSize(backup.size)}</span>
                      </div>
                      {backup.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {backup.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <HardDrive className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Chưa có backup nào</p>
                  <p className="text-sm">Nhấn "Backup ngay" để tạo backup đầu tiên</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Lưu ý:</strong> Hệ thống giữ tối đa 5 bản backup gần nhất.
              Backup cũ sẽ tự động bị xóa khi tạo backup mới.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Khôi phục backup?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cài đặt hiện tại sẽ bị ghi đè bởi backup v{selectedBackup?.version}.
              Trang sẽ được tải lại sau khi khôi phục.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              Khôi phục
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Xóa backup?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Backup v{selectedBackup?.version} sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Xóa tất cả backup?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tất cả {backups.length} backup sẽ bị xóa vĩnh viễn.
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa tất cả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default SettingsBackupManager;
