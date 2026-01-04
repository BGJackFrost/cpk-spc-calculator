import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

interface Alert {
  id: string;
  type: 'cpk' | 'spc' | 'oee' | 'system';
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  read: boolean;
  data?: Record<string, any>;
}

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  const fetchAlerts = async () => {
    try {
      // Mock data - replace with actual API call
      const mockAlerts: Alert[] = [
        {
          id: '1',
          type: 'cpk',
          title: 'CPK thấp - Line 1',
          message: 'CPK = 0.89 < 1.0. Cần kiểm tra quy trình sản xuất.',
          severity: 'critical',
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          read: false,
        },
        {
          id: '2',
          type: 'spc',
          title: 'Vi phạm SPC Rule 2',
          message: '9 điểm liên tiếp nằm cùng một phía của đường trung tâm.',
          severity: 'warning',
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          read: false,
        },
        {
          id: '3',
          type: 'oee',
          title: 'OEE giảm - Line 2',
          message: 'OEE = 62% < 70%. Performance đang ở mức thấp.',
          severity: 'warning',
          timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
          read: true,
        },
        {
          id: '4',
          type: 'cpk',
          title: 'CPK cải thiện - Line 3',
          message: 'CPK tăng từ 1.2 lên 1.45. Quy trình đang ổn định.',
          severity: 'info',
          timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
          read: true,
        },
        {
          id: '5',
          type: 'system',
          title: 'Cập nhật hệ thống',
          message: 'Phiên bản mới 2.0 đã sẵn sàng. Vui lòng cập nhật.',
          severity: 'info',
          timestamp: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
          read: true,
        },
      ];

      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const markAsRead = (id: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === id ? { ...alert, read: true } : alert
      )
    );
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
  };

  const getAlertIcon = (type: Alert['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'cpk':
        return 'analytics';
      case 'spc':
        return 'pulse';
      case 'oee':
        return 'speedometer';
      case 'system':
        return 'settings';
      default:
        return 'alert-circle';
    }
  };

  const getAlertColor = (severity: Alert['severity']): string => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f97316';
      case 'info':
        return '#3b82f6';
      default:
        return '#64748b';
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.read;
    if (filter === 'critical') return alert.severity === 'critical';
    return true;
  });

  const unreadCount = alerts.filter(a => !a.read).length;

  const renderAlert = ({ item }: { item: Alert }) => (
    <TouchableOpacity
      style={[styles.alertItem, !item.read && styles.alertItemUnread]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={[styles.alertIcon, { backgroundColor: `${getAlertColor(item.severity)}20` }]}>
        <Ionicons
          name={getAlertIcon(item.type)}
          size={24}
          color={getAlertColor(item.severity)}
        />
      </View>
      <View style={styles.alertContent}>
        <View style={styles.alertHeader}>
          <Text style={[styles.alertTitle, !item.read && styles.alertTitleUnread]}>
            {item.title}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.alertMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.alertTime}>{formatTime(item.timestamp)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
            onPress={() => setFilter('unread')}
          >
            <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
              Chưa đọc ({unreadCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'critical' && styles.filterButtonActive]}
            onPress={() => setFilter('critical')}
          >
            <Text style={[styles.filterText, filter === 'critical' && styles.filterTextActive]}>
              Nghiêm trọng
            </Text>
          </TouchableOpacity>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Đánh dấu đã đọc</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Alert List */}
      <FlatList
        data={filteredAlerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Không có cảnh báo</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  filterBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  markAllText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertItemUnread: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  alertTitleUnread: {
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  alertMessage: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
  },
});

export default Alerts;
