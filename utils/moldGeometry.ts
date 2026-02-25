/**
 * moldGeometry.ts – Procedural generation of 4-part slipcasting mold boxes.
 *
 * Each mold part is a quarter-pie shaped container with:
 *   1. A base plate (quarter disc)
 *   2. A curved outer wall (arc)
 *   3. Two flat dividing walls (radial)
 *   4. The frame quarter (positive) sitting on the base
 *   5. Registration keys (hemispheres) on dividing walls
 */

import * as THREE from 'three';
import { Brush, Evaluator, INTERSECTION } from 'three-bvh-csg';
import { FrameConfig, MoldConfig } from '../types';
import { generateFrameGeometry } from './geometry';

const csgEvaluator = new Evaluator();

// ─── Shared dimension helpers ────────────────────────────────────────────────

export interface MoldDimensions {
    comp: number;
    rInner: number;
    rStep: number;
    rOuterMax: number;
    maxFrameHeight: number;
    stepHeight: number;
    /** Outer radius of the mold box (frame outer + clearance) */
    moldOuterR: number;
    /** Total height of the mold box (base + frame + headroom) */
    totalHeight: number;
    baseThickness: number;
}

export function getMoldDimensions(fc: FrameConfig, mc: MoldConfig): MoldDimensions {
    const comp = 1 / (1 - fc.shrinkagePercent / 100);
    const rInner = (fc.innerHoleDiameter / 2) * comp;
    const rStep = (fc.stepDiameter / 2) * comp;
    const serrationHeadroom = fc.edgeSerrations > 0 ? 1.5 * comp : 0;
    const scaleHeadroom = fc.enableXYScale ? Math.max(fc.scaleX, fc.scaleY) : 1;
    const flareHeadroom = 1 + Math.max(0, fc.flare);
    const rOuterMax = ((fc.outerDiameter / 2) * comp + serrationHeadroom) * scaleHeadroom * flareHeadroom;

    const profileHeight = (fc.height + fc.reliefHeight * fc.reliefHeightRatio) * comp;
    const detailHeight = (Math.max(0, fc.wavyEdge) + Math.max(0, fc.profileRipple) + Math.max(0, fc.microWave)) * comp;
    const maxFrameHeight = profileHeight + detailHeight;
    const stepHeight = fc.seatingRingDepth * comp;
    const moldOuterR = rOuterMax + mc.moldClearance;

    const baseT = mc.showBase ? mc.moldBaseThickness : 0;
    const totalHeight = baseT + maxFrameHeight + mc.moldWallHeight;

    return {
        comp, rInner, rStep, rOuterMax, maxFrameHeight,
        stepHeight, moldOuterR, totalHeight,
        baseThickness: baseT,
    };
}

// ─── Quarter frame geometry ──────────────────────────────────────────────────

/**
 * Generates the frame surface limited to a 90° angular range,
 * with flat cap faces at the two cut planes so it forms a watertight solid.
 */
export function generateQuarterFrameGeometry(
    config: FrameConfig,
    quadrant: 0 | 1 | 2 | 3,
    qualityMultiplier: number = 1,
): THREE.BufferGeometry {
    // Build the exact frame geometry used in normal mode and cut it to a quadrant.
    // This keeps slipcast fully in sync with all shape sliders from geometry.ts.
    const fullGeometry = generateFrameGeometry(config, qualityMultiplier);
    fullGeometry.computeBoundingBox();

    const bb = fullGeometry.boundingBox;
    if (!bb) {
        return fullGeometry;
    }

    const pad = 2;
    const zMin = bb.min.z - pad;
    const zMax = bb.max.z + pad;

    let xMin = bb.min.x - pad;
    let xMax = bb.max.x + pad;
    let yMin = bb.min.y - pad;
    let yMax = bb.max.y + pad;

    if (quadrant === 0) {
        xMin = 0;
        yMin = 0;
    } else if (quadrant === 1) {
        xMax = 0;
        yMin = 0;
    } else if (quadrant === 2) {
        xMax = 0;
        yMax = 0;
    } else {
        xMin = 0;
        yMax = 0;
    }

    const sx = Math.max(1e-3, xMax - xMin);
    const sy = Math.max(1e-3, yMax - yMin);
    const sz = Math.max(1e-3, zMax - zMin);

    const clipGeometry = new THREE.BoxGeometry(sx, sy, sz);
    clipGeometry.translate((xMin + xMax) * 0.5, (yMin + yMax) * 0.5, (zMin + zMax) * 0.5);

    const frameBrush = new Brush(fullGeometry);
    const clipBrush = new Brush(clipGeometry);
    frameBrush.updateMatrixWorld(true);
    clipBrush.updateMatrixWorld(true);

    const resultBrush = csgEvaluator.evaluate(frameBrush, clipBrush, INTERSECTION);
    const quarterGeometry = resultBrush.geometry.clone();
    quarterGeometry.computeVertexNormals();

    // Clean up temporary CSG resources created on each generation pass.
    const tempGeometries: THREE.BufferGeometry[] = [fullGeometry, clipGeometry];
    if (
        resultBrush.geometry &&
        resultBrush.geometry !== quarterGeometry &&
        resultBrush.geometry !== fullGeometry &&
        resultBrush.geometry !== clipGeometry
    ) {
        tempGeometries.push(resultBrush.geometry);
    }
    tempGeometries.forEach((g) => g.dispose());

    return quarterGeometry;
}
// ─── Mold base plate (quarter disc) ──────────────────────────────────────────

