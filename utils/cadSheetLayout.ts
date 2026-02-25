import { ViewProjection } from './cadProjection';
import { CadConfig } from '../types';

export const SHEET_SIZES: Record<string, { w: number; h: number }> = {
    A4: { w: 297, h: 210 },
    A3: { w: 420, h: 297 },
    A2: { w: 594, h: 420 },
};

export interface ViewPlacement {
    viewName: string;
    cx: number;
    cy: number;
    scale: number;
}

export function calculateSheetLayout(
    projections: ViewProjection[],
    config: CadConfig
): ViewPlacement[] {
    const sheet = SHEET_SIZES[config.sheetSize];
    const margin = 10;
    const dimPad = 25;
    const edgePad = 8;
    const sidePad = 12;
    const topDimHeadroom = 20;
    const labelSpace = 14;
    const verticalDimPad = 35; // Increased distance between horizontal rows.

    const bboxes: Record<string, { w: number; h: number }> = {};
    for (const proj of projections) {
        const bb = proj.boundingBox;
        bboxes[proj.viewName] = {
            w: Math.max(1, bb.maxX - bb.minX),
            h: Math.max(1, bb.maxY - bb.minY),
        };
    }

    const frontBB = bboxes.front ?? { w: 89, h: 89 };
    const rightBB = bboxes.right ?? { w: 89, h: 17 };
    const backBB = bboxes.back ?? { w: 89, h: 89 };
    const topBB = bboxes.top ?? { w: 89, h: 17 };
    const sectionAABB = bboxes['section-aa'] ?? { w: 89, h: 17 };
    const sectionBBBB = bboxes['section-bb'] ?? { w: 89, h: 17 };
    const isoBB = bboxes.iso ?? { w: 55, h: 40 };

    // Base relative layout: Move orthographic column further left to clear space for ISO/Title.
    const orthColumnWidth = sheet.w - (config.showTitleBlock ? 160 : 100);
    const frontCx = margin + (orthColumnWidth - margin) * 0.45;
    const frontCy = margin + dimPad + frontBB.h / 2;
    const rightCx = frontCx - frontBB.w / 2 - dimPad - rightBB.w / 2;
    const rightCy = frontCy;
    const backCx = frontCx + frontBB.w / 2 + dimPad + backBB.w / 2;
    const backCy = frontCy;

    const topCx = frontCx;
    const topCy = frontCy + frontBB.h / 2 + verticalDimPad + topBB.h / 2;

    const sectionCx = frontCx;
    const sectionAACy = topCy + topBB.h / 2 + verticalDimPad + sectionAABB.h / 2;
    const sectionBBCy = sectionAACy + sectionAABB.h / 2 + verticalDimPad + sectionBBBB.h / 2;

    const titleW = config.showTitleBlock ? 150 : 0;
    const rightColumnW = Math.max(titleW + 10, 110);
    const rightColumnLeft = sheet.w - margin - rightColumnW;
    const orthLimit = rightColumnLeft - 15; // Safe buffer before ISO column.

    const pos = new Map<string, ViewPlacement>();
    const setPos = (viewName: string, cx: number, cy: number, scale: number = config.scale) =>
        pos.set(viewName, { viewName, cx, cy, scale });

    setPos('front', frontCx, frontCy);
    setPos('right', rightCx, rightCy);
    setPos('back', backCx, backCy);
    setPos('top', topCx, topCy);
    setPos('section-aa', sectionCx, sectionAACy);
    setPos('section-bb', sectionCx, sectionBBCy);

    const isoViews = ['iso', 'iso-front'];
    let currentIsoYOffset = config.showTitleBlock ? 38 : 10;

    for (const isoName of isoViews) {
        if (bboxes[isoName]) {
            const bb = bboxes[isoName];
            const isoScale = config.scale;
            const isoHalfH = (bb.h * isoScale) / 2;
            const isoCx = rightColumnLeft + rightColumnW / 2;
            let isoCy = sheet.h - margin - currentIsoYOffset - labelSpace - isoHalfH;

            const minIsoCy = margin + edgePad + topDimHeadroom + isoHalfH;
            if (isoCy < minIsoCy) isoCy = minIsoCy;

            setPos(isoName, isoCx, isoCy, isoScale);
            currentIsoYOffset += (bb.h * isoScale) + labelSpace + 30; // Increased spacing.
        }
    }

    const orthViews = ['front', 'right', 'back', 'top', 'section-aa', 'section-bb', 'iso', 'iso-front'];
    let minLeft = Infinity;
    let maxRight = -Infinity;
    let minTop = Infinity;
    let maxBottom = -Infinity;

    for (const name of orthViews) {
        if (!pos.has(name) || !bboxes[name]) continue;
        const p = pos.get(name)!;
        const bb = bboxes[name];
        const halfW = (bb.w * p.scale) / 2;
        const halfH = (bb.h * p.scale) / 2;
        minLeft = Math.min(minLeft, p.cx - halfW - sidePad);
        maxRight = Math.max(maxRight, p.cx + halfW + sidePad);
        minTop = Math.min(minTop, p.cy - halfH - topDimHeadroom);
        maxBottom = Math.max(maxBottom, p.cy + halfH + labelSpace);
    }

    let shiftX = 0;
    let shiftY = 0;

    const rightLimit = orthLimit;
    if (maxRight > rightLimit) shiftX -= maxRight - rightLimit;
    if (minLeft + shiftX < margin + edgePad) shiftX += margin + edgePad - (minLeft + shiftX);

    if (minTop < margin + edgePad) shiftY += margin + edgePad - minTop;
    if (maxBottom + shiftY > sheet.h - margin - edgePad) {
        shiftY -= maxBottom + shiftY - (sheet.h - margin - edgePad);
    }

    if (shiftX !== 0 || shiftY !== 0) {
        for (const name of orthViews) {
            const p = pos.get(name);
            if (!p) continue;
            p.cx += shiftX;
            p.cy += shiftY;
        }
    }

    const placements: ViewPlacement[] = [];
    for (const proj of projections) {
        const p = pos.get(proj.viewName);
        if (p) placements.push(p);
    }

    return placements;
}
