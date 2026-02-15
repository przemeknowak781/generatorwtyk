export interface FrameConfig {
  // ─── Existing Core ───
  petals: number;
  outerDiameter: number; // 89mm in sketch
  height: number; // Base height 12mm
  reliefHeight: number; // Additional height for the relief
  innerHoleDiameter: number; // 46.8mm in sketch
  stepDiameter: number; // 48.6mm in sketch
  seatingRingDepth: number; // Vertical position of the inner ledge
  centerDepth: number; // Legacy/Additional height of the inner step
  petalIndentation: number; // How deep the curves go
  petalRoundness: number; // Sharpness vs roundness of petals
  smoothness: number; // Mesh resolution
  color: string;
  roughness: number;
  metalness: number;
  flipY: boolean; // Vertical mirror
  showBalls: boolean; // Decorative balls at tips
  ballSize: number; // Radius of the ball
  ballRadialOffset: number; // Radial shift from max radius
  ballZOffset: number; // Vertical shift (embedding)
  showCones: boolean; // Decorative cones/spikes
  coneSize: number; // Radius of the cone base
  coneHeight: number; // Height of the cone
  coneRadialOffset: number;
  coneZOffset: number;
  isHollow: boolean; // Shell mode
  wallThickness: number; // Thickness for the shell
  shrinkagePercent: number; // Material shrinkage in % (0-5%)

  // ─── A. Profil Zewnętrzny ───
  patternRotation: number;          // A7: rotation of petal pattern [degrees 0-360]
  petalAsymmetry: number;           // A1: asymmetric petal offset [0-1]
  petalTwist: number;               // A2: progressive twist along Z [degrees 0-45]
  petalAmplitudeVariation: number;  // A3: alternating petal size [0-0.5]
  petalShape: number;               // A4: superellipse exponent [0.5-4.0]
  secondaryWave: number;            // A5: secondary harmonic amplitude [0-0.3]
  valleyRoundness: number;          // A6: valley rounding independent of peaks [0-1]
  sawtoothBlend: number;            // A8: blend sinusoid → sawtooth [0-1]
  interleaveCount: number;          // A10: overlapping petal layers [0-3]

  // ─── B. Profil Boczny ───
  profileConvexity: number;         // B1: side profile curvature [-1 to 1]
  peakPosition: number;             // B2: location of profile peak [0.1-0.8]
  plateauWidth: number;             // B3: flat zone at top [0-0.3]
  outerDropAngle: number;           // B4: outer edge steepness [degrees 0-90]
  profileRipple: number;            // B5: sinusoidal ripple on profile [mm 0-2]
  innerLipAngle: number;            // B6: inner lip tilt [degrees 0-30]
  reliefHeightRatio: number;        // B7: multiplier for relief height [0-2]
  stepShape: number;                // B8: step transition smoothness [0-1]

  // ─── C. Wysokość i Proporcje ───
  enableXYScale: boolean;           // C3: enable/disable X/Y scaling
  scaleX: number;                   // C3: X-axis stretch [0.5-1.5]
  scaleY: number;                   // C3: Y-axis stretch [0.5-1.5]
  taper: number;                    // C4: narrows toward top [0-0.5]
  flare: number;                    // C5: widens toward top [0-0.5]

  // ─── D. Otwór Wewnętrzny ───
  innerChamfer: number;             // D4: inner hole edge chamfer [mm 0-3]

  // ─── E. Tekstura i Detale ───
  radialGrooves: number;            // E1: radial groove count [0-12]
  concentricGrooves: number;        // E2: concentric ring count [0-8]
  microWave: number;                // E4: micro-wave amplitude [mm 0-1]
  faceting: number;                 // E6: polygonal faceting sides [0-24]

  // ─── F. Elementy Dekoracyjne ───
  edgeSerrations: number;           // F6: sawtooth edge count [0-48]

  // ─── H. Modyfikacje Krawędziowe ───
  topChamfer: number;               // H1: top edge chamfer [mm 0-3]
  topFillet: number;                // H2: top edge fillet radius [mm 0-5]
  bottomChamfer: number;            // H3: bottom edge chamfer [mm 0-2]
  wavyEdge: number;                 // H4: wavy top edge amplitude [mm 0-3]

  // ─── L. Zaawansowane Transformacje ───
  globalTwist: number;              // L2: global twist around Z [degrees 0-180]

  // ─── K. Podgląd ───
  wireframeMode: boolean;           // K4: wireframe toggle
}

