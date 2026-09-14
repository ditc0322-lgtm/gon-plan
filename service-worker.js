// 오프라인 지원을 위한 최소 서비스워커 (캐시 우선 전략)
const CACHE_NAME = 'gon-plan-cache-v3';
const CACHE_FILES = [
    './',
    './index.html',
    './manifest.json',
    './css/styles.css',
    './js/storage.js',
    './js/app.js',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_FILES))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
});
