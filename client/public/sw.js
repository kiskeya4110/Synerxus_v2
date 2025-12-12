// =============================================================================
// SERVICE WORKER - Enterprise-grade PWA Support
// Features: Offline-first, Background Sync, Push Notifications
// =============================================================================

const CACHE_VERSION = 'v2';
const CACHE_NAME = `synerxus-cache-${CACHE_VERSION}`;
const API_CACHE_NAME = `synerxus-api-cache-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `synerxus-images-${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// API endpoints to cache with stale-while-revalidate
const CACHEABLE_API_PATTERNS = [
  '/api/dashboard',
  '/api/users/me',
  '/api/projects',
  '/api/opportunities',
  '/api/impact-metrics',
  '/api/misc/sdg-goals',
  '/api/notifications',
];

// API endpoints that should NEVER be cached
const NO_CACHE_API_PATTERNS = [
  '/api/users/login',
  '/api/users/register',
  '/api/users/firebase-sync',
  '/api/storage/upload',
  '/api/metrics',
  '/health',
  '/ready',
];

// Cache TTLs in milliseconds
const CACHE_TTL = {
  API: 5 * 60 * 1000,          // 5 minutes
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7 days
  IMAGES: 24 * 60 * 60 * 1000,     // 24 hours
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

  // Handle API requests with stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    // Never cache certain endpoints
    const neverCache = NO_CACHE_API_PATTERNS.some(pattern =>
      url.pathname.startsWith(pattern)
    );
    if (neverCache) {
      return; // Let browser handle normally
    }

    // Check if this API endpoint should be cached
    const shouldCache = CACHEABLE_API_PATTERNS.some(pattern =>
      url.pathname.startsWith(pattern)
    );

    if (shouldCache) {
      event.respondWith(staleWhileRevalidate(request, API_CACHE_NAME, CACHE_TTL.API));
    }
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Network first for HTML pages (SPA navigation)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }
});

// =============================================================================
// CACHING STRATEGIES
// =============================================================================

// Cache first, falling back to network
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network first, falling back to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return cached index.html for SPA routes
    const indexCached = await caches.match('/index.html');
    if (indexCached) {
      return indexCached;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Stale while revalidate - return cache immediately, update in background
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch fresh data in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        // Store with timestamp
        const responseWithTime = response.clone();
        cache.put(request, responseWithTime);
      }
      return response;
    })
    .catch((error) => {
      console.error('[SW] Revalidation failed:', error);
      return cached || new Response('Offline', { status: 503 });
    });

  // Return cached immediately if available
  if (cached) {
    return cached;
  }

  // Otherwise wait for network
  return fetchPromise;
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot', '.webp', '.avif'
  ];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'clearCache') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }

  if (event.data?.type === 'QUEUE_ACTIVITY') {
    queueOfflineActivity(event.data.payload);
  }
});

// =============================================================================
// BACKGROUND SYNC - Queue offline actions for later
// =============================================================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-activities') {
    event.waitUntil(syncActivities());
  }

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncActivities() {
  try {
    const db = await openIndexedDB();
    const pendingActivities = await getPendingItems(db, 'pending-activities');

    for (const activity of pendingActivities) {
      try {
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': activity.userId,
          },
          body: JSON.stringify(activity.data),
        });

        if (response.ok) {
          await removePendingItem(db, 'pending-activities', activity.id);
          console.log('[SW] Synced activity:', activity.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync activity:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

async function syncMessages() {
  try {
    const db = await openIndexedDB();
    const pendingMessages = await getPendingItems(db, 'pending-messages');

    for (const message of pendingMessages) {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': message.userId,
          },
          body: JSON.stringify(message.data),
        });

        if (response.ok) {
          await removePendingItem(db, 'pending-messages', message.id);
          console.log('[SW] Synced message:', message.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Message sync failed:', error);
  }
}

async function queueOfflineActivity(activity) {
  try {
    const db = await openIndexedDB();
    await addPendingItem(db, 'pending-activities', activity);
    console.log('[SW] Queued activity for sync');

    // Request sync when online
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-activities');
    }
  } catch (error) {
    console.error('[SW] Failed to queue activity:', error);
  }
}

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  const options = {
    icon: '/favicon-192.png',
    badge: '/favicon-192.png',
    vibrate: [100, 50, 100],
    data: { url: '/' },
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      options.body = payload.body || 'New notification';
      options.data.url = payload.url || '/';
      options.tag = payload.tag || 'default';

      event.waitUntil(
        self.registration.showNotification(payload.title || 'Synerxus', options)
      );
    } catch (error) {
      event.waitUntil(
        self.registration.showNotification('Synerxus', {
          ...options,
          body: event.data.text(),
        })
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Check if a window is already open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window if none available
      return self.clients.openWindow(url);
    })
  );
});

// =============================================================================
// INDEXED DB HELPERS
// =============================================================================
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SynerxusOffline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-activities')) {
        db.createObjectStore('pending-activities', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('pending-messages')) {
        db.createObjectStore('pending-messages', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getPendingItems(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function addPendingItem(db, storeName, item) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removePendingItem(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

console.log('[SW] Service worker loaded - version', CACHE_VERSION);
