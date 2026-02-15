# Suwaki Parametryczne — Katalog Pomysłów do Kształtowania Ramek

> **Cel dokumentu:** Zebrać jak najwięcej pomysłów na suwaki (slidery) parametryczne, które pozwalają kształtować geometrię ramek gniazdkowych w konfiguratorze 3D. Każdy pomysł zawiera opis efektu, zakres wartości, oraz instrukcje implementacji odwołujące się do istniejącej architektury (`FrameConfig`, `geometry.ts`, `Controls.tsx`).

---

## Legenda Priorytetów

| Priorytet | Znaczenie |
|---|---|
| 🟢 **EASY** | Można dodać modyfikując istniejący profil w `getOuterProfile()` / parametr w `generateFrameGeometry()` |
| 🟡 **MEDIUM** | Wymaga nowej logiki w `geometry.ts`, ale bez zmian architektonicznych |
| 🔴 **HARD** | Wymaga nowych modułów, CSG, lub złożonej matematyki |

---

## A. PROFIL ZEWNĘTRZNY — Kształt Rozetki (Widok z Góry)

### A1. 🟢 Asymetria Płatków (`petalAsymmetry`)
- **Zakres:** `0.0 – 1.0` (0 = symetryczne, 1 = maksymalna asymetria)
- **Efekt:** Każdy płatek jest lekko przesunięty kątowo, tworząc dynamiczny, "wirujący" wzor.
- **Implementacja:**
  ```typescript
  // W generateFrameGeometry(), przy obliczaniu theta per slice:
  const asymOffset = petalAsymmetry * Math.sin(petals * theta) * (Math.PI / petals / 4);
  const effectiveTheta = theta + asymOffset;
  // Użyj effectiveTheta zamiast theta w obliczaniu rawWave
  ```

### A2. 🟢 Skręt Płatków (`petalTwist`)
- **Zakres:** `0° – 45°` 
- **Efekt:** Płatki obracają się progresywnie wzdłuż osi Z — na dole kąt 0°, na górze kąt `petalTwist`. Efekt „wiatraka".
- **Implementacja:**
  ```typescript
  // W pętli po slices, theta zależy od z:
  const twistAtZ = (z / maxHeight) * petalTwist * (Math.PI / 180);
  const twistedTheta = theta + twistAtZ;
  // Przelicz rawWave z twistedTheta
  ```

### A3. 🟢 Modulacja Amplitudy Płatków (`petalAmplitudeVariation`)
- **Zakres:** `0.0 – 0.5`
- **Efekt:** Co drugi płatek jest mniejszy/większy, tworząc wzór „duży-mały-duży-mały".
- **Implementacja:**
  ```typescript
  // W obliczaniu currentOuterRadius:
  const altWave = Math.cos(petals * theta / 2); // co-drugi harmonik
  const ampMod = 1 - petalAmplitudeVariation * (0.5 + 0.5 * altWave);
  const currentOuterRadius = rOuterMax * (1 - petalIndentation * ampMod * (1 - petalMod));
  ```

### A4. 🟡 Kształt Płatka — Superellipse (`petalShape`)
- **Zakres:** `0.5 – 4.0` (< 1 = gwiazdka, 1 = koło, 2 = zaokrąglony kwadrat, 4 = prawie kwadrat)
- **Efekt:** Zmienia kształt obwiedni płatków z okrągłej na kwadratową (superkwadryka).
- **Implementacja:**
  ```typescript
  // Zamień Math.cos(petals * theta) na superellipse:
  const n = petalShape;
  const ct = Math.cos(petals * theta);
  const st = Math.sin(petals * theta);
  const rawWave = Math.sign(ct) * Math.pow(Math.abs(ct), 2/n);
  ```

### A5. 🟡 Fala Podwójna (`secondaryWave`)
- **Zakres:** `0.0 – 0.3` (amplituda drugiego harmoniku)
- **Efekt:** Nałożenie drugiej fali o wyższej częstotliwości na profil płatków — dodaje detale.
- **Implementacja:**
  ```typescript
  // Dodatkowy harmonik nałożony na rawWave:
  const secondaryFreq = petals * 3; // trzy razy więcej "ząbków"
  const secondary = secondaryWave * Math.cos(secondaryFreq * theta);
  const combinedWave = rawWave + secondary;
  ```

### A6. 🟡 Zaokrąglenie Wklęśnięć (`valleyRoundness`)
- **Zakres:** `0.0 – 1.0`
- **Efekt:** Osobne sterowanie zaokrągleniem dolin (wklęśnięć) niezależnie od wierzchołków płatków.
- **Implementacja:**
  ```typescript
  // Rozdziel petalRoundness na dwa parametry:
  // petalRoundness → zaokrąglenie szczytów
  // valleyRoundness → zaokrąglenie dolin
  const petalMod = rawWave > 0
    ? Math.pow(rawWave, 1 / (0.1 + petalRoundness * 2))
    : -Math.pow(Math.abs(rawWave), 1 / (0.1 + valleyRoundness * 2));
  ```

