const CACHE_NAME = 'weather-pwa-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    // You would add your icons here, for example:
    '/icons/icon-192x192.png',
     '/icons/icon-512x512.png',
    // etc.
];

// Install event: cache all the core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event: serve cached content first, then update
self.addEventListener('fetch', event => {
    // Only cache GET requests and for HTML/CSS/JS
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // Cache hit - return response
                    if (response) {
                        return response;
                    }
                    // No cache - fetch from network
                    return fetch(event.request).then(
                        response => {
                            // Check if we received a valid response
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            // IMPORTANT: Clone the response. A response is a stream and
                            // can only be consumed once.
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                            return response;
                        }
                    );
                })
        );
    }
});

// Activate event: delete old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
