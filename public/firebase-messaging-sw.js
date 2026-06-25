/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBZBpGN6py4F6bvU5kWK1_I-FxxUL2iS8A',
  authDomain: 'alertas-222f4.firebaseapp.com',
  projectId: 'alertas-222f4',
  storageBucket: 'alertas-222f4.firebasestorage.app',
  messagingSenderId: '690337997060',
  appId: '1:690337997060:web:3f9fe60193c31d1f57b051',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'MiTiendaVirtual';
  const options = {
    body: payload.notification?.body || 'Tienes una nueva notificación',
    icon: '/images/icon-192.png',
    badge: '/images/icon-72.png',
    data: payload.data || {},
    tag: 'mtv-notification',
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('mitiendavirtual') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/dashboard');
    })
  );
});
