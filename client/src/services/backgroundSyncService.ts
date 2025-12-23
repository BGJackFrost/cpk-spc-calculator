/**
 * Background Sync Service
 * Handles offline data synchronization when connection is restored
 * With conflict detection and resolution support
 */

import { ConflictItem, ResolutionStrategy } from '@/components/ConflictResolutionDialog';

// Types
export interface SyncItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: Record<string, any>;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced' | 'conflict';
  error?: string;
  serverData?: Record<string, any>; // Server data when conflict detected
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  lastSyncTime: number | null;
  lastError: string | null;
}

export interface ConflictResolutionCallback {
  (conflicts: ConflictItem[]): Promise<Map<string, ResolutionStrategy>>;
}

// Storage key
const SYNC_QUEUE_KEY = 'cpk_spc_sync_queue';
const SYNC_STATUS_KEY = 'cpk_spc_sync_status';

// Event emitter for sync events
type SyncEventType = 'status_change' | 'item_synced' | 'item_failed' | 'sync_complete' | 'conflicts_detected';
type SyncEventCallback = (data: any) => void;

class BackgroundSyncService {
  private queue: SyncItem[] = [];
  private status: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    conflictCount: 0,
    lastSyncTime: null,
    lastError: null
  };
  private listeners: Map<SyncEventType, SyncEventCallback[]> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private conflictResolver: ConflictResolutionCallback | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    
    // Load queue from storage
    this.loadQueue();
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Register service worker sync if available
    this.registerServiceWorkerSync();
    
    // Start periodic sync check
    this.startPeriodicSync();
    
    this.isInitialized = true;
    console.log('[BackgroundSync] Initialized');
  }

  // Set conflict resolution callback
  setConflictResolver(resolver: ConflictResolutionCallback) {
    this.conflictResolver = resolver;
    console.log('[BackgroundSync] Conflict resolver registered');
  }

  // Event handling
  on(event: SyncEventType, callback: SyncEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: SyncEventType, callback: SyncEventCallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: SyncEventType, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  // Queue management
  private loadQueue() {
    try {
      const saved = localStorage.getItem(SYNC_QUEUE_KEY);
      if (saved) {
        this.queue = JSON.parse(saved);
        this.updateStatus();
      }
    } catch (e) {
      console.error('[BackgroundSync] Error loading queue:', e);
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
      this.updateStatus();
    } catch (e) {
      console.error('[BackgroundSync] Error saving queue:', e);
    }
  }

  private updateStatus() {
    this.status.pendingCount = this.queue.filter(i => i.status === 'pending').length;
    this.status.failedCount = this.queue.filter(i => i.status === 'failed').length;
    this.status.conflictCount = this.queue.filter(i => i.status === 'conflict').length;
    this.emit('status_change', this.status);
    
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(this.status));
  }

  // Add item to sync queue
  addToQueue(item: Omit<SyncItem, 'id' | 'timestamp' | 'retries' | 'maxRetries' | 'status'>) {
    const syncItem: SyncItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
      status: 'pending'
    };

    this.queue.push(syncItem);
    this.saveQueue();
    
    console.log('[BackgroundSync] Added to queue:', syncItem.id);
    
    // Try to sync immediately if online
    if (this.status.isOnline) {
      this.sync();
    }

    return syncItem.id;
  }

  // Remove item from queue
  removeFromQueue(id: string) {
    const index = this.queue.findIndex(i => i.id === id);
    if (index > -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
    }
  }

  // Get queue status
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  // Get pending items
  getPendingItems(): SyncItem[] {
    return this.queue.filter(i => i.status === 'pending' || i.status === 'failed');
  }

  // Get conflict items
  getConflictItems(): SyncItem[] {
    return this.queue.filter(i => i.status === 'conflict');
  }

  // Get all items
  getAllItems(): SyncItem[] {
    return [...this.queue];
  }

  // Online/offline handlers
  private handleOnline() {
    console.log('[BackgroundSync] Connection restored');
    this.status.isOnline = true;
    this.updateStatus();
    this.sync();
  }

  private handleOffline() {
    console.log('[BackgroundSync] Connection lost');
    this.status.isOnline = false;
    this.updateStatus();
  }

  // Service worker sync registration
  private async registerServiceWorkerSync() {
    if ('serviceWorker' in navigator && 'sync' in window.SyncManager) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-pending-data');
        console.log('[BackgroundSync] Service worker sync registered');
      } catch (e) {
        console.warn('[BackgroundSync] Service worker sync not available:', e);
      }
    }
  }

  // Periodic sync check
  private startPeriodicSync() {
    // Check every 30 seconds
    this.syncInterval = setInterval(() => {
      if (this.status.isOnline && this.status.pendingCount > 0 && !this.status.isSyncing) {
        this.sync();
      }
    }, 30000);
  }

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Detect conflicts between local and server data
  private async detectConflict(item: SyncItem): Promise<{ hasConflict: boolean; serverData?: Record<string, any> }> {
    if (item.type === 'create') {
      // No conflict for new items
      return { hasConflict: false };
    }

    try {
      // Fetch current server data
      const endpoint = this.getEndpoint(item.entity, 'get');
      const response = await fetch(`${endpoint}?id=${item.data.id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        // Item might be deleted on server
        if (response.status === 404) {
          return { hasConflict: true, serverData: null };
        }
        return { hasConflict: false };
      }

      const serverData = await response.json();
      
      // Check if server data has been modified after local change
      const serverTimestamp = serverData.updatedAt || serverData.timestamp || 0;
      const localTimestamp = item.timestamp;

      if (serverTimestamp > localTimestamp) {
        // Server has newer data - potential conflict
        // Check if actual values differ
        const hasChanges = Object.keys(item.data).some(key => {
          if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return false;
          return JSON.stringify(item.data[key]) !== JSON.stringify(serverData[key]);
        });

        if (hasChanges) {
          return { hasConflict: true, serverData };
        }
      }

      return { hasConflict: false };
    } catch (e) {
      console.warn('[BackgroundSync] Error detecting conflict:', e);
      return { hasConflict: false };
    }
  }

  // Convert SyncItems to ConflictItems for dialog
  private convertToConflictItems(items: SyncItem[]): ConflictItem[] {
    return items.map(item => {
      const conflicts: ConflictItem['conflicts'] = [];
      
      if (item.serverData) {
        Object.keys(item.data).forEach(field => {
          if (field === 'id' || field === 'createdAt') return;
          
          const localValue = item.data[field];
          const serverValue = item.serverData![field];
          
          if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
            conflicts.push({
              id: `${item.id}_${field}`,
              entity: item.entity,
              field,
              localValue,
              serverValue,
              localTimestamp: item.timestamp,
              serverTimestamp: item.serverData!.updatedAt || item.serverData!.timestamp || Date.now()
            });
          }
        });
      }

      return {
        id: item.id,
        entity: item.entity,
        entityId: item.data.id,
        entityName: item.data.name || item.data.title || `${item.entity} #${item.data.id}`,
        conflicts,
        localTimestamp: item.timestamp,
        serverTimestamp: item.serverData?.updatedAt || item.serverData?.timestamp || Date.now()
      };
    });
  }

  // Apply resolution to sync item
  private applyResolution(item: SyncItem, strategy: ResolutionStrategy): SyncItem {
    switch (strategy) {
      case 'keep_local':
        // Keep local data as-is, just update timestamp
        item.data.updatedAt = Date.now();
        item.status = 'pending';
        break;
        
      case 'keep_server':
        // Replace with server data
        if (item.serverData) {
          item.data = { ...item.serverData };
        }
        item.status = 'synced'; // Mark as synced since we're using server data
        break;
        
      case 'merge':
        // Merge: server data + local changes for fields that were modified
        if (item.serverData) {
          const merged = { ...item.serverData };
          Object.keys(item.data).forEach(key => {
            if (key === 'id' || key === 'createdAt' || key === 'updatedAt') return;
            // Keep local value if it was explicitly set
            if (item.data[key] !== undefined) {
              merged[key] = item.data[key];
            }
          });
          item.data = merged;
        }
        item.data.updatedAt = Date.now();
        item.status = 'pending';
        break;
    }
    
    item.serverData = undefined;
    return item;
  }

  // Main sync function
  async sync(): Promise<void> {
    if (this.status.isSyncing || !this.status.isOnline) {
      return;
    }

    const pendingItems = this.queue.filter(i => i.status === 'pending' || i.status === 'failed');
    
    if (pendingItems.length === 0) {
      return;
    }

    console.log(`[BackgroundSync] Starting sync of ${pendingItems.length} items`);
    this.status.isSyncing = true;
    this.updateStatus();

    let successCount = 0;
    let failCount = 0;
    const conflictItems: SyncItem[] = [];

    for (const item of pendingItems) {
      try {
        item.status = 'syncing';
        this.saveQueue();

        // Check for conflicts before syncing
        const { hasConflict, serverData } = await this.detectConflict(item);
        
        if (hasConflict) {
          item.status = 'conflict';
          item.serverData = serverData;
          conflictItems.push(item);
          this.saveQueue();
          continue;
        }

        await this.syncItem(item);
        
        item.status = 'synced';
        successCount++;
        this.emit('item_synced', item);
        
        // Remove synced items from queue
        this.removeFromQueue(item.id);
      } catch (error: any) {
        item.retries++;
        item.error = error.message;
        
        if (item.retries >= item.maxRetries) {
          item.status = 'failed';
          failCount++;
          this.emit('item_failed', item);
        } else {
          item.status = 'pending';
        }
        
        this.saveQueue();
        console.error(`[BackgroundSync] Failed to sync ${item.id}:`, error);
      }
    }

    // Handle conflicts if any
    if (conflictItems.length > 0) {
      console.log(`[BackgroundSync] Detected ${conflictItems.length} conflicts`);
      this.emit('conflicts_detected', conflictItems);
      
      // If conflict resolver is set, use it
      if (this.conflictResolver) {
        try {
          const conflictDialogItems = this.convertToConflictItems(conflictItems);
          const resolutions = await this.conflictResolver(conflictDialogItems);
          
          // Apply resolutions
          for (const item of conflictItems) {
            const strategy = resolutions.get(item.id);
            if (strategy) {
              this.applyResolution(item, strategy);
              
              // If resolved to pending, sync again
              if (item.status === 'pending') {
                try {
                  await this.syncItem(item);
                  item.status = 'synced';
                  successCount++;
                  this.removeFromQueue(item.id);
                } catch (e) {
                  item.status = 'failed';
                  failCount++;
                }
              } else if (item.status === 'synced') {
                // Keep server data - just remove from queue
                this.removeFromQueue(item.id);
                successCount++;
              }
            }
          }
          
          this.saveQueue();
        } catch (e) {
          console.error('[BackgroundSync] Error resolving conflicts:', e);
        }
      }
    }

    this.status.isSyncing = false;
    this.status.lastSyncTime = Date.now();
    this.status.lastError = failCount > 0 ? `${failCount} items failed to sync` : null;
    this.updateStatus();

    this.emit('sync_complete', { success: successCount, failed: failCount, conflicts: conflictItems.length });
    console.log(`[BackgroundSync] Sync complete: ${successCount} success, ${failCount} failed, ${conflictItems.length} conflicts`);
  }

  // Sync individual item
  private async syncItem(item: SyncItem): Promise<void> {
    const endpoint = this.getEndpoint(item.entity, item.type);
    const method = this.getMethod(item.type);

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: item.type !== 'delete' ? JSON.stringify(item.data) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Get API endpoint for entity
  private getEndpoint(entity: string, type: string): string {
    const baseUrl = '/api/trpc';
    
    // Map entity to tRPC procedure
    const entityMap: Record<string, Record<string, string>> = {
      'spc_measurement': {
        'create': 'spc.createMeasurement',
        'update': 'spc.updateMeasurement',
        'delete': 'spc.deleteMeasurement',
        'get': 'spc.getMeasurement'
      },
      'oee_data': {
        'create': 'oee.createRecord',
        'update': 'oee.updateRecord',
        'delete': 'oee.deleteRecord',
        'get': 'oee.getRecord'
      },
      'machine_status': {
        'create': 'machine.createStatus',
        'update': 'machine.updateStatus',
        'delete': 'machine.deleteStatus',
        'get': 'machine.getStatus'
      },
      'alert': {
        'create': 'alert.create',
        'update': 'alert.update',
        'delete': 'alert.delete',
        'get': 'alert.get'
      },
      'report': {
        'create': 'report.create',
        'update': 'report.update',
        'delete': 'report.delete',
        'get': 'report.get'
      }
    };

    const procedure = entityMap[entity]?.[type] || `${entity}.${type}`;
    return `${baseUrl}/${procedure}`;
  }

  // Get HTTP method for operation type
  private getMethod(type: string): string {
    switch (type) {
      case 'create':
        return 'POST';
      case 'update':
        return 'PUT';
      case 'delete':
        return 'DELETE';
      case 'get':
        return 'GET';
      default:
        return 'POST';
    }
  }

  // Retry failed items
  async retryFailed(): Promise<void> {
    const failedItems = this.queue.filter(i => i.status === 'failed');
    
    for (const item of failedItems) {
      item.status = 'pending';
      item.retries = 0;
      item.error = undefined;
    }
    
    this.saveQueue();
    await this.sync();
  }

  // Resolve conflicts manually
  async resolveConflicts(resolutions: Map<string, ResolutionStrategy>): Promise<void> {
    const conflictItems = this.queue.filter(i => i.status === 'conflict');
    
    for (const item of conflictItems) {
      const strategy = resolutions.get(item.id);
      if (strategy) {
        this.applyResolution(item, strategy);
      }
    }
    
    this.saveQueue();
    
    // Sync resolved items
    await this.sync();
  }

  // Clear all failed items
  clearFailed() {
    this.queue = this.queue.filter(i => i.status !== 'failed');
    this.saveQueue();
  }

  // Clear all conflict items
  clearConflicts() {
    this.queue = this.queue.filter(i => i.status !== 'conflict');
    this.saveQueue();
  }

  // Clear all items
  clearAll() {
    this.queue = [];
    this.saveQueue();
  }

  // Force sync
  async forceSync(): Promise<void> {
    if (!this.status.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.sync();
  }
}

// Singleton instance
export const backgroundSync = new BackgroundSyncService();

export default backgroundSync;
