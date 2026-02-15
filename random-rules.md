# Random Rules - Quasi-Losowe Presety

## Cel
Zdefiniowac zestaw regul do generowania quasi-losowych presetow, ktore:
- sa poprawne geometrycznie (brak oczywistych degeneracji profilu),
- sa sensowne technologicznie (export STL bez "dziwnych" przypadkow),
- sa spojne wizualnie (parametry nie "gryza sie" stylistycznie).

Dokument jest oparty o faktyczna logike z:
- `utils/geometry.ts`
- `components/Controls.tsx`
- `components/SocketFrame.tsx`
- `utils/moldGeometry.ts`

## 1. Definicje robocze
Przed losowaniem policz:

```ts
comp = 1 / (1 - shrinkagePercent / 100)
rInner = (innerHoleDiameter / 2) * comp
rStep = (stepDiameter / 2) * comp
rOuterMax = (outerDiameter / 2) * comp
baseMaxHeight = (height + reliefHeight * reliefHeightRatio) * comp
stepHeight = seatingRingDepth * comp
```

Przyblizenie minimalnego promienia zewnetrznego (konserwatywne):

```ts
indentFactor =
  1
  + 0.8 * secondaryWave
  + 0.35 * sawtoothBlend
  + Math.max(0, 0.25 - valleyRoundness) * 0.5

outerMinEstimate = rOuterMax * (1 - petalIndentation * indentFactor)
```

## 2. Hard Rules (musi byc spelnione)

### R1. Kolejnosc srednic montazowych
- `innerHoleDiameter + 1.0 <= stepDiameter`
- `stepDiameter <= outerDiameter - 8.0`

### R2. Glebokosc pierscienia vs wysokosc profilu
- `seatingRingDepth <= max(0.5, height + reliefHeight * reliefHeightRatio - 0.7)`
- Gdy `seatingRingDepth` jest za duze, poczatkowy "step" przewyzsza korpus i robi nienaturalny profil.

### R3. Budzet wciecia platkow
Wylicz limit:

```ts
indentGeom = 1 - (rStep + 2.0) / rOuterMax
indentWave = 1 / (
  1
  + 0.8 * secondaryWave
  + 0.35 * sawtoothBlend
  + Math.max(0, 0.25 - valleyRoundness) * 0.5
)
indentMax = clamp(indentGeom * indentWave, 0.12, 0.38)
```

Regula:
- `petalIndentation <= indentMax`

### R4. Stabilnosc dolin fali
- `valleyRoundness >= max(0.18, 0.75 * secondaryWave, 0.35 * sawtoothBlend)`
- Jesli `valleyRoundness < 0.25`, wymus:
  - `secondaryWave <= 0.12`
  - `sawtoothBlend <= 0.35`

Powod: `computePetalMod()` nie clampuje `rawWave`, wiec skrajne kombinacje moga przesterowac modulacje promienia.

### R5. Zaleznosc `peakPosition` <-> `plateauWidth`
Limit:

```ts
plateauMax = max(0, 2 * min(peakPosition, 1 - peakPosition) - 0.04)
```

Regula:
- `plateauWidth <= min(plateauWidth, plateauMax)`
- Dodatkowo: przy `outerDropAngle > 70`, trzymaj `plateauWidth <= 0.20`.

### R6. Budzet gornej krawedzi (`topChamfer`, `topFillet`)
Reguly:
- `topChamfer + 0.7 * topFillet <= min(4.5, 0.35 * baseMaxHeight)`
- Jesli `topFillet > 2.5`, to `topChamfer <= 1.0`.

### R7. Budzet skretu (`petalTwist`, `globalTwist`)
- `globalTwist + 1.5 * petalTwist <= 150`
- Jesli `interleaveCount >= 2`, to `globalTwist <= 80`.

### R8. `taper` i `flare` nie moga byc jednoczesnie wysokie
- `taper + flare <= 0.45`
- `min(taper, flare) <= 0.10`

### R9. Shell mode (`isHollow`) - limit grubosci scianki
Jesli `isHollow = true`:

```ts
maxWallComp = 0.45 * max(1.0, outerMinEstimate - rInner)
wallThickness <= maxWallComp / comp
```

Dodatkowo:
- Jesli `petalIndentation > 0.30` lub `interleaveCount > 1`, trzymaj `wallThickness <= 3.2`.

### R10. Faceting tylko sensowne wartosci
- `faceting` moze byc tylko `0` albo `>= 3`.
- Dla spojnosci: jesli `faceting > 0`, wybieraj wartosci skorelowane z `petals`
  (np. `petals`, `petals/2`, `petals*2` po clamp do 24 i min 3).

### R11. Ozdoby musza miec kontakt z korpusem
Jesli `showBalls = true`:
- `anisotropy = max(scaleX, scaleY) / min(scaleX, scaleY) <= 1.18`
- `-1.2 * ballSize <= ballRadialOffset <= 0.35 * ballSize`
- `rPos = rOuterMax + ballRadialOffset * comp`
- `ballSize <= 0.9 * rPos * sin(pi / petals)` (anty-nakladanie kulek)

Jesli `showCones = true`:
- `anisotropy <= 1.18`
- `-0.8 * coneSize <= coneRadialOffset <= 0.2 * coneSize`
- `rPos = rOuterMax + coneRadialOffset * comp`
- `coneSize <= 0.45 * rPos * sin(pi / petals)` (anty-kolizja stozkow)
- `coneHeight <= 2.8 * coneSize`

### R12. Minimalna jakosc siatki zalezy od zlozonosci
Policz:

```ts
detailScore =
  radialGrooves / 12 +
  concentricGrooves / 8 +
  microWave / 1 +
  profileRipple / 2 +
  edgeSerrations / 48 +
  interleaveCount / 3 +
  (faceting > 0 ? 0.5 : 0)
```

