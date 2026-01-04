import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useNotifications } from '../contexts/NotificationContext';
import { useBiometric } from '../contexts/BiometricContext';
import { useNetwork } from '../contexts/NetworkContext';
import {
  getCacheSize,
  formatCacheSize,
  clearAllCache,
  clearExpiredCache,
} from '../services/offlineStorage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Settings: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isRegistered, settings: notificationSettings } = useNotifications();
  const { isSupported: biometricSupported, settings: biometricSettings, getBiometricName } = useBiometric();
  const { isConnected, pendingSyncCount, syncPendingChanges, isSyncing } = useNetwork();
  
  const [cacheSize, setCacheSize] = useState('0 B');
  const [autoSync, setAutoSync] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Load cache size
  useEffect(() => {
    const loadCacheSize = async () => {
      const size = await getCacheSize();
      setCacheSize(formatCacheSize(size));
    };
    loadCacheSize();
  }, []);

  const handleClearCache = async () => {
    Alert.alert(
      'Xóa cache',
      'Bạn có chắc muốn xóa tất cả dữ liệu đã lưu? Dữ liệu offline sẽ bị mất.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            await clearAllCache();
            setCacheSize('0 B');
            Alert.alert('Thành công', 'Đã xóa cache');
          },
        },
      ]
    );
  };

  const handleClearExpiredCache = async () => {
    const cleared = await clearExpiredCache();
    const size = await getCacheSize();
    setCacheSize(formatCacheSize(size));
    Alert.alert('Thành công', `Đã xóa ${cleared} mục cache hết hạn`);
  };

  const handleSyncNow = async () => {
    if (!isConnected) {
      Alert.alert('Không có kết nối', 'Vui lòng kiểm tra kết nối mạng và thử lại.');
      return;
    }
    await syncPendingChanges();
  };

  const settingsSections = [
    {
      title: 'Bảo mật',
      items: [
        {
          icon: biometricSettings.enabled ? 'finger-print' : 'lock-closed',
          label: getBiometricName(),
          value: biometricSettings.enabled ? 'Đã bật' : 'Đã tắt',
          onPress: () => navigation.navigate('BiometricSettings'),
          showArrow: true,
          disabled: !biometricSupported,
        },
      ],
    },
    {
      title: 'Thông báo',
      items: [
        {
          icon: 'notifications',
          label: 'Cài đặt thông báo',
          value: isRegistered ? 'Đã bật' : 'Đã tắt',
          onPress: () => navigation.navigate('NotificationSettings'),
          showArrow: true,
        },
      ],
    },
    {
      title: 'Kết nối & Đồng bộ',
      items: [
        {
          icon: isConnected ? 'cloud-done' : 'cloud-offline',
          label: 'Trạng thái kết nối',
          value: isConnected ? 'Đã kết nối' : 'Offline',
          onPress: () => {},
          status: isConnected ? 'success' : 'warning',
        },
        {
          icon: 'sync',
          label: 'Đồng bộ ngay',
          value: pendingSyncCount > 0 ? `${pendingSyncCount} thay đổi chờ` : 'Đã đồng bộ',
          onPress: handleSyncNow,
          showArrow: true,
          loading: isSyncing,
          disabled: pendingSyncCount === 0 || !isConnected,
        },
        {
          icon: 'refresh-circle',
          label: 'Tự động đồng bộ',
          toggle: true,
          value: autoSync,
          onPress: () => setAutoSync(!autoSync),
        },
      ],
    },
    {
      title: 'Dữ liệu Offline',
      items: [
        {
          icon: 'save',
          label: 'Dữ liệu đã lưu',
          value: cacheSize,
          onPress: () => {},
        },
        {
          icon: 'trash-bin',
          label: 'Xóa cache hết hạn',
          onPress: handleClearExpiredCache,
          showArrow: true,
        },
        {
          icon: 'trash',
          label: 'Xóa tất cả cache',
          value: cacheSize,
          onPress: handleClearCache,
          showArrow: true,
          danger: true,
        },
      ],
    },
    {
      title: 'Hiển thị',
      items: [
        {
          icon: 'moon',
          label: 'Chế độ tối',
          toggle: true,
          value: darkMode,
          onPress: () => setDarkMode(!darkMode),
        },
        {
          icon: 'language',
          label: 'Ngôn ngữ',
          value: 'Tiếng Việt',
          onPress: () => Alert.alert('Thông báo', 'Tính năng đang phát triển'),
          showArrow: true,
        },
      ],
    },
    {
      title: 'Thông tin',
      items: [
        {
          icon: 'information-circle',
          label: 'Về ứng dụng',
          value: 'v1.0.0',
          onPress: () => Alert.alert(
            'CPK SPC Calculator',
            'Phiên bản 1.0.0\n\nỨng dụng giám sát và phân tích SPC/CPK cho sản xuất.\n\n© 2024 CPK SPC Team'
          ),
          showArrow: true,
        },
        {
          icon: 'document-text',
          label: 'Hướng dẫn sử dụng',
          onPress: () => Linking.openURL('https://cpkspc.com/docs'),
          showArrow: true,
        },
        {
          icon: 'help-circle',
          label: 'Trợ giúp & Hỗ trợ',
          onPress: () => Linking.openURL('https://cpkspc.com/support'),
          showArrow: true,
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* User Profile */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>U</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>User Name</Text>
          <Text style={styles.profileEmail}>user@example.com</Text>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="pencil" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Connection Status Banner */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={20} color="#f59e0b" />
          <Text style={styles.offlineBannerText}>
            Đang ở chế độ offline. Dữ liệu sẽ được đồng bộ khi có kết nối.
          </Text>
        </View>
      )}

      {/* Settings Sections */}
      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionContent}>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={[
                  styles.settingItem,
                  itemIndex < section.items.length - 1 && styles.settingItemBorder,
                ]}
                onPress={item.onPress}
                disabled={item.toggle || item.disabled}
              >
                <View style={[
                  styles.iconContainer,
                  item.danger && styles.iconContainerDanger,
                  item.status === 'success' && styles.iconContainerSuccess,
                  item.status === 'warning' && styles.iconContainerWarning,
                ]}>
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={
                      item.danger ? '#ef4444' :
                      item.status === 'success' ? '#10b981' :
                      item.status === 'warning' ? '#f59e0b' :
                      '#3b82f6'
                    }
                  />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[
                    styles.settingLabel,
                    item.danger && styles.settingLabelDanger,
                    item.disabled && styles.settingLabelDisabled,
                  ]}>
                    {item.label}
                  </Text>
                  {item.value && !item.toggle && (
                    <Text style={[
                      styles.settingValue,
                      item.status === 'success' && styles.settingValueSuccess,
                      item.status === 'warning' && styles.settingValueWarning,
                    ]}>
                      {item.value}
                    </Text>
                  )}
                </View>
                {item.toggle ? (
                  <Switch
                    value={item.value as boolean}
                    onValueChange={() => item.onPress()}
                    trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                    thumbColor={item.value ? '#3b82f6' : '#94a3b8'}
                  />
                ) : item.showArrow ? (
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton}>
        <Ionicons name="log-out" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>

      {/* Version Info */}
      <Text style={styles.versionText}>
        CPK SPC Calculator v1.0.0{'\n'}
        © 2024 CPK SPC Team
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  editButton: {
    padding: 8,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
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
    padding: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerDanger: {
    backgroundColor: '#fef2f2',
  },
  iconContainerSuccess: {
    backgroundColor: '#ecfdf5',
  },
  iconContainerWarning: {
    backgroundColor: '#fffbeb',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  settingLabelDanger: {
    color: '#ef4444',
  },
  settingLabelDisabled: {
    color: '#94a3b8',
  },
  settingValue: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  settingValueSuccess: {
    color: '#10b981',
  },
  settingValueWarning: {
    color: '#f59e0b',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 32,
    lineHeight: 18,
  },
});

export default Settings;
