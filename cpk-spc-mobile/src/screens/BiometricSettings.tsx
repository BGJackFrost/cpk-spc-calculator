import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBiometric } from '../contexts/BiometricContext';

const TIMEOUT_OPTIONS = [
  { label: 'Ngay lập tức', value: 0 },
  { label: '1 phút', value: 1 },
  { label: '5 phút', value: 5 },
  { label: '15 phút', value: 15 },
  { label: '30 phút', value: 30 },
  { label: '1 giờ', value: 60 },
];

const BiometricSettings: React.FC = () => {
  const {
    isSupported,
    isEnrolled,
    settings,
    isLoading,
    enableBiometricAuth,
    disableBiometricAuth,
    updateSettings,
    getBiometricName,
  } = useBiometric();

  const [showTimeoutPicker, setShowTimeoutPicker] = useState(false);

  const biometricName = getBiometricName();

  const handleToggleBiometric = async () => {
    if (settings.enabled) {
      Alert.alert(
        'Tắt xác thực sinh trắc học',
        `Bạn có chắc muốn tắt ${biometricName}?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Tắt',
            style: 'destructive',
            onPress: async () => {
              await disableBiometricAuth();
            },
          },
        ]
      );
    } else {
      const result = await enableBiometricAuth();
      if (!result.success) {
        Alert.alert('Lỗi', result.error || 'Không thể bật xác thực sinh trắc học');
      }
    }
  };

  const handleToggleAppLock = async () => {
    if (!settings.enabled) {
      Alert.alert(
        'Bật xác thực trước',
        `Vui lòng bật ${biometricName} trước khi sử dụng khóa ứng dụng.`
      );
      return;
    }

    await updateSettings({ appLockEnabled: !settings.appLockEnabled });
  };

  const handleTimeoutChange = async (minutes: number) => {
    await updateSettings({ lockTimeoutMinutes: minutes });
    setShowTimeoutPicker(false);
  };

  const getTimeoutLabel = (minutes: number): string => {
    const option = TIMEOUT_OPTIONS.find(o => o.value === minutes);
    return option?.label || `${minutes} phút`;
  };

  if (!isSupported) {
    return (
      <View style={styles.container}>
        <View style={styles.notSupportedContainer}>
          <Ionicons name="finger-print" size={64} color="#94a3b8" />
          <Text style={styles.notSupportedTitle}>Không hỗ trợ</Text>
          <Text style={styles.notSupportedText}>
            Thiết bị của bạn không hỗ trợ xác thực sinh trắc học (Face ID/Touch ID).
          </Text>
        </View>
      </View>
    );
  }

  if (!isEnrolled) {
    return (
      <View style={styles.container}>
        <View style={styles.notSupportedContainer}>
          <Ionicons name="finger-print" size={64} color="#f59e0b" />
          <Text style={styles.notSupportedTitle}>Chưa cài đặt</Text>
          <Text style={styles.notSupportedText}>
            Vui lòng cài đặt {biometricName} trong Cài đặt hệ thống trước khi sử dụng tính năng này.
          </Text>
          <TouchableOpacity style={styles.setupButton}>
            <Text style={styles.setupButtonText}>Mở Cài đặt</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerInfo}>
        <View style={styles.headerIcon}>
          <Ionicons
            name={settings.biometricType === 1 ? 'finger-print' : 'scan'}
            size={32}
            color="#3b82f6"
          />
        </View>
        <Text style={styles.headerTitle}>{biometricName}</Text>
        <Text style={styles.headerSubtitle}>
          Sử dụng {biometricName} để xác thực nhanh và bảo mật
        </Text>
      </View>

      {/* Main Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cài đặt chính</Text>
        <View style={styles.sectionContent}>
          {/* Enable Biometric */}
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="shield-checkmark" size={22} color="#3b82f6" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Bật {biometricName}</Text>
                <Text style={styles.settingDescription}>
                  Sử dụng {biometricName} để xác thực
                </Text>
              </View>
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Switch
                value={settings.enabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                thumbColor={settings.enabled ? '#3b82f6' : '#94a3b8'}
              />
            )}
          </View>

          {/* App Lock */}
          <View style={[styles.settingItem, styles.settingItemBorder]}>
            <View style={styles.settingInfo}>
              <Ionicons name="lock-closed" size={22} color="#3b82f6" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Khóa ứng dụng</Text>
                <Text style={styles.settingDescription}>
                  Yêu cầu xác thực khi mở ứng dụng
                </Text>
              </View>
            </View>
            <Switch
              value={settings.appLockEnabled}
              onValueChange={handleToggleAppLock}
              trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
              thumbColor={settings.appLockEnabled ? '#3b82f6' : '#94a3b8'}
              disabled={!settings.enabled}
            />
          </View>
        </View>
      </View>

      {/* Timeout Settings */}
      {settings.enabled && settings.appLockEnabled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thời gian khóa</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowTimeoutPicker(!showTimeoutPicker)}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="time" size={22} color="#3b82f6" />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Khóa sau</Text>
                  <Text style={styles.settingDescription}>
                    Tự động khóa sau thời gian không hoạt động
                  </Text>
                </View>
              </View>
              <View style={styles.valueContainer}>
                <Text style={styles.valueText}>
                  {getTimeoutLabel(settings.lockTimeoutMinutes)}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {showTimeoutPicker && (
              <View style={styles.timeoutPicker}>
                {TIMEOUT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.timeoutOption,
                      settings.lockTimeoutMinutes === option.value && styles.timeoutOptionSelected,
                    ]}
                    onPress={() => handleTimeoutChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.timeoutOptionText,
                        settings.lockTimeoutMinutes === option.value && styles.timeoutOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {settings.lockTimeoutMinutes === option.value && (
                      <Ionicons name="checkmark" size={20} color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Security Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lưu ý bảo mật</Text>
        <View style={styles.tipsContainer}>
          <View style={styles.tipItem}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={styles.tipText}>
              {biometricName} được xử lý hoàn toàn trên thiết bị của bạn
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="shield" size={20} color="#10b981" />
            <Text style={styles.tipText}>
              Dữ liệu sinh trắc học không bao giờ được gửi đến server
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="key" size={20} color="#f59e0b" />
            <Text style={styles.tipText}>
              Bạn vẫn có thể sử dụng mật khẩu thiết bị nếu cần
            </Text>
          </View>
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
  notSupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notSupportedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  notSupportedText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  setupButton: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  setupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerInfo: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontSize: 14,
    color: '#64748b',
  },
  timeoutPicker: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 8,
  },
  timeoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  timeoutOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  timeoutOptionText: {
    fontSize: 15,
    color: '#1e293b',
  },
  timeoutOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  tipsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
});

export default BiometricSettings;
