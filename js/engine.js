// Logika aplikacji bez interfejsu: plany, ciężary, progresja, deload, rekordy, ciało, kalorie.
// Działa w przeglądarce (globalne EXERCISES) i w Node (testy).
// Źródła zasad: specyfikacja „Mój Trening” (ACSM 2026, Schoenfeld 2017, Helms 2014, ISSN, Mifflin-St Jeor).

const Engine = (() => {
  const EX = typeof EXERCISES !== 'undefined' ? EXERCISES : require('./exercises.js').EXERCISES;
  const DAY = 864e5;

  // Typowe hantle (kg, jedna hantla)
  const DB_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50];

  const GOALS = {
    redukcja: { label: 'Schudnąć / spalić tłuszcz', short: 'Redukcja tkanki tłuszczowej', rate: -0.75 },
    masa: { label: 'Zbudować mięśnie', short: 'Budowa mięśni', rate: 0.25 },
    sila: { label: 'Być silniejszym', short: 'Siła', rate: 0.15 },
    zdrowie: { label: 'Poprawić kondycję i zdrowie', short: 'Kondycja i zdrowie', rate: 0 },
  };

  const GROUPS = {
    klatka: 'Klatka piersiowa', plecy: 'Plecy', barki: 'Barki', ramiona: 'Ramiona (biceps, triceps)',
    nogi: 'Nogi i pośladki', brzuch: 'Brzuch',
  };

  // ─── Pozycje planu (ćwiczenie + zamienniki w kolejności wyboru) ───
  // p0 = dla zaczynających, p1 = od „trochę ćwiczyłem”, p2 = dla ćwiczących regularnie (brak → poprzednia lista)
  // fb = wzorce zastępcze; g = partie do priorytetów; reps/rir/rest wg specyfikacji; ss = superseria
  const S = {
    // Full Body 3× – siłownia (spec. 1.5, plan A)
    fA_squat: { p0: ['goblet_squat', 'back_squat', 'leg_press', 'hack_squat'], p1: ['back_squat', 'goblet_squat', 'leg_press', 'hack_squat'], fb: ['glute'], g: ['nogi'], role: 'main', sets: 3, reps: [6, 10], rir: [2, 3], rest: 150 },
    fA_press: { p0: ['db_bench', 'machine_chest_press', 'bb_bench', 'push_up'], g: ['klatka'], role: 'main', sets: 3, reps: [8, 12], rir: [2, 2], rest: 120 },
    fA_row: { p0: ['cable_row', 'machine_row', 'db_row', 'bb_row'], fb: ['hpull'], g: ['plecy'], role: 'main', sets: 3, reps: [8, 12], rir: [2, 2], rest: 120 },
    fA_rdl: { p0: ['db_rdl', 'bb_rdl', 'hip_thrust', 'glute_bridge'], fb: ['glute'], g: ['nogi'], role: 'main', sets: 3, reps: [8, 12], rir: [2, 3], rest: 120 },
    fA_lat: { p0: ['db_lateral_raise', 'cable_lateral_raise', 'band_lateral_raise'], g: ['barki'], role: 'acc', sets: 2, reps: [12, 15], rir: [1, 2], rest: 60, ss: 'S' },
    fA_tri: { p0: ['rope_pushdown', 'overhead_cable_ext', 'overhead_db_ext', 'diamond_push_up'], g: ['ramiona'], role: 'acc', sets: 2, reps: [10, 15], rir: [1, 2], rest: 60, ss: 'S' },
    fA_core: { p0: ['plank', 'dead_bug', 'bird_dog'], g: ['brzuch'], role: 'acc', sets: 2, ranges: { plank: [30, 45], dead_bug: [8, 10], bird_dog: [8, 10] }, rir: [1, 2], rest: 60 },
    fB_hinge: { p0: ['bb_rdl', 'hip_thrust', 'db_rdl', 'glute_bridge'], fb: ['glute', 'hinge'], g: ['nogi'], role: 'main', sets: 3, reps: [6, 10], rir: [2, 3], rest: 150 },
    fB_pull: { p0: ['lat_pulldown', 'assisted_pullup', 'band_pullup', 'negative_pullup'], p2: ['pull_up', 'lat_pulldown', 'assisted_pullup'], fb: ['hpull'], g: ['plecy'], role: 'main', sets: 3, reps: [8, 12], rir: [2, 2], rest: 120 },
    fB_ohp: { p0: ['db_shoulder_press', 'machine_shoulder_press', 'db_press_standing', 'ohp'], fb: ['rear_delt'], g: ['barki'], role: 'main', sets: 3, reps: [8, 12], rir: [2, 2], rest: 120 },
    fB_incl: { p0: ['incline_db_press', 'machine_chest_press', 'push_up', 'db_bench'], g: ['klatka'], role: 'main', sets: 3, reps: [8, 12], rir: [2, 2], rest: 120 },
    fB_lunge: { p0: ['walking_lunge', 'split_squat', 'bulgarian_split_squat', 'step_up', 'leg_press'], p1: ['bulgarian_split_squat', 'walking_lunge', 'split_squat', 'step_up', 'leg_press'], fb: ['squat'], g: ['nogi'], role: 'acc', sets: 3, reps: [8, 12], rir: [2, 2], rest: 90 },
    fB_curl: { p0: ['db_curl', 'cable_curl', 'hammer_curl', 'ez_curl'], g: ['ramiona'], role: 'acc', sets: 3, reps: [10, 15], rir: [1, 2], rest: 60 },
    fB_core: { p0: ['pallof_press', 'cable_crunch', 'side_plank', 'dead_bug'], g: ['brzuch'], role: 'acc', sets: 2, reps: [10, 12], ranges: { side_plank: [20, 40], dead_bug: [8, 10] }, rir: [1, 2], rest: 60 },

    // Full Body 3× – dom (spec. 1.5, plan B)
    hA_squat: { p0: ['goblet_squat'], fb: ['lunge', 'glute'], g: ['nogi'], role: 'main', sets: 3, reps: [8, 15], rir: [2, 3], rest: 120 },
    hA_push: { p0: ['push_up_incline', 'push_up'], p1: ['push_up', 'push_up_incline'], g: ['klatka'], role: 'main', sets: 3, reps: [6, 15], rir: [2, 2], rest: 90 },
    hA_row: { p0: ['db_row', 'band_row', 'inverted_row'], fb: ['hpull'], g: ['plecy'], role: 'main', sets: 3, reps: [8, 12], rir: [2, 2], rest: 90 },
    hA_rdl: { p0: ['db_rdl', 'db_hip_thrust', 'glute_bridge'], fb: ['glute'], g: ['nogi'], role: 'main', sets: 3, reps: [8, 12], rir: [2, 3], rest: 120 },
    hA_lat: { p0: ['band_lateral_raise', 'db_lateral_raise'], g: ['barki'], role: 'acc', sets: 3, reps: [12, 15], rir: [1, 2], rest: 60 },
    hA_core: { p0: ['dead_bug', 'plank', 'bird_dog'], g: ['brzuch'], role: 'acc', sets: 2, ranges: { dead_bug: [8, 10], plank: [30, 45], bird_dog: [8, 10] }, rir: [1, 2], rest: 60 },
    hB_lunge: { p0: ['bulgarian_split_squat', 'split_squat', 'walking_lunge'], fb: ['squat', 'glute'], g: ['nogi'], role: 'main', sets: 3, reps: [8, 12], rir: [2, 2], rest: 120 },
    hB_ohp: { p0: ['db_press_standing', 'db_shoulder_press'], fb: ['lat_raise'], g: ['barki'], role: 'main', sets: 3, reps: [8, 12], rir: [2, 2], rest: 90 },
    hB_pull: { p0: ['band_pullup', 'negative_pullup', 'inverted_row', 'band_row'], p2: ['pull_up', 'band_pullup', 'negative_pullup', 'inverted_row'], fb: ['hpull'], g: ['plecy'], role: 'main', sets: 3, reps: [5, 10], rir: [2, 2], rest: 120 },
    hB_rdl: { p0: ['db_rdl', 'db_hip_thrust', 'glute_bridge'], fb: ['glute'], g: ['nogi'], role: 'main', sets: 3, reps: [8, 12], rir: [2, 3], rest: 120 },
    hB_push: { p0: ['push_up_incline', 'push_up'], p1: ['push_up', 'push_up_incline'], p2: ['push_up_decline', 'push_up'], g: ['klatka'], role: 'main', sets: 3, reps: [6, 15], rir: [2, 2], rest: 90 },
    hB_curl: { p0: ['db_curl', 'hammer_curl'], g: ['ramiona'], role: 'acc', sets: 3, reps: [10, 15], rir: [1, 2], rest: 60, ss: 'R' },
    hB_tri: { p0: ['diamond_push_up', 'overhead_db_ext'], g: ['ramiona'], role: 'acc', sets: 2, reps: [10, 15], rir: [1, 2], rest: 60, ss: 'R' },
    hB_core: { p0: ['side_plank', 'plank', 'dead_bug'], g: ['brzuch'], role: 'acc', sets: 2, ranges: { side_plank: [20, 40], plank: [30, 45], dead_bug: [8, 10] }, rir: [1, 2], rest: 60 },

    // Góra / dół 4× (spec. 1.5, plan C) – RIR 1–2
    u1_bench: { p0: ['bb_bench', 'db_bench', 'machine_chest_press'], g: ['klatka'], role: 'main', sets: 4, reps: [5, 8], rir: [1, 2], rest: 180 },
    u1_row: { p0: ['bb_row', 'cable_row', 'machine_row', 'db_row'], g: ['plecy'], role: 'main', sets: 4, reps: [6, 10], rir: [1, 2], rest: 150 },
    u1_ohp: { p0: ['db_shoulder_press', 'db_press_standing', 'machine_shoulder_press'], fb: ['rear_delt'], g: ['barki'], role: 'main', sets: 3, reps: [8, 12], rir: [1, 2], rest: 120 },
    u1_pull: { p0: ['lat_pulldown', 'pull_up', 'assisted_pullup'], fb: ['hpull'], g: ['plecy'], role: 'main', sets: 3, reps: [8, 12], rir: [1, 2], rest: 120 },
    u1_lat: { p0: ['db_lateral_raise', 'cable_lateral_raise'], g: ['barki'], role: 'acc', sets: 3, reps: [12, 20], rir: [1, 2], rest: 60 },
    u1_bic: { p0: ['ez_curl', 'db_curl', 'cable_curl', 'hammer_curl'], g: ['ramiona'], role: 'acc', sets: 2, reps: [10, 15], rir: [1, 2], rest: 60 },
    u1_tri: { p0: ['rope_pushdown', 'overhead_cable_ext', 'overhead_db_ext'], g: ['ramiona'], role: 'acc', sets: 2, reps: [10, 15], rir: [1, 2], rest: 60 },
    l1_squat: { p0: ['back_squat', 'hack_squat', 'leg_press', 'goblet_squat'], fb: ['glute'], g: ['nogi'], role: 'main', sets: 4, reps: [5, 8], rir: [1, 2], rest: 180 },
    l1_rdl: { p0: ['bb_rdl', 'db_rdl', 'hip_thrust'], fb: ['glute'], g: ['nogi'], role: 'main', sets: 3, reps: [6, 10], rir: [1, 2], rest: 150 },
    l1_ext: { p0: ['leg_extension'], fb: ['lunge'], g: ['nogi'], role: 'acc', sets: 3, reps: [10, 15], rir: [1, 2], rest: 75 },
    l1_curl: { p0: ['seated_leg_curl', 'lying_leg_curl'], fb: ['hinge'], g: ['nogi'], role: 'acc', sets: 3, reps: [10, 15], rir: [1, 2], rest: 75 },
    l1_calf: { p0: ['calf_machine', 'calf_db', 'calf_leg_press'], g: ['nogi'], role: 'acc', sets: 3, reps: [10, 15], rir: [1, 2], rest: 60 },
    l1_core: { p0: ['cable_crunch', 'hanging_leg_raise', 'plank'], g: ['brzuch'], role: 'acc', sets: 3, reps: [10, 15], rir: [1, 2], rest: 60 },
    u2_incl: { p0: ['incline_db_press', 'machine_chest_press', 'db_bench'], g: ['klatka'], role: 'main', sets: 3, reps: [8, 12], rir: [1, 2], rest: 120 },
    u2_pull: { p0: ['pull_up', 'lat_pulldown', 'assisted_pullup'], fb: ['hpull'], g: ['plecy'], role: 'main', sets: 4, reps: [6, 10], rir: [1, 2], rest: 150 },
    u2_row: { p0: ['cable_row', 'machine_row', 'db_row'], g: ['plecy'], role: 'main', sets: 3, reps: [10, 12], rir: [1, 2], rest: 120 },
    u2_face: { p0: ['face_pull', 'reverse_pec_deck', 'db_rear_delt_fly'], g: ['barki', 'plecy'], role: 'acc', sets: 3, reps: [12, 15], rir: [1, 2], rest: 60 },
    u2_lat: { p0: ['cable_lateral_raise', 'db_lateral_raise'], g: ['barki'], role: 'acc', sets: 3, reps: [12, 20], rir: [1, 2], rest: 60 },
    u2_bic: { p0: ['hammer_curl', 'cable_curl', 'db_curl'], g: ['ramiona'], role: 'acc', sets: 2, reps: [10, 15], rir: [1, 2], rest: 60, ss: 'R' },
    u2_tri: { p0: ['overhead_cable_ext', 'rope_pushdown', 'overhead_db_ext'], g: ['ramiona'], role: 'acc', sets: 2, reps: [10, 15], rir: [1, 2], rest: 60, ss: 'R' },
    l2_dl: { p0: ['deadlift', 'bb_rdl', 'hip_thrust'], fb: ['glute'], g: ['nogi'], role: 'main', sets: 3, reps: [4, 6], rir: [1, 2], rest: 180 },
    l2_press: { p0: ['leg_press', 'hack_squat', 'goblet_squat'], fb: ['squat'], g: ['nogi'], role: 'main', sets: 3, reps: [10, 15], rir: [1, 2], rest: 120 },
    l2_hip: { p0: ['hip_thrust', 'db_hip_thrust', 'glute_bridge'], g: ['nogi'], role: 'main', sets: 3, reps: [8, 12], rir: [1, 2], rest: 120 },
    l2_lunge: { p0: ['walking_lunge', 'split_squat', 'bulgarian_split_squat'], fb: ['squat'], g: ['nogi'], role: 'acc', sets: 2, reps: [8, 12], rir: [1, 2], rest: 90 },
    l2_calf: { p0: ['calf_machine', 'calf_db', 'calf_leg_press'], g: ['nogi'], role: 'acc', sets: 3, reps: [12, 20], rir: [1, 2], rest: 60 },
    l2_core: { p0: ['hanging_leg_raise', 'cable_crunch', 'plank'], g: ['brzuch'], role: 'acc', sets: 3, reps: [8, 15], rir: [1, 2], rest: 60 },

    // Dodatki – tylko dla partii priorytetowych, gdy jest czas
    x_chest: { p0: ['pec_deck', 'cable_fly', 'push_up'], g: ['klatka'], role: 'acc', sets: 2, reps: [10, 15], rir: [1, 2], rest: 60 },
    x_press: { p0: ['incline_db_press', 'machine_chest_press', 'push_up'], g: ['klatka'], role: 'acc', sets: 2, reps: [8, 12], rir: [1, 2], rest: 90 },
    x_tri: { p0: ['rope_pushdown', 'overhead_cable_ext', 'diamond_push_up', 'overhead_db_ext'], g: ['ramiona'], role: 'acc', sets: 2, reps: [10, 15], rir: [1, 2], rest: 60 },
    x_bic: { p0: ['hammer_curl', 'db_curl', 'cable_curl'], g: ['ramiona'], role: 'acc', sets: 2, reps: [10, 15], rir: [1, 2], rest: 60 },
    x_legcurl: { p0: ['seated_leg_curl', 'lying_leg_curl'], fb: ['glute'], g: ['nogi'], role: 'acc', sets: 2, reps: [10, 15], rir: [1, 2], rest: 75 },
    x_calf: { p0: ['calf_machine', 'calf_db', 'calf_leg_press'], g: ['nogi'], role: 'acc', sets: 2, reps: [10, 15], rir: [1, 2], rest: 60 },
    x_rear: { p0: ['face_pull', 'reverse_pec_deck', 'db_rear_delt_fly'], g: ['barki', 'plecy'], role: 'acc', sets: 2, reps: [12, 15], rir: [1, 2], rest: 60 },
    x_lat: { p0: ['db_lateral_raise', 'cable_lateral_raise', 'band_lateral_raise'], g: ['barki'], role: 'acc', sets: 2, reps: [12, 15], rir: [1, 2], rest: 60 },
    x_row: { p0: ['db_row', 'machine_row', 'cable_row', 'band_row'], g: ['plecy'], role: 'acc', sets: 2, reps: [8, 12], rir: [1, 2], rest: 90 },
    x_glute: { p0: ['db_hip_thrust', 'hip_thrust', 'glute_bridge'], g: ['nogi'], role: 'acc', sets: 2, reps: [10, 15], rir: [1, 2], rest: 75 },
    x_core: { p0: ['hanging_leg_raise', 'cable_crunch', 'side_plank'], g: ['brzuch'], role: 'acc', sets: 2, reps: [8, 15], rir: [1, 2], rest: 60 },
  };

  const day = (key, name, focus, items, extra) => ({ key, name, focus, items, extra });
  const TEMPLATES = {
    fbw_gym: {
      name: 'Full Body 3× – siłownia (A/B naprzemiennie)', kind: 'fbw',
      days: [
        day('A', 'Trening A', 'Całe ciało', ['fA_squat', 'fA_press', 'fA_row', 'fA_rdl', 'fA_lat', 'fA_tri', 'fA_core'], ['x_chest', 'x_legcurl', 'x_rear', 'x_bic']),
        day('B', 'Trening B', 'Całe ciało', ['fB_hinge', 'fB_pull', 'fB_ohp', 'fB_incl', 'fB_lunge', 'fB_curl', 'fB_core'], ['x_tri', 'x_calf', 'x_lat', 'x_row', 'x_core']),
      ],
    },
    fbw_home: {
      name: 'Full Body 3× – dom (A/B naprzemiennie)', kind: 'fbw',
      days: [
        day('A', 'Trening A', 'Całe ciało', ['hA_squat', 'hA_push', 'hA_row', 'hA_rdl', 'hA_lat', 'hA_core'], ['x_glute', 'x_tri', 'x_calf']),
        day('B', 'Trening B', 'Całe ciało', ['hB_lunge', 'hB_ohp', 'hB_pull', 'hB_rdl', 'hB_push', 'hB_curl', 'hB_tri', 'hB_core'], ['x_glute', 'x_lat', 'x_core']),
      ],
    },
    ul4: {
      name: 'Góra / dół 4× w tygodniu', kind: 'ul',
      days: [
        day('G1', 'Góra 1', 'Klatka, plecy, barki, ramiona', ['u1_bench', 'u1_row', 'u1_ohp', 'u1_pull', 'u1_lat', 'u1_bic', 'u1_tri'], ['x_chest', 'x_rear']),
        day('D1', 'Dół 1', 'Nogi, pośladki, brzuch', ['l1_squat', 'l1_rdl', 'l1_ext', 'l1_curl', 'l1_calf', 'l1_core'], []),
        day('G2', 'Góra 2', 'Klatka, plecy, barki, ramiona', ['u2_incl', 'u2_pull', 'u2_row', 'u2_face', 'u2_lat', 'u2_bic', 'u2_tri'], ['x_chest']),
        day('D2', 'Dół 2', 'Nogi, pośladki, brzuch', ['l2_dl', 'l2_press', 'l2_hip', 'l2_lunge', 'l2_calf', 'l2_core'], []),
      ],
    },
  };

  const PLAN_VERSION = 2; // podbij, gdy zmieniają się szablony – zapisane plany ułożą się od nowa
  const BUDGET_MIN = { 45: 35, 60: 50, 75: 65 }; // minuty na ćwiczenia (bez ~10 min rozgrzewki ogólnej)

  // ─── Pomocnicze ───
  const roundTo = (v, step) => Math.round(v / step) * step;
  const floorTo = (v, step) => Math.floor(v / step + 1e-9) * step;
  const ceilTo = (v, step) => Math.ceil(v / step - 1e-9) * step;
  const fix = v => Math.round(v * 100) / 100;
  const isoDay = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const strengthLog = log => (log || []).filter(l => l.type !== 'cardio');

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

  // Krok ciężaru wg specyfikacji: sztanga dół +2,5–5 kg, góra +2,5 kg, hantle najmniejszy skok, maszyny krok stosu
  function increment(exId, w, settings) {
    const ex = EX[exId];
    const stack = (settings && settings.machineStep) || 2.5;
    if (ex.load === 'bb') return ex.lower ? (w >= 60 ? 5 : 2.5) : 2.5;
    if (ex.load === 'mach' || ex.load === 'cable' || ex.load === 'assist') return stack;
    return 0;
  }

  function heavier(exId, w, settings) {
    const ex = EX[exId];
    if (ex.load === 'bw') return w;
    if (ex.load === 'db') return dbNext(w);
    if (ex.load === 'assist') return Math.max(0, fix(w - increment(exId, w, settings)));
    return fix(w + increment(exId, w, settings));
  }

  function lighter(exId, w, pct) {
    const ex = EX[exId];
    if (ex.load === 'bw') return w;
    if (ex.load === 'db') return Math.min(dbPrev(w), dbDown(w * (1 - pct)));
    if (ex.load === 'assist') return fix(w + Math.max(2.5, ceilTo(Math.max(w, 10) * pct, 2.5)));
    const target = Math.min(w - 2.5, floorTo(w * (1 - pct), 2.5));
    return Math.max(minLoad(ex), fix(target));
  }

  // Kalibracja po 1. serii nowego ćwiczenia
  function calibrate(exId, w, rating) {
    const ex = EX[exId];
    if (rating === 'light') {
      if (ex.load === 'db') return Math.max(dbNext(w), dbUp(w * 1.2));
      if (ex.load === 'assist') return Math.max(0, fix(w - Math.max(2.5, floorTo(w * 0.2, 2.5))));
      return fix(w + Math.max(2.5, roundTo(w * 0.2, 2.5)));
    }
    if (rating === 'heavy') return lighter(exId, w, 0.15);
    return w;
  }

  // Serie rozgrzewkowe (spec. 1.8): pierwsze ćwiczenie – pełna rampa, kolejne główne – jedna lekka seria
  function warmupSets(exId, w, kind) {
    const ex = EX[exId];
    if (kind === 'none' || ex.load === 'bw' || ex.load === 'assist' || ex.range) return [];
    const out = [];
    const push = (x, reps) => {
      if (x <= 0 || x >= w) return;
      if (out.length && x <= out[out.length - 1].w) return;
      out.push({ w: fix(x), reps });
    };
    if (ex.load === 'bb') {
      const bar = ex.minW || 20;
      if (w <= bar) return [];
      if (kind === 'first') {
        push(bar, 10);
        push(Math.max(bar, floorTo(w * 0.5, 2.5)), 6);
        push(floorTo(w * 0.7, 2.5), 4);
        if (w >= 60) push(floorTo(w * 0.85, 2.5), 2);
      } else if (w >= bar + 10) push(Math.max(bar, floorTo(w * 0.6, 2.5)), 5);
    } else if (ex.load === 'db') {
      if (kind === 'first') {
        if (w >= 6) push(dbDown(w * 0.5), 8);
        if (w >= 12) push(dbDown(w * 0.75), 4);
      } else if (w >= 8) push(dbDown(w * 0.6), 5);
    } else {
      if (kind === 'first') {
        if (w >= 10) push(floorTo(w * 0.5, 2.5), 8);
        if (w >= 25) push(floorTo(w * 0.7, 2.5), 4);
        if (w >= 60) push(floorTo(w * 0.85, 2.5), 2);
      } else if (w >= 20) push(floorTo(w * 0.6, 2.5), 5);
    }
    return out;
  }

  // Kalkulator talerzy: ile na każdą stronę gryfu
  function platesPerSide(total, bar, avail) {
    const plates = (avail && avail.length ? avail : [25, 20, 15, 10, 5, 2.5, 1.25]).slice().sort((a, b) => b - a);
    let side = (total - (bar || 20)) / 2;
    if (side < -1e-9) return { ok: false, plates: [], rest: side };
    const used = [];
    for (const p of plates) {
      while (side >= p - 1e-9) { used.push(p); side = fix(side - p); }
    }
    return { ok: Math.abs(side) < 1e-6, plates: used, rest: fix(side) };
  }

  // ─── Generowanie planu ───
  function pickList(s, p) {
    if (p.exp >= 2 && s.p2) return s.p2;
    if (p.exp >= 1 && s.p1) return s.p1;
    return s.p0;
  }

  function chooseFor(slotKey, p, used) {
    const s = S[slotKey];
    for (const id of pickList(s, p)) if (!used.has(id) && exAllowed(id, p)) return id;
    for (const pat of (s.fb || [])) {
      for (const id of Object.keys(EX)) if (EX[id].pat === pat && !used.has(id) && exAllowed(id, p)) return id;
    }
    return null;
  }

  function slotAlternatives(slotKey, p) {
    const s = S[slotKey];
    const ids = [...s.p0, ...(s.p1 || []), ...(s.p2 || [])];
    const pats = new Set(ids.map(id => EX[id].pat));
    (s.fb || []).forEach(x => pats.add(x));
    Object.keys(EX).forEach(id => { if (pats.has(EX[id].pat)) ids.push(id); });
    return [...new Set(ids)].filter(id => exAllowed(id, p));
  }

  // Zakres powtórzeń dla konkretnego ćwiczenia w danej pozycji planu
  function rangeFor(slotKey, exId, goal) {
    const s = S[slotKey], ex = EX[exId];
    if (s.ranges && s.ranges[exId]) return s.ranges[exId].slice();
    if (ex.load === 'bw' && ex.range) return ex.range.slice();
    if (ex.range && ex.load !== 'bw' && ex.pat === 'core' && !s.reps) return ex.range.slice();
    let [lo, hi] = s.reps || ex.range || [10, 15];
    if (goal === 'sila' && s.role === 'main' && ex.load !== 'bw' && hi > 8) { lo = 5; hi = 8; }
    return [lo, hi];
  }

  function itemFor(slotKey, exId, p) {
    const s = S[slotKey];
    const [lo, hi] = rangeFor(slotKey, exId, p.goal);
    let rest = s.rest;
    if (p.goal === 'sila' && s.role === 'main') rest = Math.max(rest, 150);
    return { slot: slotKey, exId, role: s.role, sets: s.sets, lo, hi, rir: (s.rir || [1, 2]).slice(), rest, ss: s.ss || null, extra: 0 };
  }

  function estSeconds(items) {
    let t = 0;
    items.forEach((it, i) => {
      const ex = EX[it.exId];
      let work = ex.unit === 'time' ? (it.lo + it.hi) / 2 : 40;
      if (ex.perSide) work *= 2;
      const pairNext = it.ss && items[i + 1] && items[i + 1].ss === it.ss;
      const rest = pairNext ? 0 : it.rest; // w superserii przerwa dopiero po drugim ćwiczeniu
      const setup = i === 0 ? 240 : it.role === 'main' ? 120 : 60;
      t += it.sets * (work + rest) + setup;
    });
    return t;
  }

  function templateKey(p) {
    if (p.location === 'dom') return 'fbw_home';
    if (p.days >= 4 && (p.exp >= 2 || p.forceUL)) return 'ul4';
    return 'fbw_gym';
  }

  // Serie na partię tygodniowo dla zestawu dni (każdy dzień robiony strengthDays / liczba dni razy w tygodniu)
  function coverage(days, strengthDays) {
    const out = {};
    const perDay = strengthDays / days.length;
    for (const d of days) for (const it of d.items) {
      for (const [m, f] of Object.entries(EX[it.exId].sc || {})) out[m] = (out[m] || 0) + it.sets * f * perDay;
    }
    return out;
  }

  // Minimalna liczba serii na partię, której pilnujemy przy przycinaniu do czasu
  function volumeFloor(p) {
    const big = p.exp >= 2 ? 10 : 8;
    const t = { brzuch: 4 };
    for (const m of ['klatka', 'plecy', 'barki', 'biceps', 'triceps', 'czworoglowe', 'posladki', 'dwuglowe']) t[m] = big;
    return t;
  }

  const COMPOUND = new Set(['squat', 'hinge', 'glute', 'lunge', 'hpush', 'vpush', 'hpull', 'vpull']);

  function deficit(cov, floor) {
    let d = 0;
    for (const [m, lo] of Object.entries(floor)) d += Math.max(0, lo - (cov[m] || 0));
    return d;
  }

  function generatePlan(p) {
    const tk = templateKey(p);
    const tpl = TEMPLATES[tk];
    const budget = BUDGET_MIN[p.duration] * 60;
    const prio = new Set(p.priorities || []);
    const isPrio = k => S[k].g.some(x => prio.has(x));
    const cardioDay = tk !== 'ul4' && p.days >= 4;
    const strengthDays = cardioDay ? 3 : p.days;
    const floor = volumeFloor(p);

    const useds = [];
    const build = (k, used) => {
      const exId = chooseFor(k, p, used);
      if (!exId) return null;
      used.add(exId);
      const it = itemFor(k, exId, p);
      it.alts = slotAlternatives(k, p);
      return it;
    };
    const unpair = items => items.forEach((it, i) => {
      if (it.ss && !items.some((o, j) => j !== i && o.ss === it.ss)) it.ss = null;
    });

    const days = tpl.days.map((d, di) => {
      const used = new Set();
      useds[di] = used;
      const items = [];
      d.items.forEach(k => { const it = build(k, used); if (it) items.push(it); });
      unpair(items);
      return { key: d.key, name: d.name, focus: d.focus, items, trimmed: [] };
    });

    // Za długo → najpierw przerwy do dolnej granicy (2 min wielostawowe, 1 min pozostałe)
    for (const d of days) {
      if (estSeconds(d.items) > budget) d.items.forEach(it => { it.rest = it.role === 'main' ? Math.min(it.rest, 120) : Math.min(it.rest, 60); });
    }
    // Potem po jednej serii (albo całe ćwiczenie pomocnicze) tam, gdzie najmniej szkodzi to objętości tygodniowej
    const stuck = new Set(), stuckSoft = new Set();
    for (let guard = 0; guard < 200; guard++) {
      const over = days.map((d, i) => stuck.has(i) ? -Infinity : estSeconds(d.items) - budget);
      const di = over.indexOf(Math.max(...over));
      if (over[di] <= 0) break;
      const d = days[di];
      const t0 = estSeconds(d.items), def0 = deficit(coverage(days, strengthDays), floor);
      let best = null;
      // kara za ruszanie ćwiczeń wielostawowych – główne boje skracamy na końcu (spec. 1.2: kluczowe boje na początku i w pełnej objętości)
      const consider = (apply, undo, label, mainPenalty) => {
        apply();
        const saved = t0 - estSeconds(d.items);
        const dd = deficit(coverage(days, strengthDays), floor) - def0;
        undo();
        if (saved <= 0) return;
        const score = (dd + (mainPenalty || 0)) / saved;
        if (!best || score < best.score - 1e-9 || (Math.abs(score - best.score) < 1e-9 && saved > best.saved)) best = { score, saved, apply, label };
      };
      const allowMain = !!stuckSoft.has(di);
      d.items.forEach((it, i) => {
        const compound = it.role === 'main' || COMPOUND.has(EX[it.exId].pat);
        const min = it.role === 'main' ? 2 : 1;
        if (it.sets > min) consider(() => { it.sets--; }, () => { it.sets++; }, null, compound ? 1 : 0);
        if (it.role !== 'main' || (allowMain && i > 0)) {
          const group = it.ss ? d.items.filter(o => o.ss === it.ss) : [it];
          const before = d.items.slice();
          consider(() => { d.items = d.items.filter(o => !group.includes(o)); }, () => { d.items = before; }, group, 2 + (compound ? 1 : 0));
        }
      });
      if (!best) {
        // ostateczność: można odpuścić także ćwiczenie wielostawowe (nigdy pierwsze w dniu)
        if (!stuckSoft.has(di)) stuckSoft.add(di); else stuck.add(di);
        continue;
      }
      best.apply();
      if (best.label) best.label.forEach(r => { d.trimmed.push(r.exId); useds[di].delete(r.exId); });
      unpair(d.items);
    }

    // Priorytety: +1 seria (maks. 4) i dodatkowe ćwiczenie, jeśli jest czas
    if (prio.size) {
      days.forEach((d, di) => {
        for (const it of d.items) {
          if (!isPrio(it.slot) || it.sets >= 4) continue;
          it.sets += 1; it.extra = 1;
          if (estSeconds(d.items) > budget + 180) { it.sets -= 1; it.extra = 0; }
        }
        for (const k of tpl.days[di].extra.filter(isPrio)) {
          const it = build(k, useds[di]);
          if (!it) continue;
          d.items.push(it);
          if (estSeconds(d.items) > budget + 180) { d.items.pop(); useds[di].delete(it.exId); }
        }
      });
    }
    days.forEach(d => {
      d.items.forEach((it, i) => { it.order = i; });
      d.estMin = Math.round(estSeconds(d.items) / 60) + 10;
    });

    const beginner = p.exp < 2 && !p.forceUL;
    const schedule = { 2: 'np. poniedziałek i czwartek', 3: 'np. poniedziałek, środa, piątek', 4: tk === 'ul4' ? 'np. poniedziałek, wtorek, czwartek, piątek' : 'np. pn, śr, pt siłownia + 1 dzień cardio' }[p.days];
    return { createdAt: new Date().toISOString(), tv: PLAN_VERSION, template: tk, kind: tpl.kind, name: tpl.name, schedule, strengthDays, cardioDay, beginner, days };
  }

  function swapItem(item, newExId, p) {
    const fresh = itemFor(item.slot, newExId, p);
    return { ...item, exId: newExId, lo: fresh.lo, hi: fresh.hi, rir: fresh.rir };
  }

  // ─── Okres wdrożenia, deload ───
  function adaptationLeft(state) {
    const p = state.profile;
    const total = p.exp === 0 ? (state.plan.strengthDays || p.days) * 3 : p.exp === 1 ? (state.plan.strengthDays || p.days) * 2 : 0;
    return Math.max(0, total - strengthLog(state.log).length);
  }
  const adaptationActive = state => adaptationLeft(state) > 0;

  function e1rm(w, reps) {
    if (!w || !reps || reps > 10) return null;
    return Math.round(w * (1 + reps / 30) * 10) / 10;
  }

  function sessionBestE1(entry) {
    const ex = EX[entry.exId];
    if (!ex || ex.load === 'bw' || ex.load === 'assist') return null;
    let best = null;
    for (const s of entry.sets || []) {
      const v = e1rm(+s.w, +s.reps);
      if (v && (best == null || v > best)) best = v;
    }
    return best;
  }

  function deloadCheck(state, now) {
    now = now || Date.now();
    const logs = strengthLog(state.log);
    if (!logs.length || (state.deload && state.deload.active)) return { due: false, reasons: [] };
    const reasons = [];
    const meso = state.meso || {};
    const since = meso.lastDeloadEnd ? new Date(meso.lastDeloadEnd).getTime() : new Date(logs[0].date).getTime();
    const weeks = (now - since) / (7 * DAY);
    const limit = state.profile.exp >= 2 ? 6 : 8;
    if (weeks >= limit) reasons.push(`Minęło ${Math.floor(weeks)} tygodni bez lżejszego tygodnia (zalecane co ${limit}).`);
    // spadek e1RM w ≥2 głównych bojach przez 2 kolejne sesje
    const mains = new Set(state.plan.days.flatMap(d => d.items.filter(i => i.role === 'main').map(i => i.exId)));
    let drops = 0;
    for (const id of mains) {
      const vals = logs.flatMap(l => l.entries.filter(e => e.exId === id && !l.deload).map(e => sessionBestE1(e))).filter(v => v != null);
      if (vals.length >= 3) {
        const [a, b, c] = vals.slice(-3);
        if (b < a && c < b) drops++;
      }
    }
    if (drops >= 2) reasons.push(`Szacowana siła spada w ${drops} głównych ćwiczeniach od 2 treningów.`);
    const ready = logs.map(l => l.readiness).filter(Boolean).slice(-3);
    if (ready.length === 3 && ready.every(r => r.fatigue >= 4 || (r.sleep != null && r.sleep < 6))) {
      reasons.push('Od 3 treningów zgłaszasz duże zmęczenie lub mniej niż 6 h snu.');
    }
    const recent = meso.lastDeloadEnd && (now - new Date(meso.lastDeloadEnd).getTime()) < 14 * DAY;
    return { due: reasons.length > 0 && !recent, reasons };
  }

  // ─── Trening ───
  function lastEntry(log, exId) {
    for (let i = (log || []).length - 1; i >= 0; i--) {
      const l = log[i];
      if (l.type === 'cardio' || l.deload) continue;
      const e = (l.entries || []).find(x => x.exId === exId && x.sets && x.sets.length);
      if (e) return { date: l.date, sets: e.sets };
    }
    return null;
  }

  // Podpowiedź powtórzeń na kolejne serie (spec. 1.4A): ten sam ciężar → jak ostatnio i +1 w jednej serii
  function suggestReps(last, w, lo, hi, n) {
    if (!last) return Array(n).fill(null);
    const sameW = last.sets.every(s => Math.abs((+s.w || 0) - w) < 1e-6);
    if (!sameW) return Array(n).fill(lo);
    const out = Array.from({ length: n }, (_, i) => {
      const s = last.sets[Math.min(i, last.sets.length - 1)];
      return Math.max(lo, Math.min(hi, +s.reps || lo));
    });
    const k = out.findIndex(r => r < hi);
    if (k >= 0) out[k] += 1;
    return out;
  }

  function createSession(state, dayIndex, opts) {
    const d = state.plan.days[dayIndex];
    const adapt = adaptationActive(state);
    const deload = !!(state.deload && state.deload.active);
    let firstMainDone = false;
    const entries = d.items.map(it => {
      const ex = EX[it.exId];
      const prog = state.prog[it.exId];
      const w = prog && prog.w != null ? prog.w : startWeight(it.exId, state.profile);
      let [lo, hi] = [it.lo, it.hi];
      if (ex.load === 'bw') {
        const bonus = (prog && prog.bonus) || 0;
        const cap = ex.maxTop || hi + 10;
        hi = Math.min(cap, hi + bonus);
        lo = Math.min(hi - 2, lo + bonus);
      }
      const sets = deload ? Math.max(1, Math.ceil(it.sets * 0.5)) : it.sets;
      const rir = deload || adapt ? [3, 4] : it.rir.slice();
      let kind = 'none';
      if (it.role === 'main') { kind = firstMainDone ? 'main' : 'first'; firstMainDone = true; }
      const last = lastEntry(state.log, it.exId);
      const sug = suggestReps(last, w, lo, hi, sets);
      return {
        exId: it.exId, role: it.role, slot: it.slot, lo, hi, rir, rest: it.rest, ss: it.ss || null,
        calib: !prog && ex.load !== 'bw', rated: null, techFail: false, note: '', pain: [],
        last: last ? { date: last.date, sets: last.sets.map(s => ({ w: s.w, reps: s.reps, rir: s.rir })) } : null,
        warm: warmupSets(it.exId, w, kind).map(s => ({ ...s, done: false })),
        sets: Array.from({ length: sets }, (_, i) => ({ w, reps: '', rir: null, done: false, sug: sug[i] })),
      };
    });
    return {
      id: 'log_' + new Date().toISOString(), dayIndex, dayKey: d.key, dayName: d.name, startedAt: new Date().toISOString(),
      adapt, deload, stage: 'ready', idx: 0, warmChecks: [], readiness: null, rating: null, timer: null, entries,
    };
  }

  // Ocena ćwiczenia po treningu → nowy ciężar i komunikat (spec. 1.4A + 6.1)
  function evaluate(entry, prev, opts) {
    opts = opts || {};
    const ex = EX[entry.exId];
    let done = entry.sets.filter(s => s.done && s.reps !== '' && s.reps != null && !isNaN(+s.reps));
    const prog = { ...(prev || {}) };
    if (!done.length) return { prog: prev, msg: null, change: 0 };
    const unitWord = ex.unit === 'time' ? 's' : 'powt.';
    if (opts.deload) {
      if (ex.load !== 'bw' && prog.w == null) prog.w = +done[done.length - 1].w;
      return { prog, change: 0, msg: 'Tydzień lżejszy – ciężar bez zmian.' };
    }
    let planned = entry.sets.length;
    if (entry.rated && entry.rated !== 'ok' && ex.load !== 'bw') {
      const calW = entry.sets.length > 1 ? +entry.sets[1].w : +entry.sets[0].w;
      done = done.slice(1);
      if (!done.length) { prog.w = calW; return { prog, change: 0, msg: `Ciężar dopasowany po 1. serii – następnym razem ${fmtKg(calW)}.` }; }
      const lw = +done[done.length - 1].w;
      const tooHeavy = done.some(s => +s.reps < entry.lo);
      prog.w = tooHeavy ? lighter(entry.exId, lw, 0.1) : lw;
      prog.fail = 0;
      return { prog, change: tooHeavy ? -1 : 0, msg: `Ciężar dopasowany po 1. serii – następnym razem ${fmtKg(prog.w)}.` };
    }
    const reps = done.map(s => +s.reps);
    const rirMin = (entry.rir && entry.rir[0] != null ? entry.rir[0] : 2) - 1;
    const rirOk = done.every(s => s.rir == null || s.rir === '' || +s.rir >= rirMin);
    const allTop = done.length >= planned && reps.every(r => r >= entry.hi);
    const anyBelow = reps.some(r => r < entry.lo);

    if (ex.load === 'bw') {
      const step = ex.unit === 'time' ? 10 : 2;
      const cap = ex.maxTop || entry.hi + 10;
      if (allTop && rirOk && !entry.techFail && entry.hi < cap) {
        prog.bonus = (prog.bonus || 0) + step;
        return { prog, change: 1, msg: `Świetnie! Następnym razem ${Math.min(cap - 2, entry.lo + step)}–${Math.min(cap, entry.hi + step)} ${unitWord}.` };
      }
      if (allTop && entry.hi >= cap) {
        const h = ex.harder && EX[ex.harder] ? `: spróbuj „${EX[ex.harder].name}” (przycisk „Zamień”)` : ' – możesz wybrać trudniejszy wariant („Zamień”)';
        return { prog, change: 0, msg: `Masz już górny zakres${h}.` };
      }
      return { prog, change: 0, msg: `Zostajemy przy ${entry.lo}–${entry.hi} ${unitWord} – dodaj powtórzenie w co najmniej jednej serii.` };
    }

    const w = +done[done.length - 1].w;
    prog.w = w;
    if (entry.techFail) {
      prog.fail = prog.fail || 0;
      return { prog, change: 0, msg: `Technika się sypała – zostajemy przy ${fmtKg(w)} i dopracowujemy ruch.` };
    }
    if (allTop && rirOk) {
      prog.w = heavier(entry.exId, w, opts.settings);
      prog.fail = 0;
      const what = ex.load === 'assist' ? `mniejsza pomoc: ${fmtKg(prog.w)}` : fmtKg(prog.w);
      return { prog, change: 1, msg: `${entry.hi} ${unitWord} w każdej serii → następnym razem ${what}, celuj w ${entry.lo} powt.` };
    }
    if (allTop) {
      prog.fail = 0;
      return { prog, change: 0, msg: `Górny zakres zrobiony, ale „na granicy” (mały zapas). Zostajemy przy ${fmtKg(w)} – następnym razem z lepszym zapasem.` };
    }
    if (anyBelow) {
      prog.fail = (prog.fail || 0) + 1;
      if (prog.fail >= 2) {
        prog.w = lighter(entry.exId, w, 0.1);
        prog.fail = 0;
        prog.resets = [...(prog.resets || []), new Date().toISOString()].slice(-5);
        return { prog, change: -1, msg: `Drugi raz poniżej ${entry.lo} powt. → reset −10%: ${fmtKg(prog.w)}.` };
      }
      return { prog, change: 0, msg: `Poniżej ${entry.lo} powt. – powtórz ${fmtKg(w)}. Jeśli znowu się nie uda, zmniejszymy ciężar.` };
    }
    prog.fail = 0;
    return { prog, change: 0, msg: `Zostajemy przy ${fmtKg(w)} – dodaj 1 powtórzenie w co najmniej jednej serii.` };
  }

  function fmtKg(w) { return `${String(fix(w)).replace('.', ',')} kg`; }

  // ─── Rekordy, objętość ───
  function volumeOf(entry) {
    const ex = EX[entry.exId];
    if (!ex || ex.load === 'bw' || ex.load === 'assist') return 0;
    const mult = (ex.load === 'db' && !ex.single ? 2 : 1) * (ex.perSide ? 2 : 1);
    return (entry.sets || []).reduce((a, s) => a + (+s.w || 0) * (+s.reps || 0) * mult, 0);
  }

  function records(log) {
    const out = {};
    for (const l of strengthLog(log)) {
      for (const e of l.entries || []) {
        const ex = EX[e.exId];
        if (!ex || ex.load === 'bw' || ex.load === 'assist') continue;
        const r = out[e.exId] || (out[e.exId] = { bestW: 0, bestE1: 0, bestVol: 0, repsAt: {}, date: {} });
        for (const s of e.sets || []) {
          const w = +s.w, reps = +s.reps;
          if (!reps) continue;
          if (w > r.bestW) { r.bestW = w; r.date.bestW = l.date; }
          const v = e1rm(w, reps);
          if (v && v > r.bestE1) { r.bestE1 = v; r.date.bestE1 = l.date; }
          const key = String(w);
          if (!r.repsAt[key] || reps > r.repsAt[key]) r.repsAt[key] = reps;
        }
        const vol = volumeOf(e);
        if (vol > r.bestVol) { r.bestVol = vol; r.date.bestVol = l.date; }
      }
    }
    return out;
  }

  // Nowe rekordy w zakończonym treningu na tle wcześniejszej historii
  function detectPRs(entries, prevLog) {
    const before = records(prevLog);
    const prs = [];
    for (const e of entries) {
      const ex = EX[e.exId];
      if (!ex || ex.load === 'bw' || ex.load === 'assist' || !e.sets.length) continue;
      const r = before[e.exId];
      if (!r) continue; // pierwszy raz – to jeszcze nie rekord
      const maxW = Math.max(...e.sets.map(s => +s.w));
      const bestE = Math.max(0, ...e.sets.map(s => e1rm(+s.w, +s.reps) || 0));
      const vol = volumeOf(e);
      if (maxW > r.bestW) prs.push({ exId: e.exId, kind: 'w', text: `najcięższy ciężar: ${fmtKg(maxW)}` });
      else if (bestE > r.bestE1 + 0.05) prs.push({ exId: e.exId, kind: 'e1', text: `szacowany 1RM ≈ ${fmtKg(bestE)}` });
      else {
        const repPR = e.sets.find(s => r.repsAt[String(+s.w)] && +s.reps > r.repsAt[String(+s.w)]);
        if (repPR) prs.push({ exId: e.exId, kind: 'reps', text: `${repPR.reps} powt. z ${fmtKg(+repPR.w)}` });
        else if (vol > r.bestVol) prs.push({ exId: e.exId, kind: 'vol', text: `największa objętość: ${Math.round(vol)} kg` });
      }
    }
    return prs;
  }

  // Serie robocze na partię (z wagą 1 / 0,5) w przedziale czasu
  function weeklySets(log, from, to) {
    const out = {};
    for (const l of strengthLog(log)) {
      const t = new Date(l.date).getTime();
      if (t < from || t > to) continue;
      for (const e of l.entries || []) {
        const ex = EX[e.exId];
        if (!ex || !ex.sc) continue;
        const n = (e.sets || []).length;
        for (const [m, f] of Object.entries(ex.sc)) out[m] = (out[m] || 0) + n * f;
      }
    }
    return out;
  }

  // Ile serii na partię daje plan średnio w tygodniu
  function planWeeklySets(plan) {
    const out = {};
    const perDay = (plan.strengthDays || plan.days.length) / plan.days.length;
    for (const d of plan.days) {
      for (const it of d.items) {
        const ex = EX[it.exId];
        for (const [m, f] of Object.entries(ex.sc || {})) out[m] = (out[m] || 0) + it.sets * f * perDay;
      }
    }
    for (const k of Object.keys(out)) out[k] = Math.round(out[k] * 10) / 10;
    return out;
  }

  // Cel serii tygodniowo (spec. 1.2): początkujący 8–12, dalej 10–20; brzuch 4–8
  function setTargets(profile, plan) {
    const big = profile.exp >= 2 ? [10, 20] : [8, 12];
    const planned = planWeeklySets(plan);
    const t = {};
    for (const m of ['klatka', 'plecy', 'barki', 'biceps', 'triceps', 'czworoglowe', 'posladki', 'dwuglowe']) t[m] = big;
    t.brzuch = [4, 8];
    if (planned.lydki) t.lydki = [6, 12];
    return t;
  }

  // ─── Tygodnie, seria tygodni ───
  function weekStart(t) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    const dow = (d.getDay() + 6) % 7; // poniedziałek = 0
    return d.getTime() - dow * DAY;
  }

  function weekStats(log, target, now) {
    now = now || Date.now();
    const s = strengthLog(log);
    const thisWeek = weekStart(now);
    const count = from => s.filter(l => { const t = new Date(l.date).getTime(); return t >= from && t < from + 7 * DAY; }).length;
    const current = count(thisWeek);
    let streak = current >= target ? 1 : 0;
    for (let w = thisWeek - 7 * DAY; ; w -= 7 * DAY) {
      if (count(w) >= target) streak++;
      else break;
      if (streak > 520) break;
    }
    return { current, target, streak };
  }

  // ─── Ciało: trend wagi (EMA α=0,1) i tempo zmian ───
  function weightTrend(weights) {
    const pts = (weights || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
    let tr = null;
    return pts.map(p => {
      tr = tr == null ? p.kg : tr + 0.1 * (p.kg - tr);
      return { date: p.date, kg: p.kg, trend: Math.round(tr * 100) / 100 };
    });
  }

  function trendRate(trend, days) {
    days = days || 14;
    if (trend.length < 2) return null;
    const last = trend[trend.length - 1];
    const lastT = new Date(last.date).getTime();
    let past = null;
    for (const p of trend) if (new Date(p.date).getTime() <= lastT - days * DAY + 1e-6) past = p;
    if (!past) {
      const first = trend[0];
      const span = (lastT - new Date(first.date).getTime()) / DAY;
      if (span < 7) return null;
      past = first;
    }
    const span = (lastT - new Date(past.date).getTime()) / DAY;
    if (span < 7) return null;
    const kgPerWeek = (last.trend - past.trend) / span * 7;
    return { kgPerWeek: Math.round(kgPerWeek * 100) / 100, pctPerWeek: Math.round(kgPerWeek / past.trend * 1000) / 10, days: Math.round(span) };
  }

  // ─── Kalorie i makroskładniki (spec. 5) ───
  const PAL = { siedzaca: 1.375, ruch: 1.55, fizyczna: 1.725 };

  function goalRate(p, nutri) {
    if (nutri && nutri.rate != null && p.goal === 'redukcja') return nutri.rate;
    if (p.goal === 'redukcja') {
      const h = p.height / 100;
      return p.weight / (h * h) < 25 ? -0.5 : -0.75;
    }
    return GOALS[p.goal].rate;
  }

  function nutrition(p, nutri) {
    nutri = nutri || {};
    const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'k' ? -161 : 5);
    const tdee = bmr * (PAL[p.activity] || 1.375);
    const rate = goalRate(p, nutri);
    const delta = rate / 100 * p.weight * 7700 / 7;
    let kcal = (nutri.tdeeEst || tdee) + delta + (nutri.adjust || 0);
    const floor = p.sex === 'k' ? 1200 : 1500;
    const warn = [];
    if (kcal < floor) { kcal = floor; warn.push(`Nie schodzimy poniżej ${floor} kcal dziennie.`); }
    if (kcal < bmr) warn.push('Cel jest poniżej podstawowej przemiany materii (BMR). Rób to tylko świadomie i krótko – lepiej wolniejsze tempo.');
    const h = p.height / 100;
    const bmi = p.weight / (h * h);
    const refW = bmi > 30 ? p.height - 100 : p.weight;
    const pr = { redukcja: [1.8, 2.2], masa: [1.6, 2.0], sila: [1.6, 2.0], zdrowie: [1.4, 1.8] }[p.goal];
    const protein = [roundTo(refW * pr[0], 5), roundTo(refW * pr[1], 5)];
    kcal = roundTo(kcal, 50);
    const fat = [Math.round(Math.max(0.6 * refW, 0.2 * kcal / 9)), Math.round(0.35 * kcal / 9)];
    const protMid = (protein[0] + protein[1]) / 2;
    const fatMid = Math.max(fat[0], Math.round(0.27 * kcal / 9));
    const carbs = Math.max(0, Math.round((kcal - protMid * 4 - fatMid * 9) / 4));
    return {
      bmr: Math.round(bmr), bmrRange: [roundTo(bmr * 0.9, 10), roundTo(bmr * 1.1, 10)],
      tdee: roundTo(nutri.tdeeEst || tdee, 50), tdeeFormula: roundTo(tdee, 50), pal: PAL[p.activity] || 1.375,
      rate, delta: Math.round(delta), kcal, protein, fat, fatMid, carbs,
      fiber: Math.max(25, Math.round(kcal / 1000 * 14)), water: p.sex === 'k' ? 2.0 : 2.5,
      bmi: Math.round(bmi * 10) / 10, protBasis: bmi > 30 ? `liczone od wzrostu (${p.height} − 100 = ${refW} kg), bo przy BMI powyżej 30 liczenie od pełnej wagi zawyża wynik` : null,
      warn,
    };
  }

  // Adaptacyjna korekta celu kalorii (spec. 5.3) – propozycja raz na 7 dni
  function adaptiveSuggestion(state, now) {
    now = now || Date.now();
    const p = state.profile, body = state.body || {}, nutri = state.nutrition || {};
    if (nutri.lastCheck && now - new Date(nutri.lastCheck).getTime() < 7 * DAY) return null;
    const from = now - 14 * DAY;
    const ws = (body.weights || []).filter(w => new Date(w.date).getTime() >= from - DAY);
    if (ws.length < 10) return null;
    const trend = weightTrend(body.weights);
    const rate = trendRate(trend, 14);
    if (!rate) return null;
    const goal = goalRate(p, nutri);
    const n = nutrition(p, nutri);
    const kcalDays = Object.entries(body.kcal || {}).filter(([d]) => new Date(d).getTime() >= from - DAY && new Date(d).getTime() <= now);
    const warn = [];
    if (rate.pctPerWeek < -1.5) warn.push('Tracisz ponad 1,5% masy ciała tygodniowo – to za szybko. Jeśli łapiesz się na obsesyjnym liczeniu albo napadach objadania, porozmawiaj ze specjalistą (dietetyk, psycholog).');
    let delta = 0, mode, reason;
    if (kcalDays.length >= 12) {
      mode = 'pełny';
      const avg = kcalDays.reduce((a, [, v]) => a + v, 0) / kcalDays.length;
      const dTrend = rate.kgPerWeek * 2; // zmiana trendu w 14 dni
      const tdeeObs = avg - dTrend * 7700 / 14;
      const tdeeEst = 0.7 * (nutri.tdeeEst || n.tdeeFormula) + 0.3 * tdeeObs;
      const target = tdeeEst + goal / 100 * p.weight * 7700 / 7;
      delta = Math.max(-150, Math.min(150, Math.round((target - n.kcal) / 10) * 10));
      reason = `Z Twoich wpisów: średnio ${Math.round(avg)} kcal, trend wagi ${rate.kgPerWeek > 0 ? '+' : ''}${String(rate.kgPerWeek).replace('.', ',')} kg/tydz. → szacowane zapotrzebowanie ok. ${roundTo(tdeeEst, 50)} kcal.`;
      return { mode, delta, reason, tdeeEst: Math.round(tdeeEst), rate, goal, warn };
    }
    mode = 'tylko waga';
    const r = rate.pctPerWeek;
    if (goal < 0) {
      if (r > goal + 0.25) { delta = -125; reason = `Tempo ${fmtPct(r)} tygodniowo jest wolniejsze od celu (${fmtPct(goal)}).`; }
      else if (r < goal - 0.5) { delta = 125; reason = `Tempo ${fmtPct(r)} tygodniowo jest szybsze od celu (${fmtPct(goal)}) – dodajmy trochę jedzenia, żeby chronić mięśnie.`; }
    } else if (goal > 0) {
      if (r < goal - 0.25) { delta = 125; reason = `Waga rośnie wolniej niż cel (${fmtPct(goal)} tygodniowo).`; }
      else if (r > goal + 0.5) { delta = -125; reason = `Waga rośnie szybciej niż cel (${fmtPct(goal)}) – to głównie tłuszcz.`; }
    } else if (Math.abs(r) > 0.25) {
      delta = r > 0 ? -125 : 125; reason = `Waga zmienia się o ${fmtPct(r)} tygodniowo, a celem jest jej utrzymanie.`;
    }
    if (goal < 0) {
      const t21 = trendRate(trend, 21);
      if (t21 && t21.days >= 21 && t21.kgPerWeek >= 0) warn.push('Od 3 tygodni waga nie spada mimo deficytu. Sprawdź dokładność liczenia: ważenie jedzenia, oleje, napoje, podjadanie.');
    }
    if (!delta && !warn.length) return { mode, delta: 0, reason: `Tempo ${fmtPct(r)} tygodniowo – zgodnie z celem. Bez zmian.`, rate, goal, warn };
    return { mode, delta, reason, rate, goal, warn };
  }

  function fmtPct(v) { return `${v > 0 ? '+' : ''}${String(Math.round(v * 100) / 100).replace('.', ',')}%`; }

  // Cel kroków (spec. 1.7): 7–10 tys., przy niższej średniej +1000
  function stepsGoal(steps, now) {
    now = now || Date.now();
    const vals = Object.entries(steps || {}).filter(([d]) => new Date(d).getTime() >= now - 7 * DAY && new Date(d).getTime() <= now).map(([, v]) => v);
    if (vals.length < 3) return { goal: 8000, avg: null };
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const goal = avg >= 10000 ? 10000 : Math.min(10000, ceilTo(avg, 1000) + 1000);
    return { goal, avg };
  }

  return {
    EX, DB_STEPS, PLAN_VERSION, volumeFloor, GOALS, GROUPS, TEMPLATES, SLOTS: S, DAY,
    isoDay, refWeight, exAllowed, startWeight, increment, heavier, lighter, calibrate, warmupSets, platesPerSide,
    generatePlan, swapItem, adaptationLeft, adaptationActive, deloadCheck, lastEntry, suggestReps, createSession, evaluate,
    e1rm, sessionBestE1, volumeOf, records, detectPRs, weeklySets, planWeeklySets, setTargets, weekStart, weekStats,
    weightTrend, trendRate, nutrition, goalRate, adaptiveSuggestion, stepsGoal, fmtKg, fmtPct, estSeconds, strengthLog,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
