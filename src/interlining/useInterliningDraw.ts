// useInterlinerDraw.js
import { useState, useEffect, useCallback, type RefObject } from 'react';
import { drawer } from './Drawer.js';
import { Segment } from '../geometry/classes/segment.ts';
import { Line } from '../geometry/classes/line.ts';
import { Vector2 as Vec2, Vector2 } from '../geometry/classes/vector-2.ts';

export enum Mode {
    Manipulate,
    Draw,
    NewLine
};

export const Options = {
    SnapToGrid: "snapToGrid",
    ShowGrid: "showGrid"
}

export type DraggedPoint = {
    lineIndex: number,
    pointIndex: number
}

export function useInterlinerDraw(canvasRef: RefObject<HTMLCanvasElement>) {
    const [mode, setMode] = useState(Mode.Manipulate);
    const [lines, setLines] = useState<Line[]>([]);
    const [segmentMap, setSegmentMap] = useState<Map<string, Segment[]>>(new Map());
    const [origin, setOrigin] = useState<Vec2 | null>(null);
    const [gridSize, setGridSize] = useState(20);
    const [draggedPointIndex, setDraggedPoint] = useState<DraggedPoint | null>(null);
    const [radius, setRadius] = useState(20);
    const [currentColor, setCurrentColor] = useState("#ff6f2d");
    const [options, setOptions] = useState<string[]>([Options.SnapToGrid, Options.ShowGrid]);
    const [shiftHeld, setShiftHeld] = useState(false);

    const clickRadius = 6;
    const lineWidth = 8;

    // Track shift key
    useEffect(() => {
        const downHandler = (e: KeyboardEvent) => e.key === 'Shift' && setShiftHeld(true);
        const upHandler = (e: KeyboardEvent) => e.key === 'Shift' && setShiftHeld(false);

        window.addEventListener('keydown', downHandler);
        window.addEventListener('keyup', upHandler);

        return () => {
            window.removeEventListener('keydown', downHandler);
            window.removeEventListener('keyup', upHandler);
        };
    }, []);

    // disable grid snapping if grid not shown
    // useEffect(() => {
    //     if (!options.includes("showGrid") && options.includes("snapToGrid")) {

    //     }
    // }, [options]);

    const getMousePos = useCallback((e: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return Vec2.zero();
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouse = new Vec2(
            (e.clientX - rect.left) * scaleX,
            (e.clientY - rect.top) * scaleY
        );

        if (shiftHeld && draggedPointIndex && draggedPointIndex.pointIndex != 0) {
            const snapped = getSnappedAngledCursor(lines, draggedPointIndex, mouse);
            if (snapped) { mouse.updateXY(snapped.x, snapped.y); }
        }

        if (options.includes(Options.SnapToGrid)) {
            mouse.x = Math.round(mouse.x / gridSize) * gridSize;
            mouse.y = Math.round(mouse.y / gridSize) * gridSize;
        }

        // console.log(segmentMap);

        return mouse;
    }, [canvasRef, options, gridSize, shiftHeld, draggedPointIndex]);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        const mouse = getMousePos(e);
        switch (mode) {
            case Mode.NewLine: { // create new line
                setOrigin(null);
                const lineIdx = lines.length;
                setLines(prevLines => {
                    const newline: Line = new Line(
                        [mouse, mouse.clone()],
                        segmentMap,
                        currentColor);
                    return [...prevLines, newline];
                });
                setDraggedPoint({ lineIndex: lineIdx, pointIndex: 1 });
                setMode(Mode.Draw);
                break;
            }
            case Mode.Draw: { // update existing line; add segment
                if (!lines.length) break;
                const lastLineIdx = lines.length - 1;
                setLines(prevLines => {
                    const updated = [...prevLines];
                    const lastLine = updated[lastLineIdx];
                    if (!lastLine) return prevLines;
                    lastLine.points = [...lastLine.points, mouse];
                    const pointIdx = lastLine.points.length - 1;
                    setDraggedPoint({ lineIndex: lastLineIdx, pointIndex: pointIdx });
                    const lastPoint = lastLine.points.at(-1);
                    if (lastPoint) { Segment.addPoint(lastLine.segments, lastPoint); }
                    return updated;
                });
                break;
            }
            case Mode.Manipulate: {
                let closestPoint = null;
                let minDistance = Infinity;

                lines.forEach((line, lineIndex) => {
                    line.points.forEach((p, pointIndex) => {
                        const distance = Math.hypot(p.x - mouse.x, p.y - mouse.y);
                        if (distance < clickRadius && distance < minDistance) {
                            closestPoint = { lineIndex, pointIndex };
                            minDistance = distance;
                        }
                    });
                });

                setDraggedPoint(closestPoint);
                break;
            }
            default: break;
        }
    }, [Mode, currentColor, lines, getMousePos, mode]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        let mouse = getMousePos(e);

        switch (mode) {
            case Mode.Draw:
            case Mode.Manipulate: {
                if (!draggedPointIndex) return;
                const { lineIndex, pointIndex } = draggedPointIndex;
                setLines(prevLines => {
                    const updated = [...prevLines];
                    const updatedLine = updated[lineIndex];
                    if (!updatedLine) return prevLines;
                    const updatedPoint = updatedLine.points[pointIndex];
                    if (!updatedPoint) return prevLines;
                    updatedPoint.updateXY(mouse.x, mouse.y);
                    updatedLine.segments[pointIndex - 1]?.update();
                    updatedLine.segments[pointIndex]?.update();
                    // assume its the last point for now.
                    // updatedLine.segments.at(-1)!.update();
                    return updated;
                });
                break;
            }
            case Mode.NewLine:
                setOrigin(mouse);
                break;
            default:
                break;
        }
    }, [Mode, draggedPointIndex, getMousePos, mode]);

    const handleMouseUp = useCallback(() => {
        if (mode === Mode.Manipulate) setDraggedPoint(null);
    }, [mode]);

    const handleMouseLeave = useCallback(() => {
        if (mode === Mode.Manipulate) {
            setDraggedPoint(null);
        } else if (mode === Mode.NewLine) {
            setOrigin(null);
        }
    }, [mode]);

    const handleRightClick = useCallback((e: MouseEvent) => {
        e.preventDefault();
        if (mode === Mode.Draw && draggedPointIndex) {
            const { lineIndex, pointIndex } = draggedPointIndex;
            setLines(prevLines => {
                const updated = [...prevLines];
                const updatedLine = updated[lineIndex];
                if (!updatedLine) return prevLines;
                if (updatedLine.points.length <= 3) {
                    updated.splice(lineIndex, 1);
                } else {
                    updatedLine.points.splice(pointIndex - 1, 2);
                    updatedLine.segments[pointIndex - 2]?.pruneFromBucket();
                    updatedLine.segments[pointIndex - 1]?.pruneFromBucket();
                    updatedLine.segments.splice(pointIndex - 2, 2);
                }
                return updated;
            });
            setDraggedPoint(null);
            setOrigin(null);
            setMode(Mode.NewLine);
        }
    }, [Mode, draggedPointIndex, mode]);

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (options.includes(Options.ShowGrid)) drawer.drawGrid(ctx, canvas, gridSize);

        if (origin) drawer.drawCircle(ctx, origin, true, 0, lineWidth * 0.5, currentColor);

        if (lines.length == 0) {
            segmentMap.forEach((_value, key) => segmentMap.delete(key));
            return;
        }

        drawer.drawInterlinedLines(ctx, lines, radius, lineWidth);

        if (mode === Mode.Manipulate) {
            lines.forEach(line => {
                line.points.forEach(p => drawer.drawCircle(ctx, p, false, 2, clickRadius));
            });
        }
    }, [canvasRef, lines, origin, radius, currentColor, options, mode, gridSize]);

    return {
        Mode,
        mode, setMode,
        lines, setLines,
        origin, setOrigin,
        draggedPoint: draggedPointIndex, setDraggedPoint,
        radius, setRadius,
        currentColor, setCurrentColor,
        options, setOptions,
        gridSize, setGridSize,
        shiftHeld,

        getMousePos,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleMouseLeave,
        handleRightClick,

        drawCanvas,
    };
}

