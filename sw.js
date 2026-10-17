const CACHE_NAME = '112-asistan-v48-full-offline';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './translator.js',
  './voice-commands.js',
  './quiz-questions.js',
  './manifest.json',
  // Images
  './img/logo.jpg',
  './img/logo.png',
  './img/analogo.jpg',
  './img/ant.jpg',
  './img/nfr.jpg',
  './img/ven.jpg',
  './img/lateralmı.jpg',
  './img/STSEGMENT.JPG',
  './img/ekg1.jpg',
  './img/tp1.jpg',
  './img/tp2.jpg',
  './img/tp3.jpg',
  './img/svt1.jpg',
  './img/af1.jpg',
  './img/vt.jpg',
  './img/polvt.jpg',
  './img/yanik_yuzdesi.jpg',
  './img/yanik_cocuk.jpg',
  // Sounds - TÜM SES DOSYALARI
  './sound/beep.mp3',
  './sound/wheezing.mp3',
  './sound/ronkus.mp3',
  './sound/stridor.mp3',
  './sound/krup.mp3',
  './sound/ronküs.MP3',
  './sound/KABA RALLER .MP3',
  // Videos - TÜM VİDEOLAR
  './video/dekompresyon.mp4',
  './video/krikotomi.mp4',
  './video/io.mp4',
  './video/pace.mp4',
  './video/sync.mp4',
  './video/vagal.mp4',
  // PWA Icons
  './img/icons/pwa/icon-72x72.jpg',
  './img/icons/pwa/icon-96x96.jpg',
  './img/icons/pwa/icon-128x128.jpg',
  './img/icons/pwa/icon-144x144.jpg',
  './img/icons/pwa/icon-152x152.jpg',
  './img/icons/pwa/icon-192x192.jpg',
  './img/icons/pwa/icon-384x384.jpg',
  './img/icons/pwa/icon-512x512.jpg',
  './img/icons/maskable/maskable-192x192.jpg',
  './img/icons/maskable/maskable-512x512.jpg'
];

// Service Worker yüklendiğinde cache'i güncelle
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.log('Cache yükleme hatası (bazı dosyalar eksik olabilir):', err);
      });
    })
  );
  self.skipWaiting(); // Yeni SW'yi hemen aktif et
});

// Eski cache'leri temizle + tüm clientları kontrol altına al
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
  // Tüm açık sayfalara güncelleme bildirimi gönder
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
  });
});

// ============================================================
// Akıllı Cache Stratejisi:
// HTML/JS/CSS → NETWORK-FIRST (her zaman güncel kod)
// Resim/Video/Ses → CACHE-FIRST (offline için)
// ============================================================
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Sadece aynı origin'deki dosyalar için cache stratejisi uygula
  if (!isSameOrigin) return;

  // HTML, JS, CSS dosyaları → NETWORK-FIRST
  const isCodeFile = url.pathname.endsWith('.html') ||
                     url.pathname.endsWith('.js') ||
                     url.pathname.endsWith('.css') ||
                     url.pathname === '/' ||
                     url.pathname.endsWith('/');

  if (isCodeFile) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Network başarılı → cache'e kaydet ve dön
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Network yok → cache'ten dönmeyi dene
          return caches.match(event.request).then(cached => {
            return cached || new Response('Offline', {
              status: 503,
              headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
            });
          });
        })
    );
    return;
  }

  // Diğer dosyalar (resim, video, ses) → CACHE-FIRST + arka planda güncelle
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Cache'te varsa hemen döndür
      if (cachedResponse) {
        // Arka planda network'ten güncelle (stale-while-revalidate)
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Cache'te yoksa network'ten getir
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});
