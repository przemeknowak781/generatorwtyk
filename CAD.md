# Pipeline Rysunków Technicznych CAD

## 1. Cel Modułu

Moduł generuje **profesjonalne rysunki techniczne** (rzuty ortogonalne) z modeli 3D konfigurowanych w aplikacji. Rysunki muszą spełniać normy ISO i nadawać się do dokumentacji produkcyjnej.

### 1.1 Wymagane Rzuty

| Rzut | Kierunek patrzenia | Kamera (pozycja) |
|:---|:---|:---|
| **Z przodu** (Front) | Wzdłuż osi Y | `(0, -∞, 0)` patrząc na `(0,0,0)` |
| **Z boku** (Right Side) | Wzdłuż osi X | `(+∞, 0, 0)` patrząc na `(0,0,0)` |
| **Z tyłu** (Back) | Wzdłuż osi -Y | `(0, +∞, 0)` patrząc na `(0,0,0)` |
| **Z góry** (Top) | Wzdłuż osi Z | `(0, 0, +∞)` patrząc na `(0,0,0)` |

### 1.2 Format Wyjściowy

- **SVG** — wektorowy, skalowalny, idealny do PDF/druku
- **DXF** — kompatybilny z AutoCAD/Fusion 360/SolidWorks
- **PDF** — gotowy do druku z ramką rysunkową (title block)

---

## 2. Normy Techniczne

### 2.1 ISO 128 — Zasady Ogólne Rysunku Technicznego

| Aspekt | Norma | Opis |
|:---|:---|:---|
| Zasady ogólne | ISO 128-1 | Rysunek musi być jednoznaczny, czytelny i kompletny |
| Rodzaje linii | ISO 128-20 | Definicje typów linii i ich zastosowań |
| Rzuty | ISO 128-30 | Konwencje widoków ortogonalnych |
| Przekroje | ISO 128-40 | Zasady tworzenia przekrojów |

### 2.2 Rodzaje Linii (ISO 128-20)

```
┌─────────────────────┬────────────────────┬──────────────┬───────────────────────┐
│ Typ linii           │ Wygląd             │ Grubość      │ Zastosowanie          │
├─────────────────────┼────────────────────┼──────────────┼───────────────────────┤
│ Ciągła gruba        │ ─────────────────  │ 0.5-0.7 mm   │ Krawędzie widoczne    │
│ Ciągła cienka       │ ─────────────────  │ 0.25-0.35 mm │ Linie wymiarowe,      │
│                     │                    │              │ pomocnicze, kreskow.  │
│ Kreskowa cienka     │ - - - - - - - - -  │ 0.25-0.35 mm │ Krawędzie niewidoczne │
│ Kresk.-kropkowa     │ ─·─·─·─·─·─·─·─   │ 0.25 mm      │ Osie symetrii, centra │
│ Kresk.-2xkropkowa   │ ─··─··─··─··─··─   │ 0.25 mm      │ Linie zginania        │
└─────────────────────┴────────────────────┴──────────────┴───────────────────────┘
```

**Proporcja grubości:** linia gruba : linia cienka = **2:1**  
**Zakres grubości:** 0.18 mm – 2.0 mm

### 2.3 Rzutowanie — Metoda Europejska (First Angle / ISO 5456)

Polska i Europa stosują **rzut pierwszokątowy (first-angle projection)**:

```
                    ┌──────────┐
                    │  WIDOK   │
                    │  Z DOŁU  │
                    └──────────┘
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  WIDOK   │    │  WIDOK   │    │  WIDOK   │
    │ Z PRAWEJ │    │ Z PRZODU │    │ Z LEWEJ  │
    └──────────┘    └──────────┘    └──────────┘
                    ┌──────────┐
                    │  WIDOK   │
                    │  Z GÓRY  │
                    └──────────┘
```

**Symbol rzutowania pierwszokątowego** (w tabelce rysunkowej):
```
    ◯
  ⊣─┤
```

### 2.4 Wymiarowanie (ISO 129)

- Każdy wymiar podany **tylko raz**
- Wymiary w **milimetrach** (bez podawania jednostki)
- Unikać wymiarowania do linii niewidocznych
- Linia wymiarowa zakończona **grotami strzałek** (7-10× grubość linii)
- Tekst wymiarowy nad linią wymiarową, wycentrowany
- Czcionka: ISO 3098-1 (odpowiednik: `Arial` lub `ISOCPEUR`)

---

## 3. Stack Technologiczny

### 3.1 Kluczowe Biblioteki

| Biblioteka | Wersja | Rola |
|:---|:---|:---|
| `three-edge-projection` | ^0.2.x | **Kluczowa** — ekstrakcja widocznych/niewidocznych krawędzi z geometrii 3D |
| `three-mesh-bvh` | ^0.8.x | Zależność `three-edge-projection`, BVH acceleration |
| `@tarikjabiri/dxf` | ^2.x | Generowanie plików DXF programatycznie |
| `three` (istniejący) | ^0.182 | Silnik 3D, OrthographicCamera, geometria |

### 3.2 Dlaczego `three-edge-projection`?

Jest to **jedyna dojrzała biblioteka** w ekosystemie Three.js, która:

