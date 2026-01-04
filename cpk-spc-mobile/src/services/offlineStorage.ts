import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const CACHE_PREFIX = '@cpk_spc_cache_';
const CACHE_METADATA_KEY = '@cpk_spc_cache_metadata';
const PENDING_SYNC_KEY = '@cpk_spc_pending_sync';

// Cache expiration times (in milliseconds)
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 30 * 60 * 1000,    // 30 minutes
  LONG: 2 * 60 * 60 * 1000,  // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
};

// Data types for caching
export type CacheDataType = 
  | 'cpk_data'
  | 'oee_data'
  | 'spc_data'
  | 'histogram_data'
  | 'alerts'
  | 'dashboard'
  | 'production_lines'
  | 'products'
  | 'user_settings';

interface CacheMetadata {
  key: string;
  dataType: CacheDataType;
  timestamp: number;
  ttl: number;
  size: number;
}

interface CacheEntry<T> {
  data: T;
  metadata: CacheMetadata;
}

interface PendingSyncItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  dataType: string;
  data: any;
  timestamp: number;
}

/**
 * Get cache key for a specific data type and identifier
 */
const getCacheKey = (dataType: CacheDataType, identifier?: string): string => {
  return `${CACHE_PREFIX}${dataType}${identifier ? `_${identifier}` : ''}`;
};

/**
 * Get all cache metadata
 */
export const getCacheMetadata = async (): Promise<CacheMetadata[]> => {
  try {
    const metadataStr = await AsyncStorage.getItem(CACHE_METADATA_KEY);
    return metadataStr ? JSON.parse(metadataStr) : [];
  } catch (error) {
    console.error('Error getting cache metadata:', error);
    return [];
  }
};

/**
 * Update cache metadata
 */
const updateCacheMetadata = async (metadata: CacheMetadata): Promise<void> => {
  try {
    const allMetadata = await getCacheMetadata();
    const existingIndex = allMetadata.findIndex(m => m.key === metadata.key);
    
    if (existingIndex >= 0) {
      allMetadata[existingIndex] = metadata;
    } else {
      allMetadata.push(metadata);
    }
    
    await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(allMetadata));
  } catch (error) {
    console.error('Error updating cache metadata:', error);
  }
};

/**
 * Remove cache metadata entry
 */
const removeCacheMetadata = async (key: string): Promise<void> => {
  try {
    const allMetadata = await getCacheMetadata();
    const filtered = allMetadata.filter(m => m.key !== key);
    await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing cache metadata:', error);
  }
};

/**
 * Cache data with automatic expiration
 */
export const cacheData = async <T>(
  dataType: CacheDataType,
  data: T,
  identifier?: string,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<void> => {
  try {
    const key = getCacheKey(dataType, identifier);
    const dataStr = JSON.stringify(data);
    
    const entry: CacheEntry<T> = {
      data,
      metadata: {
        key,
        dataType,
        timestamp: Date.now(),
        ttl,
        size: dataStr.length,
      },
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    await updateCacheMetadata(entry.metadata);
  } catch (error) {
    console.error('Error caching data:', error);
    throw error;
  }
};

/**
 * Get cached data if not expired
 */
export const getCachedData = async <T>(
  dataType: CacheDataType,
  identifier?: string
): Promise<T | null> => {
  try {
    const key = getCacheKey(dataType, identifier);
    const entryStr = await AsyncStorage.getItem(key);
    
    if (!entryStr) return null;
    
    const entry: CacheEntry<T> = JSON.parse(entryStr);
    const now = Date.now();
    const isExpired = now - entry.metadata.timestamp > entry.metadata.ttl;
    
    if (isExpired) {
      // Clean up expired cache
      await removeCachedData(dataType, identifier);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
};

/**
 * Get cached data even if expired (for offline mode)
 */
export const getCachedDataForOffline = async <T>(
  dataType: CacheDataType,
  identifier?: string
): Promise<{ data: T | null; isStale: boolean; cachedAt: number | null }> => {
  try {
    const key = getCacheKey(dataType, identifier);
    const entryStr = await AsyncStorage.getItem(key);
    
    if (!entryStr) {
      return { data: null, isStale: false, cachedAt: null };
    }
    
    const entry: CacheEntry<T> = JSON.parse(entryStr);
    const now = Date.now();
    const isStale = now - entry.metadata.timestamp > entry.metadata.ttl;
    
    return {
      data: entry.data,
      isStale,
      cachedAt: entry.metadata.timestamp,
    };
  } catch (error) {
    console.error('Error getting cached data for offline:', error);
    return { data: null, isStale: false, cachedAt: null };
  }
};

/**
 * Remove cached data
 */
export const removeCachedData = async (
  dataType: CacheDataType,
  identifier?: string
): Promise<void> => {
  try {
    const key = getCacheKey(dataType, identifier);
    await AsyncStorage.removeItem(key);
    await removeCacheMetadata(key);
  } catch (error) {
    console.error('Error removing cached data:', error);
  }
};

/**
 * Clear all cached data of a specific type
 */
export const clearCacheByType = async (dataType: CacheDataType): Promise<void> => {
  try {
    const allMetadata = await getCacheMetadata();
    const keysToRemove = allMetadata
      .filter(m => m.dataType === dataType)
      .map(m => m.key);
    
    await AsyncStorage.multiRemove(keysToRemove);
    
    const remainingMetadata = allMetadata.filter(m => m.dataType !== dataType);
    await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(remainingMetadata));
  } catch (error) {
    console.error('Error clearing cache by type:', error);
  }
};

/**
 * Clear all expired cache entries
 */
export const clearExpiredCache = async (): Promise<number> => {
  try {
    const allMetadata = await getCacheMetadata();
    const now = Date.now();
    
    const expiredKeys = allMetadata
      .filter(m => now - m.timestamp > m.ttl)
      .map(m => m.key);
    
    if (expiredKeys.length > 0) {
      await AsyncStorage.multiRemove(expiredKeys);
      
      const remainingMetadata = allMetadata.filter(
        m => !expiredKeys.includes(m.key)
      );
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(remainingMetadata));
    }
    
    return expiredKeys.length;
  } catch (error) {
    console.error('Error clearing expired cache:', error);
    return 0;
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    const allMetadata = await getCacheMetadata();
    const keysToRemove = allMetadata.map(m => m.key);
    
    await AsyncStorage.multiRemove([...keysToRemove, CACHE_METADATA_KEY]);
  } catch (error) {
    console.error('Error clearing all cache:', error);
  }
};

/**
 * Get total cache size
 */
export const getCacheSize = async (): Promise<number> => {
  try {
    const allMetadata = await getCacheMetadata();
    return allMetadata.reduce((total, m) => total + m.size, 0);
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
};

/**
 * Format cache size for display
 */
export const formatCacheSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ============ Pending Sync Queue ============

/**
 * Add item to pending sync queue (for offline changes)
 */
export const addToPendingSync = async (
  action: 'create' | 'update' | 'delete',
  dataType: string,
  data: any
): Promise<void> => {
  try {
    const pendingItems = await getPendingSyncItems();
    
    const newItem: PendingSyncItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      dataType,
      data,
      timestamp: Date.now(),
    };
    
    pendingItems.push(newItem);
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingItems));
  } catch (error) {
    console.error('Error adding to pending sync:', error);
  }
};

