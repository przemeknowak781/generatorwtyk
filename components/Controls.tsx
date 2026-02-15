
import React, { useState } from 'react';
import { FrameConfig, MoldConfig, MultiSocketConfig, DEFAULT_CONFIG } from '../types';

interface ControlsProps {
  config: FrameConfig;
  setConfig: React.Dispatch<React.SetStateAction<FrameConfig>>;
  moldConfig: MoldConfig;
  setMoldConfig: React.Dispatch<React.SetStateAction<MoldConfig>>;
  multiConfig: MultiSocketConfig;
  setMultiConfig: React.Dispatch<React.SetStateAction<MultiSocketConfig>>;
  onExport: () => void;
}

// ─── Presets from sliders.md section M ───
const PRESETS: { name: string; icon: string; values: Partial<FrameConfig> }[] = [
  { name: 'Klasyczna Rozeta', icon: '🌸', values: { petals: 6, petalIndentation: 0.25, petalRoundness: 0.5 } },
  { name: 'Gwiazda', icon: '⭐', values: { petals: 8, petalIndentation: 0.5, petalRoundness: 0.1 } },
  { name: 'Art Deco', icon: '💎', values: { petals: 12, petalShape: 3.0, faceting: 12 } },
  { name: 'Organiczny', icon: '🍃', values: { microWave: 0.5, wavyEdge: 2.0 } },
  { name: 'Minimalistyczny', icon: '◻️', values: { petals: 4, petalIndentation: 0.1, topFillet: 3.0 } },
  { name: 'Korona', icon: '👑', values: { edgeSerrations: 24, petalTwist: 15 } },
  { name: 'Spirala', icon: '🌀', values: { globalTwist: 90 } },
  { name: 'Dalia', icon: '🌼', values: { interleaveCount: 2, petals: 8, petalIndentation: 0.35 } },
  { name: 'Geometryczny', icon: '🔷', values: { faceting: 6, petalShape: 2.0 } },
  { name: 'Barokowy', icon: '🏛️', values: { secondaryWave: 0.2, edgeSerrations: 8, radialGrooves: 6 } },
];

type PresetStyle =
  | 'classic'
  | 'star'
  | 'artdeco'
  | 'organic'
  | 'minimal'
  | 'crown'
  | 'spiral'
  | 'dahlia'
  | 'geometric'
  | 'baroque';

const PRESET_STYLE_BY_INDEX: PresetStyle[] = [
  'classic',
  'star',
  'artdeco',
  'organic',
  'minimal',
  'crown',
  'spiral',
  'dahlia',
  'geometric',
  'baroque',
];

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const rand = (min: number, max: number): number => min + Math.random() * (max - min);
const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1));
const chance = (p: number): boolean => Math.random() < p;

const clampConfigToUiRanges = (cfg: FrameConfig): FrameConfig => {
  const next = { ...cfg };
  next.petals = clamp(Math.round(next.petals), 3, 24);
  next.petalIndentation = clamp(next.petalIndentation, 0, 0.6);
  next.petalRoundness = clamp(next.petalRoundness, 0, 1);
  next.patternRotation = clamp(next.patternRotation, 0, 360);
  next.petalAsymmetry = clamp(next.petalAsymmetry, 0, 1);
  next.petalTwist = clamp(next.petalTwist, 0, 45);
  next.petalAmplitudeVariation = clamp(next.petalAmplitudeVariation, 0, 0.5);
  next.petalShape = clamp(next.petalShape, 0.5, 4);
  next.secondaryWave = clamp(next.secondaryWave, 0, 0.3);
  next.valleyRoundness = clamp(next.valleyRoundness, 0, 1);
  next.sawtoothBlend = clamp(next.sawtoothBlend, 0, 1);
  next.interleaveCount = clamp(Math.round(next.interleaveCount), 0, 3);
  next.profileConvexity = clamp(next.profileConvexity, -1, 1);
  next.peakPosition = clamp(next.peakPosition, 0.1, 0.8);
  next.plateauWidth = clamp(next.plateauWidth, 0, 0.3);
  next.outerDropAngle = clamp(next.outerDropAngle, 0, 90);
  next.profileRipple = clamp(next.profileRipple, 0, 2);
  next.innerLipAngle = clamp(next.innerLipAngle, 0, 30);
  next.reliefHeightRatio = clamp(next.reliefHeightRatio, 0, 2);
  next.stepShape = clamp(next.stepShape, 0, 1);
  next.scaleX = clamp(next.scaleX, 0.5, 1.5);
  next.scaleY = clamp(next.scaleY, 0.5, 1.5);
  next.taper = clamp(next.taper, 0, 0.5);
  next.flare = clamp(next.flare, 0, 0.5);
  next.innerChamfer = clamp(next.innerChamfer, 0, 3);
  next.radialGrooves = clamp(Math.round(next.radialGrooves), 0, 12);
  next.concentricGrooves = clamp(Math.round(next.concentricGrooves), 0, 8);
  next.microWave = clamp(next.microWave, 0, 1);
  next.faceting = clamp(Math.round(next.faceting), 0, 24);
  next.edgeSerrations = clamp(Math.round(next.edgeSerrations), 0, 48);
  next.topChamfer = clamp(next.topChamfer, 0, 3);
  next.topFillet = clamp(next.topFillet, 0, 5);
  next.bottomChamfer = clamp(next.bottomChamfer, 0, 2);
  next.wavyEdge = clamp(next.wavyEdge, 0, 3);
  next.globalTwist = clamp(next.globalTwist, 0, 180);
  next.shrinkagePercent = clamp(next.shrinkagePercent, 0, 5);
  next.wallThickness = clamp(next.wallThickness, 0.8, 4);
  next.ballSize = clamp(next.ballSize, 1, 10);
  next.ballRadialOffset = clamp(next.ballRadialOffset, -10, 10);
  next.coneSize = clamp(next.coneSize, 1, 10);
  next.coneHeight = clamp(next.coneHeight, 1, 25);
  next.coneRadialOffset = clamp(next.coneRadialOffset, -10, 10);
  next.smoothness = clamp(Math.round(next.smoothness / 16) * 16, 32, 512);
  return next;
};