function getSnappedAngledCursor(lines: Line[], draggedPointIndex: DraggedPoint, mouse: Vector2): Vector2 | null {
    const l = lines[draggedPointIndex.lineIndex]?.points;
    if (!l) return null;
    const prev = l[draggedPointIndex.pointIndex - 1];
    if (!prev) return null;
    const offset = { x: mouse.x - prev.x, y: mouse.y - prev.y };
    const avgXY = (Math.abs(offset.x) + Math.abs(offset.y)) / 2;
    const isCursorToLeft = Math.sign(offset.x);
    // const cursorToLeft = Math.sign(offset.x);

    const snappedPoints: Vec2[] = [
        new Vec2(0, offset.y),
        new Vec2(offset.x, 0),
        new Vec2(isCursorToLeft * avgXY, avgXY),
        new Vec2(isCursorToLeft * avgXY, -avgXY),
    ];

    let closestPoint: Vec2 = Vec2.zero();
    let closestDist = Infinity;
    snappedPoints.forEach((p) => {
        const dist = Math.hypot(p.x - offset.x, p.y - offset.y);
        if (!closestPoint || dist < closestDist) {
            closestPoint = p;
            closestDist = dist;
        }
    });
    return new Vector2(closestPoint.x + prev.x, closestPoint.y + prev.y);
}