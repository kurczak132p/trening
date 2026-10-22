// Testy logiki: node tests/engine.test.js
const assert = require('assert');
const E = require('../js/engine.js');
const { EXERCISES, EQUIPMENT, INJURIES } = require('../js/exercises.js');

const ALL_EQ = EQUIPMENT.map(e => e.id);
const base = { sex: 'm', age: 30, height: 180, weight: 80, exp: 0, goal: 'masa', priorities: [], days: 3, duration: 60, equipment: ALL_EQ, injuries: [], activity: 'siedzaca' };
let failures = 0;
const check = (name, fn) => { try { fn(); } catch (e) { failures++; console.log('✗', name, '\n   ', e.message); } };

// 1. Spójność bazy ćwiczeń
check('baza ćwiczeń', () => {
  for (const [id, ex] of Object.entries(EXERCISES)) {
    assert(ex.name && ex.pat && Array.isArray(ex.eq) && ex.load, id + ': brak pól');
    assert(ex.steps && ex.steps.length && ex.setup && ex.mistakes, id + ': brak opisu');
    if (ex.load !== 'bw') assert(ex.k && ex.k.m > 0 && ex.k.f > 0, id + ': brak k');
    if (ex.load === 'bw') assert(ex.range, id + ': bw bez range');
    ex.eq.forEach(e => assert(ALL_EQ.includes(e), id + ': nieznany sprzęt ' + e));
    (ex.avoid || []).forEach(a => assert(INJURIES.some(i => i.id === a), id + ': nieznana dolegliwość ' + a));
  }
  for (const [k, s] of Object.entries(E.SLOTS)) {
    [...s.pick, ...(s.adv || [])].forEach(id => assert(EXERCISES[id], `slot ${k}: brak ćwiczenia ${id}`));
  }
});

// 2. Wszystkie kombinacje profilu → plan bez błędów i zgodny z ograniczeniami
const combos = [];
for (const days of [2, 3, 4]) for (const duration of [45, 60, 75]) for (const goal of ['masa', 'redukcja', 'sila', 'zdrowie'])
  for (const exp of [0, 1, 2]) for (const inj of [[], ['ledzwia'], ['kolana'], ['barki'], ['nadgarstki'], ['ledzwia', 'kolana', 'barki', 'nadgarstki']])
    for (const eq of [ALL_EQ, ['hantle', 'lawka'], ['maszyny', 'wyciagi'], ['hantle']])
      for (const prio of [[], ['ramiona'], ['nogi', 'brzuch'], ['klatka', 'plecy', 'barki']])
        combos.push({ ...base, days, duration, goal, exp, injuries: inj, equipment: eq, priorities: prio });

check('wszystkie kombinacje (' + combos.length + ')', () => {
  for (const p of combos) {
    const plan = E.generatePlan(p);
    assert.strictEqual(plan.days.length, p.days);
    for (const d of plan.days) {
      const ids = d.items.map(i => i.exId);
      assert(new Set(ids).size === ids.length, 'duplikat w dniu ' + JSON.stringify(p));
      for (const it of d.items) {
        const ex = EXERCISES[it.exId];
        assert(E.exAllowed(it.exId, p), `niedozwolone ${it.exId} dla ${JSON.stringify(p)}`);
        assert(it.sets >= 2 && it.sets <= 4, 'serie ' + it.sets);
        assert(it.lo < it.hi, 'zakres ' + it.exId);
        assert(it.alts.includes(it.exId), 'alternatywy nie zawierają bieżącego ' + it.exId);
        const w = E.startWeight(it.exId, p);
        assert(Number.isFinite(w) && w >= 0, 'ciężar ' + it.exId + ' ' + w);
        if (ex.load === 'bb') assert(w >= (ex.minW || 20), 'sztanga poniżej gryfu');
      }
      if (p.equipment === ALL_EQ && p.injuries.length < 4) {
        assert(d.items.length >= 3, `za mało ćwiczeń (${d.items.length}) ${d.name} ${JSON.stringify(p)}`);
        assert(d.estMin <= p.duration + 5, `za długo ${d.estMin} min vs ${p.duration} ${d.name}`);
      }
    }
  }
});

