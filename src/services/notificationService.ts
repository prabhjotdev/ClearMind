import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import app from '../config/firebase';
import { updateSettings } from './settingsService';

let messaging: ReturnType<typeof getMessaging> | null = null;

/**
 * Initialize Firebase Cloud Messaging.
 * Returns null if the browser doesn't support notifications.
 */
function getMessagingInstance() {
  if (messaging) return messaging;

  try {
    messaging = getMessaging(app);
    return messaging;
  } catch {
    console.warn('FCM not supported in this browser');
    return null;
  }
}

/**
 * Request notification permission and register the FCM token.
 * Returns the token if successful, null otherwise.
 */
export async function requestNotificationPermission(
  userId: string
): Promise<string | null> {
  // Check if notifications are supported
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return null;
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    console.warn('Notification permission denied');
    await updateSettings(userId, { pushNotificationsEnabled: false });
    return null;
  }

  const fcmMessaging = getMessagingInstance();
  if (!fcmMessaging) return null;

  try {
    // The VAPID key would come from Firebase Console > Cloud Messaging > Web Push certificates
    const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;

    const token = await getToken(fcmMessaging, {
      vapidKey: vapidKey || undefined,
    });

    if (token) {
      // Save to user settings
      await updateSettings(userId, {
        fcmToken: token,
        pushNotificationsEnabled: true,
      });
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Check current notification permission status.
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Listen for foreground FCM messages.
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(
  callback: (payload: MessagePayload) => void
): (() => void) | null {
  const fcmMessaging = getMessagingInstance();
  if (!fcmMessaging) return null;

  return onMessage(fcmMessaging, (payload) => {
    callback(payload);
  });
}

/**
 * Show a browser notification (for in-app triggered reminders).
 * This is used for reminders detected by the client-side checker,
 * separate from FCM push notifications.
 */
export function showLocalNotification(
  title: string,
  body: string,
  taskId?: string
): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: taskId || 'clearmind-reminder', // Collapse duplicate notifications for same task
    requireInteraction: true, // Keep notification visible until user interacts
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
