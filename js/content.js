// Treści stałe: bezpieczeństwo, ból, suplementy, cardio (spec. 1.6–1.8, 5.4, 6).

const CONTENT = {
  disclaimer: 'To informacje edukacyjne, nie porada medyczna ani dietetyczna. Przy chorobach (np. nerek, serca, cukrzycy), lekach lub zaburzeniach odżywiania skonsultuj się z lekarzem lub dietetykiem.',

  // Ankieta w stylu PAR-Q+ (spec. 6.3) – każde „tak” to zalecenie konsultacji, nie blokada
  parq: [
    { id: 'serce', label: 'Choroba serca lub problemy z krążeniem' },
    { id: 'nadcisnienie', label: 'Nadciśnienie tętnicze' },
    { id: 'bol_klatka', label: 'Ból lub ucisk w klatce piersiowej przy wysiłku' },
    { id: 'zawroty', label: 'Zawroty głowy lub omdlenia' },
    { id: 'stawy', label: 'Choroba stawów lub kręgosłupa' },
    { id: 'cukrzyca', label: 'Cukrzyca' },
    { id: 'ciaza', label: 'Ciąża', sex: 'k' },
    { id: 'leki', label: 'Stale przyjmowane leki' },
  ],

  redFlags: [
    'ból lub ucisk w klatce piersiowej',
    'duszność nieproporcjonalna do wysiłku',
    'kołatanie serca',
    'omdlenie lub silne zawroty głowy',
    'nagły, bardzo silny ból głowy',
    'drętwienie lub nagłe osłabienie ręki albo nogi',
    'utrata kontroli nad pęcherzem lub jelitami',
    'ciemny („jak cola”) mocz po treningu ze skrajnym bólem mięśni',
  ],

  painAreas: ['Kolano', 'Bark', 'Łokieć', 'Nadgarstek', 'Dolne plecy', 'Biodro', 'Kark / szyja', 'Inne'],
  painKinds: [
    { id: 'miesien', label: 'Pieczenie / zmęczenie mięśnia' },
    { id: 'tepy', label: 'Tępy ból stawu lub ścięgna' },
    { id: 'ostry', label: 'Ostry, kłujący ból' },
  ],

  safetyRules: [
    'Pierwsze 2–4 tygodnie: kończ serie z zapasem 3–4 powtórzeń, ucz się techniki, ciężary mają być „za lekkie”.',
    'Technika przed ciężarem – zaznacz „technika się sypała”, a aplikacja nie podniesie ciężaru.',
    'Przysiad i wyciskanie ze sztangą: zawsze z ustawionymi zabezpieczeniami (bolce/pasy w stojakach) albo z asekuracją.',
    'Przed powtórzeniem: wdech i napięcie brzucha. Przy nadciśnieniu nie wstrzymuj oddechu przy dużym wysiłku – wydychaj podczas wysiłku.',
    'Między ciężkimi treningami tych samych mięśni zostaw co najmniej 48 godzin.',
    'Dobrze na start: 1–3 sesje z trenerem personalnym albo nagraj serię telefonem z boku i porównaj z filmem.',
  ],

  spotReduction: 'Ćwiczenia na brzuch wzmacniają mięśnie, ale nie spalają tłuszczu z brzucha. Tłuszcz spada z całego ciała, gdy utrzymujesz deficyt kaloryczny – a widoczność mięśni brzucha zależy od poziomu tkanki tłuszczowej.',

  sleep: 'Śpij 7–9 godzin – to wtedy mięśnie się odbudowują, a apetyt jest łatwiejszy do opanowania.',

  // Cardio i aktywność przy redukcji (spec. 1.7)
  cardio: {
    hierarchy: ['Deficyt kalorii z diety', 'Kroki w ciągu dnia', 'Trening siłowy', 'Cardio jako dodatek'],
    redukcja: '2–3 razy w tygodniu po 20–40 min spokojnego cardio (szybki marsz pod górkę, rower, orbitrek). Intensywne interwały (HIIT) najwyżej raz w tygodniu i dopiero po 8+ tygodniach treningów.',
    masa: 'Cardio nie jest konieczne. 2× w tygodniu 20–30 min spokojnego wysiłku wspiera serce i regenerację.',
    sila: 'Cardio nie jest konieczne. 1–2× w tygodniu 20 min spokojnego wysiłku poprawia kondycję między seriami.',
    zdrowie: 'WHO zaleca 150–300 min umiarkowanego ruchu tygodniowo (np. szybki marsz, rower) oraz ćwiczenia siłowe co najmniej 2 dni w tygodniu.',
    tips: [
      'Wybieraj rower lub marsz zamiast biegania – mniej przeszkadzają w budowaniu mięśni.',
      'Rób cardio po siłowni albo w inny dzień, najlepiej z odstępem co najmniej 6 godzin.',
      'Nie rób intensywnego cardio na nogi dzień przed treningiem nóg.',
    ],
  },

  // Suplementy (spec. 5.4): 🟢 mocne dowody, 🟡 umiarkowane / uzupełnienie, 🔴 brak dowodów
  supplements: [
    {
      name: 'Kreatyna (monohydrat)', level: 'green', dose: '3–5 g dziennie, codziennie (o dowolnej porze). Bez fazy ładowania pełne nasycenie mięśni po ok. 3–4 tygodniach.',
      note: 'Zwiększa siłę i przyrost mięśni przy treningu. U zdrowych osób brak dowodów szkodliwości. Może podnieść wagę o 1–2 kg (woda w mięśniach) – uwzględnij to, patrząc na trend wagi. Przy chorobach nerek – najpierw lekarz.',
      src: 'ISSN 2017', url: 'https://link.springer.com/article/10.1186/s12970-017-0173-z',
    },
    {
      name: 'Kofeina', level: 'green', dose: 'caffeine',
      note: 'Poprawia siłę i wytrzymałość. Nie później niż 6–8 h przed snem. W ciąży maks. 200 mg dziennie.',
      src: 'ISSN 2021, EFSA 2015', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7777221/',
    },
    {
      name: 'Białko serwatkowe / odżywka białkowa', level: 'yellow', dose: '20–40 g na porcję, gdy jedzenie nie pokrywa dziennego celu białka.',
      note: 'Wygodne źródło białka, nie „magiczny” suplement – liczy się dzienna suma białka. Przy nietolerancji laktozy wybierz izolat lub białko roślinne.',
      src: 'ISSN 2017', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5477153/',
    },
    {
      name: 'Witamina D', level: 'yellow', dose: 'Jesień–zima w Polsce: zwykle 800–2000 j.m. dziennie; najlepiej według badania 25(OH)D.',
      note: 'Uzupełnia niedobór; przy prawidłowym poziomie nie poprawia wyników. Górny bezpieczny limit dla dorosłych: 4000 j.m. dziennie.',
      src: 'EFSA', url: 'https://www.efsa.europa.eu/',
    },
    {
      name: 'Omega-3, magnez', level: 'yellow', dose: 'Według zaleceń żywieniowych, gdy w diecie jest ich mało.',
      note: 'Uzupełnienie diety. Słabe dowody na efekt sportowy.', src: '', url: '',
    },
    {
      name: 'BCAA, „spalacze tłuszczu”, CLA, L-karnityna, „boostery testosteronu”, detoksy', level: 'red', dose: '—',
      note: 'Brak przekonujących dowodów. Przy wystarczającym białku BCAA nic nie dodają. Spalacze i boostery niosą ryzyko zanieczyszczeń i interakcji z lekami.', src: '', url: '',
    },
  ],

  // Komunikat po ankiecie bólu (spec. 6.2)
  painAdvice(kind, score, worsening) {
    if (kind === 'miesien' && score <= 5 && !worsening) {
      return { level: 'ok', title: 'To normalne zmęczenie mięśnia', text: 'Pieczenie w serii i zakwasy 24–72 h po treningu są normalne. Trenuj dalej i rozgrzewaj się dokładnie.' };
    }
    if (kind === 'ostry' || score >= 4 || worsening) {
      return { level: 'bad', title: 'Przerwij to ćwiczenie', text: 'Ostry, narastający ból (od ok. 5/10), obrzęk albo ograniczenie ruchu to sygnał, żeby przerwać. Możesz spróbować zamiennika bez bólu. Jeśli ból nie ustępuje w ciągu kilku dni – idź do fizjoterapeuty lub lekarza.' };
    }
    return { level: 'warn', title: 'Lekki ból – zmniejsz i obserwuj', text: 'Ból stawu do 3/10, który mija po rozgrzewce i nie narasta następnego dnia: zmniejsz ciężar albo zakres ruchu i obserwuj. Jeśli wróci – zamień ćwiczenie.' };
  },
};

if (typeof module !== 'undefined') module.exports = CONTENT;

