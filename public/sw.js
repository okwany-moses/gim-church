const CACHE_NAME = 'gimk-portal-v10';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './logo.jpg',
  './logo-192.png',
  './logo-512.png',
  './manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Resiliently pre-caching app shell assets...');
      const cachePromises = ASSETS_TO_CACHE.map((asset) => {
        return fetch(asset)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to fetch static asset: status ${response.status}`);
            }
            // Safeguard: Do not cache HTML responses for non-HTML static assets
            const contentType = response.headers.get('content-type') || '';
            const isHTMLAsset = asset === './' || asset === './index.html';
            if (!isHTMLAsset && contentType.includes('text/html')) {
              throw new Error(`Blocked caching HTML response for non-HTML asset "${asset}"`);
            }
            return cache.put(asset, response);
          })
          .catch((err) => {
            console.warn(`[Service Worker] Skipping cache for asset "${asset}":`, err.message);
          });
      });
      return Promise.all(cachePromises);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing stale cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event with Stale-While-Revalidate caching strategy and HTML response safeguards
self.addEventListener('fetch', (event) => {
  // Only cache GET requests and skip API requests or non-http protocols
  if (event.request.method !== 'GET' || event.request.url.includes('/api/') || !event.request.url.startsWith('http')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch a fresh copy in the background to update the cache
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const contentType = networkResponse.headers.get('content-type') || '';
              const isHTML = contentType.includes('text/html');
              // Only put in cache if it's not HTML, or if it is a deliberate navigation request
              if (!isHTML || event.request.mode === 'navigate') {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
              }
            }
          })
          .catch(() => { /* Ignore background update failures */ });
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Safeguard: Do not cache HTML responses for non-navigation/static asset requests
        const contentType = networkResponse.headers.get('content-type') || '';
        const isHTML = contentType.includes('text/html');
        const isNavigation = event.request.mode === 'navigate';
        if (isHTML && !isNavigation) {
          return networkResponse; // Serve directly but do not cache
        }

        // Accept and cache same-origin (basic) and cross-origin (cors) assets
        if (networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If completely offline and asset is index.html, return the cached root
        if (event.request.mode === 'navigate') {
          return caches.match('./').then((response) => response || caches.match('./index.html'));
        }
      });
    })
  );
});
