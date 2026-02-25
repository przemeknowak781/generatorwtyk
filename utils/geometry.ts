
import * as THREE from 'three';
import { FrameConfig } from '../types';

/**
 * Generates a solid half-cone geometry (manifold).
 * The cone axis is along Y, and it is "cut" in half by the XY plane (local Z=0).
 */
export const generateSolidHalfCone = (radius: number, height: number, segments: number): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];

  const apex = new THREE.Vector3(0, height, 0);
  const center = new THREE.Vector3(0, 0, 0);

  vertices.push(apex.x, apex.y, apex.z);
  vertices.push(center.x, center.y, center.z);

  const sideSegments = Math.max(3, segments);
  for (let i = 0; i <= sideSegments; i++) {
    const phi = (i / sideSegments) * Math.PI;
    const x = radius * Math.cos(phi);
    const z = radius * Math.sin(phi);
    vertices.push(x, 0, z);
  }

  for (let i = 0; i < sideSegments; i++) {
    const v_curr = i + 2;
    const v_next = i + 3;
    indices.push(0, v_next, v_curr);
  }

  for (let i = 0; i < sideSegments; i++) {
    const v_curr = i + 2;
    const v_next = i + 3;
    indices.push(1, v_curr, v_next);
  }

  const pStartIdx = 2;
  const pEndIdx = sideSegments + 2;
  indices.push(0, 1, pEndIdx);
  indices.push(1, 0, pStartIdx);

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};

// ─── Helper: smoothstep for step shape blending ───
const smoothstep = (t: number, blend: number): number => {
  if (blend <= 0) return t < 1 ? 0 : 1; // sharp step
  const x = Math.max(0, Math.min(1, t));
  const sharp = x < 1 ? 0 : 1;
  const smooth = x * x * (3 - 2 * x);
  return sharp * (1 - blend) + smooth * blend;
};