const nearestFaceting = (petals: number, current: number): number => {
  if (current <= 0) return 0;
  const candidates = [petals, Math.round(petals / 2), petals * 2]
    .map(v => clamp(Math.round(v), 3, 24))
    .filter((v, i, arr) => arr.indexOf(v) === i);
  if (candidates.length === 0) return clamp(current, 3, 24);
  return candidates.reduce((best, v) => (Math.abs(v - current) < Math.abs(best - current) ? v : best), candidates[0]);
};

const enforceGeometricRules = (input: FrameConfig): FrameConfig => {
  const next = clampConfigToUiRanges(input);

  if (!Number.isFinite(next.outerDiameter)) next.outerDiameter = DEFAULT_CONFIG.outerDiameter;
  if (!Number.isFinite(next.innerHoleDiameter)) next.innerHoleDiameter = DEFAULT_CONFIG.innerHoleDiameter;
  if (!Number.isFinite(next.stepDiameter)) next.stepDiameter = DEFAULT_CONFIG.stepDiameter;
  if (!Number.isFinite(next.height)) next.height = DEFAULT_CONFIG.height;
  if (!Number.isFinite(next.reliefHeight)) next.reliefHeight = DEFAULT_CONFIG.reliefHeight;
  if (!Number.isFinite(next.seatingRingDepth)) next.seatingRingDepth = DEFAULT_CONFIG.seatingRingDepth;

  next.outerDiameter = Math.max(next.outerDiameter, next.innerHoleDiameter + 9);
  next.stepDiameter = clamp(next.stepDiameter, next.innerHoleDiameter + 1, next.outerDiameter - 8);

  const comp = 1 / (1 - next.shrinkagePercent / 100);
  const rInner = (next.innerHoleDiameter / 2) * comp;
  const rStep = (next.stepDiameter / 2) * comp;
  const rOuterMax = (next.outerDiameter / 2) * comp;
  const baseMaxHeight = (next.height + next.reliefHeight * next.reliefHeightRatio) * comp;

  const maxSeating = Math.max(0.5, next.height + next.reliefHeight * next.reliefHeightRatio - 0.7);
  next.seatingRingDepth = clamp(next.seatingRingDepth, 0, maxSeating);

  const indentWave = 1 / (1 + 0.8 * next.secondaryWave + 0.35 * next.sawtoothBlend + Math.max(0, 0.25 - next.valleyRoundness) * 0.5);
  const indentGeom = clamp(1 - (rStep + 2) / Math.max(rOuterMax, 1e-6), 0.04, 0.5);
  const indentMax = clamp(indentGeom * indentWave, 0.04, 0.38);
  next.petalIndentation = clamp(next.petalIndentation, 0, indentMax);

  next.valleyRoundness = Math.max(next.valleyRoundness, Math.max(0.18, 0.75 * next.secondaryWave, 0.35 * next.sawtoothBlend));
  if (next.valleyRoundness < 0.25) {
    next.secondaryWave = Math.min(next.secondaryWave, 0.12);
    next.sawtoothBlend = Math.min(next.sawtoothBlend, 0.35);
  }

  let plateauMax = Math.max(0, 2 * Math.min(next.peakPosition, 1 - next.peakPosition) - 0.04);
  if (next.outerDropAngle > 70) plateauMax = Math.min(plateauMax, 0.2);
  next.plateauWidth = Math.min(next.plateauWidth, plateauMax);

  const edgeBudget = Math.max(0.6, Math.min(4.5, 0.35 * Math.max(baseMaxHeight, 1)));
  let edgeUse = next.topChamfer + 0.7 * next.topFillet;
  if (edgeUse > edgeBudget) {
    const overflow = edgeUse - edgeBudget;
    next.topChamfer = Math.max(0, next.topChamfer - overflow);
    edgeUse = next.topChamfer + 0.7 * next.topFillet;
    if (edgeUse > edgeBudget) {
      next.topFillet = Math.max(0, (edgeBudget - next.topChamfer) / 0.7);
    }
  }
  if (next.topFillet > 2.5) next.topChamfer = Math.min(next.topChamfer, 1.0);

  if (next.interleaveCount === 1) next.globalTwist = Math.min(next.globalTwist, 100);
  if (next.interleaveCount >= 2) next.globalTwist = Math.min(next.globalTwist, 80);
  if (next.globalTwist + 1.5 * next.petalTwist > 150) {
    next.globalTwist = Math.max(0, 150 - 1.5 * next.petalTwist);
  }

  if (next.taper > 0 && next.flare > 0 && Math.min(next.taper, next.flare) > 0.1) {
    if (next.taper > next.flare) next.flare = 0.1;
    else next.taper = 0.1;
  }
  if (next.taper + next.flare > 0.45) {
    if (next.taper >= next.flare) next.taper = Math.max(0, 0.45 - next.flare);
    else next.flare = Math.max(0, 0.45 - next.taper);
  }

  if (next.faceting > 0 && next.faceting < 3) next.faceting = 3;
  next.faceting = nearestFaceting(next.petals, next.faceting);

  if (next.petals <= 5) {
    next.interleaveCount = 0;
    next.edgeSerrations = Math.min(next.edgeSerrations, 16);
  }
  if (next.petals >= 12) {
    next.petalAmplitudeVariation = Math.min(next.petalAmplitudeVariation, 0.3);
  }
  if (next.sawtoothBlend > 0.45) {
    next.secondaryWave = Math.min(next.secondaryWave, 0.1);
    next.edgeSerrations = Math.min(next.edgeSerrations, next.petals * 2);
  }
  if (next.profileRipple > 1.2) {
    next.microWave = Math.min(next.microWave, 0.35);
    next.concentricGrooves = Math.min(next.concentricGrooves, 4);
  }
  if (next.microWave > 0.6) {
    next.faceting = 0;
    next.radialGrooves = Math.min(next.radialGrooves, 8);
  }

  const anisotropy = next.enableXYScale
    ? Math.max(next.scaleX, next.scaleY) / Math.max(1e-6, Math.min(next.scaleX, next.scaleY))
    : 1;
  if (anisotropy > 1.18) {
    next.showBalls = false;
    next.showCones = false;
  }

  if (next.showBalls) {
    next.ballRadialOffset = clamp(next.ballRadialOffset, -1.2 * next.ballSize, 0.35 * next.ballSize);
    const rPos = rOuterMax + next.ballRadialOffset * comp;
    const maxBall = 0.9 * Math.max(0, rPos * Math.sin(Math.PI / next.petals));
    if (maxBall < 1) next.showBalls = false;
    else next.ballSize = clamp(next.ballSize, 1, Math.min(10, maxBall));
  }

  if (next.showCones) {
    next.coneRadialOffset = clamp(next.coneRadialOffset, -0.8 * next.coneSize, 0.2 * next.coneSize);
    const rPos = rOuterMax + next.coneRadialOffset * comp;
    const maxCone = 0.45 * Math.max(0, rPos * Math.sin(Math.PI / next.petals));
    if (maxCone < 1) next.showCones = false;
    else {
      next.coneSize = clamp(next.coneSize, 1, Math.min(10, maxCone));
      next.coneHeight = Math.min(next.coneHeight, 2.8 * next.coneSize);
    }
  }

  const indentFactor = 1 + 0.8 * next.secondaryWave + 0.35 * next.sawtoothBlend + Math.max(0, 0.25 - next.valleyRoundness) * 0.5;
  const outerMinEstimate = rOuterMax * (1 - next.petalIndentation * indentFactor);
  if (next.isHollow) {
    const maxWallComp = 0.45 * Math.max(1.0, outerMinEstimate - rInner);
    const maxWall = maxWallComp / comp;
    if (maxWall < 0.8) {
      next.isHollow = false;
    } else {
      next.wallThickness = clamp(next.wallThickness, 0.8, Math.min(4, maxWall));
      if (next.petalIndentation > 0.3 || next.interleaveCount > 1) {
        next.wallThickness = Math.min(next.wallThickness, 3.2);
      }
    }
  }

  const detailScore =
    next.radialGrooves / 12 +
    next.concentricGrooves / 8 +
    next.microWave +
    next.profileRipple / 2 +
    next.edgeSerrations / 48 +
    next.interleaveCount / 3 +
    (next.faceting > 0 ? 0.5 : 0);

  let smoothnessFloor = 32;
  if (detailScore > 2.2) smoothnessFloor = 192;
  if (detailScore > 2.8 || next.globalTwist > 120) smoothnessFloor = 256;
  next.smoothness = clamp(Math.ceil(Math.max(next.smoothness, smoothnessFloor) / 16) * 16, 32, 512);

  (Object.keys(next) as (keyof FrameConfig)[]).forEach((key) => {
    const val = next[key];
    if (typeof val === 'number' && !Number.isFinite(val)) {
      next[key] = DEFAULT_CONFIG[key] as never;
    }
  });

  return clampConfigToUiRanges(next);
};

