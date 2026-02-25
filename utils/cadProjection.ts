import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { FrameConfig } from '../types';
import { generateFrameGeometry, generateSolidHalfCone } from './geometry';

export type EdgeCategory = 'outline' | 'detail' | 'hidden' | 'hatch';

export interface LineSegment2D {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    category: EdgeCategory;
}

export interface ViewProjection {
    viewName: string;
    segments: LineSegment2D[];
    boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
}

interface ProjectionOptions {
    angleThreshold: number;
    includeHiddenLines: boolean;
    includeOutlines: boolean;
}

interface EdgeRecord {
    v1: THREE.Vector3;
    v2: THREE.Vector3;
    normals: THREE.Vector3[];
}

interface OcclusionContext {
    mesh: THREE.Mesh;
    raycaster: THREE.Raycaster;
    rayOrigin: THREE.Vector3;
    rayDirection: THREE.Vector3;
    samplePoint: THREE.Vector3;
    rayOriginY: number;
}

const VIEW_ROTATIONS: Record<string, THREE.Euler> = {
    front: new THREE.Euler(-Math.PI / 2, 0, 0),
    right: new THREE.Euler(0, 0, -Math.PI / 2),
    back: new THREE.Euler(Math.PI / 2, 0, Math.PI),
    top: new THREE.Euler(0, 0, 0),
    'section-aa': new THREE.Euler(0, 0, -Math.PI / 2),
    'section-bb': new THREE.Euler(0, 0, 0),
    iso: new THREE.Euler(-Math.PI / 6, Math.PI / 4, 0),
    'iso-front': new THREE.Euler(-Math.PI / 6, -Math.PI / 4, 0),
};

const SECTION_VIEWS = new Set(['section-aa', 'section-bb']);

