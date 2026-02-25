import { ViewProjection, LineSegment2D } from './cadProjection';
import { DimensionLine, CenterLine } from './cadDimensions';
import { CadConfig } from '../types';
import { SHEET_SIZES, ViewPlacement } from './cadSheetLayout';

export interface ViewLayout extends ViewPlacement {
    projection: ViewProjection;
    dimensions: DimensionLine[];
    centerlines: CenterLine[];
}

export const VIEW_NAMES_PL: Record<string, string> = {
    front: 'WIDOK Z PRZODU',
    right: 'WIDOK Z PRAWEJ',
    back: 'WIDOK Z TY\u0141U',
    top: 'WIDOK Z G\u00D3RY',
    'section-aa': 'PRZEKR\u00D3J A-A',
    'section-bb': 'PRZEKR\u00D3J B-B',
    iso: 'WIDOK IZOMETRYCZNY',
    'iso-front': 'WIDOK IZOMETRYCZNY 2',
};

export function renderSvgDrawing(layouts: ViewLayout[], config: CadConfig): string {
    const sheet = SHEET_SIZES[config.sheetSize];
    const margin = 10;

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sheet.w}mm" height="${sheet.h}mm" viewBox="0 0 ${sheet.w} ${sheet.h}" style="background: white;">
<defs>
  <marker id="arrow-start" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 10 0 L 0 5 L 10 10 Z" fill="black" /></marker>
  <marker id="arrow-end" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 Z" fill="black" /></marker>
  <style>
    .outline    { stroke: #000; stroke-width: 0.5; fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: none; }
    .detail     { stroke: #000; stroke-width: 0.25; fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: none; }
    .hidden     { stroke: #000; stroke-width: 0.15; fill: none; stroke-dasharray: 2,1.2; stroke-linecap: butt; vector-effect: non-scaling-stroke; }
    .hatch      { stroke: #000; stroke-width: 0.1; fill: none; stroke-linecap: butt; stroke-dasharray: none; }
    .centerline { stroke: #000; stroke-width: 0.2; fill: none; stroke-dasharray: 8,2,1,2; stroke-linecap: round; }
    .dimension  { stroke: #000; stroke-width: 0.2; fill: none; }
    .dim-line   { stroke: #000; stroke-width: 0.2; fill: none; marker-start: url(#arrow-start); marker-end: url(#arrow-end); }
    .dim-text   { font-family: 'ISOCPEUR', Arial, sans-serif; font-size: 3.5px; text-anchor: middle; fill: #000; }
    .view-label { font-family: 'ISOCPEUR', Arial, sans-serif; font-size: 4px; font-weight: bold; text-anchor: middle; fill: #000; text-transform: uppercase; }
    .section-marker { stroke: #000; stroke-width: 0.25; fill: none; stroke-dasharray: 3,2; stroke-opacity: 0.5; }
    .section-arrow  { stroke: #000; stroke-width: 0.3; fill: #000; }
    .section-label  { font-family: 'ISOCPEUR', Arial, sans-serif; font-size: 5px; font-weight: bold; text-anchor: middle; fill: #000; }
    .title-text { font-family: Arial, sans-serif; fill: #000; }
    .border     { stroke: #000; stroke-width: 0.7; fill: none; }
    .sheet-border { stroke: #ccc; stroke-width: 0.1; fill: none; }
  </style>
</defs>
<rect x="0" y="0" width="${sheet.w}" height="${sheet.h}" class="sheet-border"/>
<rect x="${margin}" y="${margin}" width="${sheet.w - 2 * margin}" height="${sheet.h - 2 * margin}" class="border"/>
`;

    for (const layout of layouts) {
        svg += renderViewGroup(layout);
    }

    const frontLayout = layouts.find((l) => l.projection.viewName === 'front');
    const hasAA = layouts.some((l) => l.projection.viewName === 'section-aa');
    const hasBB = layouts.some((l) => l.projection.viewName === 'section-bb');
    if (frontLayout) {
        if (hasAA) svg += renderSectionMarker(frontLayout, 'A', 'vertical');
        if (hasBB) svg += renderSectionMarker(frontLayout, 'B', 'horizontal');
    }

    if (config.showTitleBlock) {
        svg += renderTitleBlock(sheet, margin, config);
    }

    svg += '\n</svg>';
    return svg;
}

function renderViewGroup(layout: ViewLayout): string {
    const { projection, dimensions, centerlines, cx, cy, scale } = layout;
    const viewLabel = VIEW_NAMES_PL[projection.viewName] || projection.viewName.toUpperCase();
    let g = `\n  <g transform="translate(${cx}, ${cy}) scale(${scale}, -${scale})">\n`;

    g += `    <g class="centerline">\n`;
    centerlines.forEach((cl) => {
        g += `      <line x1="${cl.x1}" y1="${cl.y1}" x2="${cl.x2}" y2="${cl.y2}"/>\n`;
    });
    g += `    </g>\n`;

    const byCat: Record<string, LineSegment2D[]> = { hatch: [], outline: [], detail: [], hidden: [] };
    projection.segments.forEach((s) => byCat[s.category]?.push(s));

    for (const cat of ['hatch', 'hidden', 'detail', 'outline']) {
        if ((byCat[cat] || []).length === 0) continue;
        g += `    <g class="${cat}">\n`;
        (byCat[cat] || []).forEach((s) => {
            g += `      <line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}"/>\n`;
        });
        g += `    </g>\n`;
    }

    g += `  </g>\n`;
    g += renderDimensions(dimensions, cx, cy, scale);

    const svgBottom = cy - projection.boundingBox.minY * scale;
    g += `  <text x="${cx}" y="${svgBottom + 8}" class="view-label">${viewLabel}</text>\n`;
    return g;
}

function renderDimensions(dims: DimensionLine[], cx: number, cy: number, scale: number): string {
    let g = `  <g class="dimension-group">\n`;
    for (const dim of dims) {
        const sx = (v: number) => cx + v * scale;
        const sy = (v: number) => cy - v * scale;
        if (dim.direction === 'horizontal') {
            const yN = sy(dim.p1.y);
            const yD = yN + dim.offset;
            g += `    <line x1="${sx(dim.p1.x)}" y1="${yN}" x2="${sx(dim.p1.x)}" y2="${yD + (dim.offset > 0 ? 2 : -2)}" class="dimension"/>`;
            g += `    <line x1="${sx(dim.p2.x)}" y1="${yN}" x2="${sx(dim.p2.x)}" y2="${yD + (dim.offset > 0 ? 2 : -2)}" class="dimension"/>`;
            g += `    <line x1="${sx(dim.p1.x)}" y1="${yD}" x2="${sx(dim.p2.x)}" y2="${yD}" class="dim-line"/>`;
            g += `    <text x="${(sx(dim.p1.x) + sx(dim.p2.x)) / 2}" y="${yD - 1.5}" class="dim-text">${dim.label}</text>`;
        } else {
            const xN = sx(dim.p1.x);
            const xD = xN + dim.offset;
            g += `    <line x1="${xN}" y1="${sy(dim.p1.y)}" x2="${xD + (dim.offset > 0 ? 2 : -2)}" y2="${sy(dim.p1.y)}" class="dimension"/>`;
            g += `    <line x1="${xN}" y1="${sy(dim.p2.y)}" x2="${xD + (dim.offset > 0 ? 2 : -2)}" y2="${sy(dim.p2.y)}" class="dimension"/>`;
            g += `    <line x1="${xD}" y1="${sy(dim.p1.y)}" x2="${xD}" y2="${sy(dim.p2.y)}" class="dim-line"/>`;
            const ty = (sy(dim.p1.y) + sy(dim.p2.y)) / 2;
            g += `    <text x="${xD - 1.5}" y="${ty}" class="dim-text" transform="rotate(-90, ${xD - 1.5}, ${ty})">${dim.label}</text>`;
        }
    }
    return g + `  </g>\n`;
}

function renderTitleBlock(sheet: { w: number; h: number }, margin: number, config: CadConfig): string {
    const tb = config.titleBlock;
    const w = 150;
    const h = 30;
    const bx = sheet.w - margin - w;
    const by = sheet.h - margin - h;
    return `
  <g transform="translate(${bx}, ${by})">
    <rect x="0" y="0" width="${w}" height="${h}" class="border"/>
    <line x1="0" y1="10" x2="${w}" y2="10" class="border" style="stroke-width:0.3;"/>
    <line x1="0" y1="20" x2="${w}" y2="20" class="border" style="stroke-width:0.3;"/>
    <line x1="${w * 0.6}" y1="0" x2="${w * 0.6}" y2="${h}" class="border" style="stroke-width:0.3;"/>
    <text x="5" y="7" class="title-text" style="font-size:4px; font-weight:bold;">PROJEKT: ${tb.projectName}</text>
    <text x="5" y="17" class="title-text" style="font-size:3px;">NR RYS.: ${tb.drawingNumber}</text>
    <text x="5" y="27" class="title-text" style="font-size:3px;">MATERIA\u0141: ${tb.material}</text>
    <text x="${w * 0.6 + 5}" y="7" class="title-text" style="font-size:3px;">DATA: ${tb.date}</text>
    <text x="${w * 0.6 + 5}" y="17" class="title-text" style="font-size:3px;">SKALA: ${tb.scale}</text>
    <text x="${w * 0.6 + 5}" y="27" class="title-text" style="font-size:3px;">AUTOR: ${tb.author}</text>
    <g transform="translate(${w - 18}, 15) scale(0.5)">
      <line x1="-10" y1="0" x2="35" y2="0" class="centerline" style="stroke-width:0.25; stroke-dasharray:4,1,1,1;"/>
      <line x1="-2" y1="-8" x2="-2" y2="8" class="dimension" style="stroke-width:0.4;"/>
      <line x1="-2" y1="8" x2="12" y2="5" class="dimension" style="stroke-width:0.4;"/>
      <line x1="-2" y1="-8" x2="12" y2="-5" class="dimension" style="stroke-width:0.4;"/>
      <line x1="12" y1="-5" x2="12" y2="5" class="dimension" style="stroke-width:0.4;"/>
      <circle cx="22" cy="0" r="5" class="dimension" style="stroke-width:0.4;"/>
    </g>
  </g>
`;
}

function renderSectionMarker(layout: ViewLayout, label: string, orientation: 'vertical' | 'horizontal'): string {
    const { cx, cy, scale, projection } = layout;
    const bb = projection.boundingBox;
    const margin = 5;
    const stub = 8;

    let markerLines = '';
    let arrow1 = '';
    let arrow2 = '';
    let label1 = '';
    let label2 = '';

    if (orientation === 'vertical') {
        const x = cx;
        const top = cy - bb.maxY * scale - margin;
        const bottom = cy - bb.minY * scale + margin;

        markerLines = `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + stub}" class="section-marker"/>
<line x1="${x}" y1="${bottom - stub}" x2="${x}" y2="${bottom}" class="section-marker"/>`;
        arrow1 = `<path d="M ${x} ${top} l 4 2 l -4 2 Z" class="section-arrow"/>`;
        arrow2 = `<path d="M ${x} ${bottom} l 4 -2 l -4 -2 Z" class="section-arrow"/>`;
        label1 = `<text x="${x + 6}" y="${top + 2}" class="section-label">${label}</text>`;
        label2 = `<text x="${x + 6}" y="${bottom - 2}" class="section-label">${label}</text>`;
    } else {
        const y = cy;
        const left = cx + bb.minX * scale - margin;
        const right = cx + bb.maxX * scale + margin;

        markerLines = `<line x1="${left}" y1="${y}" x2="${left + stub}" y2="${y}" class="section-marker"/>
<line x1="${right - stub}" y1="${y}" x2="${right}" y2="${y}" class="section-marker"/>`;
        arrow1 = `<path d="M ${left} ${y} l 2 4 l 2 -4 Z" class="section-arrow"/>`;
        arrow2 = `<path d="M ${right} ${y} l -2 4 l -2 -4 Z" class="section-arrow"/>`;
        label1 = `<text x="${left + 2}" y="${y + 8}" class="section-label">${label}</text>`;
        label2 = `<text x="${right - 2}" y="${y + 8}" class="section-label">${label}</text>`;
    }

    return `
  <g class="section-line-group">
    ${markerLines}
    ${arrow1} ${arrow2}
    ${label1} ${label2}
  </g>
`;
}
