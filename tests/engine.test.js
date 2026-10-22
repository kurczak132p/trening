// Testy logiki: node tests/engine.test.js
const assert = require('assert');
const E = require('../js/engine.js');
const D = require('../js/data.js');
const C = require('../js/content.js');
const { EXERCISES, EQUIPMENT, EQUIPMENT_BY_PLACE, INJURIES, MUSCLES } = require('../js/exercises.js');

const GYM = EQUIPMENT_BY_PLACE.silownia, HOME = EQUIPMENT_BY_PLACE.dom;
const base = { sex: 'm', age: 30, height: 180, weight: 92, exp: 0, goal: 'redukcja', priorities: [], days: 3, duration: 60, location: 'silownia', equipment: GYM, injuries: [], activity: 'siedzaca' };
let failures = 0;
const check = (name, fn) => { try { fn(); } catch (e) { failures++; console.log('✗', name, '\n   ', e.message); } };
const DAY = 864e5;

// 1. Spójność bazy ćwiczeń i szablonów
check('baza ćwiczeń', () => {
  const eqIds = EQUIPMENT.map(e => e.id);
  for (const [id, ex] of Object.entries(EXERCISES)) {
    assert(ex.name && ex.pat && Array.isArray(ex.eq) && ex.load, id + ': brak pól');
    assert(ex.steps && ex.steps.length && ex.setup && ex.mistakes, id + ': brak opisu');
    assert(ex.cues && ex.cues.length >= 3, id + ': brak wskazówek');
    assert(ex.sc && Object.keys(ex.sc).every(m => MUSCLES[m]), id + ': brak/zła partia sc');
    if (ex.load !== 'bw') assert(ex.k && ex.k.m > 0 && ex.k.f > 0, id + ': brak k');
    if (ex.load === 'bw') assert(ex.range, id + ': bw bez range');
    ex.eq.forEach(e => assert(eqIds.includes(e), id + ': nieznany sprzęt ' + e));
    (ex.avoid || []).forEach(a => assert(INJURIES.some(i => i.id === a), id + ': nieznana dolegliwość ' + a));
    for (const k of ['harder', 'easier']) if (ex[k]) assert(EXERCISES[ex[k]], id + ': zły ' + k);
  }
  for (const [k, s] of Object.entries(E.SLOTS)) {
    [...s.p0, ...(s.p1 || []), ...(s.p2 || [])].forEach(id => assert(EXERCISES[id], `slot ${k}: brak ćwiczenia ${id}`));
    Object.keys(s.ranges || {}).forEach(id => assert(EXERCISES[id], `slot ${k}: ranges ${id}`));
  }
  for (const t of Object.values(E.TEMPLATES)) for (const d of t.days) [...d.items, ...d.extra].forEach(k => assert(E.SLOTS[k], 'brak slotu ' + k));
});

// 2. Plan A ze specyfikacji – dokładnie dla zaczynającego na pełnej siłowni
check('plan FBW A/B (specyfikacja + dołożone serie)', () => {
  const plan = E.generatePlan({ ...base, duration: 75 });
  assert.strictEqual(plan.template, 'fbw_gym');
  const A = plan.days[0].items.map(i => `${i.exId}:${i.sets}x${i.lo}-${i.hi}`);
  assert.deepStrictEqual(A, ['goblet_squat:3x6-10', 'db_bench:3x8-12', 'cable_row:3x8-12', 'db_rdl:3x8-12', 'db_lateral_raise:2x12-15', 'rope_pushdown:2x10-15', 'plank:2x30-45']);
  const B = plan.days[1].items.map(i => `${i.exId}:${i.sets}x${i.lo}-${i.hi}`);
  assert.deepStrictEqual(B, ['bb_rdl:3x6-10', 'lat_pulldown:3x8-12', 'db_shoulder_press:3x8-12', 'incline_db_press:3x8-12', 'walking_lunge:3x8-12', 'db_curl:3x10-15', 'pallof_press:2x10-12']);
  assert.strictEqual(plan.days[0].items[4].ss, 'S'); assert.strictEqual(plan.days[0].items[5].ss, 'S');
  assert.deepStrictEqual(plan.days[0].items[0].rir, [2, 3]);
  // „trochę ćwiczył” → przysiad ze sztangą
  assert.strictEqual(E.generatePlan({ ...base, exp: 1 }).days[0].items[0].exId, 'back_squat');
});

