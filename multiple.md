# Tryb Wielogniazdkowy — Specyfikacja Implementacji

> **Cel:** Dodać tryb generowania ramek z wieloma otworami gniazdkowymi (2–5) ułożonymi liniowo, bez modyfikacji istniejącej logiki pojedynczego gniazdka. Nowy moduł buduje na istniejącej bazie (`FrameConfig`, `geometry.ts`), tworząc osobną ścieżkę geometrii.

---

## 1. Architektura — Zasada Separacji

```
┌──────────────────────────────────────────────────────┐
│                    App.tsx                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │SocketFrame  │  │MultiSocket   │  │MoldPreview  │ │
│  │(existing)   │  │Frame (NEW)   │  │(existing)   │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────────┘ │
│         │                │                           │
│  ┌──────┴──────┐  ┌──────┴───────┐                   │
│  │geometry.ts  │  │multiSocket   │                   │
│  │(existing)   │  │Geometry.ts   │                   │
│  │             │  │(NEW)         │                   │
│  └─────────────┘  └──────────────┘                   │
└──────────────────────────────────────────────────────┘
```

**Kluczowa zasada:** Istniejące pliki (`geometry.ts`, `SocketFrame.tsx`, `moldGeometry.ts`) **nie są modyfikowane**. Nowy moduł importuje z nich tylko potrzebne funkcje pomocnicze.

---

## 2. Nowe Typy — `MultiSocketConfig`

### Dodać do `types.ts`:

```typescript
export type MultiSocketLayout = 'horizontal' | 'vertical';

export interface MultiSocketConfig {
  enabled: boolean;            // false = tryb pojedynczy (domyślny)
  socketCount: number;         // 1–5 (1 = równoważne z trybem single)
  layout: MultiSocketLayout;   // kierunek ułożenia gniazdek
  socketSpacing: number;       // odległość środek–środek [mm] (71mm standard EU)
  
  // ─── Kształt Obrysu Zewnętrznego ───
  outerShape: 'stadium' | 'rectangle' | 'superellipse';
  cornerRadius: number;        // zaokrąglenie narożników [mm 0–20]
  outerPadding: number;        // margines od otworu do krawędzi [mm 5–25]
  
  // ─── Mostek Między Gniazdkami ───
  bridgeStyle: 'flat' | 'raised' | 'grooved';
  bridgeWidth: number;         // szerokość mostka [mm] (auto = spacing - holeDiameter)
  bridgeHeight: number;        // wysokość mostka względem bazy [0–1 ratio]
  
  // ─── Dekoracja Mostka ───
  bridgeGrooveCount: number;   // rowki dekoracyjne na mostku [0–3]
  bridgeGrooveDepth: number;   // głębokość rowków [mm 0–1]
  
  // ─── Profil Boczny Multi ───
  multiProfileMode: 'uniform' | 'wave' | 'cascade';
  // uniform: ten sam profil na całej ramce
  // wave: profil faluje wzdłuż osi ramki
  // cascade: każde gniazdko ma malejący/rosnący profil
}

export const DEFAULT_MULTI_SOCKET_CONFIG: MultiSocketConfig = {
  enabled: false,
  socketCount: 2,
  layout: 'horizontal',
  socketSpacing: 71,        // standard EU inter-axis
  outerShape: 'stadium',
  cornerRadius: 10,
  outerPadding: 15,
  bridgeStyle: 'flat',
  bridgeWidth: 0,           // 0 = auto-calculate
  bridgeHeight: 0.5,
  bridgeGrooveCount: 0,
  bridgeGrooveDepth: 0.5,
  multiProfileMode: 'uniform',
};
```

---

## 3. Geometria — `multiSocketGeometry.ts`

### 3.1 Strategia Generacji

W przeciwieństwie do `geometry.ts` (który działa w koordynatach biegunowych wokół jednego otworu), wielogniazdkowa ramka wymaga **podejścia hybrydowego**:

