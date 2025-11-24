
const CACHE_NAME = 'pharmacy-schedule-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 安裝 Service Worker 並快取基本檔案
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 啟用並清理舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 攔截請求 (Network First)
self.addEventListener('fetch', (event) => {
  // 只處理 http/https 請求
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 如果網路請求成功，複製一份到快取
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 網路失敗時，嘗試讀取快取
        return caches.match(event.request);
      })
  );
});
