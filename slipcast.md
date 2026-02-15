# Moduł Slipcast – Specyfikacja 4-częściowego Moldu Gipsowego

## 1. Kontekst: Czym jest Slipcast?

**Slipcasting (odlewanie z masy lejnej)** to technika ceramiczna, w której płynną masę ceramiczną (slip) wlewa się do porowatego gipsowego moldu. Gips absorbuje wodę ze slipu, tworząc na ścianach moldu warstwę twardniejącej gliny. Po uzyskaniu pożądanej grubości ścianki, nadmiar slipu wylewa się, a mol otwiera się, odsłaniając gotowy odlew.

### Dlaczego 4 części?

Ramka gniazdkowa ma złożony profil z podcięciami (petal indentations, relief, step) — nie da się jej wyjąć z jednoczęściowego moldu. Podział na **4 ćwiartki (kwadranse)** pozwala na:
- Bezproblemowe wyjęcie odlewu z każdej części.
- Równomierny rozkład naprężeń w gipsie.
- Optymalną absorpcję wody ze wszystkich stron.

---

## 2. Wizja Modułu

### 2.1 Co Generujemy?

Moduł **nie generuje gotowego gipsowego moldu** — generuje **4 formy-pojemniki (mold boxes)**, które użytkownik drukuje na drukarce 3D. Każdy pojemnik zawiera:

1. **Ćwiartkę ramki** (pozytyw) — osadzoną na dnie pojemnika.
2. **Ścianki zewnętrzne** — tworzą „pudełko" do wlania gipsu.
3. **Ściankę dzielącą** (flat divider wall) — płaska ściana na linii podziału, zapewnia płaską powierzchnię styku między częściami moldu.
4. **Zamki rejestracyjne** — półkuliste wgłębienia/wypusty na ścianach dzielących, zapewniające dokładne pozycjonowanie części moldu.
5. **Kołnierz na slip** — opcjonalny cylinder na wlewie.

### 2.2 Orientacja Modelu

Ramka **leży na płasko** (oś Z jest osią wysokości ramki). Widok z góry to charakterystyczny kształt rozetki.

**Linie podziału** przechodzą przez centrum modelu i są prostopadłe do siebie:
- Linia A: `θ = 0°` do `θ = 180°` (oś X)
- Linia B: `θ = 90°` do `θ = 270°` (oś Y)

To tworzy 4 ćwiartki:
| Ćwiartka | Zakres kąta θ |
| :---: | :--- |
| Q1 | 0° – 90° |
| Q2 | 90° – 180° |
| Q3 | 180° – 270° |
| Q4 | 270° – 360° |

---

## 3. Budowa Pojedynczej Części Moldu (Mold Box)

### 3.1 Przekrój (widok z boku)

```
            ┌──────── kołnierz (opcjonalny) ──────┐
            │                                      │
    ┌───────┤                                      ├───────┐
    │       │     ← przestrzeń na gips →           │       │
    │       │                                      │       │
    │   ┌───┘                                      └───┐   │
    │   │         ╔══════════════════════╗              │   │
    │   │         ║  Ćwiartka ramki      ║              │   │
    │   │         ║  (pozytyw)           ║              │   │
    │   │         ╚══════════════════════╝              │   │
    │   └──────────────────────────────────────────────┘   │
    │              ← dno / podstawa →                      │
    └──────────────────────────────────────────────────────┘
          ↑ ściana zewnętrzna (outer wall)
```

### 3.2 Widok z góry (jedna ćwiartka)

```
                    Ściana dzieląca B (oś Y)
                    │
                    │  ○ zamek (hemisphere)
          ──────────┼─────────────────────── →
          │         │                      │
          │         │     Ćwiartka         │
          │ zamek ○ │     ramki            │ ← Ściana zewnętrzna
          │         │     (Q1)             │    (zaokrąglona)
          │         │                      │
          ──────────┼─────────────────────── →
                    │  ○ zamek
                    │
                    Ściana dzieląca A (oś X)
```

