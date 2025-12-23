/**
 * SyncStatusIndicator - Component to display background sync status
 */

import { useState } from 'react';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
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
  CheckCircle,
  Trash2,
  Loader2
} from 'lucide-react';

interface SyncStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export function SyncStatusIndicator({ showDetails = true, className = '' }: SyncStatusIndicatorProps) {
  const {
    status,
    pendingItems,
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    forceSync,
    retryFailed,
    clearFailed
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
    if (failedCount > 0) {
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
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

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {getStatusIcon()}
        <span className="text-xs text-muted-foreground">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={`gap-2 ${className}`}>
          {getStatusIcon()}
          <span className="text-xs">{getStatusText()}</span>
          {(pendingCount > 0 || failedCount > 0) && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {pendingCount + failedCount}
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
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-lg font-semibold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-lg font-semibold">{failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-lg font-semibold">
                {status.lastSyncTime ? formatTime(status.lastSyncTime) : '-'}
              </p>
              <p className="text-xs text-muted-foreground">Last Sync</p>
            </div>
          </div>

          {/* Pending Items */}
          {pendingItems.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Pending Items</h5>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {pendingItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {item.status === 'failed' ? (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      ) : item.status === 'syncing' ? (
                        <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 text-yellow-500" />
                      )}
                      <span className="truncate max-w-[120px]">
                        {item.entity} ({item.type})
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                ))}
                {pendingItems.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{pendingItems.length - 5} more items
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
  );
}

export default SyncStatusIndicator;