/**
 * Get all pending sync items
 */
export const getPendingSyncItems = async (): Promise<PendingSyncItem[]> => {
  try {
    const itemsStr = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    return itemsStr ? JSON.parse(itemsStr) : [];
  } catch (error) {
    console.error('Error getting pending sync items:', error);
    return [];
  }
};

/**
 * Remove item from pending sync queue
 */
export const removePendingSyncItem = async (id: string): Promise<void> => {
  try {
    const pendingItems = await getPendingSyncItems();
    const filtered = pendingItems.filter(item => item.id !== id);
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing pending sync item:', error);
  }
};

/**
 * Clear all pending sync items
 */
export const clearPendingSync = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);
  } catch (error) {
    console.error('Error clearing pending sync:', error);
  }
};

/**
 * Get pending sync count
 */
export const getPendingSyncCount = async (): Promise<number> => {
  const items = await getPendingSyncItems();
  return items.length;
};

// ============ Specific Data Caching Helpers ============

/**
 * Cache CPK chart data
 */
export const cacheCpkData = async (
  productionLineId: string,
  data: any
): Promise<void> => {
  await cacheData('cpk_data', data, productionLineId, CACHE_TTL.MEDIUM);
};

/**
 * Get cached CPK chart data
 */
export const getCachedCpkData = async (
  productionLineId: string
): Promise<any | null> => {
  return getCachedData('cpk_data', productionLineId);
};

/**
 * Cache OEE chart data
 */
export const cacheOeeData = async (
  productionLineId: string,
  data: any
): Promise<void> => {
  await cacheData('oee_data', data, productionLineId, CACHE_TTL.MEDIUM);
};

/**
 * Get cached OEE chart data
 */
export const getCachedOeeData = async (
  productionLineId: string
): Promise<any | null> => {
  return getCachedData('oee_data', productionLineId);
};

/**
 * Cache SPC chart data
 */
export const cacheSpcData = async (
  planId: string,
  data: any
): Promise<void> => {
  await cacheData('spc_data', data, planId, CACHE_TTL.MEDIUM);
};

/**
 * Get cached SPC chart data
 */
export const getCachedSpcData = async (
  planId: string
): Promise<any | null> => {
  return getCachedData('spc_data', planId);
};

/**
 * Cache alerts
 */
export const cacheAlerts = async (alerts: any[]): Promise<void> => {
  await cacheData('alerts', alerts, undefined, CACHE_TTL.SHORT);
};

/**
 * Get cached alerts
 */
export const getCachedAlerts = async (): Promise<any[] | null> => {
  return getCachedData('alerts');
};

/**
 * Cache dashboard data
 */
export const cacheDashboardData = async (data: any): Promise<void> => {
  await cacheData('dashboard', data, undefined, CACHE_TTL.SHORT);
};

/**
 * Get cached dashboard data
 */
export const getCachedDashboardData = async (): Promise<any | null> => {
  return getCachedData('dashboard');
};

export default {
  cacheData,
  getCachedData,
  getCachedDataForOffline,
  removeCachedData,
  clearCacheByType,
  clearExpiredCache,
  clearAllCache,
  getCacheSize,
  formatCacheSize,
  getCacheMetadata,
  addToPendingSync,
  getPendingSyncItems,
  removePendingSyncItem,
  clearPendingSync,
  getPendingSyncCount,
  cacheCpkData,
  getCachedCpkData,
  cacheOeeData,
  getCachedOeeData,
  cacheSpcData,
  getCachedSpcData,
  cacheAlerts,
  getCachedAlerts,
  cacheDashboardData,
  getCachedDashboardData,
  CACHE_TTL,
};
