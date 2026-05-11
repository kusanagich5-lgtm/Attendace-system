// ─── Firebase Messaging Service Worker ────────────────────────────────────
// Place this file at the ROOT of your GitHub Pages repo (same level as index.html)

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB1X0GYw5rSUIKkDBzir7YDNkhkWXhW9q0",
  authDomain: "attendance-system-b54f5.firebaseapp.com",
  projectId: "attendance-system-b54f5",
  storageBucket: "attendance-system-b54f5.firebasestorage.app",
  messagingSenderId: "553546638054",
  appId: "1:553546638054:web:854531f78994326efad127"
});

const messaging = firebase.messaging();

// Handle background push messages (when app is not in foreground)
messaging.onBackgroundMessage(payload => {
  const { title, body, icon, data } = payload.notification || {};
  self.registration.showNotification(title || 'Attendance System', {
    body: body || '',
    icon: icon || './icon-192.png',
    badge: './icon-96.png',
    data: data || {},
    vibrate: [200, 100, 200],
    tag: data?.tag || 'attendance-notif',
    renotify: true,
  });
});

// On notification click — open or focus the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = self.location.origin + (event.notification.data?.url || '/');
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.startsWith(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// ─── PWA Install / Cache ───────────────────────────────────────────────────
const CACHE = 'att-v1';
const PRECACHE = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return; // never cache API calls
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
