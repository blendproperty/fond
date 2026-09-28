const CACHE = 'fond-offline-v2';
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/offline.html','/brand/midpoint-cafe-powered-by-fond.svg']))); self.skipWaiting();});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('fond-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));});
// Never cache APIs, customer data, payment responses or stale menus.
self.addEventListener('fetch', event => {if(event.request.mode === 'navigate' && event.request.method === 'GET') event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(async clients => {
    const staff = clients.find(client => new URL(client.url).pathname === '/staff');
    if (staff) return staff.focus();
    return self.clients.openWindow('/staff');
  }));
});
