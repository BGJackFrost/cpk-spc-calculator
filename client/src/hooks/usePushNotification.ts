import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
}

export function usePushNotification() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
  });

  useEffect(() => {
    // Check if browser supports notifications
    const isSupported = 'Notification' in window;
    
    if (isSupported) {
      setState(prev => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission,
        isSubscribed: Notification.permission === 'granted',
      }));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('Trình duyệt không hỗ trợ thông báo');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({
        ...prev,
        permission,
        isSubscribed: permission === 'granted',
      }));

      if (permission === 'granted') {
        toast.success('Đã bật thông báo trình duyệt');
        return true;
      } else if (permission === 'denied') {
        toast.error('Thông báo đã bị từ chối. Vui lòng bật trong cài đặt trình duyệt.');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Không thể yêu cầu quyền thông báo');
      return false;
    }
  }, [state.isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!state.isSupported || state.permission !== 'granted') {
      console.warn('Notifications not available or not permitted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true,
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [state.isSupported, state.permission]);

  const showCriticalAlert = useCallback((message: string, details?: {
    productionLine?: string;
    metric?: string;
    value?: number;
    threshold?: number;
  }) => {
    const body = details 
      ? `${message}\n\nDây chuyền: ${details.productionLine || 'N/A'}\nChỉ số: ${details.metric || 'N/A'}\nGiá trị: ${details.value?.toFixed(2) || 'N/A'}\nNgưỡng: ${details.threshold?.toFixed(2) || 'N/A'}`
      : message;

    return showNotification('⚠️ Cảnh báo nghiêm trọng - SPC System', {
      body,
      tag: 'critical-alert',
      requireInteraction: true,
      vibrate: [200, 100, 200],
    });
  }, [showNotification]);

  const showWarningAlert = useCallback((message: string, details?: {
    productionLine?: string;
    metric?: string;
    value?: number;
  }) => {
    const body = details 
      ? `${message}\n\nDây chuyền: ${details.productionLine || 'N/A'}\nChỉ số: ${details.metric || 'N/A'}\nGiá trị: ${details.value?.toFixed(2) || 'N/A'}`
      : message;

    return showNotification('⚡ Cảnh báo - SPC System', {
      body,
      tag: 'warning-alert',
    });
  }, [showNotification]);

  return {
    ...state,
    requestPermission,
    showNotification,
    showCriticalAlert,
    showWarningAlert,
  };
}