### A7. 🟢 Obrót Wzoru (`patternRotation`)
- **Zakres:** `0° – 360°`
- **Efekt:** Obraca cały wzór płatków o zadany kąt. Przydatne do wyrównania płatków z osią podziału moldu.
- **Implementacja:**
  ```typescript
  // Proste przesunięcie kąta:
  const rotatedTheta = theta + patternRotation * (Math.PI / 180);
  // Użyj rotatedTheta w rawWave = Math.cos(petals * rotatedTheta)
  ```

### A8. 🟡 Zęby Piły (`sawtoothBlend`)
- **Zakres:** `0.0 – 1.0` (0 = sinusoida, 1 = piła)
- **Efekt:** Tworzy ostre, asymetryczne płatki — jak zęby piły zamiast gładkich sinusoid.
- **Implementacja:**
  ```typescript
  const cosWave = Math.cos(petals * theta);
  const sawWave = 2 * ((petals * theta / (2 * Math.PI)) % 1) - 1;
  const rawWave = cosWave * (1 - sawtoothBlend) + sawWave * sawtoothBlend;
  ```

### A9. 🔴 Spirala Logarytmiczna (`spiralFactor`)
- **Zakres:** `0.0 – 0.5`
- **Efekt:** Promień rośnie logarytmicznie z kątem — płatki tworzą spiralę jak u muszli.
- **Implementacja:**
  ```typescript
  const spiralRadius = rOuterMax * Math.exp(spiralFactor * theta);
  // Clamp do rozsądnego zakresu, moduluj petalIndentation
  const currentOuterRadius = Math.min(spiralRadius, rOuterMax * 1.3) * (1 - petalIndentation * (1 - petalMod));
  ```

### A10. 🟡 Splot Kwiatowy (`interleaveCount`)
- **Zakres:** `0 – 3` (integer, liczba warstw)
- **Efekt:** Nakłada wiele zestawów płatków przesunięte kątowo — jak w kwiatach wielowarstwowych (róża, dalia).
- **Implementacja:**
  ```typescript
  let combinedMod = 0;
  for (let layer = 0; layer <= interleaveCount; layer++) {
    const layerOffset = (layer / (interleaveCount + 1)) * (Math.PI / petals);
    const layerScale = 1 - layer * 0.15; // Każda warstwa nieco mniejsza
    combinedMod = Math.max(combinedMod, layerScale * (Math.cos(petals * (theta + layerOffset)) + 1) / 2);
  }
  ```

---

## B. PROFIL BOCZNY — Kształt Przekroju (Widok z Boku)

### B1. 🟢 Wypukłość Profilu (`profileConvexity`)
- **Zakres:** `-1.0 – 1.0` (ujemne = wklęsły, 0 = liniowy, dodatnie = wypukły)
- **Efekt:** Zmienia krzywiznę profilu bocznego — od miseczki po kopulasty.
- **Implementacja:**
  ```typescript
  // W getOuterProfile(), modyfikuj easing:
  // Zamień: const eased = 1 - Math.pow(1 - localT, 2);
  // Na parametryczną wersję:
  const power = 2 - profileConvexity * 1.5; // range: 0.5 – 3.5
  const eased = 1 - Math.pow(1 - localT, power);
  ```

### B2. 🟢 Pozycja Szczytu (`peakPosition`)
- **Zakres:** `0.1 – 0.8`
- **Efekt:** Przesuwa punkt najwyższy profilu — bliżej centrum lub bliżej krawędzi.
- **Implementacja:**
  ```typescript
  // Zamień stały peakT = 0.3 + (petalRoundness * 0.2) na:
  const peakT = peakPosition;
  // Reszta logiki getOuterProfile() bez zmian
  ```

### B3. 🟡 Plateau na Szczycie (`plateauWidth`)
- **Zakres:** `0.0 – 0.3`
- **Efekt:** Płaski odcinek na szczycie profilu — jak mesa/taras.
- **Implementacja:**
  ```typescript
  // W getOuterProfile(), dodaj strefę plateau:
  if (t >= peakT - plateauWidth/2 && t <= peakT + plateauWidth/2) {
    z = maxHeight; // Płaski szczyt
  } else if (t < peakT - plateauWidth/2) {
    // Normalny wznos
  } else {
    // Normalny spadek
  }
  ```

### B4. 🟢 Kąt Spadku Zewnętrznego (`outerDropAngle`)
- **Zakres:** `0° – 90°` (0 = łagodny, 90 = pionowy)  
- **Efekt:** Kontroluje stromość zewnętrznej krawędzi profilu.
- **Implementacja:**
  ```typescript
  // W getOuterProfile(), modyfikuj spadek za peakT:
  const dropPower = 1 + (outerDropAngle / 90) * 4; // range: 1 – 5
  const eased = Math.pow(Math.cos(localT * Math.PI / 2), dropPower);
  ```

