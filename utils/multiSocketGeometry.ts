/**
 * multiSocketGeometry.ts – Multi-socket frame geometry generator.
 *
 * Uses a Cartesian heightmap grid with SDF-based boundaries.
 * Only emits triangles where the surface is above z=0, so no
 * flat planes are rendered outside the frame or inside socket holes.
 * Separate cylindrical wall geometry for clean inner holes.
 */

import * as THREE from 'three';
import { FrameConfig, MultiSocketConfig } from '../types';

// ─── Dimension helpers ───────────────────────────────────────────────────────

export interface MultiSocketDimensions {
    comp: number;
    rInner: number;
    rStep: number;
    rOuterMax: number;
    spacing: number;
    centers: number[];
    halfWidth: number;
    halfHeight: number;
    bridgeW: number;
    maxHeight: number;
    stepHeight: number;
}

export function getMultiSocketDimensions(
    fc: FrameConfig, mc: MultiSocketConfig,
): MultiSocketDimensions {
    const comp = 1 / (1 - fc.shrinkagePercent / 100);
    const rInner = (fc.innerHoleDiameter / 2) * comp;
    const rStep = (fc.stepDiameter / 2) * comp;
    const rOuterMax = (fc.outerDiameter / 2) * comp;
    const spacing = mc.socketSpacing * comp;
    const maxHeight = (fc.height + fc.reliefHeight * fc.reliefHeightRatio) * comp;
    const stepHeight = fc.seatingRingDepth * comp;

    const centers: number[] = [];
    const totalSpan = (mc.socketCount - 1) * spacing;
    for (let i = 0; i < mc.socketCount; i++) {
        centers.push(-totalSpan / 2 + i * spacing);
    }

    const padding = mc.outerPadding * comp;
    const halfWidth = totalSpan / 2 + rOuterMax + padding;
    const halfHeight = rOuterMax + padding;
    const bridgeW = Math.max(0, spacing - rInner * 2);

    return {
        comp, rInner, rStep, rOuterMax, spacing, centers,
        halfWidth, halfHeight, bridgeW, maxHeight, stepHeight,
    };
}

// ─── SDF functions (negative = inside, positive = outside) ───────────────────

function sdStadium(px: number, py: number, halfW: number, halfH: number): number {
    const capR = halfH;
    const dx = Math.abs(px) - (halfW - capR);
    const ex = Math.max(dx, 0);
    return Math.sqrt(ex * ex + py * py) - capR;
}

function sdRoundedRect(px: number, py: number, halfW: number, halfH: number, r: number): number {
    const cr = Math.min(r, halfW, halfH);
    const dx = Math.abs(px) - halfW + cr;
    const dy = Math.abs(py) - halfH + cr;
    return Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) - cr + Math.min(Math.max(dx, dy), 0);
}

function sdSuperellipse(px: number, py: number, a: number, b: number, n: number): number {
    const val = Math.pow(Math.abs(px / a), n) + Math.pow(Math.abs(py / b), n);
    return (Math.pow(val, 1 / n) - 1) * Math.min(a, b);
}

// ─── Height computation ─────────────────────────────────────────────────────

function outerSDF(x: number, y: number, dim: MultiSocketDimensions, mc: MultiSocketConfig): number {
    const cornerR = mc.cornerRadius * dim.comp;
    switch (mc.outerShape) {
        case 'stadium': return sdStadium(x, y, dim.halfWidth, dim.halfHeight);
        case 'rectangle': return sdRoundedRect(x, y, dim.halfWidth, dim.halfHeight, cornerR);
        case 'superellipse': return sdSuperellipse(x, y, dim.halfWidth, dim.halfHeight, 3.0);
    }
}

/** Main side profile — distance-based (0 at edge, 1 fully inside) */
function sampleProfile(t: number, maxH: number, stepH: number, fc: FrameConfig): number {
    const clamped = Math.max(0, Math.min(1, t));
    const peakT = fc.peakPosition;
    const convexity = fc.profileConvexity;
    const dropAngle = fc.outerDropAngle;

    if (clamped < peakT) {
        const lt = clamped / peakT;
        const power = 2 - convexity * 1.5;
        return stepH + (maxH - stepH) * (1 - Math.pow(1 - lt, Math.max(0.3, power)));
    } else {
        const lt = (clamped - peakT) / (1 - peakT);
        const dropPow = 1 + (dropAngle / 90) * 4;
        return maxH * Math.pow(Math.cos(lt * Math.PI / 2), dropPow);
    }
}