const randomizeInPreset = (base: FrameConfig, presetStyle: PresetStyle): FrameConfig => {
  const next: FrameConfig = { ...base };

  next.patternRotation = rand(0, 360);
  next.profileConvexity = rand(-0.5, 0.8);
  next.peakPosition = rand(0.2, 0.65);
  next.plateauWidth = rand(0, 0.18);
  next.outerDropAngle = rand(8, 70);
  next.reliefHeightRatio = rand(0.7, 1.6);
  next.stepShape = rand(0, 1);
  next.scaleX = rand(0.82, 1.18);
  next.scaleY = rand(0.82, 1.18);
  next.innerChamfer = rand(0, 1.2);
  next.topChamfer = rand(0, 1.2);
  next.topFillet = rand(0, 2.2);
  next.bottomChamfer = rand(0, 1.0);
  next.radialGrooves = randInt(0, 8);
  next.concentricGrooves = randInt(0, 5);
  next.wavyEdge = rand(0, 1.6);
  next.taper = rand(0, 0.22);
  next.flare = rand(0, 0.22);
  next.showBalls = false;
  next.showCones = false;

  switch (presetStyle) {
    case 'classic':
      next.petals = randInt(6, 10);
      next.petalIndentation = rand(0.18, 0.30);
      next.petalRoundness = rand(0.45, 0.78);
      next.petalShape = rand(0.9, 1.4);
      next.secondaryWave = rand(0.0, 0.08);
      next.sawtoothBlend = rand(0.0, 0.12);
      next.interleaveCount = 0;
      next.globalTwist = rand(0, 35);
      next.microWave = rand(0, 0.18);
      next.faceting = 0;
      next.edgeSerrations = randInt(0, 8);
      break;
    case 'star':
      next.petals = randInt(6, 12);
      next.petalIndentation = rand(0.30, 0.45);
      next.petalRoundness = rand(0.06, 0.24);
      next.petalShape = rand(0.5, 1.1);
      next.secondaryWave = rand(0.0, 0.08);
      next.sawtoothBlend = rand(0.15, 0.45);
      next.interleaveCount = 0;
      next.globalTwist = rand(0, 30);
      next.microWave = rand(0, 0.2);
      next.faceting = chance(0.45) ? randInt(5, 12) : 0;
      next.edgeSerrations = randInt(next.petals, next.petals * 2);
      break;
    case 'artdeco':
      next.petals = randInt(8, 14);
      next.petalIndentation = rand(0.16, 0.30);
      next.petalRoundness = rand(0.20, 0.55);
      next.petalShape = rand(2.2, 3.8);
      next.secondaryWave = rand(0.0, 0.08);
      next.sawtoothBlend = rand(0.0, 0.18);
      next.interleaveCount = chance(0.25) ? 1 : 0;
      next.globalTwist = rand(0, 45);
      next.microWave = rand(0, 0.16);
      next.faceting = randInt(6, 16);
      next.edgeSerrations = randInt(0, 10);
      break;
    case 'organic':
      next.petals = randInt(5, 9);
      next.petalIndentation = rand(0.16, 0.32);
      next.petalRoundness = rand(0.38, 0.80);
      next.petalShape = rand(0.8, 1.8);
      next.secondaryWave = rand(0.03, 0.18);
      next.sawtoothBlend = rand(0.0, 0.20);
      next.interleaveCount = chance(0.25) ? 1 : 0;
      next.globalTwist = rand(10, 70);
      next.profileRipple = rand(0.5, 1.4);
      next.microWave = rand(0.25, 0.70);
      next.wavyEdge = rand(0.8, 2.2);
      next.faceting = 0;
      next.edgeSerrations = randInt(0, 10);
      break;
    case 'minimal':
      next.petals = randInt(4, 8);
      next.petalIndentation = rand(0.05, 0.18);
      next.petalRoundness = rand(0.65, 0.92);
      next.petalShape = rand(0.95, 1.5);
      next.secondaryWave = rand(0.0, 0.05);
      next.sawtoothBlend = rand(0.0, 0.08);
      next.interleaveCount = 0;
      next.globalTwist = rand(0, 20);
      next.profileRipple = rand(0, 0.4);
      next.microWave = rand(0, 0.15);
      next.faceting = chance(0.2) ? randInt(4, 8) : 0;
      next.edgeSerrations = 0;
      next.topFillet = rand(1.0, 3.0);
      next.radialGrooves = randInt(0, 3);
      next.concentricGrooves = randInt(0, 2);
      break;
    case 'crown':
      next.petals = randInt(8, 16);
      next.petalIndentation = rand(0.18, 0.33);
      next.petalRoundness = rand(0.12, 0.45);
      next.petalShape = rand(0.8, 1.8);
      next.secondaryWave = rand(0.0, 0.12);
      next.sawtoothBlend = rand(0.12, 0.40);
      next.interleaveCount = chance(0.35) ? 1 : 0;
      next.petalTwist = rand(6, 20);
      next.globalTwist = rand(15, 70);
      next.microWave = rand(0, 0.22);
      next.faceting = chance(0.35) ? randInt(6, 14) : 0;
      next.edgeSerrations = clamp(randInt(next.petals * 2, next.petals * 4), 0, 48);
      next.showCones = chance(0.35);
      next.coneSize = rand(1.8, 4.5);
      next.coneHeight = rand(5.0, 11.5);
      next.coneRadialOffset = rand(-2.5, 0.2);
      break;
    case 'spiral':
      next.petals = randInt(5, 10);
      next.petalIndentation = rand(0.16, 0.32);
      next.petalRoundness = rand(0.20, 0.60);
      next.petalShape = rand(0.7, 1.8);
      next.petalAsymmetry = rand(0.15, 0.45);
      next.petalTwist = rand(8, 22);
      next.secondaryWave = rand(0.0, 0.12);
      next.sawtoothBlend = rand(0.0, 0.30);
      next.interleaveCount = chance(0.25) ? 1 : 0;
      next.globalTwist = rand(60, 130);
      next.microWave = rand(0.0, 0.25);
      next.faceting = 0;
      next.edgeSerrations = randInt(0, 12);
      break;
    case 'dahlia':
      next.petals = randInt(8, 14);
      next.petalIndentation = rand(0.24, 0.36);
      next.petalRoundness = rand(0.25, 0.62);
      next.petalShape = rand(1.0, 2.2);
      next.secondaryWave = rand(0.05, 0.16);
      next.sawtoothBlend = rand(0.0, 0.16);
      next.interleaveCount = randInt(1, 3);
      next.globalTwist = rand(10, 75);
      next.microWave = rand(0.05, 0.30);
      next.faceting = 0;
      next.edgeSerrations = randInt(0, 14);
      break;
    case 'geometric':
      next.petals = randInt(4, 12);
      next.petalIndentation = rand(0.12, 0.28);
      next.petalRoundness = rand(0.18, 0.50);
      next.petalShape = rand(1.8, 3.4);
      next.secondaryWave = rand(0.0, 0.08);
      next.sawtoothBlend = rand(0.0, 0.20);
      next.interleaveCount = 0;
      next.globalTwist = rand(0, 55);
      next.microWave = rand(0.0, 0.15);
      next.faceting = randInt(4, 16);
      next.edgeSerrations = randInt(0, 8);
      break;
    case 'baroque':
      next.petals = randInt(7, 12);
      next.petalIndentation = rand(0.22, 0.35);
      next.petalRoundness = rand(0.28, 0.72);
      next.petalShape = rand(0.9, 2.4);
      next.secondaryWave = rand(0.12, 0.24);
      next.sawtoothBlend = rand(0.05, 0.28);
      next.interleaveCount = chance(0.4) ? randInt(1, 2) : 0;
      next.globalTwist = rand(15, 85);
      next.microWave = rand(0.08, 0.35);
      next.profileRipple = rand(0.4, 1.3);
      next.faceting = chance(0.25) ? randInt(5, 12) : 0;
      next.edgeSerrations = randInt(6, 24);
      next.radialGrooves = randInt(4, 10);
      next.concentricGrooves = randInt(2, 6);
      break;
    default:
      break;
  }

  return enforceGeometricRules(next);
};