check('wybór planu: dom, 4 dni, góra/dół', () => {
  assert.strictEqual(E.generatePlan({ ...base, location: 'dom', equipment: HOME }).template, 'fbw_home');
  const p4 = E.generatePlan({ ...base, days: 4 });
  assert.strictEqual(p4.template, 'fbw_gym'); assert.strictEqual(p4.cardioDay, true); assert.strictEqual(p4.strengthDays, 3);
  const ul = E.generatePlan({ ...base, days: 4, exp: 2, duration: 75 });
  assert.strictEqual(ul.template, 'ul4'); assert.strictEqual(ul.days.length, 4); assert.strictEqual(ul.cardioDay, false);
  assert.strictEqual(E.generatePlan({ ...base, days: 4, forceUL: true }).template, 'ul4');
  const home = E.generatePlan({ ...base, location: 'dom', equipment: HOME, duration: 75 });
  assert.deepStrictEqual(home.days[0].items.map(i => i.exId), ['goblet_squat', 'push_up_incline', 'db_row', 'db_rdl', 'band_lateral_raise', 'dead_bug']);
  assert.deepStrictEqual(home.days[1].items.map(i => i.exId), ['bulgarian_split_squat', 'db_press_standing', 'band_pullup', 'db_rdl', 'push_up_incline', 'db_curl', 'diamond_push_up', 'side_plank']);
});

// 2b. Objętość: przy 3 treningach i 75 min każda partia ≥ 8 serii tygodniowo (brzuch ≥ 4)
check('serie tygodniowo ≥ 8 przy 75 min', () => {
  for (const [location, equipment] of [['silownia', GYM], ['dom', HOME]]) for (const exp of [0, 1]) for (const goal of ['redukcja', 'masa', 'sila', 'zdrowie']) {
    const plan = E.generatePlan({ ...base, location, equipment, exp, goal, duration: 75 });
    const w = E.planWeeklySets(plan);
    for (const m of ['klatka', 'plecy', 'barki', 'biceps', 'triceps', 'czworoglowe', 'posladki', 'dwuglowe']) assert((w[m] || 0) >= 8, `${location}/${goal}/exp${exp}: ${m} = ${w[m]}`);
    assert((w.brzuch || 0) >= 4, location + ': brzuch');
    plan.days.forEach(d => assert(d.estMin <= 75, `${location}: ${d.name} ${d.estMin} min`));
  }
});

// 3. Wszystkie kombinacje → plan bez błędów i zgodny z ograniczeniami
const combos = [];
for (const days of [2, 3, 4]) for (const duration of [45, 60, 75]) for (const goal of ['masa', 'redukcja', 'sila', 'zdrowie'])
  for (const exp of [0, 1, 2]) for (const inj of [[], ['ledzwia'], ['kolana'], ['barki'], ['nadgarstki'], ['ledzwia', 'kolana', 'barki', 'nadgarstki']])
    for (const [location, eq] of [['silownia', GYM], ['silownia', ['hantle', 'lawka']], ['silownia', ['maszyny', 'wyciagi']], ['dom', HOME], ['dom', ['hantle']]])
      for (const prio of [[], ['ramiona'], ['nogi', 'brzuch'], ['klatka', 'plecy', 'barki']])
        combos.push({ ...base, days, duration, goal, exp, injuries: inj, location, equipment: eq, priorities: prio });

check('wszystkie kombinacje (' + combos.length + ')', () => {
  for (const p of combos) {
    const plan = E.generatePlan(p);
    for (const d of plan.days) {
      const ids = d.items.map(i => i.exId);
      assert(new Set(ids).size === ids.length, 'duplikat w dniu ' + JSON.stringify(p));
      for (const it of d.items) {
        const ex = EXERCISES[it.exId];
        assert(E.exAllowed(it.exId, p), `niedozwolone ${it.exId} dla ${JSON.stringify(p)}`);
        assert(it.sets >= 1 && it.sets <= 4, 'serie ' + it.sets);
        assert(it.lo < it.hi, 'zakres ' + it.exId + ' ' + it.lo + '-' + it.hi);
        assert(it.alts.includes(it.exId), 'alternatywy ' + it.exId);
        if (it.ss) assert(d.items.filter(o => o.ss === it.ss).length === 2, 'superseria bez pary');
        const w = E.startWeight(it.exId, p);
        assert(Number.isFinite(w) && w >= 0, 'ciężar ' + it.exId);
        if (ex.load === 'bb') assert(w >= (ex.minW || 20), 'sztanga poniżej gryfu');
      }
      const full = (p.location === 'silownia' && p.equipment === GYM) || (p.location === 'dom' && p.equipment === HOME);
      if (full && p.injuries.length < 4) {
        assert(d.items.length >= 3, `za mało ćwiczeń (${d.items.length}) ${d.name} ${JSON.stringify(p)}`);
        assert(d.estMin <= p.duration + 5, `za długo ${d.estMin} min vs ${p.duration} ${d.name} ${JSON.stringify(p)}`);
      }
    }
  }
});