### B5. 🟡 Fala na Profilu (`profileRipple`)
- **Zakres:** `0.0 – 2.0` (amplituda w mm)
- **Efekt:** Dodaje sinusoidalne "falowanie" na profilu bocznym — faktura falkowa.
- **Implementacja:**
  ```typescript
  // W getOuterProfile(), po obliczeniu z:
  const rippleFreq = 5; // ile fal na profilu
  z += profileRipple * Math.sin(t * rippleFreq * Math.PI * 2);
  z = Math.max(0, z);
  ```

### B6. 🟡 Kąt Nachylenia Wewnętrznej Krawędzi (`innerLipAngle`)
- **Zakres:** `0° – 30°`
- **Efekt:** Wewnętrzna krawędź ramki nachyla się do wewnątrz — tworzy "gzyms".
- **Implementacja:**
  ```typescript
  // W getOuterProfile(), modyfikuj pierwsze punkty profilowe (przy rInner):
  const lipOffset = stepHeight * Math.tan(innerLipAngle * Math.PI / 180);
  points[0] = { r: rInner - lipOffset, z: 0 };
  points[1] = { r: rInner, z: stepHeight };
  ```

### B7. 🟢 Wysokość Relifu (`reliefHeightRatio`)
- **Zakres:** `0.0 – 2.0` (mnożnik istniejącego `reliefHeight`)
- **Efekt:** Skaluje relief niezależnie od bazowej wysokości.
- **Implementacja:**
  ```typescript
  // Modyfikacja: const maxHeight = (height + reliefHeight * reliefHeightRatio) * comp;
  ```

### B8. 🟡 Step Profile Shape (`stepShape`)
- **Zakres:** `0.0 – 1.0` (0 = ostry, 1 = zaokrąglony)
- **Efekt:** Zaokrągla przejście między pierścieniem montażowym (step) a korpusem ramki.
- **Implementacja:**
  ```typescript
  // Zamień ostre przejście w points[1]→points[2] na krzywe Béziera:
  // Interpoluj kąt przejścia korzystając z stepShape
  const stepBlend = stepShape;
  // Dodaj dodatkowe punkty interpolacyjne między rInner i rStep
  for (let i = 0; i < 4; i++) {
    const st = i / 3;
    const r = rInner + (rStep - rInner) * st;
    const z = stepHeight * smoothstep(st, stepBlend);
    points.splice(2 + i, 0, { r, z });
  }
  ```

---

## C. WYSOKOŚĆ I PROPORCJE

### C1. 🟢 Wysokość Bazowa (`height`) — *już istniejący*
- **Obecny zakres:** brak limitu w UI
- **Sugerowany zakres:** `5 – 25 mm`
- **Uwaga:** Dodać wizualizację wartości w mm w UI

### C2. 🟢 Średnica Zewnętrzna (`outerDiameter`) — *już istniejący*
- **Sugerowany zakres UI:** `60 – 120 mm`

### C3. 🟢 Skalowanie Niejednorodne X/Y (`scaleX`, `scaleY`)
- **Zakres:** `0.5 – 1.5`
- **Efekt:** Rozciąga ramkę w jednej osi — tworzy owalne ramki.
- **Implementacja:**
  ```typescript
  // W pętli po slices, przeskaluj współrzędne x, y:
  const scaledX = x * scaleX;
  const scaledY = y * scaleY;
  addVertex(scaledX, scaledY, z, u, v);
  ```

### C4. 🟡 Taper (Zbieżność) (`taper`)
- **Zakres:** `0.0 – 0.5` (0 = cylinder, 0.5 = stożek)
- **Efekt:** Ramka zwęża się ku górze — jak lejek.
- **Implementacja:**
  ```typescript
  // W getOuterProfile(), radius modulowany przez Z:
  const taperScale = 1 - taper * (z / maxHeight);
  // Przelicz r *= taperScale dla każdego punktu profilu
  ```

### C5. 🟡 Flare (Rozszerzenie) (`flare`)
- **Zakres:** `0.0 – 0.5`
- **Efekt:** Odwrotność taperu — ramka rozszerza się ku górze, jak kielich.
- **Implementacja:**
  ```typescript
  const flareScale = 1 + flare * (z / maxHeight);
  // Przemnóż radius
  ```

---

## D. OTWÓR WEWNĘTRZNY

### D1. 🟢 Średnica Otworu (`innerHoleDiameter`) — *już istniejący*
- **Zakres:** `40 – 55 mm`

### D2. 🟡 Kształt Otworu (`innerHoleShape`)
- **Zakres:** `1.0 – 4.0` (superkwadryka: 1 = koło, 2 = zaokrąglony kwadrat, 4 = kwadrat)
- **Efekt:** Otwór wewnętrzny zmienia kształt z okrągłego na kwadratowy.
- **Implementacja:**
  ```typescript
  // Oblicz rInner per angle:
  const n = innerHoleShape;
  const rInnerAt = (theta) => {
    const ct = Math.cos(theta), st = Math.sin(theta);
    return rInner / Math.pow(Math.pow(Math.abs(ct), n) + Math.pow(Math.abs(st), n), 1/n);
  };
  ```

