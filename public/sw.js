// ── Checkmate Service Worker ──────────────────────────────────────────────────
// วางไฟล์นี้ที่ public/sw.js

const CACHE_NAME = 'checkmate-v1';

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ── Push Event ────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Checkmate', body: event.data.text() };
  }

  const {
    title = 'Checkmate Reminder',
    body = 'You have a task due soon.',
    icon = '/icon-192.png',
    badge = '/badge-72.png',
    tag = 'checkmate-reminder',
    taskId = null,
    listId = null,
    url = '/',
    actions = [],
  } = data;

  const options = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { taskId, listId, url },
    actions: [
      { action: 'open', title: '📋 View Task' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action } = event;
  const { url, taskId } = event.notification.data || {};

  if (action === 'dismiss') return;

  // Build URL with taskId param so app can open the right task
  const targetUrl = taskId
    ? `${self.location.origin}/?task=${taskId}`
    : (url || self.location.origin);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If app is already open, focus it
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'OPEN_TASK', taskId });
          return;
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Push subscription change ──────────────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  // Re-subscribe if subscription expired
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.__VAPID_PUBLIC_KEY__,
    }).then((subscription) => {
      // Notify the app to update Firestore with new subscription
      return clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: JSON.stringify(subscription),
          });
        });
      });
    })
  );
});
