# Specyfikacja geometryczna gniazda SCHUKO dla modelu 3D

Gniazdo SCHUKO (CEE 7/3, typ F) jest w pełni zdefiniowane geometrycznie przez trzy kluczowe wymiary — **rozstaw osi bolców 19,0 mm**, **średnicę bolca 4,8 mm** oraz **głębokość okrągłej wnęki 17,5 mm** — z dwoma bocznymi stykami ochronnymi PE w formie sprężystych klipsów umieszczonych na przeciwległych bokach kołnierza wnęki, odsuniętych o **16 mm** od osi łączącej bolce. Te wartości są niezmienne w całej branży: wynikają z niemieckich norm DIN 49440-1 (gniazdo) i DIN 49441 (wtyczka), raportu technicznego IEC/TR 60083 oraz arkuszy CEE Publication 7. Wszystkie karty katalogowe producentów europejskich (Gira, Berker, Jung, Busch-Jaeger, Merten, Legrand, Schneider) i polskich (Kontakt-Simon, Ospel) respektują te same wymiary samej wnęki — różnią się jedynie wymiarami ramki zewnętrznej i głębokością montażową. Istotna uwaga dla użytkownika: **podłużny otwór "na kciuk" widoczny na referencyjnym obrazku NIE jest elementem znormalizowanym** — to opcjonalny detal wzorniczy niektórych producentów, nieregulowany przez DIN 49440-1, i w typowej konfiguracji ze stykami PE w osi pionowej należy go umieścić po boku płytki czołowej, żeby nie kolidował z klipsem uziemiającym.

## Ramy normatywne i ich status

Dla polskiego rynku obowiązuje hierarchia norm, w której **PN-IEC 60884-1:2006** (wraz z zmianami A1:2009 i A2:2016-01) stanowi normę "parasolową" regulującą wymagania bezpieczeństwa, badania i definicje, ale **nie definiuje konkretnej geometrii Schuko**. Geometrię samego systemu CEE 7/3 / CEE 7/4 podają niemieckie normy DIN 49440-1:2006-01 (gniazdo — wymiary główne), DIN 49441:1972-06 (wtyczka — wymiary główne) oraz DIN VDE 0620-1:2021-02 (bezpieczeństwo, od 2016 wymóg przesłon w Niemczech). Zbiorczym źródłem katalogowym jest raport **IEC/TR 60083** (wyd. 6, maj 2004), który zastąpił oryginalne arkusze CEE Publication 7. **IEC 60906-1** jest niezwiązana — to proponowany, w Europie nieprzyjęty, uniwersalny standard gniazda. Dla Polski istotne są dodatkowo PN-E-93201:2021-05 (gniazda i wtyczki 250 V / ≤16 A — głównie typ E) oraz Rozporządzenie Ministra Infrastruktury z 12.04.2002 (Dz.U. 2022 poz. 1225) § 189, które **nie preferuje Schuko ani typu E** — oba są legalne. Mit "zakazu Schuko w Polsce" nie ma podstawy prawnej (potwierdzone przez pomiarywelektryce.pl).

**Kluczowe ograniczenie epistemiczne:** pełne rysunki z tolerancjami w setnych milimetra są zawarte wyłącznie w płatnych normach DIN/IEC. Wartości nominalne są powszechnie publikowane i zgodne między źródłami; tolerancje w tym raporcie opierają się na danych wtórnych (sprawdziany LISUN, VDE, opisy producentów).

## Wymiary bolców wtyczki CEE 7/4 i otworów gniazda CEE 7/3

Geometria bolców jest całkowicie znormalizowana — producent musi je odtworzyć dokładnie, żeby wtyczka przechodziła test sprawdzianu (gauge). Bolce są **pełne, walcowe, gładkie, z lekko zaokrągloną końcówką**, nieizolowane na całej długości (w przeciwieństwie do Europlug CEE 7/16).

