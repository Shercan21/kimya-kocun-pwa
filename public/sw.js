// Kimya Koçun service worker
// Sayfalar: önce ağ, ağ yoksa önbellek (güncel içerik + çevrimdışı açılış).
// /assets/ dosyaları: önce önbellek (adları içerik özetli, değişmez).
// Yeni sürüm yayımlarken CACHE adını değiştirmek eski önbelleği temizler.

const CACHE = 'kimya-kocun-pwa-v5'
// Yollar service worker'ın bulunduğu klasöre göre çözülür; böylece uygulama
// hem alan adının kökünde hem de /kimya-kocun-pwa/ gibi bir alt yolda çalışır.
const BASE = new URL('./', self.location).pathname
const INDEX = BASE + 'index.html'
const APP_SHELL = [
  BASE,
  INDEX,
  BASE + 'manifest.webmanifest',
  BASE + 'icon.svg',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('kimya-kocun-pwa-') && key !== CACHE)
          .map(key => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Sayfa açılışları
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone()
          caches.open(CACHE).then(cache => cache.put(INDEX, copy))
          return response
        })
        .catch(() =>
          caches.match(INDEX).then(cached => cached || caches.match(BASE))
        )
    )
    return
  }

  // Konu anlatımı, test ve etkinlikler: önbellekten hemen göster,
  // arkada ağdan güncelle (çevrimdışıyken daha önce açılanlar çalışır).
  if (url.pathname.startsWith(BASE + 'icerik/')) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => undefined)) }
      return response
    }).catch(() => caches.open(CACHE).then(cache => cache.match(request))))
    return
  }

  // Derlenmiş JS/CSS ve diğer statik dosyalar
  event.respondWith(
    caches.match(request).then(
      cached =>
        cached ||
        fetch(request).then(response => {
          if (response.ok && (url.pathname.startsWith(BASE + 'assets/') || APP_SHELL.includes(url.pathname))) {
            const copy = response.clone()
            caches.open(CACHE).then(cache => cache.put(request, copy))
          }
          return response
        })
    )
  )
})