1. **Ekstrakcja widocznych krawędzi** — `getVisibleLineGeometry()` zwraca `BufferGeometry` z segmentami linii widocznych z danego kierunku
2. **Ekstrakcja niewidocznych krawędzi** — `getHiddenLineGeometry()` zwraca krawędzie zakryte przez inne części modelu (linie kreskowe na rysunku)
3. **Projekcja wzdłuż osi** — spłaszcza 3D → 2D wzdłuż wybranej osi
4. **Bazuje na BVH** — szybkie obliczenia nawet dla złożonych siatek
5. **Obsługa przecięć** — `includeIntersectionEdges` generuje krawędzie na styku trójkątów

**API:**
```typescript
import { ProjectionGenerator } from 'three-edge-projection';

const generator = new ProjectionGenerator();
generator.angleThreshold = 50;          // próg kąta krawędzi [°]
generator.includeIntersectionEdges = true;

const result = await generator.generateAsync(meshOrScene);

const visibleEdges = result.getVisibleLineGeometry();   // BufferGeometry
const hiddenEdges  = result.getHiddenLineGeometry();    // BufferGeometry
```

### 3.3 Dlaczego NIE `SVGRenderer`?

Three.js `SVGRenderer`:
- ❌ **Nie obsługuje ukrywania linii** (hidden line removal)
- ❌ Renderuje WSZYSTKIE krawędzie — wynik jest nieczytelny
- ❌ Wolny przy złożonych geometriach
- ❌ Brak kontroli nad typami linii (grube/cienkie/kreskowe)

`three-edge-projection` rozwiązuje te problemy na poziomie geometrycznym.

---

## 4. Architektura Pipeline'u

### 4.1 Diagram Przepływu

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. PRZYGOTOWANIE GEOMETRII                                          │
│    ┌─────────────────────────────────────────────────────────┐      │
│    │ generateFrameGeometry(config, qualityMultiplier=3)      │      │
│    │ → BufferGeometry (high-poly, solid)                     │      │
│    │ + merge balls/cones into single geometry                │      │
│    └─────────────────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────────────────────┤
│ 2. ORIENTACJA MODELU (per rzut)                                     │
│    ┌─────────────────────────────────────────────────────────┐      │
│    │ Rotate geometry so desired view direction aligns        │      │
│    │ with projection axis (-Y in three-edge-projection)      │      │
│    │                                                         │      │
│    │ Front:  rotate(0, 0, 0)      — domyślnie               │      │
│    │ Right:  rotate(0, -π/2, 0)   — obrót wokół Z           │      │
│    │ Back:   rotate(0, π, 0)      — obrót 180°              │      │
│    │ Top:    rotate(-π/2, 0, 0)   — obrót wokół X           │      │
│    └─────────────────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────────────────────┤
│ 3. EKSTRAKCJA KRAWĘDZI                                              │
│    ┌─────────────────────────────────────────────────────────┐      │
│    │ ProjectionGenerator.generateAsync(rotatedGeometry)      │      │
│    │ → visibleLines: BufferGeometry (LineSegments)           │      │
│    │ → hiddenLines:  BufferGeometry (LineSegments)           │      │
│    └─────────────────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────────────────────┤
│ 4. KONWERSJA DO 2D SEGMENTÓW                                        │
│    ┌─────────────────────────────────────────────────────────┐      │
│    │ Extract position attribute from BufferGeometry          │      │
│    │ → Array<{x1,y1, x2,y2}> (pary punktów, mm)             │      │
│    │ Flatten: odrzuć oś projekcji (Z po rotacji)             │      │
│    └─────────────────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────────────────────┤
│ 5. WYMIAROWANIE AUTOMATYCZNE                                        │
│    ┌─────────────────────────────────────────────────────────┐      │
│    │ Oblicz bounding box widocznych krawędzi                 │      │
│    │ Generuj linie wymiarowe:                                │      │
│    │   - Średnica zewnętrzna (outerDiameter)                 │      │
│    │   - Średnica otworu (innerHoleDiameter)                 │      │
│    │   - Wysokość (height + reliefHeight)                    │      │
│    │   - Głębokość stopnia (seatingRingDepth)                │      │
│    │   - Linie osi symetrii                                  │      │
│    └─────────────────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────────────────────┤
│ 6. RENDERING WYJŚCIOWY                                              │
│    ┌─────────────────────────────────────────────────────────┐      │
│    │ A. SVG: Buduj dokument SVG z warstw (layers)            │      │
│    │    - <g class="visible">   → stroke-width: 0.5mm        │      │
│    │    - <g class="hidden">    → stroke-dasharray, 0.25mm   │      │
│    │    - <g class="centerline"> → dash-dot pattern           │      │
│    │    - <g class="dimensions"> → linie wymiarowe + tekst    │      │
│    │    - <g class="titleblock"> → ramka rysunkowa            │      │
│    │                                                         │      │
│    │ B. DXF: @tarikjabiri/dxf z warstwami:                   │      │
│    │    - VISIBLE (kolor 7-biały, linia CONTINUOUS, 0.5mm)   │      │
│    │    - HIDDEN  (kolor 1-czerw, linia DASHED, 0.25mm)      │      │
│    │    - CENTER  (kolor 2-żółty, linia DASHDOT, 0.18mm)     │      │
│    │    - DIM     (kolor 3-zielony, linia CONTINUOUS, 0.18mm)│      │
│    │                                                         │      │
│    │ C. PDF: Canvas → jsPDF lub SVG → PDF                    │      │
│    └─────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Uwaga o Osi Projekcji

