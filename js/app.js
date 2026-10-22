// Interfejs aplikacji. Stan trzymany w localStorage na telefonie.
(() => {
  const E = Engine;
  const EX = EXERCISES;
  const KEY = 'trening.v1';
  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal');
  const $toast = document.getElementById('toast');

  // ─── Stan ───
  let state = load();
  const ui = { tab: 'today', ob: null, obStep: 0, obReturn: null, err: '', openLog: null, pickDay: null };

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.profile && s.plan) return s;
    } catch (e) { /* brak lub uszkodzone dane */ }
    return null;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('Nie udało się zapisać danych na telefonie.'); }
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ─── Pomocnicze ───
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
  const kg = w => E.fmtKg(w);
  const nf = w => String(Math.round(w * 100) / 100).replace('.', ',');
  const sexOf = () => (state && state.profile ? state.profile.sex : (ui.ob && ui.ob.sex)) || 'm';
  const g = (m, f) => (sexOf() === 'k' ? f : m);
  const restTxt = s => s === 90 ? '1,5 min' : s === 150 ? '2,5 min' : s % 60 === 0 ? `${s / 60} min` : `${s} s`;
  const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? few : many;
  const dateTxt = iso => new Date(iso).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' });

  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.remove('hidden');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => $toast.classList.add('hidden'), 3200);
  }

  function unitOf(exId) { return EX[exId].unit === 'time' ? 's' : 'powt.'; }
  function repsTxt(exId, lo, hi) {
    const ex = EX[exId];
    return `${lo}–${hi} ${ex.unit === 'time' ? 's' : 'powt.'}${ex.perSide ? ' na stronę' : ''}`;
  }
  function loadTxt(exId, w) {
    const ex = EX[exId];
    if (ex.load === 'bw') return 'masa ciała';
    if (ex.load === 'assist') return `pomoc ${kg(w)}`;
    if (ex.load === 'db') return ex.single ? `hantla ${kg(w)}` : `hantle po ${kg(w)}`;
    return kg(w);
  }
  function currentW(exId) {
    const p = state.prog[exId];
    return p && p.w != null ? p.w : E.startWeight(exId, state.profile);
  }

  // ─── Wywiad ───
  const GOAL_OPTS = [
    { v: 'masa', label: 'Zbudować mięśnie', hint: 'Większe i mocniejsze mięśnie, lepsza sylwetka' },
    { v: 'redukcja', label: 'Schudnąć / spalić tłuszcz', hint: 'Mniej tkanki tłuszczowej przy zachowaniu mięśni' },
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
        { v: 0, label: g('Zaczynam od zera', 'Zaczynam od zera'), hint: g('Nigdy nie ćwiczyłem albo było to bardzo dawno', 'Nigdy nie ćwiczyłam albo było to bardzo dawno') },
        { v: 1, label: 'Trochę już ćwiczyłem'.replace('ćwiczyłem', g('ćwiczyłem', 'ćwiczyłam')), hint: 'Krócej niż pół roku albo z długimi przerwami' },
        { v: 2, label: 'Ćwiczę regularnie', hint: 'Od pół roku lub dłużej, znam podstawowe ćwiczenia' },
      ],
    },
    { id: 'goal', type: 'single', title: 'Co chcesz osiągnąć?', sub: 'Wybierz główny cel – plan i kalorie zostaną pod niego ustawione.', opts: GOAL_OPTS },
    {
      id: 'priorities', type: 'multi', title: 'Na których partiach ciała najbardziej Ci zależy?',
      sub: 'Plan zawsze obejmuje całe ciało – to zdrowsze i daje lepsze proporcje. Zaznaczone partie dostaną więcej pracy.',
      opts: [{ v: 'all', label: 'Całe ciało po równo', exclusive: true }, ...Object.entries(E.GROUPS).map(([v, label]) => ({ v, label }))],
    },
    {
      id: 'days', type: 'single', title: 'Ile dni w tygodniu możesz trenować?', sub: 'Między treningami tych samych mięśni potrzebny jest dzień odpoczynku.',
      opts: [
        { v: 2, label: '2 dni', hint: 'Minimum, które daje dobre efekty' },
        { v: 3, label: '3 dni', hint: 'Najlepszy wybór na start', badge: 'zalecane' },
        { v: 4, label: '4 dni', hint: 'Gdy masz więcej czasu i chęci' },
      ],
    },
    {
      id: 'duration', type: 'single', title: 'Ile czasu masz na jeden trening?', sub: 'Łącznie z rozgrzewką.',
      opts: [
        { v: 45, label: 'ok. 45 minut' },
        { v: 60, label: 'ok. 60 minut', badge: 'zalecane' },
        { v: 75, label: 'ok. 75 minut' },
      ],
    },
    {
      id: 'equipment', type: 'multi', title: 'Co jest na Twojej siłowni?', sub: 'Typowa siłownia ma wszystko – odznacz tylko to, czego na pewno nie ma.',
      opts: EQUIPMENT.map(e => ({ v: e.id, label: e.label, hint: e.hint })),
    },
    {
      id: 'injuries', type: 'multi', title: 'Czy coś Cię boli lub masz kontuzję?', sub: 'Pominę ćwiczenia, które obciążają te miejsca.',
      opts: [{ v: 'none', label: 'Nic mi nie dolega', exclusive: true }, ...INJURIES.map(i => ({ v: i.id, label: i.label }))],
    },
    {
      id: 'activity', type: 'single', title: 'Jak aktywny jest Twój dzień poza siłownią?', sub: 'Potrzebne do policzenia kalorii.',
      opts: [
        { v: 'siedzaca', label: 'Głównie siedzę', hint: 'Praca przy biurku, dojazdy autem' },
        { v: 'ruch', label: 'Sporo się ruszam', hint: 'Dużo chodzenia, praca na stojąco' },
        { v: 'fizyczna', label: 'Pracuję fizycznie', hint: 'Dźwiganie, praca w ruchu przez większość dnia' },
      ],
    },
    { id: 'summary', type: 'summary' },
  ];

  function startOnboarding(fromProfile) {
    const p = fromProfile ? JSON.parse(JSON.stringify(fromProfile)) : {};
    if (fromProfile) {
      p.priorities = p.priorities.length ? p.priorities : ['all'];
      p.injuries = p.injuries.length ? p.injuries : ['none'];
    } else {
      p.equipment = EQUIPMENT.map(e => e.id);
    }
    ui.ob = p;
    ui.obStep = fromProfile ? STEPS.length - 1 : 0;
    ui.obReturn = null;
    ui.err = '';
    render();
  }

  function optsOf(step) { return typeof step.opts === 'function' ? step.opts() : step.opts; }

  function answerTxt(step) {
    const v = ui.ob[step.id];
    if (step.type === 'number') return v != null ? `${nf(v)} ${step.unit}` : '–';
    if (step.type === 'text') return v ? esc(v) : '–';
    const opts = optsOf(step);
    if (step.type === 'single') { const o = opts.find(o => o.v === v); return o ? esc(o.label) : '–'; }
    const sel = (v || []).map(x => opts.find(o => o.v === x)).filter(Boolean).map(o => esc(o.label));
    return sel.length ? sel.join(', ') : '–';
  }

  function renderOnboarding() {
    const step = STEPS[ui.obStep];
    const pct = Math.round((ui.obStep / (STEPS.length - 1)) * 100);
    let body = '', canNext = true, nextLabel = 'Dalej';

    if (step.type === 'intro') {
      body = `
        <div class="hero mt2">Cześć! Ułożę Ci plan treningowy 💪</div>
        <p class="lead">Odpowiesz na kilka prostych pytań (ok. 2 minuty). Na tej podstawie dobiorę ćwiczenia, liczbę serii i powtórzeń, ciężary startowe i kalorie.</p>
        <div class="card mt2">
          <h2>Jak to będzie działać</h2>
          <ul class="list small">
            <li>Na siłowni aplikacja prowadzi Cię krok po kroku: rozgrzewka, każde ćwiczenie z filmem i opisem techniki.</li>
            <li>Po każdej serii wpisujesz, ile powtórzeń udało się zrobić – aplikacja sama podpowiada, kiedy dołożyć ciężar.</li>
            <li>Dane zostają tylko na Twoim telefonie.</li>
          </ul>
        </div>
        <div class="note warn"><b>Zdrowie przede wszystkim.</b> Jeśli masz choroby serca, nadciśnienie, cukrzycę, poważne kontuzje lub inne problemy zdrowotne – przed rozpoczęciem treningów skonsultuj się z lekarzem. Ostry ból podczas ćwiczenia = natychmiast przerwij.</div>`;
      nextLabel = 'Zaczynamy';
    } else if (step.type === 'text') {
      body = `<div class="q-title">${step.title}</div><div class="q-sub">${step.sub}</div>
        <input class="text-input" id="ob-text" maxlength="30" autocomplete="given-name" value="${esc(ui.ob.name || '')}" placeholder="Imię">`;
      nextLabel = ui.ob.name ? 'Dalej' : 'Pomiń';
    } else if (step.type === 'number') {
      const v = ui.ob[step.id];
      body = `<div class="q-title">${step.title}</div>
        <div class="num-wrap"><input class="num-input" id="ob-num" type="text" inputmode="${step.int ? 'numeric' : 'decimal'}" ${step.int ? 'pattern="[0-9]*"' : ''} value="${v != null ? nf(v) : ''}" placeholder="0"><span class="num-unit">${step.unit}</span></div>
        <div class="err">${esc(ui.err)}</div>`;
    } else if (step.type === 'single' || step.type === 'multi') {
      const multi = step.type === 'multi';
      const cur = ui.ob[step.id];
      body = `<div class="q-title">${step.title}</div>${step.sub ? `<div class="q-sub">${step.sub}</div>` : ''}` +
        optsOf(step).map(o => {
          const on = multi ? (cur || []).includes(o.v) : cur === o.v;
          return `<button class="opt ${multi ? 'multi' : ''} ${on ? 'on' : ''}" data-a="ob-pick" data-v='${JSON.stringify(o.v)}'>
            <span class="o-main"><span class="o-label">${esc(o.label)}${o.badge ? `<span class="badge">${o.badge}</span>` : ''}</span>${o.hint ? `<span class="o-hint">${esc(o.hint)}</span>` : ''}</span>
            <span class="o-check">${on ? '✓' : ''}</span></button>`;
        }).join('') + `<div class="err">${esc(ui.err)}</div>`;
      canNext = multi ? (cur || []).length > 0 : cur != null;
    } else if (step.type === 'summary') {
      body = `<div class="q-title">Sprawdź odpowiedzi</div><div class="q-sub">Wszystko się zgadza? Możesz poprawić każdą odpowiedź.</div>
        <div class="card">` + STEPS.filter(s => !['intro', 'summary'].includes(s.type)).map(s => `
          <div class="sum-row"><span class="k">${esc(s.title.replace('?', ''))}</span><span class="v">${answerTxt(s)}</span>
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

  function obGo(i) {
    if (ui.obReturn != null && i !== STEPS.length - 1 && STEPS[ui.obStep].type !== 'summary') {
      i = ui.obReturn; ui.obReturn = null;
    }
    ui.obStep = i; ui.err = ''; render(); window.scrollTo(0, 0);
  }

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
    if (ui.obReturn != null) { const r = ui.obReturn; ui.obReturn = null; ui.obStep = r; ui.err = ''; render(); window.scrollTo(0, 0); return; }
    obGo(ui.obStep + 1);
  }

  function finishOnboarding() {
    const d = ui.ob;
    const profile = {
      name: d.name || '', sex: d.sex, age: d.age, height: d.height, weight: d.weight, exp: d.exp, goal: d.goal,
      priorities: (d.priorities || []).filter(x => x !== 'all'),
      days: d.days, duration: d.duration, equipment: d.equipment,
      injuries: (d.injuries || []).filter(x => x !== 'none'), activity: d.activity,
    };
    const plan = E.generatePlan(profile);
    if (state) {
      state.profile = profile; state.plan = plan; state.next = 0; state.active = null;
    } else {
      state = { version: 1, createdAt: new Date().toISOString(), profile, plan, prog: {}, log: [], next: 0, active: null };
    }
    save();
    ui.ob = null; ui.tab = 'plan'; ui.fresh = true;
    render(); window.scrollTo(0, 0);
  }

  // ─── Widoki główne ───
  const TABS = [
    { id: 'today', icon: '🏋️', label: 'Trening' },
    { id: 'plan', icon: '📋', label: 'Plan' },
    { id: 'history', icon: '📈', label: 'Postępy' },
    { id: 'diet', icon: '🍽️', label: 'Dieta' },
    { id: 'profile', icon: '👤', label: 'Profil' },
  ];

  function renderMain() {
    const titles = { today: state.profile.name ? `Cześć, ${esc(state.profile.name)}!` : 'Trening', plan: 'Twój plan', history: 'Postępy', diet: 'Kalorie i białko', profile: 'Profil' };
    const views = { today: viewToday, plan: viewPlan, history: viewHistory, diet: viewDiet, profile: viewProfile };
    $app.innerHTML = `
      <header class="top"><h1>${titles[ui.tab]}</h1></header>
      <main class="page">${views[ui.tab]()}</main>
      <nav class="tabs">${TABS.map(t => `<button class="${ui.tab === t.id ? 'on' : ''}" data-a="tab" data-t="${t.id}"><span class="ti">${t.icon}</span>${t.label}</button>`).join('')}</nav>`;
  }

  function dayPreview(d) {
    return d.items.map((it, i) => `
      <button class="ex-row" data-a="ex-info" data-ex="${it.exId}">
        <span class="ex-num">${i + 1}</span>
        <span class="grow"><div class="ex-name">${esc(EX[it.exId].name)}</div>
        <div class="ex-meta">${it.sets} × ${repsTxt(it.exId, ...E.effectiveRange(it, state.prog[it.exId]))} · ${loadTxt(it.exId, currentW(it.exId))}</div></span>
        <span class="chev">›</span>
      </button>`).join('');
  }

  function viewToday() {
    const s = state;
    let html = '';
    if (s.active) {
      html += `<div class="note info"><b>Masz niedokończony trening</b> (${esc(s.active.dayName)}, ${dateTxt(s.active.startedAt)}).
        <div class="btn-row mt"><button class="btn small" data-a="resume">Wróć do treningu</button><button class="btn small secondary" data-a="discard">Porzuć</button></div></div>`;
    }
    const di = ui.pickDay != null ? ui.pickDay : s.next;
    const d = s.plan.days[di];
    const weekAgo = Date.now() - 7 * 864e5;
    const thisWeek = s.log.filter(l => new Date(l.date).getTime() > weekAgo).length;
    html += `<div class="stat-grid">
        <div class="stat"><b>${s.log.length}</b><span>${plural(s.log.length, 'trening', 'treningi', 'treningów')}</span></div>
        <div class="stat"><b>${thisWeek}/${s.profile.days}</b><span>w ostatnich 7 dniach</span></div>
        <div class="stat"><b>${s.log.length ? Math.max(0, Math.floor((Date.now() - new Date(s.log[s.log.length - 1].date)) / 864e5)) : '–'}</b><span>dni od ostatniego</span></div>
      </div>`;
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
    if (E.adaptationActive(s)) {
      html += `<div class="note ok mt2"><b>Okres wdrożenia (pierwsze ${s.profile.days * 2} ${plural(s.profile.days * 2, 'trening', 'treningi', 'treningów')}).</b> Robisz o jedną serię mniej i lżej – uczysz się techniki, a ciało przyzwyczaja się do wysiłku. Potem plan wskoczy na pełne obroty.</div>`;
    }
    html += `<div class="note info"><b>Zasada na każdy trening:</b> technika ważniejsza od ciężaru. Jeśli ruch zaczyna wyglądać inaczej niż na filmie – to sygnał, że ciężar jest za duży.</div>`;
    return html;
  }

  function viewPlan() {
    const s = state, p = s.profile;
    let html = '';
    if (ui.fresh) {
      html += `<div class="note ok"><b>Plan gotowy! 🎉</b> Poniżej masz cały tydzień. Dotknij ćwiczenia, żeby zobaczyć film i opis techniki. Gdy będziesz na siłowni, przejdź do zakładki „Trening” i wciśnij „Rozpocznij trening”.</div>`;
      ui.fresh = false;
    }
    html += `<div class="card"><h2>${esc(s.plan.name)}</h2>
      <div class="kv"><span>Cel</span><span>${esc(E.GOALS[p.goal].short)}</span></div>
      <div class="kv"><span>Dni treningowe</span><span>${p.days} w tygodniu</span></div>
      <div class="kv"><span>Proponowane dni</span><span>${esc(s.plan.schedule)}</span></div>
      <div class="kv"><span>Priorytet</span><span>${p.priorities.length ? p.priorities.map(x => esc(E.GROUPS[x])).join(', ') : 'całe ciało po równo'}</span></div>
      <p class="small muted mt">Treningi robisz po kolei (${s.plan.days.map(d => esc(d.name.replace('Trening ', ''))).join(' → ')} → od nowa). Nie musisz trzymać się konkretnych dni tygodnia – ważne, żeby między treningami był co najmniej 1 dzień przerwy${p.days === 4 ? ' po dwóch dniach z rzędu' : ''}.</p>
    </div>`;
    if (p.injuries.length) {
      html += `<div class="note warn"><b>Uwzględniłem dolegliwości:</b> ${p.injuries.map(i => esc(INJURIES.find(x => x.id === i).label.toLowerCase())).join(', ')}. Pominąłem ćwiczenia, które najbardziej obciążają te miejsca. Ćwicz tylko w zakresie bez bólu – jeśli coś boli, przerwij i skonsultuj to z fizjoterapeutą.</div>`;
    }
    const bmi = p.weight / ((p.height / 100) ** 2);
    if (p.age >= 60 || bmi >= 35) {
      html += `<div class="note warn">Ze względu na ${p.age >= 60 ? 'wiek' : 'BMI'} zalecam przed startem krótką konsultację z lekarzem. Zaczynaj spokojnie – ciężary startowe są celowo lekkie.</div>`;
    }
    s.plan.days.forEach(d => {
      html += `<div class="section-title">${esc(d.name)} · ${esc(d.focus)} · ok. ${d.estMin} min</div><div class="card">${dayPreview(d)}</div>`;
    });
    html += `<div class="section-title">Słowniczek</div><div class="card small">
      <p><b>Powtórzenie</b> – jedno pełne wykonanie ruchu (np. raz w dół i raz w górę).</p>
      <p class="mt"><b>Seria</b> – kilka powtórzeń z rzędu bez odpoczynku. „3 × 8–12” = 3 serie po 8 do 12 powtórzeń.</p>
      <p class="mt"><b>Przerwa</b> – odpoczynek między seriami. Dzięki niej kolejna seria jest równie dobra.</p>
      <p class="mt"><b>Zapas powtórzeń</b> – kończ serię, gdy ${g('czujesz, że dałbyś', 'czujesz, że dałabyś')} radę zrobić jeszcze 1–2 powtórzenia poprawnie technicznie. Nie trenuj „do upadku”.</p>
      <p class="mt"><b>Jak rośnie ciężar?</b> Masz zakres powtórzeń, np. 8–12. Gdy we wszystkich seriach zrobisz górną granicę (12), następnym razem aplikacja doda ciężar. Wtedy zrobisz mniej powtórzeń (np. 8) i znów dochodzisz do 12. Tak w kółko.</p>
      <p class="mt"><b>Serie rozgrzewkowe</b> – lżejsze serie przed głównymi ćwiczeniami. Nie liczą się do planu, przygotowują stawy i mięśnie.</p>
    </div>`;
    return html;
  }

  function viewHistory() {
    const s = state;
    let html = '';
    const progIds = Object.keys(s.prog).filter(id => EX[id]);
    html += `<div class="section-title">Twoje aktualne ciężary</div><div class="card">`;
    if (!progIds.length) html += `<p class="muted small">Pojawią się po pierwszym treningu.</p>`;
    else html += progIds.map(id => {
      const p = s.prog[id], ex = EX[id];
      const first = s.log.flatMap(l => l.entries.filter(e => e.exId === id).map(e => e.sets[0] && e.sets[0].w))[0];
      let val;
      if (ex.load === 'bw') val = `+${p.bonus || 0} ${unitOf(id)}`;
      else val = loadTxt(id, p.w) + (first != null && first !== p.w && ex.load !== 'assist' ? ` <span class="muted tiny">(start ${nf(first)})</span>` : '');
      return `<div class="kv"><span>${esc(ex.name)}</span><span>${val}</span></div>`;
    }).join('');
    html += `</div><div class="section-title">Historia treningów</div>`;
    if (!s.log.length) return html + `<div class="card"><p class="muted small">Tu zobaczysz zapisane treningi.</p></div>`;
    html += s.log.slice().reverse().map((l, ri) => {
      const i = s.log.length - 1 - ri;
      const open = ui.openLog === i;
      return `<div class="card"><button class="log-day row" data-a="log-toggle" data-i="${i}">
          <span class="grow"><b>${esc(l.dayName)}</b><div class="muted small">${dateTxt(l.date)} · ${l.min} min · ${l.entries.length} ${plural(l.entries.length, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń')}</div></span><span class="chev">${open ? '⌄' : '›'}</span></button>
          ${open ? `<div class="mt">${l.entries.map(e => `<div class="kv"><span>${esc(EX[e.exId] ? EX[e.exId].name : e.exId)}</span><span class="log-sets">${e.sets.map(st => EX[e.exId] && EX[e.exId].load === 'bw' ? st.reps : `${nf(st.w)}×${st.reps}`).join(', ')}</span></div>`).join('')}
          <button class="btn ghost small mt" data-a="log-del" data-i="${i}">Usuń ten wpis</button></div>` : ''}
        </div>`;
    }).join('');
    return html;
  }

  function viewDiet() {
    const p = state.profile, n = E.nutrition(p);
    const cardio = {
      masa: 'Cardio nie jest konieczne. 2× w tygodniu 20–30 min spokojnego wysiłku (rower, szybki marsz) wspiera serce i regenerację.',
      redukcja: 'Najważniejsze: 7–10 tys. kroków dziennie. Dodatkowo 2–3× w tygodniu 20–30 min umiarkowanego cardio (rower, orbitrek, szybki marsz pod górę) – po treningu siłowym albo w inne dni.',
      sila: 'Cardio nie jest konieczne. 1–2× w tygodniu 20 min spokojnego wysiłku poprawia kondycję między seriami.',
      zdrowie: 'Celuj w łącznie 150–300 min umiarkowanego ruchu tygodniowo (np. szybki marsz, rower) oprócz siłowni – tak zaleca WHO.',
    }[p.goal];
    return `
      <div class="card center"><div class="muted small">Twoje orientacyjne dzienne zapotrzebowanie</div>
        <div class="kcal">${n.kcal.toLocaleString('pl-PL')} kcal</div>
        <div class="muted small">cel: ${esc(E.GOALS[p.goal].short.toLowerCase())}</div></div>
      <div class="card">
        <div class="kv"><span>Białko dziennie</span><span>${n.protein[0]}–${n.protein[1]} g</span></div>
        <div class="kv"><span>Woda dziennie</span><span>${nf(n.water[0])}–${nf(n.water[1])} l</span></div>
        <div class="kv"><span>Utrzymanie wagi (szacunek)</span><span>${n.tdee.toLocaleString('pl-PL')} kcal</span></div>
        <div class="kv"><span>BMI</span><span>${nf(n.bmi)}</span></div>
        ${n.protBasis ? `<p class="tiny muted mt">Białko ${esc(n.protBasis)}.</p>` : ''}
      </div>
      <div class="note info">${esc(n.info)}</div>
      <div class="section-title">Jak sprawdzić, czy to działa</div>
      <div class="card small"><ol class="list">
        <li>Waż się 3–4 razy w tygodniu rano, po toalecie, przed jedzeniem. Licz średnią z tygodnia – pojedynczy pomiar skacze nawet o 1–2 kg.</li>
        <li>Po 2–3 tygodniach porównaj średnie. Jeśli waga nie zmienia się zgodnie z celem, zmień kalorie o 150–200 kcal.</li>
        <li>Kalorie to szacunek ze wzoru (Mifflin-St Jeor) – realne zapotrzebowanie może różnić się o ok. 10%.</li>
      </ol></div>
      <div class="section-title">Białko – skąd je brać</div>
      <div class="card small"><p>Rozłóż je na 3–5 posiłków – przy 4 posiłkach to ok. ${Math.round((n.protein[0] + n.protein[1]) / 8 / 5) * 5} g w każdym. Przykłady ok. 25 g białka: 120 g piersi z kurczaka, 4 jajka, 250 g skyru lub serka wiejskiego, 130 g tuńczyka z puszki, 1 porcja odżywki białkowej (30 g).</p></div>
      <div class="section-title">Ruch poza siłownią</div>
      <div class="card small"><p>${esc(cardio)}</p></div>
      <div class="section-title">Podstawy</div>
      <div class="card small"><ul class="list">
        <li>Śpij 7–9 godzin – to wtedy mięśnie się odbudowują.</li>
        <li>Większość jedzenia: mało przetworzone produkty, warzywa i owoce do każdego posiłku.</li>
        <li>Alkohol mocno spowalnia efekty – ograniczaj go.</li>
      </ul></div>
      <p class="tiny muted center mt">To orientacyjne wyliczenia, a nie porada dietetyczna. Przy chorobach (np. nerek, cukrzycy) ustal dietę z lekarzem lub dietetykiem.</p>`;
  }

  function viewProfile() {
    const p = state.profile;
    const rows = [
      ['Imię', p.name || '–'], ['Płeć', p.sex === 'k' ? 'Kobieta' : 'Mężczyzna'], ['Wiek', `${p.age} lat`], ['Wzrost', `${p.height} cm`], ['Waga', `${nf(p.weight)} kg`],
      ['Doświadczenie', ['zaczynam od zera', 'trochę ćwiczył' + g('em', 'am'), 'regularnie'][p.exp]], ['Cel', E.GOALS[p.goal].short],
      ['Dni / czas', `${p.days} × ${p.duration} min`],
      ['Dolegliwości', p.injuries.length ? p.injuries.map(i => INJURIES.find(x => x.id === i).label).join(', ') : 'brak'],
    ];
    return `<div class="card">${rows.map(([k, v]) => `<div class="kv"><span>${k}</span><span>${esc(v)}</span></div>`).join('')}</div>
      <button class="btn secondary" data-a="weight-update">Aktualizuj wagę ciała</button>
      <button class="btn secondary mt" data-a="redo">Zmień odpowiedzi i ułóż plan od nowa</button>
      <p class="tiny muted mt">Przy nowym planie Twoje ciężary i historia zostają zachowane.</p>
      <div class="section-title">Kopia zapasowa</div>
      <div class="card small"><p>Wszystko jest zapisane tylko na tym telefonie. Jeśli usuniesz aplikację z ekranu początkowego, dane znikną. Raz na jakiś czas zrób kopię (np. zapisz do Plików lub wyślij sobie).</p>
        <div class="btn-row mt"><button class="btn small secondary" data-a="export">Zapisz kopię</button>
        <label class="btn small secondary" style="position:relative">Wczytaj kopię<input type="file" accept=".json,application/json" data-in="import" style="position:absolute;inset:0;opacity:0"></label></div></div>
      <div class="section-title">Strefa niebezpieczna</div>
      <button class="btn danger" data-a="reset">Usuń wszystkie dane</button>
      <p class="tiny muted center mt2">Aplikacja nie zastępuje trenera ani lekarza. Ćwicz z głową 🙂</p>`;
  }

  // ─── Wideo i opis ćwiczenia ───
  function videoHtml(exId) {
    const v = (typeof VIDEOS !== 'undefined') && VIDEOS[exId];
    const name = exId === 'warmup_general' ? 'rozgrzewka przed siłownią' : EX[exId].name;
    const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' technika')}`;
    if (!v) return `<div class="note info small">Brak filmu – <a href="${search}" target="_blank" rel="noopener">wyszukaj na YouTube</a>.</div>`;
    const lang = v.lang === 'pl' ? 'po polsku' : 'po angielsku';
    const watch = id => `https://www.youtube.com/watch?v=${id}${v.start ? `&t=${v.start}s` : ''}`;
    return `<div class="video" data-yt="${v.yt}" data-start="${v.start || 0}">
        <img src="https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg" alt="" loading="lazy" onerror="this.style.display='none'">
        <button class="play" data-a="play"><i>▶</i><span>Obejrzyj, jak to zrobić</span></button>
      </div>
      <div class="video-meta"><span>${esc(v.channel)} · ${lang}${v.seconds ? ` · ${Math.floor(v.seconds / 60)}:${String(v.seconds % 60).padStart(2, '0')}` : ''}</span>
        <a href="${watch(v.yt)}" target="_blank" rel="noopener">Otwórz w YouTube</a>
        ${v.backup ? `<a href="https://www.youtube.com/watch?v=${v.backup.yt}" target="_blank" rel="noopener">Inny film${v.backup.lang && v.backup.lang !== v.lang ? (v.backup.lang === 'pl' ? ' (PL)' : ' (EN)') : ''}</a>` : ''}</div>
      ${v.lang !== 'pl' ? '<div class="tiny muted">Film po angielsku – najważniejsze wskazówki masz po polsku poniżej.</div>' : ''}
      ${['PoTreningu', 'Olimp Sport Nutrition'].includes(v.channel) ? '<div class="tiny muted">Film pokazuje też błędne wykonanie (oznaczone napisem na ekranie) – to wzór, czego NIE robić.</div>' : ''}`;
  }

  function howtoHtml(exId) {
    const ex = EX[exId];
    return `<h3>Ustawienie</h3><ol class="list small">${ex.setup.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      <h3>Wykonanie</h3><ol class="list small">${ex.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      <h3>Najczęstsze błędy</h3><ul class="list small">${ex.mistakes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
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
    openModal(esc(ex.name), `${videoHtml(exId)}
      <div class="small muted mt"><b>Pracują:</b> ${esc(ex.muscles)}</div>
      ${state && ex.load !== 'bw' ? `<div class="note info mt small">Twój ${state.prog[exId] ? 'aktualny' : 'startowy'} ciężar: <b>${loadTxt(exId, w)}</b></div>` : ''}
      ${ex.note ? `<div class="note warn small">${esc(ex.note)}</div>` : ''}
      ${howtoHtml(exId)}`);
  }

  // ─── Trening krok po kroku ───
  const WARMUP = [
    ['5–8 minut lekkiego cardio', 'Rowerek, orbitrek albo szybki marsz na bieżni. Tempo, przy którym możesz swobodnie rozmawiać.'],
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
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state && state.active && !ui.ob) keepAwake(true); });

  function startWorkout(di) {
    state.active = E.createSession(state, di);
    ui.pickDay = null;
    save(); keepAwake(true); render(); window.scrollTo(0, 0);
  }

  function renderWorkout() {
    const a = state.active;
    const n = a.entries.length;
    let head = '', body = '', bar = '';
    const dots = `<div class="dots">${a.entries.map((e, i) => `<i class="${a.stage === 'ex' && i === a.idx ? 'cur' : e.sets.some(s => s.done) ? 'done' : ''}"></i>`).join('')}</div>`;

    if (a.stage === 'warmup') {
      head = 'Rozgrzewka';
      body = `<div class="hero">Najpierw rozgrzewka 🔥</div>
        <p class="muted">Ok. 10 minut. Rozgrzane mięśnie i stawy = mniejsze ryzyko kontuzji i lepszy trening. Odhaczaj kolejne punkty.</p>
        <div class="card mt">${WARMUP.map(([t, d], i) => {
          const on = a.warmChecks.includes(i);
          return `<button class="check-row ${on ? 'on' : ''}" data-a="warm-check" data-i="${i}"><span class="check-box">${on ? '✓' : ''}</span><span class="grow"><b>${t}</b><div class="small muted">${d}</div></span></button>`;
        }).join('')}</div>
        <div class="section-title">Film: rozgrzewka krok po kroku</div>${videoHtml('warmup_general')}
        ${a.adapt ? `<div class="note ok mt">Okres wdrożenia: dziś o jedną serię mniej w każdym ćwiczeniu i lżej. Skup się na technice.</div>` : ''}`;
      bar = `<button class="btn" data-a="w-next">Rozgrzany${g('', 'a')} – zaczynamy ćwiczenia</button>`;
    } else if (a.stage === 'ex') {
      const e = a.entries[a.idx];
      const ex = EX[e.exId];
      head = `${esc(a.dayName)} · ${a.idx + 1}/${n}`;
      const rir = a.adapt ? 'ok. 3' : '1–2';
      body = dots + `
        <div class="ex-title">${esc(ex.name)}</div>
        <div class="small muted"><b>Pracują:</b> ${esc(ex.muscles)}</div>
        <div class="target">
          <div><b>${e.sets.length}</b><span>serie</span></div>
          <div><b>${e.lo}–${e.hi}</b><span>${ex.unit === 'time' ? 'sekund' : 'powtórzeń'}${ex.perSide ? ' / stronę' : ''}</span></div>
          <div><b>${restTxt(e.rest)}</b><span>przerwy</span></div>
        </div>
        <div class="card" id="sets">${setsHtml()}</div>
        <p class="small muted">Kończ serię, gdy ${g('czujesz, że dałbyś', 'czujesz, że dałabyś')} radę zrobić jeszcze <b>${rir}</b> powtórzenia poprawnie. Między seriami odpoczywaj ok. ${restTxt(e.rest)}.</p>
        <div class="section-title">Jak to zrobić</div>
        ${videoHtml(e.exId)}
        ${ex.note ? `<div class="note warn small mt">${esc(ex.note)}</div>` : ''}
        <details class="howto card" ${a.entries.some((x, i) => i < a.idx) || state.log.some(l => l.entries.some(x => x.exId === e.exId)) ? '' : 'open'}><summary>Instrukcja krok po kroku</summary>${howtoHtml(e.exId)}</details>
        <div class="btn-row"><button class="btn secondary small" data-a="swap">⇄ Zamień ćwiczenie</button><button class="btn secondary small" data-a="info-mistakes">⚠️ Błędy</button></div>`;
      bar = `<div class="btn-row"><button class="btn secondary" data-a="w-prev" style="flex:0 0 30%">‹ Wstecz</button>
        <button class="btn" data-a="w-next">${a.idx === n - 1 ? 'Zakończ trening' : 'Następne ćwiczenie ›'}</button></div>`;
    } else if (a.stage === 'finish') {
      head = 'Podsumowanie';
      const results = a.entries.map(e => ({ e, r: E.evaluate(e, state.prog[e.exId]) }));
      const doneCount = a.entries.filter(e => e.sets.some(s => s.done)).length;
      body = `<div class="hero">${doneCount ? 'Dobra robota! 💪' : 'Nic nie zapisano'}</div>
        <p class="muted">${doneCount ? `Zrobione ćwiczenia: ${doneCount} z ${n}. Oto plan na następny raz:` : 'Nie odhaczyłeś żadnej serii. Możesz wrócić do ćwiczeń albo porzucić trening.'.replace('odhaczyłeś', g('odhaczyłeś', 'odhaczyłaś'))}</p>
        <div class="card mt">${results.map(({ e, r }) => `<div class="kv" style="display:block"><b class="small">${r.change > 0 ? '⬆️ ' : r.change < 0 ? '⬇️ ' : ''}${esc(EX[e.exId].name)}</b>
          <div class="small muted">${r.msg ? esc(r.msg) : 'Pominięte – bez zmian.'}</div></div>`).join('')}</div>`;
      bar = doneCount ? `<button class="btn" data-a="w-save">Zapisz trening</button><button class="btn ghost" data-a="w-back-ex">Wróć do ćwiczeń</button>`
        : `<button class="btn" data-a="w-back-ex">Wróć do ćwiczeń</button><button class="btn ghost" data-a="discard">Porzuć trening</button>`;
    }

    $app.innerHTML = `
      <header class="top"><button class="icon-btn" data-a="w-exit" aria-label="Wyjdź">✕</button><h1>${head}</h1></header>
      <main class="page no-nav">${body}</main>
      <div class="bottom-bar"><div>${bar}</div></div>`;
  }

  function setsHtml() {
    const a = state.active;
    const e = a.entries[a.idx];
    const ex = EX[e.exId];
    const bw = ex.load === 'bw';
    const firstOpen = e.sets.findIndex(s => !s.done);
    let html = '';
    if (e.warm.length) {
      html += `<div class="tiny muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.5px">Serie rozgrzewkowe (lekko, nie liczą się)</div>` +
        e.warm.map((s, j) => `<div class="set-row warm"><span class="set-label">${j + 1}.</span>
          <span class="warm-txt">${loadTxt(e.exId, s.w)} × ${s.reps}</span>
          <button class="set-ok ${s.done ? 'done' : ''}" data-a="warm-ok" data-j="${j}" aria-label="Zrobione">✓</button></div>`).join('') +
        `<div class="tiny muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:12px">Serie właściwe</div>`;
    }
    if (e.calib && !e.rated) {
      html += `<div class="note info small" style="margin:8px 0">Pierwszy raz robisz to ćwiczenie – ciężar to <b>propozycja</b>. Po 1. serii zapytam, jak było, i dopasuję go.</div>`;
    }
    const repHead = (ex.unit === 'time' ? 'Sekundy' : 'Powtórzenia') + (ex.perSide ? ' / stronę' : '');
    const wHead = ex.load === 'assist' ? 'Pomoc (kg)' : ex.load === 'db' && !ex.single ? 'Hantla (kg)' : 'Ciężar (kg)';
    html += `<div class="set-head"><span class="set-label"></span>${bw ? '' : `<span class="set-in">${wHead}</span><span class="set-x" style="visibility:hidden">×</span>`}<span class="set-in">${repHead}</span><span style="width:48px;flex:none"></span></div>`;
    html += e.sets.map((s, j) => {
      const active = j === firstOpen;
      const wIn = bw ? '' : `<span class="set-in"><input type="text" inputmode="decimal" value="${nf(s.w)}" data-in="w" data-j="${j}" aria-label="${wHead}"></span><span class="set-x">×</span>`;
      return `<div class="set-row ${active ? 'active' : ''}"><span class="set-label">Seria ${j + 1}</span>
        ${wIn}<span class="set-in"><input type="text" inputmode="numeric" pattern="[0-9]*" value="${s.reps}" placeholder="${active ? '?' : ''}" data-in="r" data-j="${j}" aria-label="${repHead}"></span>
        <button class="set-ok ${s.done ? 'done' : ''}" data-a="set-ok" data-j="${j}" aria-label="Zrobione">✓</button></div>`;
    }).join('');
    if (e.calib && !e.rated && e.sets[0].done) {
      html += `<div class="rate"><div class="small" style="font-weight:700">Jak było w 1. serii?</div>
        <button data-a="rate" data-v="light">😌 Za lekko<small>Zrobił${g('bym', 'abym')} spokojnie 5+ powtórzeń więcej</small></button>
        <button data-a="rate" data-v="ok">👍 W sam raz<small>Zostały mi 1–3 powtórzenia zapasu, technika dobra</small></button>
        <button data-a="rate" data-v="heavy">😣 Za ciężko<small>Nie zrobił${g('em', 'am')} minimum albo technika się psuła</small></button></div>`;
    }
    const allDone = e.sets.every(s => s.done);
    if (allDone) html += `<div class="note ok small" style="margin:10px 0 0">Ćwiczenie zrobione ✓ Przejdź do następnego.</div>`;
    else if (e.sets.some(s => s.done)) html += `<div class="note info small" style="margin:10px 0 0">⏱️ Odpocznij ok. ${restTxt(e.rest)} i zrób kolejną serię.</div>`;
    return html;
  }

  function refreshSets() {
    const el = document.getElementById('sets');
    if (el) el.innerHTML = setsHtml();
    const dots = document.querySelector('.dots');
    if (dots) {
      const a = state.active;
      dots.innerHTML = a.entries.map((e, i) => `<i class="${i === a.idx ? 'cur' : e.sets.some(s => s.done) ? 'done' : ''}"></i>`).join('');
    }
  }

  function setOk(j) {
    const a = state.active, e = a.entries[a.idx], s = e.sets[j];
    if (s.done) { s.done = false; save(); return refreshSets(); }
    const ex = EX[e.exId];
    if (s.reps === '' || num(s.reps) == null) {
      const inp = document.querySelector(`[data-in="r"][data-j="${j}"]`);
      if (inp) { inp.classList.add('missing'); inp.focus(); }
      return toast(ex.unit === 'time' ? 'Wpisz, ile sekund wytrzymał' + g('eś', 'aś') : 'Wpisz, ile powtórzeń zrobił' + g('eś', 'aś'));
    }
    if (ex.load !== 'bw' && num(s.w) == null) return toast('Wpisz ciężar');
    s.done = true;
    // kolejne serie przejmują ciężar zmieniony ręcznie
    for (let k = j + 1; k < e.sets.length; k++) if (!e.sets[k].done) e.sets[k].w = s.w;
    save(); refreshSets();
  }

  function rate(v) {
    const a = state.active, e = a.entries[a.idx];
    const w = e.sets[0].w;
    const nw = E.calibrate(e.exId, w, v);
    e.rated = v;
    e.sets.forEach((s, k) => { if (k > 0 && !s.done) s.w = nw; });
    save(); refreshSets();
    if (v === 'ok') toast('Super – zostajemy przy tym ciężarze.');
    else toast(`Kolejne serie: ${loadTxt(e.exId, nw)}${v === 'heavy' ? ' – lżej, ale z dobrą techniką' : ''}`);
  }

  function saveWorkout() {
    const a = state.active;
    const entries = [];
    a.entries.forEach(e => {
      const r = E.evaluate(e, state.prog[e.exId]);
      if (r.prog) state.prog[e.exId] = r.prog;
      const sets = e.sets.filter(s => s.done).map(s => ({ w: num(s.w) || 0, reps: +s.reps }));
      if (sets.length) entries.push({ exId: e.exId, sets });
    });
    const min = Math.max(1, Math.min(240, Math.round((Date.now() - new Date(a.startedAt)) / 60000)));
    state.log.push({ date: new Date().toISOString(), dayKey: a.dayKey, dayName: a.dayName, min, entries });
    state.next = (a.dayIndex + 1) % state.plan.days.length;
    state.active = null;
    save(); keepAwake(false);
    ui.tab = 'today';
    render(); window.scrollTo(0, 0);
    toast('Trening zapisany! Odpocznij i do zobaczenia 💪');
  }

  function openSwap() {
    const a = state.active, e = a.entries[a.idx];
    const planItem = state.plan.days[a.dayIndex].items.find(it => it.slot === e.slot && (it.exId === e.exId || it.exId === e.origEx)) || state.plan.days[a.dayIndex].items.find(it => it.slot === e.slot);
    const inDay = new Set(a.entries.map(x => x.exId));
    const alts = (planItem ? planItem.alts : []).filter(id => !inDay.has(id) && E.exAllowed(id, state.profile));
    ui.swapFor = planItem;
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
      <button class="btn ghost small mt" data-a="ex-info" data-ex="${newId}">Zobacz film i opis</button></div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function swapDo(newId, perm) {
    const a = state.active, e = a.entries[a.idx];
    const item = ui.swapFor || { slot: e.slot, role: e.role, sets: e.sets.length, extra: 0, alts: [] };
    const ni = E.swapItem(item, newId, state.profile.goal);
    if (perm && ui.swapFor) {
      const items = state.plan.days[a.dayIndex].items;
      const k = items.indexOf(ui.swapFor);
      if (k >= 0) items[k] = ni;
    }
    // przebuduj wpis w bieżącym treningu
    const tmp = E.createSession({ ...state, plan: { days: [{ key: a.dayKey, name: a.dayName, items: [{ ...ni, sets: ni.sets }] }] } }, 0);
    const ne = tmp.entries[0];
    ne.sets = ne.sets.slice(0, e.sets.length);
    while (ne.sets.length < e.sets.length) ne.sets.push({ ...ne.sets[0], reps: '', done: false });
    ne.origEx = e.origEx || e.exId;
    a.entries[a.idx] = ne;
    save(); closeModal(); render(); window.scrollTo(0, 0);
    toast(perm ? 'Zamienione na stałe w planie.' : 'Zamienione na dziś.');
  }

  // ─── Główny render ───
  function render() {
    if (!state || ui.ob) {
      if (!ui.ob) { ui.ob = { equipment: EQUIPMENT.map(e => e.id) }; ui.obStep = 0; }
      return renderOnboarding();
    }
    if (state.active && !ui.leftWorkout) return renderWorkout();
    renderMain();
  }

  // ─── Akcje ───
  const actions = {
    'ob-pick'(el) {
      const step = STEPS[ui.obStep];
      const v = JSON.parse(el.dataset.v);
      ui.err = '';
      if (step.type === 'single') {
        ui.ob[step.id] = v;
        render();
        setTimeout(() => obNext(), 180);
        return;
      }
      const opt = optsOf(step).find(o => o.v === v);
      let cur = ui.ob[step.id] || [];
      if (cur.includes(v)) cur = cur.filter(x => x !== v);
      else if (opt.exclusive) cur = [v];
      else cur = [...cur.filter(x => !optsOf(step).find(o => o.v === x && o.exclusive)), v];
      ui.ob[step.id] = cur;
      render();
    },
    'ob-next'() { obNext(); },
    'ob-back'() {
      if (ui.obStep === 0 || (state && ui.obStep === STEPS.length - 1 && ui.obReturn == null && !ui.obFromStart)) { ui.ob = null; return render(); }
      if (ui.obReturn != null) { const r = ui.obReturn; ui.obReturn = null; ui.obStep = r; ui.err = ''; return render(); }
      ui.obStep--; ui.err = ''; render();
    },
    'ob-edit'(el) { ui.obReturn = STEPS.length - 1; ui.obStep = +el.dataset.i; ui.err = ''; render(); window.scrollTo(0, 0); },
    tab(el) { ui.tab = el.dataset.t; ui.pickDay = null; render(); window.scrollTo(0, 0); },
    'ex-info'(el) { showExercise(el.dataset.ex); },
    'pick-day'(el) { ui.pickDay = +el.dataset.d; render(); },
    start(el) { startWorkout(+el.dataset.d); },
    resume() { ui.leftWorkout = false; keepAwake(true); render(); window.scrollTo(0, 0); },
    discard() {
      if (!confirm('Porzucić ten trening? Wpisane serie nie zostaną zapisane.')) return;
      state.active = null; ui.leftWorkout = false; save(); keepAwake(false); ui.tab = 'today'; render();
    },
    'w-exit'() {
      openModal('Wyjść z treningu?', `<p class="small muted">Wpisane serie są zapamiętane – możesz wrócić w każdej chwili z zakładki „Trening”.</p>
        <button class="btn mt" data-a="w-leave">Wyjdź, wrócę później</button>
        <button class="btn secondary mt" data-a="w-finish">Zakończ i zapisz teraz</button>
        <button class="btn danger mt" data-a="discard-modal">Porzuć trening</button>`);
    },
    'w-leave'() { closeModal(); ui.leftWorkout = true; ui.tab = 'today'; keepAwake(false); render(); window.scrollTo(0, 0); },
    'w-finish'() { closeModal(); state.active.stage = 'finish'; save(); render(); window.scrollTo(0, 0); },
    'discard-modal'() { closeModal(); actions.discard(); },
    'warm-check'(el) {
      const i = +el.dataset.i, w = state.active.warmChecks;
      state.active.warmChecks = w.includes(i) ? w.filter(x => x !== i) : [...w, i];
      save(); render();
    },
    'w-next'() {
      const a = state.active;
      if (a.stage === 'warmup') { a.stage = 'ex'; a.idx = 0; }
      else if (a.stage === 'ex') {
        if (a.idx < a.entries.length - 1) a.idx++;
        else a.stage = 'finish';
      }
      save(); render(); window.scrollTo(0, 0);
    },
    'w-prev'() {
      const a = state.active;
      if (a.idx > 0) a.idx--; else a.stage = 'warmup';
      save(); render(); window.scrollTo(0, 0);
    },
    'w-back-ex'() { const a = state.active; a.stage = 'ex'; a.idx = a.entries.length - 1; save(); render(); window.scrollTo(0, 0); },
    'w-save'() { saveWorkout(); },
    'set-ok'(el) { setOk(+el.dataset.j); },
    'warm-ok'(el) { const s = state.active.entries[state.active.idx].warm[+el.dataset.j]; s.done = !s.done; save(); refreshSets(); },
    rate(el) { rate(el.dataset.v); },
    swap() { openSwap(); },
    'swap-pick'(el) { swapPick(el.dataset.ex); },
    'swap-do'(el) { swapDo(el.dataset.ex, el.dataset.perm === '1'); },
    'info-mistakes'() {
      const e = state.active.entries[state.active.idx];
      openModal('Najczęstsze błędy', `<p class="small"><b>${esc(EX[e.exId].name)}</b></p><ul class="list small mt">${EX[e.exId].mistakes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);
    },
    play(el) {
      const box = el.closest('.video');
      const id = box.dataset.yt, start = +box.dataset.start || 0;
      box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&autoplay=1${start ? `&start=${start}` : ''}" title="Film instruktażowy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    },
    close() { closeModal(); },
    'modal-bg'(el, ev) { if (ev.target === el) closeModal(); },
    'log-toggle'(el) { const i = +el.dataset.i; ui.openLog = ui.openLog === i ? null : i; render(); },
    'log-del'(el) {
      if (!confirm('Usunąć ten wpis z historii? (Aktualne ciężary się nie zmienią.)')) return;
      state.log.splice(+el.dataset.i, 1); ui.openLog = null; save(); render();
    },
    redo() { startOnboarding(state.profile); },
    'weight-update'() {
      const v = prompt('Twoja aktualna waga (kg):', nf(state.profile.weight));
      if (v == null) return;
      const n = num(v);
      if (n == null || n < 35 || n > 250) return toast('Podaj wagę od 35 do 250 kg.');
      state.profile.weight = Math.round(n * 10) / 10;
      save(); render(); toast('Waga zaktualizowana – kalorie przeliczone.');
    },
    async export() {
      const json = JSON.stringify(state);
      const name = `trening-kopia-${new Date().toISOString().slice(0, 10)}.json`;
      try {
        const file = new File([json], name, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Kopia – plan treningowy' }); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = name; document.body.appendChild(a); a.click(); a.remove();
    },
    reset() {
      if (!confirm('Na pewno usunąć wszystkie dane (plan, historię, ciężary)? Tego nie da się cofnąć.')) return;
      try { localStorage.removeItem(KEY); } catch (e) { /* nic */ }
      state = null; ui.ob = null; keepAwake(false); render();
    },
  };

  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-a]');
    if (!el) return;
    const fn = actions[el.dataset.a];
    if (fn) fn(el, ev);
  });

  document.addEventListener('input', ev => {
    const el = ev.target;
    if (!el.dataset || !state || !state.active) return;
    const a = state.active, e = a.entries[a.idx];
    if (el.dataset.in === 'w') {
      const v = num(el.value);
      if (v != null) e.sets[+el.dataset.j].w = v;
    } else if (el.dataset.in === 'r') {
      const v = el.value.replace(/[^0-9]/g, '');
      if (v !== el.value) el.value = v;
      e.sets[+el.dataset.j].reps = v === '' ? '' : +v;
      el.classList.remove('missing');
    } else return;
    save();
  });

  document.addEventListener('change', ev => {
    const el = ev.target;
    if (el.dataset.in !== 'import' || !el.files || !el.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const s = JSON.parse(reader.result);
        if (!s || !s.profile || !s.plan || !Array.isArray(s.log)) throw new Error('zły plik');
        if (!confirm(`Wczytać kopię? Zawiera ${s.log.length} treningów. Obecne dane zostaną zastąpione.`)) return;
        state = s; state.prog = state.prog || {}; save(); render(); toast('Kopia wczytana.');
      } catch (e) { toast('To nie jest poprawny plik kopii.'); }
    };
    reader.readAsText(el.files[0]);
    el.value = '';
  });

  render();
  if (state && state.active) keepAwake(true);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // nowa wersja aplikacji przejęła stronę → przeładuj raz (dane są zapisane, nic nie ginie)
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      reloaded = true; location.reload();
    });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