### 3.3 Elementy i Wymiary

| Element | Parametr domyślny | Opis |
| :--- | :--- | :--- |
| `moldWallThickness` | 8 mm | Grubość ścian zewnętrznych pojemnika |
| `moldWallHeight` | 40 mm | Wysokość ścian (= grubość gipsu nad ramką) |
| `moldBaseThickness` | 5 mm | Grubość dna pod ramką |
| `moldClearance` | 15 mm | Margines wokół ramki (min. grubość gipsu na bokach) |
| `keyRadius` | 4 mm | Promień zamków rejestracyjnych (hemisphere) |
| `keyCount` | 2 | Liczba zamków na jednej ścianie dzielącej |
| `draftAngle` | 2° | Kąt pochylenia ścian zewnętrznych (ułatwia wyjęcie gipsu) |
| `collarHeight` | 20 mm | Wysokość kołnierza do wlewania slipu |
| `collarEnabled` | true | Czy generować kołnierz |

---

## 4. Algorytm Generowania

### 4.1 Przegląd Kroków

```
┌──────────────────────────────────────────────────────────┐
│ 1. Wygeneruj pełną geometrię ramki (leżąca na płasko)   │
│    → użyj istniejącego generateFrameGeometry()           │
├──────────────────────────────────────────────────────────┤
│ 2. Obetnij geometrię ramki do ćwiartki (clipping)        │
│    → CSG intersection z BoxGeometry na quadrant          │
├──────────────────────────────────────────────────────────┤
│ 3. Wygeneruj mold box (pojemnik) wokół ćwiartki          │
│    → Bounding box ćwiartki + clearance + wall thickness  │
├──────────────────────────────────────────────────────────┤
│ 4. Dodaj ścianki dzielące (flat walls)                   │
│    → Dwie płaskie ściany na liniach podziału             │
├──────────────────────────────────────────────────────────┤
│ 5. Dodaj zamki rejestracyjne (registration keys)          │
│    → Hemisphere na ścianach dzielących                   │
├──────────────────────────────────────────────────────────┤
│ 6. (Opcjonalnie) Dodaj kołnierz (collar)                │
│    → Cylinder na górze ćwiartki                          │
├──────────────────────────────────────────────────────────┤
│ 7. Scal geometrię do jednego manifold mesh               │
│    → Eksport STL per ćwiartka                            │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Krok 1: Geometria Ramki (Leżąca na Płasko)

Istniejąca funkcja `generateFrameGeometry()` generuje ramkę w układzie:
- oś X/Y = płaszczyzna ramki
- oś Z = wysokość profilu

Frame **już leży płasko** — nie trzeba jej obracać.

**UWAGA:** Ramka musi być generowana w trybie **solid** (`isHollow = false`), ponieważ gipsowy mold powstanie z negatywu stałego kształtu.

### 4.3 Krok 2: Clipping do Ćwiartki

Każda ćwiartka to wynik **boolean intersection** pełnej ramki z prostopadłościanem pokrywającym dany kwadrans.

Dla Q1 (0°–90°):
```typescript
const clipBox = new THREE.BoxGeometry(
  rOuterMax * 2,  // dostatecznie duży
  rOuterMax * 2,
  maxHeight * 2
);
// Pozycja: przesunięty tak, aby pokrywał tylko Q1
clipBox.translate(rOuterMax, rOuterMax, 0);
```

**Biblioteka CSG:** Użyj `three-bvh-csg` lub `three-csg-ts` do operacji boolean.

Rekomendowana biblioteka: **`three-bvh-csg`** — najlepsza wydajność i jakość wynikowej siatki.

```bash
npm install three-bvh-csg
```

```typescript
import { SUBTRACTION, INTERSECTION, Evaluator, Brush } from 'three-bvh-csg';

