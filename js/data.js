// Dane: schemat, migracje, kopia zapasowa (eksport/import/scalanie) i zapis w IndexedDB.
// Czyste funkcje (migrate, makeBackup, parseBackup, mergeStates) działają też w Node (testy).

const Data = (() => {
  const SCHEMA = 2;
  const LS_KEY = 'trening.v1';

  function emptyBody() { return { weights: [], kcal: {}, steps: {}, circ: [] }; }

  // Uzupełnia brakujące pola i podnosi stary stan (localStorage, wersja 1) do bieżącego schematu
  function migrate(s) {
    if (!s || !s.profile) return null;
    const out = { ...s };
    const from = s.schemaVersion || 1;
    if (from < 2) {
      out.profile = { location: 'silownia', parq: null, ...s.profile };
      out.log = (s.log || []).map(l => ({ type: 'strength', ...l, entries: (l.entries || []).map(e => ({ ...e, sets: (e.sets || []).map(x => ({ rir: null, ...x })) })) }));
      out.needsReplan = true; // plan z wersji 1 ma inny układ – ułożymy go od nowa, ciężary zostają
      if (out.active && !(out.active.entries || []).some(e => (e.sets || []).some(x => x.done))) out.active = null;
      if (out.active) out.active = { stage: 'ex', readiness: null, timer: null, ...out.active, entries: out.active.entries.map(e => ({ rir: [2, 3], techFail: false, note: '', pain: [], ...e })) };
    }
    out.schemaVersion = SCHEMA;
    out.prog = out.prog || {};
    out.log = out.log || [];
    out.body = { ...emptyBody(), ...(out.body || {}) };
    out.nutrition = out.nutrition || {};
    out.settings = { plates: [25, 20, 15, 10, 5, 2.5, 1.25], bar: 20, machineStep: 2.5, sound: true, ...(out.settings || {}) };
    out.meso = out.meso || {};
    out.deload = out.deload || null;
    out.pain = out.pain || [];
    out.next = out.next || 0;
    return out;
  }

  // Suma kontrolna FNV-1a (32 bit) – wykrywa uszkodzony lub ręcznie zmieniony plik
  function checksum(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function makeBackup(state, photos) {
    const data = { state, photos: photos || null };
    const body = JSON.stringify(data);
    return JSON.stringify({ app: 'moj-trening', schemaVersion: SCHEMA, exportedAt: new Date().toISOString(), checksum: checksum(body), data });
  }

  function parseBackup(text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { return { ok: false, error: 'To nie jest plik JSON.' }; }
    // stary format: sam stan aplikacji
    if (o && o.profile && o.plan) return { ok: true, legacy: true, state: migrate(o), photos: null, checksumOk: null };
    if (!o || o.app !== 'moj-trening' || !o.data || !o.data.state) return { ok: false, error: 'To nie jest kopia aplikacji Mój Trening.' };
    const checksumOk = checksum(JSON.stringify(o.data)) === o.checksum;
    const state = migrate(o.data.state);
    if (!state) return { ok: false, error: 'W kopii brakuje danych profilu.' };
    return { ok: true, state, photos: o.data.photos || null, checksumOk, exportedAt: o.exportedAt };
  }

  function summary(state) {
    const b = state.body || {};
    return {
      workouts: (state.log || []).filter(l => l.type !== 'cardio').length,
      cardio: (state.log || []).filter(l => l.type === 'cardio').length,
      weights: (b.weights || []).length, circ: (b.circ || []).length,
      kcal: Object.keys(b.kcal || {}).length, steps: Object.keys(b.steps || {}).length,
    };
  }

  // Scalanie: zostaje bieżący profil, plan i ciężary; dochodzą brakujące wpisy z kopii
  function mergeStates(cur, inc) {
    const out = JSON.parse(JSON.stringify(cur));
    const logKey = l => (l.startedAt || l.date) + '|' + (l.dayKey || l.type || '');
    const have = new Set(out.log.map(logKey));
    for (const l of inc.log || []) if (!have.has(logKey(l))) out.log.push(l);
    out.log.sort((a, b) => (a.date < b.date ? -1 : 1));
    const wDates = new Set(out.body.weights.map(w => w.date));
    for (const w of (inc.body && inc.body.weights) || []) if (!wDates.has(w.date)) out.body.weights.push(w);
    out.body.weights.sort((a, b) => (a.date < b.date ? -1 : 1));
    for (const k of ['kcal', 'steps']) out.body[k] = { ...((inc.body && inc.body[k]) || {}), ...out.body[k] };
    const cDates = new Set(out.body.circ.map(c => c.date));
    for (const c of (inc.body && inc.body.circ) || []) if (!cDates.has(c.date)) out.body.circ.push(c);
    out.body.circ.sort((a, b) => (a.date < b.date ? -1 : 1));
    for (const [id, p] of Object.entries(inc.prog || {})) if (!out.prog[id]) out.prog[id] = p;
    const pk = new Set(out.pain.map(p => p.date));
    for (const p of inc.pain || []) if (!pk.has(p.date)) out.pain.push(p);
    return out;
  }

  // ─── IndexedDB (z zapasowym localStorage, gdy IDB niedostępne) ───
  const DB_NAME = 'moj-trening';
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('Brak IndexedDB'));
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error('Baza zablokowana'));
    });
    return dbp;
  }
  function req(store, mode, fn) {
    return db().then(d => new Promise((resolve, reject) => {
      const tx = d.transaction(store, mode);
      const out = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }));
  }

  let useLS = false;
  async function loadState() {
    let s = null;
    try {
      s = await req('kv', 'readonly', st => st.get('state'));
    } catch (e) { useLS = true; }
    if (!s) {
      let legacy = null;
      try { legacy = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { /* brak */ }
      if (legacy && legacy.profile) {
        s = migrate(legacy);
        if (!useLS) {
          await saveState(s);
          const check = await req('kv', 'readonly', st => st.get('state'));
          if (check && check.profile) { try { localStorage.removeItem(LS_KEY); } catch (e) { /* nic */ } }
        }
        return s;
      }
      return null;
    }
    return migrate(s);
  }

  async function saveState(s) {
    if (useLS) { localStorage.setItem(LS_KEY, JSON.stringify(s)); return; }
    await req('kv', 'readwrite', st => st.put(JSON.parse(JSON.stringify(s)), 'state'));
  }

  async function clearAll() {
    try { await req('kv', 'readwrite', st => st.clear()); await req('photos', 'readwrite', st => st.clear()); } catch (e) { /* nic */ }
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* nic */ }
  }

  const photos = {
    add: rec => req('photos', 'readwrite', st => st.add(rec)),
    all: () => req('photos', 'readonly', st => st.getAll()),
    del: id => req('photos', 'readwrite', st => st.delete(id)),
    clear: () => req('photos', 'readwrite', st => st.clear()),
  };

  return { SCHEMA, migrate, checksum, makeBackup, parseBackup, summary, mergeStates, loadState, saveState, clearAll, photos, usingFallback: () => useLS };
})();

if (typeof module !== 'undefined') module.exports = Data;