`three-edge-projection` domyślnie projektuje **wzdłuż osi Y** (z góry na dół). Dlatego konieczna jest **rotacja geometrii** przed projekcją, aby uzyskać pożądany widok:

```typescript
// Nasz model: ramka leży w płaszczyźnie XY, oś Z = wysokość
// three-edge-projection projektuje wzdłuż -Y

// Front view (patrzymy wzdłuż Y na przód):
// → Obrót: żaden — Y jest natural projection axis
// → Wynik 2D: X = szerokość, Z = wysokość

// Right side view (patrzymy wzdłuż X):
// → Obrót geometrii o -90° wokół Z
// → Teraz "prawa strona" jest wyrównana z osią Y

// Top view (patrzymy z góry, wzdłuż Z):
// → Obrót geometrii o -90° wokół X
// → Teraz "góra" jest wyrównana z osią Y

// Back view (patrzymy z tyłu, wzdłuż -Y):
// → Obrót geometrii o 180° wokół Z
```

---

## 5. Szczegółowy Plan Implementacji

### 5.1 Nowe Pliki

```
/
├── utils/
│   ├── cadProjection.ts     # [NOWY] Ekstrakcja krawędzi, rotacje
│   ├── cadSvgRenderer.ts    # [NOWY] Budowanie dokumentu SVG
│   ├── cadDxfRenderer.ts    # [NOWY] Budowanie pliku DXF
│   ├── cadDimensions.ts     # [NOWY] Automatyczne wymiarowanie
│   └── cadSheetLayout.ts    # [NOWY] Układ arkusza z 4 rzutami
├── components/
│   └── CadExportPanel.tsx   # [NOWY] UI panel eksportu rysunków
└── types.ts                 # ← Rozszerzyć o CadConfig
```

### 5.2 Nowe Zależności

```bash
npm install three-edge-projection three-mesh-bvh @tarikjabiri/dxf
```

> **Uwaga:** `three-mesh-bvh` jest peer dependency `three-edge-projection`.

### 5.3 Krok 1: `CadConfig` (types.ts)

```typescript
export interface CadConfig {
  // Rzuty do wygenerowania
  views: ('front' | 'right' | 'back' | 'top')[];
  
  // Jakość ekstrakcji krawędzi
  angleThreshold: number;          // [30-70°] próg detekcji krawędzi
  includeHiddenLines: boolean;     // czy rysować linie kreskowe
  includeIntersectionEdges: boolean;
  qualityMultiplier: number;       // mnożnik rozdzielczości geometrii
  
  // Wymiarowanie
  showDimensions: boolean;
  showCenterlines: boolean;
  showTitleBlock: boolean;
  
  // Arkusz
  sheetSize: 'A4' | 'A3' | 'A2';  // rozmiar papieru
  scale: number;                    // skala rysunku (np. 1, 2, 5)
  projectionMethod: 'first-angle' | 'third-angle';
  
  // Eksport
  exportFormat: 'svg' | 'dxf' | 'both';
  
  // Metadane ramki rysunkowej
  titleBlock: {
    projectName: string;
    drawingNumber: string;
    author: string;
    date: string;
    material: string;
    scale: string;
  };
}

export const DEFAULT_CAD_CONFIG: CadConfig = {
  views: ['front', 'right', 'back', 'top'],
  angleThreshold: 50,
  includeHiddenLines: true,
  includeIntersectionEdges: true,
  qualityMultiplier: 3,
  showDimensions: true,
  showCenterlines: true,
  showTitleBlock: true,
  sheetSize: 'A3',
  scale: 1,
  projectionMethod: 'first-angle',
  exportFormat: 'svg',
  titleBlock: {
    projectName: 'Ramka Gniazdkowa',
    drawingNumber: 'RF-001',
    author: '',
    date: new Date().toISOString().split('T')[0],
    material: 'Ceramika / PLA',
    scale: '1:1',
  },
};
```

### 5.4 Krok 2: `cadProjection.ts` — Ekstrakcja Krawędzi