1. **Obowiśnia zewnętrzna** — parametryczna krzywa 2D (stadium/prostokąt/superelipsa) definiujaca obrys ramki
2. **Otwory wewnętrzne** — N okręgów rozmieszczonych liniowo (reuse `rInner`, `rStep` z `FrameConfig`)
3. **Profil boczny** — reuse logiki z `getOuterProfile()` ale zaadaptowany do kartezjańskiego systemu
4. **Siatka** — generowana per-slice wzdłuż osi X (zamiast kąta θ)

### 3.2 Rozmiary Obliczeniowe

```typescript
export function getMultiSocketDimensions(fc: FrameConfig, mc: MultiSocketConfig) {
  const comp = 1 / (1 - fc.shrinkagePercent / 100);
  const rInner = (fc.innerHoleDiameter / 2) * comp;
  const rStep = (fc.stepDiameter / 2) * comp;
  const spacing = mc.socketSpacing * comp;
  
  // Pozycje centrów gniazdek (symetryczne względem 0)
  const centers: number[] = [];
  const totalSpan = (mc.socketCount - 1) * spacing;
  for (let i = 0; i < mc.socketCount; i++) {
    centers.push(-totalSpan / 2 + i * spacing);
  }
  
  // Bounding box zewnętrzny
  const halfWidth = totalSpan / 2 + rInner + mc.outerPadding * comp;
  const halfHeight = rInner + mc.outerPadding * comp;
  
  // Efektywny bridge width
  const bridgeW = mc.bridgeWidth > 0 
    ? mc.bridgeWidth * comp 
    : spacing - fc.innerHoleDiameter * comp; // auto
  
  return { comp, rInner, rStep, spacing, centers, halfWidth, halfHeight, bridgeW };
}
```

### 3.3 Obrys Zewnętrzny — Funkcja `getOuterBoundary()`

```typescript
/**
 * Zwraca odległość od krawędzi zewnętrznej ramki do centrum
 * w danym punkcie (x, y) — używane do sampling profilu bocznego.
 * 
 * Kształty:
 * - stadium: jak tor wyścigowy (prostokąt z półokręgami na końcach)
 * - rectangle: zaokrąglony prostokąt
 * - superellipse: |x/a|^n + |y/b|^n = 1
 */
function sdStadium(px: number, py: number, halfW: number, halfH: number): number {
  // Signed distance: <0 inside, >0 outside
  const dx = Math.abs(px) - (halfW - halfH);
  const ex = Math.max(dx, 0);
  return Math.sqrt(ex * ex + py * py) - halfH;
}

function sdRoundedRect(px: number, py: number, halfW: number, halfH: number, r: number): number {
  const dx = Math.abs(px) - halfW + r;
  const dy = Math.abs(py) - halfH + r;
  const outside = Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) - r;
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside;
}

function sdSuperellipse(px: number, py: number, a: number, b: number, n: number): number {
  const val = Math.pow(Math.abs(px / a), n) + Math.pow(Math.abs(py / b), n);
  return Math.pow(val, 1 / n) - 1; // normalized: <0 inside
}
```

### 3.4 Algorytm `generateMultiSocketGeometry()`

