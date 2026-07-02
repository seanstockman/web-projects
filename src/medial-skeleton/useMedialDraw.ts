import { useState, useEffect, useCallback, type RefObject } from 'react';
import { Line } from '../geometry/classes/line.ts';
import { Segment } from '../geometry/classes/segment.ts';
import { Vector2 as Vec2, Vector2 } from '../geometry/classes/vector-2.ts';
import { drawer } from '../interlining/Drawer.tsx'
import { findCircumcircle } from '../geometry/point-geometry/point-geometry.ts';
import delauneyTriangulation from '../geometry/point-geometry/delauney-triangulation.ts';
import { Point } from '../geometry/classes/point.ts';

export enum Mode {
    Manipulate,
    Draw,
    NewLine
};

const snappingDistance = 10;
const victoryColour = '#7DF527';
const drawingColour = '#2768f5';

type customCircle = {
    centre: Vec2,
    radius: number,
    colour: string,
    filled: boolean,
    lineWidth: number,
}

export function useMedialDraw(canvasRef: RefObject<HTMLCanvasElement | null>) {
    const [mode, setMode] = useState(Mode.NewLine);
    const [cursor, setCursor] = useState<Vec2 | null>(null);
    const [movedPoint, setMovedPoint] = useState<Vec2 | null>(null);
    const [snapped, setSnapped] = useState(false);
    const [lines, setLines] = useState<Line[]>([]);
    const [overlayPoints, setOverlayPoints] = useState<customCircle[]>([]);
    const [overlayLines, setOverlayLines] = useState<Line[]>([]);

    useEffect(() => {
        if (lines.length == 0) return;
        lines[lines.length - 1]!.color = snapped ? victoryColour : drawingColour;
    }, [snapped]);

    const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return Vec2.zero();
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouse = new Vec2(
            (e.clientX - rect.left) * scaleX,
            (e.clientY - rect.top) * scaleY
        );

        return mouse;
    }, [canvasRef]);

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas == null) return;
        const ctx = canvas.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        lines.forEach(l => drawer.drawLine(ctx, l));
        overlayPoints.forEach(p => drawer.drawCircle(ctx, p.centre, p.filled, p.lineWidth, p.radius, p.colour));
        overlayLines.forEach(l => drawer.drawLine(ctx, l));
    
        if (cursor != null) {
            drawer.drawCircle(ctx, cursor, true, 0, 2, '#005effd4');
        }
    }, [canvasRef, getMousePos, cursor, movedPoint, mode, lines, overlayPoints])

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        let mouse = getMousePos(e);

        switch (mode) {
            case Mode.Draw:
            case Mode.Manipulate:
                // if (!movedPoint) return;
                const l = lines[lines.length - 1];
                const firstPoint = l!.points[0];
                if (firstPoint && l!.points.length > 2) {
                    if (firstPoint.distTo(mouse) < snappingDistance) {
                        mouse = firstPoint;
                        // mouse.updateXY(firstPoint.x, firstPoint.y);
                        setSnapped(true);
                    } else {
                        setSnapped(false);
                    }
                }

                l!.points[l!.points.length - 1] = mouse;
                setMovedPoint(mouse);
                break;
            //         const { lineIndex, pointIndex } = draggedPointIndex;
            //         setLines(prevLines => {
            //             const updated = [...prevLines];
            //             const updatedLine = updated[lineIndex];
            //             if (!updatedLine) return prevLines;
            //             const updatedPoint = updatedLine.points[pointIndex];
            //             if (!updatedPoint) return prevLines;
            //             updatedPoint.updateXY(mouse.x, mouse.y);
            //             updatedLine.segments[pointIndex - 1]?.update();
            //             updatedLine.segments[pointIndex]?.update();
            //             // assume its the last point for now.
            //             // updatedLine.segments.at(-1)!.update();
            //             return updated;
            //         });
            //         break;
            //     }
            case Mode.NewLine:
                setCursor(mouse);
                break;
            default:
                break;
        }
    }, [mode, getMousePos, movedPoint]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const mouse = getMousePos(e);
        switch (mode) {
            case Mode.NewLine: { // create new line
                setCursor(null);
                const newPoint = mouse;
                const newline: Line = new Line(
                    [mouse.clone(), mouse], null, drawingColour);
                setLines(prevLines => {
                    return [...prevLines, newline];
                });
                setMovedPoint(newPoint);
                setMode(Mode.Draw);
                break;
            }
            case Mode.Draw: {
                if (!lines.length) break;
                if (snapped) {
                    setMode(Mode.NewLine);
                    setSnapped(false);
                    return;
                }
                const l = lines[lines.length - 1];
                const mouse = getMousePos(e);
                l!.points = [...l!.points, mouse];
                setMovedPoint(mouse);
                break;
            }
            // case Mode.Draw: { // update existing line; add segment
            //     if (!lines.length) break;
            //     const lastLineIdx = lines.length - 1;
            //     setLines(prevLines => {
            //         const updated = [...prevLines];
            //         const lastLine = updated[lastLineIdx];
            //         if (!lastLine) return prevLines;
            //         lastLine.points = [...lastLine.points, mouse];
            //         const pointIdx = lastLine.points.length - 1;
            //         setDraggedPoint({ lineIndex: lastLineIdx, pointIndex: pointIdx });
            //         const lastPoint = lastLine.points.at(-1);
            //         if (lastPoint) { Segment.addPoint(lastLine.segments, lastPoint); }
            //         return updated;
            //     });
            //     break;
            // }
            // case Mode.Manipulate: {
            //     let closestPoint = null;
            //     let minDistance = Infinity;

            //     lines.forEach((line, lineIndex) => {
            //         line.points.forEach((p, pointIndex) => {
            //             const distance = Math.hypot(p.x - mouse.x, p.y - mouse.y);
            //             if (distance < clickRadius && distance < minDistance) {
            //                 closestPoint = { lineIndex, pointIndex };
            //                 minDistance = distance;
            //             }
            //         });
            //     });

            //     setDraggedPoint(closestPoint);
            //     break;
            // }
            default: break;
        }
    }, [mode, getMousePos, movedPoint]);

    function showCircumcircle() {
        if (lines.length < 1) { console.error('lines length < 1'); return null; }
        const l = lines[lines.length - 1];
        if (!l?.points.length) { console.error('l.p.len not found'); return null };
        if (l.points.length < 3) { console.error('l.p.len != 3'); console.log(l); return null; }
        setOverlayPoints(extraPoints => {
            const c = findCircumcircle(l.points);
            if (c) {
                const outline: customCircle = {
                    centre: c.center,
                    radius: c.radius,
                    colour: "#272727",
                    filled: false,
                    lineWidth: 1
                }
                const centre: customCircle = {
                    centre: c.center,
                    radius: 1,
                    colour: "#272727",
                    filled: true,
                    lineWidth: 0
                }
                return [...extraPoints, outline, centre]
            }
            console.error('find failure');
            return extraPoints;
        });
    }

    function showDelaunay() {
        if (lines.length == 0) return;
        const l = lines[lines.length - 1];
        if (!l?.points.length) { console.error('l.p.len not found'); return null };
        if (l.points.length < 3) { console.error('l.p.len != 3'); console.log(l); return null; }
        const points = l.points.map(v => new Point(v.x, v.y));
        const d = delauneyTriangulation(points);
        setOverlayLines(e => [
            ...e,
            new Line([d?.points[0]!, d?.points[1]!], null, '#fd2222'),
            new Line([d?.points[1]!, d?.points[2]!], null, '#9e22fd', 2, true),
            new Line([d?.points[2]!, d?.points[0]!], null, '#9e22fd', 2, true),
        ]);
        setOverlayPoints(e => [
            ...e,
            ...(d?.points?.slice(0,2).map(p => ({
                centre: p,         // p becomes the centre
                radius: 2,        // Shared property
                colour: 'red',     // Shared property
                filled: false,      // Shared property
                lineWidth: 1       // Shared property
            })) ?? [])
        ]);
    }

    return {
        drawCanvas,
        handleMouseMove,
        handleMouseDown,
        setLines, setMode, setOverlayPoints, setOverlayLines,
        showCircumcircle, showDelaunay
    };
}