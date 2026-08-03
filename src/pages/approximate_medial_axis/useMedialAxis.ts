import { useState, useEffect, useCallback, type RefObject } from 'react';
import { useCanvasDraw, type DefaultCanvasProps, type OverlayCircle, type OverlayLine, type OverlayText } from '../../components/drawingCanvas/useCanvasDraw.tsx';
import type { SelectableDrawMode } from '../../components/drawingCanvas/draw_modes/types.ts';
import * as poly2tri from 'poly2tri';
import { geometry2d, type Point } from '../../lib/geometry/geometry2d.ts';
import { medialAxis } from './approximate_medial_axis.ts';
import type { TriangleGraph } from '../../lib/geometry/triangle_graph.ts';

const drawingColour = '#2768f5';

type CustomDrawBundle = {
    lines?: OverlayLine[],
    circles?: OverlayCircle[],
    texts?: OverlayText[]
}

const defaultCanvasProps: DefaultCanvasProps = {
    pointProps: { filled: true, borderWidth: 0, color: drawingColour },
    pointRadius: 3,
    lineProps: { width: 2, color: drawingColour, dashed: false },
    cursorProps: { filled: true, borderWidth: 0, color: '#ff0000d4' },
    cursorRadius: 1.5,
    manipulateGrabRadius: 15,
};


export function useMedialAxisDraw(canvasRef: RefObject<HTMLCanvasElement | null>, canvasModes: SelectableDrawMode[]) {
    const {
        drawMode, setDrawMode,
        points, setPoints,
        lines, setLines,
        movedPoint,
        clearCanvas, clearCanvasOverlays, redrawCanvas,
        handleMouseMove, handleMouseDown, handleMouseUp, handleMouseLeave, handleRightClick,
        setOverlayLines, setOverlayCircles, setOverlayTexts,
    } = useCanvasDraw(canvasRef, defaultCanvasProps, canvasModes);

    const wait = (ms: number): Promise<void> => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    };

    function setToRectExample() {
        clearCanvasOverlays();
        clearCanvas();
        setPoints([
            { x: 400, y: 500 },
            { x: 900, y: 500 },
            { x: 900, y: 300 },
            { x: 400, y: 300 },
        ]);
    }

    function getMedialAxis() {
        clearCanvasOverlays();
        // savedDelaunay = initialiseDelaunay(points, lines);
        // if (!savedDelaunay) return;
        // delaunay.delaunayTriangulation(savedDelaunay);

        var contour: poly2tri.Point[] = [];

        points.forEach(p => contour.push(new poly2tri.Point(p.x, p.y)));

        if (geometry2d.isCounterClockwise(contour)) contour.reverse();

        const sweepCtx = new poly2tri.SweepContext(contour);
        sweepCtx.triangulate();


        // sweepCtx.

        // console.log(sweepCtx);
        const tg: TriangleGraph = medialAxis.initialise(points, sweepCtx.getTriangles());
        showTriangleGraph(tg);
        // showDelaunaySwpctx(sweepCtx);
    }

    function addDrawBundleToCanvas(bundle: CustomDrawBundle) {
        if (bundle.lines) setOverlayLines(e => [...e, ...bundle.lines!]);
        if (bundle.circles) setOverlayCircles(e => [...e, ...bundle.circles!]);
        if (bundle.texts) setOverlayTexts(e => [...e, ...bundle.texts!]);
    }

    /** Appends all lines and points from the computed DelaunayGraph object to the canvas. */
    function showDelaunaySwpctx(sweepCtx: poly2tri.SweepContext) {
        var triangles = sweepCtx.getTriangles();
        const overlay: CustomDrawBundle = { lines: [], circles: [], texts: [] };
        triangles.forEach((t, i) => {
            var triPoints = t.getPoints();
            overlay.lines?.push({
                points: [...triPoints, triPoints[0]],
                props: {
                    width: 1,
                    color: `purple`,
                    dashed: false
                }
            });
            overlay.texts?.push({
                text: `T${i}`,
                position: geometry2d.getMeanOfPoints(triPoints[0], triPoints[1], triPoints[2]),
                color: 'black',
                fontSize: 12
            });
        });

        //     circles: d.points.map(p => ({
        //         circle: { center: p, radius: 2 },
        //         props: {
        //             filled: false,
        //             borderWidth: 1,
        //             color: `purple`,
        //         },
        //     })),
        //     texts: [
        //         ...d.points.map((p, i) => ({
        //             text: i.toString(),
        //             position: { x: p.x + 5, y: p.y - 5 },
        //             color: `black`,
        //             fontSize: 12,
        //         })),
        //         ...delaunayLines.map((l, i) => ({
        //             text: `E${i}`,
        //             position: geometry2d.getMidpoint(geometry2d.getMidpoint(l.points[0]!, l.points[1]!), l.points[0]!),
        //             color: drawingColour,
        //         }))
        //     ]
        // };

        addDrawBundleToCanvas(overlay);
    }

    function showTriangleGraph(tg: TriangleGraph) {
        // var triangles = sweepCtx.getTriangles();
        const overlay: CustomDrawBundle = { lines: [], circles: [], texts: [] };
        tg.triangles.forEach((tri, i) => {
            // var triPoints = t.getPoints();
            const triVerts = [tri[0], tri[1], tri[2]].map(i => tg.vertices[i]!);
            const triPoints: Point[] = triVerts.map(v => ({ x: v.x, y: v.y }));
            overlay.lines?.push({
                points: [...triPoints, triPoints[0]!],
                props: {
                    width: 1,
                    color: `purple`,
                    dashed: false
                }
            });
            overlay.texts?.push({
                text: `T${i}`,
                position: geometry2d.getMeanOfPoints(triPoints[0]!, triPoints[1]!, triPoints[2]!),
                color: 'black',
                fontSize: 12
            });
        });
        tg.vertices.forEach((v, i) => {
            overlay.texts?.push({
                text: `V${i}`,
                position: { x: v.x + 6, y: v.y - 8 }
            });
        });

        //     circles: d.points.map(p => ({
        //         circle: { center: p, radius: 2 },
        //         props: {
        //             filled: false,
        //             borderWidth: 1,
        //             color: `purple`,
        //         },
        //     })),
        //     texts: [
        //         ...d.points.map((p, i) => ({
        //             text: i.toString(),
        //             position: { x: p.x + 5, y: p.y - 5 },
        //             color: `black`,
        //             fontSize: 12,
        //         })),
        //         ...delaunayLines.map((l, i) => ({
        //             text: `E${i}`,
        //             position: geometry2d.getMidpoint(geometry2d.getMidpoint(l.points[0]!, l.points[1]!), l.points[0]!),
        //             color: drawingColour,
        //         }))
        //     ]
        // };

        addDrawBundleToCanvas(overlay);
    }

    return {
        redrawCanvas,
        handleMouseMove, handleMouseDown, handleMouseUp, handleMouseLeave, handleRightClick,
        drawMode, setDrawMode, clearCanvas, clearCanvasOverlays,
        getMedialAxis,
        setToRectExample
    };
}