```typescript
export function generateMultiSocketGeometry(
  frameConfig: FrameConfig,
  multiConfig: MultiSocketConfig,
  qualityMultiplier: number = 1
): THREE.BufferGeometry {
  const dim = getMultiSocketDimensions(frameConfig, multiConfig);
  const comp = dim.comp;
  
  // Wymiary ramki
  const maxHeight = (frameConfig.height + frameConfig.reliefHeight * frameConfig.reliefHeightRatio) * comp;
  const stepHeight = frameConfig.seatingRingDepth * comp;
  
  // Grid resolution
  const resX = Math.floor(256 * qualityMultiplier);
  const resY = Math.floor(128 * qualityMultiplier);
  const resZ = Math.floor(32 * qualityMultiplier);  // profile slices
  
  // ─── KROK 1: Heightmap 2D ───
  // Dla każdego punktu (x, y) w siatce oblicz wysokość z
  
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  
  const xMin = -dim.halfWidth;
  const xMax = dim.halfWidth;
  const yMin = -dim.halfHeight;
  const yMax = dim.halfHeight;
  
  for (let iy = 0; iy <= resY; iy++) {
    for (let ix = 0; ix <= resX; ix++) {
      const u = ix / resX;
      const v = iy / resY;
      const x = xMin + u * (xMax - xMin);
      const y = yMin + v * (yMax - yMin);
      
      // 1. Oblicz odległość od krawędzi zewnętrznej
      let distOuter: number;
      switch (multiConfig.outerShape) {
        case 'stadium':
          distOuter = -sdStadium(x, y, dim.halfWidth, dim.halfHeight);
          break;
        case 'rectangle':
          distOuter = -sdRoundedRect(x, y, dim.halfWidth, dim.halfHeight, 
                                      multiConfig.cornerRadius * comp);
          break;
        case 'superellipse':
          distOuter = -sdSuperellipse(x, y, dim.halfWidth, dim.halfHeight, 3.0);
          break;
      }
      
      // Punkt poza ramką → z = 0
      if (distOuter <= 0) {
        vertices.push(x, y, 0);
        uvs.push(u, v);
        continue;
      }
      
      // 2. Oblicz odległość od najbliższego otworu
      let minDistHole = Infinity;
      let nearestCenter = 0;
      for (const cx of dim.centers) {
        const dx = x - cx;
        const dist = Math.sqrt(dx * dx + y * y);
        if (dist < minDistHole) {
          minDistHole = dist;
          nearestCenter = cx;
        }
      }
      
      // 3. Step ring + inner hole
      let z = 0;
      if (minDistHole < dim.rInner) {
        z = 0; // wewnątrz otworu
      } else if (minDistHole < dim.rStep) {
        z = stepHeight; // na pierścieniu oporowym
      } else {
        // 4. Profil boczny — interpolacja
        const profileT = Math.min(1, (distOuter) / (dim.halfHeight - dim.rStep));
        // Reuse profilu bocznego z geometry.ts (parametric)
        z = sampleProfile(profileT, maxHeight, stepHeight, frameConfig);
      }
      
      // 5. Dekoracja parametryczna (petal pattern) 
      // Opcjonalnie: aplikuj pattern kątowy per gniazdko
      const localTheta = Math.atan2(y, x - nearestCenter);
      z *= applyPetalModulation(localTheta, frameConfig);
      
      // 6. Mostek między gniazdkami
      z = applyBridgeModulation(x, y, z, dim, multiConfig, maxHeight);
      
      vertices.push(x, y, Math.max(0, z));
      uvs.push(u, v);
    }
  }
  
  // Generuj indeksy (quad grid → triangles)
  const stride = resX + 1;
  for (let iy = 0; iy < resY; iy++) {
    for (let ix = 0; ix < resX; ix++) {
      const a = iy * stride + ix;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}
```

### 3.5 Funkcje Pomocnicze Profilu

