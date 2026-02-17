/* eslint-disable no-restricted-globals */

// Firebase Messaging Service Worker
// This handles push notifications when the app is in the background

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config is injected at build time or can be set here
// For production, replace these with your actual Firebase config values
firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, taskId } = payload.data || {};

  const notificationTitle = title || 'ClearMind Reminder';
  const notificationOptions = {
    body: body || 'You have a task reminder',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: taskId || 'clearmind-reminder',
    requireInteraction: true,
    data: {
      taskId: taskId,
      url: '/',
    },
    actions: [
      { action: 'open', title: 'View Task' },
      { action: 'snooze', title: 'Snooze 15 min' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'dismiss') {
    // Just close the notification
    return;
  }

  // Open or focus the app
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(data.url || '/');
      })
  );
});
