import { FrameConfig } from '../types';

export interface DimensionLine {
    type: 'linear' | 'diameter' | 'radius' | 'angular';
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    offset: number;
    value: number;
    label: string;
    direction: 'horizontal' | 'vertical';
}

export interface CenterLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    type: 'axis' | 'center-mark';
}

export function generateDimensions(
    viewName: string,
    config: FrameConfig,
    boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
): DimensionLine[] {
    const dims: DimensionLine[] = [];
    const comp = 1 / (1 - config.shrinkagePercent / 100);

    const outerD = config.outerDiameter;
    const innerD = config.innerHoleDiameter;
    const totalH = config.height + config.reliefHeight * config.reliefHeightRatio;

    const outerRComp = (outerD / 2) * comp;
    const innerRComp = (innerD / 2) * comp;
    const heightComp = totalH * comp;
    const topRefY = Math.max(boundingBox.maxY, heightComp);

    if (viewName === 'front' || viewName === 'back') {
        dims.push({
            type: 'linear',
            direction: 'horizontal',
            p1: { x: -outerRComp, y: 0 },
            p2: { x: outerRComp, y: 0 },
            offset: -10,
            value: outerD,
            label: `\u2300${outerD}`,
        });

        dims.push({
            type: 'linear',
            direction: 'horizontal',
            p1: { x: -innerRComp, y: 0 },
            p2: { x: innerRComp, y: 0 },
            offset: -18,
            value: innerD,
            label: `\u2300${innerD}`,
        });

        if (viewName === 'front') {
            dims.push({
                type: 'linear',
                direction: 'vertical',
                p1: { x: outerRComp, y: -outerRComp },
                p2: { x: outerRComp, y: outerRComp },
                offset: 10,
                value: outerD,
                label: `\u2300${outerD}`,
            });
        }
    }

    if (viewName === 'top' || viewName === 'section-aa' || viewName === 'section-bb') {
        // Keep side/section horizontal dimensions above geometry so they do not overlap outlines.
        dims.push({
            type: 'linear',
            direction: 'horizontal',
            p1: { x: -outerRComp, y: topRefY },
            p2: { x: outerRComp, y: topRefY },
            offset: -8,
            value: outerD,
            label: `\u2300${outerD}`,
        });
    }

    if (viewName === 'right') {
        // Right view is additionally rotated by 90deg in projection, so dimensions must rotate too.
        dims.push({
            type: 'linear',
            direction: 'horizontal',
            p1: { x: boundingBox.minX, y: boundingBox.maxY },
            p2: { x: boundingBox.maxX, y: boundingBox.maxY },
            offset: -8,
            value: totalH,
            label: `${totalH.toFixed(1)}`,
        });

        dims.push({
            type: 'linear',
            direction: 'vertical',
            p1: { x: boundingBox.maxX, y: -outerRComp },
            p2: { x: boundingBox.maxX, y: outerRComp },
            offset: 10,
            value: outerD,
            label: `\u2300${outerD}`,
        });
    }

    if (viewName === 'section-aa') {
        dims.push({
            type: 'linear',
            direction: 'vertical',
            p1: { x: outerRComp, y: 0 },
            p2: { x: outerRComp, y: heightComp },
            offset: 10,
            value: totalH,
            label: `${totalH.toFixed(1)}`,
        });
    }

    if (viewName === 'top' || viewName === 'section-bb') {
        dims.push({
            type: 'linear',
            direction: 'vertical',
            p1: { x: -outerRComp, y: 0 },
            p2: { x: -outerRComp, y: heightComp },
            offset: -10,
            value: totalH,
            label: `${totalH.toFixed(1)}`,
        });
    }

    return dims;
}

export function generateCenterlines(
    viewName: string,
    boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
): CenterLine[] {
    if (viewName === 'iso') {
        return [];
    }

    const lines: CenterLine[] = [];
    const ext = 5;

    lines.push({
        x1: 0,
        y1: boundingBox.minY - ext,
        x2: 0,
        y2: boundingBox.maxY + ext,
        type: 'axis',
    });

    if (viewName === 'front' || viewName === 'back') {
        lines.push({
            x1: boundingBox.minX - ext,
            y1: 0,
            x2: boundingBox.maxX + ext,
            y2: 0,
            type: 'axis',
        });
    }

    return lines;
}
