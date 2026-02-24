import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationSettings: React.FC = () => {
  const {
    settings,
    isRegistered,
    isLoading,
    registerDevice,
    unregisterDevice,
    updateSettings,
  } = useNotifications();

  const handleToggle = async (key: keyof typeof settings, value: boolean) => {
    await updateSettings({ [key]: value });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Registration Status */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="notifications" size={24} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Trạng thái đăng ký</Text>
        </View>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: isRegistered ? '#22c55e' : '#ef4444' }
            ]} />
            <Text style={styles.statusText}>
              {isRegistered ? 'Đã đăng ký nhận thông báo' : 'Chưa đăng ký'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.registerButton,
              { backgroundColor: isRegistered ? '#ef4444' : '#3b82f6' }
            ]}
            onPress={isRegistered ? unregisterDevice : registerDevice}
          >
            <Text style={styles.registerButtonText}>
              {isRegistered ? 'Hủy đăng ký' : 'Đăng ký ngay'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Toggle */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="toggle" size={24} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Bật/Tắt thông báo</Text>
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Nhận thông báo</Text>
            <Text style={styles.settingDescription}>
              Bật/tắt tất cả thông báo từ ứng dụng
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={(value) => handleToggle('enabled', value)}
            trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
            thumbColor={settings.enabled ? '#3b82f6' : '#94a3b8'}
          />
        </View>
      </View>

      {/* Alert Types */}
      <View style={[styles.section, !settings.enabled && styles.disabledSection]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="alert-circle" size={24} color="#f97316" />
          <Text style={styles.sectionTitle}>Loại cảnh báo</Text>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <View style={styles.settingLabelRow}>
              <View style={[styles.alertDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.settingLabel}>Cảnh báo CPK</Text>
            </View>
            <Text style={styles.settingDescription}>
              Thông báo khi CPK vượt ngưỡng cảnh báo
            </Text>
          </View>
          <Switch
            value={settings.cpkAlerts}
            onValueChange={(value) => handleToggle('cpkAlerts', value)}
            disabled={!settings.enabled}
            trackColor={{ false: '#e2e8f0', true: '#fca5a5' }}
            thumbColor={settings.cpkAlerts ? '#ef4444' : '#94a3b8'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <View style={styles.settingLabelRow}>
              <View style={[styles.alertDot, { backgroundColor: '#f97316' }]} />
              <Text style={styles.settingLabel}>Cảnh báo SPC</Text>
            </View>
            <Text style={styles.settingDescription}>
              Thông báo khi vi phạm SPC Rules
            </Text>
          </View>
          <Switch
            value={settings.spcAlerts}
            onValueChange={(value) => handleToggle('spcAlerts', value)}
            disabled={!settings.enabled}
            trackColor={{ false: '#e2e8f0', true: '#fdba74' }}
            thumbColor={settings.spcAlerts ? '#f97316' : '#94a3b8'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <View style={styles.settingLabelRow}>
              <View style={[styles.alertDot, { backgroundColor: '#eab308' }]} />
              <Text style={styles.settingLabel}>Cảnh báo OEE</Text>
            </View>
            <Text style={styles.settingDescription}>
              Thông báo khi OEE thấp hơn ngưỡng
            </Text>
          </View>
          <Switch
            value={settings.oeeAlerts}
            onValueChange={(value) => handleToggle('oeeAlerts', value)}
            disabled={!settings.enabled}
            trackColor={{ false: '#e2e8f0', true: '#fde047' }}
            thumbColor={settings.oeeAlerts ? '#eab308' : '#94a3b8'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <View style={styles.settingLabelRow}>
              <View style={[styles.alertDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.settingLabel}>Báo cáo hàng ngày</Text>
            </View>
            <Text style={styles.settingDescription}>
              Nhận báo cáo tổng hợp mỗi ngày
            </Text>
          </View>
          <Switch
            value={settings.dailyReport}
            onValueChange={(value) => handleToggle('dailyReport', value)}
            disabled={!settings.enabled}
            trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
            thumbColor={settings.dailyReport ? '#3b82f6' : '#94a3b8'}
          />
        </View>
      </View>

      {/* Sound & Vibration */}
      <View style={[styles.section, !settings.enabled && styles.disabledSection]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="volume-high" size={24} color="#8b5cf6" />
          <Text style={styles.sectionTitle}>Âm thanh & Rung</Text>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Âm thanh</Text>
            <Text style={styles.settingDescription}>
              Phát âm thanh khi có thông báo
            </Text>
          </View>
          <Switch
            value={settings.soundEnabled}
            onValueChange={(value) => handleToggle('soundEnabled', value)}
            disabled={!settings.enabled}
            trackColor={{ false: '#e2e8f0', true: '#c4b5fd' }}
            thumbColor={settings.soundEnabled ? '#8b5cf6' : '#94a3b8'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Rung</Text>
            <Text style={styles.settingDescription}>
              Rung khi có thông báo
            </Text>
          </View>
          <Switch
            value={settings.vibrationEnabled}
            onValueChange={(value) => handleToggle('vibrationEnabled', value)}
            disabled={!settings.enabled}
            trackColor={{ false: '#e2e8f0', true: '#c4b5fd' }}
            thumbColor={settings.vibrationEnabled ? '#8b5cf6' : '#94a3b8'}
          />
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoSection}>
        <Ionicons name="information-circle-outline" size={20} color="#64748b" />
        <Text style={styles.infoText}>
          Thông báo sẽ được gửi từ server khi có sự kiện quan trọng. 
          Đảm bảo ứng dụng có quyền gửi thông báo trong cài đặt hệ thống.
        </Text>
      </View>
    </ScrollView>
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
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledSection: {
    opacity: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#475569',
  },
  registerButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  infoSection: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
});

export default NotificationSettings;