```typescript
import * as THREE from 'three';
import { ProjectionGenerator } from 'three-edge-projection';
import { FrameConfig } from '../types';
import { generateFrameGeometry, generateSolidHalfCone } from './geometry';

// Typy definiujące segment 2D  
export interface LineSegment2D {
  x1: number; y1: number;
  x2: number; y2: number;
}

export interface ViewProjection {
  viewName: string;
  visible: LineSegment2D[];
  hidden: LineSegment2D[];
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
}

// Rotacje dla poszczególnych widoków
const VIEW_ROTATIONS: Record<string, THREE.Euler> = {
  'front': new THREE.Euler(Math.PI / 2, 0, 0),          // X→X, Z→Y
  'right': new THREE.Euler(Math.PI / 2, 0, -Math.PI / 2),
  'back':  new THREE.Euler(Math.PI / 2, 0, Math.PI),
  'top':   new THREE.Euler(0, 0, 0),                     // brak rotacji = widok z góry (Y axis)
};

/**
 * Buduje pełną geometrię modelu (ramka + dekoracje) jako jeden mesh
 */
function buildCompleteMesh(config: FrameConfig): THREE.BufferGeometry {
  const geom = generateFrameGeometry(config, 3); // high-poly
  // TODO: merge balls/cones geometries using BufferGeometryUtils.mergeGeometries
  return geom;
}

/**
 * Projektuje geometrię na 2D z ekstrakcją krawędzi widocznych/ukrytych
 */
export async function projectView(
  geometry: THREE.BufferGeometry,
  viewName: string,
  angleThreshold: number = 50,
  onProgress?: (msg: string) => void
): Promise<ViewProjection> {
  // 1. Klonuj i obróć geometrię
  const rotated = geometry.clone();
  const rotation = VIEW_ROTATIONS[viewName];
  rotated.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rotation));
  
  // 2. Ekstrakcja krawędzi
  const generator = new ProjectionGenerator();
  generator.angleThreshold = angleThreshold;
  generator.includeIntersectionEdges = true;
  
  const result = await generator.generateAsync(rotated, {
    onProgress: (msg: string) => onProgress?.(`${viewName}: ${msg}`),
  });
  
  // 3. Konwersja BufferGeometry → LineSegment2D[]
  const visible = extractSegments(result.getVisibleLineGeometry());
  const hidden  = extractSegments(result.getHiddenLineGeometry());
  
  // 4. Bounding box
  const allSegments = [...visible, ...hidden];
  const bb = computeBoundingBox(allSegments);
  
  return { viewName, visible, hidden, boundingBox: bb };
}

function extractSegments(lineGeom: THREE.BufferGeometry): LineSegment2D[] {
  const pos = lineGeom.getAttribute('position');
  if (!pos) return [];
  
  const segments: LineSegment2D[] = [];
  for (let i = 0; i < pos.count; i += 2) {
    segments.push({
      x1: pos.getX(i),   y1: pos.getZ(i),   // Y-axis projection: use X,Z
      x2: pos.getX(i+1), y2: pos.getZ(i+1),
    });
  }
  return segments;
}

function computeBoundingBox(segs: LineSegment2D[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of segs) {
    minX = Math.min(minX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2);
    maxX = Math.max(maxX, s.x1, s.x2);
    maxY = Math.max(maxY, s.y1, s.y2);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Generuje wszystkie 4 rzuty
 */
export async function generateAllProjections(
  config: FrameConfig,
  views: string[],
  angleThreshold: number,
  onProgress?: (msg: string) => void
): Promise<ViewProjection[]> {
  const geometry = buildCompleteMesh(config);
  const projections: ViewProjection[] = [];
  
  for (const view of views) {
    onProgress?.(`Generating ${view} view...`);
    const proj = await projectView(geometry, view, angleThreshold, onProgress);
    projections.push(proj);
  }
  
  geometry.dispose();
  return projections;
}
```

### 5.5 Krok 3: `cadDimensions.ts` — Automatyczne Wymiarowanie

```typescript
import { FrameConfig } from '../types';
import { LineSegment2D } from './cadProjection';

export interface DimensionLine {
  type: 'linear' | 'diameter' | 'radius' | 'angular';
  // Punkty końcowe wymiaru (w mm modelu)
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  // Offset linii wymiarowej od obiektu
  offset: number;
  // Wartość wymiaru
  value: number;
  // Tekst (np. "⌀46.8" lub "12")
  label: string;
  // Kierunek: horizontal | vertical
  direction: 'horizontal' | 'vertical';
}

export interface CenterLine {
  x1: number; y1: number;
  x2: number; y2: number;
  type: 'axis' | 'center-mark';
}

/**
 * Generuje wymiary automatycznie na podstawie configu i widoku
 */
export function generateDimensions(
  viewName: string,
  config: FrameConfig,
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
): DimensionLine[] {
  const dims: DimensionLine[] = [];
  const comp = 1 / (1 - config.shrinkagePercent / 100);
  const outerR = (config.outerDiameter / 2) * comp;
  const innerR = (config.innerHoleDiameter / 2) * comp;
  const totalH = (config.height + config.reliefHeight) * comp;
  
  if (viewName === 'front' || viewName === 'back') {
    // Wymiar średnicy zewnętrznej (horizontal)
    dims.push({
      type: 'linear', direction: 'horizontal',
      p1: { x: -outerR, y: 0 }, p2: { x: outerR, y: 0 },
      offset: -8, value: config.outerDiameter,
      label: `⌀${config.outerDiameter}`,
    });
    // Wymiar średnicy otworu
    dims.push({
      type: 'linear', direction: 'horizontal',
      p1: { x: -innerR, y: 0 }, p2: { x: innerR, y: 0 },
      offset: -14, value: config.innerHoleDiameter,
      label: `⌀${config.innerHoleDiameter}`,
    });
    // Wymiar wysokości (vertical)
    dims.push({
      type: 'linear', direction: 'vertical',
      p1: { x: outerR, y: 0 }, p2: { x: outerR, y: totalH },
      offset: 8, value: +(totalH / comp).toFixed(1),
      label: `${(totalH / comp).toFixed(1)}`,
    });
  }
  
  if (viewName === 'top') {
    dims.push({
      type: 'diameter', direction: 'horizontal',
      p1: { x: -outerR, y: 0 }, p2: { x: outerR, y: 0 },
      offset: -8, value: config.outerDiameter,
      label: `⌀${config.outerDiameter}`,
    });
    dims.push({
      type: 'diameter', direction: 'horizontal',
      p1: { x: -innerR, y: 0 }, p2: { x: innerR, y: 0 },
      offset: -14, value: config.innerHoleDiameter,
      label: `⌀${config.innerHoleDiameter}`,
    });
  }
  
  return dims;
}

/**
 * Generuje linie osi symetrii
 */
export function generateCenterlines(
  viewName: string,
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
): CenterLine[] {
  const lines: CenterLine[] = [];
  const ext = 5; // extension beyond bounding box
  
  // Oś pionowa
  lines.push({
    x1: 0, y1: boundingBox.minY - ext,
    x2: 0, y2: boundingBox.maxY + ext,
    type: 'axis',
  });
  
  if (viewName === 'top') {
    // Oś pozioma (widok z góry = symetria w obu osiach)
    lines.push({
      x1: boundingBox.minX - ext, y1: 0,
      x2: boundingBox.maxX + ext, y2: 0,
      type: 'axis',
    });
  }
  
  return lines;
}
```

