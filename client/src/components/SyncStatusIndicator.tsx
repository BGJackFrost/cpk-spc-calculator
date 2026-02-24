/**
 * SyncStatusIndicator - Component to display background sync status
 * With conflict resolution dialog integration
 */

import { useState } from 'react';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { ConflictResolutionDialog } from '@/components/ConflictResolutionDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Loader2,
  GitMerge
} from 'lucide-react';

interface SyncStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export function SyncStatusIndicator({ showDetails = true, className = '' }: SyncStatusIndicatorProps) {
  const {
    status,
    pendingItems,
    conflictItems,
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    conflictCount,
    forceSync,
    retryFailed,
    clearFailed,
    clearConflicts,
    isConflictDialogOpen,
    dialogConflicts,
    openConflictDialog,
    handleConflictResolve,
    handleConflictCancel
  } = useBackgroundSync();

  const [isOpen, setIsOpen] = useState(false);

  // Get status icon
  const getStatusIcon = () => {
    if (!isOnline) {
      return <CloudOff className="h-4 w-4 text-red-500" />;
    }
    if (isSyncing) {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    if (conflictCount > 0) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    if (failedCount > 0) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (pendingCount > 0) {
      return <RefreshCw className="h-4 w-4 text-yellow-500" />;
    }
    return <Cloud className="h-4 w-4 text-green-500" />;
  };

  // Get status text
  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Đang đồng bộ...';
    if (conflictCount > 0) return `${conflictCount} xung đột`;
    if (failedCount > 0) return `${failedCount} lỗi`;
    if (pendingCount > 0) return `${pendingCount} đang chờ`;
    return 'Đã đồng bộ';
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get item status icon
  const getItemStatusIcon = (itemStatus: string) => {
    switch (itemStatus) {
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'syncing':
        return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
      case 'conflict':
        return <AlertTriangle className="h-3 w-3 text-orange-500" />;
      default:
        return <RefreshCw className="h-3 w-3 text-yellow-500" />;
    }
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {getStatusIcon()}
        <span className="text-xs text-muted-foreground">{getStatusText()}</span>
      </div>
    );
  }

  const totalIssues = pendingCount + failedCount + conflictCount;

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={`gap-2 ${className}`}>
            {getStatusIcon()}
            <span className="text-xs">{getStatusText()}</span>
            {totalIssues > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {totalIssues}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Sync Status</h4>
              <div className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-lg font-semibold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-lg font-semibold text-orange-500">{conflictCount}</p>
                <p className="text-xs text-muted-foreground">Conflicts</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-lg font-semibold text-red-500">{failedCount}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-lg font-semibold">
                  {status.lastSyncTime ? formatTime(status.lastSyncTime) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Last Sync</p>
              </div>
            </div>

            {/* Conflict Alert */}
            {conflictCount > 0 && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-500">
                    {conflictCount} xung đột cần giải quyết
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                  onClick={() => {
                    setIsOpen(false);
                    openConflictDialog();
                  }}
                >
                  <GitMerge className="mr-2 h-3 w-3" />
                  Giải quyết xung đột
                </Button>
              </div>
            )}

            {/* Pending Items */}
            {(pendingItems.length > 0 || conflictItems.length > 0) && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Pending Items</h5>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {/* Show conflicts first */}
                  {conflictItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-orange-500/10 rounded text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {getItemStatusIcon(item.status)}
                        <span className="truncate max-w-[120px]">
                          {item.entity} ({item.type})
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/50">
                        Conflict
                      </Badge>
                    </div>
                  ))}
                  {/* Then show pending items */}
                  {pendingItems.slice(0, 5 - Math.min(conflictItems.length, 3)).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {getItemStatusIcon(item.status)}
                        <span className="truncate max-w-[120px]">
                          {item.entity} ({item.type})
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  ))}
                  {(pendingItems.length + conflictItems.length) > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{pendingItems.length + conflictItems.length - 5} more items
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => forceSync()}
                disabled={!isOnline || isSyncing || pendingCount === 0}
              >
                {isSyncing ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-3 w-3" />
                )}
                Sync Now
              </Button>
              {failedCount > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => retryFailed()}
                    disabled={!isOnline || isSyncing}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Retry
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => clearFailed()}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
              {conflictCount > 0 && failedCount === 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => clearConflicts()}
                  title="Bỏ qua tất cả xung đột"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Last Error */}
            {status.lastError && (
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500">
                {status.lastError}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        open={isConflictDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleConflictCancel();
        }}
        conflicts={dialogConflicts}
        onResolve={handleConflictResolve}
        onCancel={handleConflictCancel}
      />
    </>
  );
}

export default SyncStatusIndicator;