// 4. Progresja wg specyfikacji 1.4A
check('progresja', () => {
  const e = (exId, w, reps, lo = 8, hi = 12, rir = [2, 2], extra = {}) => ({ exId, lo, hi, rir, sets: reps.map(r => ({ w, reps: r, done: true, rir: null })), ...extra });
  let r = E.evaluate(e('db_bench', 12, [12, 12, 12]), null);
  assert.strictEqual(r.prog.w, 14); assert.strictEqual(r.change, 1);
  r = E.evaluate(e('back_squat', 60, [10, 10, 10], 6, 10), null);
  assert.strictEqual(r.prog.w, 65, 'przysiad ≥60 kg +5');
  r = E.evaluate(e('back_squat', 50, [10, 10, 10], 6, 10), null);
  assert.strictEqual(r.prog.w, 52.5, 'przysiad <60 kg +2,5');
  r = E.evaluate(e('bb_bench', 60, [8, 8, 8, 8], 5, 8), null);
  assert.strictEqual(r.prog.w, 62.5, 'góra ciała +2,5');
  r = E.evaluate(e('lat_pulldown', 40, [12, 12, 12]), null, { settings: { machineStep: 5 } });
  assert.strictEqual(r.prog.w, 45, 'krok stosu 5');
  // RIR za niski → bez podnoszenia
  const low = e('db_bench', 12, [12, 12, 12]); low.sets.forEach(s => { s.rir = 0; });
  r = E.evaluate(low, null);
  assert.strictEqual(r.prog.w, 12);
  // technika się sypała → bez podnoszenia
  r = E.evaluate(e('db_bench', 12, [12, 12, 12], 8, 12, [2, 2], { techFail: true }), null);
  assert.strictEqual(r.prog.w, 12);
  // którakolwiek seria poniżej minimum → licznik, po 2 razach −10%
  r = E.evaluate(e('lat_pulldown', 40, [9, 8, 7]), null);
  assert.strictEqual(r.prog.w, 40); assert.strictEqual(r.prog.fail, 1);
  r = E.evaluate(e('lat_pulldown', 40, [9, 8, 7]), r.prog);
  assert.strictEqual(r.prog.w, 35); assert.strictEqual(r.change, -1); assert.strictEqual(r.prog.resets.length, 1);
  r = E.evaluate(e('lat_pulldown', 40, [12, 11, 10]), null);
  assert.strictEqual(r.prog.w, 40); assert.strictEqual(r.change, 0);
  r = E.evaluate(e('assisted_pullup', 40, [12, 12, 12]), null);
  assert.strictEqual(r.prog.w, 37.5, 'asysta maleje');
  r = E.evaluate(e('plank', 0, [45, 45], 30, 45), null);
  assert.strictEqual(r.prog.bonus, 10);
  r = E.evaluate(e('push_up_incline', 0, [20, 20, 20], 18, 20), { bonus: 12 });
  assert(/Pompki/.test(r.msg), 'propozycja trudniejszego wariantu: ' + r.msg);
  // niezrobione wszystkie serie → bez zwiększania
  r = E.evaluate({ exId: 'db_bench', lo: 8, hi: 12, rir: [2, 2], sets: [{ w: 12, reps: 12, done: true }, { w: 12, reps: '', done: false }] }, null);
  assert.strictEqual(r.prog.w, 12);
  // deload → bez zmian
  r = E.evaluate(e('db_bench', 12, [12, 12]), { w: 12 }, { deload: true });
  assert.strictEqual(r.prog.w, 12);
  // kalibracja
  r = E.evaluate({ exId: 'db_bench', lo: 8, hi: 12, rir: [2, 2], rated: 'light', sets: [{ w: 12, reps: 15, done: true }, { w: 16, reps: 12, done: true }, { w: 16, reps: 12, done: true }] }, null);
  assert.strictEqual(r.prog.w, 16);
  assert.strictEqual(E.lighter('back_squat', 20, 0.1), 20);
  assert.strictEqual(E.lighter('db_lateral_raise', 1, 0.1), 1);
});

