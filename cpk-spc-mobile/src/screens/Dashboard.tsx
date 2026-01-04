import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLatestCpk, useLatestOee } from '../hooks/useChartData';
import { CpkChartCard, OeeChartCard } from '../components/ChartCard';
import { useNetwork } from '../contexts/NetworkContext';
import { OfflineBanner } from '../components/OfflineIndicator';

const Dashboard: React.FC = () => {
  const [refreshing, setRefreshing] = React.useState(false);
  const { isConnected, isInternetReachable, pendingSyncCount } = useNetwork();
  
  const { data: cpkData, loading: cpkLoading, refetch: refetchCpk } = useLatestCpk();
  const { data: oeeData, loading: oeeLoading, refetch: refetchOee } = useLatestOee();

  const isOffline = !isConnected || isInternetReachable === false;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCpk(), refetchOee()]);
    setRefreshing(false);
  }, [refetchCpk, refetchOee]);

  const getCpkColor = (cpk: number): string => {
    if (cpk >= 1.67) return '#22c55e';
    if (cpk >= 1.33) return '#84cc16';
    if (cpk >= 1.0) return '#eab308';
    if (cpk >= 0.67) return '#f97316';
    return '#ef4444';
  };

  const getOeeColor = (oee: number): string => {
    if (oee >= 85) return '#22c55e';
    if (oee >= 70) return '#84cc16';
    if (oee >= 60) return '#eab308';
    if (oee >= 40) return '#f97316';
    return '#ef4444';
  };

  const formatLastUpdate = (timestamp?: number): string => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Vừa cập nhật';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
    return `${Math.floor(diff / 86400000)} ngày trước`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Offline Banner */}
      <OfflineBanner />

      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="analytics" size={20} color="#3b82f6" />
            <Text style={styles.statLabel}>CPK</Text>
            {isOffline && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline" size={12} color="#f59e0b" />
              </View>
            )}
          </View>
          <Text style={[
            styles.statValue,
            { color: cpkData ? getCpkColor(cpkData.cpk) : '#64748b' }
          ]}>
            {cpkLoading ? '...' : cpkData?.cpk.toFixed(2) ?? 'N/A'}
          </Text>
          <Text style={styles.statSubtext}>
            {cpkData ? `CP: ${cpkData.cp.toFixed(2)}` : ''}
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="speedometer" size={20} color="#8b5cf6" />
            <Text style={styles.statLabel}>OEE</Text>
            {isOffline && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline" size={12} color="#f59e0b" />
              </View>
            )}
          </View>
          <Text style={[
            styles.statValue,
            { color: oeeData ? getOeeColor(oeeData.oee) : '#64748b' }
          ]}>
            {oeeLoading ? '...' : oeeData?.oee.toFixed(1) ?? 'N/A'}%
          </Text>
          <Text style={styles.statSubtext}>
            {oeeData ? `A: ${oeeData.availability.toFixed(0)}% P: ${oeeData.performance.toFixed(0)}% Q: ${oeeData.quality.toFixed(0)}%` : ''}
          </Text>
        </View>
      </View>

      {/* Sync Status */}
      {pendingSyncCount > 0 && (
        <View style={styles.syncStatus}>
          <Ionicons name="sync" size={16} color="#3b82f6" />
          <Text style={styles.syncStatusText}>
            {pendingSyncCount} thay đổi chờ đồng bộ
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="add-circle" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.actionText}>Phân tích mới</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="document-text" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.actionText}>Báo cáo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="scan" size={24} color="#22c55e" />
            </View>
            <Text style={styles.actionText}>Quét QR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={[styles.actionIcon, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name="time" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.actionText}>Lịch sử</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Charts */}
      <View style={styles.chartsContainer}>
        <View style={styles.chartsSectionHeader}>
          <Text style={styles.sectionTitle}>Biểu đồ Realtime</Text>
          {isOffline && (
            <View style={styles.offlineChip}>
              <Ionicons name="cloud-offline" size={12} color="#f59e0b" />
              <Text style={styles.offlineChipText}>Dữ liệu offline</Text>
            </View>
          )}
        </View>
        
        <CpkChartCard days={7} showExport={true} />
        
        <OeeChartCard days={7} showExport={true} />
      </View>

      {/* Recent Alerts */}
      <View style={styles.alertsContainer}>
        <View style={styles.alertsHeader}>
          <Text style={styles.sectionTitle}>Cảnh báo gần đây</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.alertItem}>
          <View style={[styles.alertDot, { backgroundColor: '#ef4444' }]} />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>CPK thấp - Line 1</Text>
            <Text style={styles.alertTime}>5 phút trước</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
        
        <View style={styles.alertItem}>
          <View style={[styles.alertDot, { backgroundColor: '#f97316' }]} />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Vi phạm SPC Rule 2</Text>
            <Text style={styles.alertTime}>15 phút trước</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
        
        <View style={styles.alertItem}>
          <View style={[styles.alertDot, { backgroundColor: '#eab308' }]} />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>OEE giảm - Line 2</Text>
            <Text style={styles.alertTime}>1 giờ trước</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },
  offlineBadge: {
    padding: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  syncStatusText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
  },
  chartsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  chartsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  offlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  offlineChipText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '500',
  },
  alertsContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  alertTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});

export default Dashboard;
