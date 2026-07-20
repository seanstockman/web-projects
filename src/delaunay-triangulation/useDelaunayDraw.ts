import { useState, useEffect, useCallback, type RefObject } from 'react';
import { Line } from '../geometry/classes/line.ts';
import { Segment } from '../geometry/classes/segment.ts';
import { Vector2 as Vec2, Vector2 } from '../geometry/classes/vector-2.ts';
import { drawer } from '../interlining/Drawer.tsx'
import { geometry2d } from '../geometry/point-geometry/geometry2d.ts';
import { Point } from '../geometry/classes/point.ts';
import { delaunay, type DelaunayGraph } from '../geometry/point-geometry/delaunay-triangulation.ts';
import { halfEdgeTriangular } from '../geometry/point-geometry/halfedge.ts';

export enum Mode {
    Manipulate,
    Draw,
    NewLine
};

const snappingDistance = 10;
const victoryColour = '#7DF527';
const drawingColour = '#2768f5';

type CustomCircle = {
    centre: Vec2,
    radius: number,
    colour: string,
    filled: boolean,
    lineWidth: number,
    text: string | null,
    textPosition: Vec2,
}

type CustomLine = {
    line: Line,
    text: string | null
}

type CustomDrawBundle = {
    lines: CustomLine[],
    circles: CustomCircle[],
}

let savedDelaunay: DelaunayGraph | undefined = undefined;


