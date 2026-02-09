/**
 * Service Worker for CPK/SPC Calculator PWA
 * Enhanced with intelligent caching for code-split vendor chunks
 * 
 * Cache Strategies:
 * - Hashed assets (vendor-*.js, *.css): Cache-first, immutable (never re-fetched)
 * - API requests: Network-first with offline fallback
 * - Navigation: Network-first with offline page fallback
 * - Dynamic content: Stale-while-revalidate
 */

const CACHE_VERSION = 'v3';
const IMMUTABLE_CACHE = `cpk-spc-immutable-${CACHE_VERSION}`;
const STATIC_CACHE = `cpk-spc-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `cpk-spc-dynamic-${CACHE_VERSION}`;
const API_CACHE = `cpk-spc-api-${CACHE_VERSION}`;

// Max cache sizes to prevent storage bloat
const MAX_DYNAMIC_CACHE = 100;
const MAX_API_CACHE = 50;

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
];

// API endpoints worth caching for offline access
const CACHEABLE_API_PATTERNS = [
  /\/api\/trpc\/auth\.me/,
  /\/api\/trpc\/system\./,
  /\/api\/trpc\/spc\./,
  /\/api\/trpc\/oee\./,
  /\/api\/trpc\/machine\./,
];

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Installing v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] Pre-cache failed:', err))
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v' + CACHE_VERSION);
  const validCaches = [IMMUTABLE_CACHE, STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n.startsWith('cpk-spc-') && !validCaches.includes(n))
          .map((n) => { console.log('[SW] Purging old cache:', n); return caches.delete(n); })
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch Router ───────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET over HTTP(S)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // 1. Immutable hashed assets → cache-first, never expire
  if (isHashedAsset(url.pathname)) {
    event.respondWith(cacheFirstImmutable(request));
    return;
  }

  // 2. API requests → network-first with offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // 3. Navigation → network-first with offline page
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // 4. Other static assets (.css, .png, fonts) → stale-while-revalidate
  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // 5. Everything else → network with dynamic cache fallback
  event.respondWith(networkFirstDynamic(request));
});

// ─── Cache Strategies ───────────────────────────────────────────────────────

/**
 * Cache-first for immutable hashed assets (vendor-xxx-hash.js, index-hash.css)
 * These files have content hashes in filenames — once cached, they never change.
 * This eliminates network requests for vendor chunks on subsequent visits.
 */
async function cacheFirstImmutable(request) {
  const cache = await caches.open(IMMUTABLE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Store with no expiry — hash guarantees content integrity
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

/**
 * Network-first for API calls, with cached fallback for offline
 */
async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && shouldCacheApi(request.url)) {
      cache.put(request, response.clone());
      trimCache(API_CACHE, MAX_API_CACHE);
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'You are currently offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Network-first for navigation, with offline page fallback
 */
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match('/offline.html');
    if (offline) return offline;
    return caches.match('/index.html');
  }
}

/**
 * Stale-while-revalidate: return cached immediately, update in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response('Unavailable', { status: 503 });
}

/**
 * Network-first with dynamic cache fallback
 */
async function networkFirstDynamic(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE);
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || new Response('Unavailable offline', { status: 503 });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Detect hashed build assets: assets/vendor-charts-AbCd1234.js, assets/index-XyZ789.css
 * Pattern: /assets/<name>-<8+ char hash>.<ext>
 */
function isHashedAsset(pathname) {
  return /\/assets\/[a-zA-Z0-9_-]+-[a-zA-Z0-9]{8,}\.(js|css)$/.test(pathname);
}

function isStaticAsset(pathname) {
  return /\.(png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|ico)$/i.test(pathname);
}

function shouldCacheApi(url) {
  return CACHEABLE_API_PATTERNS.some((p) => p.test(url));
}

/**
 * Trim cache to max entries (FIFO)
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await Promise.all(keys.slice(0, keys.length - maxItems).map((k) => cache.delete(k)));
  }
}

// ─── Push Notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = { title: 'CPK/SPC Alert', body: 'New notification' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/', timestamp: Date.now(), type: data.type || 'general' },
      actions: data.actions || [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      tag: data.tag || 'cpk-spc-notification',
      renotify: true,
      requireInteraction: data.type === 'critical'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if (c.url.includes(self.location.origin) && 'focus' in c) {
            c.navigate(url);
            return c.focus();
          }
        }
        return clients.openWindow?.(url);
      })
  );
});

// ─── Background Sync ────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  console.log('[SW] Syncing pending data...');
}

// ─── Messages ───────────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(caches.keys().then((ns) => Promise.all(ns.map((n) => caches.delete(n)))));
  }
  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
