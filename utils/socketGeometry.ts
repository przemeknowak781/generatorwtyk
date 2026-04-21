import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { FrameConfig, SocketConfig } from '../types';

// ─── Normative SCHUKO (CEE 7/3) dimensions — see schuko.md ──────────────────
const SCHUKO = {
  flangeOuterDia: 45.0,    // Ø 45 mm  — outer flange (kołnierz)
  recessDia: 35.0,         // Ø 35 mm  — internal well (wnęka)
  recessDepth: 17.5,       // mm      — well depth from flange mouth
  pinHoleDia: 5.0,         // Ø 5 mm  — pin hole
  pinSpacing: 19.0,        // mm      — axis-to-axis distance
  pinHoleDepth: 20.0,      // mm      — ≥ pin length (19 mm)
  screwHoleDia: 3.5,       // Ø 3.5 mm — central mounting hole (M3 clearance)
  peChannelWidth: 7.5,     // mm      — PE clip channel (tangential)
  backBodyDepth: 14.0,     // mm      — rear body below faceplate
  faceplateThickness: 2.5, // mm      — faceplate thickness
};

const csgEval = new Evaluator();

// Cylinder geometry with axis along +Z, centered at origin on XY, bottom at z=0, top at z=h.
const cyl = (r: number, h: number, segs: number): THREE.BufferGeometry => {
  const g = new THREE.CylinderGeometry(r, r, h, segs, 1, false);
  g.rotateX(Math.PI / 2);   // axis Y → axis Z
  g.translate(0, 0, h / 2); // base at z=0
  return g;
};

// Lathe geometry with profile points (r, z) revolved around the +Z axis.
// Caller must ensure first and last profile points have r = 0 to produce a closed solid.
const latheZ = (profile: THREE.Vector2[], segs: number): THREE.BufferGeometry => {
  // three.js LatheGeometry revolves a (x=r, y=z) profile around the Y axis.
  // We want revolution around Z, so rotate by 90° around X afterwards.
  const g = new THREE.LatheGeometry(profile, segs);
  g.rotateX(Math.PI / 2);
  return g;
};

// Box centered at origin, aligned to axes.
const box = (sx: number, sy: number, sz: number): THREE.BufferGeometry =>
  new THREE.BoxGeometry(sx, sy, sz);

export interface SchukoGeometry {
  body: THREE.BufferGeometry;         // ceramic part (single manifold mesh)
  layout: {
    stepZ: number;                    // frame Z where faceplate base sits
    flangeTopZ: number;               // local Z of flange top
  };
}