const evaluator = new Evaluator();
const frameBrush = new Brush(frameGeometry);
const clipBrush = new Brush(clipBoxGeometry);
const quarterGeometry = evaluator.evaluate(frameBrush, clipBrush, INTERSECTION);
```

### 4.4 Krok 3: Generowanie Pojemnika (Mold Box)

Pojemnik to **otwarte pudełko** w kształcie ćwiartki koła:

```typescript
interface MoldBoxParams {
  innerRadiusMin: number;    // rInner - clearance (ale min 0)
  innerRadiusMax: number;    // rOuterMax + clearance
  angleStart: number;        // np. 0
  angleEnd: number;          // np. Math.PI / 2
  height: number;            // moldBaseThickness + maxHeight + moldWallHeight
  wallThickness: number;     // moldWallThickness
  baseThickness: number;     // moldBaseThickness
}
```

Geometria pojemnika składa się z:
1. **Dno** — płaski dysk (ćwiartka pierścienia) o grubości `baseThickness`.
2. **Ściana zewnętrzna zakrzywiona** — łuk od `angleStart` do `angleEnd` na promieniu `innerRadiusMax + wallThickness`, od dna do pełnej wysokości.
3. **Dwie ściany dzielące** — prostokątne płyty na kątach `angleStart` i `angleEnd`, od centrum do promienia zewnętrznego.

**Kąt pochylenia (draft angle):**
Ściany zewnętrzne powinny być lekko rozchylone na zewnątrz (2°), aby gipsowy odlew dał się wyjąć z formy.

```typescript
const draftOffset = height * Math.tan(draftAngle * Math.PI / 180);
// Na górze ściany promień jest o `draftOffset` większy niż na dole
```

### 4.5 Krok 4: Ściany Dzielące

Dwie płaskie ściany na liniach podziału. Każda ściana to prostokąt od centrum ramki (`r=0`) do krawędzi zewnętrznej (`r = rOuterMax + clearance + wallThickness`), o wysokości `baseThickness + maxHeight + moldWallHeight`.

```
Ściana dzieląca (np. oś X):
  - Start:  (0, 0, 0)
  - End:    (rMax + clearance + wallThickness, 0, totalHeight)
  - Grubość: moldWallThickness / 2  (każda ćwiartka ma połówkę)
```

**WAŻNE:** Ściana dzieląca musi mieć tę samą grubość co `moldWallThickness`, ale jest dzielona po połowie między sąsiednie ćwiartki. Dzięki temu po złożeniu 4 części ściany dzielące tworzą pełną grubość.

### 4.6 Krok 5: Zamki Rejestracyjne (Registration Keys)

Zamki to **półkule** umieszczone na powierzchni ścian dzielących.
- Na jednej ścianie dzielącej: **wgłębienia (negatywowe)**.
- Na sąsiedniej ścianie dzielącej: **wypukłości (pozytywowe)**.

```
Ćwiartka  | Ściana A (dolna)  | Ściana B (lewa)
Q1        |  ♂ (wypukłość)    |  ♀ (wgłębienie)
Q2        |  ♂ (wypukłość)    |  ♀ (wgłębienie)
Q3        |  ♀ (wgłębienie)   |  ♂ (wypukłość)
Q4        |  ♀ (wgłębienie)   |  ♂ (wypukłość)
```

Schemat gwarantuje, że każda para sąsiednich ścian ma jeden ♂ i jeden ♀.

**Pozycja zamków:**
```typescript
const keyPositions = [];
for (let i = 0; i < keyCount; i++) {
  const t = (i + 1) / (keyCount + 1); // równomiernie rozmieszczone
  const r = rInner + (rOuterMax - rInner) * t;
  const z = totalHeight * 0.5; // w połowie wysokości ściany
  keyPositions.push({ r, z });
}
```

**Geometria zamka:**
```typescript
const keyGeometry = new THREE.SphereGeometry(keyRadius, 16, 16, 0, Math.PI); // hemisphere
```

### 4.7 Krok 6: Kołnierz (Collar)

Kołnierz to dodatkowy cylinder/pierścień na górze moldu, wokół otworu wlewowego. Służy jako rezerwuar — slip opada w trakcie absorpcji wody przez gips, a kołnierz zapewnia wystarczający zapas.

```
Kołnierz = cylinder o promieniu wewnętrznym = rInner
                      promieniu zewnętrznym = rInner + collarWallThickness
                      wysokości = collarHeight