/** Petal modulation at a given local angle theta. Returns [0.5..1] scale factor. */
function petalMod(theta: number, fc: FrameConfig): number {
    if (fc.petalIndentation <= 0) return 1;
    const eff = theta + fc.patternRotation * (Math.PI / 180);
    const raw = Math.cos(fc.petals * eff);
    const shaped = (Math.sign(raw) * Math.pow(Math.abs(raw), 1 / (0.1 + fc.petalRoundness * 2)) + 1) / 2;
    return 1 - fc.petalIndentation * (1 - shaped);
}

/** Bridge modulation between adjacent sockets */
function bridgeMod(
    x: number, _y: number, z: number,
    dim: MultiSocketDimensions, mc: MultiSocketConfig,
): number {
    for (let i = 0; i < dim.centers.length - 1; i++) {
        const mid = (dim.centers[i] + dim.centers[i + 1]) / 2;
        const halfB = dim.bridgeW / 2;
        if (halfB <= 0) continue;
        const distFromMid = Math.abs(x - mid);
        if (distFromMid > halfB) continue;

        const bridgeT = 1 - distFromMid / halfB; // 0 at edge, 1 at center

        switch (mc.bridgeStyle) {
            case 'flat':
                return Math.max(z, dim.maxHeight * mc.bridgeHeight);
            case 'raised': {
                const bump = Math.cos((1 - bridgeT) * Math.PI / 2);
                return Math.max(z, dim.maxHeight * mc.bridgeHeight * bump);
            }
            case 'grooved': {
                const base = z * (1 - mc.bridgeGrooveDepth * 0.3 * bridgeT);
                if (mc.bridgeGrooveCount > 0) {
                    const gWave = Math.sin(bridgeT * (mc.bridgeGrooveCount + 1) * Math.PI);
                    return base - Math.abs(gWave) * mc.bridgeGrooveDepth * dim.comp;
                }
                return base;
            }
        }
    }
    return z;
}

/**
 * Compute Z height at any point (x, y) on the multi-socket frame.
 * Returns 0 for points outside the boundary or inside socket holes.
 */
function computeHeight(
    x: number, y: number,
    dim: MultiSocketDimensions,
    fc: FrameConfig, mc: MultiSocketConfig,
): number {
    // 1. Outside boundary → 0
    const dBound = -outerSDF(x, y, dim, mc); // positive = inside
    if (dBound <= 0) return 0;

    // 2. Find nearest socket
    let minDist = Infinity;
    let nearCX = 0;
    for (const cx of dim.centers) {
        const d = Math.sqrt((x - cx) ** 2 + y * y);
        if (d < minDist) { minDist = d; nearCX = cx; }
    }

    // 3. Inside step ring (everything ≤ rStep) → 0
    //    Clean cylindrical geometry handles this zone entirely.
    if (minDist < dim.rStep) return 0;

    // 5. Body — profile based on distance from nearest edge
    const profileRange = dim.rOuterMax - dim.rStep;
    const distFromStep = minDist - dim.rStep;
    const effectiveDist = Math.min(distFromStep, dBound);
    const profileT = Math.min(1, effectiveDist / Math.max(1, profileRange));

    let z = sampleProfile(profileT, dim.maxHeight, dim.stepHeight, fc);

    // 6. Petal modulation (per-socket radial pattern)
    const localTheta = Math.atan2(y, x - nearCX);
    z *= petalMod(localTheta, fc);

    // 7. Bridge modulation
    z = bridgeMod(x, y, z, dim, mc);

    // 8. Smooth edge falloff (over 3mm at boundary)
    const edgeFalloff = Math.min(1, dBound / (3 * dim.comp));
    z *= smoothstep(edgeFalloff);

    return Math.max(0, z);
}

function smoothstep(t: number): number {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
}

// ─── Main geometry generator ─────────────────────────────────────────────────