check('podpowiedź powtórzeń', () => {
  const last = { sets: [{ w: 40, reps: 10 }, { w: 40, reps: 9 }, { w: 40, reps: 8 }] };
  assert.deepStrictEqual(E.suggestReps(last, 40, 8, 12, 3), [11, 9, 8]);
  assert.deepStrictEqual(E.suggestReps(last, 42.5, 8, 12, 3), [8, 8, 8]);
  assert.deepStrictEqual(E.suggestReps(null, 40, 8, 12, 2), [null, null]);
});

check('kalibracja', () => {
  assert.strictEqual(E.calibrate('db_bench', 12, 'light'), 16);
  assert.strictEqual(E.calibrate('db_bench', 12, 'heavy'), 10);
  assert.strictEqual(E.calibrate('lat_pulldown', 40, 'light'), 47.5);
  assert.strictEqual(E.calibrate('lat_pulldown', 40, 'heavy'), 32.5);
  assert.strictEqual(E.calibrate('assisted_pullup', 40, 'light'), 32.5);
});

check('serie rozgrzewkowe', () => {
  assert.deepStrictEqual(E.warmupSets('back_squat', 60, 'first').map(s => s.w), [20, 30, 40, 50]);
  assert.deepStrictEqual(E.warmupSets('back_squat', 40, 'first').map(s => s.w), [20, 27.5]);
  assert.deepStrictEqual(E.warmupSets('bb_bench', 50, 'main').map(s => s.w), [30]);
  assert.deepStrictEqual(E.warmupSets('db_curl', 10, 'none'), []);
  for (const id of Object.keys(EXERCISES)) for (const w of [0, 2.5, 5, 20, 47.5, 120]) for (const k of ['first', 'main']) {
    const ws = E.warmupSets(id, w, k);
    ws.forEach((s, i) => { assert(s.w < w && s.w > 0, id); if (i) assert(s.w > ws[i - 1].w, id); });
  }
});

check('kalkulator talerzy', () => {
  assert.deepStrictEqual(E.platesPerSide(60, 20).plates, [20]);
  assert.deepStrictEqual(E.platesPerSide(72.5, 20).plates, [25, 1.25]);
  assert.strictEqual(E.platesPerSide(72.5, 20).ok, true);
  assert.strictEqual(E.platesPerSide(61, 20).ok, false);
  assert.deepStrictEqual(E.platesPerSide(20, 20).plates, []);
  assert.deepStrictEqual(E.platesPerSide(65, 20, [20, 10, 5, 2.5]).plates, [20, 2.5]);
});

check('e1RM i rekordy', () => {
  assert.strictEqual(E.e1rm(100, 5), 116.7);
  assert.strictEqual(E.e1rm(100, 12), null);
  const log = [
    { date: '2026-10-01T10:00:00Z', entries: [{ exId: 'bb_bench', sets: [{ w: 60, reps: 8 }, { w: 60, reps: 8 }] }] },
    { date: '2026-10-03T10:00:00Z', entries: [{ exId: 'bb_bench', sets: [{ w: 62.5, reps: 6 }] }] },
  ];
  const rec = E.records(log).bb_bench;
  assert.strictEqual(rec.bestW, 62.5); assert.strictEqual(rec.repsAt['60'], 8);
  const prs = E.detectPRs([{ exId: 'bb_bench', sets: [{ w: 60, reps: 10 }] }], log);
  assert.strictEqual(prs.length, 1); assert.strictEqual(prs[0].kind, 'e1');
  assert.strictEqual(E.detectPRs([{ exId: 'db_bench', sets: [{ w: 10, reps: 10 }] }], log).length, 0, 'pierwszy raz to nie rekord');
});

