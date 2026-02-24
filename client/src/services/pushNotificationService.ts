/**
 * Push Notification Service
 * Handles push notification subscription and management
 */

// Types
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export type NotificationType = 'spc_alert' | 'oee_alert' | 'security_alert' | 'iot_alert' | 'system_alert' | 'general';

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}

// Get current notification permission
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[PushNotification] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    console.warn('[PushNotification] Notifications are blocked');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[PushNotification] Permission:', permission);
    return permission;
  } catch (error) {
    console.error('[PushNotification] Error requesting permission:', error);
    return 'denied';
  }
}

// Subscribe to push notifications
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    console.warn('[PushNotification] Push not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      // Note: In production, you would get the VAPID public key from your server
      const vapidPublicKey = await getVapidPublicKey();
      
      if (!vapidPublicKey) {
        console.warn('[PushNotification] No VAPID key available');
        return null;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }

    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!)
      }
    };

    // Send subscription to server
    await sendSubscriptionToServer(subscriptionData);

    console.log('[PushNotification] Subscribed successfully');
    return subscriptionData;
  } catch (error) {
    console.error('[PushNotification] Error subscribing:', error);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await removeSubscriptionFromServer(subscription.endpoint);
      console.log('[PushNotification] Unsubscribed successfully');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[PushNotification] Error unsubscribing:', error);
    return false;
  }
}

// Check if currently subscribed
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    return false;
  }
}

// Show local notification (for testing or fallback)
export async function showLocalNotification(options: NotificationOptions): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('[PushNotification] Notifications not supported');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[PushNotification] Notification permission not granted');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    await registration.showNotification(options.title, {
      body: options.body,
      icon: options.icon || '/icon-192.png',
      badge: options.badge || '/icon-192.png',
      tag: options.tag,
      data: options.data,
      actions: options.actions,
      requireInteraction: options.requireInteraction,
      silent: options.silent,
      vibrate: options.vibrate || [100, 50, 100]
    });

    return true;
  } catch (error) {
    console.error('[PushNotification] Error showing notification:', error);
    return false;
  }
}

// Show alert notification based on type
export async function showAlertNotification(
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  const typeConfig: Record<NotificationType, { icon: string; tag: string; url: string }> = {
    spc_alert: {
      icon: '/icon-192.png',
      tag: 'spc-alert',
      url: '/analyze'
    },
    oee_alert: {
      icon: '/icon-192.png',
      tag: 'oee-alert',
      url: '/oee-dashboard'
    },
    security_alert: {
      icon: '/icon-192.png',
      tag: 'security-alert',
      url: '/security-dashboard'
    },
    iot_alert: {
      icon: '/icon-192.png',
      tag: 'iot-alert',
      url: '/iot-dashboard'
    },
    system_alert: {
      icon: '/icon-192.png',
      tag: 'system-alert',
      url: '/system-health'
    },
    general: {
      icon: '/icon-192.png',
      tag: 'general',
      url: '/dashboard'
    }
  };

  const config = typeConfig[type];

  return showLocalNotification({
    title,
    body,
    icon: config.icon,
    tag: config.tag,
    data: {
      ...data,
      url: config.url,
      type
    },
    actions: [
      { action: 'view', title: 'Xem chi tiết' },
      { action: 'dismiss', title: 'Bỏ qua' }
    ],
    requireInteraction: type === 'security_alert' || type === 'spc_alert'
  });
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Server communication functions
async function getVapidPublicKey(): Promise<string | null> {
  try {
    const response = await fetch('/api/push/vapid-public-key');
    if (response.ok) {
      const data = await response.json();
      return data.publicKey;
    }
    return null;
  } catch (error) {
    console.error('[PushNotification] Error getting VAPID key:', error);
    // Return a placeholder for development
    return null;
  }
}

async function sendSubscriptionToServer(subscription: PushSubscriptionData): Promise<void> {
  try {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });
  } catch (error) {
    console.error('[PushNotification] Error sending subscription to server:', error);
  }
}

async function removeSubscriptionFromServer(endpoint: string): Promise<void> {
  try {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ endpoint })
    });
  } catch (error) {
    console.error('[PushNotification] Error removing subscription from server:', error);
  }
}

export default {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  showLocalNotification,
  showAlertNotification
};
