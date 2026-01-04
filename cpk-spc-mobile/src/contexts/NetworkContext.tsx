import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { Alert, AppState, AppStateStatus } from 'react-native';
import {
  getPendingSyncItems,
  removePendingSyncItem,
  getPendingSyncCount,
  clearExpiredCache,
} from '../services/offlineStorage';
import { trpcMutation } from '../services/api';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  pendingSyncCount: number;
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncPendingChanges: () => Promise<void>;
  refreshNetworkStatus: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

interface NetworkProviderProps {
  children: ReactNode;
  onConnectionRestored?: () => void;
  onConnectionLost?: () => void;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({
  children,
  onConnectionRestored,
  onConnectionLost,
}) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [wasConnected, setWasConnected] = useState(true);

  // Update pending sync count
  const updatePendingSyncCount = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingSyncCount(count);
  }, []);

  // Handle network state change
  const handleNetworkChange = useCallback((state: NetInfoState) => {
    const connected = state.isConnected ?? false;
    const reachable = state.isInternetReachable;
    
    setIsConnected(connected);
    setIsInternetReachable(reachable);
    setConnectionType(state.type);

    // Check for connection restoration
    if (connected && reachable && !wasConnected) {
      console.log('Network connection restored');
      onConnectionRestored?.();
      // Auto-sync pending changes
      syncPendingChanges();
    } else if (!connected && wasConnected) {
      console.log('Network connection lost');
      onConnectionLost?.();
    }

    setWasConnected(connected && (reachable ?? false));
  }, [wasConnected, onConnectionRestored, onConnectionLost]);

  // Sync pending changes when connection is restored
  const syncPendingChanges = useCallback(async () => {
    if (isSyncing) return;

    const pendingItems = await getPendingSyncItems();
    if (pendingItems.length === 0) {
      setLastSyncTime(Date.now());
      return;
    }

    setIsSyncing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const item of pendingItems) {
        try {
          // Process each pending sync item based on its type
          let result;
          
          switch (item.dataType) {
            case 'alert_read':
              result = await trpcMutation('mobile.markAlertAsRead', item.data);
              break;
            case 'settings_update':
              result = await trpcMutation('mobile.updateSettings', item.data);
              break;
            case 'device_register':
              result = await trpcMutation('mobile.registerDevice', item.data);
              break;
            default:
              console.warn(`Unknown sync item type: ${item.dataType}`);
              continue;
          }

          if (result.success) {
            await removePendingSyncItem(item.id);
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error syncing item ${item.id}:`, error);
          errorCount++;
        }
      }

      // Update pending count
      await updatePendingSyncCount();
      setLastSyncTime(Date.now());

      // Show result notification
      if (successCount > 0 || errorCount > 0) {
        const message = errorCount > 0
          ? `Đồng bộ: ${successCount} thành công, ${errorCount} thất bại`
          : `Đã đồng bộ ${successCount} thay đổi`;
        console.log(message);
      }
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updatePendingSyncCount]);

  // Refresh network status manually
  const refreshNetworkStatus = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      handleNetworkChange(state);
    } catch (error) {
      console.error('Error refreshing network status:', error);
    }
  }, [handleNetworkChange]);

  // Subscribe to network changes
  useEffect(() => {
    let unsubscribe: NetInfoSubscription;

    const setupNetworkListener = async () => {
      // Get initial state
      const state = await NetInfo.fetch();
      handleNetworkChange(state);

      // Subscribe to changes
      unsubscribe = NetInfo.addEventListener(handleNetworkChange);
    };

    setupNetworkListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [handleNetworkChange]);

  // Update pending sync count on mount and app state change
  useEffect(() => {
    updatePendingSyncCount();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updatePendingSyncCount();
        refreshNetworkStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [updatePendingSyncCount, refreshNetworkStatus]);

  // Clean up expired cache periodically
  useEffect(() => {
    const cleanupInterval = setInterval(async () => {
      const cleared = await clearExpiredCache();
      if (cleared > 0) {
        console.log(`Cleared ${cleared} expired cache entries`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  const value: NetworkContextType = {
    isConnected,
    isInternetReachable,
    connectionType,
    pendingSyncCount,
    isSyncing,
    lastSyncTime,
    syncPendingChanges,
    refreshNetworkStatus,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export default NetworkContext;