### D3. 🟡 Obrót Otworu (`innerHoleRotation`)
- **Zakres:** `0° – 90°`
- **Efekt:** Obraca kwadratowy/poligonalny otwór niezależnie od wzoru płatków.
- **Implementacja:**
  ```typescript
  const rotatedTheta = theta + innerHoleRotation * (Math.PI / 180);
  // Użyj rotatedTheta w rInnerAt()
  ```

### D4. 🟢 Fazka Krawędzi Otworu (`innerChamfer`)
- **Zakres:** `0.0 – 3.0 mm`
- **Efekt:** Zaokrąglona/fazowana krawędź otworu — ergonomia i estetyka.
- **Implementacja:**
  ```typescript
  // W getOuterProfile(), dodaj punkt fazki na początku:
  if (innerChamfer > 0) {
    points.unshift({ r: rInner + innerChamfer, z: 0 });
    // Opcjonalnie dodaj łuk Béziera
  }
  ```

---

## E. TEKSTURA I DETALE POWIERZCHNI

### E1. 🟡 Rowki Promieniowe (`radialGrooves`)
- **Zakres:** `0 – 12` (integer, liczba rowków)
- **Efekt:** Rowki biegnące od otworu do krawędzi — jak plastry tortu.
- **Implementacja:**
  ```typescript
  // Moduluj Z per theta:
  const grooveDepth = 0.8; // mm
  const grooveWidth = 0.3; // fraction of petal
  const grooveAt = Math.cos(radialGrooves * theta);
  if (grooveAt > (1 - grooveWidth)) {
    z -= grooveDepth * (grooveAt - (1 - grooveWidth)) / grooveWidth;
  }
  ```

### E2. 🟡 Rowki Koncentryczne (`concentricGrooves`)
- **Zakres:** `0 – 8` (liczba pierścieni)
- **Efekt:** Pierścieniowe nacięcia — jak linie topograficzne.
- **Implementacja:**
  ```typescript
  // W getOuterProfile(), moduluj z per r:
  const grooveFreq = concentricGrooves;
  const grNorm = (r - rInner) / (currentOuterRadius - rInner);
  z -= 0.5 * Math.max(0, Math.sin(grNorm * grooveFreq * Math.PI * 2));
  ```

### E3. 🔴 Wzór Kratowy / Kratownica (`latticePattern`)
- **Zakres:** `0.0 – 1.0` (głębokość wzoru)
- **Efekt:** Wzór diamentowy/rombowy na powierzchni — orientalny styl.
- **Implementacja:**
  ```typescript
  // Kombinacja rowków promieniowych i koncentrycznych:
  const latR = Math.sin(radialFreq * theta);
  const latC = Math.sin(concentricFreq * rNormalized * Math.PI);
  const latticeZ = latticePattern * Math.min(Math.abs(latR), Math.abs(latC));
  z -= latticeZ;
  ```

### E4. 🟡 Mikrofalowanie (`microWave`)
- **Zakres:** `0.0 – 1.0 mm` (amplituda)
- **Efekt:** Drobna, organiczna faktura na całej powierzchni — imitacja ręcznego modelowania.
- **Implementacja:**
  ```typescript
  // Szum sinusoidalny o wysokiej częstotliwości:
  const microFreq = 30;
  const microZ = microWave * Math.sin(microFreq * theta) * Math.cos(microFreq * (r / rOuterMax) * Math.PI);
  z += microZ;
  ```

### E5. 🔴 Szum Perlin (`perlinNoise`)
- **Zakres:** `0.0 – 2.0 mm` (amplituda)
- **Efekt:** Organiczna, naturalna tekstura — każda ramka wygląda unikatowo.
- **Implementacja:**
  ```typescript
  // Wymaga biblioteki noise (np. simplex-noise, noisejs):
  // npm install simplex-noise
  import { createNoise2D } from 'simplex-noise';
  const noise2D = createNoise2D();
  const noiseScale = 0.1;
  z += perlinNoise * noise2D(r * noiseScale, theta * 10);
  ```

### E6. 🟡 Skalowanie Fasetowe (`faceting`)
- **Zakres:** `0 – 24` (0 = okrągłe, 3+ = wielokątne)
- **Efekt:** Zamienia gładką rozetkę w wielokąt (trójkąt, sześciokąt, itp.)
- **Implementacja:**
  ```typescript
  // Kwantyzuj theta do kroków:
  if (faceting > 0) {
    const step = (2 * Math.PI) / faceting;
    const facetedTheta = Math.round(theta / step) * step;
    // Interpoluj między facetedTheta a theta dla smooth blend
    const blend = 0.8;
    theta = theta * (1 - blend) + facetedTheta * blend;
  }
  ```

---

## F. ELEMENTY DEKORACYJNE (Dodatki 3D)

