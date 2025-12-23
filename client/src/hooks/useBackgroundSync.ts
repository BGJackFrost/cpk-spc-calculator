/**
 * useBackgroundSync - React hook for background sync management
 */

import { useState, useEffect, useCallback } from 'react';
import { backgroundSync, SyncStatus, SyncItem } from '@/services/backgroundSyncService';

export function useBackgroundSync() {
  const [status, setStatus] = useState<SyncStatus>(backgroundSync.getStatus());
  const [pendingItems, setPendingItems] = useState<SyncItem[]>(backgroundSync.getPendingItems());

  useEffect(() => {
    // Subscribe to status changes
    const handleStatusChange = (newStatus: SyncStatus) => {
      setStatus(newStatus);
      setPendingItems(backgroundSync.getPendingItems());
    };

    const handleItemSynced = () => {
      setPendingItems(backgroundSync.getPendingItems());
    };

    const handleItemFailed = () => {
      setPendingItems(backgroundSync.getPendingItems());
    };

    backgroundSync.on('status_change', handleStatusChange);
    backgroundSync.on('item_synced', handleItemSynced);
    backgroundSync.on('item_failed', handleItemFailed);

    return () => {
      backgroundSync.off('status_change', handleStatusChange);
      backgroundSync.off('item_synced', handleItemSynced);
      backgroundSync.off('item_failed', handleItemFailed);
    };
  }, []);

  // Add item to sync queue
  const addToQueue = useCallback((
    type: 'create' | 'update' | 'delete',
    entity: string,
    data: Record<string, any>
  ) => {
    return backgroundSync.addToQueue({ type, entity, data });
  }, []);

  // Force sync
  const forceSync = useCallback(async () => {
    await backgroundSync.forceSync();
  }, []);

  // Retry failed items
  const retryFailed = useCallback(async () => {
    await backgroundSync.retryFailed();
  }, []);

  // Clear failed items
  const clearFailed = useCallback(() => {
    backgroundSync.clearFailed();
    setPendingItems(backgroundSync.getPendingItems());
  }, []);

  // Clear all items
  const clearAll = useCallback(() => {
    backgroundSync.clearAll();
    setPendingItems(backgroundSync.getPendingItems());
  }, []);

  return {
    status,
    pendingItems,
    addToQueue,
    forceSync,
    retryFailed,
    clearFailed,
    clearAll,
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
    pendingCount: status.pendingCount,
    failedCount: status.failedCount
  };
}

export default useBackgroundSync;
