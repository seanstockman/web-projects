// useInterlinerDraw.js
import { useState, useEffect, useCallback, type RefObject } from 'react';
import { drawer, lineMaths } from './Drawer.js';
import { Vector2 } from "three";

export enum Mode {
    Manipulate,
    Draw,
    NewLine
};

export const Options = {
    SnapToGrid: "snapToGrid",
}

export type Point = {
    x: number,
    y: number
}

export type Segment = {
    start: Vector2,
    end: Vector2,
    dir: Vector2,
    len: number,
    x0: number, // intersection with the x axis (x,0)
    xIntAngleDegrees: number // angle between [0, 180) degrees. 0 is left/right, 90 is left/right
}

export type ArcLine = {
    segments: Segment[],
    line: Point[],
    color: string
}

export type DraggedPoint = {
    lineIndex: number,
    pointIndex: number
}

export function useInterlinerDraw(canvasRef: RefObject<HTMLCanvasElement>) {
    const [mode, setMode] = useState(Mode.Manipulate);
    const [lines, setLines] = useState<ArcLine[]>([]);
    const [origin, setOrigin] = useState<Point | null>(null);
    const [gridSize, setGridSize] = useState(20);
    const [draggedPointIndex, setDraggedPoint] = useState<DraggedPoint | null>(null);
    const [radius, setRadius] = useState(20);
    const [currentColor, setCurrentColor] = useState("#ff6f2d");
    const [options, setOptions] = useState<string[]>([]);
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
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleY;

        if (shiftHeld && draggedPointIndex && draggedPointIndex.pointIndex != 0) {
            const snapped = getSnappedAngledCursor(lines, draggedPointIndex, { x: x, y: y });
            if (snapped) {
                x = snapped.x;
                y = snapped.y;
            }
        }

        if (options.includes(Options.SnapToGrid)) {
            x = Math.round(x / gridSize) * gridSize;
            y = Math.round(y / gridSize) * gridSize;
        }

        return {
            x: x,
            y: y,
        };
    }, [canvasRef, options, gridSize, shiftHeld, draggedPointIndex]);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        const mouse = getMousePos(e);
        switch (mode) {
            case Mode.NewLine: {
                setOrigin(null);
                const lineIdx = lines.length;
                setLines(prevLines => {
                    const newline: ArcLine = { line: [mouse, mouse], color: currentColor, segments: [] };
                    newline.segments = lineMaths.getSegments(newline.line);
                    return [...prevLines, newline];
                });
                setDraggedPoint({ lineIndex: lineIdx, pointIndex: 1 });
                setMode(Mode.Draw);
                break;
            }
            case Mode.Draw: {
                if (!lines.length) break;
                const lastLineIdx = lines.length - 1;
                setLines(prevLines => {
                    const updated = [...prevLines];
                    const lastLine = updated[lastLineIdx];
                    if (!lastLine) return prevLines;
                    lastLine.line = [...lastLine.line, mouse];
                    const pointIdx = lastLine.line.length - 1;
                    setDraggedPoint({ lineIndex: lastLineIdx, pointIndex: pointIdx });
                    lastLine.segments = lineMaths.getSegments(lastLine.line)
                    return updated;
                });
                break;
            }
            case Mode.Manipulate: {
                let closestPoint = null;
                let minDistance = Infinity;

                lines.forEach((line, lineIndex) => {
                    line.line.forEach((p, pointIndex) => {
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
                    updatedLine.line[pointIndex] = { x: mouse.x, y: mouse.y };
                    updatedLine.segments = lineMaths.getSegments(updatedLine.line);
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
                if (updatedLine.line.length <= 3) {
                    updated.splice(lineIndex, 1);
                } else {
                    updatedLine.line.splice(pointIndex - 1, 2);
                    updatedLine.segments = lineMaths.getSegments(updatedLine.line);
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

        if (options.includes('showGrid')) drawer.drawGrid(ctx, canvas, gridSize);

        drawer.drawInterlinedLines(ctx, lines, radius, lineWidth);

        if (origin) drawer.drawCircle(ctx, origin, true, 0, lineWidth * 0.5, currentColor);

        if (mode === Mode.Manipulate) {
            lines.forEach(line => {
                line.line.forEach(p => drawer.drawCircle(ctx, p, false, 2, clickRadius));
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

function getSnappedAngledCursor(lines: ArcLine[], draggedPointIndex: DraggedPoint, mouse: Point): Point | null {
    const l = lines[draggedPointIndex.lineIndex]?.line;
    if (!l) return null;
    const prev = l[draggedPointIndex.pointIndex - 1];
    if (!prev) return null;
    const offset = { x: mouse.x - prev.x, y: mouse.y - prev.y };
    const avgXY = (Math.abs(offset.x) + Math.abs(offset.y)) / 2;
    const cursorToLeft = Math.sign(offset.x);
    // const cursorToLeft = Math.sign(offset.x);

    const snappedPoints: Point[] = [
        { x: 0, y: offset.y },
        { x: offset.x, y: 0 },
        { x: cursorToLeft * avgXY, y: avgXY },
        { x: cursorToLeft * avgXY, y: -avgXY },
    ];

    let closestPoint: Point = { x: 0, y: 0 };
    let closestDist = Infinity;
    snappedPoints.forEach((p) => {
        const dist = Math.hypot(p.x - offset.x, p.y - offset.y);
        if (!closestPoint || dist < closestDist) {
            closestPoint = p;
            closestDist = dist;
        }
    });
    return { x: closestPoint.x + prev.x, y: closestPoint.y + prev.y };
}