import { Colors, DxfWriter, LineTypes, Units, point3d } from '@tarikjabiri/dxf';
import { ViewProjection } from './cadProjection';
import { DimensionLine, CenterLine } from './cadDimensions';
import { VIEW_NAMES_PL } from './cadSvgRenderer';

export interface DxfViewData {
    projection: ViewProjection;
    dimensions: DimensionLine[];
    centerlines: CenterLine[];
    cx: number;
    cy: number;
    scale: number;
}

/**
 * Generuje plik DXF z rzutami i wymiarami
 * Wykorzystuje warstwy systemowe do rozdziału obrysu, detali i linii ukrytych.
 */
export function renderDxfDrawing(viewData: DxfViewData[]): string {
    const d = new DxfWriter();
    d.setUnits(Units.Millimeters);

    // Standardowe warstwy CAD
    const OUTLINE = '01_OBRYS_GLOWNY';
    const DETAIL = '02_DETALE_ZAGIECIA';
    const HIDDEN = '03_LINIE_UKRYTE';
    const HATCH = '04_KRESKOWANIE';
    const AXIS = '05_OSIE';
    const DIMS = '06_WYMIARY';

    d.addLayer(OUTLINE, Colors.White, LineTypes.Continuous);
    d.addLayer(DETAIL, Colors.Cyan, LineTypes.Continuous);
    d.addLayer(HIDDEN, Colors.Red, 'DASHED');
    d.addLayer(HATCH, Colors.Magenta, LineTypes.Continuous);
    d.addLayer(AXIS, Colors.Yellow, 'DASHDOT');
    d.addLayer(DIMS, Colors.Green, LineTypes.Continuous);

    viewData.forEach((data) => {
        const { projection, dimensions, centerlines, cx, cy, scale } = data;

        // 1. Krawędzie z rzutu (Outline, Detail, Hidden)
        projection.segments.forEach(seg => {
            let layer = DETAIL;
            if (seg.category === 'outline') layer = OUTLINE;
            else if (seg.category === 'hidden') layer = HIDDEN;
            else if (seg.category === 'hatch') layer = HATCH;

            d.setCurrentLayerName(layer);
            // Uwaga: W DXF Y rośnie w górę, tak jak w naszym arkuszu 2D (Z rzutu mapujemy do Y DXF)
            d.addLine(
                point3d(cx + seg.x1 * scale, cy + seg.y1 * scale, 0),
                point3d(cx + seg.x2 * scale, cy + seg.y2 * scale, 0),
            );
        });

        // 2. Linie osi
        d.setCurrentLayerName(AXIS);
        centerlines.forEach(cl => {
            d.addLine(
                point3d(cx + cl.x1 * scale, cy + cl.y1 * scale, 0),
                point3d(cx + cl.x2 * scale, cy + cl.y2 * scale, 0),
            );
        });

        // 3. Wymiary
        d.setCurrentLayerName(DIMS);
        dimensions.forEach(dim => {
            const p1x = cx + dim.p1.x * scale;
            const p1y = cy + dim.p1.y * scale;
            const p2x = cx + dim.p2.x * scale;
            const p2y = cy + dim.p2.y * scale;

            if (dim.direction === 'horizontal') {
                const dy = cy + dim.p1.y * scale + dim.offset;
                d.addLine(point3d(p1x, p1y, 0), point3d(p1x, dy, 0));
                d.addLine(point3d(p2x, p2y, 0), point3d(p2x, dy, 0));
                d.addLine(point3d(p1x, dy, 0), point3d(p2x, dy, 0));
                d.addText(point3d((p1x + p2x) / 2, dy + 2, 0), 3.5, dim.label);
            } else {
                const dx = cx + dim.p1.x * scale + dim.offset;
                d.addLine(point3d(p1x, p1y, 0), point3d(dx, p1y, 0));
                d.addLine(point3d(p2x, p2y, 0), point3d(dx, p2y, 0));
                d.addLine(point3d(dx, p1y, 0), point3d(dx, p2y, 0));
                d.addText(point3d(dx - 3, (p1y + p2y) / 2, 0), 3.5, dim.label, { rotation: 90 });
            }
        });

        // 4. Etykieta widoku (pod widokiem)
        d.setCurrentLayerName(OUTLINE);
        const labelY = cy + projection.boundingBox.minY * scale - 10;
        const viewLabel = VIEW_NAMES_PL[projection.viewName] || projection.viewName.toUpperCase();
        d.addText(point3d(cx, labelY, 0), 5, viewLabel);
    });

    return d.stringify();
}