export function useDelaunayDraw(canvasRef: RefObject<HTMLCanvasElement | null>) {
    const [mode, setMode] = useState(Mode.NewLine);
    const [cursor, setCursor] = useState<Vec2 | null>(null);
    const [movedPoint, setMovedPoint] = useState<Vec2 | null>(null);
    const [snapped, setSnapped] = useState(false);
    const [lines, setLines] = useState<Line[]>([]);
    const [overlayPoints, setOverlayPoints] = useState<CustomCircle[]>([]);
    const [overlayLines, setOverlayLines] = useState<CustomLine[]>([]);

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

        // lines.forEach(l => drawer.drawLine(ctx, l));
        drawer.drawLinesStartOnly(ctx, lines);

        overlayLines.forEach(l => drawer.drawLine(ctx, l.line));
        overlayPoints.forEach(p => drawer.drawCircle(ctx, p.centre, p.filled, p.lineWidth, p.radius, p.colour));

        overlayLines.forEach(l => {
            if (!l.text) return;
            const pos = geometry2d.getMidpoint(l.line.points[0]!, geometry2d.getMidpoint(l.line.points[0]!, l.line.points[1]!));
            // pos.x -= 5;
            // pos.x += 5;
            drawer.drawText(ctx,
                l.text,
                pos,
                { x: 0, y: 0 },
                20
            )
        });

        overlayPoints.forEach(p => { if (p.text) drawer.drawText(ctx, p.text, p.textPosition!, { x: 0, y: 0 }, 20) });


        if (cursor != null) {
            drawer.drawCircle(ctx, cursor, true, 0, 4, '#005effd4');
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

    const wait = (ms: number): Promise<void> => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    };


    async function runDelaunayTimelapse(deltaMs: number) {
        setOverlayPoints([]);
        setOverlayLines([]);
        savedDelaunay = initialiseDelaunay();
        if (!savedDelaunay) return;
        delaunay.delaunayTriangulation(savedDelaunay);
        // halfEdgeTriangular.traverse(savedDelaunay.graph, 0, savedDelaunay.count - 1);

        addDrawBundleToCanvas(extractFacesFromDelaunay(savedDelaunay, true));
        addDrawBundleToCanvas(traverseDelaunay(savedDelaunay, 0, savedDelaunay.count - 1));

        showDelaunay(savedDelaunay);
    }

    function iterateDelaunay() {
        if (savedDelaunay?.finished) return;

        setOverlayLines([]);
        setOverlayPoints([]);

        if (savedDelaunay == undefined) {
            console.log(`~~~~~~~~~~~~~~ initialising ~~~~~~~~~~~~~~`);
            savedDelaunay = initialiseDelaunay();
            if (savedDelaunay) showDelaunay(savedDelaunay);
            return;
        } else if (savedDelaunay.current >= savedDelaunay.count) {
            console.log(`~~~~~~~~~~~~~~ finalising ~~~~~~~~~~~~~~`);
            addDrawBundleToCanvas(finaliseDelaunay(savedDelaunay));

            addDrawBundleToCanvas(traverseDelaunay(savedDelaunay, 0, savedDelaunay.count - 1));

            console.log(`~~~~~~~~~~~~~~ final result  ~~~~~~~~~~~~~~`);
            console.log(savedDelaunay);
            showDelaunay(savedDelaunay);
            return;
        }

        console.log(`~~~~~~~~~~~~~~ new iteration ~~~~~~~~~~~~~~`);
        const ccs = delaunay.iterate(savedDelaunay!);

        if (!ccs) return; // end of iterations (?)

        // display explored circumcircles
        setOverlayPoints(e => [...e, ...ccs.map(c => ({
            centre: new Vec2(c.circle.centre.x, c.circle.centre.y),
            radius: c.circle.radius,
            colour: c.legal ? '#00ff8c' : '#ff0000',
            filled: false,
            lineWidth: 1,
            text: null,
            textPosition: new Vec2(c.circle.centre.x, c.circle.centre.y)
        }))]);

        setOverlayLines(e => [...e, ...ccs.filter(c => c.removedLine != null).map(c => ({
            line: new Line(
                [savedDelaunay!.points[c.removedLine![0]!]!, savedDelaunay!.points[c.removedLine![1]!]!],
                null,
                '#ff0000',
                1,
                true
            ),
            text: null
        }))])

        showDelaunay(savedDelaunay);
    }

    function initialiseDelaunay() {
        if (lines.length == 0) return undefined;
        const l = lines[lines.length - 1];
        if (!l?.points.length) { console.error('l.p.len not found'); return undefined };
        if (l.points.length < 4) { console.error('l.p.len != 3'); console.log(l); return undefined; }
        const points = l.points.map(v => new Point(v.x, v.y));
        points.splice(points.length - 1, 1);
        return delaunay.initialise(points);
    }

    function finaliseDelaunay(d: DelaunayGraph): CustomDrawBundle {
        delaunay.finalise(d);
        return extractFacesFromDelaunay(d);
    }

    function extractFacesFromDelaunay(d: DelaunayGraph, hideCircumCircles: boolean = false) : CustomDrawBundle {
        const ccs = delaunay.getFacesAsCircumcircles(d);
        const result: CustomDrawBundle = { circles: [], lines: [] };

        result.circles = ccs.circles.map((c, i) => ({
            centre: new Vec2(c.centre.x, c.centre.y),
            radius: hideCircumCircles ? 0 : c.radius,
            colour: '#009a15',
            filled: false,
            lineWidth: hideCircumCircles ? 0 : 0.2,
            text: `F` + i.toString(),
            textPosition: new Vec2(ccs.centrepoints[i]!.x, ccs.centrepoints[i]!.y),
        }));
        d.finished = true;
        return result;
    }

    function traverseDelaunay(d: DelaunayGraph, origin: number, target: number): CustomDrawBundle {
        const result: CustomDrawBundle = { lines: [], circles: [] };
        console.log(`~~~~~~~~~~~~~~   traversing  ~~~~~~~~~~~~~~`);
        const traversedFaces = halfEdgeTriangular.traverse(d.graph, origin, target);
        console.log(`traversed faces:`);
        console.log(traversedFaces);

        result.lines = [
            {
                line: new Line(
                    [new Vec2(d.points[origin]!.x, d.points[origin]!.y),
                    new Vec2(d.points[target]!.x, d.points[target]!.y)],
                    null,
                    `orange`,
                    3,
                    true
                ),
                text: null
            }
        ];
        return result;
    }

    function addDrawBundleToCanvas(bundle: CustomDrawBundle) {
        setOverlayLines(e => [...e, ...bundle.lines]);
        setOverlayPoints(e => [...e, ...bundle.circles]);
    }

    function binDelaunay() {
        savedDelaunay = undefined;
    }

    /** Appends all lines and points from the computed DelaunayGraph object to the canvas. */
    function showDelaunay(d: DelaunayGraph) {
        setOverlayLines(e => [
            ...e,
            ...delaunay.getResultToLines(d, drawingColour, "#9e22fd").map((l, i) => ({ line: l, text: `E` + i.toString() }))
        ]);

        setOverlayPoints(e => [
            ...e,
            ...(d.points.map((p, index) => ({ //?.slice(0,2)
                centre: p,
                radius: 2,
                colour: '#9e22fd',
                filled: false,
                lineWidth: 1,
                text: index >= d!.count ? (-index - 1 + d.count).toString() : index.toString(),
                textPosition: new Vec2(p.x + 5, p.y - 5)
            })) ?? [])
        ]);
    }

    return {
        drawCanvas,
        handleMouseMove,
        handleMouseDown,
        setLines, setMode, setOverlayPoints, setOverlayLines,
        iterateDelaunay, runDelaunayTimelapse,
        binDelaunay
    };
}