### 5.6 Krok 4: `cadSvgRenderer.ts` — Renderowanie SVG

```typescript
import { ViewProjection, LineSegment2D } from './cadProjection';
import { DimensionLine, CenterLine } from './cadDimensions';
import { CadConfig } from '../types';

// Rozmiary arkuszy w mm
const SHEET_SIZES: Record<string, { w: number; h: number }> = {
  'A4': { w: 297, h: 210 },
  'A3': { w: 420, h: 297 },
  'A2': { w: 594, h: 420 },
};

interface ViewLayout {
  projection: ViewProjection;
  dimensions: DimensionLine[];
  centerlines: CenterLine[];
  // Pozycja na arkuszu (centrum widoku)
  cx: number;
  cy: number;
  // Skala rysunku
  scale: number;
}

/**
 * Buduje kompletny dokument SVG z 4 rzutami
 */
export function renderSvgDrawing(
  layouts: ViewLayout[],
  config: CadConfig,
): string {
  const sheet = SHEET_SIZES[config.sheetSize];
  const margin = 20; // mm
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${sheet.w}mm" height="${sheet.h}mm"
     viewBox="0 0 ${sheet.w} ${sheet.h}"
     style="background: white;">
<defs>
  <style>
    .visible   { stroke: #000; stroke-width: 0.5; fill: none; stroke-linecap: round; }
    .hidden    { stroke: #000; stroke-width: 0.25; fill: none; 
                 stroke-dasharray: 3,1.5; stroke-linecap: round; }
    .centerline { stroke: #000; stroke-width: 0.18; fill: none;
                  stroke-dasharray: 8,2,1,2; stroke-linecap: round; }
    .dimension { stroke: #000; stroke-width: 0.18; fill: none; }
    .dim-text  { font-family: Arial, sans-serif; font-size: 3.5px; 
                 text-anchor: middle; fill: #000; }
    .title-text { font-family: Arial, sans-serif; fill: #000; }
    .border    { stroke: #000; stroke-width: 0.7; fill: none; }
  </style>
</defs>

<!-- Ramka rysunkowa -->
<rect x="${margin}" y="${margin}" 
      width="${sheet.w - 2*margin}" height="${sheet.h - 2*margin}" 
      class="border"/>
`;

  // Renderuj każdy widok
  for (const layout of layouts) {
    svg += renderViewGroup(layout);
  }
  
  // Tabelka rysunkowa (title block)
  if (config.showTitleBlock) {
    svg += renderTitleBlock(sheet, margin, config);
  }
  
  svg += '</svg>';
  return svg;
}

function renderViewGroup(layout: ViewLayout): string {
  const { projection, dimensions, centerlines, cx, cy, scale } = layout;
  let g = `\n<!-- View: ${projection.viewName} -->\n`;
  g += `<g transform="translate(${cx}, ${cy}) scale(${scale}, -${scale})">\n`;
  
  // Linie osi
  g += `  <g class="centerline">\n`;
  for (const cl of centerlines) {
    g += `    <line x1="${cl.x1}" y1="${cl.y1}" x2="${cl.x2}" y2="${cl.y2}"/>\n`;
  }
  g += `  </g>\n`;
  
  // Krawędzie niewidoczne (najpierw, pod widocznymi)
  g += `  <g class="hidden">\n`;
  for (const seg of projection.hidden) {
    g += `    <line x1="${seg.x1}" y1="${seg.y1}" x2="${seg.x2}" y2="${seg.y2}"/>\n`;
  }
  g += `  </g>\n`;
  
  // Krawędzie widoczne (na wierzchu)
  g += `  <g class="visible">\n`;
  for (const seg of projection.visible) {
    g += `    <line x1="${seg.x1}" y1="${seg.y1}" x2="${seg.x2}" y2="${seg.y2}"/>\n`;
  }
  g += `  </g>\n`;
  
  g += `</g>\n`;
  
  // Wymiary (poza skalowaną grupą, ale z przeliczonymi koordynatami)
  g += renderDimensions(dimensions, cx, cy, scale);
  
  // Etykieta widoku
  g += `<text x="${cx}" y="${cy + 50}" class="dim-text" `
     + `style="font-size:4px; font-weight:bold;">${projection.viewName.toUpperCase()}</text>\n`;
  
  return g;
}

