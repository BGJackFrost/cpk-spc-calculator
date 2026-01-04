import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// Storage keys
const FCM_TOKEN_KEY = 'fcm_token';
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

// Notification settings interface
export interface NotificationSettings {
  enabled: boolean;
  cpkAlerts: boolean;
  spcAlerts: boolean;
  oeeAlerts: boolean;
  dailyReport: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

// Default notification settings
const defaultSettings: NotificationSettings = {
  enabled: true,
  cpkAlerts: true,
  spcAlerts: true,
  oeeAlerts: true,
  dailyReport: false,
  soundEnabled: true,
  vibrationEnabled: true,
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Check if physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permissions');
    return null;
  }

  // Get Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // Replace with actual Expo project ID
    });
    token = tokenData.data;
    console.log('Push token:', token);

    // Store token locally
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);

    // Send token to server
    await sendTokenToServer(token);
  } catch (error) {
    console.error('Error getting push token:', error);
  }

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });

    // CPK Alert channel
    await Notifications.setNotificationChannelAsync('cpk-alerts', {
      name: 'CPK Alerts',
      description: 'Cảnh báo khi CPK vượt ngưỡng',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#ef4444',
      sound: 'alert.wav',
    });

    // SPC Alert channel
    await Notifications.setNotificationChannelAsync('spc-alerts', {
      name: 'SPC Alerts',
      description: 'Cảnh báo vi phạm SPC Rules',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f97316',
    });

    // OEE Alert channel
    await Notifications.setNotificationChannelAsync('oee-alerts', {
      name: 'OEE Alerts',
      description: 'Cảnh báo OEE thấp',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#eab308',
    });

    // Daily Report channel
    await Notifications.setNotificationChannelAsync('daily-report', {
      name: 'Daily Reports',
      description: 'Báo cáo hàng ngày',
      importance: Notifications.AndroidImportance.LOW,
    });
  }

  return token;
}

// Send token to server
async function sendTokenToServer(token: string): Promise<void> {
  try {
    await api.post('/mobile/register-device', {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName,
      deviceModel: Device.modelName,
    });
    console.log('Token sent to server successfully');
  } catch (error) {
    console.error('Failed to send token to server:', error);
  }
}

// Get stored token
export async function getStoredToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FCM_TOKEN_KEY);
  } catch {
    return null;
  }
}

// Remove token (on logout)
export async function removeToken(): Promise<void> {
  try {
    const token = await getStoredToken();
    if (token) {
      // Notify server to remove token
      await api.post('/mobile/unregister-device', { token });
    }
    await AsyncStorage.removeItem(FCM_TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
}

// Get notification settings
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (settings) {
      return { ...defaultSettings, ...JSON.parse(settings) };
    }
    return defaultSettings;
  } catch {
    return defaultSettings;
  }
}

// Save notification settings
export async function saveNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<void> {
  try {
    const currentSettings = await getNotificationSettings();
    const newSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));

    // Update server with new settings
    await api.post('/mobile/notification-settings', newSettings);
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
}

// Schedule local notification
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  channelId?: string
): Promise<string> {
  const settings = await getNotificationSettings();
  
  if (!settings.enabled) {
    return '';
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: settings.soundEnabled ? 'default' : undefined,
      ...(Platform.OS === 'android' && channelId ? { channelId } : {}),
    },
    trigger: null, // Immediate
  });

  return identifier;
}

// Cancel notification
export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

// Cancel all notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get badge count
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

// Set badge count
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

// Clear badge
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// Add notification received listener
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

// Add notification response listener (when user taps notification)
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Remove subscription
export function removeNotificationSubscription(
  subscription: Notifications.Subscription
): void {
  Notifications.removeNotificationSubscription(subscription);
}

// Get last notification response (for handling app launch from notification)
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

// Notification types for the app
export type NotificationType = 
  | 'cpk_alert'
  | 'spc_violation'
  | 'oee_alert'
  | 'daily_report'
  | 'system';

// Handle notification based on type
export function getChannelForType(type: NotificationType): string {
  switch (type) {
    case 'cpk_alert':
      return 'cpk-alerts';
    case 'spc_violation':
      return 'spc-alerts';
    case 'oee_alert':
      return 'oee-alerts';
    case 'daily_report':
      return 'daily-report';
    default:
      return 'default';
  }
}

// Check if notification type is enabled
export async function isNotificationTypeEnabled(type: NotificationType): Promise<boolean> {
  const settings = await getNotificationSettings();
  
  if (!settings.enabled) return false;
  
  switch (type) {
    case 'cpk_alert':
      return settings.cpkAlerts;
    case 'spc_violation':
      return settings.spcAlerts;
    case 'oee_alert':
      return settings.oeeAlerts;
    case 'daily_report':
      return settings.dailyReport;
    default:
      return true;
  }
}
