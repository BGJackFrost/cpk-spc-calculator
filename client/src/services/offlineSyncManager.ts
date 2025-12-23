/**
 * Offline Sync Manager
 * Manages offline data storage and sync with conflict resolution for mobile
 */

// IndexedDB configuration
const DB_NAME = 'cpk_spc_offline_db';
const DB_VERSION = 1;
const STORES = {
  PENDING_CHANGES: 'pending_changes',
  CONFLICT_QUEUE: 'conflict_queue',
  SYNC_METADATA: 'sync_metadata',
  CACHED_DATA: 'cached_data'
};

// Types
export interface PendingChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface ConflictItem {
  id: string;
  pendingChange: PendingChange;
  serverData: any;
  localData: any;
  detectedAt: number;
  resolved: boolean;
  resolution?: 'local' | 'server' | 'merge';
  mergedData?: any;
}

export interface SyncMetadata {
  lastSyncAt: number;
  lastSuccessfulSync: number;
  pendingCount: number;
  conflictCount: number;
  isOnline: boolean;
}

// Conflict resolution strategies
export type ConflictResolutionStrategy = 'local_wins' | 'server_wins' | 'newest_wins' | 'manual';

class OfflineSyncManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private onlineStatusListeners: Set<(isOnline: boolean) => void> = new Set();
  private conflictListeners: Set<(conflicts: ConflictItem[]) => void> = new Set();
  private syncStatusListeners: Set<(status: SyncMetadata) => void> = new Set();
  private defaultStrategy: ConflictResolutionStrategy = 'manual';

  constructor() {
    this.initOnlineListener();
  }

  // Initialize IndexedDB
  async init(): Promise<boolean> {
    if (this.isInitialized && this.db) return true;

    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineSyncManager] Failed to open IndexedDB');
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[OfflineSyncManager] IndexedDB initialized');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Pending changes store
        if (!db.objectStoreNames.contains(STORES.PENDING_CHANGES)) {
          const pendingStore = db.createObjectStore(STORES.PENDING_CHANGES, { keyPath: 'id' });
          pendingStore.createIndex('entity', 'entity', { unique: false });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Conflict queue store
        if (!db.objectStoreNames.contains(STORES.CONFLICT_QUEUE)) {
          const conflictStore = db.createObjectStore(STORES.CONFLICT_QUEUE, { keyPath: 'id' });
          conflictStore.createIndex('resolved', 'resolved', { unique: false });
          conflictStore.createIndex('detectedAt', 'detectedAt', { unique: false });
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains(STORES.SYNC_METADATA)) {
          db.createObjectStore(STORES.SYNC_METADATA, { keyPath: 'key' });
        }

        // Cached data store
        if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
          const cacheStore = db.createObjectStore(STORES.CACHED_DATA, { keyPath: 'key' });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  // Initialize online/offline listener
  private initOnlineListener(): void {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      this.notifyOnlineStatus(isOnline);
      
      if (isOnline) {
        // Trigger sync when coming back online
        this.processOfflineQueue();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  // Notify online status listeners
  private notifyOnlineStatus(isOnline: boolean): void {
    this.onlineStatusListeners.forEach(listener => listener(isOnline));
  }

  // Notify conflict listeners
  private notifyConflicts(conflicts: ConflictItem[]): void {
    this.conflictListeners.forEach(listener => listener(conflicts));
  }

  // Notify sync status listeners
  private notifySyncStatus(status: SyncMetadata): void {
    this.syncStatusListeners.forEach(listener => listener(status));
  }

  // Subscribe to online status changes
  onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
    this.onlineStatusListeners.add(callback);
    return () => this.onlineStatusListeners.delete(callback);
  }

  // Subscribe to conflict changes
  onConflictsChange(callback: (conflicts: ConflictItem[]) => void): () => void {
    this.conflictListeners.add(callback);
    return () => this.conflictListeners.delete(callback);
  }

  // Subscribe to sync status changes
  onSyncStatusChange(callback: (status: SyncMetadata) => void): () => void {
    this.syncStatusListeners.add(callback);
    return () => this.syncStatusListeners.delete(callback);
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add pending change
  async addPendingChange(
    type: PendingChange['type'],
    entity: string,
    entityId: string,
    data: any
  ): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const change: PendingChange = {
      id: this.generateId(),
      type,
      entity,
      entityId,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PENDING_CHANGES], 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_CHANGES);
      const request = store.add(change);

      request.onsuccess = () => {
        console.log('[OfflineSyncManager] Added pending change:', change.id);
        this.updateSyncMetadata();
        resolve(change.id);
      };

      request.onerror = () => {
        console.error('[OfflineSyncManager] Failed to add pending change');
        reject(new Error('Failed to add pending change'));
      };
    });
  }

  // Get all pending changes
  async getPendingChanges(): Promise<PendingChange[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORES.PENDING_CHANGES], 'readonly');
      const store = transaction.objectStore(STORES.PENDING_CHANGES);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  }

  // Remove pending change
  async removePendingChange(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORES.PENDING_CHANGES], 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_CHANGES);
      store.delete(id);

      transaction.oncomplete = () => {
        this.updateSyncMetadata();
        resolve();
      };
    });
  }

  // Add conflict to queue
  async addConflict(
    pendingChange: PendingChange,
    serverData: any,
    localData: any
  ): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const conflict: ConflictItem = {
      id: this.generateId(),
      pendingChange,
      serverData,
      localData,
      detectedAt: Date.now(),
      resolved: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CONFLICT_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.CONFLICT_QUEUE);
      const request = store.add(conflict);

      request.onsuccess = () => {
        console.log('[OfflineSyncManager] Added conflict:', conflict.id);
        this.getUnresolvedConflicts().then(conflicts => {
          this.notifyConflicts(conflicts);
        });
        this.updateSyncMetadata();
        resolve(conflict.id);
      };

      request.onerror = () => {
        reject(new Error('Failed to add conflict'));
      };
    });
  }

  // Get unresolved conflicts
  async getUnresolvedConflicts(): Promise<ConflictItem[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORES.CONFLICT_QUEUE], 'readonly');
      const store = transaction.objectStore(STORES.CONFLICT_QUEUE);
      const index = store.index('resolved');
      const request = index.getAll(IDBKeyRange.only(false));

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  }

  // Resolve conflict
  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CONFLICT_QUEUE], 'readwrite');
      const store = transaction.objectStore(STORES.CONFLICT_QUEUE);
      const getRequest = store.get(conflictId);

      getRequest.onsuccess = () => {
        const conflict = getRequest.result as ConflictItem;
        if (!conflict) {
          reject(new Error('Conflict not found'));
          return;
        }

        conflict.resolved = true;
        conflict.resolution = resolution;
        if (mergedData) {
          conflict.mergedData = mergedData;
        }

        const updateRequest = store.put(conflict);
        updateRequest.onsuccess = () => {
          console.log('[OfflineSyncManager] Resolved conflict:', conflictId, resolution);
          this.getUnresolvedConflicts().then(conflicts => {
            this.notifyConflicts(conflicts);
          });
          this.updateSyncMetadata();
          resolve();
        };
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to resolve conflict'));
      };
    });
  }

  // Auto-resolve conflict based on strategy
  async autoResolveConflict(conflict: ConflictItem, strategy?: ConflictResolutionStrategy): Promise<any> {
    const resolveStrategy = strategy || this.defaultStrategy;

    switch (resolveStrategy) {
      case 'local_wins':
        await this.resolveConflict(conflict.id, 'local');
        return conflict.localData;

      case 'server_wins':
        await this.resolveConflict(conflict.id, 'server');
        return conflict.serverData;

      case 'newest_wins':
        const localTimestamp = conflict.pendingChange.timestamp;
        const serverTimestamp = conflict.serverData?.updatedAt || 0;
        
        if (localTimestamp > serverTimestamp) {
          await this.resolveConflict(conflict.id, 'local');
          return conflict.localData;
        } else {
          await this.resolveConflict(conflict.id, 'server');
          return conflict.serverData;
        }

      case 'manual':
      default:
        // Don't auto-resolve, return null to indicate manual resolution needed
        return null;
    }
  }

  // Process offline queue when back online
  async processOfflineQueue(): Promise<{
    processed: number;
    conflicts: number;
    errors: number;
  }> {
    if (!navigator.onLine) {
      return { processed: 0, conflicts: 0, errors: 0 };
    }

    const pendingChanges = await this.getPendingChanges();
    let processed = 0;
    let conflicts = 0;
    let errors = 0;

    for (const change of pendingChanges) {
      try {
        const result = await this.syncChange(change);
        
        if (result.success) {
          await this.removePendingChange(change.id);
          processed++;
        } else if (result.conflict) {
          await this.addConflict(change, result.serverData, change.data);
          conflicts++;
        } else {
          // Update retry count
          change.retryCount++;
          change.lastError = result.error;
          await this.updatePendingChange(change);
          errors++;
        }
      } catch (error) {
        console.error('[OfflineSyncManager] Error processing change:', error);
        errors++;
      }
    }

    // Notify status update
    this.updateSyncMetadata();

    return { processed, conflicts, errors };
  }

  // Sync a single change to server
  private async syncChange(change: PendingChange): Promise<{
    success: boolean;
    conflict?: boolean;
    serverData?: any;
    error?: string;
  }> {
    // This would be implemented to call actual API endpoints
    // For now, return a mock implementation
    try {
      // Simulate API call
      const response = await fetch(`/api/trpc/${change.entity}.sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: change.type,
          entityId: change.entityId,
          data: change.data,
          timestamp: change.timestamp
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.conflict) {
          return {
            success: false,
            conflict: true,
            serverData: result.serverData
          };
        }
        
        return { success: true };
      } else if (response.status === 409) {
        // Conflict detected
        const result = await response.json();
        return {
          success: false,
          conflict: true,
          serverData: result.serverData
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Update pending change
  private async updatePendingChange(change: PendingChange): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORES.PENDING_CHANGES], 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_CHANGES);
      store.put(change);

      transaction.oncomplete = () => resolve();
    });
  }

  // Update sync metadata
  private async updateSyncMetadata(): Promise<void> {
    if (!this.db) return;

    const pendingChanges = await this.getPendingChanges();
    const conflicts = await this.getUnresolvedConflicts();

    const metadata: SyncMetadata = {
      lastSyncAt: Date.now(),
      lastSuccessfulSync: Date.now(),
      pendingCount: pendingChanges.length,
      conflictCount: conflicts.length,
      isOnline: navigator.onLine
    };

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORES.SYNC_METADATA], 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_METADATA);
      store.put({ key: 'sync_status', ...metadata });

      transaction.oncomplete = () => {
        this.notifySyncStatus(metadata);
        resolve();
      };
    });
  }

  // Get sync metadata
  async getSyncMetadata(): Promise<SyncMetadata | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORES.SYNC_METADATA], 'readonly');
      const store = transaction.objectStore(STORES.SYNC_METADATA);
      const request = store.get('sync_status');

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  // Cache data for offline access
  async cacheData(key: string, data: any, ttlMs: number = 3600000): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORES.CACHED_DATA], 'readwrite');
      const store = transaction.objectStore(STORES.CACHED_DATA);
      store.put({
        key,
        data,
        cachedAt: Date.now(),
        expiresAt: Date.now() + ttlMs
      });

      transaction.oncomplete = () => resolve();
    });
  }

  // Get cached data
  async getCachedData<T>(key: string): Promise<T | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORES.CACHED_DATA], 'readonly');
      const store = transaction.objectStore(STORES.CACHED_DATA);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expiresAt > Date.now()) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  // Clear expired cache
  async clearExpiredCache(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORES.CACHED_DATA], 'readwrite');
      const store = transaction.objectStore(STORES.CACHED_DATA);
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(Date.now());
      const request = index.openCursor(range);
      let deleted = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        resolve(deleted);
      };
    });
  }

  // Clear all offline data
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(
        [STORES.PENDING_CHANGES, STORES.CONFLICT_QUEUE, STORES.CACHED_DATA],
        'readwrite'
      );

      transaction.objectStore(STORES.PENDING_CHANGES).clear();
      transaction.objectStore(STORES.CONFLICT_QUEUE).clear();
      transaction.objectStore(STORES.CACHED_DATA).clear();

      transaction.oncomplete = () => {
        this.updateSyncMetadata();
        resolve();
      };
    });
  }

  // Set default conflict resolution strategy
  setDefaultStrategy(strategy: ConflictResolutionStrategy): void {
    this.defaultStrategy = strategy;
  }

  // Check if online
  isOnline(): boolean {
    return navigator.onLine;
  }
}

// Singleton instance
export const offlineSyncManager = new OfflineSyncManager();

export default offlineSyncManager;