function renderDimensions(dims: DimensionLine[], cx: number, cy: number, scale: number): string {
  let g = `<g class="dimension">\n`;
  // ... renderowanie linii wymiarowych, grotów, tekstu
  // Każdy wymiar to: linia wymiarowa + 2 groty + linie pomocnicze + tekst
  for (const dim of dims) {
    const sx = (v: number) => cx + v * scale;
    const sy = (v: number) => cy - v * scale; // SVG Y is inverted
    
    if (dim.direction === 'horizontal') {
      const y = sy(dim.p1.y) + dim.offset;
      // Linie pomocnicze (extension lines)
      g += `  <line x1="${sx(dim.p1.x)}" y1="${sy(dim.p1.y)}" x2="${sx(dim.p1.x)}" y2="${y}" class="dimension"/>\n`;
      g += `  <line x1="${sx(dim.p2.x)}" y1="${sy(dim.p2.y)}" x2="${sx(dim.p2.x)}" y2="${y}" class="dimension"/>\n`;
      // Linia wymiarowa
      g += `  <line x1="${sx(dim.p1.x)}" y1="${y}" x2="${sx(dim.p2.x)}" y2="${y}" class="dimension" marker-start="url(#arrow-left)" marker-end="url(#arrow-right)"/>\n`;
      // Tekst
      const tx = (sx(dim.p1.x) + sx(dim.p2.x)) / 2;
      g += `  <text x="${tx}" y="${y - 1}" class="dim-text">${dim.label}</text>\n`;
    }
  }
  g += `</g>\n`;
  return g;
}

function renderTitleBlock(sheet: {w:number,h:number}, margin: number, config: CadConfig): string {
  const tb = config.titleBlock;
  const bx = sheet.w - margin - 180;
  const by = sheet.h - margin - 40;
  
  return `
<!-- Title Block -->
<g>
  <rect x="${bx}" y="${by}" width="180" height="40" class="border"/>
  <line x1="${bx}" y1="${by+13}" x2="${bx+180}" y2="${by+13}" class="border"/>
  <line x1="${bx}" y1="${by+26}" x2="${bx+180}" y2="${by+26}" class="border"/>
  <line x1="${bx+90}" y1="${by}" x2="${bx+90}" y2="${by+40}" class="border"/>
  
  <text x="${bx+5}" y="${by+10}" class="title-text" style="font-size:4px; font-weight:bold;">${tb.projectName}</text>
  <text x="${bx+5}" y="${by+22}" class="title-text" style="font-size:3px;">Nr rys: ${tb.drawingNumber}</text>
  <text x="${bx+5}" y="${by+35}" class="title-text" style="font-size:3px;">Materiał: ${tb.material}</text>
  <text x="${bx+95}" y="${by+10}" class="title-text" style="font-size:3px;">Data: ${tb.date}</text>
  <text x="${bx+95}" y="${by+22}" class="title-text" style="font-size:3px;">Skala: ${tb.scale}</text>
  <text x="${bx+95}" y="${by+35}" class="title-text" style="font-size:3px;">Autor: ${tb.author}</text>
</g>
`;
}
```

### 5.7 Krok 5: `cadDxfRenderer.ts` — Renderowanie DXF

```typescript
import Drawing from '@tarikjabiri/dxf';
import { ViewProjection } from './cadProjection';
import { DimensionLine, CenterLine } from './cadDimensions';

/**
 * Generuje plik DXF z 4 rzutami
 */
export function renderDxfDrawing(
  projections: ViewProjection[],
  dimensions: DimensionLine[][],
  centerlines: CenterLine[][],
): string {
  const d = new Drawing();
  d.setUnits('Millimeters');
  
  // Warstwy zgodne z konwencjami CAD
  d.addLayer('VISIBLE',    Drawing.ACI.WHITE,   'CONTINUOUS');
  d.addLayer('HIDDEN',     Drawing.ACI.RED,     'DASHED');
  d.addLayer('CENTER',     Drawing.ACI.YELLOW,  'DASHDOT');
  d.addLayer('DIMENSIONS', Drawing.ACI.GREEN,   'CONTINUOUS');
  d.addLayer('TITLEBLOCK', Drawing.ACI.CYAN,    'CONTINUOUS');
  
  // Offset między widokami na arkuszu
  const viewOffsets = [
    { x: 0,   y: 0   },  // front (center)
    { x: 150, y: 0   },  // right
    { x: 300, y: 0   },  // back
    { x: 0,   y: 150 },  // top
  ];
  
  projections.forEach((proj, i) => {
    const ox = viewOffsets[i].x;
    const oy = viewOffsets[i].y;
    
    // Widoczne krawędzie
    d.setActiveLayer('VISIBLE');
    for (const seg of proj.visible) {
      d.drawLine(seg.x1 + ox, seg.y1 + oy, seg.x2 + ox, seg.y2 + oy);
    }
    
    // Niewidoczne krawędzie
    d.setActiveLayer('HIDDEN');
    for (const seg of proj.hidden) {
      d.drawLine(seg.x1 + ox, seg.y1 + oy, seg.x2 + ox, seg.y2 + oy);
    }
    
    // Linie osi
    d.setActiveLayer('CENTER');
    for (const cl of centerlines[i]) {
      d.drawLine(cl.x1 + ox, cl.y1 + oy, cl.x2 + ox, cl.y2 + oy);
    }
  });
  
  return d.toDxfString();
}
```

### 5.8 Krok 6: `cadSheetLayout.ts` — Rozkład Widoków na Arkuszu

```typescript
import { ViewProjection } from './cadProjection';
import { CadConfig } from '../types';