### F1. 🟢 Kulki Ozdobne — *istniejące (showBalls, ballSize, itd.)*
- Rozszerzenie: dodać `ballPattern` (enum: every, alternate, custom)
- **Implementacja:** W `SocketFrame.tsx`, filtruj pozycje kulek per indeks

### F2. 🟢 Stożki / Kolce — *istniejące (showCones, coneSize, itd.)*
- Rozszerzenie: dodać `coneAngle` (0-45°) — pochylenie stożków na zewnątrz

### F3. 🟡 Perły / Kropki (`dotRing`)
- **Zakres:** `0 – 12` (liczba kulek w pierścieniu)
- **Efekt:** Pierścień drobnych kulek wzdłuż obwodu otworu wewnętrznego.
- **Implementacja:**
  ```typescript
  const dotRadius = 1.5; // mm
  const dotRingRadius = rInner + 2; // mm od centrum
  for (let i = 0; i < dotRing; i++) {
    const angle = (i / dotRing) * Math.PI * 2;
    // Generuj SphereGeometry i pozycjonuj na (dotRingRadius * cos, dotRingRadius * sin, maxHeight)
  }
  ```

### F4. 🟡 Wstęga / Opaski  (`bandRing`)
- **Zakres:** toggle ON/OFF + `bandWidth` (1-5 mm) + `bandPosition` (0.0-1.0)
- **Efekt:** Wypukła opaska pierścieniowa biegnąca dookoła ramki.
- **Implementacja:**
  ```typescript
  // W getOuterProfile(), dodaj wypukłość na radius r przy bandPosition:
  const bandR = rInner + (currentOuterRadius - rInner) * bandPosition;
  const bandDist = Math.abs(r - bandR);
  if (bandDist < bandWidth / 2) {
    z += bandHeight * Math.cos((bandDist / (bandWidth/2)) * Math.PI / 2);
  }
  ```

### F5. 🔴 Filigran / Ażur (`filigreeCut`)
- **Zakres:** `0.0 – 1.0` (ilość ażuru)
- **Efekt:** CSG-based wycięcia ażurowe w korpusie ramki — jak koronka.
- **Implementacja:**
  ```typescript
  // Wymaga CSG (three-bvh-csg):
  // Generuj pattern cylindrów/sfer rozmieszczonych na powierzchni
  // Subtractuj z geometrii ramki
  // UWAGA: bardzo kosztowne obliczeniowo, sugerowany Web Worker
  ```

### F6. 🟡 Grzebień / Ząbkowanie (`edgeSerrations`)
- **Zakres:** `0 – 48` (liczba ząbków na krawędzi)
- **Efekt:** Drobne trójkątne ząbki na zewnętrznej krawędzi — jak korona.
- **Implementacja:**
  ```typescript
  // Moduluj rOuterMax per theta:
  const serrationAmp = 1.5; // mm
  const serrWave = Math.abs(Math.sin(edgeSerrations * theta));
  const serratedRadius = currentOuterRadius + serrationAmp * serrWave;
  ```

---

## G. PRZEKRÓJ MONTAŻOWY

### G1. 🟢 Głębokość Pierścienia Oporowego (`seatingRingDepth`) — *już istniejący*
- **Zakres:** `0 – 15 mm`

### G2. 🟢 Średnica Pierścienia Stopnia (`stepDiameter`) — *już istniejący*
- **Zakres:** `46 – 55 mm`

### G3. 🟡 Kształt Stopnia — Profil L vs U (`stepProfile`)
- **Zakres:** enum: `L` | `U` | `V`
- **Efekt:** Zmienia kształt montażowego "schodka" z kątowego L na zaokrąglony U lub ostry V.
- **Implementacja:**
  ```typescript
  // W getOuterProfile(), modyfikuj przejście rInner → rStep:
  switch (stepProfile) {
    case 'L': // Obecna logika
    case 'U': // Łuk: dodaj punkty pośrednie na półokręgu
    case 'V': // Trójkąt: prostoliniowe połączenie pod kątem
  }
  ```

### G4. 🟡 Podwójny Stopień (`doubleStep`)
- **Zakres:** toggle ON/OFF + `secondStepDiameter` (mm) + `secondStepDepth` (mm)
- **Efekt:** Dodaje drugi pierścień montażowy — kompatybilność z różnymi mechanizmami.
- **Implementacja:**
  ```typescript
  // W getOuterProfile(), dodaj dodatkowe punkty profilu:
  points.splice(3, 0,
    { r: rStep2, z: stepHeight },
    { r: rStep2, z: secondStepDepth }
  );
  ```

---

## H. MODYFIKACJE KRAWĘDZIOWE

### H1. 🟢 Fazka Górna (`topChamfer`)
- **Zakres:** `0.0 – 3.0 mm`
- **Efekt:** Ścięcie górnej krawędzi — eleganckie wykończenie.
- **Implementacja:**
  ```typescript
  // W getOuterProfile(), na punkcie maxHeight zetnie pod kątem 45°:
  // Dodaj dodatkowy punkt tuż przed szczytem: { r: r - topChamfer, z: maxHeight }
  // Zamień maxHeight punkt na: { r: r, z: maxHeight - topChamfer }
  ```

