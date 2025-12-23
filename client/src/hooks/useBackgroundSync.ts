/**
 * useBackgroundSync - React hook for background sync management
 * With conflict resolution dialog integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { backgroundSync, SyncStatus, SyncItem, ConflictResolutionCallback } from '@/services/backgroundSyncService';
import { ConflictItem, ResolutionStrategy } from '@/components/ConflictResolutionDialog';

export interface UseBackgroundSyncOptions {
  onConflictsDetected?: (conflicts: SyncItem[]) => void;
}

export function useBackgroundSync(options?: UseBackgroundSyncOptions) {
  const [status, setStatus] = useState<SyncStatus>(backgroundSync.getStatus());
  const [pendingItems, setPendingItems] = useState<SyncItem[]>(backgroundSync.getPendingItems());
  const [conflictItems, setConflictItems] = useState<SyncItem[]>(backgroundSync.getConflictItems());
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [dialogConflicts, setDialogConflicts] = useState<ConflictItem[]>([]);
  
  // Ref to store resolve callback
  const resolveCallbackRef = useRef<((resolutions: Map<string, ResolutionStrategy>) => void) | null>(null);

  useEffect(() => {
    // Subscribe to status changes
    const handleStatusChange = (newStatus: SyncStatus) => {
      setStatus(newStatus);
      setPendingItems(backgroundSync.getPendingItems());
      setConflictItems(backgroundSync.getConflictItems());
    };

    const handleItemSynced = () => {
      setPendingItems(backgroundSync.getPendingItems());
      setConflictItems(backgroundSync.getConflictItems());
    };

    const handleItemFailed = () => {
      setPendingItems(backgroundSync.getPendingItems());
      setConflictItems(backgroundSync.getConflictItems());
    };

    const handleConflictsDetected = (conflicts: SyncItem[]) => {
      setConflictItems(conflicts);
      options?.onConflictsDetected?.(conflicts);
    };

    backgroundSync.on('status_change', handleStatusChange);
    backgroundSync.on('item_synced', handleItemSynced);
    backgroundSync.on('item_failed', handleItemFailed);
    backgroundSync.on('conflicts_detected', handleConflictsDetected);

    // Register conflict resolver
    const conflictResolver: ConflictResolutionCallback = (conflicts) => {
      return new Promise((resolve) => {
        setDialogConflicts(conflicts);
        setIsConflictDialogOpen(true);
        resolveCallbackRef.current = resolve;
      });
    };
    
    backgroundSync.setConflictResolver(conflictResolver);

    return () => {
      backgroundSync.off('status_change', handleStatusChange);
      backgroundSync.off('item_synced', handleItemSynced);
      backgroundSync.off('item_failed', handleItemFailed);
      backgroundSync.off('conflicts_detected', handleConflictsDetected);
    };
  }, [options]);

  // Handle conflict resolution from dialog
  const handleConflictResolve = useCallback((resolutions: Map<string, ResolutionStrategy>) => {
    if (resolveCallbackRef.current) {
      resolveCallbackRef.current(resolutions);
      resolveCallbackRef.current = null;
    }
    setIsConflictDialogOpen(false);
    setDialogConflicts([]);
  }, []);

  // Handle conflict dialog cancel
  const handleConflictCancel = useCallback(() => {
    // Resolve with empty map (keep conflicts in queue)
    if (resolveCallbackRef.current) {
      resolveCallbackRef.current(new Map());
      resolveCallbackRef.current = null;
    }
    setIsConflictDialogOpen(false);
    setDialogConflicts([]);
  }, []);

  // Manually open conflict dialog for existing conflicts
  const openConflictDialog = useCallback(() => {
    const conflicts = backgroundSync.getConflictItems();
    if (conflicts.length > 0) {
      // Convert to dialog format
      const dialogItems: ConflictItem[] = conflicts.map(item => ({
        id: item.id,
        entity: item.entity,
        entityId: item.data.id,
        entityName: item.data.name || item.data.title || `${item.entity} #${item.data.id}`,
        conflicts: Object.keys(item.data)
          .filter(key => key !== 'id' && key !== 'createdAt')
          .filter(key => item.serverData && JSON.stringify(item.data[key]) !== JSON.stringify(item.serverData[key]))
          .map(field => ({
            id: `${item.id}_${field}`,
            entity: item.entity,
            field,
            localValue: item.data[field],
            serverValue: item.serverData?.[field],
            localTimestamp: item.timestamp,
            serverTimestamp: item.serverData?.updatedAt || item.serverData?.timestamp || Date.now()
          })),
        localTimestamp: item.timestamp,
        serverTimestamp: item.serverData?.updatedAt || item.serverData?.timestamp || Date.now()
      }));
      
      setDialogConflicts(dialogItems);
      setIsConflictDialogOpen(true);
      
      return new Promise<Map<string, ResolutionStrategy>>((resolve) => {
        resolveCallbackRef.current = resolve;
      });
    }
    return Promise.resolve(new Map());
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

  // Resolve conflicts manually
  const resolveConflicts = useCallback(async (resolutions: Map<string, ResolutionStrategy>) => {
    await backgroundSync.resolveConflicts(resolutions);
    setConflictItems(backgroundSync.getConflictItems());
  }, []);

  // Clear failed items
  const clearFailed = useCallback(() => {
    backgroundSync.clearFailed();
    setPendingItems(backgroundSync.getPendingItems());
  }, []);

  // Clear conflict items
  const clearConflicts = useCallback(() => {
    backgroundSync.clearConflicts();
    setConflictItems(backgroundSync.getConflictItems());
  }, []);

  // Clear all items
  const clearAll = useCallback(() => {
    backgroundSync.clearAll();
    setPendingItems(backgroundSync.getPendingItems());
    setConflictItems([]);
  }, []);

  return {
    // Status
    status,
    pendingItems,
    conflictItems,
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
    pendingCount: status.pendingCount,
    failedCount: status.failedCount,
    conflictCount: status.conflictCount,
    
    // Actions
    addToQueue,
    forceSync,
    retryFailed,
    resolveConflicts,
    clearFailed,
    clearConflicts,
    clearAll,
    
    // Conflict dialog
    isConflictDialogOpen,
    dialogConflicts,
    openConflictDialog,
    handleConflictResolve,
    handleConflictCancel
  };
}

export default useBackgroundSync;
