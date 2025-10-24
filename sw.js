// Service Worker (sw.js)
const CACHE_NAME = 'kasamatik-cache-v3'; // Sürüm v2'den v3'e yükseltildi.
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
  console.log('[SW] Install event - Cache Name:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache açıldı ve dosyalar ekleniyor.');
        // Önemli: addAll atomik bir işlemdir, biri bile başarısız olursa hepsi olmaz.
        // Hata ayıklama için tek tek eklemeyi düşünebilirsiniz.
        return cache.addAll(urlsToCache).catch(error => {
          console.error('[SW] Cache\'e ekleme sırasında hata:', error);
          // Hata durumunda hangi URL'nin sorun yarattığını bulmak için:
          urlsToCache.forEach(url => {
            cache.add(url).catch(err => console.error(`[SW] ${url} eklenemedi:`, err));
          });
          // Hata olsa bile devam etmesini sağlayalım (opsiyonel)
          return Promise.resolve();
        });
      })
      .catch(error => {
          console.error('[SW] Cache açma/ekleme başarısız oldu:', error);
      })
      .then(() => {
          // Yeni service worker'ın eskisiyle çakışmadan hemen aktif olmasını sağla
          console.log('[SW] skipWaiting çağrılıyor.');
          return self.skipWaiting();
      })
  );
});

// Aktivasyon (activate) olayında eski cache'leri temizle
self.addEventListener('activate', event => {
  console.log('[SW] Activate event - Current Cache Name:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Güncel CACHE_NAME dışındaki tüm 'kasamatik-cache-' ile başlayanları sil
          return cacheName.startsWith('kasamatik-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('[SW] Eski cache siliniyor:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
        // Aktif olur olmaz istemcileri (client) kontrolü altına almasını sağla
        console.log('[SW] clients.claim çağrılıyor.');
        return self.clients.claim();
    })
  );
});


// Getirme (fetch) olayında cache'i öncelikli kullan (Network fallback)
self.addEventListener('fetch', event => {
  // Sadece GET isteklerini cache'le
  if (event.request.method !== 'GET') {
    // console.log('[SW] Non-GET request:', event.request.method, event.request.url);
    return;
  }

  // API isteklerini veya Supabase isteklerini cache'leme (genellikle güncel veri gerekir)
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    // console.log('[SW] API/Supabase isteği cachelenmiyor:', event.request.url);
    return fetch(event.request);
  }

  // console.log('[SW] Fetching:', event.request.url);

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 1. Cache'de varsa, cache'den döndür (Cache First)
        if (cachedResponse) {
          // console.log('[SW] Cache\'den bulundu:', event.request.url);
          // İsteğe bağlı: Arka planda güncellemeyi kontrol et (Stale While Revalidate)
          // fetch(event.request).then(networkResponse => { /* ... cache'i güncelle ... */ });
          return cachedResponse;
        }

        // 2. Cache'de yoksa, ağdan (network) iste
        // console.log('[SW] Cache\'de bulunamadı, ağdan isteniyor:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Ağa gittikten sonra, cevabı cache'e ekle ve döndür
            // Sadece başarılı (2xx) cevapları ve cache'lenecekler listesindekileri cache'le
            if (networkResponse && networkResponse.ok && urlsToCache.some(url => event.request.url.endsWith(url) || event.request.url === self.location.origin + '/')) {
              // console.log('[SW] Ağdan gelen cevap cache\'e ekleniyor:', event.request.url);
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            } else if (networkResponse && !networkResponse.ok) {
              console.warn('[SW] Ağdan gelen cevap cache\'lenmiyor (status OK değil):', event.request.url, networkResponse.status);
            } else if (networkResponse) {
              // console.log('[SW] Ağdan gelen cevap cache\'lenmiyor (urlsToCache listesinde değil):', event.request.url);
            }
            return networkResponse;
          }
        ).catch(error => {
          // Ağ hatası durumunda (çevrimdışı olma vb.)
          console.error('[SW] Fetch hatası:', error, event.request.url);
          // Burada çevrimdışı bir sayfa veya genel bir hata mesajı döndürebilirsiniz.
          // Örneğin: return caches.match('/offline.html');
          // veya sadece hatayı propage et
          throw error;
        });
      })
  );
});