### H2. 🟢 Zaokrąglenie Górne (`topFillet`)
- **Zakres:** `0.0 – 5.0 mm` (promień zaokrąglenia)
- **Efekt:** Gładkie zaokrąglenie górnej krawędzi zamiast ostrego kąta.
- **Implementacja:**
  ```typescript
  // Dodaj krzywe Béziera lub serię punktów w łuku:
  const filletPoints = 8;
  for (let i = 0; i < filletPoints; i++) {
    const a = (i / (filletPoints - 1)) * (Math.PI / 2);
    const fr = r_peak - topFillet * (1 - Math.cos(a));
    const fz = maxHeight - topFillet * (1 - Math.sin(a));
    points.push({ r: fr, z: fz });
  }
  ```

### H3. 🟢 Fazka Dolna (`bottomChamfer`)
- **Zakres:** `0.0 – 2.0 mm`
- **Efekt:** Ścięcie dolnej krawędzi zewnętrznej — zapobiega odpryskom.
- **Implementacja:**
  ```typescript
  // Modyfikuj ostatni punkt profilu (na dole):
  const last = points[points.length - 1]; // { r: currentOuterRadius, z: 0 }
  points.splice(points.length - 1, 0, { r: currentOuterRadius - bottomChamfer, z: bottomChamfer });
  ```

### H4. 🟡 Krawędź Falista (`wavyEdge`)
- **Zakres:** `0.0 – 3.0 mm` (amplituda fali)
- **Efekt:** Górna krawędź faluje — organiczny, ręcznie robiony wygląd.
- **Implementacja:**
  ```typescript
  // Moduluj maxHeight per theta:
  const wavyFreq = petals * 2; // dwa razy częstotliwość płatków
  const effectiveMaxHeight = maxHeight + wavyEdge * Math.sin(wavyFreq * theta);
  ```

---

## I. TRYBY SPECJALNE

### I1. 🟢 Lustro Pionowe (`flipY`) — *już istniejący*
- **Zakres:** toggle ON/OFF

### I2. 🟡 Lustro Promieniowe (`radialMirror`)
- **Zakres:** toggle ON/OFF
- **Efekt:** Górna połowa profilu jest lustrzanym odbiciem dolnej — symetryczna ramka.
- **Implementacja:**
  ```typescript
  // Po wygenerowaniu getOuterProfile(), stwórz lustro:
  const mirroredPoints = outerPoints.map(p => ({ r: p.r, z: maxHeight - p.z }));
  // Scal oba zestawy punktów
  ```

### I3. 🟡 Skalowanie per Płatek (`petalScaleArray`)
- **Zakres:** Tablica suwaków, po jednym na płatek
- **Efekt:** Każdy płatek ma niezależną skalę — asymetryczne, artystyczne kształty.
- **Implementacja:**
  ```typescript
  // Zamień stały petalIndentation na tablicę:
  // petalScaleArray: number[] (length = petals)
  const petalIndex = Math.floor((theta / (2 * Math.PI)) * petals) % petals;
  const localScale = petalScaleArray[petalIndex];
  const currentOuterRadius = rOuterMax * (1 - petalIndentation * localScale * (1 - petalMod));
  ```

### I4. 🟡 Tryb Wielogniazdkowy (`socketCount`)
- **Zakres:** `1 – 5` (integer)
- **Efekt:** Generuje ramkę z wieloma otworami ułożonymi w linii — poczwórna/potrójna ramka.
- **Implementacja:**
  ```typescript
  // Wymaga nowego typu geometrii — powtórz otwór wewnętrzny socketCount razy
  // z przesunięciem wzdłuż osi X o (innerHoleDiameter + spacing) * i
  // Zmień bounding shape na prostokąt zamiast okręgu
  ```

### I5. 🔴 Import Krzywej SVG (`svgProfile`)
- **Zakres:** plik SVG
- **Efekt:** Pozwala wczytać dowolny profil zewnętrzny z pliku SVG — nieograniczone kształty.
- **Implementacja:**
  ```typescript
  // Parse SVG path data → tablica punktów (r, θ) w biegunowych
  // Zamień getOuterProfile na interpolację punktów SVG
  // Wymaga: svg-path-parser lub ręczne parsowanie path d=""
  ```

---

## J. PARAMETRY MATERIAŁOWO-PRODUKCYJNE

### J1. 🟢 Kompensacja Skurczu (`shrinkagePercent`) — *już istniejący*
- **Zakres:** `0 – 5%`

### J2. 🟢 Grubość Ścianki Shell (`wallThickness`) — *już istniejący*
- **Zakres:** `0.8 – 4.0 mm`

