// Logika aplikacji bez interfejsu: dobór planu, ciężary startowe, progresja, kalorie.
// Działa w przeglądarce (globalne EXERCISES) i w Node (testy).

const Engine = (() => {
  const EX = typeof EXERCISES !== 'undefined' ? EXERCISES : require('./exercises.js').EXERCISES;

  // Typowe hantle na siłowni (kg, jedna hantla)
  const DB_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50];

  const GOALS = {
    masa: { label: 'Zbudować mięśnie', short: 'Budowa mięśni' },
    redukcja: { label: 'Schudnąć / spalić tłuszcz', short: 'Redukcja tkanki tłuszczowej' },
    sila: { label: 'Być silniejszym', short: 'Siła' },
    zdrowie: { label: 'Poprawić kondycję i zdrowie', short: 'Kondycja i zdrowie' },
  };

  const GROUPS = {
    klatka: 'Klatka piersiowa', plecy: 'Plecy', barki: 'Barki', ramiona: 'Ramiona (biceps, triceps)',
    nogi: 'Nogi i pośladki', brzuch: 'Brzuch',
  };

  // Serie / powtórzenia / przerwa (s) wg celu: main = ćwiczenia wielostawowe, acc = pomocnicze
  const SCHEMES = {
    masa: { main: { sets: 3, lo: 8, hi: 12, rest: 120 }, acc: { sets: 3, lo: 10, hi: 15, rest: 75 } },
    redukcja: { main: { sets: 3, lo: 8, hi: 12, rest: 90 }, acc: { sets: 3, lo: 12, hi: 15, rest: 60 } },
    sila: { main: { sets: 4, lo: 5, hi: 8, rest: 180 }, acc: { sets: 3, lo: 8, hi: 12, rest: 90 } },
    zdrowie: { main: { sets: 3, lo: 10, hi: 12, rest: 90 }, acc: { sets: 2, lo: 12, hi: 15, rest: 60 } },
  };

  // ─── Szablony planów ───
  // pick = kolejność wyboru dla początkujących, adv = dla ćwiczących regularnie,
  // fb = wzorce zastępcze, gdy nic z listy nie pasuje (sprzęt/dolegliwości),
  // g = partie ciała (priorytety), base = zawsze w planie, role = main/acc
  const S = {
    squatA: { pick: ['goblet_squat', 'leg_press', 'back_squat', 'hack_squat'], adv: ['back_squat', 'hack_squat', 'leg_press', 'goblet_squat'], fb: ['glute'], g: ['nogi'], role: 'main' },
    squatB: { pick: ['leg_press', 'hack_squat', 'goblet_squat', 'back_squat'], fb: ['glute'], g: ['nogi'], role: 'main' },
    hinge: { pick: ['db_rdl', 'bb_rdl', 'hip_thrust', 'glute_bridge'], adv: ['bb_rdl', 'deadlift', 'db_rdl', 'hip_thrust'], fb: ['glute'], g: ['nogi'], role: 'main' },
    glute: { pick: ['hip_thrust', 'glute_bridge'], fb: ['hinge'], g: ['nogi'], role: 'acc' },
    glMain: { pick: ['hip_thrust', 'glute_bridge'], fb: ['hinge'], g: ['nogi'], role: 'main' },
    lunge: { pick: ['split_squat', 'step_up', 'walking_lunge', 'leg_press'], adv: ['walking_lunge', 'split_squat', 'step_up', 'leg_press'], fb: ['squat'], g: ['nogi'], role: 'acc' },
    legcurl: { pick: ['seated_leg_curl', 'lying_leg_curl'], fb: ['glute'], g: ['nogi'], role: 'acc' },
    legext: { pick: ['leg_extension'], g: ['nogi'], role: 'acc' },
    calves: { pick: ['calf_machine', 'calf_db', 'calf_leg_press'], g: ['nogi'], role: 'acc' },
    pushA: { pick: ['db_bench', 'machine_chest_press', 'push_up', 'bb_bench'], adv: ['bb_bench', 'db_bench', 'machine_chest_press', 'push_up'], g: ['klatka'], role: 'main' },
    pushB: { pick: ['incline_db_press', 'machine_chest_press', 'db_bench', 'push_up'], g: ['klatka'], role: 'main' },
    pushC: { pick: ['machine_chest_press', 'db_bench', 'incline_db_press', 'push_up'], g: ['klatka'], role: 'acc' },
    chestIso: { pick: ['pec_deck', 'cable_fly'], g: ['klatka'], role: 'acc' },
    vpush: { pick: ['db_shoulder_press', 'machine_shoulder_press'], adv: ['ohp', 'db_shoulder_press', 'machine_shoulder_press'], fb: ['rear_delt'], g: ['barki'], role: 'main' },
    vpushAcc: { pick: ['machine_shoulder_press', 'db_shoulder_press'], fb: ['rear_delt'], g: ['barki'], role: 'acc' },
    latRaise: { pick: ['db_lateral_raise', 'cable_lateral_raise'], g: ['barki'], role: 'acc' },
    rearDelt: { pick: ['face_pull', 'reverse_pec_deck', 'db_rear_delt_fly'], g: ['barki', 'plecy'], role: 'acc' },
    rowA: { pick: ['cable_row', 'machine_row', 'db_row', 'bb_row'], adv: ['bb_row', 'cable_row', 'machine_row', 'db_row'], g: ['plecy'], role: 'main' },
    rowB: { pick: ['db_row', 'machine_row', 'cable_row', 'bb_row'], g: ['plecy'], role: 'main' },
    vpull: { pick: ['lat_pulldown', 'assisted_pullup', 'pull_up'], adv: ['pull_up', 'lat_pulldown', 'assisted_pullup'], fb: ['hpull'], g: ['plecy'], role: 'main' },
    vpullAcc: { pick: ['lat_pulldown', 'assisted_pullup', 'pull_up'], fb: ['hpull'], g: ['plecy'], role: 'acc' },
    bicA: { pick: ['db_curl', 'hammer_curl', 'cable_curl', 'ez_curl'], g: ['ramiona'], role: 'acc' },
    bicB: { pick: ['hammer_curl', 'cable_curl', 'db_curl', 'ez_curl'], g: ['ramiona'], role: 'acc' },
    triA: { pick: ['rope_pushdown', 'overhead_cable_ext', 'overhead_db_ext'], g: ['ramiona'], role: 'acc' },
    triB: { pick: ['overhead_cable_ext', 'overhead_db_ext', 'rope_pushdown'], g: ['ramiona'], role: 'acc' },
    coreA: { pick: ['dead_bug', 'plank', 'bird_dog'], g: ['brzuch'], role: 'acc' },
    coreB: { pick: ['plank', 'side_plank', 'pallof_press', 'bird_dog'], g: ['brzuch'], role: 'acc' },
    coreC: { pick: ['pallof_press', 'cable_crunch', 'side_plank', 'plank'], g: ['brzuch'], role: 'acc' },
  };

  const day = (key, name, focus, base, opt) => ({ key, name, focus, base, opt });
  const TEMPLATES = {
    2: {
      name: 'Pełne ciało 2× w tygodniu (A/B)',
      days: [
        day('A', 'Trening A', 'Całe ciało', ['squatA', 'pushA', 'vpull'], ['legcurl', 'coreA', 'latRaise', 'bicA', 'triA', 'chestIso', 'rearDelt']),
        day('B', 'Trening B', 'Całe ciało', ['hinge', 'rowA', 'vpush', 'lunge'], ['pushB', 'coreB', 'triB', 'bicB', 'calves', 'latRaise', 'rearDelt']),
      ],
    },
    3: {
      name: 'Pełne ciało 3× w tygodniu (A/B/C)',
      days: [
        day('A', 'Trening A', 'Całe ciało', ['squatA', 'pushA', 'rowA'], ['glute', 'coreA', 'latRaise', 'triA', 'chestIso', 'calves']),
        day('B', 'Trening B', 'Całe ciało', ['hinge', 'vpull', 'vpush'], ['lunge', 'coreB', 'bicA', 'rearDelt', 'legcurl', 'pushC']),
        day('C', 'Trening C', 'Całe ciało', ['squatB', 'pushB', 'rowB'], ['legcurl', 'coreC', 'bicB', 'triB', 'latRaise', 'vpullAcc', 'calves']),
      ],
    },
    4: {
      name: 'Góra / dół 4× w tygodniu',
      days: [
        day('G1', 'Góra A', 'Klatka, plecy, barki, ramiona', ['pushA', 'rowA', 'vpush', 'vpullAcc'], ['latRaise', 'triA', 'bicA', 'chestIso', 'rearDelt']),
        day('D1', 'Dół A', 'Nogi, pośladki, brzuch', ['squatA', 'hinge', 'legcurl'], ['coreA', 'calves', 'lunge', 'legext']),
        day('G2', 'Góra B', 'Klatka, plecy, barki, ramiona', ['vpull', 'pushB', 'rowB', 'latRaise'], ['bicB', 'triB', 'rearDelt', 'chestIso', 'vpushAcc']),
        day('D2', 'Dół B', 'Nogi, pośladki, brzuch', ['glMain', 'squatB', 'lunge'], ['coreB', 'legcurl', 'calves', 'legext']),
      ],
    },
  };

  const SCHEDULE = {
    2: 'np. poniedziałek i czwartek',
    3: 'np. poniedziałek, środa, piątek',
    4: 'np. poniedziałek, wtorek, czwartek, piątek',
  };

  const BUDGET_MIN = { 45: 35, 60: 50, 75: 65 }; // minuty na ćwiczenia (bez ~10 min rozgrzewki)

  // ─── Pomocnicze ───
  const roundTo = (v, step) => Math.round(v / step) * step;
  const floorTo = (v, step) => Math.floor(v / step + 1e-9) * step;
  const ceilTo = (v, step) => Math.ceil(v / step - 1e-9) * step;
  const fix = v => Math.round(v * 100) / 100;

  function refWeight(p) {
    const h = p.height / 100;
    return Math.min(p.weight, 26 * h * h);
  }

  function exAllowed(id, p) {
    const ex = EX[id];
    if (!ex) return false;
    if ((ex.minExp || 0) > p.exp) return false;
    if (!ex.eq.every(e => p.equipment.includes(e))) return false;
    if ((ex.avoid || []).some(a => p.injuries.includes(a))) return false;
    return true;
  }

  function scheme(goal, role, exId) {
    const ex = EX[exId];
    const base = SCHEMES[goal][role];
    let { sets, lo, hi, rest } = base;
    if (ex.range) { [lo, hi] = ex.range; if (role === 'acc') rest = Math.min(rest, 75); }
    else if (ex.repFloor && lo < ex.repFloor) { lo = ex.repFloor; hi = Math.max(hi, ex.repFloor + 5); }
    if (ex.pat === 'core') rest = 60;
    return { sets, lo, hi, rest };
  }

  // ─── Ciężary ───
  function minLoad(ex) {
    if (ex.load === 'bb') return ex.minW || 20;
    if (ex.load === 'db') return DB_STEPS[0];
    if (ex.load === 'assist') return 0;
    return 2.5;
  }

  function dbDown(w) { let r = DB_STEPS[0]; for (const s of DB_STEPS) if (s <= w + 1e-9) r = s; return r; }
  function dbUp(w) { for (const s of DB_STEPS) if (s >= w - 1e-9) return s; return DB_STEPS[DB_STEPS.length - 1]; }
  function dbNext(w) { for (const s of DB_STEPS) if (s > w + 1e-9) return s; return w + 2; }
  function dbPrev(w) { let r = DB_STEPS[0]; for (const s of DB_STEPS) if (s < w - 1e-9) r = s; return r; }

  function startWeight(exId, p) {
    const ex = EX[exId];
    if (ex.load === 'bw') return 0;
    const ref = refWeight(p);
    let mult = [1, 1.1, 1.35][p.exp] || 1;
    if (p.age >= 60) mult *= 0.75; else if (p.age >= 50) mult *= 0.85;
    const k = ex.k[p.sex === 'k' ? 'f' : 'm'];
    if (ex.load === 'assist') {
      const lifted = Math.min(p.weight, ref * (1 - k) * mult);
      return Math.max(0, ceilTo(p.weight - lifted, 2.5));
    }
    const raw = ref * k * mult;
    if (ex.load === 'db') return dbDown(raw);
    return Math.max(minLoad(ex), floorTo(raw, 2.5));
  }

  function heavier(exId, w, pct) {
    const ex = EX[exId];
    if (ex.load === 'bw') return w;
    if (ex.load === 'db') return Math.max(dbNext(w), dbUp(w * (1 + pct)));
    if (ex.load === 'assist') {
      const step = Math.max(2.5, floorTo(w * pct, 2.5));
      return Math.max(0, fix(w - step));
    }
    const step = Math.max(2.5, roundTo(w * pct, 2.5));
    return fix(w + step);
  }

  function lighter(exId, w, pct) {
    const ex = EX[exId];
    if (ex.load === 'bw') return w;
    if (ex.load === 'db') return Math.min(dbPrev(w), dbDown(w * (1 - pct)));
    if (ex.load === 'assist') return fix(w + Math.max(2.5, ceilTo(Math.max(w, 10) * pct, 2.5)));
    const target = Math.min(w - 2.5, floorTo(w * (1 - pct), 2.5));
    return Math.max(minLoad(ex), fix(target));
  }

  // Serie rozgrzewkowe przed głównym ćwiczeniem (lżejsze, nie liczą się do planu)
  function warmupSets(exId, w, role) {
    const ex = EX[exId];
    if (role !== 'main' || ex.load === 'bw' || ex.load === 'assist' || ex.repFloor || ex.range) return [];
    const out = [];
    const push = (x, reps) => {
      if (x <= 0 || x >= w) return;
      if (out.length && x <= out[out.length - 1].w) return;
      out.push({ w: fix(x), reps });
    };
    if (ex.load === 'bb') {
      const bar = ex.minW || 20;
      if (w <= bar) return [];
      push(bar, 10);
      if (w >= 40) push(floorTo(w * 0.6, 2.5), 5);
      if (w >= 70) push(floorTo(w * 0.8, 2.5), 3);
    } else if (ex.load === 'db') {
      if (w >= 6) push(dbDown(w * 0.5), 10);
      if (w >= 16) push(dbDown(w * 0.75), 5);
    } else {
      if (w >= 10) push(floorTo(w * 0.5, 2.5), 10);
      if (w >= 40) push(floorTo(w * 0.75, 2.5), 5);
    }
    return out;
  }

  // ─── Generowanie planu ───
  function itemFor(exId, role, slotKey, goal, extraSets) {
    const sc = scheme(goal, role, exId);
    return {
      slot: slotKey, exId, role,
      sets: Math.min(4, sc.sets + (extraSets || 0)),
      lo: sc.lo, hi: sc.hi, rest: sc.rest,
    };
  }

  function slotAlternatives(slotKey, p) {
    const s = S[slotKey];
    const ids = [...s.pick, ...(s.adv || [])];
    const pats = new Set();
    ids.forEach(id => pats.add(EX[id].pat));
    (s.fb || []).forEach(x => pats.add(x));
    Object.keys(EX).forEach(id => { if (pats.has(EX[id].pat)) ids.push(id); });
    return [...new Set(ids)].filter(id => exAllowed(id, p));
  }

  function chooseFor(slotKey, p, used) {
    const s = S[slotKey];
    const list = (p.exp >= 2 && s.adv) ? s.adv : s.pick;
    for (const id of list) if (!used.has(id) && exAllowed(id, p)) return id;
    for (const pat of (s.fb || [])) {
      for (const id of Object.keys(EX)) {
        if (EX[id].pat === pat && !used.has(id) && exAllowed(id, p)) return id;
      }
    }
    return null;
  }

  function estSeconds(item) {
    const ex = EX[item.exId];
    let work = 40;
    if (ex.unit === 'time') work = (item.lo + item.hi) / 2;
    if (ex.perSide) work *= 2;
    const setup = item.role === 'main' ? 180 : 60;
    return item.sets * (work + item.rest) + setup;
  }

  function generatePlan(p) {
    const tpl = TEMPLATES[p.days];
    const budget = BUDGET_MIN[p.duration] * 60;
    const prio = new Set(p.priorities || []);
    const isPrio = slotKey => S[slotKey].g.some(g => prio.has(g));

    const days = tpl.days.map(d => {
      const used = new Set();
      const items = [];
      let total = 0;
      const order = [...d.base, ...d.opt];

      const add = (slotKey, always) => {
        const exId = chooseFor(slotKey, p, used);
        if (!exId) return false;
        const item = itemFor(exId, S[slotKey].role, slotKey, p.goal, 0);
        item.alts = slotAlternatives(slotKey, p);
        item.order = order.indexOf(slotKey);
        const t = estSeconds(item);
        if (!always && total + t > budget) return false;
        used.add(exId);
        items.push(item);
        total += t;
        return true;
      };
      const recount = () => { total = items.reduce((a, it) => a + estSeconds(it), 0); };

      d.base.forEach(k => add(k, true));
      // podstawa się nie mieści → krótsze przerwy, potem mniej serii
      const trims = [
        it => it.role === 'main' && it.sets > 3 && (it.sets = 3),
        it => it.rest > 120 && (it.rest -= 30),
        it => it.role === 'acc' && it.sets > 2 && (it.sets -= 1),
        it => it.rest > 90 && (it.rest -= 30),
      ];
      for (const trim of trims) {
        for (const it of items) { if (total <= budget) break; if (trim(it)) recount(); }
      }
      d.opt.filter(isPrio).forEach(k => add(k));
      // dodatkowa seria dla partii priorytetowych
      for (const it of items) {
        if (!isPrio(it.slot) || it.sets >= 4) continue;
        const perSet = estSeconds({ ...it, sets: 1 }) - (it.role === 'main' ? 180 : 60);
        if (total + perSet <= budget + 180) { it.sets += 1; it.extra = 1; total += perSet; }
      }
      d.opt.filter(k => !isPrio(k)).forEach(k => add(k));

      items.sort((a, b) => {
        const ca = EX[a.exId].pat === 'core' ? 1 : 0, cb = EX[b.exId].pat === 'core' ? 1 : 0;
        return ca - cb || a.order - b.order;
      });
      return { key: d.key, name: d.name, focus: d.focus, items, estMin: Math.round(total / 60) + 10 };
    });

    return { createdAt: new Date().toISOString(), name: tpl.name, schedule: SCHEDULE[p.days], days };
  }

  // Zamiana ćwiczenia w pozycji planu – zachowuje liczbę serii, przelicza zakres powtórzeń
  function swapItem(item, newExId, goal) {
    const fresh = itemFor(newExId, item.role, item.slot, goal, item.extra || 0);
    return { ...item, ...fresh, alts: item.alts, order: item.order, extra: item.extra };
  }

  // ─── Trening ───
  function adaptationActive(state) {
    const done = (state.log || []).length;
    return state.profile.exp === 0 && done < state.profile.days * 2;
  }

  function effectiveRange(item, prog) {
    const ex = EX[item.exId];
    if (ex.load !== 'bw') return [item.lo, item.hi];
    const bonus = (prog && prog.bonus) || 0;
    const cap = ex.maxTop || item.hi + 10;
    const hi = Math.min(cap, item.hi + bonus);
    const lo = Math.min(hi - 2, item.lo + bonus);
    return [lo, hi];
  }

  function createSession(state, dayIndex) {
    const d = state.plan.days[dayIndex];
    const adapt = adaptationActive(state);
    const entries = d.items.map(it => {
      const prog = state.prog[it.exId];
      const w = prog && prog.w != null ? prog.w : startWeight(it.exId, state.profile);
      const [lo, hi] = effectiveRange(it, prog);
      const sets = adapt ? Math.max(2, it.sets - 1) : it.sets;
      return {
        exId: it.exId, role: it.role, slot: it.slot, lo, hi, rest: it.rest,
        calib: !prog && EX[it.exId].load !== 'bw',
        warm: warmupSets(it.exId, w, it.role).map(s => ({ ...s, done: false })),
        sets: Array.from({ length: sets }, () => ({ w, reps: '', done: false })),
      };
    });
    return { dayIndex, dayKey: d.key, dayName: d.name, startedAt: new Date().toISOString(), adapt, stage: 'warmup', idx: 0, warmChecks: [], entries };
  }

  // Ocena ćwiczenia po treningu → nowy ciężar i komunikat
  function evaluate(entry, prev) {
    const ex = EX[entry.exId];
    let done = entry.sets.filter(s => s.done && s.reps !== '' && !isNaN(+s.reps));
    const prog = { ...(prev || {}) };
    if (!done.length) return { prog: prev, msg: null, change: 0 };
    let planned = entry.sets.length;
    // Po kalibracji (za lekko / za ciężko) 1. seria była testem – oceniamy dopiero kolejne
    if (entry.rated && entry.rated !== 'ok' && ex.load !== 'bw') {
      const calW = entry.sets.length > 1 ? +entry.sets[1].w : +entry.sets[0].w;
      done = done.slice(1);
      if (!done.length) {
        prog.w = calW;
        return { prog, change: 0, msg: `Ciężar dopasowany po 1. serii – następnym razem ${fmtKg(calW)}.` };
      }
      // na nowym ciężarze dopiero się sprawdzamy: bez podnoszenia, a gdy wyraźnie za ciężko – lżej
      const lw = +done[done.length - 1].w;
      const tooHeavy = done.filter(s => +s.reps < entry.lo).length * 2 > done.length;
      prog.w = tooHeavy ? lighter(entry.exId, lw, 0.1) : lw;
      prog.fail = 0;
      return { prog, change: tooHeavy ? -1 : 0, msg: `Ciężar dopasowany po 1. serii – następnym razem ${fmtKg(prog.w)}.` };
    }
    const reps = done.map(s => +s.reps);
    const allTop = done.length >= planned && reps.every(r => r >= entry.hi);
    const failCount = reps.filter(r => r < entry.lo).length;
    const failed = failCount * 2 > reps.length;
    const unitWord = ex.unit === 'time' ? 's' : 'powt.';

    if (ex.load === 'bw') {
      const step = ex.unit === 'time' ? 10 : 2;
      const cap = ex.maxTop || entry.hi + 10;
      if (allTop && entry.hi < cap) {
        prog.bonus = (prog.bonus || 0) + step;
        return { prog, change: 1, msg: `Świetnie! Następnym razem celuj w ${Math.min(cap, entry.lo + step)}–${Math.min(cap, entry.hi + step)} ${unitWord}.` };
      }
      if (allTop) return { prog, change: 0, msg: 'Masz już górny zakres – możesz poprosić o trudniejszy wariant (przycisk „Zamień”).' };
      return { prog, change: 0, msg: `Zostajemy przy ${entry.lo}–${entry.hi} ${unitWord} – dobijaj do ${entry.hi} w każdej serii.` };
    }

    const w = +done[done.length - 1].w;
    prog.w = w;
    if (allTop) {
      prog.w = heavier(entry.exId, w, 0.05);
      prog.fail = 0;
      const what = ex.load === 'assist' ? `mniejsza pomoc: ${fmtKg(prog.w)}` : fmtKg(prog.w);
      return { prog, change: 1, msg: `Zrobione ${entry.hi} powt. w każdej serii → następnym razem ${what}.` };
    }
    if (failed) {
      prog.fail = (prog.fail || 0) + 1;
      if (prog.fail >= 2) {
        prog.w = lighter(entry.exId, w, 0.1);
        prog.fail = 0;
        return { prog, change: -1, msg: `Drugi raz poniżej ${entry.lo} powt. → zmniejszamy do ${fmtKg(prog.w)} i budujemy od nowa.` };
      }
      return { prog, change: 0, msg: `Poniżej ${entry.lo} powt. – zostajemy przy ${fmtKg(w)}. Jeśli znowu się nie uda, zmniejszymy ciężar.` };
    }
    prog.fail = 0;
    return { prog, change: 0, msg: `Zostajemy przy ${fmtKg(w)} – celuj w ${entry.hi} powt. w każdej serii.` };
  }

  function calibrate(exId, w, rating) {
    if (rating === 'light') return heavier(exId, w, 0.2);
    if (rating === 'heavy') return lighter(exId, w, 0.15);
    return w;
  }

  function fmtKg(w) {
    return `${String(fix(w)).replace('.', ',')} kg`;
  }

  // ─── Kalorie i białko ───
  function nutrition(p) {
    const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'k' ? -161 : 5);
    const jobFactor = { siedzaca: 1.2, ruch: 1.375, fizyczna: 1.55 }[p.activity] || 1.2;
    const factor = jobFactor + 0.05 * p.days;
    const tdee = bmr * factor;
    const h = p.height / 100;
    const bmi = p.weight / (h * h);
    const protW = bmi > 30 ? 25 * h * h : p.weight;
    let kcal, protein, info;
    if (p.goal === 'masa') {
      kcal = tdee * 1.1; protein = [1.6, 2.2];
      info = 'Lekka nadwyżka kalorii. Cel: przybierać ok. 0,5–1 kg na miesiąc. Szybciej = głównie tłuszcz.';
    } else if (p.goal === 'redukcja') {
      kcal = Math.max(tdee * 0.8, tdee - 750); protein = [1.8, 2.2];
      info = 'Umiarkowany deficyt. Cel: tracić ok. 0,5–1% masy ciała tygodniowo. Wysokie białko i trening siłowy chronią mięśnie.';
    } else if (p.goal === 'sila') {
      kcal = tdee * 1.05; protein = [1.6, 2.0];
      info = 'Lekko powyżej zapotrzebowania – siła rośnie najlepiej, gdy nie jesteś na deficycie.';
    } else {
      kcal = tdee; protein = [1.2, 1.6];
      info = 'Utrzymanie wagi. Skup się na regularnym treningu, śnie i jakości jedzenia.';
    }
    const floor = p.sex === 'k' ? 1200 : 1500;
    kcal = Math.max(kcal, floor, p.goal === 'redukcja' ? bmr : 0);
    return {
      bmr: Math.round(bmr), tdee: roundTo(tdee, 50), kcal: roundTo(kcal, 50),
      protein: [roundTo(protW * protein[0], 5), roundTo(protW * protein[1], 5)],
      water: [roundTo(p.weight * 0.03, 0.5), roundTo(p.weight * 0.035, 0.5)],
      bmi: Math.round(bmi * 10) / 10, info, protBasis: bmi > 30 ? 'liczone od wagi przy BMI 25, bo przy wyższym BMI liczenie od pełnej wagi zawyża wynik' : null,
    };
  }

  return {
    EX, DB_STEPS, GOALS, GROUPS, SCHEMES, TEMPLATES, SLOTS: S,
    refWeight, exAllowed, scheme, startWeight, heavier, lighter, warmupSets,
    generatePlan, swapItem, adaptationActive, effectiveRange, createSession, evaluate, calibrate,
    nutrition, fmtKg,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