| Parametr | Nominał | Tolerancja | Źródło |
|---|---|---|---|
| Średnica bolca L/N (wtyczka) | **Ø 4,80 mm** | −0,05 / +0,00 mm | DIN 49441, CEE 7/4, Wikipedia EN/DE, sprawdzian LISUN C18 |
| Długość bolca | **19,0 mm** | +0,5 / −0,0 mm | DIN 49441; handel: spotyka się 18,5 mm dla DIY |
| Rozstaw osi bolców | **19,0 mm** | ±0,1 mm (krytyczne) | DIN 49441, CEE 7/3, worldstandards.eu |
| Średnica otworu w gnieździe | **Ø 5,0 mm** | (z luzem montażowym) | katalogi producentów, wymóg ≥4,8 mm + luz |
| Głębokość otworu | **≥ 19 mm** | musi pomieścić cały bolec | wynika z długości bolca |

Otwory na bolce są **okrągłe, symetryczne, niepolaryzowane** — wtyczka może być włożona w dwóch orientacjach obróconych o 180°. Dla lepszego wprowadzenia bolca często stosuje się stożkowe fazowanie wejścia otworu (~5,0–5,2 mm na powierzchni kołnierza, zwężające się do Ø 5,0 mm w głąb). Wartość Ø 4,0 mm spotykana w niektórych źródłach dotyczy wyłącznie Europlug CEE 7/16 / starego GOST — **prawidłowa wtyczka Schuko CEE 7/4 ma Ø 4,80 mm**.

## Wnęka okrągła, kołnierz i wcięcia prowadzące

Wnęka Schuko jest najbardziej charakterystycznym elementem geometrycznym — to okrągła "miska" o głębokości **17,5 mm**, wewnątrz której leżą otwory bolców, a na jej przeciwległych bokach w ściance siedzą sprężynujące styki PE. Powszechnie cytowana wartość 15 mm (worldstandards.eu) jest **błędna** — dotyczy francuskiego CEE 7/5, nie Schuko.

| Element | Wymiar | Źródło / uwaga |
|---|---|---|
| Głębokość wnęki (od lica kołnierza do dna) | **17,5 mm** | Wikipedia EN Schuko, HandWiki, Morvan Trading, DBpedia — zgodne |
| Średnica wewnętrzna wnęki (okrągły walec, w który wchodzi korpus wtyczki) | **≈ Ø 35 mm** (typowo 34,5–35,5 mm) | Porównanie z IEC 60906-1 ("face area ≈10 cm²"), MS HD Power, wymiar frezu montażowego wariantu panelowego |
| Średnica kołnierza zewnętrznego (obejma z wycięciami na styki PE) | **≈ Ø 45–46 mm** | katalog BIA (panel cut-out Ø 45 mm), plugsocketmuseum |
| Wysokość kołnierza nad powierzchnią płytki czołowej ("Berührungsschutz") | **≈ 19 mm** | dewiki.de, brand-feuer.de — wyraźna cecha "erhöhter Berührungsschutz" DIN VDE 0620 |
| Wcięcia prowadzące (guiding notches) na bokach wnęki — pozycja | godzina 3 i 9 (oś prostopadła do osi PE) | Wikipedia, plugsocketmuseum — uniemożliwiają wsunięcie okrągłej wtyczki CEE 7/2 / CEE 7/5 |
| Promień zaokrąglenia krawędzi wnęki | **~1 mm** (typowo, nie znormalizowane) | oszacowanie z rysunków katalogowych |

**Rozróżnienie dwóch "średnic":** wewnątrz kołnierza o średnicy ~45–46 mm znajduje się właściwy okrągły walec wnęki o średnicy ~35 mm — to do niego wsuwa się plastikowy korpus wtyczki. Różnica ~5 mm po każdej stronie to właśnie miejsce, gdzie w kołnierzu są wycięcia (sloty) dla styków PE (góra/dół) oraz płaskie powierzchnie dla wcięć prowadzących (boki). Dla modelu 3D można przyjąć: **walec wewnętrzny Ø 35 mm × głębokość 17,5 mm**, osadzony centralnie w **kołnierzu Ø 45 mm** wystającym ~19 mm ponad poziom płytki czołowej.

## Styki ochronne PE i ich geometria

Schuko realizuje uziemienie nie przez bolec, lecz przez **dwa sprężyste metalowe klipsy (Erdungsclips / earthing clips)** umieszczone po przeciwległych stronach kołnierza wnęki. Stykają się one z płaskimi polami kontaktowymi znajdującymi się na bokach korpusu wtyczki CEE 7/4. Kluczową cechą bezpieczeństwa jest **zasada "earth-first"** — styki PE są dłuższe w osi wsunięcia niż bolce L/N, więc **połączenie uziemienia następuje przed kontaktem elektrycznym prądu**.

