// Service Worker (sw.js)
const CACHE_NAME = 'kasamatik-cache-v6'; // Sürüm v5'ten v6'ya yükseltildi (Kritik F5 hatası için).
// Dış CDN linkleri kaldırıldı, sadece kendi dosyalarımız cache'lenecek.
const urlsToCache = [
  '/',
  '/index.html',
  '/src/css/style.css',
  '/src/js/main.js',
  '/assets/logo.png',
  '/assets/logo_192.png',
  '/assets/logo_512.png',
  '/manifest.json'
];

// Yükleme (install) olayında cache'i oluştur ve dosyaları ekle
self.addEventListener('install', event => {
  console.log('[SW] Install event - Cache Name:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache açıldı ve dosyalar ekleniyor:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
          console.error('[SW] Cache açma/ekleme başarısız oldu:', error);
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


// Getirme (fetch) olayında - GÜNCELLENDİ: Network First Stratejisi
self.addEventListener('fetch', event => {
  // Sadece GET isteklerini ele al
  if (event.request.method !== 'GET') {
    return;
  }

  // API, Supabase veya dış CDN isteklerini cache'leme, doğrudan ağa git
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || 
      url.hostname.includes('supabase.co') || 
      url.hostname.includes('cdn.') || 
      url.hostname.includes('fonts.googleapis.com') || 
      url.hostname.includes('fonts.gstatic.com')) {
    // console.log('[SW] Cachelenmeyen istek (doğrudan ağ):', event.request.url);
    return; // Service Worker bu istekleri görmezden gelir
  }

  // Network First (Ağ Öncelikli) Stratejisi
  // Bu, F5 yenileme sorununu çözer.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      // 1. Ağı Dene (Network)
      return fetch(event.request).then(networkResponse => {
        // 1a. Ağ Başarılı: Yanıtı önbelleğe al ve döndür
        // console.log('[SW] Ağdan getirildi ve önbelleğe alındı:', event.request.url);
        // Sadece başarılı ve 'basic' (kendi domain'imizden) olanları cache'le
        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => {
        // 1b. Ağ Başarısız (Çevrimdışı): Önbelleği Dene (Cache)
        // console.log('[SW] Ağ başarısız, önbellekten getiriliyor:', event.request.url);
        return cache.match(event.request).then(cachedResponse => {
          return cachedResponse; // Önbellekte varsa döndür, yoksa (undefined) dönecek
        });
      });
    })
  );
});