export const generateSchukoSocketGeometry = (
  fc: FrameConfig,
  sc: SocketConfig,
  qualityMultiplier: number = 1,
): SchukoGeometry => {
  const comp = 1 / (1 - fc.shrinkagePercent / 100);
  const segs = Math.max(128, Math.floor(160 * qualityMultiplier));
  const holeSegs = Math.max(48, Math.floor(64 * qualityMultiplier));

  // Normative radii (compensated for shrinkage)
  const flangeR = (SCHUKO.flangeOuterDia / 2) * comp;
  const recessR = (SCHUKO.recessDia / 2) * comp;
  const pinR = (SCHUKO.pinHoleDia / 2) * comp;
  const pinGap = (SCHUKO.pinSpacing / 2) * comp;
  const recessD = SCHUKO.recessDepth * comp;
  const flangeH = Math.max(1, sc.flangeHeight) * comp;
  const faceplateT = SCHUKO.faceplateThickness * comp;
  const backDepth = SCHUKO.backBodyDepth * comp;

  // Faceplate fits inside frame's step, back body fits through the inner hole.
  const stepR = (fc.stepDiameter / 2) * comp;
  const faceplateR = Math.max(flangeR + 1, stepR - sc.faceplateClearance * comp);
  const innerR = (fc.innerHoleDiameter / 2) * comp;
  const backR = Math.max(recessR + 2, innerR - 1.0 * comp);

  // ─── Local coord system ────────────────────────────────────────────────────
  //  Z=0                              faceplate BOTTOM surface (on frame step)
  //  Z ∈ [0, faceplateT]              faceplate disc
  //  Z ∈ [faceplateT, flangeTopZ]     flange ring
  //  Z ∈ [-backDepth, 0]              rear body (fits through frame inner hole)
  //  Recess bottom at Z = flangeTopZ − recessD  (inside rear body)

  const flangeBottomZ = faceplateT;
  const flangeTopZ = faceplateT + flangeH;
  const recessBottomZ = flangeTopZ - recessD;

  // ─── Lathe profile for ceramic body (single manifold) ──────────────────────
  // The profile defines the full cross-section including the recess cavity,
  // so the recess wall + floor are baked into the geometry (no separate CSG
  // recess cut needed). Two curved transitions:
  //   - Outer dome: quarter ellipse from faceplate outer up to the dome peak.
  //     Vertical tangent at start (continues faceplate cylinder), horizontal
  //     at peak (matches inner fillet).
  //   - Inner fillet: quarter circle rolling over the peak inward and down
  //     to the recess wall. Horizontal tangent at top, vertical at bottom
  //     (continues the recess wall).
  const innerFilletR = Math.min(
    1.2 * comp,
    flangeH * 0.45,
    (faceplateR - recessR) * 0.35,
  );
  const domePeakR = recessR + innerFilletR;
  const arcRadial = faceplateR - domePeakR;
  const arcHeight = flangeH;

  // Small edge fillet applied to every sharp 90° corner in the profile
  // (back-outer bottom, back→faceplate step, faceplate outer top, recess
  // wall→floor). Keeps transitions soft and removes hard lines visible
  // in raking light.
  const edgeR = Math.min(0.4 * comp, backR * 0.3, recessR * 0.3);
  const edgeSegs = Math.max(8, Math.floor(10 * qualityMultiplier));

  // Generates a quarter-arc (90°) from θ_start to θ_end around (cx, cz).
  // Sign of (θ_end − θ_start) controls direction.
  const pushArc = (cx: number, cz: number, r: number, t0: number, t1: number) => {
    for (let i = 1; i <= edgeSegs; i++) {
      const u = i / edgeSegs;
      const th = t0 + u * (t1 - t0);
      profile.push(new THREE.Vector2(cx + r * Math.cos(th), cz + r * Math.sin(th)));
    }
  };

  const profile: THREE.Vector2[] = [];

  // 1. Bottom center (on axis)
  profile.push(new THREE.Vector2(0, -backDepth));

  // 2. Along the bottom face, stop short of the outer-bottom corner A
  profile.push(new THREE.Vector2(backR - edgeR, -backDepth));

  // Fillet A — convex corner at (backR, -backDepth). Arc θ: −π/2 → 0 (CCW).
  pushArc(backR - edgeR, -backDepth + edgeR, edgeR, -Math.PI / 2, 0);

  // 3. Up the rear body outer wall, stop short of the top corner B
  profile.push(new THREE.Vector2(backR, -edgeR));

  // Fillet B — concave corner at (backR, 0). Arc θ: π → π/2 (CW).
  pushArc(backR + edgeR, -edgeR, edgeR, Math.PI, Math.PI / 2);

  // 4. Step out along the faceplate underside, stop short of corner C
  profile.push(new THREE.Vector2(faceplateR - edgeR, 0));

  // Fillet C — convex corner at (faceplateR, 0). Arc θ: −π/2 → 0 (CCW).
  pushArc(faceplateR - edgeR, edgeR, edgeR, -Math.PI / 2, 0);

  // 5. Up the faceplate outer side to the dome base
  profile.push(new THREE.Vector2(faceplateR, flangeBottomZ));

  // 6. Outer quarter-elliptical dome → (domePeakR, flangeTopZ)
  const domeSegs = Math.max(32, Math.floor(48 * qualityMultiplier));
  for (let i = 1; i <= domeSegs; i++) {
    const t = i / domeSegs;
    const theta = t * (Math.PI / 2);
    profile.push(new THREE.Vector2(
      domePeakR + arcRadial * Math.cos(theta),
      flangeBottomZ + arcHeight * Math.sin(theta),
    ));
  }

  // 7. Inner fillet (mouth of the recess)
  const innerFilletCenterR = domePeakR;
  const innerFilletCenterZ = flangeTopZ - innerFilletR;
  const innerSegs = Math.max(16, Math.floor(20 * qualityMultiplier));
  for (let i = 1; i <= innerSegs; i++) {
    const t = i / innerSegs;
    const phi = Math.PI / 2 + t * (Math.PI / 2);
    profile.push(new THREE.Vector2(
      innerFilletCenterR + innerFilletR * Math.cos(phi),
      innerFilletCenterZ + innerFilletR * Math.sin(phi),
    ));
  }

  // 8. Down the recess wall, stop short of corner F (wall→floor)
  profile.push(new THREE.Vector2(recessR, recessBottomZ + edgeR));

  // Fillet F — concave corner at (recessR, recessBottomZ). Arc θ: 0 → −π/2 (CW).
  pushArc(recessR - edgeR, recessBottomZ + edgeR, edgeR, 0, -Math.PI / 2);

  // 9. Across the recess floor to the axis
  profile.push(new THREE.Vector2(0, recessBottomZ));

  const bodyLathe = latheZ(profile, segs);
  bodyLathe.computeVertexNormals();

  let solid = new Brush(bodyLathe);
  solid.updateMatrixWorld(true);

  // ─── Subtract pin holes (Ø5 at ±9.5, along X axis) ─────────────────────────
  // Each hole starts just above the recess floor and exits through the back face.
  const pinTopZ = recessBottomZ + 0.1;
  const pinLen = SCHUKO.pinHoleDepth * comp + 1.0;
  for (const sign of [-1, 1]) {
    const h = cyl(pinR, pinLen, holeSegs);
    h.translate(sign * pinGap, 0, pinTopZ - pinLen);
    const b = new Brush(h);
    b.updateMatrixWorld(true);
    solid = csgEval.evaluate(solid, b, SUBTRACTION);
  }

  // ─── Subtract central screw hole (M3 clearance) ────────────────────────────
  // Runs along the Z axis — from just above the recess floor, through the
  // floor and rear body, out the back face.
  {
    const screwR = (SCHUKO.screwHoleDia / 2) * comp;
    const screwTopZ = recessBottomZ + 0.2;
    const screwBotZ = -backDepth - 0.3;
    const screwLen = screwTopZ - screwBotZ;
    const sh = cyl(screwR, screwLen, holeSegs);
    sh.translate(0, 0, screwBotZ);
    const b = new Brush(sh);
    b.updateMatrixWorld(true);
    solid = csgEval.evaluate(solid, b, SUBTRACTION);
  }

  // ─── PE clip channels (only BELOW the flange) ─────────────────────────────
  // Flange ring stays completely intact (no slots visible from above). The PE
  // clip slides in from the back face, rides through the rear body + faceplate
  // at Y=±17.5, and its bent tip emerges into the recess through the wall.
  //
  // The cut has a rounded top (half-circle cap in the tangential-vertical
  // plane), so the window seen from inside the recess is tombstone-shaped:
  // flat bottom, straight vertical sides, arched top.
  const peW = SCHUKO.peChannelWidth * comp;                // 7.5 mm tangential
  const peInnerY = recessR - 1.0 * comp;                   // breaches recess wall
  const peOuterY = faceplateR + 0.5 * comp;                // out to faceplate outer
  const peRad = peOuterY - peInnerY;
  const peCenterY = (peInnerY + peOuterY) / 2;
  const peBotZ = -backDepth - 0.3;
  const peTopZ = flangeBottomZ + 1.0 * comp;  // reach ~1 mm up into the flange base
  const capR = peW / 2;                                    // rounded cap radius
  const rectH = (peTopZ - peBotZ) - capR;                  // straight-walled portion
  const capCenterZ = peBotZ + rectH;                       // meets top of rect
  const capLen = peRad + 0.4;                              // slight overshoot

  // Rounded-rectangle extrusion for the straight portion — rounds all 4
  // corners on the back-face plane (XY), so the hole seen from behind has
  // a soft, filleted rectangle outline instead of sharp 90° corners.
  const backCornerR = Math.min(1.5 * comp, peW * 0.3, peRad * 0.3);
  const rectShape = new THREE.Shape();
  {
    const hw = peW / 2;
    const hr = peRad / 2;
    const r = backCornerR;
    rectShape.moveTo(-hw + r, -hr);
    rectShape.lineTo(hw - r, -hr);
    rectShape.absarc(hw - r, -hr + r, r, -Math.PI / 2, 0, false);
    rectShape.lineTo(hw, hr - r);
    rectShape.absarc(hw - r, hr - r, r, 0, Math.PI / 2, false);
    rectShape.lineTo(-hw + r, hr);
    rectShape.absarc(-hw + r, hr - r, r, Math.PI / 2, Math.PI, false);
    rectShape.lineTo(-hw, -hr + r);
    rectShape.absarc(-hw + r, -hr + r, r, Math.PI, 3 * Math.PI / 2, false);
  }
  const rectExtrudeSettings = { depth: rectH, bevelEnabled: false, curveSegments: 10 };

  for (const sign of [-1, 1]) {
    // Straight-walled portion with rounded back-face corners
    const rect = new THREE.ExtrudeGeometry(rectShape, rectExtrudeSettings);
    // ExtrudeGeometry: shape in XY plane, extrusion along +Z from 0 to depth.
    rect.translate(0, sign * peCenterY, peBotZ);
    const rb = new Brush(rect);
    rb.updateMatrixWorld(true);
    solid = csgEval.evaluate(solid, rb, SUBTRACTION);

    // Half-cylinder cap (axis along Y = radial) — arches the top in X-Z plane.
    // Upper half supplies the tombstone arch visible inside the recess wall.
    const cap = new THREE.CylinderGeometry(capR, capR, capLen, holeSegs, 1, false);
    cap.translate(0, sign * peCenterY, capCenterZ);
    const cb = new Brush(cap);
    cb.updateMatrixWorld(true);
    solid = csgEval.evaluate(solid, cb, SUBTRACTION);
  }

  const bodyGeometry = solid.geometry.clone();
  bodyGeometry.computeVertexNormals();

  // Cleanup intermediates (inputs to CSG; output is cloned).
  bodyLathe.dispose();

  const stepZ = fc.seatingRingDepth * comp;

  return {
    body: bodyGeometry,
    layout: { stepZ, flangeTopZ },
  };
};
