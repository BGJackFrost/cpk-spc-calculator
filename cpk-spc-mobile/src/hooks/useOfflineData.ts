import { useState, useEffect, useCallback } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import {
  cacheData,
  getCachedData,
  getCachedDataForOffline,
  CacheDataType,
  CACHE_TTL,
} from '../services/offlineStorage';
import { trpcCall, ApiResponse } from '../services/api';

interface UseOfflineDataOptions<T> {
  dataType: CacheDataType;
  identifier?: string;
  ttl?: number;
  fetchFn: () => Promise<ApiResponse<T>>;
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseOfflineDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  isOffline: boolean;
  error: string | null;
  cachedAt: number | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage data with offline support
 * Automatically caches data and serves from cache when offline
 */
export function useOfflineData<T>({
  dataType,
  identifier,
  ttl = CACHE_TTL.MEDIUM,
  fetchFn,
  enabled = true,
  refetchInterval,
}: UseOfflineDataOptions<T>): UseOfflineDataResult<T> {
  const { isConnected, isInternetReachable } = useNetwork();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  const isOffline = !isConnected || isInternetReachable === false;

  // Fetch data from API and cache it
  const fetchAndCache = useCallback(async () => {
    try {
      const response = await fetchFn();
      
      if (response.success && response.data) {
        setData(response.data);
        setIsStale(false);
        setError(null);
        setCachedAt(Date.now());
        
        // Cache the data
        await cacheData(dataType, response.data, identifier, ttl);
      } else {
        setError(response.error || 'Failed to fetch data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    }
  }, [fetchFn, dataType, identifier, ttl]);

  // Load from cache (for offline or initial load)
  const loadFromCache = useCallback(async () => {
    const cached = await getCachedDataForOffline<T>(dataType, identifier);
    
    if (cached.data) {
      setData(cached.data);
      setIsStale(cached.isStale);
      setCachedAt(cached.cachedAt);
    }
    
    return cached.data !== null;
  }, [dataType, identifier]);

  // Main fetch function
  const refetch = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isOffline) {
        // Offline: load from cache only
        const hasCache = await loadFromCache();
        if (!hasCache) {
          setError('Không có dữ liệu offline');
        }
      } else {
        // Online: try to fetch fresh data
        await fetchAndCache();
      }
    } catch (err: any) {
      // If fetch fails, try to load from cache
      const hasCache = await loadFromCache();
      if (!hasCache) {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isOffline, loadFromCache, fetchAndCache]);

  // Initial load
  useEffect(() => {
    refetch();
  }, [enabled, isOffline]);

  // Auto-refetch when coming back online
  useEffect(() => {
    if (!isOffline && isStale && enabled) {
      refetch();
    }
  }, [isOffline, isStale, enabled, refetch]);

  // Periodic refetch (if configured)
  useEffect(() => {
    if (!refetchInterval || isOffline || !enabled) return;

    const interval = setInterval(() => {
      refetch();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, isOffline, enabled, refetch]);

  return {
    data,
    isLoading,
    isStale,
    isOffline,
    error,
    cachedAt,
    refetch,
  };
}

// Specific hooks for different data types

/**
 * Hook for CPK chart data with offline support
 */
export function useCpkDataOffline(productionLineId: string, enabled = true) {
  return useOfflineData({
    dataType: 'cpk_data',
    identifier: productionLineId,
    ttl: CACHE_TTL.MEDIUM,
    fetchFn: () => trpcCall('mobile.getCpkData', { productionLineId }),
    enabled,
    refetchInterval: 30000, // 30 seconds
  });
}

/**
 * Hook for OEE chart data with offline support
 */
export function useOeeDataOffline(productionLineId: string, enabled = true) {
  return useOfflineData({
    dataType: 'oee_data',
    identifier: productionLineId,
    ttl: CACHE_TTL.MEDIUM,
    fetchFn: () => trpcCall('mobile.getOeeData', { productionLineId }),
    enabled,
    refetchInterval: 30000,
  });
}

/**
 * Hook for SPC chart data with offline support
 */
export function useSpcDataOffline(planId: string, enabled = true) {
  return useOfflineData({
    dataType: 'spc_data',
    identifier: planId,
    ttl: CACHE_TTL.MEDIUM,
    fetchFn: () => trpcCall('mobile.getSpcData', { planId }),
    enabled,
    refetchInterval: 30000,
  });
}

/**
 * Hook for alerts with offline support
 */
export function useAlertsOffline(enabled = true) {
  return useOfflineData({
    dataType: 'alerts',
    ttl: CACHE_TTL.SHORT,
    fetchFn: () => trpcCall('mobile.getAlerts', {}),
    enabled,
    refetchInterval: 60000, // 1 minute
  });
}

/**
 * Hook for dashboard data with offline support
 */
export function useDashboardDataOffline(enabled = true) {
  return useOfflineData({
    dataType: 'dashboard',
    ttl: CACHE_TTL.SHORT,
    fetchFn: () => trpcCall('mobile.getDashboardData', {}),
    enabled,
    refetchInterval: 30000,
  });
}

/**
 * Hook for production lines list with offline support
 */
export function useProductionLinesOffline(enabled = true) {
  return useOfflineData({
    dataType: 'production_lines',
    ttl: CACHE_TTL.LONG,
    fetchFn: () => trpcCall('mobile.getProductionLines', {}),
    enabled,
  });
}

/**
 * Hook for products list with offline support
 */
export function useProductsOffline(enabled = true) {
  return useOfflineData({
    dataType: 'products',
    ttl: CACHE_TTL.LONG,
    fetchFn: () => trpcCall('mobile.getProducts', {}),
    enabled,
  });
}

export default useOfflineData;