```typescript
/** Próbkuje profil boczny na znormalizowanej pozycji t ∈ [0,1] */
function sampleProfile(
  t: number, maxHeight: number, stepHeight: number, fc: FrameConfig
): number {
  const peakT = fc.peakPosition;
  const convexity = fc.profileConvexity;
  const dropAngle = fc.outerDropAngle;
  
  if (t < peakT) {
    const localT = t / peakT;
    const power = 2 - convexity * 1.5;
    const eased = 1 - Math.pow(Math.max(0, 1 - localT), power);
    return stepHeight + (maxHeight - stepHeight) * eased;
  } else {
    const localT = (t - peakT) / (1 - peakT);
    const dropPower = 1 + (dropAngle / 90) * 4;
    const eased = Math.pow(Math.max(0, Math.cos(localT * Math.PI / 2)), dropPower);
    return maxHeight * eased;
  }
}

/** Aplikuje modulację płatkową na lokalnym kącie theta */
function applyPetalModulation(theta: number, fc: FrameConfig): number {
  if (fc.petalIndentation <= 0) return 1;
  
  const rawWave = Math.cos(fc.petals * theta);
  const petalMod = (Math.sign(rawWave) * 
    Math.pow(Math.abs(rawWave), 1 / (0.1 + fc.petalRoundness * 2)) + 1) / 2;
  return 1 - fc.petalIndentation * (1 - petalMod);
}

/** Moduluje mostek między gniazdkami */
function applyBridgeModulation(
  x: number, y: number, z: number,
  dim: ReturnType<typeof getMultiSocketDimensions>,
  mc: MultiSocketConfig,
  maxHeight: number
): number {
  // Sprawdź czy punkt jest w strefie mostka
  for (let i = 0; i < dim.centers.length - 1; i++) {
    const cx0 = dim.centers[i];
    const cx1 = dim.centers[i + 1];
    const midX = (cx0 + cx1) / 2;
    const bridgeHalfW = dim.bridgeW / 2;
    
    if (Math.abs(x - midX) < bridgeHalfW) {
      switch (mc.bridgeStyle) {
        case 'flat':
          return Math.max(z, maxHeight * mc.bridgeHeight);
        case 'raised':
          const bump = Math.cos(((x - midX) / bridgeHalfW) * Math.PI / 2);
          return Math.max(z, maxHeight * mc.bridgeHeight * bump);
        case 'grooved':
          const groove = 1 - mc.bridgeGrooveDepth * 0.5;
          return z * groove;
      }
    }
  }
  return z;
}
```

---

## 4. Komponent React — `MultiSocketFrame.tsx`

### Nowy plik: `components/MultiSocketFrame.tsx`

```tsx
import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { FrameConfig, MultiSocketConfig } from '../types';
import { generateMultiSocketGeometry } from '../utils/multiSocketGeometry';

interface MultiSocketFrameProps {
  config: FrameConfig;
  multiConfig: MultiSocketConfig;
  qualityMultiplier?: number;
  onMeshReady?: (object: THREE.Object3D) => void;
}

export const MultiSocketFrame: React.FC<MultiSocketFrameProps> = ({
  config, multiConfig, qualityMultiplier = 1, onMeshReady
}) => {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    return generateMultiSocketGeometry(config, multiConfig, qualityMultiplier);
  }, [config, multiConfig, qualityMultiplier]);

  useEffect(() => {
    if (groupRef.current && onMeshReady) onMeshReady(groupRef.current);
  }, [geometry, onMeshReady]);

  const masterScale: [number, number, number] = [1, config.flipY ? -1 : 1, 1];

  return (
    <group ref={groupRef} scale={masterScale}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={config.color}
          roughness={config.roughness}
          metalness={config.metalness}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
          wireframe={config.wireframeMode}
        />
      </mesh>
    </group>
  );
};
```

---

## 5. Integracja z `App.tsx`

```tsx
// W App.tsx — dodać:
import { MultiSocketFrame } from './components/MultiSocketFrame';
import { DEFAULT_MULTI_SOCKET_CONFIG, MultiSocketConfig } from './types';

// Stan:
const [multiConfig, setMultiConfig] = useState<MultiSocketConfig>(DEFAULT_MULTI_SOCKET_CONFIG);

// W render, zamienić logikę wyboru komponentu:
<group position={[0, radius, 0]}>
  {moldConfig.enabled ? (
    <MoldPreview frameConfig={config} moldConfig={moldConfig} />
  ) : multiConfig.enabled ? (
    <MultiSocketFrame config={config} multiConfig={multiConfig} onMeshReady={handleMeshReady} />
  ) : (
    <SocketFrame config={config} onMeshReady={handleMeshReady} />
  )}
</group>

// Przekazać multiConfig do Controls:
<Controls
  config={config}
  setConfig={setConfig}
  moldConfig={moldConfig}
  setMoldConfig={setMoldConfig}
  multiConfig={multiConfig}
  setMultiConfig={setMultiConfig}
  onExport={...}
/>
```

---

## 6. Panel UI — Sekcja w `Controls.tsx`

