// Pliki aplikacji w pamięci telefonu → działa na siłowni bez zasięgu (poza filmami).
// Przy każdej aktualizacji aplikacji podbij numer wersji.
const VERSION = 'trening-v1';
const FILES = [
  './', 'index.html', 'styles.css?v=1', 'manifest.json',
  'js/exercises.js?v=1', 'js/videos.js?v=1', 'js/engine.js?v=1', 'js/app.js?v=1',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Strona: najpierw sieć (świeża wersja), bez sieci – z pamięci. Reszta: z pamięci, potem sieć.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