check('serie na partię', () => {
  const plan = E.generatePlan({ ...base, duration: 75 });
  const ws = E.planWeeklySets(plan);
  assert.strictEqual(ws.plecy, 9);
  assert.strictEqual(ws.czworoglowe, 9);
  const now = Date.now();
  const log = [{ date: new Date(now - DAY).toISOString(), entries: [{ exId: 'db_bench', sets: [{}, {}, {}] }, { exId: 'lat_pulldown', sets: [{}, {}] }] }];
  const w = E.weeklySets(log, now - 7 * DAY, now);
  assert.strictEqual(w.klatka, 3); assert.strictEqual(w.triceps, 1.5); assert.strictEqual(w.plecy, 2); assert.strictEqual(w.biceps, 1);
});

check('deload', () => {
  const plan = E.generatePlan(base);
  const now = Date.parse('2026-12-31T12:00:00Z');
  const state = { profile: base, plan, log: [{ date: '2026-10-20T10:00:00Z', entries: [] }], meso: {} };
  assert.strictEqual(E.deloadCheck(state, now).due, true, 'po 8 tygodniach');
  assert.strictEqual(E.deloadCheck({ ...state, meso: { lastDeloadEnd: '2026-12-20T10:00:00Z' } }, now).due, false);
  const tired = { profile: base, plan, meso: {}, log: [1, 2, 3].map(i => ({ date: `2026-12-2${i}T10:00:00Z`, entries: [], readiness: { sleep: 5, fatigue: 2 } })) };
  assert.strictEqual(E.deloadCheck(tired, now).due, true, 'sen < 6 h ×3');
  // sesja w deloadzie: połowa serii, RIR 3–4
  const s = E.createSession({ ...state, prog: {}, deload: { active: true, left: 3 } }, 0);
  assert.strictEqual(s.entries[0].sets.length, Math.ceil(plan.days[0].items[0].sets / 2)); assert.deepStrictEqual(s.entries[0].rir, [3, 4]);
});

check('sesja: rozgrzewka tylko w pierwszym, okres wdrożenia', () => {
  const plan = E.generatePlan(base);
  const s = E.createSession({ profile: base, plan, prog: {}, log: [] }, 0);
  assert(s.entries[0].warm.length >= 2, 'rampa w 1. ćwiczeniu');
  assert(s.entries[1].warm.length <= 1, 'jedna seria w kolejnych');
  assert(s.entries.slice(3).every(e => e.role === 'main' || e.warm.length === 0));
  assert.deepStrictEqual(s.entries[0].rir, [3, 4], 'wdrożenie: RIR 3–4');
  assert.strictEqual(E.adaptationLeft({ profile: base, plan, log: [] }), 9);
});

check('tydzień i seria tygodni', () => {
  const now = Date.parse('2026-10-22T12:00:00'); // czwartek
  const mk = d => ({ date: new Date(d).toISOString(), entries: [] });
  const log = ['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21'].map(d => mk(d + 'T10:00:00'));
  const w = E.weekStats(log, 3, now);
  assert.strictEqual(w.current, 2); assert.strictEqual(w.streak, 2);
});

check('trend wagi i tempo', () => {
  const weights = [];
  for (let i = 0; i < 28; i++) weights.push({ date: E.isoDay(Date.parse('2026-09-01') + i * DAY), kg: 92 - i * 0.1 });
  const tr = E.weightTrend(weights);
  assert.strictEqual(tr[0].trend, 92);
  assert(tr[27].trend < 92 && tr[27].trend > tr[27].kg, 'trend wygładza i opóźnia');
  const r = E.trendRate(tr, 14);
  assert(r.kgPerWeek < 0 && r.days === 14, JSON.stringify(r));
});

check('kalorie wg specyfikacji', () => {
  const n = E.nutrition(base);
  // Mifflin: 10*92 + 6.25*180 - 5*30 + 5 = 1900; × 1,375 = 2612,5; redukcja BMI 28,4 → −0,75%/tydz.: 0,0075*92*7700/7 = 759
  assert.strictEqual(n.bmr, 1900);
  assert.deepStrictEqual(n.bmrRange, [1710, 2090]);
  assert.strictEqual(n.kcal, 1850);
  assert.deepStrictEqual(n.protein, [165, 200]);
  assert.strictEqual(n.water, 2.5);
  assert(n.warn.length === 1, 'ostrzeżenie: poniżej BMR');
  const lean = E.nutrition({ ...base, weight: 75 });
  assert.strictEqual(lean.rate, -0.5, 'BMI<25 → 0,5%/tydz.');
  const k = E.nutrition({ ...base, sex: 'k', weight: 55, height: 160, age: 40, goal: 'redukcja' });
  assert(k.kcal >= 1200);
  const obese = E.nutrition({ ...base, weight: 120 });
  assert(obese.protBasis && obese.protein[0] === Math.round(80 * 1.8 / 5) * 5, 'BMI>30: od wzrostu − 100');
  const m = E.nutrition({ ...base, goal: 'masa' });
  assert.strictEqual(m.delta, Math.round(0.0025 * 92 * 7700 / 7));
});

