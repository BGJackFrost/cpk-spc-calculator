/**
 * usePushNotifications - React hook for push notification management
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed as checkIsSubscribed,
  showAlertNotification,
  NotificationType
} from '@/services/pushNotificationService';

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    error: null
  });

  // Initialize state
  useEffect(() => {
    const init = async () => {
      const supported = isPushSupported();
      const permission = getNotificationPermission();
      const subscribed = supported ? await checkIsSubscribed() : false;

      setState({
        isSupported: supported,
        permission,
        isSubscribed: subscribed,
        isLoading: false,
        error: null
      });
    };

    init();
  }, []);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const permission = await requestNotificationPermission();
      
      setState(prev => ({
        ...prev,
        permission,
        isLoading: false
      }));

      return permission === 'granted';
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to request permission'
      }));
      return false;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Push notifications not supported' }));
      return false;
    }

    if (state.permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        return false;
      }
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const subscription = await subscribeToPush();
      
      if (subscription) {
        setState(prev => ({
          ...prev,
          isSubscribed: true,
          isLoading: false
        }));
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to subscribe'
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to subscribe'
      }));
      return false;
    }
  }, [state.isSupported, state.permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const success = await unsubscribeFromPush();
      
      setState(prev => ({
        ...prev,
        isSubscribed: !success,
        isLoading: false
      }));

      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to unsubscribe'
      }));
      return false;
    }
  }, []);

  // Show notification
  const showNotification = useCallback(async (
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<boolean> => {
    if (state.permission !== 'granted') {
      console.warn('[usePushNotifications] Permission not granted');
      return false;
    }

    return showAlertNotification(type, title, body, data);
  }, [state.permission]);

  // Toggle subscription
  const toggleSubscription = useCallback(async (): Promise<boolean> => {
    if (state.isSubscribed) {
      return unsubscribe();
    } else {
      return subscribe();
    }
  }, [state.isSubscribed, subscribe, unsubscribe]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    toggleSubscription,
    showNotification
  };
}

export default usePushNotifications;
