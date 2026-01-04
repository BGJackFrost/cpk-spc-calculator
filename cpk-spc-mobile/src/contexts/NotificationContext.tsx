import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotificationsAsync,
  getStoredToken,
  removeToken,
  getNotificationSettings,
  saveNotificationSettings,
  NotificationSettings,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  removeNotificationSubscription,
  getLastNotificationResponse,
  clearBadge,
  NotificationType,
  isNotificationTypeEnabled,
  scheduleLocalNotification,
  getChannelForType,
} from '../services/pushNotification';

interface NotificationContextType {
  token: string | null;
  settings: NotificationSettings;
  isRegistered: boolean;
  isLoading: boolean;
  registerDevice: () => Promise<void>;
  unregisterDevice: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  showLocalNotification: (
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>
  ) => Promise<void>;
  lastNotification: Notifications.Notification | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  onNotificationReceived,
  onNotificationResponse,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    cpkAlerts: true,
    spcAlerts: true,
    oeeAlerts: true,
    dailyReport: false,
    soundEnabled: true,
    vibrationEnabled: true,
  });
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load stored token
        const storedToken = await getStoredToken();
        if (storedToken) {
          setToken(storedToken);
          setIsRegistered(true);
        }

        // Load settings
        const storedSettings = await getNotificationSettings();
        setSettings(storedSettings);

        // Check for notification that launched the app
        const lastResponse = await getLastNotificationResponse();
        if (lastResponse) {
          onNotificationResponse?.(lastResponse);
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Set up notification listeners
  useEffect(() => {
    const receivedSubscription = addNotificationReceivedListener((notification) => {
      setLastNotification(notification);
      onNotificationReceived?.(notification);
    });

    const responseSubscription = addNotificationResponseListener((response) => {
      // Clear badge when user interacts with notification
      clearBadge();
      onNotificationResponse?.(response);
    });

    return () => {
      removeNotificationSubscription(receivedSubscription);
      removeNotificationSubscription(responseSubscription);
    };
  }, [onNotificationReceived, onNotificationResponse]);

  // Clear badge when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        clearBadge();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Register device for push notifications
  const registerDevice = useCallback(async () => {
    setIsLoading(true);
    try {
      const newToken = await registerForPushNotificationsAsync();
      if (newToken) {
        setToken(newToken);
        setIsRegistered(true);
      } else {
        Alert.alert(
          'Thông báo',
          'Không thể đăng ký nhận thông báo. Vui lòng kiểm tra quyền truy cập trong cài đặt.'
        );
      }
    } catch (error) {
      console.error('Error registering device:', error);
      Alert.alert('Lỗi', 'Không thể đăng ký nhận thông báo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Unregister device
  const unregisterDevice = useCallback(async () => {
    setIsLoading(true);
    try {
      await removeToken();
      setToken(null);
      setIsRegistered(false);
    } catch (error) {
      console.error('Error unregistering device:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update notification settings
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    try {
      await saveNotificationSettings(newSettings);
      setSettings((prev) => ({ ...prev, ...newSettings }));
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật cài đặt');
    }
  }, []);

  // Show local notification
  const showLocalNotification = useCallback(async (
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>
  ) => {
    const isEnabled = await isNotificationTypeEnabled(type);
    if (!isEnabled) {
      return;
    }

    const channelId = getChannelForType(type);
    await scheduleLocalNotification(title, body, { ...data, type }, channelId);
  }, []);

  const value: NotificationContextType = {
    token,
    settings,
    isRegistered,
    isLoading,
    registerDevice,
    unregisterDevice,
    updateSettings,
    showLocalNotification,
    lastNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