// Rozmiary arkuszy w mm
const SHEET_SIZES: Record<string, { w: number; h: number }> = {
  'A4': { w: 297, h: 210 },
  'A3': { w: 420, h: 297 },
  'A2': { w: 594, h: 420 },
};

export interface ViewPlacement {
  viewName: string;
  cx: number;  // centrum X na arkuszu [mm]
  cy: number;  // centrum Y na arkuszu [mm]
  scale: number;
}

/**
 * Oblicza rozmieszczenie 4 rzutów na arkuszu
 * wg rzutowania pierwszokątowego (first-angle):
 *
 *   +--------+--------+
 *   | RIGHT  | FRONT  |
 *   +--------+--------+
 *   |        |  TOP   |
 *   +--------+--------+
 *
 * Widok z tyłu (BACK) umieszczamy osobno po prawej lub na dodatkowym arkuszu
 */
export function computeLayout(
  projections: ViewProjection[],
  config: CadConfig
): ViewPlacement[] {
  const sheet = SHEET_SIZES[config.sheetSize];
  const margin = 25;
  const titleBlockH = 45;
  
  const drawAreaW = sheet.w - 2 * margin;
  const drawAreaH = sheet.h - 2 * margin - titleBlockH;
  
  // Oblicz maksymalny rozmiar modelu (mm)
  let maxModelExtent = 0;
  for (const proj of projections) {
    const bb = proj.boundingBox;
    const w = bb.maxX - bb.minX;
    const h = bb.maxY - bb.minY;
    maxModelExtent = Math.max(maxModelExtent, w, h);
  }
  
  // Oblicz skalę: 4 widoki w siatce 2×2
  const cellW = drawAreaW / 2;
  const cellH = drawAreaH / 2;
  const fitScale = Math.min(cellW, cellH) / (maxModelExtent + 30); // 30mm margins
  const scale = Math.min(fitScale, config.scale);
  
  // First-angle projection layout
  const placements: ViewPlacement[] = [];
  
  const frontView = projections.find(p => p.viewName === 'front');
  const rightView = projections.find(p => p.viewName === 'right');
  const topView   = projections.find(p => p.viewName === 'top');
  const backView  = projections.find(p => p.viewName === 'back');
  
  // Front: top-right cell
  if (frontView) {
    placements.push({ viewName: 'front', cx: margin + cellW * 1.5, cy: margin + cellH * 0.5, scale });
  }
  // Right: top-left cell (first angle: prawa strona = po lewej)
  if (rightView) {
    placements.push({ viewName: 'right', cx: margin + cellW * 0.5, cy: margin + cellH * 0.5, scale });
  }
  // Top: bottom-right cell (first angle: widok z góry = pod frontem)
  if (topView) {
    placements.push({ viewName: 'top', cx: margin + cellW * 1.5, cy: margin + cellH * 1.5, scale });
  }
  // Back: bottom-left cell
  if (backView) {
    placements.push({ viewName: 'back', cx: margin + cellW * 0.5, cy: margin + cellH * 1.5, scale });
  }
  
  return placements;
}
```

### 5.9 Krok 7: `CadExportPanel.tsx` — Komponent UI

Panel w sidebar `Controls.tsx` z:
- Toggle "Rysunki CAD"
- Checkboxy wyboru rzutów (front, right, back, top)
- Slider `angleThreshold` (30–70°)
- Toggle "Linie niewidoczne"
- Toggle "Wymiary"
- Toggle "Linie osi"
- Select rozmiar arkusza (A4, A3, A2)
- Pola tabelki rysunkowej (nazwa, numer, autor, materiał)
- Przycisk **"Generuj SVG"**
- Przycisk **"Generuj DXF"**
- Progress bar (generowanie krawędzi jest asynchroniczne)

---

## 6. Sekwencja Wywołań (Orchestration)

```typescript
async function handleCadExport(
  frameConfig: FrameConfig,
  cadConfig: CadConfig,
  onProgress: (msg: string) => void
) {
  // 1. Generuj projekcje
  onProgress('Generowanie projekcji...');
  const projections = await generateAllProjections(
    frameConfig, cadConfig.views, cadConfig.angleThreshold, onProgress
  );
  
  // 2. Generuj wymiary i osie
  const dimensions = projections.map(p => 
    generateDimensions(p.viewName, frameConfig, p.boundingBox)
  );
  const centerlines = projections.map(p =>
    generateCenterlines(p.viewName, p.boundingBox)
  );
  
  // 3. Oblicz layout
  const placements = computeLayout(projections, cadConfig);
  
  // 4. Renderuj wyjście
  if (cadConfig.exportFormat === 'svg' || cadConfig.exportFormat === 'both') {
    const layouts = placements.map((pl, i) => ({
      projection: projections.find(p => p.viewName === pl.viewName)!,
      dimensions: dimensions[i],
      centerlines: centerlines[i],
      cx: pl.cx,
      cy: pl.cy,
      scale: pl.scale,
    }));
    
    const svgContent = renderSvgDrawing(layouts, cadConfig);
    downloadFile(svgContent, 'ramka_tech_drawing.svg', 'image/svg+xml');
  }
  
  if (cadConfig.exportFormat === 'dxf' || cadConfig.exportFormat === 'both') {
    const dxfContent = renderDxfDrawing(projections, dimensions, centerlines);
    downloadFile(dxfContent, 'ramka_tech_drawing.dxf', 'application/dxf');
  }
  
  onProgress('Gotowe!');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
```

---

## 7. Wyzwania Techniczne i Rozwiązania

### 7.1 Wydajność Ekstrakcji Krawędzi

| Problem | Rozwiązanie |
|:---|:---|
| Ekstrakcja krawędzi może trwać 2-15s | `generateAsync()` z progress callback |
| Blokowanie UI | Web Worker lub `requestAnimationFrame` chunking |
| High-poly = wolniej | `qualityMultiplier=3` (nie 5+) — kompromis |

### 7.2 Jakość Krawędzi

| Problem | Rozwiązanie |
|:---|:---|
| Za dużo krawędzi (szum) | Dostosuj `angleThreshold` (wyższy = mniej krawędzi) |
| Brak krawędzi na gładkich krzywiznach | Niższy `angleThreshold` + faceting w geometrii |
| Zduplikowane segmenty | Deduplikacja po ekstrakcji (epsilon comparison) |
| Krótkie artefakty | Filtruj segmenty krótsze niż 0.1mm |

### 7.3 Wymiarowanie

| Problem | Rozwiązanie |
|:---|:---|
| Wymiary nachodzą na siebie | Algorytm offset stacking (każdy kolejny wymiar dalej od obiektu) |
| Nieznany profil (zmienne parametry) | Wymiary podstawowe z `FrameConfig`, nie z geometrii |
| Groty strzałek w SVG | `<marker>` element z `<path>` trójkątnym |

### 7.4 Specyfika Modelu Ramki

Ramka gniazdkowa jest **obrotowo symetryczna** z modulacją petalową. To oznacza:
- **Widok z góry** jest najważniejszy — pokazuje pełną rozetkę z petalami
- **Widok z przodu/boku** to profil boczny — zazwyczaj identyczny (rotacyjna symetria)
- Dla ramek z `scaleX ≠ scaleY` widoki Front i Right będą się różnić

---

## 8. Przyszłe Rozszerzenia

### 8.1 Przekroje (Cross-Sections)

Wykorzystanie `PlanarIntersectionGenerator` z `three-edge-projection`:

```typescript
import { PlanarIntersectionGenerator } from 'three-edge-projection';

const sectionGen = new PlanarIntersectionGenerator();
sectionGen.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // przekrój przez środek
const sectionGeom = sectionGen.generate(frameGeometry);
```

Przekrój pokaże wewnętrzną budowę ramki (otwór, step, profil ścianki w trybie hollow).

### 8.2 Widok Izometryczny

Dodatkowy rzut perspektywiczny/izometryczny dla lepszej wizualizacji 3D.

### 8.3 Automatyczny Dobór Widoków

Na podstawie symetrii modelu (`petals`, `scaleX/Y`) automatyczne wykrywanie, które widoki są redundantne.

### 8.4 Eksport PDF z Wieloma Arkuszami

Użycie `jsPDF` do generowania wielostronicowych PDF z title block.

### 8.5 Tolerancje i GD&T

Dodanie oznaczeń tolerancji geometrycznych (ISO 1101) dla krytycznych wymiarów.

---

## 9. Checklist Implementacji

- [ ] Instalacja `three-edge-projection`, `three-mesh-bvh`, `@tarikjabiri/dxf`
- [ ] `types.ts` — dodać `CadConfig` + `DEFAULT_CAD_CONFIG`
- [ ] `cadProjection.ts` — rotacje + ekstrakcja krawędzi
- [ ] `cadDimensions.ts` — automatyczne wymiarowanie
- [ ] `cadSvgRenderer.ts` — tworzenie SVG
- [ ] `cadDxfRenderer.ts` — tworzenie DXF  
- [ ] `cadSheetLayout.ts` — rozkład widoków na arkuszu
- [ ] `CadExportPanel.tsx` — komponent UI
- [ ] Integracja z `App.tsx` i `Controls.tsx`
- [ ] Testy z różnymi konfiguracjami ramek
- [ ] Walidacja SVG/DXF w zewnętrznym programie CAD
- [ ] Optymalizacja wydajności (Web Worker)
- [ ] Dokumentacja użytkowa

---

## 10. Podsumowanie Decyzji Architektonicznych

| Decyzja | Wybór | Uzasadnienie |
|:---|:---|:---|
| Ekstrakcja krawędzi | `three-edge-projection` | Jedyna dojrzała biblioteka z hidden line removal w ekosystemie Three.js |
| Format wektorowy | SVG + DXF | SVG: uniwersalny, DXF: kompatybilny z CAD |
| Metoda projekcji | First-angle (ISO) | Standard europejski, właściwy dla PL |
| Wymiarowanie | Automatyczne z `FrameConfig` | Precyzyjne wymiary z parametrów, nie z heurystyk geometrycznych |
| Layout | 4 widoki na jednym arkuszu | Kompletna dokumentacja w jednym pliku |
| Typy linii | ISO 128-20 | Norma międzynarodowa, rozpoznawalna przez projektantów |
