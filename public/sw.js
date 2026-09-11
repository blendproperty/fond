const CACHE = 'fond-offline-v1';
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE).then(cache => cache.add('/offline.html'))); self.skipWaiting();});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('fond-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));});
// Never cache APIs, customer data, payment responses or stale menus.
self.addEventListener('fetch', event => {if(event.request.mode === 'navigate' && event.request.method === 'GET') event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));});
