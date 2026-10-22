// Wygenerowane przez tools/release.js – nie edytuj ręcznie.
// Pliki aplikacji i zdjęcia ćwiczeń w pamięci telefonu → działa bez zasięgu (poza filmami).
const VERSION = 'trening-24b41abf4f';
const FILES = [
 "./",
 "index.html",
 "manifest.json",
 "icons/icon-180.png",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "styles.css?v=24b41abf4f",
 "js/exercises.js?v=24b41abf4f",
 "js/media.js?v=24b41abf4f",
 "js/videos.js?v=24b41abf4f",
 "js/content.js?v=24b41abf4f",
 "js/engine.js?v=24b41abf4f",
 "js/data.js?v=24b41abf4f",
 "js/app.js?v=24b41abf4f",
 "media/leg_press/0.webp",
 "media/leg_press/1.webp",
 "media/back_squat/0.webp",
 "media/back_squat/1.webp",
 "media/hack_squat/0.webp",
 "media/hack_squat/1.webp",
 "media/db_rdl/0.webp",
 "media/db_rdl/1.webp",
 "media/bb_rdl/0.webp",
 "media/bb_rdl/1.webp",
 "media/deadlift/0.webp",
 "media/deadlift/1.webp",
 "media/back_ext/0.webp",
 "media/back_ext/1.webp",
 "media/hip_thrust/0.webp",
 "media/hip_thrust/1.webp",
 "media/glute_bridge/0.webp",
 "media/glute_bridge/1.webp",
 "media/split_squat/0.webp",
 "media/split_squat/1.webp",
 "media/walking_lunge/0.webp",
 "media/walking_lunge/1.webp",
 "media/step_up/0.webp",
 "media/step_up/1.webp",
 "media/lying_leg_curl/0.webp",
 "media/lying_leg_curl/1.webp",
 "media/seated_leg_curl/0.webp",
 "media/seated_leg_curl/1.webp",
 "media/leg_extension/0.webp",
 "media/leg_extension/1.webp",
 "media/calf_machine/0.webp",
 "media/calf_machine/1.webp",
 "media/calf_db/0.webp",
 "media/calf_db/1.webp",
 "media/calf_leg_press/0.webp",
 "media/calf_leg_press/1.webp",
 "media/db_bench/0.webp",
 "media/db_bench/1.webp",
 "media/machine_chest_press/0.webp",
 "media/machine_chest_press/1.webp",
 "media/bb_bench/0.webp",
 "media/bb_bench/1.webp",
 "media/incline_db_press/0.webp",
 "media/incline_db_press/1.webp",
 "media/push_up/0.webp",
 "media/push_up/1.webp",
 "media/pec_deck/0.webp",
 "media/pec_deck/1.webp",
 "media/cable_fly/0.webp",
 "media/cable_fly/1.webp",
 "media/db_shoulder_press/0.webp",
 "media/db_shoulder_press/1.webp",
 "media/machine_shoulder_press/0.webp",
 "media/machine_shoulder_press/1.webp",
 "media/ohp/0.webp",
 "media/ohp/1.webp",
 "media/db_lateral_raise/0.webp",
 "media/db_lateral_raise/1.webp",
 "media/face_pull/0.webp",
 "media/face_pull/1.webp",
 "media/reverse_pec_deck/0.webp",
 "media/reverse_pec_deck/1.webp",
 "media/db_rear_delt_fly/0.webp",
 "media/db_rear_delt_fly/1.webp",
 "media/cable_row/0.webp",
 "media/cable_row/1.webp",
 "media/db_row/0.webp",
 "media/db_row/1.webp",
 "media/machine_row/0.webp",
 "media/machine_row/1.webp",
 "media/bb_row/0.webp",
 "media/bb_row/1.webp",
 "media/lat_pulldown/0.webp",
 "media/lat_pulldown/1.webp",
 "media/pull_up/0.webp",
 "media/pull_up/1.webp",
 "media/db_curl/0.webp",
 "media/db_curl/1.webp",
 "media/hammer_curl/0.webp",
 "media/hammer_curl/1.webp",
 "media/cable_curl/0.webp",
 "media/cable_curl/1.webp",
 "media/ez_curl/0.webp",
 "media/ez_curl/1.webp",
 "media/rope_pushdown/0.webp",
 "media/rope_pushdown/1.webp",
 "media/overhead_db_ext/0.webp",
 "media/overhead_db_ext/1.webp",
 "media/overhead_cable_ext/0.webp",
 "media/overhead_cable_ext/1.webp",
 "media/plank/0.webp",
 "media/plank/1.webp",
 "media/side_plank/0.webp",
 "media/side_plank/1.webp",
 "media/pallof_press/0.webp",
 "media/pallof_press/1.webp",
 "media/cable_crunch/0.webp",
 "media/cable_crunch/1.webp",
 "media/bulgarian_split_squat/0.webp",
 "media/bulgarian_split_squat/1.webp",
 "media/hanging_leg_raise/0.webp",
 "media/hanging_leg_raise/1.webp",
 "media/band_lateral_raise/0.webp",
 "media/band_lateral_raise/1.webp",
 "media/db_press_standing/0.webp",
 "media/db_press_standing/1.webp",
 "media/band_pullup/0.webp",
 "media/band_pullup/1.webp",
 "media/inverted_row/0.webp",
 "media/inverted_row/1.webp",
 "media/diamond_push_up/0.webp",
 "media/diamond_push_up/1.webp",
 "media/push_up_incline/0.webp",
 "media/push_up_incline/1.webp",
 "media/push_up_decline/0.webp",
 "media/push_up_decline/1.webp"
];

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
