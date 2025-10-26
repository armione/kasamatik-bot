// Service Worker (sw.js)
const CACHE_NAME = 'kasamatik-cache-v6'; // Sürüm v5'ten v6'ya yükseltildi (PWA Düzeltmesi).
// Önbelleğe alınacak temel uygulama dosyaları ("App Shell")
const urlsToCache = [
  '/', // Ana sayfa
  '/index.html', // Ana HTML (yukarıdakiyle aynı olabilir ama eklemek iyi)
  '/src/css/style.css',
  '/src/js/main.js',
  // Diğer önemli JS modülleri (main.js import ediyorsa genellikle gerekmez, ama eklemek garanti olur)
  '/src/js/state.js',
  '/src/js/event_listeners.js',
  '/src/js/api/auth.js',
  '/src/js/api/database.js',
  '/src/js/api/gemini.js',
  '/src/js/components/dashboard.js',
  '/src/js/components/history.js',
  '/src/js/components/modals.js',
  '/src/js/components/statistics.js',
  '/src/js/components/ui_helpers.js',
  '/src/js/utils/constants.js',
  '/src/js/utils/helpers.js',
  '/src/js/pwa_installer.js',
  // Temel görseller ve manifest
  '/assets/logo.png',
  '/assets/logo_192.png',
  '/assets/logo_512.png',
  '/manifest.json'
];

// Yükleme (install) olayında App Shell'i önbelleğe al
self.addEventListener('install', event => {
  console.log('[SW] Install event - Cache Name:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache açıldı ve App Shell dosyaları ekleniyor:', urlsToCache);
        // urlsToCache içindeki tüm dosyaları cache'e ekle
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
          // Cache açma veya addAll sırasında hata olursa logla
          console.error('[SW] App Shell önbelleğe alınırken hata:', error);
      })
      .then(() => {
          // Yeni SW'nin eski SW'yi beklemeden hemen aktif olmasını sağla
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
      // Mevcut CACHE_NAME dışındaki tüm 'kasamatik-cache-' ile başlayan cache'leri bul
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('kasamatik-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          // Eski cache'leri sil
          console.log('[SW] Eski cache siliniyor:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
        // Aktif SW'nin sayfaları hemen kontrol etmesini sağla
        console.log('[SW] clients.claim çağrılıyor.');
        return self.clients.claim();
    })
  );
});

// Getirme (fetch) olayında önbellek stratejilerini uygula
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Sadece GET isteklerini ele al
  if (request.method !== 'GET') {
    return;
  }

  // API istekleri (Supabase, Vercel API, Gemini) -> Network Only (Asla cache'leme)
  // Bu istekler dinamik veri içerir ve her zaman ağdan gelmelidir.
  if (url.origin.includes('supabase.co') || url.pathname.startsWith('/api/') || url.hostname.includes('googleapis.com')) {
    // console.log('[SW] Network Only isteği:', request.url);
    // Bu isteği SW görmezden gelir, tarayıcı normal şekilde yönetir.
    return;
  }

  // Uygulama Kabuğu (App Shell) Dosyaları (CSS, JS, Temel HTML, Manifest) -> Cache First
  // Bu dosyalar nadiren değişir ve hızlı yüklenmesi önemlidir. Önce cache'e bakılır.
  if (urlsToCache.some(path => url.pathname === path || (path === '/' && url.pathname === '/index.html'))) {
    // console.log('[SW] Cache First isteği (App Shell):', request.url);
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        // Cache'de varsa, cache'den döndür
        if (cachedResponse) {
          return cachedResponse;
        }
        // Cache'de yoksa, ağdan iste ve cache'e ekle
        return fetch(request).then(networkResponse => {
          // Başarılı bir cevap geldiyse cache'e ekle
          if (networkResponse && networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(error => {
            console.error('[SW] App Shell fetch hatası:', error, request.url);
            // Çevrimdışı sayfası veya genel bir hata mesajı gösterilebilir
            // return new Response('İnternet bağlantısı yok ve dosya önbellekte bulunamadı.', { status: 404, statusText: 'Not Found' });
            throw error; // Veya hatayı yukarıya ilet
        });
      })
    );
    return; // Bu isteği işledik, devam etme
  }

  // Diğer Statik Varlıklar (CDN Kütüphaneleri, Fontlar, Görseller) -> Stale-While-Revalidate
  // Bu dosyalar değişebilir, ama anında güncellenmeleri kritik değildir.
  // Önce cache'den sunulur (hızlı), sonra arka planda güncel versiyon kontrol edilir.
  // GÖREV 3 DÜZELTMESİ: CDN ve Fontları da kapsayacak şekilde genişletildi.
  if (url.origin === self.location.origin || url.hostname.includes('cdn.') || url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com')) {
    // console.log('[SW] Stale-While-Revalidate isteği:', request.url);
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          // Ağdan isteği başlat (cache'de olsun veya olmasın)
          const fetchPromise = fetch(request).then(networkResponse => {
            // Başarılı cevap geldiyse cache'i güncelle
            if (networkResponse && networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              cache.put(request, responseToCache);
            }
            return networkResponse;
          }).catch(error => {
              console.warn('[SW] Stale-While-Revalidate fetch hatası (arka plan):', error, request.url);
              // Ağ hatası olsa bile cache varsa onu kullanmaya devam et
          });

          // Cache'de varsa, hemen cache'den döndür, arka planda fetch devam etsin
          if (cachedResponse) {
            return cachedResponse;
          }
          // Cache'de yoksa, fetch sonucunu bekle ve döndür
          return fetchPromise;
        });
      })
    );
    return; // Bu isteği işledik, devam etme
  }

  // Diğer tüm istekler (tarayıcı eklentileri vb.) -> Network Only (SW görmezden gelir)
  // console.log('[SW] İşlenmeyen istek (Tarayıcı yönetecek):', request.url);
  return;

});
