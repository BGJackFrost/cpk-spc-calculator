/**
 * Background Sync Service
 * Handles offline data synchronization when connection is restored
 */

// Types
export interface SyncItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: Record<string, any>;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  error?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTime: number | null;
  lastError: string | null;
}

// Storage key
const SYNC_QUEUE_KEY = 'cpk_spc_sync_queue';
const SYNC_STATUS_KEY = 'cpk_spc_sync_status';

// Event emitter for sync events
type SyncEventType = 'status_change' | 'item_synced' | 'item_failed' | 'sync_complete';
type SyncEventCallback = (data: any) => void;

class BackgroundSyncService {
  private queue: SyncItem[] = [];
  private status: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSyncTime: null,
    lastError: null
  };
  private listeners: Map<SyncEventType, SyncEventCallback[]> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

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

    for (const item of pendingItems) {
      try {
        item.status = 'syncing';
        this.saveQueue();

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

    this.status.isSyncing = false;
    this.status.lastSyncTime = Date.now();
    this.status.lastError = failCount > 0 ? `${failCount} items failed to sync` : null;
    this.updateStatus();

    this.emit('sync_complete', { success: successCount, failed: failCount });
    console.log(`[BackgroundSync] Sync complete: ${successCount} success, ${failCount} failed`);
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
    const entityMap: Record<string, string> = {
      'spc_measurement': 'spc.createMeasurement',
      'oee_data': 'oee.createRecord',
      'machine_status': 'machine.updateStatus',
      'alert': 'alert.create',
      'report': 'report.create'
    };

    const procedure = entityMap[entity] || `${entity}.${type}`;
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

  // Clear all failed items
  clearFailed() {
    this.queue = this.queue.filter(i => i.status !== 'failed');
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