```tsx
{/* ─── Multi-Socket Section ─── */}
<Section title="Tryb Wielogniazdkowy" color="text-cyan-600" 
         bgColor="bg-cyan-50/50" borderColor="border-cyan-100">
  <Toggle label="Włącz tryb multi" value={multiConfig.enabled}
    color="bg-cyan-600"
    onChange={(v) => setMultiConfig(p => ({ ...p, enabled: v }))} />
    
  {multiConfig.enabled && (
    <>
      <Slider label="Liczba gniazdek" value={multiConfig.socketCount}
        min={2} max={5} step={1}
        onChange={(v) => setMultiConfig(p => ({ ...p, socketCount: v }))} />
      
      <Slider label="Rozstaw [mm]" value={multiConfig.socketSpacing}
        min={60} max={90} step={0.5} unit="mm"
        onChange={(v) => setMultiConfig(p => ({ ...p, socketSpacing: v }))} />
      
      <div className="grid grid-cols-2 gap-3">
        <Slider label="Zaokrąglenie" value={multiConfig.cornerRadius}
          min={0} max={20} step={1} unit="mm"
          onChange={(v) => setMultiConfig(p => ({ ...p, cornerRadius: v }))} />
        <Slider label="Margines" value={multiConfig.outerPadding}
          min={5} max={25} step={1} unit="mm"
          onChange={(v) => setMultiConfig(p => ({ ...p, outerPadding: v }))} />
      </div>
      
      {/* Selektor kształtu obrysu */}
      <div className="flex gap-2">
        {(['stadium', 'rectangle', 'superellipse'] as const).map(shape => (
          <button key={shape}
            onClick={() => setMultiConfig(p => ({ ...p, outerShape: shape }))}
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-lg border
              ${multiConfig.outerShape === shape 
                ? 'bg-cyan-600 text-white border-cyan-600' 
                : 'bg-white text-cyan-600 border-cyan-200'}`}>
            {shape}
          </button>
        ))}
      </div>
      
      {/* Bridge controls */}
      <Slider label="Wys. mostka" value={multiConfig.bridgeHeight}
        min={0} max={1} step={0.05}
        onChange={(v) => setMultiConfig(p => ({ ...p, bridgeHeight: v }))} />
    </>
  )}