check('adaptacyjne kalorie', () => {
  const now = Date.parse('2026-10-22T12:00:00Z');
  const weights = [];
  for (let i = 0; i < 22; i++) weights.push({ date: E.isoDay(now - (21 - i) * DAY), kg: 92 });
  const st = { profile: base, body: { weights, kcal: {} }, nutrition: {} };
  const s = E.adaptiveSuggestion(st, now);
  assert.strictEqual(s.mode, 'tylko waga'); assert.strictEqual(s.delta, -125, 'waga stoi → −125');
  assert(s.warn.length === 1, 'brak spadku od 3 tyg.');
  assert.strictEqual(E.adaptiveSuggestion({ ...st, nutrition: { lastCheck: new Date(now - 2 * DAY).toISOString() } }, now), null);
  const kcal = {}; weights.forEach(w => { kcal[w.date] = 2600; });
  const f = E.adaptiveSuggestion({ ...st, body: { weights, kcal } }, now);
  assert.strictEqual(f.mode, 'pełny'); assert(Math.abs(f.delta) <= 150);
});

check('cel kroków', () => {
  const now = Date.parse('2026-10-22T12:00:00Z');
  const st = {}; for (let i = 0; i < 5; i++) st[E.isoDay(now - i * DAY)] = 4300;
  assert.deepStrictEqual(E.stepsGoal(st, now), { goal: 6000, avg: 4300 });
  assert.strictEqual(E.stepsGoal({}, now).goal, 8000);
});

check('migracja i kopia zapasowa', () => {
  const v1 = { version: 1, profile: { ...base, location: undefined }, plan: { days: [] }, prog: { db_bench: { w: 14 } }, log: [{ date: '2026-10-22T10:00:00Z', dayKey: 'A', entries: [{ exId: 'db_bench', sets: [{ w: 14, reps: 10 }] }] }], next: 1, active: null };
  delete v1.profile.location;
  const m = D.migrate(v1);
  assert.strictEqual(m.schemaVersion, 2); assert.strictEqual(m.profile.location, 'silownia'); assert.strictEqual(m.needsReplan, true);
  assert.strictEqual(m.prog.db_bench.w, 14); assert.strictEqual(m.log[0].entries[0].sets[0].rir, null);
  const txt = D.makeBackup(m, null);
  const back = D.parseBackup(txt);
  assert(back.ok && back.checksumOk); assert.deepStrictEqual(back.state, m, 'eksport → import daje identyczne dane');
  const broken = JSON.parse(txt); broken.data.state.prog.db_bench.w = 99;
  assert.strictEqual(D.parseBackup(JSON.stringify(broken)).checksumOk, false);
  assert.strictEqual(D.parseBackup(JSON.stringify(v1)).legacy, true, 'stary eksport');
  assert.strictEqual(D.parseBackup('{"x":1}').ok, false);
  const inc = JSON.parse(JSON.stringify(m));
  inc.log.push({ date: '2026-10-24T10:00:00Z', dayKey: 'B', entries: [] });
  inc.body.weights.push({ date: '2026-10-24', kg: 91 });
  const merged = D.mergeStates(m, inc);
  assert.strictEqual(merged.log.length, 2); assert.strictEqual(merged.body.weights.length, 1);
  assert.strictEqual(D.mergeStates(merged, inc).log.length, 2, 'scalanie bez duplikatów');
});

check('treści', () => {
  assert(C.painAdvice('ostry', 2, false).level === 'bad');
  assert(C.painAdvice('tepy', 3, false).level === 'warn');
  assert(C.painAdvice('tepy', 6, false).level === 'bad');
  assert(C.painAdvice('miesien', 3, false).level === 'ok');
  assert(C.painAdvice('miesien', 3, true).level === 'bad');
});

console.log(failures ? `\n${failures} TEST(Y) NIE PRZESZŁY` : '\nWszystkie testy przeszły.');
process.exit(failures ? 1 : 0);
