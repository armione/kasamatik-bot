// Service Worker (sw.js)
const CACHE_NAME = 'kasamatik-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/css/style.css',
  '/src/js/main.js',
  '/assets/logo.png',
  '/assets/logo_192.png',
  '/assets/logo_512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/flatpickr',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Montserrat:wght@400;500;600;700;800&display=swap'
];

// Yükleme (install) olayında cache'i oluştur ve dosyaları ekle
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache açıldı ve dosyalar ekleniyor.');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
          console.error('Cache\'e ekleme başarısız oldu:', error);
      })
  );
});

// Getirme (fetch) olayında cache'i öncelikli kullan
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache'de varsa, cache'den döndür
        if (response) {
          return response;
        }
        // Cache'de yoksa, ağı kullanarak isteği yap ve dön
        return fetch(event.request);
      }
    )
  );
});