</Section>
```

---

## 7. Eksport STL — Wielogniazdkowy

```typescript
// W App.tsx — handleExport, dodać gałąź multi:
const handleMultiExport = () => {
  setIsExporting(true);
  const exportQuality = 3.0;
  
  setTimeout(() => {
    const geom = generateMultiSocketGeometry(config, multiConfig, exportQuality);
    const group = new THREE.Group();
    group.add(new THREE.Mesh(geom, new THREE.MeshBasicMaterial()));
    group.scale.set(1, config.flipY ? -1 : 1, 1);
    group.updateMatrixWorld(true);
    
    downloadSTL(group, `ramka_MULTI_${multiConfig.socketCount}x.stl`);
    setIsExporting(false);
  }, 100);
};
```

---

## 8. Wymiary Standardowe (Referencja)

| Standard | Rozstaw | Otwór | Notatki |
|---|---|---|---|
| EU (Schuko) | 71 mm | 46.8 mm | Domyślny |
| French | 71 mm | 46.8 mm | Pin centralny |
| UK (BS 1363) | 60.3 mm | — | Prostokątny |
| Italian | 26 / 40 mm | — | Zależy od typu |

### Typowe konfiguracje ramek EU:

| Gniazdka | Wymiar ramki (szer × wys) | Uwagi |
|---|---|---|
| 1× | ~80×80 mm | Istniejący tryb single |
| 2× | ~151×80 mm | Najpopularniejszy multi |
| 3× | ~222×80 mm | Powszechny |
| 4× | ~293×80 mm | Rzadszy |
| 5× | ~364×80 mm | Bardzo rzadki |

---

## 9. Krawędzie i Kompatybilność z Suwakami

Suwaki z `sliders.md` powinny **propagować** do trybu multi gdzie to możliwe:

| Suwak | Propagacja | Notatki |
|---|---|---|
| `petals`, `petalIndentation` itp. | ✅ Per-gniazdko | Wzór płatków osobno na każdym otworze |
| `profileConvexity`, `peakPosition` | ✅ Globalnie | Profil boczny wspólny |
| `topChamfer`, `topFillet` | ✅ Globalnie | Krawędzie wspólne |
| `wavyEdge` | ✅ Globalnie | Fala na krawędzi |
| `scaleX`, `scaleY` | ⚠️ Ostrożnie | Skaluje całą ramkę, nie gniazdko |
| `globalTwist` | ❌ Wyłączony | Twist na prostokącie nie ma sensu |
| `taper`, `flare` | ⚠️ Adaptacja | Zbieżność wzdłuż Z (nie osi X) |
| `showBalls`, `showCones` | ✅ Per-gniazdko | Powtórzone N razy |
| `flipY` | ✅ Globalnie | Lustro całości |

---

## 10. Priorytet Implementacji

### Faza 1 — MVP (Stadium Shape)
1. `MultiSocketConfig` interface + defaults w `types.ts`
2. `multiSocketGeometry.ts` — heightmap + stadium SDF
3. `MultiSocketFrame.tsx` — prosty render
4. Sekcja UI w `Controls.tsx` (count + spacing + padding)
5. Integracja z `App.tsx` (przełącznik single/multi)
6. Eksport STL

### Faza 2 — Mostek i Kształty
7. Bridge modulation (flat/raised/grooved)
8. Rounded rectangle shape
9. Superellipse shape
10. Bridge groove decoration

### Faza 3 — Pełna Integracja
11. Propagacja suwaków parametrycznych per-gniazdko
12. Kulki/stożki dekoracyjne na wielogniazdkowej ramce
13. Shell (hollow) mode dla multi
14. Mold adaptation (prostokątne moldy)

### Faza 4 — Zaawansowane
15. Layout vertical
16. Custom per-socket rotation
17. Mixed socket sizes (np. Schuko + USB)
18. Multi-socket mold export (4 lub 6 części)

---

## 11. Uwagi Techniczne

### Performance
- Heightmap grid 256×128 = 32768 vertices — akceptowalne w real-time
- Dla eksportu: 512×256 = 131072 vertices — wystarczające dla druku
- `useMemo` z pełnym dependency array na `[config, multiConfig, qualityMultiplier]`

### Manifold Geometry
- Siatka heightmap jest z natury manifold (dno + góra)
- Aby być w pełni manifold, trzeba dodać pionowe ściany na krawędziach (skirt)
- Step ring wymaga osobnej geometrii cylindrycznej per otwór

### Otwory Wewnętrzne
- Heightmap nie wycina otworów — zamiast tego ustawia z=0 wewnątrz rInner
- Dla prawidłowego eksportu STL, otwory muszą mieć pionowe ścianki
- Rozwiązanie: generuj cylindryczne ścianki osobno i dodaj do grupy

```typescript
function generateHoleWalls(
  center: number, rInner: number, rStep: number, 
  stepHeight: number, segments: number
): THREE.BufferGeometry {
  // Cylinder wewnętrzny: radius rInner, height stepHeight
  // Cylinder zewnętrzny stepu: radius rStep, height stepHeight  
  // Dno pierścienia oporowego: ring rInner → rStep at z=stepHeight
}
```

### Istniejąca Architektura
- **NIE modyfikować** `geometry.ts` — to jest single-socket engine
- **NIE modyfikować** `SocketFrame.tsx` — komponent single
- **NOWE pliki**: `multiSocketGeometry.ts`, `MultiSocketFrame.tsx`
- **ROZSZERZAĆ** `types.ts` (addytywnie — nowy interface)
- **ROZSZERZAĆ** `Controls.tsx` (nowa sekcja, nowe props)
- **ROZSZERZAĆ** `App.tsx` (nowy stan, warunkowy render)