```

Kołnierz generowany jest **tylko w jednej z 4 części** (lub we wszystkich, z podziałem na ćwiartki).

---

## 5. Interfejs Konfiguracji (UI)

### 5.1 Nowe Parametry (`MoldConfig`)

```typescript
export interface MoldConfig {
  enabled: boolean;              // Włącz/wyłącz generowanie moldu
  moldWallThickness: number;     // Grubość ścian pojemnika [mm]
  moldWallHeight: number;        // Wysokość ścian nad ramką [mm]
  moldBaseThickness: number;     // Grubość dna [mm]
  moldClearance: number;         // Margines wokół ramki [mm]
  keyRadius: number;             // Promień zamków [mm]
  keyCount: number;              // Liczba zamków per ściana
  draftAngle: number;            // Kąt pochylenia ścian [°]
  collarEnabled: boolean;        // Generuj kołnierz
  collarHeight: number;          // Wysokość kołnierza [mm]
  splitAngle: number;            // Kąt obrotu linii podziału [°] (domyślnie 0)
}
```

### 5.2 Sekcja w Panelu Controls

Nowa sekcja **"Mold Slipcast"** w panelu Controls, z togglem do włączania. Po włączeniu:
- Widok 3D przechodzi w **tryb moldu** — zamiast samej ramki, wyświetlane są 4 pojemniki z ramką wewnątrz.
- Suwaki kontrolują parametry moldu.
- Przycisk "Eksportuj Mold STL" generuje 4 osobne pliki STL.

### 5.3 Podgląd 3D

W trybie moldu:
- Każda z 4 ćwiartek wyświetlana jest z lekkim rozsunięciem (exploded view) dla czytelności.
- Kolor pojemnika: półprzezroczysty szary.
- Kolor ramki: normalny kolor z configu.
- Zamki podświetlone na zielono (♂) / czerwono (♀).

---

## 6. Eksport STL

### 6.1 Pliki Wyjściowe

Eksport generuje **4 osobne pliki STL**:
```
ramka_mold_Q1.stl
ramka_mold_Q2.stl
ramka_mold_Q3.stl
ramka_mold_Q4.stl
```

Każdy plik zawiera:
- Mold box (pojemnik) z zamkami.
- Ćwiartkę ramki osadzoną na dnie.
- Opcjonalnie kołnierz.

### 6.2 Weryfikacja Manifold

Każda geometria musi być **manifold (wodoszczelna)**:
- Brak otworów, brak otwartych krawędzi.
- Prawidłowa orientacja normali (CCW widziane z zewnątrz).
- CSG operations muszą generować czyste wyniki.

---

## 7. Struktura Plików (Implementacja)

```
/
├── components/
│   ├── Controls.tsx         # ← Dodać sekcję MoldConfig
│   ├── SocketFrame.tsx      # ← Dodać tryb mold preview
│   └── MoldPreview.tsx      # [NOWY] Podgląd 4 ćwiartek moldu
├── utils/
│   ├── geometry.ts          # ← Istniejący
│   ├── exportUtils.ts       # ← Rozszerzyć o export 4 plików
│   └── moldGeometry.ts      # [NOWY] Logika generowania moldu
├── types.ts                 # ← Dodać MoldConfig interface
└── App.tsx                  # ← Dodać obsługę trybu mold
```

### 7.1 Nowe Pliki

#### `utils/moldGeometry.ts`
Główny moduł z funkcjami:
```typescript
// Generuje ćwiartkę ramki (CSG intersection)
export function generateQuarterFrame(
  frameGeometry: THREE.BufferGeometry,
  quadrant: 0 | 1 | 2 | 3,
  config: FrameConfig
): THREE.BufferGeometry;

