import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useNotifications } from '../contexts/NotificationContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Settings: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isRegistered, settings } = useNotifications();

  const settingsSections = [
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
      title: 'Kết nối',
      items: [
        {
          icon: 'server',
          label: 'Server URL',
          value: 'https://api.cpkspc.com',
          onPress: () => {},
          showArrow: true,
        },
        {
          icon: 'sync',
          label: 'Tự động đồng bộ',
          toggle: true,
          value: true,
          onPress: () => {},
        },
        {
          icon: 'time',
          label: 'Tần suất cập nhật',
          value: '30 giây',
          onPress: () => {},
          showArrow: true,
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
          value: false,
          onPress: () => {},
        },
        {
          icon: 'language',
          label: 'Ngôn ngữ',
          value: 'Tiếng Việt',
          onPress: () => {},
          showArrow: true,
        },
        {
          icon: 'resize',
          label: 'Cỡ chữ',
          value: 'Bình thường',
          onPress: () => {},
          showArrow: true,
        },
      ],
    },
    {
      title: 'Dữ liệu',
      items: [
        {
          icon: 'download',
          label: 'Xuất dữ liệu',
          onPress: () => {},
          showArrow: true,
        },
        {
          icon: 'trash',
          label: 'Xóa cache',
          value: '12.5 MB',
          onPress: () => {},
          showArrow: true,
          danger: true,
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
          onPress: () => {},
          showArrow: true,
        },
        {
          icon: 'document-text',
          label: 'Điều khoản sử dụng',
          onPress: () => Linking.openURL('https://cpkspc.com/terms'),
          showArrow: true,
        },
        {
          icon: 'shield-checkmark',
          label: 'Chính sách bảo mật',
          onPress: () => Linking.openURL('https://cpkspc.com/privacy'),
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
                disabled={item.toggle}
              >
                <View style={[
                  styles.iconContainer,
                  item.danger && styles.iconContainerDanger,
                ]}>
                  <Ionicons
                    name={item.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={item.danger ? '#ef4444' : '#3b82f6'}
                  />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[
                    styles.settingLabel,
                    item.danger && styles.settingLabelDanger,
                  ]}>
                    {item.label}
                  </Text>
                  {item.value && !item.toggle && (
                    <Text style={styles.settingValue}>{item.value}</Text>
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
  settingValue: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
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