// 3. Plan dla pełnej siłowni ma każdą główną partię w tygodniu
check('pokrycie partii', () => {
  for (const days of [2, 3, 4]) for (const duration of [45, 60, 75]) {
    const plan = E.generatePlan({ ...base, days, duration });
    const pats = new Set(plan.days.flatMap(d => d.items.map(i => EXERCISES[i.exId].pat)));
    for (const need of ['squat', 'hpush', 'hpull', 'vpull']) assert(pats.has(need), `${days}d/${duration}min brak ${need}`);
    assert(pats.has('hinge') || pats.has('glute'), 'brak biodrowego');
  }
});

// 4. Progresja
check('progresja', () => {
  const e = (exId, w, reps, lo = 8, hi = 12) => ({ exId, lo, hi, sets: reps.map(r => ({ w, reps: r, done: true })) });
  let r = E.evaluate(e('db_bench', 12, [12, 12, 12]), null);
  assert.strictEqual(r.prog.w, 14); assert.strictEqual(r.change, 1);
  r = E.evaluate(e('back_squat', 60, [12, 12, 12]), null);
  assert.strictEqual(r.prog.w, 62.5);
  r = E.evaluate(e('back_squat', 100, [12, 12, 12]), null);
  assert.strictEqual(r.prog.w, 105);
  r = E.evaluate(e('lat_pulldown', 40, [12, 11, 10]), null);
  assert.strictEqual(r.prog.w, 40); assert.strictEqual(r.change, 0);
  r = E.evaluate(e('lat_pulldown', 40, [6, 5, 7]), null);
  assert.strictEqual(r.prog.w, 40); assert.strictEqual(r.prog.fail, 1);
  r = E.evaluate(e('lat_pulldown', 40, [6, 5, 7]), r.prog);
  assert.strictEqual(r.prog.w, 35); assert.strictEqual(r.change, -1);
  r = E.evaluate(e('assisted_pullup', 40, [12, 12, 12]), null);
  assert.strictEqual(r.prog.w, 37.5, 'asysta maleje ' + r.prog.w);
  r = E.evaluate(e('plank', 0, [40, 40, 40], 20, 40), null);
  assert.strictEqual(r.prog.bonus, 10);
  // niezrobione wszystkie serie → bez zwiększania
  r = E.evaluate({ exId: 'db_bench', lo: 8, hi: 12, sets: [{ w: 12, reps: 12, done: true }, { w: 12, reps: '', done: false }] }, null);
  assert.strictEqual(r.prog.w, 12);
  // po kalibracji „za lekko” liczy się nowy ciężar, a 1. seria testowa jest pomijana
  r = E.evaluate({ exId: 'db_bench', lo: 8, hi: 12, rated: 'light', sets: [{ w: 12, reps: 15, done: true }, { w: 16, reps: 12, done: true }, { w: 16, reps: 12, done: true }] }, null);
  assert.strictEqual(r.prog.w, 16, 'kalibracja light ' + r.prog.w);
  r = E.evaluate({ exId: 'db_bench', lo: 8, hi: 12, rated: 'heavy', sets: [{ w: 12, reps: 5, done: true }, { w: 10, reps: 9, done: true }, { w: 10, reps: 9, done: true }] }, null);
  assert.strictEqual(r.prog.w, 10); assert.strictEqual(r.prog.fail, 0);
  r = E.evaluate({ exId: 'db_bench', lo: 8, hi: 12, rated: 'heavy', sets: [{ w: 12, reps: 5, done: true }, { w: 10, reps: '', done: false }] }, null);
  assert.strictEqual(r.prog.w, 10);
  // sztanga nie spada poniżej gryfu
  assert.strictEqual(E.lighter('back_squat', 20, 0.1), 20);
  assert.strictEqual(E.lighter('db_lateral_raise', 1, 0.1), 1);
});

