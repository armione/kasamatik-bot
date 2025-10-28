// Service Worker (sw.js)
const CACHE_NAME = 'kasamatik-cache-v6'; // Sürüm v5'ten v6'ya yükseltildi.
// Dış CDN linkleri kaldırıldı, sadece kendi dosyalarımız cache'lenecek.
const urlsToCache = [
  '/',
  '/index.html',
  '/src/css/style.css',
  '/src/js/main.js', // Ana JS dosyası
  // Diğer önemli JS modülleri (opsiyonel, main.js import ediyorsa genellikle gerekmez)
  // '/src/js/event_listeners.js',
  // '/src/js/api/auth.js',
  // '/src/js/components/modals.js',
  // ... diğerleri ...
  '/assets/logo.png',
  '/assets/logo_192.png',
  '/assets/logo_512.png',
  '/manifest.json' // Manifest dosyasını da ekleyelim
];

// Yükleme (install) olayında cache'i oluştur ve dosyaları ekle
self.addEventListener('install', event => {
  console.log('[SW] Install event - Cache Name:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache açıldı ve dosyalar ekleniyor:', urlsToCache);
        return cache.addAll(urlsToCache).catch(error => {
          console.error('[SW] Cache\'e ekleme sırasında hata (addAll):', error);
          // Hata ayıklama için tek tek ekleme denemesi
          urlsToCache.forEach(url => {
            cache.add(url).catch(err => console.error(`[SW] ${url} eklenemedi:`, err));
          });
          return Promise.resolve(); // Hata olsa bile SW kurulumuna devam et
        });
      })
      .catch(error => {
          console.error('[SW] Cache açma başarısız oldu:', error);
      })
      .then(() => {
          console.log('[SW] skipWaiting çağrılıyor.');
          return self.skipWaiting(); // Yeni SW'nin hemen aktif olmasını sağla
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
        console.log('[SW] clients.claim çağrılıyor.');
        return self.clients.claim(); // Aktif SW'nin sayfaları kontrol etmesini sağla
    })
  );
});


// Getirme (fetch) olayında cache'i öncelikli kullan (Network fallback)
self.addEventListener('fetch', event => {
  // Sadece GET isteklerini ele al
  if (event.request.method !== 'GET') {
    return;
  }

  // API, Supabase veya dış CDN isteklerini cache'leme, doğrudan ağa git
  const url = event.request.url;
  // Güvenlik:fonts.googleapis.com veya fonts.gstatic.com gibi fontları da hariç tutalım.
  if (url.includes('/api/') || url.includes('supabase.co') || url.includes('cdn.') || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    // console.log('[SW] Cachelenmeyen istek:', url); // Debug için log eklenebilir
    return; // Service Worker bu istekleri görmezden gelir, tarayıcı normal şekilde yönetir
  }

  // Cache'deki dosyalar için Cache First stratejisi
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Cache'de varsa, cache'den döndür
        if (cachedResponse) {
          // console.log('[SW] Cache\'den bulundu:', event.request.url);
          return cachedResponse;
        }

        // Cache'de yoksa, ağdan iste
        // console.log('[SW] Cache\'de bulunamadı, ağdan isteniyor:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Başarılı cevabı (opsiyonel olarak) cache'e ekle
            if (networkResponse && networkResponse.ok) {
              // Sadece cache'lenecekler listesindeyse veya ana sayfa ise cache'le
              // Önemli: Dönen cevabın tipini kontrol etmek iyi bir pratik olabilir (örn: basic, cors)
              if (networkResponse.type === 'basic' && (urlsToCache.some(cacheUrl => url.endsWith(cacheUrl)) || url === self.location.origin + '/')) {
                  const responseToCache = networkResponse.clone();
                  caches.open(CACHE_NAME)
                    .then(cache => {
                      // console.log('[SW] Ağdan gelen cevap cache\'e ekleniyor:', event.request.url);
                      cache.put(event.request, responseToCache);
                    });
              }
            }
            return networkResponse;
          }
        ).catch(error => {
          // Ağ hatası (çevrimdışı olma durumu vb.)
          console.error('[SW] Fetch hatası:', error, event.request.url);
          // İsteğe bağlı: Çevrimdışı sayfası göster
          // return caches.match('/offline.html');
          throw error; // Veya hatayı yukarıya ilet
        });
      })
  );
});
