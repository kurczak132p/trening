// Baza ćwiczeń. Każde ćwiczenie:
//  pat     – wzorzec ruchu (do doboru i zamienników)
//  eq      – wymagany sprzęt (wszystkie pozycje muszą być dostępne)
//  avoid   – dolegliwości, przy których ćwiczenie jest pomijane
//  minExp  – minimalne doświadczenie (0 nowicjusz, 1 krótko ćwiczył, 2 regularnie)
//  load    – sposób obciążenia: bb (sztanga, ciężar całkowity), db (hantle, ciężar jednej hantli),
//            mach (maszyna), cable (wyciąg), assist (maszyna z asystą – ciężar pomocy), bw (masa ciała)
//  k       – ciężar startowy jako ułamek masy ciała {m: mężczyzna, f: kobieta}
//  unit    – 'reps' albo 'time' (sekundy); perSide – liczone na każdą stronę
//  range   – stały zakres powtórzeń/sekund (dla ćwiczeń z masą ciała i brzucha)

const EQUIPMENT = [
  { id: 'sztanga', label: 'Sztanga, talerze i stojaki', hint: 'Do przysiadów i wyciskania' },
  { id: 'hantle', label: 'Hantle', hint: 'Zestaw hantli o różnej wadze' },
  { id: 'lawka', label: 'Ławka regulowana', hint: 'Z możliwością ustawienia skosu' },
  { id: 'wyciagi', label: 'Wyciągi / linki', hint: 'Np. ściąganie drążka, wiosłowanie siedząc, brama' },
  { id: 'maszyny', label: 'Maszyny', hint: 'Np. suwnica, uginanie nóg, wyciskanie siedząc, ławka rzymska' },
  { id: 'drazek', label: 'Drążek do podciągania', hint: '' },
];

const INJURIES = [
  { id: 'ledzwia', label: 'Dolny odcinek pleców (lędźwia)' },
  { id: 'kolana', label: 'Kolana' },
  { id: 'barki', label: 'Barki' },
  { id: 'nadgarstki', label: 'Nadgarstki / łokcie' },
];