// 5. Kalibracja
check('kalibracja', () => {
  assert.strictEqual(E.calibrate('db_bench', 12, 'light'), 16);
  assert.strictEqual(E.calibrate('db_bench', 12, 'heavy'), 10);
  assert.strictEqual(E.calibrate('lat_pulldown', 40, 'light'), 47.5);
  assert.strictEqual(E.calibrate('lat_pulldown', 40, 'heavy'), 32.5);
  assert.strictEqual(E.calibrate('back_squat', 40, 'heavy'), 32.5);
  assert.strictEqual(E.calibrate('assisted_pullup', 40, 'light'), 32.5);
  assert.strictEqual(E.calibrate('assisted_pullup', 40, 'heavy'), 47.5);
});

// 6. Rozgrzewka
check('serie rozgrzewkowe', () => {
  assert.deepStrictEqual(E.warmupSets('back_squat', 60, 'main').map(s => s.w), [20, 35]);
  assert.deepStrictEqual(E.warmupSets('back_squat', 100, 'main').map(s => s.w), [20, 60, 80]);
  assert.deepStrictEqual(E.warmupSets('back_squat', 20, 'main'), []);
  assert.deepStrictEqual(E.warmupSets('db_bench', 16, 'main').map(s => s.w), [8, 12]);
  assert.deepStrictEqual(E.warmupSets('db_curl', 10, 'acc'), []);
  for (const id of Object.keys(EXERCISES)) for (const w of [0, 2.5, 5, 20, 47.5, 120]) {
    const ws = E.warmupSets(id, w, 'main');
    ws.forEach((s, i) => { assert(s.w < w && s.w > 0, id); if (i) assert(s.w > ws[i - 1].w, id); });
  }
});

// 7. Kalorie
check('kalorie', () => {
  const n = E.nutrition(base);
  // Mifflin: 10*80 + 6.25*180 - 5*30 + 5 = 1780; ×(1.2+0.15)=2403 → masa ×1.1 = 2643 → 2650
  assert.strictEqual(n.bmr, 1780);
  assert.strictEqual(n.kcal, 2650);
  assert.deepStrictEqual(n.protein, [130, 175]);
  const f = E.nutrition({ ...base, sex: 'k', weight: 60, height: 165, goal: 'redukcja' });
  assert(f.kcal >= f.bmr && f.kcal >= 1200, 'deficyt za duży');
});

// Podgląd przykładowych planów
function show(p) {
  const plan = E.generatePlan(p);
  console.log(`\n=== ${plan.name} | cel ${p.goal} | ${p.duration} min | exp ${p.exp} | prio ${p.priorities} | dolegliwości ${p.injuries}`);
  for (const d of plan.days) {
    console.log(`  ${d.name} (~${d.estMin} min)`);
    for (const it of d.items) console.log(`    - ${EXERCISES[it.exId].name}: ${it.sets}×${it.lo}–${it.hi}${EXERCISES[it.exId].unit === 'time' ? 's' : ''}, przerwa ${it.rest}s, start ${E.fmtKg(E.startWeight(it.exId, p))} ${it.role === 'main' ? '[główne]' : ''}`);
  }
}
show(base);
show({ ...base, days: 2, duration: 45, goal: 'redukcja', priorities: ['brzuch'] });
show({ ...base, days: 4, duration: 75, goal: 'sila', exp: 2 });
show({ ...base, sex: 'k', weight: 62, height: 168, priorities: ['nogi'], injuries: ['ledzwia', 'kolana'] });

console.log(failures ? `\n${failures} TEST(Y) NIE PRZESZŁY` : '\nWszystkie testy przeszły.');
process.exit(failures ? 1 : 0);