**Pozycja styków PE:** na osi prostopadłej do linii łączącej bolce L i N, czyli — jeśli bolce leżą na osi poziomej — styki PE są na osi pionowej (**godziny 12 i 6**). Konwencjonalnie pionowo zamontowane pojedyncze gniazdo ma PE góra-dół. **Gniazdo jest w pełni symetryczne (symetria dihedralna D2)** — nie istnieje "prawidłowa" orientacja L vs N.

| Parametr styku PE | Wartość | Pewność |
|---|---|---|
| Odległość każdego styku PE od środka wnęki (promień) | **16,0 mm** od osi L–N; styk siedzi na krawędzi wnęki (~17,5 mm) | Wikipedia, worldstandards.eu — potwierdzone |
| Rozpiętość styków PE (od klipsa do klipsa, przez środek) | **32,0 mm** (2 × 16 mm) | wynika z symetrii |
| Długość styku (wzdłuż osi wsunięcia wtyczki) | **~10–14 mm** | oszacowanie z modeli CAD i obserwacji produktów; dokładne wymiary są w płatnym DIN 49440-1 |
| Szerokość styku (tangencjalnie wzdłuż kołnierza) | **~6–8 mm** | j.w. |
| Grubość blaszki (mosiądz / brąz fosforowy) | **0,5–0,8 mm** | typowe dla sprężynowego brązu |
| Szerokość wycięcia/slotu w kołnierzu dla styku | **~8–10 mm** | szerszy niż styk na wtyczce |
| Wystawanie sprężyny do wnętrza wnęki | **~3–5 mm** (w stanie nienapiętym) | aby zapewnić kontakt zanim bolec sięgnie styku L/N |

## Position matrix — układ współrzędnych dla modelu 3D

Przyjmując **środek wnęki jako punkt (0, 0, 0)**, oś X pozioma, Y pionowa, Z prostopadła do płaszczyzny gniazda (ku użytkownikowi):

```
                    Y ↑
                    │
              ┌─────────────┐
              │ ▓ STYK PE ▓ │  ← klip górny, y ≈ +16 (powierzchnia kontaktu)
              │             │     slot w kołnierzu, szer. ~9 mm
         ┌────┘             └────┐
         │                       │   ← wcięcie boczne (guide)
      ───●──────── ● ──────── ●─── → X     y = 0
         │     (−9.5, 0) (+9.5, 0)  │
         └────┐             ┌────┘
              │             │
              │ ▓ STYK PE ▓ │  ← klip dolny, y ≈ −16
              └─────────────┘
```

| Element | Współrzędne (x, y) w mm | Komentarz |
|---|---|---|
| Środek wnęki | (0, 0) | punkt odniesienia |
| Otwór bolca "lewego" | **(−9,5, 0)** | średnica Ø 5,0 mm |
| Otwór bolca "prawego" | **(+9,5, 0)** | średnica Ø 5,0 mm |
| Styk PE górny (powierzchnia kontaktu) | **(0, +16,0)** | klips w ściance wnęki |
| Styk PE dolny (powierzchnia kontaktu) | **(0, −16,0)** | klips w ściance wnęki |
| Slot w kołnierzu dla PE górnego (środek) | (0, +17,5) | przerwa ~9 mm szerokości w kołnierzu |
| Slot w kołnierzu dla PE dolnego (środek) | (0, −17,5) | j.w. |
| Wcięcie prowadzące lewe (środek) | (−17,5, 0) | na krawędzi wnęki |
| Wcięcie prowadzące prawe (środek) | (+17,5, 0) | na krawędzi wnęki |
| Krawędź wewnętrzna wnęki (walec) | promień 17,5 mm | Ø 35 mm |
| Krawędź zewnętrzna kołnierza | promień 22,5 mm | Ø 45 mm |

Oś Z: dno wnęki na z = −17,5 mm; lice kołnierza na z = 0; szczyt kołnierza wystający ~19 mm (dla wariantu z podwyższoną ochroną przed dotknięciem). Bolec trójkąta L–N–PE tworzy równoramienny trójkąt o podstawie 19 mm i wysokości 16 mm, z bokami ≈ **18,6 mm**. **Kąt między linią PE a linią L–N wynosi dokładnie 90°.**

