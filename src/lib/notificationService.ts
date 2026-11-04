import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Product, StoreId } from '../types';

const CHANNEL_ID = 'chuse_price_alerts';
const PREFS_KEY = 'chuse_notifications_enabled';
const LAST_PRICES_KEY = 'chuse_last_price_snapshot';

export interface NotificationStatus {
  supported: boolean;
  permissionGranted: boolean;
  enabledByUser: boolean;
}

/**
 * Initialize notification channels on Android
 */
export async function initNotificationService(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Chuse Price Alerts & Deals',
        description: 'Instant alerts when supermarket prices drop on your staples and basket',
        importance: 5,
        visibility: 1,
        vibration: true,
        sound: 'res_bell'
      });
    } catch (err) {
      console.warn('[NotificationService] Channel creation notice:', err);
    }
  }
}

/**
 * Check whether notifications are supported and permitted
 */
export async function getNotificationStatus(): Promise<NotificationStatus> {
  const enabledByUser = localStorage.getItem(PREFS_KEY) !== 'false';

  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      return {
        supported: true,
        permissionGranted: status.display === 'granted',
        enabledByUser
      };
    } catch {
      return { supported: true, permissionGranted: false, enabledByUser };
    }
  }

  // Web Browser fallback
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return {
      supported: true,
      permissionGranted: window.Notification.permission === 'granted',
      enabledByUser
    };
  }

  return { supported: false, permissionGranted: false, enabledByUser };
}

/**
 * Request notification permissions from Android or Web browser
 */
export async function requestNotificationPermission(): Promise<boolean> {
  localStorage.setItem(PREFS_KEY, 'true');

  if (Capacitor.isNativePlatform()) {
    try {
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      if (granted) {
        await initNotificationService();
      }
      return granted;
    } catch (err) {
      console.warn('[NotificationService] Permission request failed:', err);
      return false;
    }
  }

  // Web Browser
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const permission = await window.Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      return false;
    }
  }

  return false;
}

/**
 * Enable or disable notifications in user preferences
 */
export function setNotificationPreference(enabled: boolean): void {
  localStorage.setItem(PREFS_KEY, enabled ? 'true' : 'false');
}

/**
 * Send an immediate push / local notification
 */
export async function sendPushNotification(title: string, body: string, extraData?: Record<string, any>): Promise<boolean> {
  const enabled = localStorage.getItem(PREFS_KEY) !== 'false';
  if (!enabled) return false;

  const notifId = Math.floor(Date.now() % 100000);

  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return false;
      }

      await initNotificationService();

      const options: ScheduleOptions = {
        notifications: [
          {
            id: notifId,
            title,
            body,
            channelId: CHANNEL_ID,
            smallIcon: 'ic_launcher',
            extra: extraData || {},
            schedule: { at: new Date(Date.now() + 100) }
          }
        ]
      };

      await LocalNotifications.schedule(options);
      return true;
    } catch (err) {
      console.error('[NotificationService] Failed to schedule native notification:', err);
      return false;
    }
  }

  // Web Browser Notification fallback
  if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
    try {
      new window.Notification(title, {
        body,
        icon: '/icons/chuse-icon.png'
      });
      return true;
    } catch (e) {
      console.warn('[NotificationService] Web notification failed:', e);
    }
  }

  return false;
}

/**
 * Trigger an instant test notification
 */
export async function sendTestNotification(): Promise<boolean> {
  const permGranted = await requestNotificationPermission();
  if (!permGranted) {
    return false;
  }

  return sendPushNotification(
    'chuse. Price Alert Active',
    'Price monitoring is active! You will be notified immediately whenever grocery prices drop or specials appear.',
    { type: 'test_alert' }
  );
}

/**
 * Monitor product catalog for price reductions and trigger alerts
 */
export async function checkAndNotifyPriceDrops(products: Product[]): Promise<void> {
  if (!products || products.length === 0) return;
  const enabled = localStorage.getItem(PREFS_KEY) !== 'false';
  if (!enabled) return;

  try {
    const rawPrev = localStorage.getItem(LAST_PRICES_KEY);
    const prevSnapshot: Record<string, number> = rawPrev ? JSON.parse(rawPrev) : {};
    const newSnapshot: Record<string, number> = {};

    let alertSent = false;

    for (const prod of products) {
      if (!prod.prices || prod.prices.length === 0) continue;

      // Find lowest current price
      const validPrices = prod.prices.filter(p => p.price > 0);
      if (validPrices.length === 0) continue;

      const lowest = validPrices.reduce((min, cur) => cur.price < min.price ? cur : min, validPrices[0]);
      newSnapshot[prod.id] = lowest.price;

      const previousPrice = prevSnapshot[prod.id];
      if (previousPrice && lowest.price < previousPrice && !alertSent) {
        const drop = (previousPrice - lowest.price).toFixed(2);
        const storeName = lowest.storeId.toUpperCase();

        await sendPushNotification(
          `Price Drop on ${prod.name}!`,
          `Now R${lowest.price.toFixed(2)} at ${storeName} (Dropped by R${drop}). Save on your essentials!`,
          { productId: prod.id, storeId: lowest.storeId }
        );
        alertSent = true;
      }
    }

    localStorage.setItem(LAST_PRICES_KEY, JSON.stringify(newSnapshot));
  } catch (err) {
    console.warn('[NotificationService] Price monitor error:', err);
  }
}