export function generateMoldBase(
    outerR: number,
    startAngle: number,
    endAngle: number,
    thickness: number,
    padding: number,
    segments: number = 32,
): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const dAlpha = Math.atan(padding / outerR);

    // Define shape in local quadrant space [0, 90] then rotate
    // (-padding, -padding) is the outer corner at the origin
    shape.moveTo(-padding, -padding);
    shape.lineTo(outerR, -padding);
    shape.absarc(0, 0, outerR, -dAlpha, Math.PI / 2 + dAlpha, false);
    shape.lineTo(-padding, outerR);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: false,
        curveSegments: segments
    });

    // Rotate to match the startAngle of the quadrant
    const mat = new THREE.Matrix4().makeRotationZ(startAngle);
    geometry.applyMatrix4(mat);

    return geometry;
}

// ─── Curved outer wall ───────────────────────────────────────────────────────

export function generateCurvedWall(
    radius: number,
    thickness: number,
    startAngle: number,
    endAngle: number,
    wallHeight: number,
    segments: number = 32,
    angleExtension: number = 0
): THREE.BufferGeometry {
    const innerR = radius;
    const outerR = radius + thickness;
    const verts: number[] = [];
    const idx: number[] = [];

    const sAngle = startAngle - angleExtension;
    const eAngle = endAngle + angleExtension;

    // 4 vertices per segment-step: innerBot, innerTop, outerBot, outerTop
    for (let s = 0; s <= segments; s++) {
        const theta = sAngle + (s / segments) * (eAngle - sAngle);
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        verts.push(innerR * cos, innerR * sin, 0);          // 0: inner bot
        verts.push(innerR * cos, innerR * sin, wallHeight);  // 1: inner top
        verts.push(outerR * cos, outerR * sin, 0);          // 2: outer bot
        verts.push(outerR * cos, outerR * sin, wallHeight);  // 3: outer top
    }

    for (let s = 0; s < segments; s++) {
        const c = s * 4;
        const n = (s + 1) * 4;
        // Inner face
        idx.push(c + 0, n + 1, n + 0);
        idx.push(c + 0, c + 1, n + 1);
        // Outer face
        idx.push(c + 2, n + 2, n + 3);
        idx.push(c + 2, n + 3, c + 3);
        // Top face
        idx.push(c + 1, c + 3, n + 3);
        idx.push(c + 1, n + 3, n + 1);
        // Bottom face
        idx.push(c + 0, n + 0, n + 2);
        idx.push(c + 0, n + 2, c + 2);
    }

    // End caps
    idx.push(0, 2, 3);
    idx.push(0, 3, 1);
    const L = segments * 4;
    idx.push(L + 0, L + 1, L + 3);
    idx.push(L + 0, L + 3, L + 2);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geom.setIndex(idx);
    geom.computeVertexNormals();
    return geom;
}

// ─── Flat dividing wall ─────────────────────────────────────────────────────

export function generateFlatWall(
    angle: number,
    length: number,
    thickness: number,
    wallHeight: number,
    side: 'left' | 'right' | 'center' = 'center',
    radialOffset: number = 0
): THREE.BufferGeometry {
    const geom = new THREE.BoxGeometry(length, thickness, wallHeight);
    let yOffset = 0;
    if (side === 'left') yOffset = thickness / 2;
    if (side === 'right') yOffset = -thickness / 2;

    // Position: radialOffset + length/2, yOffset, wallHeight/2
    geom.translate(radialOffset + length / 2, yOffset, wallHeight / 2);
    // Rotate to align with the angle
    const mat = new THREE.Matrix4().makeRotationZ(angle);
    geom.applyMatrix4(mat);
    return geom;
}

// ─── Registration key hemisphere ─────────────────────────────────────────────

export function generateKeyHemisphere(
    radius: number,
    segments: number = 12,
): THREE.BufferGeometry {
    return new THREE.SphereGeometry(radius, segments, segments, 0, Math.PI * 2, 0, Math.PI / 2);
}

// ─── Quadrant key positions & orientations ───────────────────────────────────

export interface KeyInfo {
    position: THREE.Vector3;
    isPositive: boolean; // true = bump (♂), false = dip (♀)
    wallAngle: number;
}