export function generateMultiSocketGeometry(
    fc: FrameConfig, mc: MultiSocketConfig, quality: number = 1,
): THREE.BufferGeometry {
    const dim = getMultiSocketDimensions(fc, mc);

    const resX = Math.floor(280 * quality);
    const resY = Math.floor(180 * quality);

    const margin = 1 * dim.comp;
    const xMin = -dim.halfWidth - margin;
    const xMax = dim.halfWidth + margin;
    const yMin = -dim.halfHeight - margin;
    const yMax = dim.halfHeight + margin;

    // ─── 1. Top surface heightmap ───
    const verts: number[] = [];
    const idx: number[] = [];
    const zVals: number[] = [];

    for (let iy = 0; iy <= resY; iy++) {
        for (let ix = 0; ix <= resX; ix++) {
            const u = ix / resX;
            const v = iy / resY;
            const x = xMin + u * (xMax - xMin);
            const y = yMin + v * (yMax - yMin);
            const z = computeHeight(x, y, dim, fc, mc);

            verts.push(x, y, z);
            zVals.push(z);
        }
    }

    // Only emit triangles where at least one vertex has z > 0
    const stride = resX + 1;
    const EPS = 0.001;

    for (let iy = 0; iy < resY; iy++) {
        for (let ix = 0; ix < resX; ix++) {
            const a = iy * stride + ix;
            const b = a + 1;
            const c = a + stride;
            const d = c + 1;

            const anyLive = zVals[a] > EPS || zVals[b] > EPS || zVals[c] > EPS || zVals[d] > EPS;
            if (!anyLive) continue;

            // Top face (upward normals)
            idx.push(a, b, c);
            idx.push(b, d, c);

            // Bottom face (downward normals) — mirror at z=0
            // Only add bottom where all verts of the quad are inside the frame
            const allLive = zVals[a] > EPS && zVals[b] > EPS && zVals[c] > EPS && zVals[d] > EPS;
            if (allLive) {
                const ba = a + (resX + 1) * (resY + 1);
                const bb = b + (resX + 1) * (resY + 1);
                const bc = c + (resX + 1) * (resY + 1);
                const bd = d + (resX + 1) * (resY + 1);
                idx.push(ba, bc, bb);
                idx.push(bb, bc, bd);
            }
        }
    }

    // ─── 2. Bottom surface vertices (z=0 mirror, only used from step 1 bottom faces) ───
    const topVertCount = (resX + 1) * (resY + 1);
    for (let iy = 0; iy <= resY; iy++) {
        for (let ix = 0; ix <= resX; ix++) {
            const u = ix / resX;
            const v = iy / resY;
            const x = xMin + u * (xMax - xMin);
            const y = yMin + v * (yMax - yMin);
            verts.push(x, y, 0);
        }
    }

    // ─── 3. Inner hole walls (clean cylindrical geometry) ───
    addHoleWalls(verts, idx, dim);

    // ─── Build ───
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.setIndex(idx);
    geometry.computeVertexNormals();
    return geometry;
}

// ─── Hole walls ──────────────────────────────────────────────────────────────

function addHoleWalls(
    verts: number[], idx: number[],
    dim: MultiSocketDimensions,
): void {
    const segs = 64;

    for (const cx of dim.centers) {
        // 1. Inner cylinder wall: z=0 → z=stepHeight at r=rInner
        const cylBase = verts.length / 3;
        for (let s = 0; s <= segs; s++) {
            const theta = (s / segs) * Math.PI * 2;
            const cos = Math.cos(theta);
            const sin = Math.sin(theta);
            verts.push(cx + dim.rInner * cos, dim.rInner * sin, 0);
            verts.push(cx + dim.rInner * cos, dim.rInner * sin, dim.stepHeight);
        }
        for (let s = 0; s < segs; s++) {
            const i0 = cylBase + s * 2;
            idx.push(i0, i0 + 2, i0 + 1);
            idx.push(i0 + 1, i0 + 2, i0 + 3);
        }

        // 2. Step ring floor: horizontal annulus at z=stepHeight, rInner → rStep
        const ringBase = verts.length / 3;
        for (let s = 0; s <= segs; s++) {
            const theta = (s / segs) * Math.PI * 2;
            const cos = Math.cos(theta);
            const sin = Math.sin(theta);
            verts.push(cx + dim.rInner * cos, dim.rInner * sin, dim.stepHeight);
            verts.push(cx + dim.rStep * cos, dim.rStep * sin, dim.stepHeight);
        }
        for (let s = 0; s < segs; s++) {
            const i0 = ringBase + s * 2;
            idx.push(i0, i0 + 1, i0 + 2);
            idx.push(i0 + 1, i0 + 3, i0 + 2);
        }

        // 3. Outer step wall: cylinder at r=rStep, z=0 → z=stepHeight
        //    Provides clean circular edge where heightmap body meets the step.
        const outerWallBase = verts.length / 3;
        for (let s = 0; s <= segs; s++) {
            const theta = (s / segs) * Math.PI * 2;
            const cos = Math.cos(theta);
            const sin = Math.sin(theta);
            verts.push(cx + dim.rStep * cos, dim.rStep * sin, 0);
            verts.push(cx + dim.rStep * cos, dim.rStep * sin, dim.stepHeight);
        }
        for (let s = 0; s < segs; s++) {
            const i0 = outerWallBase + s * 2;
            // Outward-facing normals (opposite winding from inner cylinder)
            idx.push(i0, i0 + 1, i0 + 2);
            idx.push(i0 + 1, i0 + 3, i0 + 2);
        }
    }
}
