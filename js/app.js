// Interfejs aplikacji. Dane w IndexedDB na telefonie (js/data.js).
(() => {
  const E = Engine;
  const EX = EXERCISES;
  const C = CONTENT;
  const D = Data;
  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal');
  const $toast = document.getElementById('toast');
  const DAY = 864e5;

  let state = null;
  const ui = { tab: 'today', ob: null, obStep: 0, obReturn: null, err: '', openLog: null, pickDay: null, chartEx: null, bodyDate: null, updateReady: false, migrated: false, imp: null };

  // ─── Zapis ───
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(flush, 120);
  }
  function flush() {
    clearTimeout(saveT); saveT = null;
    if (!state) return Promise.resolve();
    return D.saveState(state).catch(err => {
      toast(err && err.name === 'QuotaExceededError' ? 'Brak miejsca na telefonie – zrób kopię i usuń część zdjęć.' : 'Nie udało się zapisać danych.');
    });
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);

  // ─── Pomocnicze ───
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
  const kg = w => E.fmtKg(w);
  const nf = w => String(Math.round(w * 100) / 100).replace('.', ',');
  const sexOf = () => (state && state.profile ? state.profile.sex : (ui.ob && ui.ob.sex)) || 'm';
  const g = (m, f) => (sexOf() === 'k' ? f : m);
  const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? few : many;
  const restTxt = s => s === 90 ? '1,5 min' : s === 150 ? '2,5 min' : s % 60 === 0 ? `${s / 60} min` : `${s} s`;
  const dateTxt = iso => new Date(iso).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' });
  const shortDate = iso => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  const today = () => E.isoDay(Date.now());
  const rirTxt = r => r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`;

  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.remove('hidden');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => $toast.classList.add('hidden'), 3400);
  }

  function repsTxt(exId, lo, hi) {
    const ex = EX[exId];
    return `${lo}–${hi} ${ex.unit === 'time' ? 's' : 'powt.'}${ex.perSide ? ' na stronę' : ''}`;
  }
  function loadTxt(exId, w) {
    const ex = EX[exId];
    if (ex.load === 'bw') return ex.eq.includes('guma') ? 'guma' : 'masa ciała';
    if (ex.load === 'assist') return `pomoc ${kg(w)}`;
    if (ex.load === 'db') return ex.single ? `hantla ${kg(w)}` : `hantle po ${kg(w)}`;
    return kg(w);
  }
  function currentW(exId) {
    const p = state.prog[exId];
    return p && p.w != null ? p.w : E.startWeight(exId, state.profile);
  }
  function planTarget() { return state.plan.strengthDays || state.profile.days; }

  // ─── Wywiad ───
  const GOAL_OPTS = [
    { v: 'redukcja', label: 'Schudnąć / spalić tłuszcz', hint: 'Mniej tkanki tłuszczowej przy zachowaniu mięśni' },
    { v: 'masa', label: 'Zbudować mięśnie', hint: 'Większe i mocniejsze mięśnie, lepsza sylwetka' },
    { v: 'sila', label: 'Być silniejszym', hint: 'Podnosić większe ciężary' },
    { v: 'zdrowie', label: 'Poprawić kondycję i zdrowie', hint: 'Lepsze samopoczucie, sprawność, zdrowe plecy' },
  ];
  const STEPS = [
    { id: 'intro', type: 'intro' },
    { id: 'name', type: 'text', title: 'Jak masz na imię?', sub: 'Opcjonalnie – możesz pominąć.' },
    { id: 'sex', type: 'single', title: 'Płeć', sub: 'Potrzebne do dobrania ciężarów startowych i kalorii.', opts: [{ v: 'm', label: 'Mężczyzna' }, { v: 'k', label: 'Kobieta' }] },
    { id: 'age', type: 'number', title: 'Ile masz lat?', unit: 'lat', min: 16, max: 90, int: true },
    { id: 'height', type: 'number', title: 'Ile masz wzrostu?', unit: 'cm', min: 130, max: 230, int: true },
    { id: 'weight', type: 'number', title: 'Ile ważysz?', unit: 'kg', min: 35, max: 250 },
    {
      id: 'exp', type: 'single', title: 'Jakie masz doświadczenie z siłownią?', sub: 'Szczerze – od tego zależy, od czego zaczniemy.',
      opts: () => [
        { v: 0, label: 'Zaczynam od zera', hint: g('Nigdy nie ćwiczyłem albo było to bardzo dawno', 'Nigdy nie ćwiczyłam albo było to bardzo dawno') },
        { v: 1, label: g('Trochę już ćwiczyłem', 'Trochę już ćwiczyłam'), hint: 'Krócej niż pół roku albo z długimi przerwami' },
        { v: 2, label: 'Ćwiczę regularnie', hint: 'Od pół roku lub dłużej, znam podstawowe ćwiczenia' },
      ],
    },
    { id: 'goal', type: 'single', title: 'Co chcesz osiągnąć?', sub: 'Wybierz główny cel – kalorie i ruch zostaną pod niego ustawione.', opts: GOAL_OPTS },
    {
      id: 'priorities', type: 'multi', title: 'Na których partiach ciała najbardziej Ci zależy?',
      sub: 'Plan zawsze obejmuje całe ciało. Zaznaczone partie dostaną więcej pracy, jeśli wystarczy czasu.',
      opts: [{ v: 'all', label: 'Całe ciało po równo', exclusive: true }, ...Object.entries(E.GROUPS).map(([v, label]) => ({ v, label }))],
    },
    {
      id: 'location', type: 'single', title: 'Gdzie będziesz ćwiczyć?',
      opts: [{ v: 'silownia', label: 'Na siłowni' }, { v: 'dom', label: 'W domu', hint: 'Hantle, guma, drążek' }],
    },
    {
      id: 'days', type: 'single', title: 'Ile dni w tygodniu możesz trenować?', sub: 'Najlepsze efekty na start daje trening całego ciała 3 razy w tygodniu.',
      opts: () => [
        { v: 2, label: '2 dni', hint: 'Minimum, które daje dobre efekty' },
        { v: 3, label: '3 dni', hint: 'Najlepszy wybór na start', badge: 'zalecane' },
        { v: 4, label: '4 dni', hint: (ui.ob.exp >= 2 && ui.ob.location !== 'dom') ? 'Plan góra / dół' : '3 treningi siłowe + 1 dzień spokojnego cardio' },
      ],
    },
    {
      id: 'duration', type: 'single', title: 'Ile czasu masz na jeden trening?', sub: 'Łącznie z rozgrzewką.',
      opts: [{ v: 45, label: 'ok. 45 minut' }, { v: 60, label: 'ok. 60 minut', badge: 'zalecane' }, { v: 75, label: 'ok. 75 minut' }],
    },
    {
      id: 'equipment', type: 'multi', title: () => ui.ob.location === 'dom' ? 'Co masz w domu?' : 'Co jest na Twojej siłowni?',
      sub: () => ui.ob.location === 'dom' ? 'Zaznacz wszystko, czego możesz używać.' : 'Typowa siłownia ma wszystko – odznacz tylko to, czego na pewno nie ma.',
      opts: () => EQUIPMENT_BY_PLACE[ui.ob.location || 'silownia'].map(id => {
        const e = EQUIPMENT.find(x => x.id === id);
        const h = ui.ob.location === 'dom' ? EQUIPMENT_HOME_LABELS[id] : null;
        return { v: id, label: h ? h.label : e.label, hint: h ? h.hint : e.hint };
      }),
    },
    {
      id: 'injuries', type: 'multi', title: 'Czy coś Cię boli lub masz kontuzję?', sub: 'Pominę ćwiczenia, które obciążają te miejsca.',
      opts: [{ v: 'none', label: 'Nic mi nie dolega', exclusive: true }, ...INJURIES.map(i => ({ v: i.id, label: i.label }))],
    },
    {
      id: 'parq', type: 'multi', title: 'Ankieta zdrowia', sub: 'Czy dotyczy Cię coś z tej listy? To nie blokuje aplikacji – przy „tak” zalecimy konsultację z lekarzem przed intensywnym treningiem.',
      opts: () => [{ v: 'none', label: 'Nic z powyższych', exclusive: true }, ...C.parq.filter(q => !q.sex || q.sex === ui.ob.sex).map(q => ({ v: q.id, label: q.label }))],
    },
    {
      id: 'activity', type: 'single', title: 'Jak aktywny jest Twój dzień poza treningiem?', sub: 'Potrzebne do policzenia kalorii.',
      opts: [
        { v: 'siedzaca', label: 'Głównie siedzę', hint: 'Praca przy biurku, dojazdy autem' },
        { v: 'ruch', label: 'Sporo się ruszam', hint: 'Dużo chodzenia, praca na stojąco' },
        { v: 'fizyczna', label: 'Pracuję fizycznie', hint: 'Dźwiganie, praca w ruchu przez większość dnia' },
      ],
    },
    { id: 'summary', type: 'summary' },
  ];
  const val = x => typeof x === 'function' ? x() : x;

  function startOnboarding(fromProfile) {
    const p = fromProfile ? JSON.parse(JSON.stringify(fromProfile)) : {};
    if (fromProfile) {
      p.priorities = p.priorities.length ? p.priorities : ['all'];
      p.injuries = p.injuries.length ? p.injuries : ['none'];
      p.parq = p.parq && p.parq.length ? p.parq : ['none'];
      p.location = p.location || 'silownia';
    } else {
      p.location = 'silownia';
      p.equipment = EQUIPMENT_BY_PLACE.silownia.slice();
    }
    ui.ob = p;
    ui.obStep = fromProfile ? STEPS.length - 1 : 0;
    ui.obReturn = null;
    ui.err = '';
    render();
  }

  function answerTxt(step) {
    const v = ui.ob[step.id];
    if (step.type === 'number') return v != null ? `${nf(v)} ${step.unit}` : '–';
    if (step.type === 'text') return v ? esc(v) : '–';
    const opts = val(step.opts);
    if (step.type === 'single') { const o = opts.find(o => o.v === v); return o ? esc(o.label) : '–'; }
    const sel = (v || []).map(x => opts.find(o => o.v === x)).filter(Boolean).map(o => esc(o.label));
    return sel.length ? sel.join(', ') : '–';
  }

  function renderOnboarding() {
    const step = STEPS[ui.obStep];
    const pct = Math.round((ui.obStep / (STEPS.length - 1)) * 100);
    let body = '', canNext = true, nextLabel = 'Dalej';
    const title = val(step.title), sub = val(step.sub);

    if (step.type === 'intro') {
      body = `
        <div class="hero mt2">Cześć! Ułożę Ci plan treningowy 💪</div>
        <p class="lead">Odpowiesz na kilka prostych pytań (ok. 3 minuty). Na tej podstawie dobiorę ćwiczenia, serie, powtórzenia, ciężary startowe i kalorie.</p>
        <div class="card mt2">
          <h2>Jak to będzie działać</h2>
          <ul class="list small">
            <li>Na treningu aplikacja prowadzi Cię krok po kroku: rozgrzewka, każde ćwiczenie ze zdjęciami, filmem i opisem techniki, minutnik przerw.</li>
            <li>Po każdej serii wpisujesz powtórzenia i zapas – aplikacja sama podpowiada, kiedy dołożyć ciężar.</li>
            <li>Dane zostają tylko na Twoim telefonie.</li>
          </ul>
        </div>
        <div class="note warn"><b>Zdrowie przede wszystkim.</b> Za chwilę zapytam o kilka spraw zdrowotnych. Ostry ból podczas ćwiczenia = natychmiast przerwij.</div>`;
      nextLabel = 'Zaczynamy';
    } else if (step.type === 'text') {
      body = `<div class="q-title">${title}</div><div class="q-sub">${sub}</div>
        <input class="text-input" id="ob-text" maxlength="30" autocomplete="given-name" value="${esc(ui.ob.name || '')}" placeholder="Imię">`;
      nextLabel = ui.ob.name ? 'Dalej' : 'Pomiń';
    } else if (step.type === 'number') {
      const v = ui.ob[step.id];
      body = `<div class="q-title">${title}</div>
        <div class="num-wrap"><input class="num-input" id="ob-num" type="text" inputmode="${step.int ? 'numeric' : 'decimal'}" ${step.int ? 'pattern="[0-9]*"' : ''} value="${v != null ? nf(v) : ''}" placeholder="0"><span class="num-unit">${step.unit}</span></div>
        <div class="err">${esc(ui.err)}</div>`;
    } else if (step.type === 'single' || step.type === 'multi') {
      const multi = step.type === 'multi';
      const cur = ui.ob[step.id];
      body = `<div class="q-title">${title}</div>${sub ? `<div class="q-sub">${sub}</div>` : ''}` +
        val(step.opts).map(o => {
          const on = multi ? (cur || []).includes(o.v) : cur === o.v;
          return `<button class="opt ${multi ? 'multi' : ''} ${on ? 'on' : ''}" data-a="ob-pick" data-v='${JSON.stringify(o.v)}'>
            <span class="o-main"><span class="o-label">${esc(o.label)}${o.badge ? `<span class="badge">${o.badge}</span>` : ''}</span>${o.hint ? `<span class="o-hint">${esc(o.hint)}</span>` : ''}</span>
            <span class="o-check">${on ? '✓' : ''}</span></button>`;
        }).join('') + `<div class="err">${esc(ui.err)}</div>`;
      canNext = multi ? (cur || []).length > 0 : cur != null;
    } else if (step.type === 'summary') {
      body = `<div class="q-title">Sprawdź odpowiedzi</div><div class="q-sub">Wszystko się zgadza? Możesz poprawić każdą odpowiedź.</div>
        <div class="card">` + STEPS.filter(s => !['intro', 'summary'].includes(s.type)).map(s => `
          <div class="sum-row"><span class="k">${esc(val(s.title).replace('?', ''))}</span><span class="v">${answerTxt(s)}</span>
          <button data-a="ob-edit" data-i="${STEPS.indexOf(s)}">Zmień</button></div>`).join('') + `</div>`;
      nextLabel = state ? 'Utwórz nowy plan' : 'Stwórz mój plan';
    }

    const showBack = ui.obStep > 0 || state;
    $app.innerHTML = `
      <header class="top">
        ${showBack ? `<button class="icon-btn" data-a="ob-back" aria-label="Wstecz">‹</button>` : '<span style="width:8px"></span>'}
        <div class="top-progress"><i style="width:${pct}%"></i></div>
        <span class="tiny" style="opacity:.7;min-width:34px;text-align:right">${ui.obStep}/${STEPS.length - 1}</span>
      </header>
      <main class="page no-nav">${body}</main>
      <div class="bottom-bar"><div>
        <button class="btn" data-a="ob-next" ${canNext ? '' : 'disabled'}>${nextLabel}</button>
      </div></div>`;

    const inp = document.getElementById('ob-num') || document.getElementById('ob-text');
    if (inp) {
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); obNext(); } });
      if (inp.id === 'ob-text') inp.addEventListener('input', () => {
        ui.ob.name = inp.value.trim();
        document.querySelector('[data-a="ob-next"]').textContent = ui.ob.name ? 'Dalej' : 'Pomiń';
      });
      setTimeout(() => inp.focus(), 50);
    }
  }

  function obGoTo(i) { ui.obStep = i; ui.err = ''; render(); window.scrollTo(0, 0); }

  function obNext() {
    const step = STEPS[ui.obStep];
    if (step.type === 'number') {
      const v = num(document.getElementById('ob-num').value);
      if (v == null) { ui.err = 'Wpisz liczbę.'; return render(); }
      if (v < step.min || v > step.max) { ui.err = `Podaj wartość od ${step.min} do ${step.max}.`; return render(); }
      ui.ob[step.id] = step.int ? Math.round(v) : Math.round(v * 10) / 10;
    }
    if (step.type === 'text') ui.ob.name = (document.getElementById('ob-text').value || '').trim();
    if (step.id === 'equipment' && !(ui.ob.equipment || []).length) { ui.err = 'Zaznacz przynajmniej jedną pozycję.'; return render(); }
    if (step.type === 'summary') return finishOnboarding();
    if (ui.obReturn != null) {
      // po zmianie miejsca treningu trzeba jeszcze potwierdzić sprzęt
      if (step.id === 'location') { obGoTo(STEPS.findIndex(s => s.id === 'equipment')); return; }
      const r = ui.obReturn; ui.obReturn = null; obGoTo(r); return;
    }
    obGoTo(ui.obStep + 1);
  }

  function finishOnboarding() {
    const d = ui.ob;
    const profile = {
      name: d.name || '', sex: d.sex, age: d.age, height: d.height, weight: d.weight, exp: d.exp, goal: d.goal,
      priorities: (d.priorities || []).filter(x => x !== 'all'),
      location: d.location || 'silownia', days: d.days, duration: d.duration,
      equipment: (d.equipment || []).filter(x => EQUIPMENT_BY_PLACE[d.location || 'silownia'].includes(x)),
      injuries: (d.injuries || []).filter(x => x !== 'none'),
      parq: (d.parq || []).filter(x => x !== 'none'),
      activity: d.activity, forceUL: !!d.forceUL,
    };
    const plan = E.generatePlan(profile);
    if (state) {
      state.profile = profile; state.plan = plan; state.next = 0; state.active = null;
    } else {
      state = D.migrate({ schemaVersion: D.SCHEMA, createdAt: new Date().toISOString(), profile, plan, prog: {}, log: [], next: 0, active: null });
      state.body.weights.push({ date: today(), kg: profile.weight });
    }
    save();
    ui.ob = null; ui.tab = 'plan'; ui.fresh = true;
    render(); window.scrollTo(0, 0);
  }

  // ─── Widoki główne ───
  const TABS = [
    { id: 'today', icon: '🏋️', label: 'Trening' },
    { id: 'plan', icon: '📋', label: 'Plan' },
    { id: 'progress', icon: '📈', label: 'Postępy' },
    { id: 'body', icon: '⚖️', label: 'Ciało' },
    { id: 'diet', icon: '🍽️', label: 'Dieta' },
    { id: 'profile', icon: '👤', label: 'Profil' },
  ];

  function renderMain() {
    const titles = { today: state.profile.name ? `Cześć, ${esc(state.profile.name)}!` : 'Trening', plan: 'Twój plan', progress: 'Postępy', body: 'Ciało', diet: 'Kalorie i dieta', profile: 'Profil' };
    const views = { today: viewToday, plan: viewPlan, progress: viewProgress, body: viewBody, diet: viewDiet, profile: viewProfile };
    $app.innerHTML = `
      <header class="top"><h1>${titles[ui.tab]}</h1></header>
      <main class="page">${updateBanner()}${views[ui.tab]()}</main>
      <nav class="tabs">${TABS.map(t => `<button class="${ui.tab === t.id ? 'on' : ''}" data-a="tab" data-t="${t.id}"><span class="ti">${t.icon}</span>${t.label}</button>`).join('')}</nav>`;
    if (ui.tab === 'body') loadPhotos();
  }

  function updateBanner() {
    return ui.updateReady ? `<div class="note info row"><span class="grow"><b>Dostępna nowa wersja aplikacji.</b></span><button class="btn small" data-a="update">Odśwież</button></div>` : '';
  }

  function dayPreview(d) {
    return d.items.map((it, i) => {
      const prog = state.prog[it.exId];
      const ex = EX[it.exId];
      let [lo, hi] = [it.lo, it.hi];
      if (ex.load === 'bw' && prog && prog.bonus) { hi = Math.min(ex.maxTop || hi + 10, hi + prog.bonus); lo = Math.min(hi - 2, lo + prog.bonus); }
      const ss = it.ss && d.items[i + 1] && d.items[i + 1].ss === it.ss ? '<span class="tag">superseria ↓</span>' : '';
      return `<button class="ex-row" data-a="ex-info" data-ex="${it.exId}">
        <span class="ex-num">${i + 1}</span>
        <span class="grow"><div class="ex-name">${esc(ex.name)} ${ss}</div>
        <div class="ex-meta">${it.sets} × ${repsTxt(it.exId, lo, hi)} · RIR ${rirTxt(it.rir)} · ${loadTxt(it.exId, currentW(it.exId))}</div></span>
        <span class="chev">›</span>
      </button>`;
    }).join('');
  }

  function parqWarning(compact) {
    const yes = state.profile.parq || [];
    if (!yes.length) return '';
    const labels = yes.map(id => (C.parq.find(q => q.id === id) || {}).label).filter(Boolean).map(s => s.toLowerCase());
    const htn = yes.includes('nadcisnienie') ? ' Przy nadciśnieniu nie wstrzymuj oddechu przy dużym wysiłku – wydychaj powietrze podczas pchania/ciągnięcia.' : '';
    if (compact) return `<div class="note warn small">⚠️ Zaznaczone w ankiecie zdrowia: ${esc(labels.join(', '))}. Przed intensywnym treningiem skonsultuj się z lekarzem.${htn}</div>`;
    return `<div class="note warn"><b>Ankieta zdrowia:</b> ${esc(labels.join(', '))}. Zalecamy konsultację z lekarzem przed treningiem o dużej intensywności. To nie blokada – zacznij spokojnie, z dużym zapasem powtórzeń.${htn}</div>`;
  }

  function viewToday() {
    const s = state;
    let html = '';
    if (ui.migrated) {
      html += `<div class="note ok"><b>Nowa wersja aplikacji.</b> Plan ułożyłem od nowa według zaleceń (Full Body A/B, zapas powtórzeń, przerwy). Twoje ciężary i historia zostały.
        ${s.profile.parq == null ? '<div class="mt"><button class="btn small" data-a="parq-edit">Uzupełnij ankietę zdrowia</button></div>' : ''}</div>`;
    } else if (s.profile.parq == null) {
      html += `<div class="note warn">Uzupełnij krótką ankietę zdrowia (8 pytań). <div class="mt"><button class="btn small" data-a="parq-edit">Wypełnij</button></div></div>`;
    }
    if (s.active) {
      html += `<div class="note info"><b>Masz niedokończony trening</b> (${esc(s.active.dayName)}, ${dateTxt(s.active.startedAt)}).
        <div class="btn-row mt"><button class="btn small" data-a="resume">Wróć do treningu</button><button class="btn small secondary" data-a="discard">Porzuć</button></div></div>`;
    }
    const ws = E.weekStats(s.log, planTarget());
    html += `<div class="stat-grid">
        <div class="stat"><b>${ws.current}/${ws.target}</b><span>w tym tygodniu</span></div>
        <div class="stat"><b>${ws.streak}${ws.streak ? ' 🔥' : ''}</b><span>${plural(ws.streak, 'tydzień', 'tygodnie', 'tygodni')} z rzędu</span></div>
        <div class="stat"><b>${E.strengthLog(s.log).length}</b><span>treningów</span></div>
      </div>`;

    // Deload
    if (s.deload && s.deload.active) {
      html += `<div class="note info mt"><b>Tydzień lżejszy</b> – zostało ${s.deload.left} ${plural(s.deload.left, 'trening', 'treningi', 'treningów')}. Połowa serii, ten sam ciężar, zapas 3–4 powtórzeń. To czas na regenerację, nie lenistwo.</div>`;
    } else {
      const dl = E.deloadCheck(s);
      if (dl.due && !(s.meso.snoozeUntil && Date.now() < new Date(s.meso.snoozeUntil).getTime())) {
        html += `<div class="note warn mt"><b>Czas na lżejszy tydzień?</b><ul class="list small">${dl.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
          <div class="btn-row mt"><button class="btn small" data-a="deload-start">Zacznij lżejszy tydzień</button><button class="btn small secondary" data-a="deload-snooze">Za kilka dni</button></div></div>`;
      }
    }
    html += adaptiveCard();
    html += backupReminder();
    html += parqWarning(true);

    const di = ui.pickDay != null ? ui.pickDay : s.next;
    const d = s.plan.days[di];
    html += `<div class="section-title">${ui.pickDay != null && ui.pickDay !== s.next ? 'Wybrany trening' : 'Następny trening'}</div>
      <div class="card">
        <h2>${esc(d.name)} <span class="muted small">· ${esc(d.focus)}</span></h2>
        <div class="muted small">${d.items.length} ${plural(d.items.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')} · ok. ${d.estMin} min z rozgrzewką</div>
        <div class="mt">${dayPreview(d)}</div>
        <button class="btn mt" data-a="start" data-d="${di}" ${s.active ? 'disabled' : ''}>Rozpocznij trening</button>
      </div>`;
    if (s.plan.days.length > 1) {
      html += `<div class="section-title">Chcesz zrobić inny?</div><div class="chips">` +
        s.plan.days.map((x, i) => `<button class="chip ${i === di ? 'on' : ''}" data-a="pick-day" data-d="${i}">${esc(x.name)}</button>`).join('') + `</div>`;
    }
    const cardioHint = s.plan.cardioDay ? 'Twój 4. dzień w tygodniu: 30–40 min spokojnego cardio (rower, szybki marsz, orbitrek).' : s.profile.goal === 'redukcja' ? C.cardio.redukcja : '';
    html += `<div class="section-title">Cardio</div><div class="card small">${cardioHint ? `<p>${esc(cardioHint)}</p>` : '<p class="muted">Zapisz spacer, rower albo inne cardio.</p>'}
      <button class="btn secondary small mt" data-a="cardio-add">+ Zapisz cardio</button></div>`;
    if (E.adaptationActive(s)) {
      const left = E.adaptationLeft(s);
      html += `<div class="note ok mt2"><b>Okres wdrożenia</b> – jeszcze ${left} ${plural(left, 'trening', 'treningi', 'treningów')}. Kończ serie z zapasem 3–4 powtórzeń i ucz się techniki. Ciężary mają być „za lekkie”.</div>`;
    }
    html += `<div class="note info"><b>Zasada na każdy trening:</b> technika ważniejsza od ciężaru. Jeśli ruch zaczyna wyglądać inaczej niż na filmie – ciężar jest za duży.</div>`;
    return html;
  }

  function backupReminder() {
    if (!state.log.length) return '';
    const last = state.settings.lastBackup ? new Date(state.settings.lastBackup).getTime() : 0;
    if (Date.now() - last < 7 * DAY) return '';
    return `<div class="note info mt row"><span class="grow small">💾 ${last ? 'Ostatnia kopia zapasowa ponad tydzień temu.' : 'Nie masz jeszcze kopii zapasowej.'} Dane są tylko na tym telefonie.</span><button class="btn small" data-a="export">Zrób kopię</button></div>`;
  }

  function viewPlan() {
    const s = state, p = s.profile;
    let html = '';
    if (ui.fresh) {
      html += `<div class="note ok"><b>Plan gotowy! 🎉</b> Dotknij ćwiczenia, żeby zobaczyć zdjęcia, film i opis techniki. Na treningu wejdź w zakładkę „Trening” i wciśnij „Rozpocznij trening”.</div>`;
      ui.fresh = false;
    }
    const order = s.plan.kind === 'fbw' ? 'A → B → A, a w kolejnym tygodniu B → A → B' : s.plan.days.map(d => d.name).join(' → ');
    html += `<div class="card"><h2>${esc(s.plan.name)}</h2>
      <div class="kv"><span>Cel</span><span>${esc(E.GOALS[p.goal].short)}</span></div>
      <div class="kv"><span>Treningi siłowe</span><span>${planTarget()} w tygodniu${s.plan.cardioDay ? ' + 1 cardio' : ''}</span></div>
      <div class="kv"><span>Proponowane dni</span><span>${esc(s.plan.schedule)}</span></div>
      <div class="kv"><span>Priorytet</span><span>${p.priorities.length ? p.priorities.map(x => esc(E.GROUPS[x])).join(', ') : 'całe ciało po równo'}</span></div>
      <p class="small muted mt">Treningi robisz po kolei (${order}). Nie musisz trzymać się konkretnych dni – ważne, żeby między treningami całego ciała był co najmniej 1 dzień przerwy (48 h).</p>
    </div>`;
    if (s.plan.days.some(d => d.trimmed.length)) {
      const names = [...new Set(s.plan.days.flatMap(d => d.trimmed))].map(id => EX[id].name);
      html += `<div class="note info small">Żeby zmieścić się w ${p.duration} min, pominąłem: ${esc(names.join(', '))}. Przy dłuższym treningu wrócą do planu.</div>`;
    }
    if (p.injuries.length) {
      html += `<div class="note warn"><b>Uwzględniłem dolegliwości:</b> ${p.injuries.map(i => esc(INJURIES.find(x => x.id === i).label.toLowerCase())).join(', ')}. Pominąłem ćwiczenia, które najbardziej obciążają te miejsca. Ćwicz tylko w zakresie bez bólu.</div>`;
    }
    html += parqWarning(false);
    s.plan.days.forEach(d => {
      html += `<div class="section-title">${esc(d.name)} · ${esc(d.focus)} · ok. ${d.estMin} min</div><div class="card">${dayPreview(d)}</div>`;
    });
    if (s.plan.cardioDay) html += `<div class="section-title">Dzień 4 · cardio</div><div class="card small"><p>30–40 min spokojnego cardio: rower, szybki marsz pod górkę albo orbitrek. Tempo, przy którym da się rozmawiać.</p></div>`;
    html += `<div class="section-title">Słowniczek</div><div class="card small">
      <p><b>Seria × powtórzenia</b> – „3 × 8–12” = 3 serie po 8 do 12 powtórzeń.</p>
      <p class="mt"><b>RIR (zapas)</b> – ile powtórzeń zrobiłbyś jeszcze z dobrą techniką, gdybyś musiał. „RIR 2” = kończysz serię, gdy zostały Ci 2 powtórzenia w zapasie. Nie trenujemy do upadku.</p>
      <p class="mt"><b>Jak rośnie ciężar?</b> Gdy we wszystkich seriach zrobisz górną granicę powtórzeń z zapasem, następnym razem ciężar rośnie (sztanga dół ciała +2,5–5 kg, góra +2,5 kg, hantle o jeden rozmiar, maszyny o jeden krok). Dwa razy z rzędu poniżej minimum = ciężar −10%.</p>
      <p class="mt"><b>Superseria</b> – dwa ćwiczenia na zmianę: seria pierwszego, od razu seria drugiego, potem przerwa.</p>
      <p class="mt"><b>Tydzień lżejszy (deload)</b> – co ok. ${p.exp >= 2 ? 6 : 8} tygodni albo przy oznakach zmęczenia: połowa serii przez tydzień. Regeneracja = dalsze postępy.</p>
      <p class="mt"><b>Tempo</b> – opuszczaj ciężar kontrolowanie (ok. 2–3 s), bez odbijania.</p>
    </div>`;
    return html.replace('zrobiłbyś jeszcze z dobrą techniką, gdybyś musiał', g('zrobiłbyś jeszcze z dobrą techniką, gdybyś musiał', 'zrobiłabyś jeszcze z dobrą techniką, gdybyś musiała'));
  }

  // ─── Postępy ───
  function viewProgress() {
    const s = state;
    let html = '';
    const ws = E.weekStats(s.log, planTarget());
    html += `<div class="card"><div class="row"><span class="grow"><b>W tym tygodniu: ${ws.current}/${ws.target}</b><div class="muted small">Seria tygodni z planem: ${ws.streak} ${ws.streak ? '🔥' : ''}</div></span></div>${heatmap()}</div>`;

    // Serie na partię
    const now = Date.now();
    const done = E.weeklySets(s.log, now - 7 * DAY, now);
    const planned = E.planWeeklySets(s.plan);
    const targets = E.setTargets(s.profile, s.plan);
    html += `<div class="section-title">Serie na partię – ostatnie 7 dni</div><div class="card">
      <p class="tiny muted">Pasek = serie zrobione w ostatnich 7 dniach; ocena dotyczy planu (ile serii daje średnio w tygodniu). Serie pomocnicze liczą się jako ½ (np. wyciskanie trochę dla tricepsa). Cel: ${s.profile.exp >= 2 ? '10–20' : '8–12 na start'} serii na partię tygodniowo, brzuch 4–8.</p>
      ${Object.entries(MUSCLES).filter(([m]) => targets[m] || done[m]).map(([m, name]) => setBar(name, done[m] || 0, planned[m] || 0, targets[m])).join('')}
    </div>`;

    // Wykres e1RM
    const recs = E.records(s.log);
    const withHistory = Object.keys(recs).filter(id => E.strengthLog(s.log).filter(l => l.entries.some(e => e.exId === id && E.sessionBestE1(e))).length >= 2);
    html += `<div class="section-title">Siła w czasie (szacowany 1RM)</div><div class="card">`;
    if (!withHistory.length) html += `<p class="muted small">Wykres pojawi się po co najmniej 2 treningach z tym samym ćwiczeniem.</p>`;
    else {
      const sel = withHistory.includes(ui.chartEx) ? ui.chartEx : withHistory[0];
      html += `<div class="chips scroll">${withHistory.map(id => `<button class="chip small ${id === sel ? 'on' : ''}" data-a="chart-ex" data-ex="${id}">${esc(EX[id].name)}</button>`).join('')}</div>`;
      const pts = E.strengthLog(s.log).flatMap(l => l.entries.filter(e => e.exId === sel).map(e => ({ x: new Date(l.date).getTime(), y: E.sessionBestE1(e), w: Math.max(...e.sets.map(x => +x.w || 0)) }))).filter(p => p.y);
      html += lineChart([{ name: '≈1RM', pts: pts.map(p => ({ x: p.x, y: p.y })), color: 'var(--accent)' }], v => `${nf(v)} kg`);
      const last = pts[pts.length - 1];
      const ago = pts.filter(p => p.x <= last.x - 28 * DAY).pop();
      html += `<p class="small mt">≈1RM to szacunek ze wzoru (Epley), nie wynik testu. Nie testuj prawdziwego maksymalnego ciężaru na początku przygody z siłownią.</p>`;
      if (ago && last.y > ago.y) html += `<div class="note ok small mt">💪 ≈${nf(Math.round((last.y - ago.y) * 10) / 10)} kg więcej niż 4 tygodnie temu!</div>`;
    }
    html += `</div>`;

    // Rekordy
    const recIds = Object.keys(recs).filter(id => EX[id]);
    html += `<div class="section-title">Rekordy 🏆</div><div class="card">`;
    if (!recIds.length) html += `<p class="muted small">Pojawią się po pierwszym treningu.</p>`;
    else html += recIds.map(id => {
      const r = recs[id];
      return `<div class="kv"><span>${esc(EX[id].name)}</span><span>${loadTxt(id, r.bestW)}${r.bestE1 ? `<div class="tiny muted">≈1RM ${nf(r.bestE1)} kg</div>` : ''}</span></div>`;
    }).join('');
    html += `</div>`;

    // Aktualne ciężary
    const progIds = Object.keys(s.prog).filter(id => EX[id]);
    html += `<div class="section-title">Aktualne ciężary roboczy</div><div class="card">`;
    if (!progIds.length) html += `<p class="muted small">Pojawią się po pierwszym treningu.</p>`;
    else html += progIds.map(id => {
      const p = s.prog[id], ex = EX[id];
      const val = ex.load === 'bw' ? `+${p.bonus || 0} ${ex.unit === 'time' ? 's' : 'powt.'}` : loadTxt(id, p.w);
      return `<div class="kv"><span>${esc(ex.name)}</span><span>${val}</span></div>`;
    }).join('');
    html += `</div><div class="section-title">Historia</div>`;
    if (!s.log.length) return html + `<div class="card"><p class="muted small">Tu zobaczysz zapisane treningi.</p></div>`;
    html += s.log.slice().reverse().map((l, ri) => {
      const i = s.log.length - 1 - ri;
      if (l.type === 'cardio') {
        return `<div class="card row"><span class="grow"><b>🚴 Cardio: ${esc(l.kind)}</b><div class="muted small">${dateTxt(l.date)} · ${l.min} min</div></span><button class="icon-btn small-x" data-a="log-del" data-i="${i}" aria-label="Usuń">✕</button></div>`;
      }
      const open = ui.openLog === i;
      return `<div class="card"><button class="log-day row" data-a="log-toggle" data-i="${i}">
          <span class="grow"><b>${esc(l.dayName)}${l.deload ? ' · lżejszy' : ''}</b><div class="muted small">${dateTxt(l.date)} · ${l.min} min · ${l.entries.length} ${plural(l.entries.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}${(l.prs || []).length ? ` · 🏆 ${l.prs.length}` : ''}</div></span><span class="chev">${open ? '⌄' : '›'}</span></button>
          ${open ? `<div class="mt">${l.entries.map(e => `<div class="kv"><span>${esc(EX[e.exId] ? EX[e.exId].name : e.exId)}${e.techFail ? ' ⚠️' : ''}</span><span class="log-sets">${e.sets.map(st => (EX[e.exId] && EX[e.exId].load === 'bw' ? st.reps : `${nf(st.w)}×${st.reps}`) + (st.rir != null ? `<sub>@${st.rir}</sub>` : '')).join(', ')}</span></div>`).join('')}
          ${l.readiness ? `<p class="tiny muted mt">Sen ${l.readiness.sleep ? nf(l.readiness.sleep) + ' h' : '–'}, zmęczenie ${l.readiness.fatigue || '–'}/5, zakwasy ${l.readiness.soreness || '–'}/5${l.rating ? `, ocena treningu ${l.rating}/5` : ''}</p>` : ''}
          <button class="btn ghost small mt" data-a="log-del" data-i="${i}">Usuń ten wpis</button></div>` : ''}
        </div>`;
    }).join('');
    return html;
  }

  function setBar(name, v, planned, t) {
    const max = Math.max(22, v, planned);
    const pct = x => `${Math.min(100, x / max * 100)}%`;
    let status = '', cls = '';
    if (t) {
      if (planned < t[0]) { status = '▽ plan: mało'; cls = 'warn'; }
      else if (planned > 20) { status = '△ plan: dużo'; cls = 'bad'; }
      else { status = '✓ plan OK'; cls = 'ok'; }
    }
    return `<div class="sbar"><div class="sbar-h"><span>${esc(name)}</span><span><b>${nf(Math.round(v * 10) / 10)}</b> <span class="tiny muted">/ w planie ${nf(planned)}</span> ${status ? `<span class="st ${cls}">${status}</span>` : ''}</span></div>
      <div class="sbar-track">${t ? `<i class="band" style="left:${pct(t[0])};width:calc(${pct(Math.min(20, t[1] > 12 ? t[1] : 20))} - ${pct(t[0])})"></i>` : ''}<i class="fill" style="width:${pct(v)}"></i></div></div>`;
  }

  function heatmap() {
    const weeks = 12;
    const start = E.weekStart(Date.now()) - (weeks - 1) * 7 * DAY;
    const byDay = {};
    for (const l of state.log) {
      const d = E.isoDay(l.date);
      byDay[d] = l.type === 'cardio' ? (byDay[d] || 'c') : 's';
    }
    let cells = '';
    for (let dow = 0; dow < 7; dow++) {
      for (let w = 0; w < weeks; w++) {
        const t = start + (w * 7 + dow) * DAY;
        const d = E.isoDay(t);
        const k = byDay[d];
        const future = t > Date.now();
        cells += `<i class="hm ${k === 's' ? 'hm-s' : k === 'c' ? 'hm-c' : ''} ${future ? 'hm-f' : ''}" title="${d}"></i>`;
      }
    }
    return `<div class="heat" style="grid-template-columns:repeat(${weeks},1fr)">${cells}</div>
      <div class="legend tiny muted"><span><i class="hm hm-s"></i> trening</span><span><i class="hm hm-c"></i> cardio</span><span>ostatnie 12 tygodni, wiersze: pn–nd</span></div>`;
  }

  // Prosty wykres liniowy (SVG): serie [{name, pts:[{x,y}], color, dots?, dashed?}]
  function lineChart(series, fmt) {
    const all = series.flatMap(s => s.pts);
    if (all.length < 2) return '<p class="muted small">Za mało danych do wykresu.</p>';
    const W = 340, H = 170, L = 44, R = 10, T = 12, B = 24;
    const xs = all.map(p => p.x), ys = all.map(p => p.y);
    let x0 = Math.min(...xs), x1 = Math.max(...xs);
    if (x1 === x0) x1 = x0 + DAY;
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    const pad = Math.max((y1 - y0) * 0.15, 0.5);
    y0 -= pad; y1 += pad;
    const sx = x => L + (x - x0) / (x1 - x0) * (W - L - R);
    const sy = y => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
    let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Wykres">`;
    for (let i = 0; i <= 3; i++) {
      const v = y0 + (y1 - y0) * i / 3;
      svg += `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" class="grid"/><text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end" class="axis">${esc(nf(Math.round(v * 10) / 10))}</text>`;
    }
    svg += `<text x="${L}" y="${H - 6}" class="axis">${shortDate(x0)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" class="axis">${shortDate(x1)}</text>`;
    for (const s of series) {
      const pts = s.pts.slice().sort((a, b) => a.x - b.x);
      if (!s.dotsOnly) svg += `<polyline fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${s.dashed ? 'stroke-dasharray="4 4"' : ''} points="${pts.map(p => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')}"/>`;
      if (s.dots !== false) {
        for (const p of pts) {
          svg += `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="${s.dotsOnly ? 3 : 4}" fill="${s.color}" stroke="var(--card)" stroke-width="2" ${s.dotsOnly ? 'opacity=".55"' : ''}/>`;
          svg += `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="12" fill="transparent" data-a="tip" data-tip="${esc(shortDate(p.x) + ': ' + s.name + ' ' + fmt(p.y))}"/>`;
        }
      }
    }
    svg += '</svg>';
    const legend = series.length > 1 ? `<div class="legend tiny">${series.map(s => `<span><i class="lg" style="background:${s.color}${s.dotsOnly ? ';opacity:.55' : ''}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
    return svg + legend;
  }

  // ─── Ciało ───
  function viewBody() {
    const s = state, b = s.body;
    const d = ui.bodyDate || today();
    const wToday = b.weights.find(w => w.date === d);
    const trend = E.weightTrend(b.weights);
    const rate = E.trendRate(trend, 14);
    const goal = E.goalRate(s.profile, s.nutrition);
    const st = E.stepsGoal(b.steps);
    let html = `<div class="card">
      <div class="row"><h2 class="grow">Wpis dnia</h2><input type="date" class="date-in" value="${d}" max="${today()}" data-in="body-date"></div>
      <div class="form-grid mt">
        <label>Waga (kg)<input type="text" inputmode="decimal" id="in-weight" value="${wToday ? nf(wToday.kg) : ''}" placeholder="np. 91,4"></label>
        <label>Kroki<input type="text" inputmode="numeric" pattern="[0-9]*" id="in-steps" value="${b.steps[d] != null ? b.steps[d] : ''}" placeholder="np. 8000"></label>
        <label>Kalorie (opcjonalnie)<input type="text" inputmode="numeric" pattern="[0-9]*" id="in-kcal" value="${b.kcal[d] != null ? b.kcal[d] : ''}" placeholder="np. 2100"></label>
      </div>
      <button class="btn mt" data-a="body-save">Zapisz</button>
      <p class="tiny muted mt">Waż się rano, po toalecie, przed jedzeniem. Pojedynczy pomiar skacze nawet o 1–2 kg – liczy się trend.</p>
    </div>`;

    html += `<div class="section-title">Waga i trend</div><div class="card">`;
    if (trend.length >= 2) {
      const last = trend[trend.length - 1];
      html += `<div class="row"><span class="grow"><div class="kcal-sm">${nf(last.trend)} kg</div><div class="tiny muted">trend (średnia ważona)</div></span>
        <span class="right">${rate ? `<b>${rate.kgPerWeek > 0 ? '+' : ''}${nf(rate.kgPerWeek)} kg/tydz.</b><div class="tiny muted">${E.fmtPct(rate.pctPerWeek)} masy ciała, z ${rate.days} dni</div>` : '<span class="tiny muted">tempo po 7+ dniach</span>'}</span></div>`;
      html += lineChart([
        { name: 'pomiar', pts: trend.map(p => ({ x: new Date(p.date).getTime(), y: p.kg })), color: 'var(--muted)', dotsOnly: true },
        { name: 'trend', pts: trend.map(p => ({ x: new Date(p.date).getTime(), y: p.trend })), color: 'var(--accent)', dots: false },
      ], v => `${nf(Math.round(v * 10) / 10)} kg`);
      if (rate) {
        const ok = goal < 0 ? rate.pctPerWeek <= goal + 0.25 && rate.pctPerWeek >= goal - 0.5 : goal > 0 ? rate.pctPerWeek >= goal - 0.25 && rate.pctPerWeek <= goal + 0.5 : Math.abs(rate.pctPerWeek) <= 0.25;
        html += `<div class="note ${ok ? 'ok' : 'info'} small mt">Cel: ${goal === 0 ? 'utrzymanie wagi' : `${E.fmtPct(goal)} masy ciała tygodniowo`}. ${ok ? 'Tempo zgodne z celem 👍' : 'Tempo inne niż cel – zobacz propozycję w zakładce Dieta (raz w tygodniu).'}</div>`;
        if (rate.pctPerWeek < -1.25) html += `<div class="note warn small">Tracisz ponad 1,25% masy ciała tygodniowo – to za szybko, grozi utratą mięśni. Zwiększ kalorie.</div>`;
      }
    } else html += `<p class="muted small">Wpisuj wagę codziennie (albo 3–4 razy w tygodniu), a pojawi się wykres i tempo zmian.</p>`;
    html += `</div>`;

    html += `<div class="section-title">Kroki</div><div class="card"><div class="kv"><span>Cel na ten tydzień</span><span>${st.goal.toLocaleString('pl-PL')} kroków</span></div>
      <div class="kv"><span>Średnia z 7 dni</span><span>${st.avg != null ? st.avg.toLocaleString('pl-PL') : '–'}</span></div>
      <p class="tiny muted mt">Docelowo 7–10 tys. dziennie. Gdy średnia jest niższa, podnosimy cel o 1000 co tydzień – małymi krokami.</p></div>`;

    // Obwody
    const circ = b.circ;
    const lastC = circ[circ.length - 1], prevC = circ[circ.length - 2];
    const F = [['waist', 'Talia (pępek)'], ['hips', 'Biodra'], ['chest', 'Klatka'], ['arm', 'Ramię'], ['thigh', 'Udo']];
    const days = lastC ? Math.floor((Date.now() - new Date(lastC.date).getTime()) / DAY) : null;
    html += `<div class="section-title">Obwody (cm)</div><div class="card">
      ${days != null && days > 14 ? `<div class="note info small">Ostatni pomiar ${days} dni temu – czas na nowy (co 2–4 tygodnie).</div>` : ''}
      ${lastC ? F.map(([k, l]) => lastC[k] != null ? `<div class="kv"><span>${l}</span><span>${nf(lastC[k])} cm${prevC && prevC[k] != null ? ` <span class="tiny muted">(${lastC[k] - prevC[k] > 0 ? '+' : ''}${nf(Math.round((lastC[k] - prevC[k]) * 10) / 10)})</span>` : ''}</span></div>` : '').join('') + `<p class="tiny muted">Pomiar z ${dateTxt(lastC.date)}</p>` : '<p class="muted small">Brak pomiarów.</p>'}
      <details class="mt"><summary class="link">+ Dodaj pomiar</summary>
        <div class="form-grid mt">${F.map(([k, l]) => `<label>${l}<input type="text" inputmode="decimal" id="c-${k}" placeholder="cm"></label>`).join('')}</div>
        <button class="btn secondary mt" data-a="circ-save">Zapisz pomiar</button>
        <p class="tiny muted mt">Mierz rano, taśmą przylegającą, ale nieuciskającą. Talia na wysokości pępka.</p>
      </details></div>`;

    html += `<div class="section-title">Zdjęcia sylwetki</div><div class="card" id="photos-box"><p class="muted small">Ładowanie…</p></div>`;
    return html;
  }

  let photoCache = null;
  async function loadPhotos() {
    const box = document.getElementById('photos-box');
    if (!box) return;
    try { photoCache = (await D.photos.all()) || []; } catch (e) { box.innerHTML = '<p class="muted small">Zdjęcia nie są dostępne w tej przeglądarce.</p>'; return; }
    const poses = { front: 'Przód', side: 'Bok', back: 'Tył' };
    const urls = photoCache.map(p => ({ ...p, url: URL.createObjectURL(p.blob) }));
    const byPose = pose => urls.filter(p => p.pose === pose).sort((a, b) => a.date < b.date ? -1 : 1);
    let html = `<p class="tiny muted">Zdjęcia zostają tylko na telefonie. Do kopii zapasowej trafiają wyłącznie, gdy to zaznaczysz. Rób je co 2–4 tygodnie w tym samym świetle i miejscu.</p>
      <div class="row mt"><select id="ph-pose" class="date-in">${Object.entries(poses).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <label class="btn small secondary" style="position:relative">📷 Dodaj zdjęcie<input type="file" accept="image/*" data-in="photo" style="position:absolute;inset:0;opacity:0"></label></div>`;
    for (const [k, v] of Object.entries(poses)) {
      const list = byPose(k);
      if (!list.length) continue;
      const first = list[0], last = list[list.length - 1];
      html += `<h3>${v}</h3>`;
      if (list.length >= 2) html += `<div class="cmp"><figure><img src="${first.url}" alt=""><figcaption>${shortDate(first.date)} (przed)</figcaption></figure><figure><img src="${last.url}" alt=""><figcaption>${shortDate(last.date)} (teraz)</figcaption></figure></div>`;
      html += `<div class="ph-list">${list.map(p => `<figure><img src="${p.url}" alt=""><figcaption>${shortDate(p.date)} <button data-a="photo-del" data-id="${p.id}" aria-label="Usuń">✕</button></figcaption></figure>`).join('')}</div>`;
    }
    box.innerHTML = html;
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1080;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? resolve(b) : reject(new Error('Nie udało się przetworzyć zdjęcia')), 'image/jpeg', 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Nie udało się wczytać zdjęcia')); };
      img.src = url;
    });
  }

  // ─── Dieta ───
  function adaptiveCard() {
    const sug = E.adaptiveSuggestion(state);
    if (!sug || (!sug.delta && !sug.warn.length)) return '';
    return `<div class="note ${sug.delta ? 'info' : 'warn'} mt"><b>Korekta kalorii (tryb: ${sug.mode})</b>
      <p class="small">${esc(sug.reason)}</p>${sug.warn.map(w => `<p class="small mt">⚠️ ${esc(w)}</p>`).join('')}
      ${sug.delta ? `<p class="small mt">Propozycja: <b>${sug.delta > 0 ? '+' : ''}${sug.delta} kcal</b> dziennie.</p>
      <div class="btn-row mt"><button class="btn small" data-a="adapt-ok">Zmień cel</button><button class="btn small secondary" data-a="adapt-skip">Nie teraz</button></div>`
        : `<div class="mt"><button class="btn small secondary" data-a="adapt-skip">OK</button></div>`}</div>`;
  }

  function viewDiet() {
    const p = state.profile, n = E.nutrition(p, state.nutrition);
    const caf = [Math.min(400, Math.round(p.weight * 3 / 10) * 10), Math.min(400, Math.round(p.weight * 6 / 10) * 10)];
    const lvl = { green: '🟢 mocne dowody', yellow: '🟡 uzupełnienie / umiarkowane', red: '🔴 brak dowodów' };
    const firstLog = E.strengthLog(state.log)[0];
    const weeksIn = firstLog ? (Date.now() - new Date(firstLog.date).getTime()) / (7 * DAY) : 0;
    let html = `<div class="note warn small">${esc(C.disclaimer)}</div>
      <div class="card center"><div class="muted small">Twój dzienny cel</div>
        <div class="kcal">${n.kcal.toLocaleString('pl-PL')} kcal</div>
        <div class="muted small">${p.goal === 'redukcja' ? `deficyt na ok. ${nf(-n.rate)}% masy ciała tygodniowo` : p.goal === 'zdrowie' ? 'utrzymanie wagi' : `nadwyżka na ${E.fmtPct(n.rate)} masy ciała tygodniowo`}${state.nutrition.adjust ? ` · korekta ${state.nutrition.adjust > 0 ? '+' : ''}${state.nutrition.adjust} kcal` : ''}</div>
      </div>`;
    if (p.goal === 'redukcja') {
      const r = state.nutrition.rate != null ? state.nutrition.rate : n.rate;
      html += `<div class="card"><div class="small"><b>Tempo redukcji</b> (zalecane 0,5–1% masy ciała tygodniowo; bliżej 0,5%, gdy masz mniej tłuszczu)</div>
        <div class="chips mt">${[-0.5, -0.75, -1].map(v => `<button class="chip ${r === v ? 'on' : ''}" data-a="cut-rate" data-v="${v}">${nf(-v)}%</button>`).join('')}</div></div>`;
    }
    n.warn.forEach(w => { html += `<div class="note warn small">${esc(w)}</div>`; });
    html += adaptiveCard();
    html += `<div class="card">
        <div class="kv"><span>Białko</span><span>${n.protein[0]}–${n.protein[1]} g</span></div>
        <div class="kv"><span>Tłuszcze</span><span>${n.fat[0]}–${n.fat[1]} g</span></div>
        <div class="kv"><span>Węglowodany</span><span>ok. ${n.carbs} g <span class="tiny muted">(reszta energii)</span></span></div>
        <div class="kv"><span>Błonnik</span><span>min. ${n.fiber} g</span></div>
        <div class="kv"><span>Woda (łącznie z jedzeniem)</span><span>ok. ${nf(n.water)} l + 0,5–1 l na godzinę treningu</span></div>
        ${n.protBasis ? `<p class="tiny muted mt">Białko ${esc(n.protBasis)}.</p>` : ''}
        <p class="tiny muted mt">Kolor moczu jasnosłomkowy = dobre nawodnienie.</p>
      </div>
      <details class="card small"><summary class="link">Jak to liczymy</summary>
        <div class="kv"><span>Podstawowa przemiana (BMR, Mifflin-St Jeor)</span><span>${n.bmr} kcal<div class="tiny muted">±10%: ${n.bmrRange[0]}–${n.bmrRange[1]}</div></span></div>
        <div class="kv"><span>Zapotrzebowanie (BMR × ${nf(n.pal)})</span><span>${n.tdee.toLocaleString('pl-PL')} kcal</span></div>
        <div class="kv"><span>${n.delta < 0 ? 'Deficyt' : 'Nadwyżka'}</span><span>${n.delta > 0 ? '+' : ''}${n.delta} kcal</span></div>
        <div class="kv"><span>BMI</span><span>${nf(n.bmi)}</span></div>
        <p class="mt">Wzory mają błąd ok. ±10%, dlatego co tydzień porównujemy trend wagi z celem i proponujemy korektę (maks. ±150 kcal). Jeśli wpisujesz kalorie w zakładce „Ciało” w co najmniej 12 z 14 dni, liczymy dokładniej – z bilansu jedzenia i wagi.</p>
      </details>
      <div class="section-title">Białko w praktyce</div>
      <div class="card small"><p>Rozłóż je na 3–5 posiłków, po ok. 20–40 g co 3–4 godziny. Ok. 25 g białka to np.: 120 g piersi z kurczaka, 4 jajka, 250 g skyru lub serka wiejskiego, 130 g tuńczyka, porcja odżywki (30 g). Pora posiłków ma mniejsze znaczenie – liczą się dzienne sumy.</p></div>
      <div class="section-title">Brzuch</div><div class="note info small">${esc(C.spotReduction)}</div>
      <div class="section-title">Ruch poza siłownią</div>
      <div class="card small"><p><b>Co jest najważniejsze ${p.goal === 'redukcja' ? 'przy redukcji' : ''}:</b></p><ol class="list">${C.cardio.hierarchy.map(h => `<li>${esc(h)}</li>`).join('')}</ol>
        <p class="mt">${esc(C.cardio[p.goal])}</p><ul class="list mt">${C.cardio.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
    if (p.goal === 'redukcja' && weeksIn >= 12) {
      html += `<div class="note info small"><b>Już ${Math.floor(weeksIn)} tygodni redukcji.</b> Po 12–16 tygodniach warto zrobić 1–4 tygodnie na kaloriach podtrzymujących (przerwa od diety), a gdy jesteś ${g('zadowolony', 'zadowolona')} z poziomu tłuszczu – przejść na budowę mięśni (cel „Zbudować mięśnie” w Profilu → „Zmień odpowiedzi”). Orientacyjnie: obwód talii poniżej połowy wzrostu.</div>`;
    }
    html += `<div class="section-title">Suplementy</div>` + C.supplements.map(sp => `
      <div class="card small"><div class="row"><b class="grow">${esc(sp.name)}</b><span class="tiny">${lvl[sp.level]}</span></div>
        <p class="mt"><b>Dawka:</b> ${sp.dose === 'caffeine' ? `3–6 mg/kg ok. 60 min przed treningiem = u Ciebie ${caf[0]}–${caf[1]} mg, ale maks. 400 mg na dobę ze wszystkich źródeł (kawa, napoje). Jednorazowo do 200 mg uznaje się za bezpieczne – zacznij od niższej dawki.` : esc(sp.dose)}</p>
        <p class="mt muted">${esc(sp.note)}</p>${sp.url ? `<p class="tiny mt"><a href="${sp.url}" target="_blank" rel="noopener">Źródło: ${esc(sp.src)}</a></p>` : ''}</div>`).join('');
    html += `<div class="note info small">${esc(C.sleep)}</div>`;
    return html;
  }

  // ─── Profil ───
  function viewProfile() {
    const p = state.profile;
    const rows = [
      ['Imię', p.name || '–'], ['Płeć', p.sex === 'k' ? 'Kobieta' : 'Mężczyzna'], ['Wiek', `${p.age} lat`], ['Wzrost', `${p.height} cm`], ['Waga', `${nf(p.weight)} kg`],
      ['Doświadczenie', ['zaczynam od zera', g('trochę ćwiczyłem', 'trochę ćwiczyłam'), 'regularnie'][p.exp]], ['Cel', E.GOALS[p.goal].short],
      ['Miejsce', p.location === 'dom' ? 'dom' : 'siłownia'], ['Dni / czas', `${p.days} × ${p.duration} min`],
      ['Dolegliwości', p.injuries.length ? p.injuries.map(i => INJURIES.find(x => x.id === i).label).join(', ') : 'brak'],
    ];
    const ul = canSwitchUL();
    let html = `<div class="card">${rows.map(([k, v]) => `<div class="kv"><span>${k}</span><span>${esc(v)}</span></div>`).join('')}</div>
      <button class="btn secondary" data-a="redo">Zmień odpowiedzi i ułóż plan od nowa</button>
      <p class="tiny muted mt">Przy nowym planie ciężary i historia zostają. Wagę ciała aktualizuj w zakładce „Ciało”.</p>
      <div class="section-title">Ankieta zdrowia</div>
      <div class="card small">${p.parq == null ? '<p>Nie wypełniona.</p>' : p.parq.length ? `<p>Zaznaczone: ${esc(p.parq.map(id => (C.parq.find(q => q.id === id) || {}).label).join(', '))}</p>` : '<p>Nic z listy.</p>'}
        <button class="btn small secondary mt" data-a="parq-edit">${p.parq == null ? 'Wypełnij' : 'Zmień'}</button></div>
      <div class="section-title">Plan</div><div class="card small">
        <p><b>${esc(state.plan.name)}</b></p>
        ${state.deload && state.deload.active ? `<p class="mt">Trwa tydzień lżejszy (zostało ${state.deload.left}).</p><button class="btn small secondary mt" data-a="deload-stop">Zakończ tydzień lżejszy</button>`
        : `<p class="mt muted">Tydzień lżejszy: połowa serii, ten sam ciężar, zapas 3–4 powtórzeń. Aplikacja zaproponuje go sama, możesz też włączyć ręcznie.</p><button class="btn small secondary mt" data-a="deload-start">Zacznij tydzień lżejszy</button>`}
        ${ul ? `<p class="mt">${esc(ul)}</p><button class="btn small mt" data-a="ul-on">Przejdź na Górę / dół 4×</button>` : ''}
        ${p.forceUL ? `<button class="btn small secondary mt" data-a="ul-off">Wróć do Full Body</button>` : ''}
      </div>
      <div class="section-title">Bezpieczeństwo</div>
      <div class="card small"><div class="note bad small"><b>Natychmiast przerwij trening i dzwoń 112 (albo jedź na SOR), jeśli pojawi się:</b><ul class="list">${C.redFlags.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>
        <ul class="list">${C.safetyRules.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
      <div class="section-title">Ustawienia sprzętu</div>
      <div class="card small">
        <p><b>Talerze na siłowni</b> (do kalkulatora talerzy)</p>
        <div class="chips mt">${[25, 20, 15, 10, 5, 2.5, 1.25].map(pl => `<button class="chip small ${state.settings.plates.includes(pl) ? 'on' : ''}" data-a="plate" data-v="${pl}">${nf(pl)} kg</button>`).join('')}</div>
        <p class="mt"><b>Gryf</b></p><div class="chips mt">${[20, 15].map(b => `<button class="chip small ${state.settings.bar === b ? 'on' : ''}" data-a="bar" data-v="${b}">${b} kg</button>`).join('')}</div>
        <p class="mt"><b>Najmniejszy krok na maszynach i wyciągach</b></p><div class="chips mt">${[2.5, 5].map(b => `<button class="chip small ${state.settings.machineStep === b ? 'on' : ''}" data-a="mstep" data-v="${b}">${nf(b)} kg</button>`).join('')}</div>
        <p class="mt"><b>Dźwięk końca przerwy</b></p><div class="chips mt"><button class="chip small ${state.settings.sound ? 'on' : ''}" data-a="sound" data-v="1">Włączony</button><button class="chip small ${!state.settings.sound ? 'on' : ''}" data-a="sound" data-v="0">Wyłączony</button></div>
      </div>
      <div class="section-title">Pamięć telefonu</div><div class="card small" id="storage-box"><p class="muted">Sprawdzam…</p></div>
      <div class="section-title">Kopia zapasowa</div>
      <div class="card small"><p>Wszystko jest zapisane tylko na tym telefonie. Jeśli usuniesz aplikację z ekranu początkowego, dane znikną. Ostatnia kopia: <b>${state.settings.lastBackup ? dateTxt(state.settings.lastBackup) : 'nigdy'}</b>.</p>
        <label class="check mt"><input type="checkbox" id="bk-photos"> Dołącz zdjęcia sylwetki</label>
        <div class="btn-row mt"><button class="btn small" data-a="export">Zapisz kopię</button>
        <label class="btn small secondary" style="position:relative">Wczytaj kopię<input type="file" accept=".json,application/json" data-in="import" style="position:absolute;inset:0;opacity:0"></label></div></div>
      <div class="section-title">Strefa niebezpieczna</div>
      <button class="btn danger" data-a="reset">Usuń wszystkie dane</button>
      <p class="tiny muted center mt2">Aplikacja nie zastępuje trenera ani lekarza. Zdjęcia ćwiczeń: free-exercise-db (domena publiczna). Filmy: YouTube, autorzy podani przy filmach.</p>`;
    setTimeout(storageInfo, 0);
    return html;
  }

  function canSwitchUL() {
    const p = state.profile;
    if (p.location === 'dom' || p.days < 4 || state.plan.template === 'ul4') return '';
    const logs = E.strengthLog(state.log);
    if (!logs.length) return '';
    const weeks = (Date.now() - new Date(logs[0].date).getTime()) / (7 * DAY);
    const recentResets = Object.values(state.prog).some(pr => (pr.resets || []).some(r => Date.now() - new Date(r).getTime() < 28 * DAY));
    if (weeks >= 26) return `Trenujesz już ${Math.floor(weeks)} tygodni – możesz przejść na plan Góra / dół 4× (więcej objętości).`;
    if (recentResets) return 'W ostatnich 4 tygodniach był zastój (reset ciężaru). Plan Góra / dół 4× może pomóc ruszyć dalej.';
    return '';
  }

  async function storageInfo() {
    const box = document.getElementById('storage-box');
    if (!box) return;
    let html = '';
    if (D.usingFallback()) html += '<p class="note warn small">Ta przeglądarka nie udostępnia bazy IndexedDB – dane są w pamięci zapasowej. Rób kopie częściej.</p>';
    try {
      const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
      html += `<div class="kv"><span>Trwałe przechowywanie</span><span>${persisted == null ? 'nieznane' : persisted ? '✓ tak' : 'nie (dodaj aplikację do ekranu początkowego)'}</span></div>`;
      if (navigator.storage && navigator.storage.estimate) {
        const e = await navigator.storage.estimate();
        html += `<div class="kv"><span>Zajęte</span><span>${(e.usage / 1048576).toFixed(1).replace('.', ',')} MB z ${Math.round(e.quota / 1048576).toLocaleString('pl-PL')} MB</span></div>`;
      }
    } catch (e) { html += '<p class="muted">Brak informacji.</p>'; }
    box.innerHTML = html + '<p class="tiny muted mt">Na iPhonie dane aplikacji z ekranu początkowego nie są czyszczone automatycznie, ale jedyną pewną ochroną jest regularna kopia.</p>';
  }

  // ─── Media ćwiczenia ───
  function animHtml(exId) {
    const m = typeof MEDIA !== 'undefined' && MEDIA[exId];
    if (!m) return '';
    return `<div class="anim" data-ex="${exId}">
        <img src="media/${exId}/0.webp" alt="Pozycja 1" decoding="async"><img src="media/${exId}/1.webp" alt="Pozycja 2" class="f2" decoding="async">
      </div>
      <div class="anim-ctl"><button data-a="anim" data-v="0">Pozycja 1</button><button data-a="anim" data-v="1">Pozycja 2</button><button data-a="anim" data-v="play">▶ Ruch</button><span class="tiny muted grow right">free-exercise-db</span></div>`;
  }

  function videoHtml(exId) {
    const v = (typeof VIDEOS !== 'undefined') && VIDEOS[exId];
    const name = exId === 'warmup_general' ? 'rozgrzewka przed siłownią' : EX[exId].name;
    const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' technika')}`;
    if (!v) return `<div class="note info small">Brak filmu – <a href="${search}" target="_blank" rel="noopener">wyszukaj na YouTube</a>.</div>`;
    const lang = v.lang === 'pl' ? 'po polsku' : 'po angielsku';
    const watch = id => `https://www.youtube.com/watch?v=${id}${v.start ? `&t=${v.start}s` : ''}`;
    return `<div class="video" data-yt="${v.yt}" data-start="${v.start || 0}">
        <img src="https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg" alt="" loading="lazy" onerror="this.style.display='none'">
        <button class="play" data-a="play"><i>▶</i><span>Film: jak to zrobić</span></button>
      </div>
      <div class="video-meta"><span>${esc(v.channel)} · ${lang}${v.seconds ? ` · ${Math.floor(v.seconds / 60)}:${String(v.seconds % 60).padStart(2, '0')}` : ''}</span>
        <a href="${watch(v.yt)}" target="_blank" rel="noopener">Otwórz w YouTube</a>
        ${v.backup ? `<a href="https://www.youtube.com/watch?v=${v.backup.yt}" target="_blank" rel="noopener">Inny film${v.backup.lang && v.backup.lang !== v.lang ? (v.backup.lang === 'pl' ? ' (PL)' : ' (EN)') : ''}</a>` : ''}</div>
      ${v.lang !== 'pl' ? '<div class="tiny muted">Film po angielsku – najważniejsze wskazówki masz po polsku.</div>' : ''}
      ${['PoTreningu', 'Olimp Sport Nutrition'].includes(v.channel) ? '<div class="tiny muted">Film pokazuje też błędne wykonanie (oznaczone na ekranie) – to wzór, czego NIE robić.</div>' : ''}
      <div class="tiny muted">Filmy wymagają internetu.</div>`;
  }

  function cuesHtml(exId) {
    const ex = EX[exId];
    return `<ul class="cues">${(ex.cues || []).map(c => `<li>✓ ${esc(c)}</li>`).join('')}</ul>`;
  }

  function howtoHtml(exId) {
    const ex = EX[exId];
    return `<h3>Ustawienie</h3><ol class="list small">${ex.setup.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      <h3>Wykonanie</h3><ol class="list small">${ex.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      <p class="small muted">Tempo: opuszczaj kontrolowanie, ok. 2–3 s, bez odbijania.</p>
      <h3>Najczęstsze błędy</h3><ul class="list small bad-list">${ex.mistakes.map(x => `<li>✗ ${esc(x)}</li>`).join('')}</ul>
      ${ex.pat === 'core' ? `<p class="tiny muted mt">${esc(C.spotReduction)}</p>` : ''}`;
  }

  function openModal(title, html) {
    $modal.innerHTML = `<div class="modal-bg" data-a="modal-bg"><div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-a="close" aria-label="Zamknij">✕</button></div>${html}</div></div>`;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() { $modal.innerHTML = ''; document.body.style.overflow = ''; }

  function showExercise(exId) {
    const ex = EX[exId];
    const w = state ? currentW(exId) : null;
    const lad = [ex.easier && `Łatwiej: ${EX[ex.easier].name}`, ex.harder && `Trudniej: ${EX[ex.harder].name}`].filter(Boolean);
    openModal(esc(ex.name), `${animHtml(exId)}${cuesHtml(exId)}
      <div class="small muted mt"><b>Pracują:</b> ${esc(ex.muscles)}</div>
      ${state && ex.load !== 'bw' ? `<div class="note info mt small">Twój ${state.prog[exId] ? 'aktualny' : 'startowy'} ciężar: <b>${loadTxt(exId, w)}</b></div>` : ''}
      ${ex.note ? `<div class="note warn small">${esc(ex.note)}</div>` : ''}
      ${lad.length ? `<p class="small muted">${esc(lad.join(' · '))}</p>` : ''}
      <div class="mt">${videoHtml(exId)}</div>
      ${howtoHtml(exId)}`);
  }

  // ─── Trening krok po kroku ───
  const WARMUP = [
    ['3–5 minut lekkiego cardio', 'Rowerek, orbitrek albo szybki marsz na bieżni. Tempo, przy którym możesz swobodnie rozmawiać.'],
    ['Krążenia ramion', '10× do przodu i 10× do tyłu, spokojnie, coraz szerzej.'],
    ['Wymachy nóg', 'Trzymając się czegoś: 10× przód-tył i 10× na boki każdą nogą.'],
    ['Przysiady bez obciążenia', '10 powtórzeń, powoli, tak nisko, jak wygodnie.'],
    ['Skłony z wypchnięciem bioder', 'Dłonie na biodrach, wypychasz biodra w tył z prostymi plecami. 10 powtórzeń.'],
  ];

  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
      if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { /* niedostępne – bez znaczenia */ }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state && state.active && !ui.leftWorkout && !ui.ob) { keepAwake(true); tickTimer(); }
  });

  function startWorkout(di) {
    state.active = E.createSession(state, di);
    ui.pickDay = null;
    save(); keepAwake(true); render(); window.scrollTo(0, 0);
  }

  // Grupa na ekranie: jedno ćwiczenie albo para superserii
  function groupAt(a, idx) {
    const e = a.entries[idx];
    if (e && e.ss) {
      const prev = a.entries[idx - 1], next = a.entries[idx + 1];
      if (next && next.ss === e.ss) return [idx, idx + 1];
      if (prev && prev.ss === e.ss) return [idx - 1, idx];
    }
    return [idx];
  }

  function renderWorkout() {
    const a = state.active;
    const n = a.entries.length;
    let head = '', body = '', bar = '';
    const grp = a.stage === 'ex' ? groupAt(a, a.idx) : [];
    const dots = `<div class="dots">${a.entries.map((e, i) => `<i class="${grp.includes(i) ? 'cur' : e.sets.some(s => s.done) ? 'done' : ''}"></i>`).join('')}</div>`;

    if (a.stage === 'ready') {
      head = 'Jak się dziś czujesz?';
      const r = a.readiness || {};
      const chipRow = (key, opts) => `<div class="chips mt">${opts.map(([v, l]) => `<button class="chip ${r[key] === v ? 'on' : ''}" data-a="ready" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
      body = `<div class="hero">Szybkie pytania przed treningiem</div><p class="muted small">Pomagają wyłapać zmęczenie i zaplanować lżejszy tydzień. Możesz pominąć.</p>
        <div class="card mt"><b>Sen ostatniej nocy</b>${chipRow('sleep', [[5, '< 6 h'], [6.5, '6–7 h'], [7.5, '7–8 h'], [8.5, '8+ h']])}
        <p class="mt"><b>Zmęczenie</b> <span class="tiny muted">(1 = wypoczęty, 5 = wykończony)</span></p>${chipRow('fatigue', [1, 2, 3, 4, 5].map(x => [x, x]))}
        <p class="mt"><b>Zakwasy</b> <span class="tiny muted">(1 = brak, 5 = mocne)</span></p>${chipRow('soreness', [1, 2, 3, 4, 5].map(x => [x, x]))}</div>
        ${(r.fatigue >= 4 || (r.sleep != null && r.sleep < 6)) ? '<div class="note info small">Gorszy dzień – i tak warto potrenować. Dziś kończ serie z większym zapasem (3–4 powtórzenia) i nie goń rekordów.</div>' : ''}
        ${a.deload ? '<div class="note info small">Tydzień lżejszy: połowa serii, ten sam ciężar, zapas 3–4 powtórzeń.</div>' : ''}`;
      bar = `<div class="btn-row"><button class="btn secondary" data-a="ready-skip" style="flex:0 0 34%">Pomiń</button><button class="btn" data-a="w-next">Dalej</button></div>`;
    } else if (a.stage === 'warmup') {
      head = 'Rozgrzewka';
      body = `<div class="hero">Najpierw rozgrzewka 🔥</div>
        <p class="muted">5–10 minut. Rozgrzane mięśnie i stawy = mniejsze ryzyko kontuzji i lepszy trening. Serie rozgrzewkowe pierwszego ćwiczenia wyliczę automatycznie.</p>
        <div class="card mt">${WARMUP.map(([t, d], i) => {
          const on = a.warmChecks.includes(i);
          return `<button class="check-row ${on ? 'on' : ''}" data-a="warm-check" data-i="${i}"><span class="check-box">${on ? '✓' : ''}</span><span class="grow"><b>${t}</b><div class="small muted">${d}</div></span></button>`;
        }).join('')}</div>
        ${(state.profile.parq || []).includes('nadcisnienie') ? '<div class="note warn small">Nadciśnienie: nie wstrzymuj oddechu przy wysiłku – wydychaj powietrze podczas pchania/ciągnięcia.</div>' : ''}
        <div class="section-title">Film: rozgrzewka krok po kroku</div>${videoHtml('warmup_general')}
        ${a.adapt ? `<div class="note ok mt">Okres wdrożenia: kończ serie z zapasem 3–4 powtórzeń. Skup się na technice.</div>` : ''}`;
      bar = `<button class="btn" data-a="w-next">${g('Rozgrzany', 'Rozgrzana')} – zaczynamy ćwiczenia</button>`;
    } else if (a.stage === 'ex') {
      head = `${esc(a.dayName)} · ${grp[0] + 1}${grp.length > 1 ? '–' + (grp[1] + 1) : ''}/${n}`;
      body = dots;
      if (grp.length > 1) body += `<div class="note info small"><b>Superseria:</b> seria pierwszego ćwiczenia → od razu seria drugiego → przerwa ${restTxt(a.entries[grp[1]].rest)}. Powtórz.</div>`;
      body += grp.map(ei => exerciseBlock(ei, grp.length > 1)).join('<hr class="sep">');
      const lastIdx = grp[grp.length - 1];
      bar = `<div class="btn-row"><button class="btn secondary" data-a="w-prev" style="flex:0 0 30%">‹ Wstecz</button>
        <button class="btn" data-a="w-next">${lastIdx === n - 1 ? 'Zakończ trening' : 'Następne ›'}</button></div>`;
    } else if (a.stage === 'finish') {
      head = 'Podsumowanie';
      const results = a.entries.map(e => ({ e, r: E.evaluate(e, state.prog[e.exId], { deload: a.deload, settings: state.settings }) }));
      const doneEntries = cleanEntries(a);
      const prs = E.detectPRs(doneEntries, state.log);
      const vol = doneEntries.reduce((s, e) => s + E.volumeOf(e), 0);
      const min = Math.max(1, Math.round((Date.now() - new Date(a.startedAt)) / 60000));
      body = `<div class="hero">${doneEntries.length ? 'Dobra robota! 💪' : 'Nic nie zapisano'}</div>`;
      if (doneEntries.length) {
        body += `<div class="stat-grid"><div class="stat"><b>${min}</b><span>min</span></div><div class="stat"><b>${Math.round(vol).toLocaleString('pl-PL')}</b><span>kg objętości</span></div><div class="stat"><b>${prs.length}</b><span>${plural(prs.length, 'rekord', 'rekordy', 'rekordów')}</span></div></div>`;
        if (prs.length) body += `<div class="note ok mt"><b>🏆 Nowe rekordy</b><ul class="list small">${prs.map(p => `<li>${esc(EX[p.exId].name)}: ${esc(p.text)}</li>`).join('')}</ul></div>`;
        body += `<div class="section-title">Na następny raz</div><div class="card">${results.map(({ e, r }) => `<div class="kv" style="display:block"><b class="small">${r.change > 0 ? '⬆️ ' : r.change < 0 ? '⬇️ ' : ''}${esc(EX[e.exId].name)}</b>
          <div class="small muted">${r.msg ? esc(r.msg) : 'Pominięte – bez zmian.'}</div></div>`).join('')}</div>
          <div class="card"><b>Jak oceniasz trening?</b> <span class="tiny muted">(1 = słabo, 5 = świetnie)</span><div class="chips mt">${[1, 2, 3, 4, 5].map(x => `<button class="chip ${a.rating === x ? 'on' : ''}" data-a="rating" data-v="${x}">${x}</button>`).join('')}</div></div>`;
      } else {
        body += `<p class="muted">${g('Nie odhaczyłeś', 'Nie odhaczyłaś')} żadnej serii. Możesz wrócić do ćwiczeń albo porzucić trening.</p>`;
      }
      bar = doneEntries.length ? `<button class="btn" data-a="w-save">Zapisz trening</button><button class="btn ghost" data-a="w-back-ex">Wróć do ćwiczeń</button>`
        : `<button class="btn" data-a="w-back-ex">Wróć do ćwiczeń</button><button class="btn ghost" data-a="discard">Porzuć trening</button>`;
    }

    $app.innerHTML = `
      <header class="top"><button class="icon-btn" data-a="w-exit" aria-label="Wyjdź">✕</button><h1>${head}</h1></header>
      <main class="page no-nav">${body}</main>
      <div id="timer" class="timer hidden"></div>
      <div class="bottom-bar"><div>${bar}</div></div>`;
    tickTimer();
  }

  function exerciseBlock(ei, inPair) {
    const a = state.active;
    const e = a.entries[ei];
    const ex = EX[e.exId];
    const seen = a.entries.some((x, i) => i < ei && x.exId === e.exId) || state.log.some(l => (l.entries || []).some(x => x.exId === e.exId));
    const last = e.last ? `Ostatnio (${shortDate(e.last.date)}): ${e.last.sets.map(s => (ex.load === 'bw' ? '' : nf(s.w) + '×') + s.reps + (s.rir != null ? ` @${s.rir}` : '')).join(', ')}` : '';
    return `<div class="ex-title">${inPair ? `<span class="tag">${ei === groupAt(a, ei)[0] ? '1' : '2'}</span> ` : ''}${esc(ex.name)}</div>
      <div class="small muted"><b>Pracują:</b> ${esc(ex.muscles)}</div>
      <div class="target t4">
        <div><b>${e.sets.length}</b><span>serie</span></div>
        <div><b>${e.lo}–${e.hi}</b><span>${ex.unit === 'time' ? 'sekund' : 'powt.'}${ex.perSide ? '/str.' : ''}</span></div>
        <div><b>${rirTxt(e.rir)}</b><span>zapas (RIR)</span></div>
        <div><b>${restTxt(e.rest)}</b><span>przerwa</span></div>
      </div>
      ${last ? `<p class="tiny muted">${esc(last)}</p>` : ''}
      ${animHtml(e.exId)}${cuesHtml(e.exId)}
      <div class="card" id="sets-${ei}">${setsHtml(ei)}</div>
      ${!seen || a.adapt ? `<p class="small muted">RIR = ile powtórzeń ${g('zrobiłbyś', 'zrobiłabyś')} jeszcze z dobrą techniką, ${g('gdybyś musiał', 'gdybyś musiała')}. Początkujący zwykle zaniżają ten zapas – bądź ${g('szczery', 'szczera')}.</p>` : ''}
      <div class="tool-row">
        <button class="btn secondary small" data-a="swap" data-e="${ei}">⇄ Zamień</button>
        <button class="btn secondary small" data-a="pain" data-e="${ei}">🩹 Ból</button>
        <button class="btn secondary small ${e.techFail ? 'warn-on' : ''}" data-a="techfail" data-e="${ei}">${e.techFail ? '⚠️ Technika się sypała' : 'Technika się sypała?'}</button>
      </div>
      ${ex.note ? `<div class="note warn small mt">${esc(ex.note)}</div>` : ''}
      <details class="howto card" ${seen ? '' : 'open'}><summary>Film i instrukcja krok po kroku</summary>${videoHtml(e.exId)}${howtoHtml(e.exId)}</details>
      <details class="card small"><summary class="link">📝 Notatka${e.note ? ' ✓' : ''}</summary><textarea class="note-in" data-in="note" data-e="${ei}" rows="2" placeholder="Np. ustawienie siedziska 4, chwyt szerzej…">${esc(e.note || '')}</textarea></details>`;
  }

  function setsHtml(ei) {
    const a = state.active;
    const e = a.entries[ei];
    const ex = EX[e.exId];
    const bw = ex.load === 'bw';
    const firstOpen = e.sets.findIndex(s => !s.done);
    let html = '';
    if (e.warm.length) {
      html += `<div class="sub-h">Serie rozgrzewkowe (lekko, nie liczą się)</div>` +
        e.warm.map((s, j) => `<div class="set-row warm"><span class="set-label">${j + 1}.</span>
          <span class="warm-txt">${loadTxt(e.exId, s.w)} × ${s.reps}</span>
          <button class="set-ok ${s.done ? 'done' : ''}" data-a="warm-ok" data-e="${ei}" data-j="${j}" aria-label="Zrobione">✓</button></div>`).join('') +
        `<div class="sub-h" style="margin-top:12px">Serie właściwe</div>`;
    }
    if (e.calib && !e.rated) {
      html += `<div class="note info small" style="margin:8px 0">Pierwszy raz robisz to ćwiczenie – ciężar to <b>propozycja</b>. Po 1. serii zapytam, jak było, i dopasuję go.</div>`;
    }
    const repHead = (ex.unit === 'time' ? 'Sekundy' : 'Powtórzenia') + (ex.perSide ? ' / str.' : '');
    const wHead = ex.load === 'assist' ? 'Pomoc (kg)' : ex.load === 'db' && !ex.single ? 'Hantla (kg)' : 'Ciężar (kg)';
    html += `<div class="set-head"><span class="set-label"></span>${bw ? '' : `<span class="set-in">${wHead}</span><span class="set-x" style="visibility:hidden">×</span>`}<span class="set-in">${repHead}</span><span style="width:48px;flex:none"></span></div>`;
    html += e.sets.map((s, j) => {
      const active = j === firstOpen;
      const wIn = bw ? '' : `<span class="set-in"><input type="text" inputmode="decimal" value="${nf(s.w)}" data-in="w" data-e="${ei}" data-j="${j}" aria-label="${wHead}"></span><span class="set-x">×</span>`;
      const ph = s.sug != null ? s.sug : (active ? '?' : '');
      const rirSel = s.rir != null ? s.rir : null;
      const rirSug = rirSel == null && !s.done ? e.rir[0] : null;
      return `<div class="set-block ${active ? 'active' : ''}"><div class="set-row"><span class="set-label">Seria ${j + 1}</span>
        ${wIn}<span class="set-in"><input type="text" inputmode="numeric" pattern="[0-9]*" value="${s.reps}" placeholder="${ph}" data-in="r" data-e="${ei}" data-j="${j}" aria-label="${repHead}"></span>
        <button class="set-ok ${s.done ? 'done' : ''}" data-a="set-ok" data-e="${ei}" data-j="${j}" aria-label="Zrobione">✓</button></div>
        <div class="rir-row"><span class="tiny muted">Zapas:</span>${[0, 1, 2, 3, 4].map(v => `<button class="rir ${rirSel === v ? 'on' : ''} ${rirSug === v ? 'sug' : ''}" data-a="rir" data-e="${ei}" data-j="${j}" data-v="${v}">${v === 4 ? '4+' : v}</button>`).join('')}</div></div>`;
    }).join('');
    // kalkulator talerzy dla bieżącej serii
    if (ex.load === 'bb' && e.exId !== 'ez_curl') {
      const s = e.sets[firstOpen >= 0 ? firstOpen : e.sets.length - 1];
      const pl = E.platesPerSide(+s.w, state.settings.bar, state.settings.plates);
      html += `<p class="plates">🏋️ ${nf(s.w)} kg = gryf ${state.settings.bar} kg + na każdą stronę: <b>${pl.plates.length ? pl.plates.map(nf).join(' + ') : 'nic'}</b>${pl.ok ? '' : ` <span class="warn-t">(brakuje ${nf(pl.rest)} kg na stronę – weź najbliższy możliwy ciężar)</span>`}</p>`;
    }
    if (e.calib && !e.rated && e.sets[0].done) {
      html += `<div class="rate"><div class="small" style="font-weight:700">Jak było w 1. serii?</div>
        <button data-a="rate" data-e="${ei}" data-v="light">😌 Za lekko<small>${g('Zrobiłbym', 'Zrobiłabym')} spokojnie 5+ powtórzeń więcej</small></button>
        <button data-a="rate" data-e="${ei}" data-v="ok">👍 W sam raz<small>Zostały mi 1–3 powtórzenia zapasu, technika dobra</small></button>
        <button data-a="rate" data-e="${ei}" data-v="heavy">😣 Za ciężko<small>${g('Nie zrobiłem', 'Nie zrobiłam')} minimum albo technika się psuła</small></button></div>`;
    }
    if (e.sets.every(s => s.done)) html += `<div class="note ok small" style="margin:10px 0 0">Ćwiczenie zrobione ✓</div>`;
    return html;
  }

  function refreshSets(ei) {
    const el = document.getElementById(`sets-${ei}`);
    if (el) el.innerHTML = setsHtml(ei);
    const a = state.active;
    const dots = document.querySelector('.dots');
    if (dots) {
      const grp = groupAt(a, a.idx);
      dots.innerHTML = a.entries.map((e, i) => `<i class="${grp.includes(i) ? 'cur' : e.sets.some(s => s.done) ? 'done' : ''}"></i>`).join('');
    }
  }

  // ─── Minutnik przerwy (liczony od znacznika czasu – działa po zablokowaniu ekranu) ───
  let actx = null, tickI = null;
  function unlockAudio() {
    try {
      if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
      if (actx && actx.state === 'suspended') actx.resume();
    } catch (e) { /* bez dźwięku */ }
  }
  function beep() {
    if (!state.settings.sound || !actx) return;
    try {
      const t0 = actx.currentTime;
      [0, 0.25, 0.5].forEach(dt => {
        const o = actx.createOscillator(), gn = actx.createGain();
        o.frequency.value = 880; o.connect(gn); gn.connect(actx.destination);
        gn.gain.setValueAtTime(0.0001, t0 + dt); gn.gain.exponentialRampToValueAtTime(0.4, t0 + dt + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.18);
        o.start(t0 + dt); o.stop(t0 + dt + 0.2);
      });
    } catch (e) { /* bez dźwięku */ }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  function startTimer(sec) {
    state.active.timer = { end: Date.now() + sec * 1000, total: sec, fired: false };
    save(); tickTimer();
  }
  function tickTimer() {
    const el = document.getElementById('timer');
    const a = state && state.active;
    if (!el || !a || a.stage !== 'ex' || !a.timer) { if (el) el.classList.add('hidden'); clearInterval(tickI); tickI = null; return; }
    const left = Math.round((a.timer.end - Date.now()) / 1000);
    el.classList.remove('hidden');
    if (left <= 0) {
      if (!a.timer.fired) { a.timer.fired = true; save(); beep(); }
      el.className = 'timer done';
      el.innerHTML = `<span class="grow"><b>Przerwa minęła</b> – czas na kolejną serię 💪</span><button data-a="t-skip">OK</button>`;
      if (left < -90) { a.timer = null; save(); el.classList.add('hidden'); }
    } else {
      const m = Math.floor(left / 60), s = left % 60;
      const pct = Math.max(0, Math.min(100, (1 - left / a.timer.total) * 100));
      el.className = 'timer';
      el.innerHTML = `<i class="tbar" style="width:${pct}%"></i><span class="grow"><span class="tiny">Przerwa</span> <b class="tnum">${m}:${String(s).padStart(2, '0')}</b></span>
        <button data-a="t-add" data-v="-15">−15 s</button><button data-a="t-add" data-v="15">+15 s</button><button data-a="t-skip">Pomiń</button>`;
    }
    if (!tickI) tickI = setInterval(tickTimer, 250);
  }

  function setOk(ei, j) {
    const a = state.active, e = a.entries[ei], s = e.sets[j];
    unlockAudio();
    if (s.done) { s.done = false; save(); return refreshSets(ei); }
    const ex = EX[e.exId];
    if ((s.reps === '' || num(s.reps) == null) && s.sug != null) s.reps = s.sug;
    if (s.reps === '' || num(s.reps) == null) {
      const inp = document.querySelector(`[data-in="r"][data-e="${ei}"][data-j="${j}"]`);
      if (inp) { inp.classList.add('missing'); inp.focus(); }
      return toast(ex.unit === 'time' ? 'Wpisz, ile sekund ' + g('wytrzymałeś', 'wytrzymałaś') : 'Wpisz, ile powtórzeń ' + g('zrobiłeś', 'zrobiłaś'));
    }
    if (ex.load !== 'bw' && num(s.w) == null) return toast('Wpisz ciężar');
    if (s.rir == null) s.rir = e.rir[0];
    s.done = true;
    for (let k = j + 1; k < e.sets.length; k++) if (!e.sets[k].done) e.sets[k].w = s.w;
    // superseria: po serii pierwszego ćwiczenia od razu drugie, przerwa dopiero po parze
    const grp = groupAt(a, ei);
    const partner = grp.length > 1 && grp[0] === ei ? a.entries[grp[1]] : null;
    if (partner && partner.sets.some(x => !x.done)) { a.timer = null; toast(`Od razu seria: ${EX[partner.exId].name}`); }
    else if (e.sets.some(x => !x.done) || (grp.length > 1 && a.entries[grp[0]].sets.some(x => !x.done))) startTimer(e.rest);
    else if (a.idx + grp.length < a.entries.length) startTimer(e.rest);
    save(); refreshSets(ei); tickTimer();
  }

  function rate(ei, v) {
    const e = state.active.entries[ei];
    const nw = E.calibrate(e.exId, e.sets[0].w, v);
    e.rated = v;
    e.sets.forEach((s, k) => { if (k > 0 && !s.done) { s.w = nw; s.sug = null; } });
    save(); refreshSets(ei);
    toast(v === 'ok' ? 'Super – zostajemy przy tym ciężarze.' : `Kolejne serie: ${loadTxt(e.exId, nw)}${v === 'heavy' ? ' – lżej, ale z dobrą techniką' : ''}`);
  }

  function cleanEntries(a) {
    return a.entries.map(e => ({
      exId: e.exId,
      sets: e.sets.filter(s => s.done).map(s => ({ type: 'work', w: num(s.w) || 0, reps: +s.reps, rir: s.rir })),
      warm: e.warm.filter(s => s.done).map(s => ({ type: 'warmup', w: s.w, reps: s.reps })),
      techFail: !!e.techFail, note: e.note || '', pain: e.pain || [],
    })).filter(e => e.sets.length);
  }

  function saveWorkout() {
    const a = state.active;
    const entries = cleanEntries(a);
    const prs = E.detectPRs(entries, state.log);
    a.entries.forEach(e => {
      const r = E.evaluate(e, state.prog[e.exId], { deload: a.deload, settings: state.settings });
      if (r.prog) state.prog[e.exId] = r.prog;
    });
    const end = new Date();
    const min = Math.max(1, Math.min(240, Math.round((end - new Date(a.startedAt)) / 60000)));
    state.log.push({ type: 'strength', id: a.id, date: end.toISOString(), startedAt: a.startedAt, endedAt: end.toISOString(), dayKey: a.dayKey, dayName: a.dayName, min, deload: a.deload, readiness: a.readiness, rating: a.rating, entries, prs });
    state.next = (a.dayIndex + 1) % state.plan.days.length;
    if (a.deload && state.deload && state.deload.active) {
      state.deload.left -= 1;
      if (state.deload.left <= 0) { state.deload = null; state.meso.lastDeloadEnd = end.toISOString(); toast('Koniec tygodnia lżejszego – wracamy do pełnego planu!'); }
    }
    state.active = null;
    ui.migrated = false;
    save(); keepAwake(false);
    ui.tab = 'today';
    render(); window.scrollTo(0, 0);
    toast(prs.length ? `Trening zapisany! 🏆 ${prs.length} ${plural(prs.length, 'rekord', 'rekordy', 'rekordów')}` : 'Trening zapisany! Odpocznij 💪');
  }

  function openSwap(ei) {
    const a = state.active, e = a.entries[ei];
    const items = state.plan.days[a.dayIndex].items;
    const planItem = items.find(it => it.slot === e.slot);
    const inDay = new Set(a.entries.map(x => x.exId));
    const alts = (planItem ? planItem.alts : []).filter(id => !inDay.has(id) && E.exAllowed(id, state.profile));
    ui.swap = { ei, slot: e.slot };
    openModal('Zamień ćwiczenie', `<p class="small muted">Maszyna zajęta, brak sprzętu albo coś boli? Wybierz zamiennik, który pracuje podobnie.</p>
      ${alts.length ? `<div class="card mt">${alts.map(id => `<button class="ex-row" data-a="swap-pick" data-ex="${id}"><span class="grow"><div class="ex-name">${esc(EX[id].name)}</div><div class="ex-meta">${esc(EX[id].muscles)}</div></span><span class="chev">›</span></button>`).join('')}</div>`
        : '<div class="note warn mt">Brak zamienników przy Twoim sprzęcie i dolegliwościach. Możesz pominąć to ćwiczenie – po prostu przejdź dalej.</div>'}
      <div id="swap-confirm"></div>`);
  }

  function swapPick(newId) {
    const box = document.getElementById('swap-confirm');
    box.innerHTML = `<div class="card"><b>${esc(EX[newId].name)}</b>
      <div class="btn-row mt"><button class="btn small secondary" data-a="swap-do" data-ex="${newId}" data-perm="0">Tylko dziś</button>
      <button class="btn small" data-a="swap-do" data-ex="${newId}" data-perm="1">Na stałe w planie</button></div>
      <button class="btn ghost small mt" data-a="ex-info" data-ex="${newId}">Zobacz zdjęcia, film i opis</button></div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function swapDo(newId, perm) {
    const a = state.active;
    const { ei, slot } = ui.swap;
    const e = a.entries[ei];
    const items = state.plan.days[a.dayIndex].items;
    const k = items.findIndex(it => it.slot === slot);
    const base = k >= 0 ? items[k] : { slot, role: e.role, sets: e.sets.length, lo: e.lo, hi: e.hi, rir: e.rir, rest: e.rest, ss: e.ss, alts: [] };
    const ni = E.swapItem(base, newId, state.profile);
    if (perm && k >= 0) items[k] = ni;
    const tmp = E.createSession({ ...state, plan: { ...state.plan, days: [{ key: a.dayKey, name: a.dayName, items: [ni] }] } }, 0);
    const ne = tmp.entries[0];
    const kind = e.warm.length >= 2 ? 'first' : e.role === 'main' ? 'main' : 'none';
    ne.warm = E.warmupSets(newId, ne.sets[0].w, kind).map(s => ({ ...s, done: false }));
    ne.sets = ne.sets.slice(0, e.sets.length);
    while (ne.sets.length < e.sets.length) ne.sets.push({ ...ne.sets[0], reps: '', rir: null, done: false });
    if (a.deload || a.adapt) ne.rir = e.rir;
    a.entries[ei] = ne;
    save(); closeModal(); render(); window.scrollTo(0, 0);
    toast(perm ? 'Zamienione na stałe w planie.' : 'Zamienione na dziś.');
  }

  function openPain(ei) {
    ui.pain = { ei, area: null, kind: null, score: 3, worse: false };
    renderPain();
  }
  function renderPain(result) {
    const p = ui.pain;
    const chips = (key, opts) => `<div class="chips mt">${opts.map(([v, l]) => `<button class="chip small ${p[key] === v ? 'on' : ''}" data-a="pain-set" data-k="${key}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
    openModal('Ból podczas ćwiczenia', `
      <div class="note bad small"><b>Natychmiast przerwij trening i dzwoń 112 (lub jedź na SOR), jeśli masz:</b><ul class="list">${C.redFlags.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>
      <div class="card"><b>Gdzie boli?</b>${chips('area', C.painAreas.map(x => [x, x]))}
        <p class="mt"><b>Jak boli?</b></p>${chips('kind', C.painKinds.map(k => [k.id, k.label]))}
        <p class="mt"><b>Jak mocno?</b> <span id="pain-v">${p.score}</span>/10</p>
        <input type="range" min="0" max="10" step="1" value="${p.score}" data-in="pain-score" class="range">
        <label class="check mt"><input type="checkbox" data-in="pain-worse" ${p.worse ? 'checked' : ''}> Narasta, utrzymuje się ponad 48 h, jest obrzęk albo ograniczenie ruchu</label>
        <button class="btn mt" data-a="pain-eval" ${p.kind ? '' : 'disabled'}>Co mam zrobić?</button>
      </div>${result || ''}`);
  }

  // ─── Główny render ───
  function render() {
    if (!state || ui.ob) {
      if (!ui.ob) startOnboarding(null);
      else renderOnboarding();
      return;
    }
    if (state.active && !ui.leftWorkout) return renderWorkout();
    clearInterval(tickI); tickI = null;
    renderMain();
  }

  function replan() {
    state.plan = E.generatePlan(state.profile);
    state.next = 0;
  }

  // ─── Akcje ───
  const actions = {
    'ob-pick'(el) {
      const step = STEPS[ui.obStep];
      const v = JSON.parse(el.dataset.v);
      ui.err = '';
      if (step.type === 'single') {
        if (step.id === 'location' && ui.ob.location !== v) ui.ob.equipment = EQUIPMENT_BY_PLACE[v].slice();
        ui.ob[step.id] = v;
        render();
        setTimeout(() => obNext(), 180);
        return;
      }
      const opts = val(step.opts);
      const opt = opts.find(o => o.v === v);
      let cur = ui.ob[step.id] || [];
      if (cur.includes(v)) cur = cur.filter(x => x !== v);
      else if (opt.exclusive) cur = [v];
      else cur = [...cur.filter(x => !opts.find(o => o.v === x && o.exclusive)), v];
      ui.ob[step.id] = cur;
      render();
    },
    'ob-next'() { obNext(); },
    'ob-back'() {
      if (ui.obStep === 0 || (state && ui.obStep === STEPS.length - 1 && ui.obReturn == null)) { ui.ob = null; return render(); }
      if (ui.obReturn != null) { const r = ui.obReturn; ui.obReturn = null; return obGoTo(r); }
      obGoTo(ui.obStep - 1);
    },
    'ob-edit'(el) { ui.obReturn = STEPS.length - 1; obGoTo(+el.dataset.i); },
    tab(el) { ui.tab = el.dataset.t; ui.pickDay = null; render(); window.scrollTo(0, 0); },
    'ex-info'(el) { showExercise(el.dataset.ex); },
    'pick-day'(el) { ui.pickDay = +el.dataset.d; render(); },
    start(el) { startWorkout(+el.dataset.d); },
    resume() { ui.leftWorkout = false; keepAwake(true); render(); window.scrollTo(0, 0); },
    discard() {
      if (!confirm('Porzucić ten trening? Wpisane serie nie zostaną zapisane.')) return;
      state.active = null; ui.leftWorkout = false; save(); keepAwake(false); ui.tab = 'today'; closeModal(); render();
    },
    'w-exit'() {
      openModal('Wyjść z treningu?', `<p class="small muted">Wpisane serie są zapamiętane – możesz wrócić w każdej chwili z zakładki „Trening”.</p>
        <button class="btn mt" data-a="w-leave">Wyjdź, wrócę później</button>
        <button class="btn secondary mt" data-a="w-finish">Zakończ i zapisz teraz</button>
        <button class="btn danger mt" data-a="discard">Porzuć trening</button>`);
    },
    'w-leave'() { closeModal(); ui.leftWorkout = true; ui.tab = 'today'; keepAwake(false); render(); window.scrollTo(0, 0); },
    'w-finish'() { closeModal(); state.active.stage = 'finish'; state.active.timer = null; save(); render(); window.scrollTo(0, 0); },
    ready(el) {
      const a = state.active;
      a.readiness = a.readiness || {};
      a.readiness[el.dataset.k] = +el.dataset.v;
      save(); render();
    },
    'ready-skip'() { state.active.readiness = null; state.active.stage = 'warmup'; save(); render(); window.scrollTo(0, 0); },
    'warm-check'(el) {
      const i = +el.dataset.i, w = state.active.warmChecks;
      state.active.warmChecks = w.includes(i) ? w.filter(x => x !== i) : [...w, i];
      save(); render();
    },
    'w-next'() {
      const a = state.active;
      unlockAudio();
      if (a.stage === 'ready') a.stage = 'warmup';
      else if (a.stage === 'warmup') { a.stage = 'ex'; a.idx = 0; }
      else if (a.stage === 'ex') {
        const grp = groupAt(a, a.idx);
        const nextIdx = grp[grp.length - 1] + 1;
        if (nextIdx < a.entries.length) a.idx = nextIdx; else { a.stage = 'finish'; a.timer = null; }
      }
      save(); render(); window.scrollTo(0, 0);
    },
    'w-prev'() {
      const a = state.active;
      const grp = groupAt(a, a.idx);
      if (grp[0] > 0) a.idx = groupAt(a, grp[0] - 1)[0]; else a.stage = 'warmup';
      save(); render(); window.scrollTo(0, 0);
    },
    'w-back-ex'() { const a = state.active; a.stage = 'ex'; a.idx = groupAt(a, a.entries.length - 1)[0]; save(); render(); window.scrollTo(0, 0); },
    'w-save'() { saveWorkout(); },
    rating(el) { state.active.rating = +el.dataset.v; save(); render(); },
    'set-ok'(el) { setOk(+el.dataset.e, +el.dataset.j); },
    'warm-ok'(el) { const s = state.active.entries[+el.dataset.e].warm[+el.dataset.j]; s.done = !s.done; save(); refreshSets(+el.dataset.e); },
    rir(el) { const s = state.active.entries[+el.dataset.e].sets[+el.dataset.j]; s.rir = +el.dataset.v; save(); refreshSets(+el.dataset.e); },
    rate(el) { rate(+el.dataset.e, el.dataset.v); },
    techfail(el) {
      const e = state.active.entries[+el.dataset.e];
      e.techFail = !e.techFail; save();
      el.classList.toggle('warn-on', e.techFail);
      el.textContent = e.techFail ? '⚠️ Technika się sypała' : 'Technika się sypała?';
      if (e.techFail) toast('Zapamiętane – nie podniosę ciężaru. Rozważ lżejszy ciężar w kolejnych seriach.');
    },
    't-add'(el) { const t = state.active.timer; if (t) { t.end += +el.dataset.v * 1000; t.total = Math.max(t.total, Math.round((t.end - Date.now()) / 1000)); t.fired = false; save(); tickTimer(); } },
    't-skip'() { state.active.timer = null; save(); tickTimer(); },
    swap(el) { openSwap(+el.dataset.e); },
    'swap-pick'(el) { swapPick(el.dataset.ex); },
    'swap-do'(el) { swapDo(el.dataset.ex, el.dataset.perm === '1'); },
    pain(el) { openPain(+el.dataset.e); },
    'pain-set'(el) { ui.pain[el.dataset.k] = el.dataset.v; renderPain(); },
    'pain-eval'() {
      const p = ui.pain;
      const adv = C.painAdvice(p.kind, p.score, p.worse);
      const e = state.active.entries[p.ei];
      const rec = { date: new Date().toISOString(), exId: e.exId, area: p.area, kind: p.kind, score: p.score, worse: p.worse, level: adv.level };
      e.pain = [...(e.pain || []), rec];
      state.pain.push(rec);
      save();
      renderPain(`<div class="note ${adv.level === 'bad' ? 'bad' : adv.level === 'warn' ? 'warn' : 'ok'}"><b>${esc(adv.title)}</b><p class="small">${esc(adv.text)}</p>
        ${adv.level !== 'ok' ? `<button class="btn small mt" data-a="swap" data-e="${p.ei}">⇄ Zamień ćwiczenie</button>` : ''}</div>`);
    },
    anim(el) {
      const box = el.parentElement.previousElementSibling;
      box.classList.remove('p0', 'p1');
      if (el.dataset.v !== 'play') box.classList.add('p' + el.dataset.v);
    },
    play(el) {
      const box = el.closest('.video');
      const id = box.dataset.yt, start = +box.dataset.start || 0;
      box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&autoplay=1${start ? `&start=${start}` : ''}" title="Film instruktażowy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    },
    tip(el) { toast(el.dataset.tip); },
    close() { closeModal(); },
    'modal-bg'(el, ev) { if (ev.target === el) closeModal(); },
    'log-toggle'(el) { const i = +el.dataset.i; ui.openLog = ui.openLog === i ? null : i; render(); },
    'log-del'(el) {
      if (!confirm('Usunąć ten wpis z historii? (Aktualne ciężary się nie zmienią.)')) return;
      state.log.splice(+el.dataset.i, 1); ui.openLog = null; save(); render();
    },
    'chart-ex'(el) { ui.chartEx = el.dataset.ex; render(); },
    redo() { startOnboarding(state.profile); },
    'parq-edit'() {
      const cur = state.profile.parq || [];
      ui.parq = cur.slice();
      renderParq();
    },
    'parq-pick'(el) {
      const v = el.dataset.v;
      if (v === 'none') ui.parq = [];
      else ui.parq = ui.parq.includes(v) ? ui.parq.filter(x => x !== v) : [...ui.parq, v];
      renderParq(true);
    },
    'parq-save'() { state.profile.parq = ui.parq.slice(); save(); closeModal(); render(); toast('Ankieta zapisana.'); },
    'deload-start'() {
      state.deload = { active: true, left: planTarget(), started: new Date().toISOString() };
      save(); render(); toast('Tydzień lżejszy włączony.');
    },
    'deload-stop'() { state.deload = null; state.meso.lastDeloadEnd = new Date().toISOString(); save(); render(); },
    'deload-snooze'() { state.meso.snoozeUntil = new Date(Date.now() + 3 * DAY).toISOString(); save(); render(); },
    'ul-on'() {
      if (!confirm('Przejść na plan Góra / dół 4×? Ciężary i historia zostają.')) return;
      state.profile.forceUL = true; replan(); save(); ui.tab = 'plan'; render(); window.scrollTo(0, 0);
    },
    'ul-off'() { state.profile.forceUL = false; replan(); save(); ui.tab = 'plan'; render(); window.scrollTo(0, 0); },
    'adapt-ok'() {
      const sug = E.adaptiveSuggestion(state);
      if (sug) {
        state.nutrition.adjust = (state.nutrition.adjust || 0) + sug.delta;
        if (sug.tdeeEst) state.nutrition.tdeeEst = sug.tdeeEst;
      }
      state.nutrition.lastCheck = new Date().toISOString();
      save(); render(); toast('Cel kalorii zaktualizowany.');
    },
    'adapt-skip'() { state.nutrition.lastCheck = new Date().toISOString(); save(); render(); },
    'cut-rate'(el) { state.nutrition.rate = +el.dataset.v; save(); render(); },
    'body-save'() {
      const d = ui.bodyDate || today();
      const w = num(document.getElementById('in-weight').value);
      const st = num(document.getElementById('in-steps').value);
      const kc = num(document.getElementById('in-kcal').value);
      const b = state.body;
      if (w != null) {
        if (w < 35 || w > 250) return toast('Podaj wagę od 35 do 250 kg.');
        b.weights = b.weights.filter(x => x.date !== d);
        b.weights.push({ date: d, kg: Math.round(w * 10) / 10 });
        b.weights.sort((x, y) => x.date < y.date ? -1 : 1);
        const lastW = b.weights[b.weights.length - 1];
        if (lastW.date === d) state.profile.weight = lastW.kg;
      }
      if (st != null) { if (st < 0 || st > 100000) return toast('Podaj liczbę kroków.'); b.steps[d] = Math.round(st); } else delete b.steps[d];
      if (kc != null) { if (kc < 300 || kc > 10000) return toast('Podaj kalorie od 300 do 10 000.'); b.kcal[d] = Math.round(kc); } else delete b.kcal[d];
      save(); render(); toast('Zapisane.');
    },
    'circ-save'() {
      const rec = { date: today() };
      let any = false;
      for (const k of ['waist', 'hips', 'chest', 'arm', 'thigh']) {
        const v = num(document.getElementById('c-' + k).value);
        if (v != null) { if (v < 10 || v > 250) return toast('Podaj obwody w centymetrach.'); rec[k] = Math.round(v * 10) / 10; any = true; }
      }
      if (!any) return toast('Wpisz przynajmniej jeden obwód.');
      state.body.circ = state.body.circ.filter(c => c.date !== rec.date);
      state.body.circ.push(rec);
      save(); render(); toast('Pomiar zapisany.');
    },
    async 'photo-del'(el) {
      if (!confirm('Usunąć to zdjęcie?')) return;
      await D.photos.del(+el.dataset.id); loadPhotos();
    },
    'cardio-add'() {
      openModal('Zapisz cardio', `<div class="card"><b>Rodzaj</b><div class="chips mt" id="cd-kind">${['Szybki marsz', 'Rower', 'Orbitrek', 'Bieżnia', 'Pływanie', 'Inne'].map((k, i) => `<button class="chip small ${i === 0 ? 'on' : ''}" data-a="cd-kind">${k}</button>`).join('')}</div>
        <p class="mt"><b>Czas (min)</b></p><input type="text" inputmode="numeric" pattern="[0-9]*" id="cd-min" class="text-input mt" value="30">
        <button class="btn mt" data-a="cd-save">Zapisz</button></div>`);
    },
    'cd-kind'(el) { el.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('on')); el.classList.add('on'); },
    'cd-save'() {
      const min = num(document.getElementById('cd-min').value);
      if (min == null || min < 1 || min > 600) return toast('Podaj czas w minutach.');
      const kind = (document.querySelector('#cd-kind .chip.on') || {}).textContent || 'Cardio';
      state.log.push({ type: 'cardio', date: new Date().toISOString(), min: Math.round(min), kind, entries: [] });
      save(); closeModal(); render(); toast('Cardio zapisane.');
    },
    plate(el) {
      const v = +el.dataset.v, p = state.settings.plates;
      state.settings.plates = p.includes(v) ? p.filter(x => x !== v) : [...p, v].sort((a, b) => b - a);
      save(); render();
    },
    bar(el) { state.settings.bar = +el.dataset.v; save(); render(); },
    mstep(el) { state.settings.machineStep = +el.dataset.v; save(); render(); },
    sound(el) { state.settings.sound = el.dataset.v === '1'; save(); render(); },
    async export() {
      const withPhotos = !!(document.getElementById('bk-photos') || {}).checked;
      let photos = null;
      if (withPhotos) {
        const all = await D.photos.all();
        photos = await Promise.all(all.map(p => new Promise(res => { const r = new FileReader(); r.onload = () => res({ date: p.date, pose: p.pose, data: r.result }); r.readAsDataURL(p.blob); })));
      }
      await flush();
      const json = D.makeBackup(state, photos);
      const name = `trening-backup-${today()}.json`;
      const done = () => { state.settings.lastBackup = new Date().toISOString(); save(); render(); };
      try {
        const file = new File([json], name, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Kopia – Mój Trening' }); done(); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = name; document.body.appendChild(a); a.click(); a.remove();
      done();
    },
    async 'imp-do'(el) {
      const imp = ui.imp;
      if (!imp) return;
      if (el.dataset.mode === 'merge') state = D.mergeStates(state, imp.state);
      else state = imp.state;
      if (imp.photos && imp.photos.length) {
        if (el.dataset.mode !== 'merge') await D.photos.clear();
        for (const p of imp.photos) { const blob = await (await fetch(p.data)).blob(); await D.photos.add({ date: p.date, pose: p.pose, blob }); }
      }
      if (state.needsReplan) { replan(); delete state.needsReplan; }
      ui.imp = null; await flush(); closeModal(); render(); toast('Kopia wczytana.');
    },
    async reset() {
      if (!confirm('Na pewno usunąć wszystkie dane (plan, historię, ciężary, pomiary i zdjęcia)? Tego nie da się cofnąć.')) return;
      await D.clearAll();
      state = null; ui.ob = null; keepAwake(false); render();
    },
    update() {
      if (swReg && swReg.waiting) { ui.reloadOnSw = true; swReg.waiting.postMessage('skipWaiting'); } else location.reload();
    },
  };

  function renderParq(keepOpen) {
    const qs = C.parq.filter(q => !q.sex || q.sex === state.profile.sex);
    openModal('Ankieta zdrowia', `<p class="small muted">Czy dotyczy Cię coś z tej listy? Każde „tak” to zalecenie konsultacji z lekarzem przed intensywnym treningiem – nie blokada.</p>
      <div class="mt">${qs.map(q => `<button class="opt multi ${ui.parq.includes(q.id) ? 'on' : ''}" data-a="parq-pick" data-v="${q.id}"><span class="o-main"><span class="o-label">${esc(q.label)}</span></span><span class="o-check">${ui.parq.includes(q.id) ? '✓' : ''}</span></button>`).join('')}
      <button class="opt multi ${!ui.parq.length ? 'on' : ''}" data-a="parq-pick" data-v="none"><span class="o-main"><span class="o-label">Nic z powyższych</span></span><span class="o-check">${!ui.parq.length ? '✓' : ''}</span></button></div>
      <button class="btn mt" data-a="parq-save">Zapisz</button>`);
  }

  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-a]');
    if (!el) return;
    const fn = actions[el.dataset.a];
    if (fn) fn(el, ev);
  });

  document.addEventListener('input', ev => {
    const el = ev.target;
    if (!el.dataset) return;
    const k = el.dataset.in;
    if (k === 'pain-score') { ui.pain.score = +el.value; const v = document.getElementById('pain-v'); if (v) v.textContent = el.value; return; }
    if (k === 'pain-worse') { ui.pain.worse = el.checked; return; }
    if (!state || !state.active) return;
    if (k === 'note') { state.active.entries[+el.dataset.e].note = el.value.slice(0, 500); save(); return; }
    if (k !== 'w' && k !== 'r') return;
    const e = state.active.entries[+el.dataset.e];
    const s = e.sets[+el.dataset.j];
    if (k === 'w') {
      const v = num(el.value);
      if (v != null) s.w = v;
    } else {
      const v = el.value.replace(/[^0-9]/g, '');
      if (v !== el.value) el.value = v;
      s.reps = v === '' ? '' : +v;
      el.classList.remove('missing');
    }
    save();
  });

  document.addEventListener('change', async ev => {
    const el = ev.target;
    if (el.dataset.in === 'pain-worse') { ui.pain.worse = el.checked; return; }
    if (el.dataset.in === 'body-date') { ui.bodyDate = el.value || today(); render(); return; }
    if (el.dataset.in === 'w' && state && state.active) { refreshSets(+el.dataset.e); return; }
    if (el.dataset.in === 'photo' && el.files && el.files[0]) {
      try {
        const blob = await resizeImage(el.files[0]);
        const pose = (document.getElementById('ph-pose') || {}).value || 'front';
        await D.photos.add({ date: today(), pose, blob });
        toast('Zdjęcie zapisane na telefonie.');
        loadPhotos();
      } catch (e) { toast(e.message || 'Nie udało się zapisać zdjęcia.'); }
      el.value = '';
      return;
    }
    if (el.dataset.in !== 'import' || !el.files || !el.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = D.parseBackup(reader.result);
      if (!res.ok) { toast(res.error); return; }
      ui.imp = res;
      const s = D.summary(res.state), cur = D.summary(state);
      openModal('Wczytać kopię?', `
        ${res.checksumOk === false ? '<div class="note warn small">Suma kontrolna się nie zgadza – plik mógł zostać zmieniony lub uszkodzony. Wczytuj tylko, jeśli wiesz, skąd pochodzi.</div>' : ''}
        <div class="card small"><div class="kv"><span></span><span>kopia / teraz</span></div>
          <div class="kv"><span>Treningi</span><span>${s.workouts} / ${cur.workouts}</span></div>
          <div class="kv"><span>Cardio</span><span>${s.cardio} / ${cur.cardio}</span></div>
          <div class="kv"><span>Pomiary wagi</span><span>${s.weights} / ${cur.weights}</span></div>
          <div class="kv"><span>Obwody</span><span>${s.circ} / ${cur.circ}</span></div>
          <div class="kv"><span>Zdjęcia w kopii</span><span>${res.photos ? res.photos.length : 0}</span></div>
          ${res.exportedAt ? `<p class="tiny muted mt">Kopia z ${dateTxt(res.exportedAt)}</p>` : ''}</div>
        <button class="btn mt" data-a="imp-do" data-mode="merge">Scal (dodaj brakujące wpisy)</button>
        <button class="btn danger mt" data-a="imp-do" data-mode="replace">Nadpisz wszystko kopią</button>
        <p class="tiny muted mt">„Scal” zostawia Twój obecny profil, plan i ciężary, a dokłada z kopii brakujące treningi i pomiary.</p>`);
    };
    reader.readAsText(el.files[0]);
    el.value = '';
  });

  // ─── Start ───
  let swReg = null;
  async function boot() {
    $app.innerHTML = '<main class="page"><p class="muted center mt2">Ładowanie…</p></main>';
    try { state = await D.loadState(); } catch (e) { state = null; }
    if (state && state.needsReplan) {
      replan(); delete state.needsReplan; ui.migrated = true; await flush();
    }
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    render();
    if (state && state.active) keepAwake(true);

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (ui.reloadOnSw) { ui.reloadOnSw = false; location.reload(); } });
      try {
        swReg = await navigator.serviceWorker.register('sw.js');
        const ready = () => { if (swReg.waiting && navigator.serviceWorker.controller) { ui.updateReady = true; if (!state || !state.active || ui.leftWorkout) render(); } };
        ready();
        swReg.addEventListener('updatefound', () => {
          const w = swReg.installing;
          if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') ready(); });
        });
      } catch (e) { /* bez trybu offline */ }
    }
  }
  boot();
})();
