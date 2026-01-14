const CACHE_NAME = 'synerxus-v1';
const STATIC_CACHE = 'synerxus-static-v1';
const DATA_CACHE = 'synerxus-data-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html'
];

const API_CACHE_PATTERNS = [
  '/api/projects',
  '/api/tasks',
  '/api/impact-metrics',
  '/api/organizations'
];

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(url => url !== '/offline.html'));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && 
                     cacheName !== STATIC_CACHE && 
                     cacheName !== DATA_CACHE;
            })
            .map((cacheName) => {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (event.request.method !== 'GET') {
    if (url.pathname.startsWith('/api/volunteer-activities') || 
        url.pathname.startsWith('/api/project-impacts')) {
      event.respondWith(
        fetch(event.request.clone())
          .catch((error) => {
            console.log('[ServiceWorker] POST request failed, will be handled by IndexedDB');
            return new Response(
              JSON.stringify({ 
                offline: true, 
                message: 'Request saved for sync when online' 
              }),
              { 
                status: 202,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          })
      );
    }
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    const shouldCache = API_CACHE_PATTERNS.some(pattern => 
      url.pathname.startsWith(pattern)
    );
    
    if (shouldCache) {
      event.respondWith(
        caches.open(DATA_CACHE)
          .then((cache) => {
            return fetch(event.request)
              .then((response) => {
                if (response.ok) {
                  cache.put(event.request, response.clone());
                }
                return response;
              })
              .catch(() => {
                return cache.match(event.request);
              });
          })
      );
    } else {
      event.respondWith(
        fetch(event.request)
          .catch(() => {
            return caches.match(event.request);
          })
      );
    }
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          fetch(event.request)
            .then((response) => {
              if (response.ok) {
                caches.open(STATIC_CACHE)
                  .then((cache) => cache.put(event.request, response));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            if (response.ok && response.type === 'basic') {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE)
                .then((cache) => cache.put(event.request, responseClone));
            }
            return response;
          })
          .catch(() => {
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-activities') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_REQUESTED' });
        });
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    caches.open(DATA_CACHE)
      .then((cache) => {
        return Promise.all(
          urls.map((url) => 
            fetch(url)
              .then((response) => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch(() => {})
          )
        );
      });
  }
});

self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Synerxus', options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then((clients) => {
        for (const client of clients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