## Mocowanie, puszka i ramka zewnętrzna

Geometria montażowa **nie jest częścią systemu Schuko** — jest regulowana odrębnie (PN-EN 60670-1) i różni się między producentami. W Polsce powszechnie stosowana jest puszka podtynkowa o znamionowej średnicy **Ø 60 mm** (rzeczywiście 62–63 mm zewnętrznie) z rozstawem otworów mocujących mechanizm **60,0 mm** między osiami śrub. Rozstaw osi puszek wielokrotnych wynosi **71 mm** (europejski standard ramek).

| Element montażowy | Wymiar | Uwagi |
|---|---|---|
| Średnica znamionowa puszki (PL) | Ø 60 mm (rzeczywista 62–63 mm) | PN-EN 60670-1; producenci: Simet, Pawbol, Elektro-Plast |
| Rozstaw śrub mocujących mechanizm | **60,0 mm** | standard europejski, wszyscy producenci |
| Rozstaw osi puszek w zestawie wielokrotnym | **71,0 mm** | dla ramek wielokrotnych |
| Głębokość puszki płytkiej / głębokiej | 40–43 mm / 60–65 mm | PL warianty |
| Pierścień nośny niemiecki (Tragring) | 71 × 71 mm | Gira, Berker, Jung, Busch-Jaeger, Merten |
| Moduł polski | 45 × 45 mm | Kontakt-Simon, Ospel — mechanizm |
| Ramka zewnętrzna pojedyncza (widoczna) | 80–86 × 80–86 mm (typ. 81 × 81) | różni się między producentami |
| Głębokość montażowa mechanizmu | 24–41 mm | Simon 54: 24; Gira: 29; Berker: 32; Merten/Schneider: 40–41 |
| Stopień ochrony w łazience (strefa 2+) | ≥ IP44 | Dz.U. 2022 poz. 1225 |

## Otwór "na kciuk" — analiza referencyjnego obrazka

Kluczowe ustalenie: **podłużny otwór na kciuk widoczny w modelu użytkownika NIE JEST ELEMENTEM ZNORMALIZOWANYM** w systemie CEE 7/3. Ani DIN 49440-1, ani PN-IEC 60884-1 nie definiują takiej szczeliny. Przeszukanie katalogów Gira, Berker, Jung, Busch-Jaeger, Merten, Schneider, Legrand, Kontakt-Simon i Ospel **nie ujawniło żadnej standardowej serii Schuko ze szczeliną na kciuk w płytce czołowej**.

Niemiecki termin techniczny to **"Griffmulde"** lub "Daumenmulde" (wgłębienie chwytne); polska nazwa nie jest utrwalona — w katalogach spotyka się opis "wycięcie ułatwiające wyjmowanie wtyczki". Producenci rozwiązują ergonomię wyciągania wtyczki **innymi sposobami**: (a) Busch-Jaeger "Platform 63" — mechanizm wypychający wtyczkę; (b) Gira Safety Plus — ergonomiczne dźwignie zwalniające; (c) Griffmulde **we wtyczce** (a nie w gnieździe); (d) gniazda obrócone o 30° dla wtyczek kątowych. Griffmulda jako szczelina w gnieździe pojawia się natomiast w listwach wielogniazdowych (Steckdosenleisten) i standardowo w brytyjskim typie G (BS 1363).

**Rekomendacja geometryczna dla modelu:** Jeśli użytkownik chce zachować ten detal wzorniczy, przy standardowej orientacji (PE góra/dół, bolce w poziomie) szczelina na kciuk **nie może być umieszczona centralnie u góry wnęki** — kolidowałaby z górnym stykiem PE i górnym slotem w kołnierzu. Poprawne rozwiązania to: umieszczenie szczeliny **poza promieniem kołnierza 22,5 mm** (czyli >22,5 mm od osi Y na płytce czołowej), albo **obrócenie całego gniazda o 90°** (styki PE na bokach, bolce w pionie), co pozwala umieścić szczelinę u góry bez konfliktu. Typowe wymiary takiej szczeliny w produktach, gdzie występuje: **szerokość 8–12 mm, długość 15–25 mm, promień zaokrągleń końców = ½ szerokości (tzw. slot o pełnych półokrągłych końcach)**.