// Generuje mold box (pojemnik) dla jednej ćwiartki
export function generateMoldBox(
  quadrant: 0 | 1 | 2 | 3,
  frameConfig: FrameConfig,
  moldConfig: MoldConfig
): THREE.BufferGeometry;

// Generuje zamki rejestracyjne
export function generateRegistrationKeys(
  quadrant: 0 | 1 | 2 | 3,
  moldConfig: MoldConfig,
  frameConfig: FrameConfig
): { positive: THREE.BufferGeometry[]; negative: THREE.BufferGeometry[] };

// Scala wszystko w jeden mesh per ćwiartka
export function generateCompleteMoldPart(
  quadrant: 0 | 1 | 2 | 3,
  frameConfig: FrameConfig,
  moldConfig: MoldConfig
): THREE.BufferGeometry;
```

#### `components/MoldPreview.tsx`
Komponent React Three Fiber wyświetlający 4 ćwiartki w trybie exploded view:
```typescript
interface MoldPreviewProps {
  frameConfig: FrameConfig;
  moldConfig: MoldConfig;
  explodeDistance: number; // Odległość rozsunięcia ćwiartek
}
```

### 7.2 Zmiany w Istniejących Plikach

#### `types.ts`
Dodać `MoldConfig` interface i `DEFAULT_MOLD_CONFIG`.

#### `App.tsx`
- Dodać stan `moldConfig`.
- Warunkowe renderowanie `SocketFrame` vs `MoldPreview`.
- Dodać `handleMoldExport()` generujący i pobierający 4 pliki STL.

#### `components/Controls.tsx`
- Nowa sekcja "Mold Slipcast" z suwakami i toggleami.

#### `utils/exportUtils.ts`
- Dodać `downloadMultipleSTL()` — eksport wielu plików (lub ZIP).

---

## 8. Uwagi Implementacyjne

### 8.1 Kompensacja Skurczu

Mold box **NIE powinien** stosować kompensacji skurczu (`shrinkagePercent`). Kompensacja dotyczy ramki — mold jest drukowany 1:1. Sam model ramki wewnątrz moldu **powinien** być skompensowany, ponieważ to on definiuje kształt negatywu gipsu.

### 8.2 Tolerancje Montażowe

Ściany dzielące powinny mieć lekki **margines montażowy** (0.2 mm) taki, aby po wydrukowaniu 4 części dobrze do siebie pasowały.

### 8.3 Wydajność

- CSG operations mogą być wolne — uruchamiać w `setTimeout` lub `Web Worker`.
- Preview mesh może mieć niższą rozdzielczość (`qualityMultiplier = 0.5`).
- Export mesh używa pełnej rozdzielczości (`qualityMultiplier = 3.0`).

### 8.4 Zamienność Zamków

Schemat zamków (♂/♀) musi gwarantować, że **każda ćwiartka pasuje tylko w jednym orientacji** — zapobiega to błędnemu złożeniu moldu.

---

## 9. Proces Użytkowy (UX Flow)

```
1. Użytkownik projektuje ramkę (istniejący UI)
      ↓
2. Włącza toggle "Mold Slipcast" w panelu Controls
      ↓
3. Widok 3D przechodzi w tryb exploded view 4 ćwiartek
      ↓
4. Dostosowuje parametry moldu (grubość ścian, clearance, itp.)
      ↓
5. Klika "Eksportuj Mold STL"
      ↓
6. Pobiera 4 pliki STL (lub ZIP)
      ↓
7. Drukuje 4 pojemniki na drukarce 3D
      ↓
8. Wlewa gips do każdego pojemnika
      ↓
9. Po wyschnięciu wyjmuje gipsowe ćwiartki z drukowanych form
      ↓
10. Składa 4-częściowy gipsowy mold (zamki zapewniają pozycjonowanie)
      ↓
11. Wlewa slip, czeka na absorpcję, wylewa nadmiar
      ↓
12. Rozbiera mold → gotowy ceramiczny odlew ramki
```