export const DEFAULT_CONFIG: FrameConfig = {
  // ─── Existing Core ───
  petals: 6,
  outerDiameter: 89,
  height: 12,
  reliefHeight: 5,
  innerHoleDiameter: 46.8,
  stepDiameter: 48.6,
  seatingRingDepth: 10.0,
  centerDepth: 3.5,
  petalIndentation: 0.25,
  petalRoundness: 0.5,
  smoothness: 128,
  color: '#a35d4d',
  roughness: 0.2,
  metalness: 0.1,
  flipY: false,
  showBalls: false,
  ballSize: 4.5,
  ballRadialOffset: 0,
  ballZOffset: 1.0,
  showCones: false,
  coneSize: 4.0,
  coneHeight: 8.0,
  coneRadialOffset: 0,
  coneZOffset: 0,
  isHollow: false,
  wallThickness: 2.0,
  shrinkagePercent: 0.0,

  // ─── A. Profil Zewnętrzny (neutral = no effect) ───
  patternRotation: 0,
  petalAsymmetry: 0,
  petalTwist: 0,
  petalAmplitudeVariation: 0,
  petalShape: 1.0,       // 1.0 = circle (cosine)
  secondaryWave: 0,
  valleyRoundness: 0.5,  // matches default petalRoundness behaviour
  sawtoothBlend: 0,
  interleaveCount: 0,

  // ─── B. Profil Boczny ───
  profileConvexity: 0,
  peakPosition: 0.4,     // close to original 0.3+roundness*0.2
  plateauWidth: 0,
  outerDropAngle: 0,     // 0 = gentle (original behaviour)
  profileRipple: 0,
  innerLipAngle: 0,
  reliefHeightRatio: 1.0,
  stepShape: 0,

  // ─── C. Wysokość i Proporcje ───
  enableXYScale: true,
  scaleX: 1.0,
  scaleY: 1.0,
  taper: 0,
  flare: 0,

  // ─── D. Otwór Wewnętrzny ───
  innerChamfer: 0,

  // ─── E. Tekstura i Detale ───
  radialGrooves: 0,
  concentricGrooves: 0,
  microWave: 0,
  faceting: 0,

  // ─── F. Elementy Dekoracyjne ───
  edgeSerrations: 0,

  // ─── H. Modyfikacje Krawędziowe ───
  topChamfer: 0,
  topFillet: 0,
  bottomChamfer: 0,
  wavyEdge: 0,

  // ─── L. Zaawansowane Transformacje ───
  globalTwist: 0,

  // ─── K. Podgląd ───
  wireframeMode: false,
};

export interface MoldConfig {
  enabled: boolean;
  moldWallThickness: number;   // Thickness of container walls [mm]
  moldWallHeight: number;      // Height of walls above frame top [mm]
  moldBaseThickness: number;   // Base plate thickness [mm]
  moldClearance: number;       // Gap between frame and walls [mm]
  keyRadius: number;           // Registration key hemisphere radius [mm]
  keyCount: number;            // Keys per dividing wall
  draftAngle: number;          // Wall draft angle [degrees]
  collarEnabled: boolean;      // Generate pour collar
  collarHeight: number;        // Collar height [mm]
  explodeDistance: number;     // Preview explode offset [mm]
  showKeys: boolean;           // Show registration keys
  showBase: boolean;           // Show mold base plate
  moldOpacity: number;         // Transparency of mold preview (0-1)
}

export const DEFAULT_MOLD_CONFIG: MoldConfig = {
  enabled: false,
  moldWallThickness: 8,
  moldWallHeight: 40,
  moldBaseThickness: 5,
  moldClearance: 15,
  keyRadius: 4,
  keyCount: 2,
  draftAngle: 2,
  collarEnabled: false,
  collarHeight: 20,
  explodeDistance: 15,
  showKeys: false,
  showBase: true,
  moldOpacity: 0.35,
};

// ─── Multi-Socket Configuration ───

export type MultiSocketLayout = 'horizontal' | 'vertical';
export type MultiSocketOuterShape = 'stadium' | 'rectangle' | 'superellipse';
export type MultiBridgeStyle = 'flat' | 'raised' | 'grooved';

export interface MultiSocketConfig {
  enabled: boolean;
  socketCount: number;                // 2–5 sockets in a row
  layout: MultiSocketLayout;          // direction of socket arrangement
  socketSpacing: number;              // center-to-center distance [mm] (71mm EU standard)
  outerShape: MultiSocketOuterShape;  // outer boundary shape
  cornerRadius: number;               // corner rounding [mm 0–20]
  outerPadding: number;               // margin from hole to outer edge [mm 5–25]
  bridgeStyle: MultiBridgeStyle;      // style of material between sockets
  bridgeHeight: number;               // bridge height ratio [0–1]
  bridgeGrooveCount: number;          // decorative grooves on bridge [0–3]
  bridgeGrooveDepth: number;          // groove depth [mm 0–1]
}

export const DEFAULT_MULTI_SOCKET_CONFIG: MultiSocketConfig = {
  enabled: false,
  socketCount: 2,
  layout: 'horizontal',
  socketSpacing: 71,
  outerShape: 'stadium',
  cornerRadius: 10,
  outerPadding: 15,
  bridgeStyle: 'flat',
  bridgeHeight: 0.5,
  bridgeGrooveCount: 0,
  bridgeGrooveDepth: 0.5,
};