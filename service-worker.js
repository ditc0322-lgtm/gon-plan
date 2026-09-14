// 오프라인 지원을 위한 최소 서비스워커 (네트워크 우선 전략)
const CACHE_NAME = 'gon-plan-cache-v7';
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

// 온라인일 때는 항상 최신 파일을 받아오고, 오프라인일 때만 캐시를 사용
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request, { cache: 'no-store' })
            .then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
