import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../contexts/NetworkContext';

const { width } = Dimensions.get('window');

interface OfflineIndicatorProps {
  showPendingSync?: boolean;
  position?: 'top' | 'bottom';
  onSyncPress?: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showPendingSync = true,
  position = 'top',
  onSyncPress,
}) => {
  const {
    isConnected,
    isInternetReachable,
    pendingSyncCount,
    isSyncing,
    syncPendingChanges,
  } = useNetwork();

  const [slideAnim] = useState(new Animated.Value(-100));
  const [isVisible, setIsVisible] = useState(false);

  const isOffline = !isConnected || isInternetReachable === false;

  useEffect(() => {
    if (isOffline || (showPendingSync && pendingSyncCount > 0)) {
      setIsVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [isOffline, pendingSyncCount, showPendingSync]);

  const handleSyncPress = () => {
    if (onSyncPress) {
      onSyncPress();
    } else if (!isSyncing && isConnected) {
      syncPendingChanges();
    }
  };

  if (!isVisible) return null;

  const containerStyle = position === 'top' ? styles.containerTop : styles.containerBottom;

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {isOffline ? (
        // Offline state
        <View style={[styles.content, styles.offlineContent]}>
          <Ionicons name="cloud-offline" size={18} color="#ffffff" />
          <Text style={styles.offlineText}>Không có kết nối mạng</Text>
          <Text style={styles.subText}>Dữ liệu được lưu cục bộ</Text>
        </View>
      ) : pendingSyncCount > 0 ? (
        // Pending sync state
        <TouchableOpacity
          style={[styles.content, styles.syncContent]}
          onPress={handleSyncPress}
          disabled={isSyncing}
        >
          <View style={styles.syncInfo}>
            <Ionicons
              name={isSyncing ? 'sync' : 'cloud-upload'}
              size={18}
              color="#ffffff"
            />
            <Text style={styles.syncText}>
              {isSyncing
                ? 'Đang đồng bộ...'
                : `${pendingSyncCount} thay đổi chờ đồng bộ`}
            </Text>
          </View>
          {!isSyncing && (
            <View style={styles.syncButton}>
              <Text style={styles.syncButtonText}>Đồng bộ</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
};

// Compact version for use in headers
export const OfflineIndicatorCompact: React.FC = () => {
  const { isConnected, isInternetReachable, pendingSyncCount, isSyncing } = useNetwork();

  const isOffline = !isConnected || isInternetReachable === false;

  if (!isOffline && pendingSyncCount === 0) return null;

  return (
    <View style={styles.compactContainer}>
      {isOffline ? (
        <View style={[styles.compactBadge, styles.offlineBadge]}>
          <Ionicons name="cloud-offline" size={14} color="#ffffff" />
        </View>
      ) : pendingSyncCount > 0 ? (
        <View style={[styles.compactBadge, styles.syncBadge]}>
          {isSyncing ? (
            <Ionicons name="sync" size={14} color="#ffffff" />
          ) : (
            <Text style={styles.compactBadgeText}>{pendingSyncCount}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
};

// Banner version for screens
export const OfflineBanner: React.FC<{ message?: string }> = ({ message }) => {
  const { isConnected, isInternetReachable } = useNetwork();

  const isOffline = !isConnected || isInternetReachable === false;

  if (!isOffline) return null;

  return (
    <View style={styles.bannerContainer}>
      <Ionicons name="warning" size={16} color="#f59e0b" />
      <Text style={styles.bannerText}>
        {message || 'Bạn đang xem dữ liệu đã lưu. Một số tính năng có thể không khả dụng.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  containerTop: {
    top: 0,
  },
  containerBottom: {
    bottom: 0,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineContent: {
    backgroundColor: '#ef4444',
    flexDirection: 'column',
    gap: 2,
  },
  offlineText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  syncContent: {
    backgroundColor: '#3b82f6',
    justifyContent: 'space-between',
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  compactContainer: {
    marginRight: 8,
  },
  compactBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBadge: {
    backgroundColor: '#ef4444',
  },
  syncBadge: {
    backgroundColor: '#f59e0b',
  },
  compactBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  bannerContainer: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
  },
  bannerText: {
    flex: 1,
    color: '#92400e',
    fontSize: 13,
    lineHeight: 18,
  },
});

export default OfflineIndicator;
