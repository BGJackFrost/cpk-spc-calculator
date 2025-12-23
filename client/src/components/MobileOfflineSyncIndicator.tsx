/**
 * MobileOfflineSyncIndicator - Mobile-friendly offline sync status indicator
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  ArrowUpDown,
  Smartphone
} from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { ConflictItem, ConflictResolutionStrategy } from '@/services/offlineSyncManager';
import { toast } from 'sonner';

interface MobileOfflineSyncIndicatorProps {
  className?: string;
}

export function MobileOfflineSyncIndicator({ className = '' }: MobileOfflineSyncIndicatorProps) {
  const {
    isOnline,
    isInitialized,
    isSyncing,
    pendingChanges,
    conflicts,
    syncMetadata,
    syncNow,
    resolveConflict,
    resolveAllConflicts,
    clearPending
  } = useOfflineSync();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Handle sync
  const handleSync = async () => {
    if (!isOnline) {
      toast.error('Không có kết nối mạng');
      return;
    }

    const result = await syncNow();
    
    if (result.processed > 0) {
      toast.success(`Đã đồng bộ ${result.processed} thay đổi`);
    }
    if (result.conflicts > 0) {
      toast.warning(`Phát hiện ${result.conflicts} xung đột cần giải quyết`);
    }
    if (result.errors > 0) {
      toast.error(`${result.errors} lỗi khi đồng bộ`);
    }
  };

  // Handle resolve conflict
  const handleResolveConflict = async (
    conflict: ConflictItem,
    resolution: 'local' | 'server' | 'merge'
  ) => {
    await resolveConflict(conflict.id, resolution);
    setSelectedConflict(null);
    toast.success('Đã giải quyết xung đột');
  };

  // Handle resolve all
  const handleResolveAll = async (strategy: ConflictResolutionStrategy) => {
    await resolveAllConflicts(strategy);
    toast.success('Đã giải quyết tất cả xung đột');
  };

  // Handle clear all
  const handleClearAll = async () => {
    await clearPending();
    setShowClearDialog(false);
    toast.success('Đã xóa tất cả dữ liệu offline');
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (conflicts.length > 0) return 'text-orange-500';
    if (pendingChanges.length > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (conflicts.length > 0) return <AlertTriangle className="h-4 w-4" />;
    if (pendingChanges.length > 0) return <Cloud className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  if (!isInitialized) return null;

  const totalPending = pendingChanges.length + conflicts.length;

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`relative ${className} ${getStatusColor()}`}
          >
            {getStatusIcon()}
            {totalPending > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
              >
                {totalPending}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Offline Sync
            </SheetTitle>
            <SheetDescription>
              Quản lý đồng bộ dữ liệu offline
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-full mt-4 pb-20">
            {/* Connection Status */}
            <div className={`p-4 rounded-lg mb-4 ${isOnline ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium">
                    {isOnline ? 'Đang kết nối' : 'Không có kết nối'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {syncMetadata?.lastSyncAt
                      ? `Đồng bộ lần cuối: ${formatTime(syncMetadata.lastSyncAt)}`
                      : 'Chưa đồng bộ'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sync Progress */}
            {isSyncing && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">Đang đồng bộ...</p>
                <Progress value={undefined} className="h-2" />
              </div>
            )}

            {/* Pending Changes */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Thay đổi chờ đồng bộ
                </h3>
                <Badge variant="outline">{pendingChanges.length}</Badge>
              </div>

              {pendingChanges.length > 0 ? (
                <div className="space-y-2">
                  {pendingChanges.slice(0, 5).map((change) => (
                    <div
                      key={change.id}
                      className="p-3 bg-muted rounded-lg text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{change.type}</span>
                        <span className="text-muted-foreground text-xs">
                          {formatTime(change.timestamp)}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        {change.entity} - {change.entityId}
                      </p>
                    </div>
                  ))}
                  {pendingChanges.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{pendingChanges.length - 5} thay đổi khác
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Không có thay đổi chờ đồng bộ
                </p>
              )}
            </div>

            <Separator className="my-4" />

            {/* Conflicts */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Xung đột cần giải quyết
                </h3>
                <Badge variant={conflicts.length > 0 ? 'destructive' : 'outline'}>
                  {conflicts.length}
                </Badge>
              </div>

              {conflicts.length > 0 ? (
                <div className="space-y-2">
                  {conflicts.map((conflict) => (
                    <div
                      key={conflict.id}
                      className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {conflict.pendingChange.entity}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conflict.detectedAt)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={() => handleResolveConflict(conflict, 'local')}
                        >
                          Giữ Local
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={() => handleResolveConflict(conflict, 'server')}
                        >
                          Giữ Server
                        </Button>
                      </div>
                    </div>
                  ))}

                  {conflicts.length > 1 && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleResolveAll('local_wins')}
                      >
                        Giữ tất cả Local
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleResolveAll('server_wins')}
                      >
                        Giữ tất cả Server
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Không có xung đột
                </p>
              )}
            </div>

            <Separator className="my-4" />

            {/* Actions */}
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handleSync}
                disabled={!isOnline || isSyncing || pendingChanges.length === 0}
              >
                {isSyncing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                )}
                Đồng bộ ngay
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowClearDialog(true)}
                disabled={totalPending === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa dữ liệu offline
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa dữ liệu offline?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa tất cả thay đổi chưa đồng bộ và xung đột.
              Dữ liệu sẽ không thể khôi phục.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}>
              Xóa tất cả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default MobileOfflineSyncIndicator;