### J3. 🟡 Kompensacja Skurczu per Oś (`shrinkageX`, `shrinkageY`, `shrinkageZ`)
- **Zakres:** `0 – 5%` każdy
- **Efekt:** Anizotropowa kompensacja — różny skurcz w różnych osiach (rzeczywistość ceramiki!)
- **Implementacja:**
  ```typescript
  const compX = 1 / (1 - shrinkageX / 100);
  const compY = 1 / (1 - shrinkageY / 100);
  const compZ = 1 / (1 - shrinkageZ / 100);
  // Mnóż vertex.x *= compX, vertex.y *= compY, vertex.z *= compZ
  ```

### J4. 🟢 Jakość Siatki (`smoothness`) — *już istniejący*
- **Zakres:** `32 – 512`
- **Rozszerzenie:** Dodać preset: „Podgląd" (64), „Standard" (128), „Druk" (256), „Ultra" (512)

### J5. 🟡 Przesunięcie XY (`offsetX`, `offsetY`)
- **Zakres:** `-10 – 10 mm`
- **Efekt:** Przesuwa cały otwór wewnętrzny względem centrum ramki — ekscentryczne gniazdko.
- **Implementacja:**
  ```typescript
  // W obliczaniu rInner, dodaj offset:
  const dx = x - offsetX, dy = y - offsetY;
  const distFromOffset = Math.sqrt(dx*dx + dy*dy);
  // Porównuj distFromOffset z rInner zamiast standardowego r
  ```

---

## K. PARAMETRY PODGLĄDU I EKSPORTU

### K1. 🟢 Eksplodowany Widok (`explodeDistance`) — *już istniejący*
- **Zakres:** `0 – 50 mm`

### K2. 🟢 Przezroczystość Moldu (`moldOpacity`) — *już istniejący*
- **Zakres:** `5 – 100%`

### K3. 🟡 Tryb Przekroju (`crossSectionEnabled`, `crossSectionAngle`)
- **Zakres:** toggle + `0° – 360°`
- **Efekt:** Pokazuje przekrój ramki — podgląd wewnętrznej struktury.
- **Implementacja:**
  ```typescript
  // W SocketFrame.tsx, dodaj ClippingPlane:
  const plane = new THREE.Plane(
    new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0), 0
  );
  material.clippingPlanes = [plane];
  renderer.localClippingEnabled = true;
  ```

### K4. 🟡 Wireframe Toggle (`wireframeMode`)
- **Zakres:** toggle ON/OFF
- **Efekt:** Wyświetla siatkę zamiast wypełnionej geometrii — analiza topologii.
- **Implementacja:**
  ```typescript
  material.wireframe = wireframeMode;
  ```

### K5. 🟡 Przycisk Losowania (`randomize`)
- **Zakres:** przycisk (nie suwak)
- **Efekt:** Losuje wartości wszystkich parametrów kształtu — inspiracja / szybki prototyping.
- **Implementacja:**
  ```typescript
  const randomConfig: Partial<FrameConfig> = {
    petals: 3 + Math.floor(Math.random() * 18),
    petalIndentation: Math.random() * 0.5,
    petalRoundness: Math.random(),
    // ... etc
  };
  setConfig(prev => ({ ...prev, ...randomConfig }));
  ```

---

## L. ZAAWANSOWANE TRANSFORMACJE GEOMETRYCZNE

### L1. 🔴 Deformacja Morph Target (`morphTarget`)
- **Zakres:** `0.0 – 1.0` (blend do drugiego kształtu)
- **Efekt:** Płynne przejście między dwoma presetami kształtów.
- **Implementacja:**
  ```typescript
  // Generuj dwa zestawy werteksów (config A i config B)
  // Interpoluj linearnie: vertex = vertexA * (1-t) + vertexB * t
  ```

### L2. 🟡 Skręcenie Globalne (`globalTwist`)
- **Zakres:** `0° – 180°`
- **Efekt:** Cała ramka jest skręcona wokół osi Z — jak wyżymaczka.
- **Implementacja:**
  ```typescript
  // Post-processing werteksów:
  const twistAngle = (vertex.z / maxHeight) * globalTwist * (Math.PI / 180);
  const newX = vertex.x * Math.cos(twistAngle) - vertex.y * Math.sin(twistAngle);
  const newY = vertex.x * Math.sin(twistAngle) + vertex.y * Math.cos(twistAngle);
  ```

### L3. 🟡 Wygięcie / Bend (`bendAngle`, `bendAxis`)
- **Zakres:** `0° – 45°`, enum: `X | Y`
- **Efekt:** Ramka wygina się — jak miseczka/siodło.
- **Implementacja:**
  ```typescript
  // Post-processing: cylindrical bend deformation
  const bendRadius = maxHeight / (bendAngle * Math.PI / 180);
  // Przeskaluj z na krzywej cylindrycznej
  ```

