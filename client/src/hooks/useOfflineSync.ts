/**
 * useOfflineSync - React hook for offline sync management on mobile
 */

import { useState, useEffect, useCallback } from 'react';
import {
  offlineSyncManager,
  PendingChange,
  ConflictItem,
  SyncMetadata,
  ConflictResolutionStrategy
} from '@/services/offlineSyncManager';

export interface UseOfflineSyncReturn {
  // Status
  isOnline: boolean;
  isInitialized: boolean;
  isSyncing: boolean;
  
  // Data
  pendingChanges: PendingChange[];
  conflicts: ConflictItem[];
  syncMetadata: SyncMetadata | null;
  
  // Actions
  addChange: (type: PendingChange['type'], entity: string, entityId: string, data: any) => Promise<string>;
  syncNow: () => Promise<{ processed: number; conflicts: number; errors: number }>;
  resolveConflict: (conflictId: string, resolution: 'local' | 'server' | 'merge', mergedData?: any) => Promise<void>;
  resolveAllConflicts: (strategy: ConflictResolutionStrategy) => Promise<void>;
  clearPending: () => Promise<void>;
  
  // Cache
  cacheData: (key: string, data: any, ttlMs?: number) => Promise<void>;
  getCachedData: <T>(key: string) => Promise<T | null>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const success = await offlineSyncManager.init();
      if (success) {
        setIsInitialized(true);
        
        // Load initial data
        const [pending, unresolvedConflicts, metadata] = await Promise.all([
          offlineSyncManager.getPendingChanges(),
          offlineSyncManager.getUnresolvedConflicts(),
          offlineSyncManager.getSyncMetadata()
        ]);
        
        setPendingChanges(pending);
        setConflicts(unresolvedConflicts);
        setSyncMetadata(metadata);
      }
    };

    init();
  }, []);

  // Subscribe to online status changes
  useEffect(() => {
    const unsubscribe = offlineSyncManager.onOnlineStatusChange((online) => {
      setIsOnline(online);
    });

    return unsubscribe;
  }, []);

  // Subscribe to conflict changes
  useEffect(() => {
    const unsubscribe = offlineSyncManager.onConflictsChange((newConflicts) => {
      setConflicts(newConflicts);
    });

    return unsubscribe;
  }, []);

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = offlineSyncManager.onSyncStatusChange((status) => {
      setSyncMetadata(status);
    });

    return unsubscribe;
  }, []);

  // Add pending change
  const addChange = useCallback(async (
    type: PendingChange['type'],
    entity: string,
    entityId: string,
    data: any
  ): Promise<string> => {
    const id = await offlineSyncManager.addPendingChange(type, entity, entityId, data);
    const pending = await offlineSyncManager.getPendingChanges();
    setPendingChanges(pending);
    return id;
  }, []);

  // Sync now
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) {
      return { processed: 0, conflicts: 0, errors: 0 };
    }

    setIsSyncing(true);
    try {
      const result = await offlineSyncManager.processOfflineQueue();
      
      // Refresh data
      const pending = await offlineSyncManager.getPendingChanges();
      setPendingChanges(pending);
      
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing]);

  // Resolve conflict
  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ) => {
    await offlineSyncManager.resolveConflict(conflictId, resolution, mergedData);
    const unresolvedConflicts = await offlineSyncManager.getUnresolvedConflicts();
    setConflicts(unresolvedConflicts);
  }, []);

  // Resolve all conflicts with strategy
  const resolveAllConflicts = useCallback(async (strategy: ConflictResolutionStrategy) => {
    const unresolvedConflicts = await offlineSyncManager.getUnresolvedConflicts();
    
    for (const conflict of unresolvedConflicts) {
      await offlineSyncManager.autoResolveConflict(conflict, strategy);
    }
    
    const remaining = await offlineSyncManager.getUnresolvedConflicts();
    setConflicts(remaining);
  }, []);

  // Clear pending changes
  const clearPending = useCallback(async () => {
    await offlineSyncManager.clearAll();
    setPendingChanges([]);
    setConflicts([]);
  }, []);

  // Cache data
  const cacheData = useCallback(async (key: string, data: any, ttlMs?: number) => {
    await offlineSyncManager.cacheData(key, data, ttlMs);
  }, []);

  // Get cached data
  const getCachedData = useCallback(async <T>(key: string): Promise<T | null> => {
    return offlineSyncManager.getCachedData<T>(key);
  }, []);

  return {
    isOnline,
    isInitialized,
    isSyncing,
    pendingChanges,
    conflicts,
    syncMetadata,
    addChange,
    syncNow,
    resolveConflict,
    resolveAllConflicts,
    clearPending,
    cacheData,
    getCachedData
  };
}

export default useOfflineSync;