export function getKeysForQuadrant(
    quadrant: 0 | 1 | 2 | 3,
    fc: FrameConfig,
    mc: MoldConfig,
): KeyInfo[] {
    const dim = getMoldDimensions(fc, mc);
    const startAngle = (quadrant * Math.PI) / 2;
    const endAngle = ((quadrant + 1) * Math.PI) / 2;
    const keys: KeyInfo[] = [];

    for (let i = 0; i < mc.keyCount; i++) {
        const t = (i + 1) / (mc.keyCount + 1);
        const r = dim.rInner + (dim.moldOuterR - dim.rInner) * t;
        const z = dim.totalHeight * 0.5;

        const wallT = mc.moldWallThickness;
        const halfT = wallT / 2;

        // Wall A (startAngle): offset 'right' (-Y' in local)
        const isPositiveA = quadrant < 2;
        const vecA = new THREE.Vector3(r, -halfT, z);
        vecA.applyAxisAngle(new THREE.Vector3(0, 0, 1), startAngle);
        keys.push({
            position: vecA,
            isPositive: isPositiveA,
            wallAngle: startAngle,
        });

        // Wall B (endAngle): offset 'left' (+Y' in local)
        const isPositiveB = quadrant >= 2;
        const vecB = new THREE.Vector3(r, halfT, z);
        vecB.applyAxisAngle(new THREE.Vector3(0, 0, 1), endAngle);
        keys.push({
            position: vecB,
            isPositive: isPositiveB,
            wallAngle: endAngle,
        });
    }

    return keys;
}

// ─── High-level: assemble all parts for one quadrant ─────────────────────────

export interface MoldQuadrantParts {
    frameQuarter: THREE.BufferGeometry;
    base: THREE.BufferGeometry;
    outerWall: THREE.BufferGeometry;
    wallA: THREE.BufferGeometry;
    wallB: THREE.BufferGeometry;
    keys: KeyInfo[];
}

export function getMoldQuadrantParts(
    quadrant: 0 | 1 | 2 | 3,
    fc: FrameConfig,
    mc: MoldConfig,
    qualityMultiplier: number = 1,
): MoldQuadrantParts {
    const dim = getMoldDimensions(fc, mc);
    const startAngle = (quadrant * Math.PI) / 2;
    const endAngle = ((quadrant + 1) * Math.PI) / 2;
    const wallSegs = Math.max(16, Math.floor(32 * qualityMultiplier));

    // 1. Frame quarter – translated up by base thickness (if any)
    const frameQuarter = generateQuarterFrameGeometry(fc, quadrant, qualityMultiplier);
    if (dim.baseThickness > 0) {
        frameQuarter.translate(0, 0, dim.baseThickness);
    }

    const dAlpha = Math.atan(mc.moldWallThickness / dim.moldOuterR);

    // 2. Base plate – use Shape-based generation for perfect coverage
    const base = generateMoldBase(
        dim.moldOuterR + mc.moldWallThickness,
        startAngle, endAngle,
        dim.baseThickness,
        mc.moldWallThickness,
        wallSegs,
    );

    // 3. Outer curved wall – slightly extended to wrap around flat walls
    const outerWall = generateCurvedWall(
        dim.moldOuterR,
        mc.moldWallThickness,
        startAngle, endAngle,
        dim.totalHeight,
        wallSegs,
        dAlpha
    );

    // 4. Dividing walls – moved OUTSIDE and extended to the center
    const wallLength = dim.moldOuterR + mc.moldWallThickness;
    const wallT = mc.moldWallThickness;
    // Wall A starts from -wallT to cover the origin junction
    const wallA = generateFlatWall(startAngle, wallLength + wallT, wallT, dim.totalHeight, 'right', -wallT);
    const wallB = generateFlatWall(endAngle, wallLength + wallT, wallT, dim.totalHeight, 'left', -wallT);

    // 5. Keys
    const keys = getKeysForQuadrant(quadrant, fc, mc);

    return { frameQuarter, base, outerWall, wallA, wallB, keys };
}

// ─── Export helper: combine into a single Group ──────────────────────────────

export function buildMoldQuadrantGroup(
    quadrant: 0 | 1 | 2 | 3,
    fc: FrameConfig,
    mc: MoldConfig,
    qualityMultiplier: number = 1,
): THREE.Group {
    const parts = getMoldQuadrantParts(quadrant, fc, mc, qualityMultiplier);
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial();

    group.add(new THREE.Mesh(parts.frameQuarter, mat));

    if (mc.showBase) {
        group.add(new THREE.Mesh(parts.base, mat));
    }

    group.add(new THREE.Mesh(parts.outerWall, mat));
    group.add(new THREE.Mesh(parts.wallA, mat));
    group.add(new THREE.Mesh(parts.wallB, mat));

    // Keys
    if (mc.showKeys) {
        const keyGeom = generateKeyHemisphere(mc.keyRadius);
        for (const k of parts.keys) {
            const mesh = new THREE.Mesh(keyGeom, mat);
            mesh.position.copy(k.position);
            // Orient hemisphere to face outward from wall
            const normalAngle = k.wallAngle + (k.isPositive ? 0 : Math.PI);
            mesh.rotation.set(0, 0, normalAngle);
            mesh.rotation.x = -Math.PI / 2;
            group.add(mesh);
        }
    }

    return group;
}
