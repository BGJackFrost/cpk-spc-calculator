/**
 * useConflictResolution - Hook for managing data conflict detection and resolution
 */

import { useState, useCallback } from 'react';
import { ConflictItem, ResolutionStrategy } from '@/components/ConflictResolutionDialog';

// Types
export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: ConflictItem[];
}

export interface ResolvedData {
  id: string;
  data: Record<string, any>;
  strategy: ResolutionStrategy;
}

// Storage key for conflict history
const CONFLICT_HISTORY_KEY = 'cpk_spc_conflict_history';

export function useConflictResolution() {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingResolve, setPendingResolve] = useState<((resolved: ResolvedData[]) => void) | null>(null);

  // Detect conflicts between local and server data
  const detectConflicts = useCallback((
    localData: Record<string, any>[],
    serverData: Record<string, any>[],
    entityType: string,
    idField: string = 'id',
    nameField: string = 'name'
  ): ConflictDetectionResult => {
    const detectedConflicts: ConflictItem[] = [];

    localData.forEach((localItem) => {
      const serverId = localItem[idField];
      const serverItem = serverData.find(s => s[idField] === serverId);

      if (serverItem) {
        // Check for field-level conflicts
        const fieldConflicts: ConflictItem['conflicts'] = [];

        Object.keys(localItem).forEach((field) => {
          if (field === idField || field === 'createdAt') return;

          const localValue = localItem[field];
          const serverValue = serverItem[field];

          // Check if values are different
          if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
            fieldConflicts.push({
              id: `${serverId}_${field}`,
              entity: entityType,
              field,
              localValue,
              serverValue,
              localTimestamp: localItem.updatedAt || localItem.timestamp || Date.now(),
              serverTimestamp: serverItem.updatedAt || serverItem.timestamp || Date.now()
            });
          }
        });

        if (fieldConflicts.length > 0) {
          detectedConflicts.push({
            id: `conflict_${serverId}`,
            entity: entityType,
            entityId: serverId,
            entityName: localItem[nameField] || `${entityType} #${serverId}`,
            conflicts: fieldConflicts,
            localTimestamp: localItem.updatedAt || Date.now(),
            serverTimestamp: serverItem.updatedAt || Date.now()
          });
        }
      }
    });

    return {
      hasConflicts: detectedConflicts.length > 0,
      conflicts: detectedConflicts
    };
  }, []);

  // Open conflict resolution dialog
  const openConflictDialog = useCallback((
    conflictItems: ConflictItem[],
    onResolved: (resolved: ResolvedData[]) => void
  ) => {
    setConflicts(conflictItems);
    setPendingResolve(() => onResolved);
    setIsDialogOpen(true);
  }, []);

  // Handle resolution from dialog
  const handleResolve = useCallback((resolutions: Map<string, ResolutionStrategy>) => {
    const resolvedData: ResolvedData[] = [];

    conflicts.forEach((conflict) => {
      const strategy = resolutions.get(conflict.id);
      if (!strategy) return;

      // Build resolved data based on strategy
      const resolved: Record<string, any> = { id: conflict.entityId };

      conflict.conflicts.forEach((fieldConflict) => {
        switch (strategy) {
          case 'keep_local':
            resolved[fieldConflict.field] = fieldConflict.localValue;
            break;
          case 'keep_server':
            resolved[fieldConflict.field] = fieldConflict.serverValue;
            break;
          case 'merge':
            // For merge, prefer server value but keep local if server is null/undefined
            resolved[fieldConflict.field] = fieldConflict.serverValue ?? fieldConflict.localValue;
            break;
        }
      });

      resolvedData.push({
        id: conflict.entityId,
        data: resolved,
        strategy
      });
    });

    // Save to history
    saveConflictHistory(resolvedData);

    // Call pending resolve callback
    if (pendingResolve) {
      pendingResolve(resolvedData);
    }

    // Close dialog
    setIsDialogOpen(false);
    setConflicts([]);
    setPendingResolve(null);
  }, [conflicts, pendingResolve]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setIsDialogOpen(false);
    setConflicts([]);
    setPendingResolve(null);
  }, []);

  // Save conflict resolution history
  const saveConflictHistory = (resolved: ResolvedData[]) => {
    try {
      const history = getConflictHistory();
      history.push({
        timestamp: Date.now(),
        resolutions: resolved
      });
      
      // Keep only last 100 entries
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      
      localStorage.setItem(CONFLICT_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('[ConflictResolution] Error saving history:', e);
    }
  };

  // Get conflict resolution history
  const getConflictHistory = (): Array<{ timestamp: number; resolutions: ResolvedData[] }> => {
    try {
      const saved = localStorage.getItem(CONFLICT_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  };

  // Auto-resolve conflicts using last used strategy for same entity type
  const autoResolve = useCallback((
    conflictItems: ConflictItem[],
    defaultStrategy: ResolutionStrategy = 'keep_server'
  ): ResolvedData[] => {
    const history = getConflictHistory();
    const resolvedData: ResolvedData[] = [];

    conflictItems.forEach((conflict) => {
      // Find last resolution for same entity type
      let strategy = defaultStrategy;
      
      for (let i = history.length - 1; i >= 0; i--) {
        const entry = history[i];
        const match = entry.resolutions.find(r => 
          conflict.entity === conflictItems.find(c => c.entityId === r.id)?.entity
        );
        if (match) {
          strategy = match.strategy;
          break;
        }
      }

      // Build resolved data
      const resolved: Record<string, any> = { id: conflict.entityId };

      conflict.conflicts.forEach((fieldConflict) => {
        switch (strategy) {
          case 'keep_local':
            resolved[fieldConflict.field] = fieldConflict.localValue;
            break;
          case 'keep_server':
            resolved[fieldConflict.field] = fieldConflict.serverValue;
            break;
          case 'merge':
            resolved[fieldConflict.field] = fieldConflict.serverValue ?? fieldConflict.localValue;
            break;
        }
      });

      resolvedData.push({
        id: conflict.entityId,
        data: resolved,
        strategy
      });
    });

    return resolvedData;
  }, []);

  return {
    conflicts,
    isDialogOpen,
    detectConflicts,
    openConflictDialog,
    handleResolve,
    handleCancel,
    autoResolve,
    getConflictHistory
  };
}

export default useConflictResolution;