const EXERCISES = {
  // ───────────── NOGI: wzorzec kolanowy ─────────────
  leg_press: {
    name: 'Suwnica – wypychanie nóg', pat: 'squat', eq: ['maszyny'], load: 'mach', k: { m: 0.75, f: 0.5 }, lower: true,
    muscles: 'Przód ud (czworogłowe), pośladki, przywodziciele',
    note: 'Podany ciężar to talerze dołożone na maszynę (bez wagi samych sań – każda suwnica ma inną).',
    setup: [
      'Usiądź tak, by całe plecy i pośladki przylegały do oparcia.',
      'Stopy na środku platformy, na szerokość bioder–barków, palce lekko na zewnątrz.',
      'Wypchnij platformę i dopiero wtedy zwolnij blokady (dźwignie po bokach).',
    ],
    steps: [
      'Wdech i powoli (2–3 s) zginaj kolana, opuszczając platformę.',
      'Zatrzymaj się, gdy kolana są mniej więcej pod kątem prostym albo tuż zanim pośladki zaczną odrywać się od oparcia.',
      'Wypchnij platformę całą stopą (nacisk na pięty i śródstopie), robiąc wydech.',
      'Na górze nie prostuj kolan do końca – zostaw lekkie ugięcie.',
      'Po ostatnim powtórzeniu zablokuj zabezpieczenia, zanim zdejmiesz nogi.',
    ],
    mistakes: [
      'Odrywanie pośladków i dolnej części pleców od oparcia – zejdź płycej.',
      'Kolana uciekające do środka – prowadź je w linii palców stóp.',
      'Prostowanie kolan „na sztywno” na górze – to niebezpieczne.',
      'Odrywanie pięt od platformy.',
    ],
  },
  goblet_squat: {
    name: 'Przysiad z hantlą przy klatce (goblet)', pat: 'squat', eq: ['hantle'], load: 'db', single: true, k: { m: 0.2, f: 0.12 }, lower: true,
    muscles: 'Przód ud, pośladki, przywodziciele, mięśnie brzucha',
    setup: [
      'Chwyć jedną hantlę pionowo, obiema dłońmi pod górnym talerzem, i trzymaj ją przy klatce. Łokcie w dół.',
      'Stopy na szerokość barków lub trochę szerzej, palce lekko na zewnątrz.',
    ],
    steps: [
      'Weź wdech i napnij brzuch.',
      'Schodź w dół, jednocześnie zginając kolana i cofając biodra. Tułów zostaje w miarę wyprostowany.',
      'Schodź tak nisko, jak dasz radę z prostymi plecami i piętami na podłodze – celuj w uda co najmniej równolegle do podłogi.',
      'Wstań, odpychając podłogę całą stopą. Wydech pod koniec ruchu.',
    ],
    mistakes: [
      'Kolana uciekające do środka – wypychaj je lekko na zewnątrz, w linii palców.',
      'Odrywanie pięt od podłogi.',
      'Zaokrąglanie pleców na dole – zejdź płycej.',
      'Odsuwanie hantli od klatki i pochylanie się do przodu.',
    ],
  },
  back_squat: {
    name: 'Przysiad ze sztangą na plecach', pat: 'squat', eq: ['sztanga'], load: 'bb', k: { m: 0.5, f: 0.3 }, lower: true, avoid: ['ledzwia', 'kolana'],
    muscles: 'Przód ud, pośladki, przywodziciele, prostowniki grzbietu',
    note: 'Pusta sztanga olimpijska waży 20 kg (damska 15 kg) – wliczaj ją w ciężar.',
    setup: [
      'Ustaw sztangę na stojakach na wysokości środka klatki, a zabezpieczenia (bolce/pasy) tuż poniżej najniższego punktu przysiadu.',
      'Wejdź pod sztangę i połóż ją na górnej części mięśni pleców (nie na kości karku). Chwyć ją nieco szerzej niż barki, łopatki ściągnięte.',
      'Wyprostuj nogi, by zdjąć sztangę, i zrób 2–3 małe kroki w tył. Stopy na szerokość barków, palce lekko na zewnątrz.',
    ],
    steps: [
      'Wdech i mocne napięcie brzucha (jakbyś spodziewał się ciosu).',
      'Zejdź w dół, zginając jednocześnie kolana i biodra. Kolana idą w kierunku palców stóp.',
      'Zejdź co najmniej do ud równolegle do podłogi – o ile plecy zostają proste.',
      'Wstań, napierając całą stopą. Klatka i biodra wznoszą się w tym samym tempie. Wydech na górze.',
    ],
    mistakes: [
      'Zaokrąglanie dolnej części pleców na dole („podwijanie” miednicy).',
      'Kolana uciekające do środka.',
      'Biodra unoszą się szybciej niż klatka – przysiad zamienia się w skłon.',
      'Ćwiczenie bez ustawionych zabezpieczeń.',
    ],
  },
  hack_squat: {
    name: 'Przysiad na maszynie hack', pat: 'squat', eq: ['maszyny'], load: 'mach', k: { m: 0.4, f: 0.25 }, lower: true, avoid: ['kolana'],
    muscles: 'Przód ud, pośladki',
    note: 'Podany ciężar to talerze dołożone na maszynę (bez wagi sań).',
    setup: [
      'Oprzyj plecy i barki o poduszki maszyny.',
      'Stopy na platformie na szerokość bioder, nieco przed tułowiem. Zwolnij blokadę.',
    ],
    steps: [
      'Wdech i powoli zejdź w dół do kąta ok. 90° w kolanach (niżej tylko, jeśli plecy zostają oparte).',
      'Wypchnij się w górę całą stopą, wydech.',
      'Na górze nie prostuj kolan do końca. Po serii zablokuj maszynę.',
    ],
    mistakes: [
      'Odrywanie pięt od platformy.',
      'Kolana uciekające do środka.',
      'Prostowanie kolan „na sztywno” na górze.',
    ],
  },

  // ───────────── NOGI: wzorzec biodrowy ─────────────
  db_rdl: {
    name: 'Rumuński martwy ciąg z hantlami', pat: 'hinge', eq: ['hantle'], load: 'db', k: { m: 0.15, f: 0.1 }, lower: true, avoid: ['ledzwia'],
    muscles: 'Tył ud, pośladki, prostowniki grzbietu',
    setup: [
      'Stań prosto, stopy na szerokość bioder, hantle trzymane przed udami.',
      'Lekko ugnij kolana – to ugięcie zostaje takie samo przez cały ruch.',
    ],
    steps: [
      'Wdech i napnij brzuch.',
      'Wypchnij biodra do tyłu (jakbyś zamykał pośladkami drzwi za sobą). Hantle suną blisko nóg.',
      'Plecy cały czas proste. Schodź, aż poczujesz mocne rozciągnięcie z tyłu ud – zwykle hantle są wtedy na wysokości kolan lub połowy goleni.',
      'Wróć do pionu, wypychając biodra do przodu i ściskając pośladki. Wydech.',
    ],
    mistakes: [
      'Zaokrąglanie pleców – skróć ruch.',
      'Zginanie kolan jak w przysiadzie.',
      'Hantle oddalające się od nóg.',
      'Odchylanie się do tyłu na górze.',
    ],
  },
  bb_rdl: {
    name: 'Rumuński martwy ciąg ze sztangą', pat: 'hinge', eq: ['sztanga'], load: 'bb', k: { m: 0.5, f: 0.35 }, lower: true, avoid: ['ledzwia'],
    muscles: 'Tył ud, pośladki, prostowniki grzbietu',
    note: 'Pusta sztanga olimpijska waży 20 kg – wliczaj ją w ciężar.',
    setup: [
      'Zdejmij sztangę ze stojaków ustawionych na wysokości bioder (nie podnoś jej z podłogi).',
      'Chwyt nachwytem tuż na zewnątrz ud, stopy na szerokość bioder, kolana lekko ugięte.',
    ],
    steps: [
      'Wdech i napnij brzuch, łopatki lekko ściągnięte.',
      'Wypychaj biodra do tyłu, a sztanga sunie po udach w dół.',
      'Plecy proste. Schodź do mocnego rozciągnięcia z tyłu ud (zwykle tuż poniżej kolan).',
      'Wróć, wypychając biodra do przodu i ściskając pośladki. Wydech.',
    ],
    mistakes: [
      'Zaokrąglanie pleców.',
      'Sztanga odjeżdżająca od nóg.',
      'Zamienianie ruchu w przysiad (za mocne zgięcie kolan).',
      'Odchylanie się do tyłu na górze.',
    ],
  },
  deadlift: {
    name: 'Martwy ciąg klasyczny', pat: 'hinge', eq: ['sztanga'], load: 'bb', minW: 40, k: { m: 0.7, f: 0.5 }, lower: true, avoid: ['ledzwia'], minExp: 2,
    muscles: 'Pośladki, tył ud, prostowniki grzbietu, plecy, przedramiona',
    note: 'Sztanga powinna leżeć na wysokości ok. połowy goleni (jak z talerzami 20 kg). Przy lżejszych, mniejszych talerzach podłóż je na podwyższenie.',
    setup: [
      'Sztanga na ziemi nad środkiem stopy (ok. 2–3 cm od goleni). Stopy na szerokość bioder.',
      'Chwyć sztangę nachwytem tuż na zewnątrz nóg.',
      'Opuść biodra, aż golenie dotkną sztangi. Plecy proste, klatka do przodu, łopatki „schowane do tylnych kieszeni”.',
    ],
    steps: [
      'Wdech i mocne napięcie brzucha.',
      'Pchaj podłogę nogami – sztanga sunie blisko nóg.',
      'Gdy sztanga minie kolana, wypchnij biodra do przodu i wyprostuj się (bez odchylania).',
      'Opuszczanie: najpierw biodra w tył, a gdy sztanga minie kolana – zegnij kolana. Odłóż sztangę i weź nowy oddech przed kolejnym powtórzeniem.',
    ],
    mistakes: [
      'Zaokrąglone plecy.',
      'Sztanga daleko od nóg.',
      'Szarpnięcie zamiast płynnego startu.',
      'Najpierw prostowanie nóg, a dopiero potem pleców (biodra „wyskakują” w górę).',
    ],
  },
  back_ext: {
    name: 'Wyprosty na ławce rzymskiej (45°)', pat: 'hinge', eq: ['maszyny'], load: 'bw', unit: 'reps', range: [10, 15], lower: true, avoid: ['ledzwia'],
    muscles: 'Pośladki, tył ud, prostowniki grzbietu',
    setup: [
      'Ustaw poduszkę tak, by jej górna krawędź była tuż pod kośćmi biodrowymi – zgięcie w biodrach musi być wolne.',
      'Pięty zaczep pod wałkami, ręce skrzyżuj na klatce.',
    ],
    steps: [
      'Z pozycji, w której ciało tworzy linię prostą, opuść tułów, zginając się w biodrach. Plecy proste.',
      'Wróć do linii prostej, napinając pośladki i tył ud.',
      'Nie wychodź wyżej niż linia ciała.',
    ],
    mistakes: [
      'Przeprost (wyginanie się) w lędźwiach na górze.',
      'Poduszka ustawiona za wysoko – blokuje ruch w biodrach.',
      'Szarpanie i bujanie.',
    ],
  },
  hip_thrust: {
    name: 'Hip thrust ze sztangą', pat: 'glute', eq: ['sztanga', 'lawka'], load: 'bb', k: { m: 0.5, f: 0.4 }, lower: true,
    muscles: 'Pośladki, tył ud',
    note: 'Załóż na sztangę grubą gąbkę (nakładkę), żeby nie uciskała bioder.',
    setup: [
      'Usiądź na podłodze, oprzyj dolne krawędzie łopatek o krawędź ławki.',
      'Przetocz sztangę z nakładką na zgięcie bioder.',
      'Stopy na szerokość bioder, w takiej odległości, by na górze golenie były pionowo.',
    ],
    steps: [
      'Wdech, napnij brzuch, broda lekko przy klatce.',
      'Wypchnij biodra w górę, napierając piętami, aż tułów i uda utworzą prostą linię.',
      'Ściśnij mocno pośladki na 1 sekundę.',
      'Powoli opuść biodra.',
    ],
    mistakes: [
      'Wyginanie się w lędźwiach na górze (wypychanie żeber) zamiast wyprostu bioder.',
      'Stopy za blisko lub za daleko.',
      'Odchylanie głowy do tyłu.',
      'Niedochodzenie do pełnego wyprostu bioder.',
    ],
  },
  glute_bridge: {
    name: 'Unoszenie bioder leżąc (mostek biodrowy)', pat: 'glute', eq: [], load: 'bw', unit: 'reps', range: [12, 20], lower: true,
    muscles: 'Pośladki, tył ud',
    note: 'Gdy robisz bez problemu 20 powtórzeń, połóż hantlę na biodrach.',
    setup: [
      'Połóż się na plecach, kolana ugięte, stopy płasko na podłodze na szerokość bioder, blisko pośladków.',
      'Ręce wzdłuż ciała.',
    ],
    steps: [
      'Napnij brzuch i, napierając piętami, unieś biodra, aż barki, biodra i kolana będą w linii.',
      'Ściśnij pośladki na 1–2 sekundy.',
      'Powoli opuść biodra.',
    ],
    mistakes: [
      'Wyginanie się w lędźwiach zamiast pracy pośladków.',
      'Pchanie palcami zamiast piętami.',
    ],
  },

  // ───────────── NOGI: jednonóż ─────────────
  split_squat: {
    name: 'Przysiad wykroczny z hantlami', pat: 'lunge', eq: ['hantle'], load: 'db', k: { m: 0.08, f: 0.05 }, perSide: true, lower: true, avoid: ['kolana'],
    muscles: 'Przód ud, pośladki',
    note: 'Ciężar to jedna hantla – trzymasz po jednej w każdej ręce. Na start możesz też bez hantli.',
    setup: [
      'Hantle w dłoniach wzdłuż ciała.',
      'Zrób duży krok: jedna noga z przodu, druga z tyłu na palcach. Stopy na szerokość bioder – jak na torach, nie na jednej linii.',
    ],
    steps: [
      'Opuść się pionowo w dół, aż tylne kolano prawie dotknie podłogi.',
      'Przednie kolano jest nad stopą, tułów wyprostowany.',
      'Wstań, napierając przednią stopą.',
      'Zrób wszystkie powtórzenia jedną nogą, potem zmień nogi.',
    ],
    mistakes: [
      'Stopy na jednej linii – tracisz równowagę.',
      'Przednie kolano uciekające do środka.',
      'Uderzanie tylnym kolanem o podłogę.',
      'Za krótki krok.',
    ],
  },
  walking_lunge: {
    name: 'Wykroki chodzone z hantlami', pat: 'lunge', eq: ['hantle'], load: 'db', k: { m: 0.08, f: 0.05 }, perSide: true, lower: true, avoid: ['kolana'],
    muscles: 'Przód ud, pośladki',
    note: 'Ciężar to jedna hantla – trzymasz po jednej w każdej ręce. Na start możesz też bez hantli.',
    setup: [
      'Hantle w dłoniach wzdłuż ciała, stań prosto. Potrzebujesz kilku metrów wolnego miejsca.',
    ],
    steps: [
      'Zrób duży krok do przodu i opuść się, aż tylne kolano prawie dotknie podłogi.',
      'Przednie kolano nad stopą, tułów wyprostowany.',
      'Odepchnij się przednią nogą i dostaw tylną, wykonując od razu krok nią do przodu.',
      'Licz powtórzenia na każdą nogę.',
    ],
    mistakes: [
      'Za krótkie kroki – kolano wyjeżdża daleko przed palce.',
      'Kolano uciekające do środka.',
      'Chodzenie „po linie” – stawiaj stopy na szerokość bioder.',
    ],
  },
  step_up: {
    name: 'Wejścia na ławkę z hantlami', pat: 'lunge', eq: ['hantle', 'lawka'], load: 'db', k: { m: 0.06, f: 0.04 }, perSide: true, lower: true, avoid: ['kolana'],
    muscles: 'Przód ud, pośladki',
    note: 'Ciężar to jedna hantla – po jednej w każdej ręce. Ławka lub skrzynia na wysokość, przy której kolano jest zgięte ok. 90°.',
    setup: [
      'Stań przed stabilną ławką lub skrzynią, hantle wzdłuż ciała.',
      'Postaw całą stopę jednej nogi na ławce.',
    ],
    steps: [
      'Wejdź na ławkę, napierając piętą nogi stojącej na ławce. Nie odbijaj się tylną nogą.',
      'Wyprostuj się na górze.',
      'Powoli zejdź tą samą drogą.',
      'Zrób wszystkie powtórzenia jedną nogą, potem zmień.',
    ],
    mistakes: [
      'Odbijanie się nogą stojącą na podłodze.',
      'Kolano uciekające do środka.',
      'Zbyt wysoka ławka.',
    ],
  },

  // ───────────── NOGI: izolacje ─────────────
  lying_leg_curl: {
    name: 'Uginanie nóg leżąc na maszynie', pat: 'legcurl', eq: ['maszyny'], load: 'mach', k: { m: 0.3, f: 0.2 }, lower: true,
    muscles: 'Tył ud',
    setup: [
      'Połóż się na brzuchu tak, by kolana były tuż za krawędzią ławki (w osi obrotu maszyny).',
      'Wałek ustaw nad piętami (nad ścięgnem Achillesa). Trzymaj uchwyty.',
    ],
    steps: [
      'Zegnij nogi, przyciągając wałek w stronę pośladków.',
      'Zatrzymaj na chwilę na górze.',
      'Opuść powoli (2–3 s), biodra cały czas dociśnięte do ławki.',
    ],
    mistakes: [
      'Unoszenie bioder z ławki.',
      'Szarpanie i rzucanie ciężarem.',
      'Zbyt szybkie opuszczanie.',
    ],
  },
  seated_leg_curl: {
    name: 'Uginanie nóg siedząc na maszynie', pat: 'legcurl', eq: ['maszyny'], load: 'mach', k: { m: 0.35, f: 0.25 }, lower: true,
    muscles: 'Tył ud',
    setup: [
      'Usiądź, plecy oparte, kolana w osi obrotu maszyny.',
      'Dolny wałek nad piętami, górny docisk opuść na uda tuż nad kolanami.',
    ],
    steps: [
      'Zegnij nogi, ściągając wałek w dół i pod siedzisko.',
      'Zatrzymaj na chwilę.',
      'Powoli (2–3 s) wróć do wyprostu.',
    ],
    mistakes: [
      'Luźny górny docisk – uda się unoszą.',
      'Szarpanie.',
      'Niepełny ruch.',
    ],
  },
  leg_extension: {
    name: 'Prostowanie nóg na maszynie', pat: 'legext', eq: ['maszyny'], load: 'mach', k: { m: 0.35, f: 0.25 }, lower: true, avoid: ['kolana'], repFloor: 10,
    muscles: 'Przód ud (czworogłowe)',
    setup: [
      'Usiądź, plecy oparte. Oś obrotu maszyny na wysokości kolan.',
      'Wałek oprzyj na dole goleni, tuż nad kostkami. Trzymaj uchwyty.',
    ],
    steps: [
      'Wyprostuj nogi i zatrzymaj na 1 sekundę z napiętymi udami.',
      'Powoli (2–3 s) opuść.',
    ],
    mistakes: [
      'Kopanie z rozpędu.',
      'Odrywanie pośladków od siedziska.',
      'Zbyt duży ciężar.',
    ],
  },
  calf_machine: {
    name: 'Wspięcia na palce na maszynie', pat: 'calves', eq: ['maszyny'], load: 'mach', k: { m: 0.6, f: 0.4 }, lower: true, repFloor: 10,
    muscles: 'Łydki',
    setup: [
      'Barki pod poduszkami, przednia część stóp na krawędzi podestu, pięty swobodnie w powietrzu.',
      'Kolana proste, ale nie zablokowane.',
    ],
    steps: [
      'Opuść pięty jak najniżej i zatrzymaj na 1 sekundę w rozciągnięciu.',
      'Wspnij się na palce jak najwyżej i zatrzymaj na 1 sekundę.',
    ],
    mistakes: [
      'Sprężynowanie – odbijanie się na dole.',
      'Zginanie kolan.',
      'Za mały zakres ruchu.',
    ],
  },
  calf_db: {
    name: 'Wspięcia na palce z hantlami', pat: 'calves', eq: ['hantle'], load: 'db', k: { m: 0.15, f: 0.1 }, lower: true, repFloor: 10,
    muscles: 'Łydki',
    note: 'Ciężar to jedna hantla – po jednej w każdej ręce. Przednia część stóp na stopniu lub talerzu.',
    setup: [
      'Stań przednią częścią stóp na stopniu lub grubym talerzu, pięty w powietrzu.',
      'Hantle w dłoniach wzdłuż ciała (albo jedna hantla, a drugą ręką trzymaj się czegoś stabilnego).',
    ],
    steps: [
      'Opuść pięty jak najniżej i zatrzymaj na 1 sekundę.',
      'Wspnij się jak najwyżej i zatrzymaj na 1 sekundę.',
    ],
    mistakes: [
      'Sprężynowanie.',
      'Za mały zakres ruchu.',
    ],
  },
  calf_leg_press: {
    name: 'Wspięcia na palce na suwnicy', pat: 'calves', eq: ['maszyny'], load: 'mach', k: { m: 0.6, f: 0.4 }, lower: true, repFloor: 10,
    muscles: 'Łydki',
    note: 'Ciężar to talerze dołożone na suwnicę. Używaj umiarkowanego ciężaru – stopy muszą pewnie stać na platformie.',
    setup: [
      'Usiądź na suwnicy i postaw przednią część stóp na dolnej krawędzi platformy.',
      'Wyprostuj nogi (bez blokowania kolan) i zwolnij blokady.',
    ],
    steps: [
      'Pozwól platformie zgiąć stopy w Twoją stronę (rozciągnięcie łydek).',
      'Wypchnij platformę samymi stopami, jak najdalej. Kolana się nie ruszają.',
      'Po serii odstaw platformę na blokady.',
    ],
    mistakes: [
      'Zsuwanie się stóp z platformy – stawiaj je pewnie.',
      'Zginanie kolan.',
      'Zbyt duży ciężar.',
    ],
  },

  // ───────────── KLATKA ─────────────
  db_bench: {
    name: 'Wyciskanie hantli na ławce płaskiej', pat: 'hpush', eq: ['hantle', 'lawka'], load: 'db', k: { m: 0.15, f: 0.07 },
    muscles: 'Klatka piersiowa, przód barków, triceps',
    note: 'Ciężar to jedna hantla – po jednej w każdej ręce.',
    setup: [
      'Usiądź na końcu ławki z hantlami opartymi na udach.',
      'Połóż się, przenosząc hantle na wysokość klatki (pomóż sobie kolanami).',
      'Stopy płasko na podłodze, łopatki ściągnięte i „wbite” w ławkę.',
    ],
    steps: [
      'Wypchnij hantle nad klatkę (wydech).',
      'Opuszczaj powoli (2–3 s). Łokcie pod kątem ok. 45° od tułowia – nie rozkładaj ich na boki w linii barków.',
      'Zejdź do wysokości klatki, aż poczujesz rozciągnięcie.',
      'Wypchnij w górę, lekko zbliżając hantle do siebie.',
      'Po serii przyciągnij hantle do klatki, unieś kolana i usiądź – nie upuszczaj hantli na boki.',
    ],
    mistakes: [
      'Łokcie rozłożone szeroko na boki – obciąża barki.',
      'Odrywanie pośladków od ławki.',
      'Upuszczanie hantli po serii.',
      'Za płytki ruch.',
    ],
  },
  machine_chest_press: {
    name: 'Wyciskanie na maszynie siedząc', pat: 'hpush', eq: ['maszyny'], load: 'mach', k: { m: 0.4, f: 0.2 },
    muscles: 'Klatka piersiowa, przód barków, triceps',
    note: 'Maszyny różnią się między sobą – podany ciężar to punkt startowy.',
    setup: [
      'Ustaw siedzisko tak, by uchwyty były na wysokości środka klatki.',
      'Plecy oparte, łopatki ściągnięte.',
    ],
    steps: [
      'Wypchnij uchwyty przed siebie, bez blokowania łokci na końcu (wydech).',
      'Wracaj powoli, aż poczujesz rozciągnięcie klatki. Nie odkładaj ciężaru na stos między powtórzeniami.',
    ],
    mistakes: [
      'Siedzisko źle ustawione – uchwyty na wysokości barków lub brzucha.',
      'Odrywanie pleców od oparcia.',
      'Wysuwanie barków do przodu.',
    ],
  },
  bb_bench: {
    name: 'Wyciskanie sztangi na ławce płaskiej', pat: 'hpush', eq: ['sztanga', 'lawka'], load: 'bb', k: { m: 0.5, f: 0.3 }, avoid: ['barki'],
    muscles: 'Klatka piersiowa, przód barków, triceps',
    note: 'Ćwicz z asekuracją drugiej osoby albo w stojakach z ustawionymi zabezpieczeniami. Pusta sztanga waży 20 kg.',
    setup: [
      'Połóż się tak, by oczy były pod sztangą. Stopy płasko na podłodze, pośladki na ławce.',
      'Ściągnij łopatki do siebie i w dół. Lekki naturalny łuk w dolnej części pleców jest w porządku.',
      'Chwyć sztangę nieco szerzej niż barki (na dole przedramiona mają być pionowo), kciuki obejmują gryf.',
    ],
    steps: [
      'Zdejmij sztangę na prostych rękach nad barki.',
      'Wdech i opuść ją powoli na dolną część klatki. Łokcie ok. 45–70° od tułowia.',
      'Dotknij klatki bez odbijania i wypchnij sztangę w górę, lekko w stronę stojaków. Wydech.',
    ],
    mistakes: [
      'Odbijanie sztangi od klatki.',
      'Odrywanie pośladków od ławki.',
      'Nadgarstki mocno odgięte do tyłu.',
      'Łokcie rozłożone na boki pod kątem 90°.',
      'Ćwiczenie bez asekuracji lub zabezpieczeń.',
    ],
  },
  incline_db_press: {
    name: 'Wyciskanie hantli na ławce skośnej', pat: 'hpush', eq: ['hantle', 'lawka'], load: 'db', k: { m: 0.12, f: 0.06 },
    muscles: 'Górna część klatki, przód barków, triceps',
    note: 'Ciężar to jedna hantla – po jednej w każdej ręce.',
    setup: [
      'Ustaw oparcie ławki pod kątem ok. 30° (maks. 45°).',
      'Usiądź z hantlami na udach i połóż się, przenosząc je na wysokość klatki. Łopatki ściągnięte.',
    ],
    steps: [
      'Wypchnij hantle w górę nad barki (wydech).',
      'Opuszczaj powoli do górnej części klatki, łokcie ok. 45° od tułowia.',
      'Wypchnij ponownie, lekko zbliżając hantle.',
    ],
    mistakes: [
      'Za stromy kąt ławki – ćwiczenie przechodzi na barki.',
      'Łokcie rozłożone szeroko na boki.',
      'Odrywanie pośladków od ławki.',
    ],
  },
  push_up: {
    name: 'Pompki', pat: 'hpush', eq: [], load: 'bw', unit: 'reps', range: [6, 15], avoid: ['nadgarstki'],
    muscles: 'Klatka piersiowa, przód barków, triceps, brzuch',
    note: 'Za trudno? Rób pompki z dłońmi opartymi na ławce lub skrzyni – im wyżej, tym łatwiej.',
    setup: [
      'Dłonie nieco szerzej niż barki, ciało w linii prostej od głowy do pięt.',
      'Napnij brzuch i pośladki.',
    ],
    steps: [
      'Opuść się, prowadząc łokcie ok. 45° od tułowia, aż klatka prawie dotknie podłogi.',
      'Wypchnij się do wyprostu rąk.',
    ],
    mistakes: [
      'Opadające biodra.',
      'Wypięta w górę pupa.',
      'Łokcie rozłożone na boki.',
      'Niepełny zakres ruchu.',
    ],
  },
  pec_deck: {
    name: 'Rozpiętki na maszynie (butterfly)', pat: 'chest_iso', eq: ['maszyny'], load: 'mach', k: { m: 0.25, f: 0.15 }, repFloor: 10,
    muscles: 'Klatka piersiowa',
    setup: [
      'Ustaw siedzisko tak, by uchwyty były na wysokości klatki.',
      'Plecy oparte, łokcie lekko ugięte – to ugięcie się nie zmienia.',
    ],
    steps: [
      'Zbliż ręce przed sobą, jakbyś obejmował beczkę. Ściśnij klatkę na 1 sekundę.',
      'Powoli wróć do lekkiego rozciągnięcia – nie cofaj rąk dalej niż linia barków.',
    ],
    mistakes: [
      'Za duży zakres do tyłu – przeciąża barki.',
      'Zginanie i prostowanie łokci (ćwiczenie zamienia się w wyciskanie).',
      'Garbienie się i wysuwanie barków do przodu.',
    ],
  },
  cable_fly: {
    name: 'Rozpiętki na bramie (wyciągi)', pat: 'chest_iso', eq: ['wyciagi'], load: 'cable', k: { m: 0.1, f: 0.05 }, repFloor: 10,
    muscles: 'Klatka piersiowa',
    note: 'Ciężar podany na każdą stronę (każdy wyciąg osobno).',
    setup: [
      'Ustaw oba wyciągi na wysokości barków lub nieco wyżej, chwyć uchwyty.',
      'Zrób krok do przodu, stań w lekkim wykroku, tułów lekko pochylony. Łokcie lekko ugięte – i tak zostają.',
    ],
    steps: [
      'Zbliż dłonie łukiem przed sobą na wysokości dolnej części klatki. Ściśnij klatkę.',
      'Powoli wróć do lekkiego rozciągnięcia, ręce nie dalej niż linia barków.',
    ],
    mistakes: [
      'Zginanie łokci – robi się wyciskanie.',
      'Za duży zakres do tyłu.',
      'Bujanie tułowiem.',
    ],
  },

  // ───────────── BARKI ─────────────
  db_shoulder_press: {
    name: 'Wyciskanie hantli nad głowę siedząc', pat: 'vpush', eq: ['hantle', 'lawka'], load: 'db', k: { m: 0.1, f: 0.05 }, avoid: ['barki'],
    muscles: 'Barki, triceps',
    note: 'Ciężar to jedna hantla – po jednej w każdej ręce.',
    setup: [
      'Ustaw oparcie ławki pionowo lub prawie pionowo.',
      'Hantle na wysokości barków, dłonie skierowane do przodu, łokcie lekko przed tułowiem (nie całkiem na boki).',
    ],
    steps: [
      'Wypchnij hantle w górę, aż ręce będą prawie wyprostowane nad głową (wydech).',
      'Opuść powoli do wysokości brody/uszu.',
    ],
    mistakes: [
      'Wyginanie się w lędźwiach i odrywanie pleców od oparcia.',
      'Uderzanie hantlami o siebie na górze.',
      'Za ciężkie hantle i skrócony ruch.',
    ],
  },
  machine_shoulder_press: {
    name: 'Wyciskanie nad głowę na maszynie', pat: 'vpush', eq: ['maszyny'], load: 'mach', k: { m: 0.3, f: 0.15 }, avoid: ['barki'],
    muscles: 'Barki, triceps',
    note: 'Maszyny różnią się między sobą – podany ciężar to punkt startowy.',
    setup: [
      'Ustaw siedzisko tak, by uchwyty były na wysokości barków.',
      'Plecy oparte o oparcie.',
    ],
    steps: [
      'Wypchnij uchwyty w górę, bez blokowania łokci (wydech).',
      'Powoli wróć do wysokości barków.',
    ],
    mistakes: [
      'Odrywanie pleców od oparcia.',
      'Unoszenie barków do uszu.',
    ],
  },
  ohp: {
    name: 'Wyciskanie sztangi nad głowę stojąc', pat: 'vpush', eq: ['sztanga'], load: 'bb', k: { m: 0.35, f: 0.2 }, avoid: ['barki', 'ledzwia'], minExp: 1,
    muscles: 'Barki, triceps, górna część pleców, brzuch',
    note: 'Pusta sztanga waży 20 kg – wliczaj ją w ciężar.',
    setup: [
      'Sztanga na stojakach na wysokości górnej części klatki.',
      'Chwyt nieco szerzej niż barki, przedramiona pionowo. Sztanga leży na przodzie barków.',
      'Stopy na szerokość bioder, napięte pośladki i brzuch.',
    ],
    steps: [
      'Wdech. Wypchnij sztangę pionowo w górę, cofając lekko głowę, by gryf minął twarz.',
      'Gdy sztanga minie czoło, wsuń głowę „pod sztangę” – na górze sztanga jest nad środkiem stopy.',
      'Opuść kontrolowanie na przód barków. Wydech.',
    ],
    mistakes: [
      'Odchylanie się do tyłu (wyginanie lędźwi).',
      'Sztanga prowadzona daleko przed twarzą.',
      'Pomaganie sobie nogami.',
    ],
  },
  db_lateral_raise: {
    name: 'Unoszenie hantli bokiem', pat: 'lat_raise', eq: ['hantle'], load: 'db', k: { m: 0.05, f: 0.03 }, repFloor: 10,
    muscles: 'Boczna część barków',
    note: 'Ciężar to jedna hantla – po jednej w każdej ręce. Tu naprawdę wystarczą lekkie hantle.',
    setup: [
      'Stań prosto, hantle przy bokach, tułów lekko pochylony do przodu.',
      'Łokcie lekko ugięte.',
    ],
    steps: [
      'Unieś ręce bokiem do wysokości barków (nie wyżej), prowadząc ruch łokciami.',
      'Zatrzymaj na chwilę.',
      'Opuść powoli (2–3 s).',
    ],
    mistakes: [
      'Bujanie tułowiem i rzucanie hantlami.',
      'Za ciężkie hantle.',
      'Unoszenie barków do uszu.',
      'Unoszenie rąk wyżej niż barki.',
    ],
  },
  cable_lateral_raise: {
    name: 'Unoszenie ręki bokiem na wyciągu', pat: 'lat_raise', eq: ['wyciagi'], load: 'cable', k: { m: 0.04, f: 0.025 }, perSide: true, repFloor: 10,
    muscles: 'Boczna część barków',
    setup: [
      'Ustaw uchwyt wyciągu na najniższej wysokości. Stań bokiem do wyciągu.',
      'Chwyć uchwyt ręką dalszą od wyciągu – linka biegnie przed Tobą.',
    ],
    steps: [
      'Unieś rękę bokiem do wysokości barku, łokieć lekko ugięty.',
      'Opuść powoli. Zrób wszystkie powtórzenia, potem zmień rękę.',
    ],
    mistakes: [
      'Odchylanie tułowia.',
      'Unoszenie barku do ucha.',
      'Za duży ciężar.',
    ],
  },
  face_pull: {
    name: 'Przyciąganie linki do twarzy (face pull)', pat: 'rear_delt', eq: ['wyciagi'], load: 'cable', k: { m: 0.25, f: 0.15 }, repFloor: 10,
    muscles: 'Tył barków, górna część pleców, rotatory barku',
    setup: [
      'Załóż linkę na wyciąg ustawiony na wysokości czoła.',
      'Chwyć końce linki (kciuki skierowane do Ciebie), cofnij się, by linka była napięta.',
    ],
    steps: [
      'Przyciągnij linkę do twarzy, rozciągając ręce na boki – końce linki lądują obok uszu.',
      'Łokcie wysoko. Na końcu obróć dłonie na zewnątrz, jakbyś pokazywał biceps.',
      'Zatrzymaj na chwilę i powoli wróć.',
    ],
    mistakes: [
      'Łokcie opadają – ćwiczenie zamienia się w wiosłowanie.',
      'Odchylanie się tułowiem do tyłu.',
      'Za duży ciężar.',
    ],
  },
  reverse_pec_deck: {
    name: 'Odwrotne rozpiętki na maszynie', pat: 'rear_delt', eq: ['maszyny'], load: 'mach', k: { m: 0.2, f: 0.12 }, repFloor: 10,
    muscles: 'Tył barków, górna część pleców',
    setup: [
      'Usiądź twarzą do oparcia. Siedzisko ustaw tak, by uchwyty były na wysokości barków.',
      'Chwyć uchwyty, ręce prawie proste przed sobą.',
    ],
    steps: [
      'Odciągnij ręce łukiem na boki, do linii ciała.',
      'Zatrzymaj na chwilę i powoli wróć.',
    ],
    mistakes: [
      'Szarpanie i bujanie.',
      'Unoszenie barków do uszu.',
      'Odrywanie klatki od oparcia.',
    ],
  },
  db_rear_delt_fly: {
    name: 'Odwrotne rozpiętki z hantlami w opadzie', pat: 'rear_delt', eq: ['hantle'], load: 'db', k: { m: 0.05, f: 0.03 }, repFloor: 10,
    muscles: 'Tył barków, górna część pleców',
    note: 'Ciężar to jedna hantla – po jednej w każdej ręce.',
    setup: [
      'Usiądź na brzegu ławki i pochyl tułów prawie równolegle do podłogi (klatka blisko ud), plecy proste.',
      'Hantle zwisają pod Tobą, łokcie lekko ugięte.',
    ],
    steps: [
      'Unieś ręce na boki do wysokości barków.',
      'Powoli opuść.',
    ],
    mistakes: [
      'Prostowanie tułowia w trakcie ruchu.',
      'Za ciężkie hantle i rzucanie nimi.',
    ],
  },

  // ───────────── PLECY ─────────────
  cable_row: {
    name: 'Wiosłowanie siedząc na wyciągu', pat: 'hpull', eq: ['wyciagi'], load: 'cable', k: { m: 0.5, f: 0.35 },
    muscles: 'Środek pleców, najszersze grzbietu, tył barków, biceps',
    setup: [
      'Usiądź, stopy na podpórkach, kolana lekko ugięte. Chwyć uchwyt (najczęściej „V”).',
      'Tułów prosty, pionowo.',
    ],
    steps: [
      'Przyciągnij uchwyt do dolnej części brzucha, łokcie blisko tułowia. Ściągnij łopatki.',
      'Zatrzymaj na 1 sekundę.',
      'Powoli wróć do wyprostu rąk, pozwalając łopatkom się rozsunąć. Plecy zostają proste.',
    ],
    mistakes: [
      'Bujanie tułowiem w przód i w tył.',
      'Garbienie się.',
      'Ciągnięcie samymi rękami bez pracy łopatek.',
      'Unoszenie barków do uszu.',
    ],
  },
  db_row: {
    name: 'Wiosłowanie hantlem w podporze na ławce', pat: 'hpull', eq: ['hantle', 'lawka'], load: 'db', single: true, k: { m: 0.2, f: 0.1 }, perSide: true,
    muscles: 'Najszersze grzbietu, środek pleców, biceps',
    setup: [
      'Oprzyj kolano i dłoń tej samej strony na ławce, drugą nogę postaw na podłodze.',
      'Plecy proste, mniej więcej równolegle do podłogi. Hantla w wolnej ręce zwisa pod barkiem.',
    ],
    steps: [
      'Przyciągnij hantlę w stronę biodra („do kieszeni”), łokieć blisko tułowia.',
      'Zatrzymaj na chwilę i powoli opuść.',
      'Zrób wszystkie powtórzenia jedną ręką, potem zmień stronę.',
    ],
    mistakes: [
      'Skręcanie tułowia przy podnoszeniu.',
      'Szarpanie hantlą.',
      'Zaokrąglone plecy.',
      'Ciągnięcie do klatki zamiast do biodra.',
    ],
  },
  machine_row: {
    name: 'Wiosłowanie na maszynie z podparciem klatki', pat: 'hpull', eq: ['maszyny'], load: 'mach', k: { m: 0.4, f: 0.25 },
    muscles: 'Środek pleców, najszersze grzbietu, tył barków',
    note: 'Maszyny różnią się między sobą – podany ciężar to punkt startowy.',
    setup: [
      'Ustaw siedzisko tak, by uchwyty były na wysokości dolnej części klatki.',
      'Oprzyj klatkę o poduszkę.',
    ],
    steps: [
      'Przyciągnij uchwyty, prowadząc łokcie do tyłu. Ściągnij łopatki.',
      'Zatrzymaj na chwilę i powoli wróć.',
    ],
    mistakes: [
      'Odrywanie klatki od poduszki.',
      'Szarpanie.',
    ],
  },
  bb_row: {
    name: 'Wiosłowanie sztangą w opadzie', pat: 'hpull', eq: ['sztanga'], load: 'bb', k: { m: 0.45, f: 0.3 }, avoid: ['ledzwia'], minExp: 1,
    muscles: 'Plecy, tył barków, biceps, prostowniki grzbietu',
    note: 'Pusta sztanga waży 20 kg – wliczaj ją w ciężar.',
    setup: [
      'Chwyć sztangę nachwytem nieco szerzej niż barki. Stopy na szerokość bioder, kolana lekko ugięte.',
      'Pochyl tułów w biodrach do ok. 45°, plecy proste.',
    ],
    steps: [
      'Przyciągnij sztangę do dolnej części brzucha, łokcie do tyłu.',
      'Powoli opuść do wyprostu rąk. Tułów się nie podnosi.',
    ],
    mistakes: [
      'Prostowanie tułowia i bujanie przy każdym powtórzeniu.',
      'Zaokrąglone plecy.',
      'Za duży ciężar.',
    ],
  },
  lat_pulldown: {
    name: 'Ściąganie drążka wyciągu do klatki', pat: 'vpull', eq: ['wyciagi'], load: 'cable', k: { m: 0.5, f: 0.35 },
    muscles: 'Najszersze grzbietu, biceps, tył barków',
    setup: [
      'Ustaw wałek tak, by blokował uda.',
      'Chwyć drążek nachwytem, ok. 1,5 szerokości barków. Usiądź i lekko odchyl tułów (10–20°), klatka w górę.',
    ],
    steps: [
      'Ściągnij drążek do górnej części klatki, prowadząc łokcie w dół i do tyłu. Ściągnij łopatki w dół.',
      'Powoli wróć do pełnego wyprostu rąk.',
    ],
    mistakes: [
      'Ściąganie drążka za głowę.',
      'Bujanie się tułowiem.',
      'Barki uciekające do uszu.',
      'Niepełny ruch.',
    ],
  },
  assisted_pullup: {
    name: 'Podciąganie na maszynie z asystą', pat: 'vpull', eq: ['maszyny'], load: 'assist', k: { m: 0.5, f: 0.65 },
    muscles: 'Najszersze grzbietu, biceps',
    note: 'UWAGA: tu ciężar to POMOC maszyny. Im większy ciężar, tym łatwiej. Postęp = zmniejszanie ciężaru.',
    setup: [
      'Ustaw ciężar pomocy, uklęknij lub stań na platformie.',
      'Chwyć drążek nachwytem nieco szerzej niż barki.',
    ],
    steps: [
      'Podciągnij się, aż broda będzie nad drążkiem. Łopatki ściągaj w dół.',
      'Powoli opuść się do prawie pełnego wyprostu rąk.',
    ],
    mistakes: [
      'Bujanie się.',
      'Niepełny ruch.',
      'Barki uciekające do uszu.',
    ],
  },
  pull_up: {
    name: 'Podciąganie na drążku', pat: 'vpull', eq: ['drazek'], load: 'bw', unit: 'reps', range: [5, 10], avoid: ['barki'], minExp: 2,
    muscles: 'Najszersze grzbietu, biceps, brzuch',
    note: 'Nie robisz 5 powtórzeń? Zamień na ściąganie drążka albo podciąganie z asystą.',
    setup: [
      'Złap drążek nachwytem nieco szerzej niż barki i zawiśnij.',
      'Napnij brzuch i pośladki, ściągnij łopatki w dół.',
    ],
    steps: [
      'Podciągnij się, aż broda będzie nad drążkiem.',
      'Powoli opuść się do pełnego zwisu.',
    ],
    mistakes: [
      'Bujanie się i wymachy nogami.',
      'Połowiczny ruch.',
      'Wyciąganie szyi do drążka.',
    ],
  },

  // ───────────── RAMIONA ─────────────
  db_curl: {
    name: 'Uginanie ramion z hantlami', pat: 'biceps', eq: ['hantle'], load: 'db', k: { m: 0.1, f: 0.05 }, repFloor: 8,
    muscles: 'Biceps',
    note: 'Ciężar to jedna hantla – po jednej w każdej ręce.',
    setup: [
      'Stań prosto, hantle wzdłuż ciała, dłonie skierowane do przodu.',
      'Łokcie przy tułowiu – nie ruszają się.',
    ],
    steps: [
      'Zegnij ręce, unosząc hantle w stronę barków. Ściśnij biceps.',
      'Opuść powoli (2–3 s) do pełnego wyprostu.',
    ],
    mistakes: [
      'Bujanie tułowiem.',
      'Łokcie wysuwające się do przodu.',
      'Brak pełnego wyprostu na dole.',
    ],
  },
  hammer_curl: {
    name: 'Uginanie ramion z hantlami chwytem młotkowym', pat: 'biceps', eq: ['hantle'], load: 'db', k: { m: 0.1, f: 0.05 }, repFloor: 8,
    muscles: 'Biceps, mięsień ramienny, przedramiona',
    note: 'Ciężar to jedna hantla – po jednej w każdej ręce.',
    setup: [
      'Stań prosto, hantle wzdłuż ciała, kciuki skierowane do przodu (jak przy trzymaniu młotka).',
      'Łokcie przy tułowiu.',
    ],
    steps: [
      'Zegnij ręce, unosząc hantle w stronę barków. Dłonie cały czas w tym samym ustawieniu.',
      'Opuść powoli do pełnego wyprostu.',
    ],
    mistakes: [
      'Bujanie tułowiem.',
      'Łokcie uciekające do przodu.',
    ],
  },
  cable_curl: {
    name: 'Uginanie ramion na wyciągu', pat: 'biceps', eq: ['wyciagi'], load: 'cable', k: { m: 0.2, f: 0.12 }, repFloor: 8,
    muscles: 'Biceps',
    setup: [
      'Załóż prosty drążek lub linkę na dolny wyciąg. Stań blisko, prosto.',
      'Łokcie przy tułowiu.',
    ],
    steps: [
      'Zegnij ręce, przyciągając uchwyt w stronę barków.',
      'Opuść powoli do pełnego wyprostu.',
    ],
    mistakes: [
      'Odchylanie się do tyłu.',
      'Łokcie uciekające do przodu.',
    ],
  },
  ez_curl: {
    name: 'Uginanie ramion ze sztangą łamaną', pat: 'biceps', eq: ['sztanga'], load: 'bb', minW: 10, k: { m: 0.25, f: 0.15 }, repFloor: 8,
    muscles: 'Biceps',
    note: 'Gryf łamany waży zwykle 7–10 kg – wliczaj go w ciężar.',
    setup: [
      'Chwyć gryf łamany na wygiętych częściach, na szerokość barków (dłonie lekko skośnie).',
      'Stań prosto, łokcie przy tułowiu.',
    ],
    steps: [
      'Zegnij ręce, unosząc sztangę w stronę barków.',
      'Opuść powoli do pełnego wyprostu.',
    ],
    mistakes: [
      'Bujanie tułowiem.',
      'Łokcie wysuwające się do przodu.',
      'Skrócony ruch na dole.',
    ],
  },
  rope_pushdown: {
    name: 'Prostowanie ramion na wyciągu (linka)', pat: 'triceps', eq: ['wyciagi'], load: 'cable', k: { m: 0.25, f: 0.15 }, repFloor: 8,
    muscles: 'Triceps',
    setup: [
      'Załóż linkę na górny wyciąg. Stań blisko, tułów lekko pochylony.',
      'Łokcie przy bokach – przez cały ruch się nie ruszają.',
    ],
    steps: [
      'Wyprostuj ręce w dół, a na końcu rozsuń końce linki na boki.',
      'Zatrzymaj na chwilę.',
      'Powoli wróć, aż przedramiona będą mniej więcej równolegle do podłogi.',
    ],
    mistakes: [
      'Łokcie odjeżdżające od tułowia.',
      'Dociskanie ciężaru całym ciałem.',
      'Za duży ciężar.',
    ],
  },
  overhead_db_ext: {
    name: 'Prostowanie ramion z hantlą nad głową', pat: 'triceps', eq: ['hantle'], load: 'db', single: true, k: { m: 0.12, f: 0.07 }, avoid: ['barki', 'nadgarstki'], repFloor: 8,
    muscles: 'Triceps (zwłaszcza długa głowa)',
    setup: [
      'Usiądź na ławce z oparciem albo stań stabilnie.',
      'Chwyć jedną hantlę oburącz pod górnym talerzem i unieś ją nad głowę. Łokcie skierowane do przodu, blisko głowy.',
    ],
    steps: [
      'Opuść hantlę za głowę, zginając łokcie, aż poczujesz rozciągnięcie tricepsa.',
      'Wyprostuj ręce do góry.',
    ],
    mistakes: [
      'Łokcie rozjeżdżające się na boki.',
      'Wyginanie się w lędźwiach.',
      'Zbyt szybkie opuszczanie.',
    ],
  },
  overhead_cable_ext: {
    name: 'Prostowanie ramion nad głową na wyciągu', pat: 'triceps', eq: ['wyciagi'], load: 'cable', k: { m: 0.2, f: 0.12 }, avoid: ['barki'], repFloor: 8,
    muscles: 'Triceps (zwłaszcza długa głowa)',
    setup: [
      'Załóż linkę na wyciąg ustawiony mniej więcej na wysokości bioder lub niżej. Odwróć się tyłem do wyciągu.',
      'Linka za głową, zrób lekki wykrok i pochyl tułów do przodu. Łokcie przy głowie, skierowane do przodu.',
    ],
    steps: [
      'Wyprostuj ręce przed sobą/nad głową.',
      'Powoli wróć do zgięcia, aż poczujesz rozciągnięcie tricepsa.',
    ],
    mistakes: [
      'Łokcie rozjeżdżające się na boki.',
      'Ruch w barkach zamiast w łokciach.',
    ],
  },

  // ───────────── BRZUCH / TUŁÓW ─────────────
  plank: {
    name: 'Deska (plank)', pat: 'core', eq: [], load: 'bw', unit: 'time', range: [20, 40], maxTop: 90,
    muscles: 'Mięśnie brzucha i całego tułowia',
    setup: [
      'Oprzyj się na przedramionach (łokcie pod barkami) i palcach stóp.',
    ],
    steps: [
      'Ustaw ciało w linii prostej od głowy do pięt.',
      'Napnij brzuch (jakbyś spodziewał się ciosu) i pośladki.',
      'Oddychaj spokojnie i utrzymaj pozycję przez zadany czas.',
    ],
    mistakes: [
      'Opadające biodra – boli lędźwia.',
      'Pupa wypięta w górę.',
      'Wstrzymywanie oddechu.',
    ],
  },
  dead_bug: {
    name: 'Martwy robak (dead bug)', pat: 'core', eq: [], load: 'bw', unit: 'reps', range: [6, 10], perSide: true, maxTop: 16,
    muscles: 'Mięśnie brzucha (głębokie), stabilizacja tułowia',
    setup: [
      'Połóż się na plecach. Ręce wyprostowane w górę, nogi zgięte 90° w biodrach i kolanach.',
      'Dociśnij dolną część pleców do podłogi – ma tak zostać przez cały czas.',
    ],
    steps: [
      'Powoli prostuj przeciwną rękę i nogę (np. prawa ręka za głowę, lewa noga przed siebie) tuż nad podłogą. Wydech.',
      'Wróć do pozycji wyjściowej i zmień stronę.',
    ],
    mistakes: [
      'Odrywanie lędźwi od podłogi – skróć ruch.',
      'Zbyt szybkie tempo.',
    ],
  },
  side_plank: {
    name: 'Deska bokiem', pat: 'core', eq: [], load: 'bw', unit: 'time', range: [15, 30], perSide: true, maxTop: 60,
    muscles: 'Mięśnie skośne brzucha, boczna część tułowia',
    note: 'Za trudno? Rób z ugiętymi kolanami (podpór na kolanie zamiast na stopie).',
    setup: [
      'Połóż się na boku, łokieć pod barkiem, nogi proste ułożone jedna na drugiej.',
    ],
    steps: [
      'Unieś biodra, aby ciało tworzyło linię prostą.',
      'Utrzymaj pozycję przez zadany czas, oddychając spokojnie. Potem druga strona.',
    ],
    mistakes: [
      'Opadające biodra.',
      'Obracanie tułowia do przodu.',
    ],
  },
  pallof_press: {
    name: 'Pallof press (anty-rotacja na wyciągu)', pat: 'core', eq: ['wyciagi'], load: 'cable', k: { m: 0.12, f: 0.08 }, perSide: true, range: [8, 12],
    muscles: 'Mięśnie brzucha, skośne, stabilizacja tułowia',
    setup: [
      'Ustaw wyciąg na wysokości klatki. Stań bokiem, chwyć uchwyt oburącz przy mostku.',
      'Odsuń się w bok, aż linka będzie napięta. Stopy na szerokość barków, kolana lekko ugięte.',
    ],
    steps: [
      'Wypchnij ręce przed siebie i utrzymaj 2 sekundy – nie pozwól, by wyciąg obrócił Twój tułów.',
      'Wróć rękami do mostka.',
      'Zrób wszystkie powtórzenia, potem odwróć się drugim bokiem.',
    ],
    mistakes: [
      'Obracanie tułowia w stronę wyciągu.',
      'Za duży ciężar.',
    ],
  },
  cable_crunch: {
    name: 'Spięcia brzucha na wyciągu klęcząc', pat: 'core', eq: ['wyciagi'], load: 'cable', k: { m: 0.4, f: 0.3 }, range: [10, 15],
    muscles: 'Mięśnie proste brzucha',
    setup: [
      'Załóż linkę na górny wyciąg. Uklęknij przodem do wyciągu.',
      'Trzymaj końce linki przy głowie.',
    ],
    steps: [
      'Zwiń tułów w dół, zbliżając łokcie do ud (tu zaokrąglenie pleców jest celowe). Wydech.',
      'Biodra się nie ruszają.',
      'Powoli wróć.',
    ],
    mistakes: [
      'Siadanie na piętach – ruch w biodrach zamiast w brzuchu.',
      'Ciągnięcie rękami.',
    ],
  },
  bird_dog: {
    name: 'Bird dog (wyprost ręki i nogi w klęku)', pat: 'core', eq: [], load: 'bw', unit: 'reps', range: [6, 10], perSide: true, maxTop: 15,
    muscles: 'Stabilizacja tułowia, prostowniki grzbietu, pośladki',
    setup: [
      'Klęk podparty: dłonie pod barkami, kolana pod biodrami, plecy proste.',
    ],
    steps: [
      'Powoli wyprostuj przeciwną rękę i nogę do linii tułowia.',
      'Zatrzymaj na 2 sekundy i wróć. Zmień stronę.',
      'Biodra się nie obracają – wyobraź sobie szklankę wody na plecach.',
    ],
    mistakes: [
      'Obracanie bioder.',
      'Unoszenie nogi wyżej niż linia tułowia (wyginanie lędźwi).',
    ],
  },
};

if (typeof module !== 'undefined') module.exports = { EXERCISES, EQUIPMENT, INJURIES };
