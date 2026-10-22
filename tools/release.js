// Przygotowanie wersji do publikacji: node tools/release.js
// 1) js/media.js z listy zdjęć (tools/media-sources.json)
// 2) numer wersji = skrót zawartości plików → ?v= w index.html i nazwa pamięci w sw.js
// 3) sw.js z pełną listą plików do pracy offline (aplikacja + zdjęcia)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const rel = p => path.join(root, p);

// 1. Zdjęcia
const sources = JSON.parse(fs.readFileSync(rel('tools/media-sources.json'), 'utf8'));
const media = {};
for (const [id, m] of Object.entries(sources)) {
  if (!m.source) continue;
  for (const f of ['0.webp', '1.webp']) if (!fs.existsSync(rel(`media/${id}/${f}`))) throw new Error(`Brak media/${id}/${f}`);
  media[id] = { frames: 2, source: m.source, sourceId: m.sourceId, license: m.license };
}
fs.writeFileSync(rel('js/media.js'),
  '// Wygenerowane przez tools/release.js – zdjęcia 2 faz ruchu (free-exercise-db, Unlicense).\nconst MEDIA = ' + JSON.stringify(media, null, 1) + ';\n');

// 2. Wersja
const APP = ['styles.css', 'js/exercises.js', 'js/media.js', 'js/videos.js', 'js/content.js', 'js/engine.js', 'js/data.js', 'js/app.js'];
const hash = crypto.createHash('sha256');
for (const f of APP) hash.update(fs.readFileSync(rel(f)));
const v = hash.digest('hex').slice(0, 10);

let html = fs.readFileSync(rel('index.html'), 'utf8');
for (const f of APP) {
  const re = new RegExp(f.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '(\\?v=[0-9a-z]+)?"', 'g');
  if (!re.test(html)) throw new Error('index.html nie zawiera ' + f);
  html = html.replace(re, `${f}?v=${v}"`);
}
fs.writeFileSync(rel('index.html'), html);

// 3. Service worker
const mediaFiles = Object.keys(media).flatMap(id => [`media/${id}/0.webp`, `media/${id}/1.webp`]);
const files = ['./', 'index.html', 'manifest.json', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', ...APP.map(f => `${f}?v=${v}`), ...mediaFiles];
const sw = `// Wygenerowane przez tools/release.js – nie edytuj ręcznie.
// Pliki aplikacji i zdjęcia ćwiczeń w pamięci telefonu → działa bez zasięgu (poza filmami).
const VERSION = 'trening-${v}';
const FILES = ${JSON.stringify(files, null, 1)};

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)));
});

// Nowa wersja czeka, aż użytkownik kliknie „Odśwież” (komunikat z aplikacji)
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
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
`;
fs.writeFileSync(rel('sw.js'), sw);
const bytes = mediaFiles.reduce((a, f) => a + fs.statSync(rel(f)).size, 0);
console.log(`Wersja ${v}: ${files.length} plików offline, zdjęcia ${Math.round(bytes / 1024)} KB.`);