// ─── Collapsible section component ───
const Section: React.FC<{
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, color, bgColor, borderColor, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`${bgColor} rounded-2xl border ${borderColor} overflow-hidden transition-all`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-3 hover:opacity-80 transition-opacity"
      >
        <svg
          className={`w-3 h-3 ${color} transition-transform ${open ? 'rotate-90' : ''}`}
          fill="currentColor" viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
        <h2 className={`text-[11px] font-black ${color} uppercase tracking-widest`}>{title}</h2>
        <span className={`h-px flex-1 ${borderColor}`}></span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </section>
  );
};

// ─── Slider row (compact) ───
const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  accent?: string;
  disabled?: boolean;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, step, unit = '', accent = 'accent-indigo-600', disabled = false, onChange }) => (
  <div>
    <label className={`flex justify-between text-[10px] font-bold uppercase mb-1 ${disabled ? 'text-gray-300' : 'text-gray-400'}`}>
      <span>{label}</span>
      <span className={disabled ? 'text-gray-400' : 'text-indigo-600'}>{typeof value === 'number' ? (Number.isInteger(step) ? value : value.toFixed(2)) : value}{unit}</span>
    </label>
    <input
      type="range" min={min} max={max} step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      disabled={disabled}
      className={`w-full h-1 bg-gray-200 rounded-lg appearance-none ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} ${accent}`}
    />
  </div>
);

