// Service Worker for "The Plug" PWA
// Handles Push Notifications even when the app is closed

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {
    title: 'New Notification',
    body: 'Check The Plug for updates!',
    icon: '/favicon.svg'
  };

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
