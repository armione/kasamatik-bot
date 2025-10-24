// Service Worker (sw.js)
const CACHE_NAME = 'kasamatik-cache-v2'; // Sürüm v1'den v2'ye yükseltildi.
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
  // Yeni service worker'ın eskisiyle çakışmadan hemen aktif olmasını sağla
  self.skipWaiting();
});

// Aktivasyon (activate) olayında eski cache'leri temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Güncel CACHE_NAME dışındaki tüm 'kasamatik-cache-' ile başlayanları sil
          return cacheName.startsWith('kasamatik-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Eski cache siliniyor:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  // Aktif olur olmaz istemcileri (client) kontrolü altına almasını sağla
  return self.clients.claim();
});


// Getirme (fetch) olayında cache'i öncelikli kullan (Network fallback)
self.addEventListener('fetch', event => {
  // Sadece GET isteklerini cache'le
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 1. Cache'de varsa, cache'den döndür (Cache First)
        if (cachedResponse) {
          return cachedResponse;
        }

        // 2. Cache'de yoksa, ağdan (network) iste
        return fetch(event.request).then(
          networkResponse => {
            // Ağa gittikten sonra, cevabı cache'e ekle ve döndür
            if (networkResponse && networkResponse.status === 200 && urlsToCache.includes(event.request.url.replace(self.location.origin, ''))) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
          // Ağ hatası durumunda (çevrimdışı olma vb.)
          console.error('Fetch hatası:', error);
          // Burada çevrimdışı bir sayfa gösterebilirsiniz
        });
      })
  );
});
