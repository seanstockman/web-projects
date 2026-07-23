import {
    useState, useCallback, useEffect,
    type RefObject,
} from 'react';

import type { Point, Circle } from "../../lib/geometry/geometry2d.ts";
import { drawer, type LineDrawProperties, type CircleDrawProperties } from "./CanvasDrawer.tsx";
import { idleMode } from './draw_modes/idle.ts';
import type { CanvasDrawContext, DrawMode, SelectableDrawMode } from './draw_modes/types.ts';

export type OverlayLine = {
    points: Point[],
    props: LineDrawProperties
}

export type OverlayCircle = {
    circle: Circle,
    props: CircleDrawProperties
}

export type OverlayText = {
    text: string,
    position: Point,
    fontSize?: number,
    color?: string
}

export type DefaultCanvasProps = {
    pointProps: CircleDrawProperties,
    pointRadius: number,

    lineProps: LineDrawProperties,

    cursorProps: CircleDrawProperties,
    cursorRadius: number,

    /** Radius (px) within which a click will grab an existing point in Manipulate mode. */
    manipulateGrabRadius?: number,
}

function dist(a: Point, b: Point) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

export function useCanvasDraw(
    canvasRef: RefObject<HTMLCanvasElement | null>,
    defaultProps: DefaultCanvasProps,
    /** The tools this particular canvas offers — defines both behavior and,
     * via each mode's id/label/icon, what a toolbar for it would look like. */
    modes: SelectableDrawMode[],
) {
    const [drawMode, setDrawMode] = useState<DrawMode>(modes[0] ?? idleMode);
    const [cursor, setCursor] = useState<Point | null>(null);
    const [movedPoint, setMovedPoint] = useState<Point | null>(null);
    const [points, setPoints] = useState<Point[]>([]);
    const [lines, setLines] = useState<Point[][]>([]);
    const [overlayCircles, setOverlayCircles] = useState<OverlayCircle[]>([]);
    const [overlayLines, setOverlayLines] = useState<OverlayLine[]>([]);
    const [overlayTexts, setOverlayTexts] = useState<OverlayText[]>([]);

    const grabRadius = defaultProps.manipulateGrabRadius ?? Math.max(defaultProps.pointRadius, 8);

    const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }, [canvasRef]);

    const findNearestPoint = useCallback((mouse: Point): Point | null => {
        let closest: Point | null = null;
        let minDist = grabRadius;

        points.forEach((p) => {
            const d = dist(p, mouse);
            if (d < minDist) {
                closest = p;
                minDist = d;
            }
        });

        // lines.forEach((line, lineIndex) => {
        //     line.forEach((p, pointIndex) => {
        //         const d = dist(p, mouse);
        //         if (d < minDist) {
        //             closest = p;
        //             minDist = d;
        //         }
        //     });
        // });

        return closest;
    }, [points, lines, grabRadius]);

    // Built fresh every render — this is the one thing every mode method needs,
    // so it's the only thing that gets passed around now.
    const context: CanvasDrawContext = {
        points, setPoints,
        lines, setLines,
        cursor, setCursor,
        movedPoint, setMovedPoint,
        setDrawMode,
        findNearestPoint,
    };

    const clearCanvas = () => {
        setLines([]);
        setPoints([]);
    }

    const clearCanvasOverlays = () => {
        setOverlayCircles([]);
        setOverlayLines([]);
        setOverlayTexts([]);
    };

    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas == null) return;
        const ctx = canvas.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        lines.forEach(l => drawer.drawPolyline(ctx, l, defaultProps.lineProps));
        // lines.forEach(l => l.forEach(p => drawer.drawCircle(ctx, { center: p, radius: defaultProps.pointRadius }, defaultProps.pointProps)));
        points.forEach(p => drawer.drawCircle(ctx, { center: p, radius: defaultProps.pointRadius }, defaultProps.pointProps));

        overlayLines.forEach(l => drawer.drawPolyline(ctx, l.points, l.props));
        overlayCircles.forEach(c => drawer.drawCircle(ctx, c.circle, c.props));
        overlayTexts.forEach(t => drawer.drawText(ctx, t.text, t.position, t.fontSize, t.color));

        if (cursor != null) {
            drawer.drawCircle(ctx, { center: cursor, radius: defaultProps.cursorRadius }, defaultProps.cursorProps);
        }
    }, [canvasRef, cursor, lines, points, overlayLines, overlayCircles, overlayTexts, defaultProps]);

    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);

    useEffect(() => {
        setMovedPoint(null);
    }, [drawMode]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        drawMode.handleMouseMove?.(context, getMousePos(e));
    }, [drawMode, context, getMousePos]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        drawMode.handleMouseDown?.(context, getMousePos(e));
    }, [drawMode, context, getMousePos]);

    const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        drawMode.handleMouseUp?.(context, getMousePos(e));
    }, [drawMode, context, getMousePos]);

    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        drawMode.handleMouseLeave?.(context, getMousePos(e));
    }, [drawMode, context, getMousePos]);

    const handleRightClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        drawMode.handleRightClick?.(context, getMousePos(e));
    }, [drawMode, context, getMousePos]);

    return {
        drawMode, setDrawMode,
        modes,
        cursor,
        movedPoint,
        points, setPoints,
        lines, setLines,
        overlayCircles, setOverlayCircles,
        overlayLines, setOverlayLines,
        overlayTexts, setOverlayTexts,

        clearCanvas,
        clearCanvasOverlays,
        redrawCanvas,
        handleMouseMove,
        handleMouseDown,
        handleMouseUp,
        handleMouseLeave,
        handleRightClick,
    };
}