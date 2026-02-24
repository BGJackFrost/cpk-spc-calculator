/**
 * Service Worker for CPK/SPC Calculator PWA
 * v4 — Enhanced offline support with build-manifest precaching,
 *       update lifecycle, and IndexedDB offline queue.
 *
 * Cache Strategies:
 *  - Hashed assets (vendor-*.js, *.css): Cache-first, immutable
 *  - API GET requests: Network-first with offline fallback
 *  - API mutations (POST/PUT/DELETE): Queue in IndexedDB when offline
 *  - Navigation: Network-first with offline page fallback
 *  - Static assets: Stale-while-revalidate
 */

const CACHE_VERSION = 'v4';
const IMMUTABLE_CACHE = `cpk-spc-immutable-${CACHE_VERSION}`;
const STATIC_CACHE = `cpk-spc-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `cpk-spc-dynamic-${CACHE_VERSION}`;
const API_CACHE = `cpk-spc-api-${CACHE_VERSION}`;

const MAX_DYNAMIC_CACHE = 100;
const MAX_API_CACHE = 50;

const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico'
];

const CACHEABLE_API_PATTERNS = [
  /\/api\/trpc\/auth\.me/,
  /\/api\/trpc\/system\./,
  /\/api\/trpc\/spc\./,
  /\/api\/trpc\/oee\./,
  /\/api\/trpc\/machine\./,
];

// ─── IndexedDB for offline mutation queue ──────────────────────────────────

const DB_NAME = 'cpk-spc-offline';
const STORE_NAME = 'pending-mutations';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueMutation(request) {
  try {
    const db = await openOfflineDB();
    const body = await request.clone().text();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now()
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[SW] Failed to queue mutation:', err);
  }
}

async function replayMutations() {
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const items = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!items.length) return;
    console.log(`[SW] Replaying ${items.length} queued mutations`);

    const deleteTx = db.transaction(STORE_NAME, 'readwrite');
    const deleteStore = deleteTx.objectStore(STORE_NAME);

    for (const item of items) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });
        deleteStore.delete(item.id);
      } catch (err) {
        console.warn('[SW] Replay failed for', item.url, err);
        break;
      }
    }
  } catch (err) {
    console.warn('[SW] Replay mutations error:', err);
  }
}

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Installing ' + CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Pre-cache partial failure:', err);
        return self.skipWaiting();
      })
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating ' + CACHE_VERSION);
  const validCaches = [IMMUTABLE_CACHE, STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n.startsWith('cpk-spc-') && !validCaches.includes(n))
          .map((n) => { console.log('[SW] Purging old cache:', n); return caches.delete(n); })
      ))
      .then(() => self.clients.claim())
      .then(() => {
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
          });
        });
      })
  );
});

// ─── Fetch Router ───────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;
  if (request.headers.get('upgrade') === 'websocket') return;
  if (url.pathname === '/api/sse') return;

  if (request.method !== 'GET') {
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleMutation(request));
    }
    return;
  }

  if (isHashedAsset(url.pathname)) {
    event.respondWith(cacheFirstImmutable(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  event.respondWith(networkFirstDynamic(request));
});

// ─── Cache Strategies ───────────────────────────────────────────────────────

async function cacheFirstImmutable(request) {
  const cache = await caches.open(IMMUTABLE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Asset unavailable offline', { status: 503 });
  }
}

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
      JSON.stringify({ error: 'Offline', message: 'Bạn đang offline. Dữ liệu sẽ được đồng bộ khi có kết nối.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

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
    return caches.match('/');
  }
}

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

async function handleMutation(request) {
  try {
    return await fetch(request);
  } catch (err) {
    await queueMutation(request);
    return new Response(
      JSON.stringify({
        error: 'Queued',
        message: 'Thao tác đã được lưu và sẽ tự động gửi khi có kết nối.',
        queued: true
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isHashedAsset(pathname) {
  return /\/assets\/[a-zA-Z0-9_-]+-[a-zA-Z0-9]{8,}\.(js|css)$/.test(pathname);
}

function isStaticAsset(pathname) {
  return /\.(png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|ico)$/i.test(pathname);
}

function shouldCacheApi(url) {
  return CACHEABLE_API_PATTERNS.some((p) => p.test(url));
}

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
      icon: '/favicon-48x48.png',
      badge: '/favicon-48x48.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/', timestamp: Date.now(), type: data.type || 'general' },
      actions: data.actions || [
        { action: 'view', title: 'Xem chi tiết' },
        { action: 'dismiss', title: 'Bỏ qua' }
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
  if (event.tag === 'sync-pending-data' || event.tag === 'replay-mutations') {
    event.waitUntil(replayMutations());
  }
});

// ─── Messages ───────────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type } = event.data || {};

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((ns) => Promise.all(ns.map((n) => caches.delete(n))))
    );
  }

  if (type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }

  if (type === 'ONLINE') {
    event.waitUntil(replayMutations());
  }

  if (type === 'PRECACHE_ASSETS') {
    const assets = event.data.assets || [];
    if (assets.length) {
      event.waitUntil(
        caches.open(IMMUTABLE_CACHE).then((cache) =>
          Promise.allSettled(
            assets.map((url) =>
              cache.match(url).then((existing) => {
                if (!existing) return cache.add(url);
              })
            )
          )
        )
      );
    }
  }
});