Reguly:
- `detailScore > 2.2` -> `smoothness >= 192`
- `detailScore > 2.8` lub `globalTwist > 120` -> `smoothness >= 256`

## 3. Coupled Rules (spojnosc wizualna)

### C1. Relacja `petals` do detalu
- `petals <= 5` -> trzymaj `interleaveCount = 0`, `edgeSerrations <= 16`.
- `petals >= 12` -> ogranicz `petalAmplitudeVariation <= 0.30`, `ballSize` i `coneSize` przez R11.

### C2. Relacja `secondaryWave`, `sawtoothBlend`, `edgeSerrations`
- Jesli `sawtoothBlend > 0.45`, to:
  - `secondaryWave <= 0.10`
  - `edgeSerrations <= 2 * petals`

### C3. Relacja `profileRipple`, `microWave`, `grooves`
- Gdy `profileRipple > 1.2`, ustaw:
  - `microWave <= 0.35`
  - `concentricGrooves <= 4`
- Gdy `microWave > 0.6`, ustaw:
  - `faceting = 0`
  - `radialGrooves <= 8`

### C4. Relacja `scaleX/scaleY` do ozdob
- Gdy `anisotropy > 1.20`, domyslnie:
  - `showBalls = false`
  - `showCones = false`

### C5. Relacja `interleaveCount` do twistu
- `interleaveCount = 0` -> `globalTwist` do 130.
- `interleaveCount = 1` -> `globalTwist` do 100.
- `interleaveCount >= 2` -> `globalTwist` do 80 i `petalTwist` do 20.

## 4. Archetypy quasi-losowania
Losuj najpierw archetyp (nie suwaki niezaleznie). Potem jitter w waskich zakresach.

### A. Classic (waga 24%)
- `petals: 6..10`
- `petalIndentation: 0.18..0.30`
- `petalRoundness: 0.45..0.75`
- `secondaryWave: 0.00..0.08`
- `faceting: 0`
- `globalTwist: 0..35`

### B. Geometric (waga 18%)
- `petals: 4..12`
- `petalShape: 1.8..3.4`
- `faceting: 4..16` (powiazane z `petals`)
- `petalRoundness: 0.20..0.55`
- `microWave: 0.00..0.15`

### C. Organic (waga 18%)
- `petals: 5..9`
- `microWave: 0.25..0.70`
- `wavyEdge: 0.8..2.2`
- `profileRipple: 0.4..1.4`
- `faceting: 0`

### D. Crown (waga 14%)
- `petals: 8..16`
- `edgeSerrations: 2*petals .. 4*petals` (clamp 48)
- `petalTwist: 6..20`
- `topFillet: 0.0..1.5`
- opcjonalnie `showCones` z R11

### E. Spiral (waga 14%)
- `petals: 5..10`
- `globalTwist: 60..130`
- `petalTwist: 8..22`
- `petalAsymmetry: 0.15..0.45`
- `sawtoothBlend: 0.00..0.30`

### F. Minimal (waga 12%)
- `petals: 4..8`
- `petalIndentation: 0.05..0.20`
- `petalRoundness: 0.60..0.90`
- `topFillet: 1.0..3.0`
- tekstury i zeby raczej `0`

## 5. Kolejnosc generacji (pipeline)
1. Start od `DEFAULT_CONFIG`.
2. Wybierz archetyp (wazony los).
3. Wylosuj parametry glowne archetypu.
4. Dorysuj parametry wtornie (tekstury, krawedzie, twist) z malym jitterem.
5. Zastosuj Hard Rules R1-R12 (clamp + korekty zalezne).
6. Zastosuj Coupled Rules C1-C5.
7. Ustal `smoothness` z R12.
8. Walidacja:
   - brak `NaN/Inf`,
   - wszystkie limity R1-R12 spelnione,
   - jesli `isHollow`, sprawdz R9 po finalnych wartosciach.
9. Jesli fail: ponow probe (max 20), potem fallback do `DEFAULT_CONFIG`.

## 6. Minimalna walidacja po stronie kodu
Po wygenerowaniu presetu wykonaj szybkie testy:

```ts
const isFiniteNumber = (v: number) => Number.isFinite(v) && !Number.isNaN(v)
```

- sprawdz wszystkie pola numeryczne configu,
- sprawdz granice wynikajace z R1-R12,
- (opcjonalnie) wygeneruj `generateFrameGeometry(config, 1)` i potwierdz, ze pozycje vertexow sa skonczone.

## 7. Reguly dla trybu Mold (jesli randomizowany osobno)

### M1. Podstawowe limity
- `moldClearance >= max(5, 0.15 * outerDiameter)`
- `moldWallHeight >= max(20, 1.2 * (height + reliefHeight))`
- `moldWallThickness >= max(3, keyRadius + 1.5)`

### M2. Rozstaw zamkow
Wylicz:

```ts
moldOuterR = rOuterMax + moldClearance
keySpacing = (moldOuterR - rInner) / (keyCount + 1)
```

Regula:
- `keyRadius <= 0.42 * keySpacing`

### M3. Stabilny podglad
- `explodeDistance` nie wplywa na STL, ale dla czytelnosci:
  - `explodeDistance = 10..30` (podglad)

## 8. Co poprawia ten zestaw regul
- Eliminuje kombinacje, ktore "przestrzeliwuja" modulacje promienia.
- Ogranicza konflikty skretow i detali wysokiej czestotliwosci.
- Pilnuje, by ozdoby nie odrywaly sie wizualnie od korpusu.
- Daje estetycznie spojne wyniki przez archetypy + kontrolowany jitter.