export const generateFrameGeometry = (config: FrameConfig, qualityMultiplier: number = 1): THREE.BufferGeometry => {
  const {
    petals,
    outerDiameter,
    height,
    reliefHeight,
    innerHoleDiameter,
    stepDiameter,
    seatingRingDepth,
    petalIndentation,
    petalRoundness,
    smoothness,
    isHollow,
    wallThickness,
    shrinkagePercent,
    // ─── New params ───
    patternRotation,
    petalAsymmetry,
    petalTwist,
    petalAmplitudeVariation,
    petalShape,
    secondaryWave,
    valleyRoundness,
    sawtoothBlend,
    interleaveCount,
    profileConvexity,
    peakPosition,
    plateauWidth,
    outerDropAngle,
    profileRipple,
    innerLipAngle,
    reliefHeightRatio,
    stepShape,
    enableXYScale,
    scaleX,
    scaleY,
    taper,
    flare,
    innerChamfer,
    radialGrooves,
    concentricGrooves,
    microWave,
    faceting,
    edgeSerrations,
    topChamfer,
    topFillet,
    bottomChamfer,
    wavyEdge,
    globalTwist,
  } = config;

  const comp = 1 / (1 - (shrinkagePercent / 100));

  const geometry = new THREE.BufferGeometry();

  const rInner = (innerHoleDiameter / 2) * comp;
  const rStep = (stepDiameter / 2) * comp;
  const rOuterMax = (outerDiameter / 2) * comp;
  const baseMaxHeight = (height + reliefHeight * reliefHeightRatio) * comp;
  const stepHeight = seatingRingDepth * comp;
  const compensatedWallThickness = wallThickness * comp;

  const radialSegments = Math.floor(128 * qualityMultiplier);
  const angularSegments = Math.floor(smoothness * qualityMultiplier);

  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const addVertex = (x: number, y: number, z: number, u: number, v: number) => {
    vertices.push(x, y, z);
    uvs.push(u, v);
  };

  // ─── Compute raw wave for a given angle ───
  const computeRawWave = (theta: number): number => {
    // A7: Pattern rotation
    let effectiveTheta = theta + patternRotation * (Math.PI / 180);

    // A1: Petal asymmetry
    if (petalAsymmetry > 0) {
      const asymOffset = petalAsymmetry * Math.sin(petals * effectiveTheta) * (Math.PI / petals / 4);
      effectiveTheta += asymOffset;
    }

    // E6: Faceting — quantize theta
    if (faceting > 0) {
      const step = (2 * Math.PI) / faceting;
      const facetedTheta = Math.round(effectiveTheta / step) * step;
      const blend = 0.8;
      effectiveTheta = effectiveTheta * (1 - blend) + facetedTheta * blend;
    }

    // A4: Superellipse shape
    let rawWave: number;
    if (petalShape !== 1.0 && petalShape > 0) {
      const n = petalShape;
      const ct = Math.cos(petals * effectiveTheta);
      rawWave = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n);
    } else {
      rawWave = Math.cos(petals * effectiveTheta);
    }

    // A8: Sawtooth blend
    if (sawtoothBlend > 0) {
      const sawWave = 2 * (((petals * effectiveTheta / (2 * Math.PI)) % 1 + 1) % 1) - 1;
      rawWave = rawWave * (1 - sawtoothBlend) + sawWave * sawtoothBlend;
    }

    // A5: Secondary wave
    if (secondaryWave > 0) {
      const secondaryFreq = petals * 3;
      const secondary = secondaryWave * Math.cos(secondaryFreq * effectiveTheta);
      rawWave += secondary;
    }

    // A10: Interleave layers
    if (interleaveCount > 0) {
      let combinedMod = (rawWave + 1) / 2; // normalize to 0-1
      for (let layer = 1; layer <= interleaveCount; layer++) {
        const layerOffset = (layer / (interleaveCount + 1)) * (Math.PI / petals);
        const layerScale = 1 - layer * 0.15;
        const layerWave = layerScale * (Math.cos(petals * (effectiveTheta + layerOffset)) + 1) / 2;
        combinedMod = Math.max(combinedMod, layerWave);
      }
      rawWave = combinedMod * 2 - 1; // back to -1..1 range
    }

    return rawWave;
  };

  // ─── Compute petal modulation from raw wave ───
  const computePetalMod = (rawWave: number): number => {
    // A6: Valley roundness — separate roundness for peaks vs valleys
    let petalMod: number;
    if (rawWave >= 0) {
      petalMod = Math.pow(rawWave, 1 / (0.1 + petalRoundness * 2));
    } else {
      const vr = valleyRoundness !== undefined ? valleyRoundness : petalRoundness;
      petalMod = -Math.pow(Math.abs(rawWave), 1 / (0.1 + vr * 2));
    }
    return (petalMod + 1) / 2; // normalized 0..1
  };

  // ─── Profile generator ───
  const getOuterProfile = (currentOuterRadius: number, theta: number, maxHeight: number) => {
    const points: { r: number, z: number }[] = [];

    // D4: Inner chamfer
    if (innerChamfer > 0) {
      points.push({ r: rInner + innerChamfer, z: 0 });
    }

    // B6: Inner lip angle
    if (innerLipAngle > 0) {
      const lipOffset = stepHeight * Math.tan(innerLipAngle * Math.PI / 180);
      points.push({ r: rInner - lipOffset, z: 0 });
      points.push({ r: rInner, z: stepHeight });
    } else {
      points.push({ r: rInner, z: 0 });
      points.push({ r: rInner, z: stepHeight });
    }

    // B8: Step shape — smooth transition from rInner to rStep
    if (stepShape > 0) {
      const stepCount = 4;
      for (let i = 1; i < stepCount; i++) {
        const st = i / stepCount;
        const r = rInner + (rStep - rInner) * st;
        const z = stepHeight * smoothstep(st, stepShape);
        points.push({ r, z });
      }
    }

    points.push({ r: rStep, z: stepHeight });

    const bodyStartR = rStep;
    const bodyEndR = currentOuterRadius;
    const bodyWidth = bodyEndR - bodyStartR;
    const peakT = peakPosition; // B2

    for (let i = 1; i <= radialSegments; i++) {
      const t = i / radialSegments;
      const r = bodyStartR + bodyWidth * t;
      let z = 0;

      // B3: Plateau
      if (plateauWidth > 0 && t >= peakT - plateauWidth / 2 && t <= peakT + plateauWidth / 2) {
        z = maxHeight;
      } else if (t < peakT - (plateauWidth / 2)) {
        const adjustedPeakT = peakT - plateauWidth / 2;
        const localT = t / adjustedPeakT;
        // B1: Profile convexity
        const power = 2 - profileConvexity * 1.5;
        const eased = 1 - Math.pow(Math.max(0, 1 - localT), power);
        z = stepHeight + (maxHeight - stepHeight) * eased;
      } else {
        const adjustedStart = peakT + plateauWidth / 2;
        const localT = (t - adjustedStart) / (1 - adjustedStart);
        // B4: Outer drop angle
        const dropPower = 1 + (outerDropAngle / 90) * 4;
        const eased = Math.pow(Math.max(0, Math.cos(localT * Math.PI / 2)), dropPower);
        z = maxHeight * eased;
      }

      // B5: Profile ripple
      if (profileRipple > 0) {
        const rippleFreq = 5;
        z += profileRipple * Math.sin(t * rippleFreq * Math.PI * 2);
      }

      // E2: Concentric grooves
      if (concentricGrooves > 0) {
        const grNorm = (r - rInner) / (currentOuterRadius - rInner);
        z -= 0.5 * Math.max(0, Math.sin(grNorm * concentricGrooves * Math.PI * 2));
      }

      // E1: Radial grooves
      if (radialGrooves > 0) {
        const grooveDepth = 0.8;
        const grooveWidth = 0.3;
        const grooveAt = Math.cos(radialGrooves * theta);
        if (grooveAt > (1 - grooveWidth)) {
          z -= grooveDepth * (grooveAt - (1 - grooveWidth)) / grooveWidth;
        }
      }

      // E4: Micro-wave
      if (microWave > 0) {
        const microFreq = 30;
        const rNorm = r / rOuterMax;
        const microZ = microWave * Math.sin(microFreq * theta) * Math.cos(microFreq * rNorm * Math.PI);
        z += microZ;
      }

      points.push({ r, z: Math.max(0, z) });
    }

    const last = points[points.length - 1];

    // H3: Bottom chamfer
    if (bottomChamfer > 0) {
      points.splice(points.length - 1, 0, { r: last.r - bottomChamfer, z: bottomChamfer });
    }

    last.z = 0;
    // H1/H2: Stable top edge shaping.
    // Keep the vertex count constant across angular slices to prevent index mismatches/topology artifacts.
    if (topChamfer > 0 || topFillet > 0) {
      let peakIdx = 0;
      let peakZ = -Infinity;
      for (let i = 0; i < points.length; i++) {
        if (points[i].z > peakZ) { peakZ = points[i].z; peakIdx = i; }
      }

      const safePeakIdx = Math.min(points.length - 2, Math.max(1, peakIdx));
      const peak = points[safePeakIdx];

      if (topChamfer > 0) {
        const maxChamferDrop = Math.max(0, peak.z * 0.9);
        const chamferDrop = Math.min(topChamfer, maxChamferDrop);
        points[safePeakIdx].z = Math.max(0, points[safePeakIdx].z - chamferDrop);
      }

      if (topFillet > 0) {
        const window = Math.max(1, Math.round(2 + topFillet));
        const strength = Math.min(0.8, 0.2 + topFillet / 7);
        const zCopy = points.map(p => p.z);

        for (let w = -window; w <= window; w++) {
          const i = safePeakIdx + w;
          if (i <= 0 || i >= points.length - 1) continue;

          const t = Math.abs(w) / window;
          const localStrength = strength * (1 - t);
          const avg = (zCopy[i - 1] + zCopy[i] + zCopy[i + 1]) / 3;
          points[i].z = Math.max(0, zCopy[i] * (1 - localStrength) + avg * localStrength);
        }
      }
    }

    return points;
  };

  const getInnerProfile = (outerPoints: { r: number, z: number }[], thickness: number) => {
    const innerPoints: { r: number, z: number }[] = [];
    for (let i = 0; i < outerPoints.length; i++) {
      const p = outerPoints[i];
      let dr = 0, dz = 0;

      if (i === 0) {
        dr = outerPoints[1].r - p.r; dz = outerPoints[1].z - p.z;
      } else if (i === outerPoints.length - 1) {
        dr = p.r - outerPoints[i - 1].r; dz = p.z - outerPoints[i - 1].z;
      } else {
        dr = outerPoints[i + 1].r - outerPoints[i - 1].r; dz = outerPoints[i + 1].z - outerPoints[i - 1].z;
      }

      const len = Math.sqrt(dr * dr + dz * dz) || 1;
      const nr = dz / len;
      const nz = -dr / len;

      innerPoints.push({
        r: p.r + nr * thickness,
        z: Math.max(0, p.z + nz * thickness)
      });
    }
    return innerPoints;
  };

  // ─── Main vertex generation loop ───
  // We go up to < angularSegments to avoid duplicate vertices at the seam (0 and 2PI)
  for (let s = 0; s < angularSegments; s++) {
    const theta = (s / angularSegments) * Math.PI * 2;
    const u = s / angularSegments;

    const rawWave = computeRawWave(theta);
    const petalMod = computePetalMod(rawWave);

    let ampMod = 1;
    if (petalAmplitudeVariation > 0) {
      const altWave = Math.cos(petals * theta / 2);
      ampMod = 1 - petalAmplitudeVariation * (0.5 + 0.5 * altWave);
    }

    let currentOuterRadius = rOuterMax * (1 - petalIndentation * ampMod * (1 - petalMod));

    if (edgeSerrations > 0) {
      const serrationAmp = 1.5;
      const serrWave = Math.abs(Math.sin(edgeSerrations * theta));
      currentOuterRadius += serrationAmp * serrWave * comp;
    }

    const wavyFreq = petals * 2;
    const effectiveMaxHeight = baseMaxHeight + wavyEdge * Math.sin(wavyFreq * theta) * comp;

    const outerPoints = getOuterProfile(currentOuterRadius, theta, effectiveMaxHeight);
    const sliceProfile: { r: number, z: number }[] = [...outerPoints];

    if (isHollow) {
      const innerPoints = getInnerProfile(outerPoints, compensatedWallThickness);
      for (let i = innerPoints.length - 1; i >= 0; i--) {
        sliceProfile.push(innerPoints[i]);
      }
    }

    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    sliceProfile.forEach((p, idx) => {
      let x = p.r * cosTheta;
      let y = p.r * sinTheta;
      let z = p.z;

      if (petalTwist !== 0 && effectiveMaxHeight > 0) {
        const twistAtZ = (z / effectiveMaxHeight) * petalTwist * (Math.PI / 180);
        const nx = x * Math.cos(twistAtZ) - y * Math.sin(twistAtZ);
        const ny = x * Math.sin(twistAtZ) + y * Math.cos(twistAtZ);
        x = nx; y = ny;
      }

      if ((taper > 0 || flare > 0) && effectiveMaxHeight > 0) {
        const zRatio = z / effectiveMaxHeight;
        const taperScale = 1 - taper * zRatio;
        const flareScale = 1 + flare * zRatio;
        x *= taperScale * flareScale;
        y *= taperScale * flareScale;
      }

      if (globalTwist !== 0 && effectiveMaxHeight > 0) {
        const twistAngle = (z / effectiveMaxHeight) * globalTwist * (Math.PI / 180);
        const nx = x * Math.cos(twistAngle) - y * Math.sin(twistAngle);
        const ny = x * Math.sin(twistAngle) + y * Math.cos(twistAngle);
        x = nx; y = ny;
      }

      if (enableXYScale) {
        const scaleBlendDen = Math.max(1e-6, currentOuterRadius - rStep);
        const outerBlend = Math.max(0, Math.min(1, (p.r - rStep) / scaleBlendDen));
        const localScaleX = 1 + (scaleX - 1) * outerBlend;
        const localScaleY = 1 + (scaleY - 1) * outerBlend;
        x *= localScaleX;
        y *= localScaleY;
      }

      addVertex(x, y, z, u, idx / sliceProfile.length);
    });
  }

  const sampleOuter = getOuterProfile(rOuterMax, 0, baseMaxHeight);
  const verticesPerSlice = isHollow ? sampleOuter.length * 2 : sampleOuter.length;

  for (let s = 0; s < angularSegments; s++) {
    const iNext = (s + 1) % angularSegments; // Wraps around to 0
    for (let v = 0; v < verticesPerSlice; v++) {
      const vNext = (v + 1) % verticesPerSlice;

      if (!isHollow && v === verticesPerSlice - 1) {
        const a = s * verticesPerSlice + v;
        const b = s * verticesPerSlice + 0;
        const c = iNext * verticesPerSlice + 0;
        const d = iNext * verticesPerSlice + v;
        indices.push(a, b, d);
        indices.push(b, c, d);
        continue;
      }

      const a = s * verticesPerSlice + v;
      const b = s * verticesPerSlice + vNext;
      const c = iNext * verticesPerSlice + vNext;
      const d = iNext * verticesPerSlice + v;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};