### L4. 🔴 Inflate / Deflate (`inflate`)
- **Zakres:** `-5.0 – 5.0 mm`
- **Efekt:** Przesuwa werteksy wzdłuż ich normali — jak "napompowanie" kształtu.
- **Implementacja:**
  ```typescript
  // Po computeVertexNormals():
  const normals = geometry.getAttribute('normal');
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    positions.setXYZ(i,
      positions.getX(i) + normals.getX(i) * inflate,
      positions.getY(i) + normals.getY(i) * inflate,
      positions.getZ(i) + normals.getZ(i) * inflate
    );
  }
  ```

### L5. 🟡 Noise Displacement (`displaceNoise`)
- **Zakres:** `0.0 – 3.0 mm`
- **Efekt:** Losowe przesunięcie werteksów wzdłuż normali — organiczna, ręczna faktura.
- **Implementacja:**
  ```typescript
  // Jak L4 (inflate) ale z wartością per-vertex z Perlin noise
  const noiseVal = noise2D(positions.getX(i) * 0.1, positions.getY(i) * 0.1);
  const offset = displaceNoise * noiseVal;
  ```

---

## M. PLANOWANE PRESETY (Quick Presets)

Presety to zapisane kombinacje suwaków dające określone efekty:

| Preset | Kluczowe Parametry |
|---|---|
| **Klasyczna Rozeta** | petals: 6, indentation: 0.25, roundness: 0.5 |
| **Gwiazda** | petals: 8, indentation: 0.5, roundness: 0.1 |
| **Art Deco** | petals: 12, petalShape: 3.0, faceting: 12 |
| **Organiczny** | perlinNoise: 1.5, microWave: 0.5, wavyEdge: 2.0 |
| **Minimalistyczny** | petals: 4, indentation: 0.1, topFillet: 3.0 |
| **Korona** | edgeSerrations: 24, petalTwist: 15° |
| **Spirala** | spiralFactor: 0.3, globalTwist: 90° |
| **Dalia** | interleaveCount: 2, petals: 8, indentation: 0.35 |
| **Geometryczny** | faceting: 6, innerHoleShape: 2.0, stepProfile: V |
| **Barokowy** | secondaryWave: 0.2, bandRing: ON, dotRing: 8 |

---

## N. PRIORYTET IMPLEMENTACJI

### Faza 1 — Quick Wins (🟢 EASY)
1. `patternRotation` (A7) — natychmiastowa wartość dla moldu
2. `profileConvexity` (B1) — duży efekt wizualny
3. `peakPosition` (B2) — precyzyjna kontrola profilu
4. `topChamfer` / `topFillet` (H1/H2) — wykończenie krawędzi
5. `bottomChamfer` (H3) — produkcyjna konieczność
6. `scaleX` / `scaleY` (C3) — owalne ramki
7. `petalAsymmetry` (A1) — dynamika wzoru

### Faza 2 — Medium Impact (🟡 MEDIUM)
8. `petalShape` (superkwadryka) (A4)
9. `secondaryWave` (A5)
10. `valleyRoundness` (A6)
11. `taper` / `flare` (C4/C5)
12. `wavyEdge` (H4)
13. `globalTwist` (L2)
14. `crossSectionEnabled` (K3)
15. `radialGrooves` / `concentricGrooves` (E1/E2)

### Faza 3 — Zaawansowane (🔴 HARD)
16. `perlinNoise` (E5)
17. `filigreeCut` (F5)
18. `svgProfile` (I5)
19. `morphTarget` (L1)
20. `socketCount` wielogniazdkowy (I4)

---

## O. INSTRUKCJE IMPLEMENTACJI — Ogólna Struktura

### Krok 1: Dodaj parametr do `types.ts`
```typescript
// W FrameConfig interface:
export interface FrameConfig {
  // ... istniejące pola ...
  nowyParametr: number;  // Opis [mm lub ratio]
}

// W DEFAULT_CONFIG:
export const DEFAULT_CONFIG: FrameConfig = {
  // ... istniejące wartości ...
  nowyParametr: 0.0,  // wartość domyślna (neutralna = brak efektu)
};
```

### Krok 2: Zmodyfikuj `geometry.ts`
```typescript
export const generateFrameGeometry = (config: FrameConfig, ...) => {
  const { /* istniejące */, nowyParametr } = config;
  // Użyj nowyParametr w odpowiednim miejscu pipeline'u
};
```

### Krok 3: Dodaj suwak w `Controls.tsx`
```tsx
<div>
  <label className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-1">
    <span>Nowy Parametr</span>
    <span className="text-indigo-600">{config.nowyParametr}</span>
  </label>
  <input
    type="range" min="0" max="1" step="0.01"
    value={config.nowyParametr}
    onChange={(e) => handleChange('nowyParametr', parseFloat(e.target.value))}
    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
  />
</div>
```

### Krok 4: Verify
- Sprawdź podgląd 3D — efekt musi być widoczny w czasie rzeczywistym
- Sprawdź eksport STL — geometria musi być manifold
- Sprawdź tryb mold — parametr musi propagować do generatora moldu
- Przetestuj wartości skrajne (min/max) — brak artefaktów
