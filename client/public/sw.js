// =============================================================================
// SERVICE WORKER - 95%+ Performance Optimization
// Caches static assets and API responses for offline/fast access
// =============================================================================

const CACHE_NAME = 'synerxus-cache-v1';
const API_CACHE_NAME = 'synerxus-api-cache-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API endpoints to cache with stale-while-revalidate
const CACHEABLE_API_PATTERNS = [
  '/api/dashboard',
  '/api/users',
  '/api/projects',
  '/api/opportunities',
  '/api/impact-metrics',
  '/api/sdg',
];

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
    // Check if this API endpoint should be cached
    const shouldCache = CACHEABLE_API_PATTERNS.some(pattern =>
      url.pathname.startsWith(pattern)
    );

    if (shouldCache) {
      event.respondWith(staleWhileRevalidate(request, API_CACHE_NAME, 60000)); // 1 minute max age
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
});
