// Service Worker for Sadhana Tracker PWA
const CACHE_NAME = 'sadhana-tracker-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Required for Chrome Android installability
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Time for your sadhana check-in.',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-72.png',
      data: data.data || {},
      vibrate: data.vibrate || [200, 100, 200],
      tag: data.tag || 'sadhana',
      requireInteraction: data.requireInteraction || true,
      actions: [
        { action: 'open', title: 'Open Tracker' },
        { action: 'close', title: 'Dismiss' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || '🙏 Sadhana Reminder', options)
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification('🙏 Sadhana Reminder', {
        body: 'Have you completed your sadhana today?',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200],
        requireInteraction: true
      })
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});