// ─── Toggle row ───
const Toggle: React.FC<{
  label: string;
  value: boolean;
  color?: string;
  onChange: (val: boolean) => void;
}> = ({ label, value, color = 'bg-indigo-600', onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs font-bold text-gray-600 uppercase">{label}</span>
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${value ? color : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  </div>
);

export const Controls: React.FC<ControlsProps> = ({ config, setConfig, moldConfig, setMoldConfig, multiConfig, setMultiConfig, onExport }) => {

  const handleChange = (key: keyof FrameConfig, value: number | string | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };
  const [activePresetIndex, setActivePresetIndex] = useState<number | null>(null);

  const compFactor = 1 / (1 - (config.shrinkagePercent / 100));
  const compensatedHole = (config.innerHoleDiameter * compFactor).toFixed(2);

  const handleRandomize = () => {
    const presetIndex = activePresetIndex ?? randInt(0, PRESET_STYLE_BY_INDEX.length - 1);
    const presetStyle = PRESET_STYLE_BY_INDEX[presetIndex];
    setConfig(prev => randomizeInPreset(prev, presetStyle));
  };

  const handleReset = () => {
    setActivePresetIndex(null);
    setConfig(prev => ({
      ...DEFAULT_CONFIG,
      color: prev.color,
      smoothness: prev.smoothness,
      wireframeMode: prev.wireframeMode,
    }));
  };

  const handlePreset = (preset: Partial<FrameConfig>, presetIndex: number) => {
    setActivePresetIndex(presetIndex);
    setConfig(prev => {
      const candidate = {
        ...DEFAULT_CONFIG,
        color: prev.color,
        smoothness: prev.smoothness,
        wireframeMode: prev.wireframeMode,
        enableXYScale: prev.enableXYScale,
        outerDiameter: prev.outerDiameter,
        height: prev.height,
        reliefHeight: prev.reliefHeight,
        innerHoleDiameter: prev.innerHoleDiameter,
        stepDiameter: prev.stepDiameter,
        seatingRingDepth: prev.seatingRingDepth,
        shrinkagePercent: prev.shrinkagePercent,
        isHollow: prev.isHollow,
        wallThickness: prev.wallThickness,
        ...preset,
      } as FrameConfig;
      return enforceGeometricRules(candidate);
    });
  };

  const colorPalette = [
    '#a35d4d', '#f8f9fa', '#e5e7eb', '#1a1a1a', '#d4af37',
    '#8ba88e', '#4a6fa5', '#b35a5a', '#d9d9d9'
  ];

  return (
    <div className="absolute top-0 left-0 h-full w-full md:w-96 bg-white/95 backdrop-blur-md shadow-2xl p-5 overflow-y-auto z-10 border-r border-gray-200 font-sans select-none">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
        </div>
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">FrameConfig</h1>
      </div>
      <p className="text-[10px] text-gray-400 mb-4 uppercase tracking-widest font-bold">Parametric Sliders v4.0</p>

      <div className="space-y-3">

        {/* ─── Quick Presets ─── */}
        <Section title="Presety" color="text-violet-600" bgColor="bg-violet-50/50" borderColor="border-violet-100" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p, idx) => (
              <button key={p.name}
                onClick={() => handlePreset(p.values, idx)}
                className={`flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-bold rounded-xl border transition-all active:scale-95 uppercase tracking-wider truncate ${activePresetIndex === idx
                  ? 'text-violet-800 bg-violet-100 border-violet-400'
                  : 'text-violet-700 bg-white border-violet-200 hover:bg-violet-100 hover:border-violet-300'
                  }`}
              >
                <span className="text-sm">{p.icon}</span>
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-violet-100">
            <button onClick={handleRandomize}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-black text-white bg-gradient-to-r from-violet-500 to-indigo-500 rounded-xl hover:from-violet-600 hover:to-indigo-600 transition-all active:scale-95 uppercase tracking-wider shadow-md shadow-violet-200"
            >
              <span className="text-sm">🎲</span> Losuj
            </button>
            <button onClick={handleReset}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-black text-gray-600 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-all active:scale-95 uppercase tracking-wider"
            >
              <span className="text-sm">↺</span> Reset
            </button>
          </div>
        </Section>

        {/* ─── A. Profil Zewnętrzny ─── */}
        <Section title="Profil Zewnętrzny" color="text-indigo-600" bgColor="bg-indigo-50/50" borderColor="border-indigo-100" defaultOpen={true}>
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Liczba płatków</label>
              <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{config.petals}</span>
            </div>
            <input
              type="range" min="3" max="24" step="1"
              value={config.petals}
              onChange={(e) => handleChange('petals', parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Wcięcie" value={config.petalIndentation} min={0} max={0.6} step={0.01} onChange={(v) => handleChange('petalIndentation', v)} />
            <Slider label="Obłość" value={config.petalRoundness} min={0} max={1} step={0.01} onChange={(v) => handleChange('petalRoundness', v)} />
          </div>

          <Slider label="Obrót wzoru" value={config.patternRotation} min={0} max={360} step={1} unit="°" onChange={(v) => handleChange('patternRotation', v)} />

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Asymetria" value={config.petalAsymmetry} min={0} max={1} step={0.01} onChange={(v) => handleChange('petalAsymmetry', v)} />
            <Slider label="Skręt płatków" value={config.petalTwist} min={0} max={45} step={0.5} unit="°" onChange={(v) => handleChange('petalTwist', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Mod. amplitudy" value={config.petalAmplitudeVariation} min={0} max={0.5} step={0.01} onChange={(v) => handleChange('petalAmplitudeVariation', v)} />
            <Slider label="Kształt (superel.)" value={config.petalShape} min={0.5} max={4} step={0.1} onChange={(v) => handleChange('petalShape', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Fala podwójna" value={config.secondaryWave} min={0} max={0.3} step={0.01} onChange={(v) => handleChange('secondaryWave', v)} />
            <Slider label="Obl. wklęśnięć" value={config.valleyRoundness} min={0} max={1} step={0.01} onChange={(v) => handleChange('valleyRoundness', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Piła (blend)" value={config.sawtoothBlend} min={0} max={1} step={0.01} onChange={(v) => handleChange('sawtoothBlend', v)} />
            <Slider label="Splot warstw" value={config.interleaveCount} min={0} max={3} step={1} onChange={(v) => handleChange('interleaveCount', v)} />
          </div>
        </Section>

        {/* ─── B. Profil Boczny ─── */}
        <Section title="Profil Boczny" color="text-sky-600" bgColor="bg-sky-50/50" borderColor="border-sky-100">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Wypukłość" value={config.profileConvexity} min={-1} max={1} step={0.01} onChange={(v) => handleChange('profileConvexity', v)} />
            <Slider label="Poz. szczytu" value={config.peakPosition} min={0.1} max={0.8} step={0.01} onChange={(v) => handleChange('peakPosition', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Plateau" value={config.plateauWidth} min={0} max={0.3} step={0.01} onChange={(v) => handleChange('plateauWidth', v)} />
            <Slider label="Kąt spadku" value={config.outerDropAngle} min={0} max={90} step={1} unit="°" onChange={(v) => handleChange('outerDropAngle', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Fala profilu" value={config.profileRipple} min={0} max={2} step={0.1} unit="mm" onChange={(v) => handleChange('profileRipple', v)} />
            <Slider label="Warga wewn." value={config.innerLipAngle} min={0} max={30} step={1} unit="°" onChange={(v) => handleChange('innerLipAngle', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Mnożnik reliefu" value={config.reliefHeightRatio} min={0} max={2} step={0.1} onChange={(v) => handleChange('reliefHeightRatio', v)} />
            <Slider label="Kształt stopnia" value={config.stepShape} min={0} max={1} step={0.01} onChange={(v) => handleChange('stepShape', v)} />
          </div>
        </Section>

        {/* ─── C. Proporcje ─── */}
        <Section title="Proporcje i Wymiary" color="text-teal-600" bgColor="bg-teal-50/50" borderColor="border-teal-100">
          <Toggle
            label="Skala X/Y aktywna"
            value={config.enableXYScale}
            color="bg-teal-600"
            onChange={(v) => handleChange('enableXYScale', v)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Slider
              label="Skala X"
              value={config.scaleX}
              min={0.5}
              max={1.5}
              step={0.01}
              disabled={!config.enableXYScale}
              onChange={(v) => handleChange('scaleX', v)}
            />
            <Slider
              label="Skala Y"
              value={config.scaleY}
              min={0.5}
              max={1.5}
              step={0.01}
              disabled={!config.enableXYScale}
              onChange={(v) => handleChange('scaleY', v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Zwężenie (taper)" value={config.taper} min={0} max={0.5} step={0.01} onChange={(v) => handleChange('taper', v)} />
            <Slider label="Kielich (flare)" value={config.flare} min={0} max={0.5} step={0.01} onChange={(v) => handleChange('flare', v)} />
          </div>

          <Slider label="Fazka otworu" value={config.innerChamfer} min={0} max={3} step={0.1} unit="mm" onChange={(v) => handleChange('innerChamfer', v)} />
        </Section>

        {/* ─── H. Krawędzie ─── */}
        <Section title="Krawędzie" color="text-rose-600" bgColor="bg-rose-50/50" borderColor="border-rose-100">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Fazka górna" value={config.topChamfer} min={0} max={3} step={0.1} unit="mm" onChange={(v) => handleChange('topChamfer', v)} />
            <Slider label="Fillet górny" value={config.topFillet} min={0} max={5} step={0.1} unit="mm" onChange={(v) => handleChange('topFillet', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Fazka dolna" value={config.bottomChamfer} min={0} max={2} step={0.1} unit="mm" onChange={(v) => handleChange('bottomChamfer', v)} />
            <Slider label="Falista krawędź" value={config.wavyEdge} min={0} max={3} step={0.1} unit="mm" onChange={(v) => handleChange('wavyEdge', v)} />
          </div>

          <Slider label="Ząbki krawędzi" value={config.edgeSerrations} min={0} max={48} step={1} onChange={(v) => handleChange('edgeSerrations', v)} />
        </Section>

        {/* ─── E. Tekstura ─── */}
        <Section title="Tekstura Powierzchni" color="text-amber-700" bgColor="bg-amber-50/50" borderColor="border-amber-100">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Rowki prom." value={config.radialGrooves} min={0} max={12} step={1} onChange={(v) => handleChange('radialGrooves', v)} />
            <Slider label="Rowki konc." value={config.concentricGrooves} min={0} max={8} step={1} onChange={(v) => handleChange('concentricGrooves', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Mikrofala" value={config.microWave} min={0} max={1} step={0.01} unit="mm" onChange={(v) => handleChange('microWave', v)} />
            <Slider label="Faceting" value={config.faceting} min={0} max={24} step={1} onChange={(v) => handleChange('faceting', v)} />
          </div>
        </Section>

        {/* ─── L. Transformacje ─── */}
        <Section title="Transformacje Globalne" color="text-purple-600" bgColor="bg-purple-50/50" borderColor="border-purple-100">
          <Slider label="Skręcenie globalne" value={config.globalTwist} min={0} max={180} step={1} unit="°" onChange={(v) => handleChange('globalTwist', v)} />
          <Toggle label="Lustro pionowe (Flip Y)" value={config.flipY} color="bg-purple-600" onChange={(v) => handleChange('flipY', v)} />
        </Section>

        {/* ─── Technical Settings ─── */}
        <Section title="Wymiary Montażowe" color="text-blue-600" bgColor="bg-blue-50/50" borderColor="border-blue-100" defaultOpen={false}>
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Pozycja pierścienia</label>
              <span className="text-sm font-black text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">{config.seatingRingDepth} mm</span>
            </div>
            <input
              type="range" min="0" max="15" step="0.1"
              value={config.seatingRingDepth}
              onChange={(e) => handleChange('seatingRingDepth', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-[9px] text-blue-400 mt-1 italic uppercase font-bold tracking-tighter">Wysokość krawędzi 46.8/48.6mm od podstawy</p>
          </div>
        </Section>

        {/* ─── Kompensacja Skurczu ─── */}
        <Section title="Kompensacja Skurczu" color="text-emerald-600" bgColor="bg-emerald-50/50" borderColor="border-emerald-100" defaultOpen={false}>
          <div className="group">
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Skurcz materiału</label>
              <span className="text-sm font-black text-emerald-600 bg-white px-2 py-0.5 rounded border border-emerald-200">{config.shrinkagePercent}%</span>
            </div>
            <input
              type="range" min="0" max="5" step="0.1"
              value={config.shrinkagePercent}
              onChange={(e) => handleChange('shrinkagePercent', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="mt-2 flex justify-between items-center">
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-tighter">Średnica w STL:</p>
              <p className="text-xs font-mono font-bold text-emerald-700">{compensatedHole} mm</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-emerald-100">
            <div>
              <label className="text-sm font-bold text-gray-700 block">Tryb Shell (Skorupa)</label>
              <p className="text-[10px] text-gray-400">Stałe 46.8/48.6mm</p>
            </div>
            <button
              onClick={() => handleChange('isHollow', !config.isHollow)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.isHollow ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.isHollow ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {config.isHollow && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <Slider label="Grubość ścianki" value={config.wallThickness} min={0.8} max={4} step={0.1} unit="mm" accent="accent-emerald-500" onChange={(v) => handleChange('wallThickness', v)} />
            </div>
          )}
        </Section>

        {/* ─── Materiał i Ozdoby ─── */}
        <Section title="Materiał i Ozdoby" color="text-gray-500" bgColor="bg-gray-50/50" borderColor="border-gray-200" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {colorPalette.map(c => (
              <button
                key={c}
                onClick={() => handleChange('color', c)}
                className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 active:scale-90 ${config.color.toLowerCase() === c.toLowerCase() ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-md' : 'border-white shadow-sm'}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            <div className="relative group w-7 h-7">
              <input
                type="color" value={config.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center bg-gradient-to-br from-red-400 via-green-400 to-blue-400">
                <svg className="w-4 h-4 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
              </div>
            </div>
          </div>

          {/* Balls */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-3">
            <Toggle label="Kulki ozdobne" value={config.showBalls} onChange={(v) => handleChange('showBalls', v)} />
            {config.showBalls && (
              <div className="space-y-3 pt-2 border-t border-gray-200 animate-in fade-in duration-300">
                <Slider label="Rozmiar kulki" value={config.ballSize} min={1} max={10} step={0.1} unit="mm" onChange={(v) => handleChange('ballSize', v)} />
                <Slider label="Przesunięcie radialne" value={config.ballRadialOffset} min={-10} max={10} step={0.1} unit="mm" onChange={(v) => handleChange('ballRadialOffset', v)} />
              </div>
            )}
          </div>

          {/* Cones */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-3">
            <Toggle label="Stożki / Kolce" value={config.showCones} onChange={(v) => handleChange('showCones', v)} />
            {config.showCones && (
              <div className="space-y-3 pt-2 border-t border-gray-200 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-3">
                  <Slider label="Promień podstawy" value={config.coneSize} min={1} max={10} step={0.1} onChange={(v) => handleChange('coneSize', v)} />
                  <Slider label="Wysokość stożka" value={config.coneHeight} min={1} max={25} step={0.5} onChange={(v) => handleChange('coneHeight', v)} />
                </div>
                <Slider label="Przesunięcie radialne" value={config.coneRadialOffset} min={-10} max={10} step={0.1} unit="mm" onChange={(v) => handleChange('coneRadialOffset', v)} />
              </div>
            )}
          </div>

          <Toggle label="Wireframe" value={config.wireframeMode} onChange={(v) => handleChange('wireframeMode', v)} />

          <Slider label="Jakość siatki" value={config.smoothness} min={32} max={512} step={16} onChange={(v) => handleChange('smoothness', v)} />
        </Section>

        {/* ─── Multi-Socket ─── */}
        <Section title="Tryb Wielogniazdkowy" color="text-cyan-600" bgColor="bg-cyan-50/50" borderColor="border-cyan-100">
          <Toggle label="Włącz tryb multi" value={multiConfig.enabled} color="bg-cyan-600"
            onChange={(v) => setMultiConfig(p => ({ ...p, enabled: v }))} />

          {multiConfig.enabled && (
            <div className="space-y-3 pt-2 border-t border-cyan-100 animate-in fade-in duration-300">
              <Slider label="Liczba gniazdek" value={multiConfig.socketCount} min={2} max={5} step={1}
                accent="accent-cyan-500" onChange={(v) => setMultiConfig(p => ({ ...p, socketCount: v }))} />
              <Slider label="Rozstaw" value={multiConfig.socketSpacing} min={60} max={90} step={0.5} unit="mm"
                accent="accent-cyan-500" onChange={(v) => setMultiConfig(p => ({ ...p, socketSpacing: v }))} />

              <div className="grid grid-cols-2 gap-3">
                <Slider label="Zaokrąglenie" value={multiConfig.cornerRadius} min={0} max={20} step={1} unit="mm"
                  accent="accent-cyan-500" onChange={(v) => setMultiConfig(p => ({ ...p, cornerRadius: v }))} />
                <Slider label="Margines" value={multiConfig.outerPadding} min={5} max={25} step={1} unit="mm"
                  accent="accent-cyan-500" onChange={(v) => setMultiConfig(p => ({ ...p, outerPadding: v }))} />
              </div>

              {/* Outer shape selector */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Kształt obrysu</label>
                <div className="flex gap-1.5">
                  {(['stadium', 'rectangle', 'superellipse'] as const).map(shape => (
                    <button key={shape}
                      onClick={() => setMultiConfig(p => ({ ...p, outerShape: shape }))}
                      className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-lg border transition-all active:scale-95
                        ${multiConfig.outerShape === shape
                          ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                          : 'bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50'}`}
                    >
                      {shape === 'stadium' ? '⬭ Stadium' : shape === 'rectangle' ? '▢ Prostokąt' : '◆ Superelipsa'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bridge controls */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Styl mostka</label>
                <div className="flex gap-1.5">
                  {(['flat', 'raised', 'grooved'] as const).map(style => (
                    <button key={style}
                      onClick={() => setMultiConfig(p => ({ ...p, bridgeStyle: style }))}
                      className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-lg border transition-all active:scale-95
                        ${multiConfig.bridgeStyle === style
                          ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                          : 'bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50'}`}
                    >
                      {style === 'flat' ? '━ Płaski' : style === 'raised' ? '⌒ Wypukły' : '⌢ Rowkowy'}
                    </button>
                  ))}
                </div>
              </div>

              <Slider label="Wysokość mostka" value={multiConfig.bridgeHeight} min={0} max={1} step={0.05}
                accent="accent-cyan-500" onChange={(v) => setMultiConfig(p => ({ ...p, bridgeHeight: v }))} />

              {multiConfig.bridgeStyle === 'grooved' && (
                <div className="grid grid-cols-2 gap-3">
                  <Slider label="Rowki" value={multiConfig.bridgeGrooveCount} min={0} max={3} step={1}
                    accent="accent-cyan-500" onChange={(v) => setMultiConfig(p => ({ ...p, bridgeGrooveCount: v }))} />
                  <Slider label="Głębokość" value={multiConfig.bridgeGrooveDepth} min={0} max={1} step={0.1} unit="mm"
                    accent="accent-cyan-500" onChange={(v) => setMultiConfig(p => ({ ...p, bridgeGrooveDepth: v }))} />
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ─── Mold Slipcast ─── */}
        <Section title="Mold Slipcast" color="text-amber-700" bgColor="bg-amber-50/50" borderColor="border-amber-200" defaultOpen={false}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-600 uppercase">Włącz tryb moldu</span>
            <button
              onClick={() => setMoldConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${moldConfig.enabled ? 'bg-amber-500' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${moldConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {moldConfig.enabled && (
            <div className="space-y-3 pt-2 border-t border-amber-100 animate-in fade-in duration-300">
              <Slider label="Grubość ścian" value={moldConfig.moldWallThickness} min={2} max={15} step={0.5} unit="mm" accent="accent-amber-500"
                onChange={(v) => setMoldConfig(p => ({ ...p, moldWallThickness: v }))} />
              <Slider label="Wysokość ścian" value={moldConfig.moldWallHeight} min={15} max={80} step={1} unit="mm" accent="accent-amber-500"
                onChange={(v) => setMoldConfig(p => ({ ...p, moldWallHeight: v }))} />

              <div className="grid grid-cols-2 gap-3">
                <Slider label="Grubość dna" value={moldConfig.moldBaseThickness} min={3} max={12} step={0.5} accent="accent-amber-500"
                  onChange={(v) => setMoldConfig(p => ({ ...p, moldBaseThickness: v }))} />
                <Slider label="Margines" value={moldConfig.moldClearance} min={5} max={30} step={1} accent="accent-amber-500"
                  onChange={(v) => setMoldConfig(p => ({ ...p, moldClearance: v }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Slider label="Zamki (promień)" value={moldConfig.keyRadius} min={2} max={8} step={0.5} accent="accent-amber-500"
                  onChange={(v) => setMoldConfig(p => ({ ...p, keyRadius: v }))} />
                <Slider label="Zamki (ilość)" value={moldConfig.keyCount} min={1} max={4} step={1} accent="accent-amber-500"
                  onChange={(v) => setMoldConfig(p => ({ ...p, keyCount: v }))} />
              </div>

              <div className="space-y-2 pt-2 border-t border-amber-100">
                <Toggle label="Pokazuj zamki" value={moldConfig.showKeys} color="bg-amber-500" onChange={(v) => setMoldConfig(p => ({ ...p, showKeys: v }))} />
                <Toggle label="Pokazuj dno" value={moldConfig.showBase} color="bg-amber-500" onChange={(v) => setMoldConfig(p => ({ ...p, showBase: v }))} />
              </div>

              <Slider label="Przezroczystość" value={moldConfig.moldOpacity} min={0.05} max={1} step={0.05} accent="accent-amber-500"
                onChange={(v) => setMoldConfig(p => ({ ...p, moldOpacity: v }))} />
              <Slider label="Rozsunięcie" value={moldConfig.explodeDistance} min={0} max={50} step={1} unit="mm" accent="accent-amber-500"
                onChange={(v) => setMoldConfig(p => ({ ...p, explodeDistance: v }))} />
            </div>
          )}
        </Section>

        {/* ─── Export ─── */}
        <div className="pt-2">
          <button
            onClick={onExport}
            className={`group relative w-full overflow-hidden flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-2xl active:scale-[0.98] transition-all ${moldConfig.enabled
              ? 'bg-amber-600 shadow-amber-200 hover:bg-amber-700'
              : 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700'
              }`}
          >
            <svg className="w-5 h-5 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            {moldConfig.enabled ? 'Eksportuj Mold (4× STL)' : multiConfig.enabled ? `Eksportuj Multi ${multiConfig.socketCount}× STL` : 'Eksportuj STL'}
          </button>
          <div className="mt-3 text-center">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
              {moldConfig.enabled ? 'Generuje 4 osobne pliki STL' : multiConfig.enabled ? `Ramka ${multiConfig.socketCount}-gniazdkowa | ${multiConfig.socketSpacing}mm rozstaw` : 'Precyzja: 46.8mm | 48.6mm'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