## Tolerancje krytyczne dla kompatybilności

Żeby model 3D był fizycznie kompatybilny z realną wtyczką CEE 7/4, muszą być zachowane następujące dopuszczalne zakresy. Wartości poza tymi granicami albo uniemożliwią włożenie wtyczki, albo spowodują niepewny kontakt.

| Wymiar | Wartość nominalna | Min | Max |
|---|---|---|---|
| Rozstaw otworów L–N | 19,00 mm | 18,90 | 19,10 |
| Średnica otworu na bolec | 5,00 mm | 4,90 | 5,20 |
| Głębokość otworu | 19,0 mm | 19,0 | — |
| Głębokość wnęki | 17,5 mm | 17,0 | 18,0 |
| Średnica wewnętrzna wnęki (walec) | 35,0 mm | 34,5 | 35,5 |
| Odsunięcie styku PE od osi L–N | 16,0 mm | 15,8 | 16,2 |
| Szerokość slotu PE w kołnierzu | 9,0 mm | 8,0 | 10,0 |
| Siła wyciągania wtyczki (referencja elektryczna, nie geometryczna) | — | 1,5 N | 15 N (VDE 0620-1) |

Wartości te agregują dane z DIN 49440-1, DIN 49441 oraz standardowych praktyk producenckich. Dla użytku CAD kluczowe jest trzymanie się **dokładnie** rozstawu 19,0 mm i offsetu PE 16,0 mm — to są wymiary sprawdzane przez normatywne gauge'e.

## Podsumowanie i decyzje projektowe

Model 3D zgodny z SCHUKO CEE 7/3 wymaga trzech decyzji geometrycznych: **po pierwsze**, ustalenia orientacji — w większości wypadków bolce na osi poziomej, styki PE na osi pionowej (godz. 12/6). **Po drugie**, rozróżnienia dwóch "średnic gniazda" — wewnętrzny walec wnęki Ø 35 mm × głębokość 17,5 mm, w kołnierzu zewnętrznym Ø 45 mm z dwoma słotami (góra/dół, szer. ~9 mm) na styki PE i dwoma wcięciami prowadzącymi (boki, pozycje godz. 3/9). **Po trzecie**, rezygnacji z założenia, że szczelina "na kciuk" jest elementem normatywnym — jeśli użytkownik chce zachować ten detal z obrazka referencyjnego, powinien umieścić go na płytce czołowej **poza promieniem kołnierza wnęki** (czyli dalej niż 22,5 mm od środka), albo obrócić gniazdo o 90° w stosunku do konwencji.

Dla polskiego rynku nie istnieją odrębne wymiary geometryczne Schuko — polskie normy (PN-IEC 60884-1:2006 + A1/A2) regulują wymagania ogólne i bezpieczeństwa, ale geometria pozostaje zgodna z DIN 49440-1 / CEE 7/3. Specyficznie polskie są natomiast wymiary puszek (Ø 60 mm znamionowe) i rozstaw śrub mocujących mechanizm (60 mm), które dotyczą obudowy/ramki, a nie samej wnęki Schuko. W Polsce Schuko jest w pełni legalne — dopuszczone równorzędnie z typem E (CEE 7/5), a rozpowszechniona wtyczka hybrydowa **CEE 7/7** jest kompatybilna z oboma typami gniazd.

Finalna rekomendacja dla modelarza 3D: modeluj wnękę jako walec Ø 35 × 17,5 mm osadzony w cylindrycznym kołnierzu Ø 45 × h 19 mm; otwory bolców Ø 5,0 mm w pozycjach (±9,5, 0, 0) o głębokości 19 mm od dna wnęki; dwa klipsy PE jako prostokątne elementy 12 × 7 × 0,6 mm umieszczone w ściance wnęki na pozycjach (0, ±16, −z) z wystającą sprężyną ~4 mm ku środkowi; sloty w kołnierzu 9 × (wystarczająca głębokość) na tych samych pozycjach Y; wcięcia prowadzące na bokach (±17,5, 0). Ramka zewnętrzna może mieć dowolny wymiar w zakresie 80–86 mm kwadratowa, zależnie od wybranej estetyki producenckiej. Szczelina na kciuk — jeśli zachowana — ulokowana poza promieniem 22,5 mm, typowo 10 × 22 mm z półokrągłymi końcami.