// Enable accelerated BVH raycast once.
if (!(THREE.BufferGeometry.prototype as any).computeBoundsTree) {
    (THREE.BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree;
}
if (!(THREE.BufferGeometry.prototype as any).disposeBoundsTree) {
    (THREE.BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree;
}
if ((THREE.Mesh.prototype as any).raycast !== acceleratedRaycast) {
    (THREE.Mesh.prototype as any).raycast = acceleratedRaycast;
}

class EdgeClassifier {
    static QC_LEVEL = 0.7;
    static NOISE_FLOOR = 0.05;
    static HATCH_SPACING = 0.8;
    static OCCLUSION_EPS = 0.08;
    static SAMPLE_TS = [0.18, 0.5, 0.82];
    static EDGE_KEY_PRECISION = 3;

    static async process(
        rotatedGeometry: THREE.BufferGeometry,
        viewName: string,
        options: ProjectionOptions,
        clipY?: number,
        onProgress?: (msg: string) => void
    ): Promise<LineSegment2D[]> {
        const isSection = SECTION_VIEWS.has(viewName);
        const cutY = clipY ?? 0;

        onProgress?.(`${viewName}: analiza krawedzi...`);
        await yieldToUI();

        const geo = rotatedGeometry.toNonIndexed();
        const pos = geo.getAttribute('position') as THREE.BufferAttribute;
        const segments: LineSegment2D[] = [];
        const edgeMap = new Map<string, EdgeRecord>();
        const sectionEdges: LineSegment2D[] = [];
        const _e1 = new THREE.Vector3();
        const _e2 = new THREE.Vector3();
        const occlusion = isSection ? null : this.createOcclusionContext(rotatedGeometry);

        try {
            for (let i = 0; i < pos.count; i += 3) {
                const v1 = new THREE.Vector3().fromBufferAttribute(pos, i);
                const v2 = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
                const v3 = new THREE.Vector3().fromBufferAttribute(pos, i + 2);

                // Remove full triangles in front of section plane.
                if (isSection && v1.y > cutY + 0.001 && v2.y > cutY + 0.001 && v3.y > cutY + 0.001) {
                    continue;
                }

                if (isSection) {
                    const pts = this.trianglePlaneIntersection(v1, v2, v3, cutY);
                    if (pts.length === 2) {
                        sectionEdges.push({
                            x1: pts[0].x,
                            y1: pts[0].z,
                            x2: pts[1].x,
                            y2: pts[1].z,
                            category: 'outline',
                        });
                    }
                }

                const normal = new THREE.Vector3().crossVectors(
                    _e1.subVectors(v2, v1),
                    _e2.subVectors(v3, v1)
                ).normalize();

                // Triangles that straddle the cut plane must not contribute their
                // normal to below-cut edges.  Such a normal would pair with the
                // normal from the fully-below neighbour and make the shared edge
                // look like a silhouette (hasFront && hasBack), producing the
                // spurious thick lines visible at the section boundary.
                const straddlesCut = isSection && (
                    v1.y > cutY + 0.001 || v2.y > cutY + 0.001 || v3.y > cutY + 0.001
                );
                if (!straddlesCut) {
                    this.insertEdge(edgeMap, v1, v2, normal, cutY, isSection);
                    this.insertEdge(edgeMap, v2, v3, normal, cutY, isSection);
                    this.insertEdge(edgeMap, v3, v1, normal, cutY, isSection);
                }
            }

            const edges = Array.from(edgeMap.values());
            onProgress?.(`${viewName}: klasyfikacja ${edges.length} krawedzi...`);
            await yieldToUI();

            for (let i = 0; i < edges.length; i++) {
                if (i % 3000 === 0 && i > 0) {
                    onProgress?.(`${viewName}: ${Math.round((i / edges.length) * 100)}%`);
                    await yieldToUI();
                }

                const edge = edges[i];
                const dx = edge.v1.x - edge.v2.x;
                const dy = edge.v1.y - edge.v2.y;
                const dz = edge.v1.z - edge.v2.z;
                if (dx * dx + dy * dy + dz * dz < this.NOISE_FLOOR * this.NOISE_FLOOR) {
                    continue;
                }

                if (isSection && this.isOnCutPlane(edge.v1, edge.v2, cutY)) {
                    // Section contour is generated from triangle/plane intersections.
                    continue;
                }

                // In section views, boundary edges (single normal) are artifacts of the
                // cut — one of their two triangles was above the cut plane and discarded.
                // Only the triangle/plane intersection contour (sectionEdges) should
                // represent the section boundary. Suppress these false outlines.
                if (isSection && edge.normals.length === 1) {
                    continue;
                }

                const category = this.classifyEdge(edge, options.angleThreshold);
                if (category === null) {
                    continue;
                }

                if (isSection && category !== 'outline') {
                    // In section views, keep only true contours; suppress noisy detail edges.
                    continue;
                }

                if (isSection || !occlusion) {
                    if (category === 'outline' && !options.includeOutlines) continue;

                    // In section views, suppress edges whose projection falls inside the
                    // section contour (hatched solid area). These are real silhouette
                    // edges (cones, petals) that should not appear inside cut material.
                    if (isSection && sectionEdges.length > 0) {
                        const mx = (edge.v1.x + edge.v2.x) / 2;
                        const mz = (edge.v1.z + edge.v2.z) / 2;
                        if (this.isInsideSectionContour(mx, mz, sectionEdges)) {
                            continue;
                        }
                    }
                    segments.push({
                        x1: edge.v1.x,
                        y1: edge.v1.z,
                        x2: edge.v2.x,
                        y2: edge.v2.z,
                        category,
                    });
                    continue;
                }

                const visible = this.isEdgeVisible(edge.v1, edge.v2, occlusion);
                if (visible) {
                    if (category === 'outline' && !options.includeOutlines) continue;

                    segments.push({
                        x1: edge.v1.x,
                        y1: edge.v1.z,
                        x2: edge.v2.x,
                        y2: edge.v2.z,
                        category,
                    });
                } else if (options.includeHiddenLines) {
                    segments.push({
                        x1: edge.v1.x,
                        y1: edge.v1.z,
                        x2: edge.v2.x,
                        y2: edge.v2.z,
                        category: 'hidden',
                    });
                }
            }

            if (isSection && sectionEdges.length > 0) {
                segments.push(...sectionEdges);
                onProgress?.(`${viewName}: kreskowanie...`);
                await yieldToUI();
                segments.push(...this.generateHatching(sectionEdges));
            }

            const deduped = this.deduplicateHash(segments);
            const noHiddenConflicts = this.removeHiddenOverlaps(deduped);
            return this.collapseCategoryOverlaps(noHiddenConflicts);
        } finally {
            geo.dispose();
            this.disposeOcclusionContext(occlusion);
        }
    }

    private static classifyEdge(edge: EdgeRecord, angleThreshold: number): EdgeCategory | null {
        const normals = edge.normals;
        const eps = 1e-5;
        if (normals.length === 0) return null;
        if (normals.length === 1) {
            // True boundary edge — only visible if its face looks toward the camera.
            return normals[0].y >= -eps ? 'outline' : null;
        }

        const hasFront = normals.some((n) => n.y >= -eps);
        const hasBack = normals.some((n) => n.y < -eps);
        if (hasFront && hasBack) {
            return 'outline';
        }

        const dot = Math.max(-1, Math.min(1, normals[0].dot(normals[1])));
        const angle = THREE.MathUtils.radToDeg(Math.acos(dot));
        if (angle > angleThreshold) {
            return 'detail';
        }

        return null;
    }

    private static trianglePlaneIntersection(
        v1: THREE.Vector3,
        v2: THREE.Vector3,
        v3: THREE.Vector3,
        planeY: number
    ): THREE.Vector3[] {
        const verts = [v1, v2, v3];
        const pts: THREE.Vector3[] = [];
        const eps = 1e-8;

        for (let i = 0; i < 3; i++) {
            const a = verts[i];
            const b = verts[(i + 1) % 3];
            const da = a.y - planeY;
            const db = b.y - planeY;

            if ((da > eps && db < -eps) || (da < -eps && db > eps)) {
                const t = da / (da - db);
                pts.push(new THREE.Vector3(
                    a.x + t * (b.x - a.x),
                    planeY,
                    a.z + t * (b.z - a.z)
                ));
            } else if (Math.abs(da) < eps) {
                pts.push(a.clone());
            }
        }

        const unique: THREE.Vector3[] = [];
        for (const p of pts) {
            if (!unique.some((u) => u.distanceTo(p) < 1e-6)) {
                unique.push(p);
            }
        }
        return unique.length === 2 ? unique : [];
    }

    private static insertEdge(
        map: Map<string, EdgeRecord>,
        a: THREE.Vector3,
        b: THREE.Vector3,
        normal: THREE.Vector3,
        cutY: number,
        isSection: boolean
    ) {
        if (isSection) {
            const eps = 1e-3;
            // Do not clip edges to the section plane here: clipped fragments create false thick lines.
            // Keep only original edges fully behind the cutting plane. Section contour comes from
            // triangle/plane intersections (sectionEdges).
            if (a.y > cutY + eps || b.y > cutY + eps) return;
        }

        const p1 = a;
        const p2 = b;
        const k1 = `${p1.x.toFixed(this.EDGE_KEY_PRECISION)},${p1.y.toFixed(this.EDGE_KEY_PRECISION)},${p1.z.toFixed(this.EDGE_KEY_PRECISION)}`;
        const k2 = `${p2.x.toFixed(this.EDGE_KEY_PRECISION)},${p2.y.toFixed(this.EDGE_KEY_PRECISION)},${p2.z.toFixed(this.EDGE_KEY_PRECISION)}`;
        const key = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
        const existing = map.get(key);
        if (existing) {
            existing.normals.push(normal);
        } else {
            map.set(key, { v1: p1.clone(), v2: p2.clone(), normals: [normal] });
        }
    }

    private static isOnCutPlane(a: THREE.Vector3, b: THREE.Vector3, cutY: number): boolean {
        const eps = 1e-4;
        return Math.abs(a.y - cutY) < eps && Math.abs(b.y - cutY) < eps;
    }

    private static createOcclusionContext(rotatedGeometry: THREE.BufferGeometry): OcclusionContext {
        const source = rotatedGeometry.clone();
        source.computeBoundingBox();
        source.computeVertexNormals();
        (source as any).computeBoundsTree?.();

        const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(source, material);
        mesh.updateMatrixWorld(true);

        const raycaster = new THREE.Raycaster();
        (raycaster as any).firstHitOnly = false;

        const maxY = source.boundingBox?.max.y ?? 0;
        return {
            mesh,
            raycaster,
            rayOrigin: new THREE.Vector3(),
            rayDirection: new THREE.Vector3(0, -1, 0),
            samplePoint: new THREE.Vector3(),
            rayOriginY: maxY + 5,
        };
    }

    private static disposeOcclusionContext(ctx: OcclusionContext | null) {
        if (!ctx) return;
        const g = ctx.mesh.geometry as THREE.BufferGeometry & { disposeBoundsTree?: () => void };
        g.disposeBoundsTree?.();
        g.dispose();
        (ctx.mesh.material as THREE.Material).dispose();
    }

    private static isEdgeVisible(v1: THREE.Vector3, v2: THREE.Vector3, ctx: OcclusionContext): boolean {
        let visibleVotes = 0;
        let hiddenVotes = 0;

        for (const t of this.SAMPLE_TS) {
            ctx.samplePoint.lerpVectors(v1, v2, t);
            if (this.isPointVisible(ctx.samplePoint, ctx)) {
                visibleVotes++;
            } else {
                hiddenVotes++;
            }
        }

        return visibleVotes >= hiddenVotes;
    }

    private static isPointVisible(point: THREE.Vector3, ctx: OcclusionContext): boolean {
        ctx.rayOrigin.set(point.x, ctx.rayOriginY, point.z);
        ctx.raycaster.set(ctx.rayOrigin, ctx.rayDirection);
        const hits = ctx.raycaster.intersectObject(ctx.mesh, false);
        if (hits.length === 0) return true;

        const targetDistance = ctx.rayOriginY - point.y;

        for (const hit of hits) {
            const delta = Math.abs(hit.distance - targetDistance);
            if (delta <= this.OCCLUSION_EPS) {
                return true;
            }
            if (hit.distance < targetDistance - this.OCCLUSION_EPS) {
                return false;
            }
        }

        return true;
    }

    private static generateHatching(sectionEdges: LineSegment2D[]): LineSegment2D[] {
        if (sectionEdges.length === 0) return [];
        const hatches: LineSegment2D[] = [];
        const cos45 = Math.cos(Math.PI / 4);
        const sin45 = Math.sin(Math.PI / 4);

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const s of sectionEdges) {
            minX = Math.min(minX, s.x1, s.x2);
            maxX = Math.max(maxX, s.x1, s.x2);
            minY = Math.min(minY, s.y1, s.y2);
            maxY = Math.max(maxY, s.y1, s.y2);
        }

        const diag = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        for (let d = -diag / 2; d <= diag / 2; d += this.HATCH_SPACING) {
            const ox = cx + d * (-sin45);
            const oy = cy + d * cos45;
            const intersections: number[] = [];

            for (const seg of sectionEdges) {
                const t = this.raySegIntersect(ox, oy, cos45, sin45, seg.x1, seg.y1, seg.x2, seg.y2);
                if (t !== null && !intersections.some((it) => Math.abs(it - t) < 1e-4)) {
                    intersections.push(t);
                }
            }

            if (intersections.length < 2) continue;
            intersections.sort((a, b) => a - b);

            for (let i = 0; i + 1 < intersections.length; i += 2) {
                hatches.push({
                    x1: ox + cos45 * intersections[i],
                    y1: oy + sin45 * intersections[i],
                    x2: ox + cos45 * intersections[i + 1],
                    y2: oy + sin45 * intersections[i + 1],
                    category: 'hatch',
                });
            }
        }

        return hatches;
    }

    private static raySegIntersect(
        ox: number,
        oy: number,
        dx: number,
        dy: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ): number | null {
        const sx = x2 - x1;
        const sy = y2 - y1;
        const denom = dx * sy - dy * sx;
        if (Math.abs(denom) < 1e-10) return null;
        const u = ((x1 - ox) * dy - (y1 - oy) * dx) / denom;
        if (u < 0 || u > 1) return null;
        return ((x1 - ox) * sy - (y1 - oy) * sx) / denom;
    }

    /**
     * Ray-casting point-in-polygon test against the section contour.
     * Returns true if the point (x, y) is inside the polygon formed by sectionEdges.
     */
    private static isInsideSectionContour(x: number, y: number, contour: LineSegment2D[]): boolean {
        let crossings = 0;
        for (const seg of contour) {
            const t = this.raySegIntersect(x, y, 1, 0, seg.x1, seg.y1, seg.x2, seg.y2);
            if (t !== null && t > 0) {
                crossings++;
            }
        }
        return crossings % 2 === 1;
    }

    private static deduplicateHash(segs: LineSegment2D[]): LineSegment2D[] {
        const seen = new Set<string>();
        const result: LineSegment2D[] = [];
        for (const s of segs) {
            const k1 = `${s.x1.toFixed(3)},${s.y1.toFixed(3)}`;
            const k2 = `${s.x2.toFixed(3)},${s.y2.toFixed(3)}`;
            const key = k1 < k2 ? `${s.category}|${k1}|${k2}` : `${s.category}|${k2}|${k1}`;
            if (!seen.has(key)) {
                seen.add(key);
                result.push(s);
            }
        }
        return result;
    }

    private static removeHiddenOverlaps(segs: LineSegment2D[]): LineSegment2D[] {
        const solid = new Set<string>();
        for (const s of segs) {
            if (s.category === 'hidden' || s.category === 'hatch') continue;
            const k1 = `${s.x1.toFixed(3)},${s.y1.toFixed(3)}`;
            const k2 = `${s.x2.toFixed(3)},${s.y2.toFixed(3)}`;
            solid.add(k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`);
        }

        return segs.filter((s) => {
            if (s.category !== 'hidden') return true;
            const k1 = `${s.x1.toFixed(3)},${s.y1.toFixed(3)}`;
            const k2 = `${s.x2.toFixed(3)},${s.y2.toFixed(3)}`;
            const key = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
            return !solid.has(key);
        });
    }

    private static collapseCategoryOverlaps(segs: LineSegment2D[]): LineSegment2D[] {
        const priority: Record<EdgeCategory, number> = {
            outline: 4,
            detail: 3,
            hidden: 2,
            hatch: 1,
        };

        const chosen = new Map<string, LineSegment2D>();
        for (const s of segs) {
            const k1 = `${s.x1.toFixed(3)},${s.y1.toFixed(3)}`;
            const k2 = `${s.x2.toFixed(3)},${s.y2.toFixed(3)}`;
            const key = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;

            const prev = chosen.get(key);
            if (!prev || priority[s.category] > priority[prev.category]) {
                chosen.set(key, s);
            }
        }

        return Array.from(chosen.values());
    }
}

function yieldToUI(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

export function buildCompleteGeometry(config: FrameConfig, q: number = 3): THREE.BufferGeometry {
    const geoms = [
        generateFrameGeometry(config, q),
        ...(config.showBalls ? buildBalls(config) : []),
        ...(config.showCones ? buildCones(config) : []),
    ];
    const merged = mergeGeometries(geoms, false);
    geoms.forEach((g) => g.dispose());
    return merged;
}

function buildBalls(config: FrameConfig): THREE.BufferGeometry[] {
    const comp = 1 / (1 - config.shrinkagePercent / 100);
    const ball = new THREE.SphereGeometry(config.ballSize * comp, 16, 12);
    const rPos = (config.outerDiameter / 2 + config.ballRadialOffset) * comp;
    const res: THREE.BufferGeometry[] = [];

    for (let i = 0; i < config.petals; i++) {
        const theta = (i / config.petals) * Math.PI * 2;
        const c = ball.clone();
        c.translate(rPos * Math.cos(theta), rPos * Math.sin(theta), config.ballZOffset * comp);
        res.push(c);
    }
    ball.dispose();
    return res;
}

function buildCones(config: FrameConfig): THREE.BufferGeometry[] {
    const comp = 1 / (1 - config.shrinkagePercent / 100);
    const cone = generateSolidHalfCone(config.coneSize * comp, config.coneHeight * comp, 24);
    const rPos = (config.outerDiameter / 2 + config.coneRadialOffset) * comp;
    const res: THREE.BufferGeometry[] = [];

    for (let i = 0; i < config.petals; i++) {
        const theta = (i / config.petals) * Math.PI * 2;
        const c = cone.clone();
        const m = new THREE.Matrix4().makeBasis(
            new THREE.Vector3(-Math.sin(theta), Math.cos(theta), 0),
            new THREE.Vector3(Math.cos(theta), Math.sin(theta), 0),
            new THREE.Vector3(0, 0, 1)
        );
        c.applyMatrix4(m);
        c.translate(rPos * Math.cos(theta), rPos * Math.sin(theta), config.coneZOffset * comp);
        res.push(c);
    }
    cone.dispose();
    return res;
}

export async function projectView(
    geometry: THREE.BufferGeometry,
    viewName: string,
    options: ProjectionOptions,
    onProgress?: (msg: string) => void
): Promise<ViewProjection> {
    const rotated = geometry.clone();
    const rotation = VIEW_ROTATIONS[viewName] ?? VIEW_ROTATIONS.top;
    rotated.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rotation));
    if (viewName === 'right') {
        // Rotate right view by 90 deg around projection axis to align orientation with front notation.
        rotated.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    }

    rotated.computeBoundingBox();
    const center = new THREE.Vector3();
    rotated.boundingBox?.getCenter(center);

    const segments = await EdgeClassifier.process(rotated, viewName, options, center.y, onProgress);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const s of segments) {
        if (s.category === 'hatch') continue;
        if (s.x1 < minX) minX = s.x1;
        if (s.x2 < minX) minX = s.x2;
        if (s.y1 < minY) minY = s.y1;
        if (s.y2 < minY) minY = s.y2;
        if (s.x1 > maxX) maxX = s.x1;
        if (s.x2 > maxX) maxX = s.x2;
        if (s.y1 > maxY) maxY = s.y1;
        if (s.y2 > maxY) maxY = s.y2;
    }

    rotated.dispose();
    return { viewName, segments, boundingBox: { minX, minY, maxX, maxY } };
}

export async function generateAllProjections(
    config: FrameConfig,
    views: string[],
    angleThreshold: number,
    q: number,
    onProgress?: (msg: string) => void,
    includeHiddenLines: boolean = true,
    includeOutlines: boolean = true
): Promise<ViewProjection[]> {
    const geometry = buildCompleteGeometry(config, q > 0 ? q : EdgeClassifier.QC_LEVEL);
    const projections: ViewProjection[] = [];
    const options: ProjectionOptions = {
        angleThreshold: angleThreshold > 0 ? angleThreshold : 50,
        includeHiddenLines,
        includeOutlines,
    };

    const requestedViews = Array.from(new Set<string>([...views, 'iso', 'iso-front']));
    for (const view of requestedViews) {
        projections.push(await projectView(geometry, view, options, onProgress));
    }

    geometry.dispose();
    return projections;
}
