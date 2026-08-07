import { useState, useEffect, useCallback, type RefObject } from 'react';
import { useCanvasDraw, type DefaultCanvasProps, type OverlayCircle, type OverlayLine, type OverlayText } from '../../components/drawingCanvas/useCanvasDraw.tsx';
import type { SelectableDrawMode } from '../../components/drawingCanvas/draw_modes/types.ts';
import * as poly2tri from 'poly2tri';
import { geometry2d, type Vec2 } from '../../lib/geometry/geometry2d.ts';
import { medialAxis, type MedialAxis } from './approximate_medial_axis.ts';
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

let tg: TriangleGraph | undefined = undefined;


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
        setPointsAndLinesTo([
            { x: 400, y: 500 },
            { x: 900, y: 500 },
            { x: 900, y: 300 },
            { x: 400, y: 300 },
        ]);
    }

    function setToFig10Example() {
        clearCanvasOverlays();
        clearCanvas();
        setPointsAndLinesTo([
            { x: 380.2228250647914, y: 153.64437459688003 },
            { x: 296.6573690065955, y: 366.7362875452796 },
            { x: 643.4540116481085, y: 687.0705357683639 },
            { x: 736.7687709130939, y: 493.47722923354337 },
            { x: 1082.172655953637, y: 602.1123221091981 },
            { x: 1176.8801728195924, y: 391.8059243627384 },
            { x: 655.9888300568379, y: 270.63601307835427 },
        ]);
    }

    function setToObtuseExample() {
        clearCanvasOverlays();
        clearCanvas();
        setPointsAndLinesTo([
            { x: 625.8333206176758, y: 94.67012617323134 },
            { x: 1243.8888761732312, y: 525.2256817287869 },
            { x: 938.3333206176758, y: 421.05901506212024 },
            { x: 700.8333206176758, y: 290.50345950656464 },
            { x: 404.9999872843424, y: 572.447903951009 },
            { x: 186.9444317287869, y: 433.55901506212024 },
            { x: 175.83332061767578, y: 104.39234839545355 }
        ]);
    }

    function setPointsAndLinesTo(newPoints: Vec2[]) {
        setPoints(newPoints);
        setLines(newPoints.map((p, i) => [
            p, newPoints[(i + 1) % newPoints.length]!
        ]));
    }

    function initialiseCDTFromCanvasPoints() {
        console.log(points);
        tg = medialAxis.getConstrainedDelaunayTriangulation(points);
        showTriangleGraph(tg);
    }

    function addSteinerPoints() {
        if (!tg) { console.warn(`Triangle Graph is not defined. Have you ran Delaunay Triangulation first?`); return; }

        const polygonWithSteiner = medialAxis.getPolygonWithAddedSteinerPoints(tg);

        tg = medialAxis.getConstrainedDelaunayTriangulation(polygonWithSteiner);

        // addDrawBundleToCanvas({
        //     circles: [
        //         ...steinerVerts.map(v => ({
        //             circle: {
        //                 center: { x: v.x, y: v.y },
        //                 radius: 6
        //             },
        //             props: {
        //                 filled: true,
        //                 borderWidth: 0,
        //                 color: '#ff0000',
        //                 dashed: false
        //             }
        //         }))]
        // });
    }

    function flipRemainingConvex() {
        if (!tg) { console.warn(`Triangle Graph is not defined. Have you ran Delaunay Triangulation first?`); return; }
        medialAxis.flipRemainingConvexVertices(tg);
    }

    function constructMedialAxisFromTriangulation() {
        if (!tg) { console.warn(`Triangle Graph is not defined. Have you ran Delaunay Triangulation first?`); return; }
        // const ma = medialAxis.constructMedialAxis(tg);
        const ma = medialAxis.constructMedialAxis(tg, true); // debug mode
        if (!ma) { console.error(`no ma :(`); return; }
        console.log(ma);
        visualiseMedialAxis(ma);
        console.log(tg);
    }

    function visualiseMedialAxis(ma: MedialAxis) {
        addDrawBundleToCanvas({
            lines: ma.edges.map(e => ({
                points: [ma.points[e[0]]!, ma.points[e[1]]!],
                props: {
                    color: 'red',
                    width: 3,
                    dashed: false,
                }
            })),
            // circles: ma.points.map(p => ({
            //     circle: {center: p, radius: 10},
            //     props: {
            //         borderWidth: 0,
            //         color: 'orange',
            //         filled: true,
            //     }   
            // }))
        });
    }

    function checkForObtuse() {
        if (!tg) return;
        medialAxis.checkForObtuse(tg);
    }

    function getAndShowMedialAxis() {
        clearCanvasOverlays();
        const res = medialAxis.getApproximatedMedialAxis(points);
        if (!res) return;
        showTriangleGraph(res.tg);
        visualiseMedialAxis(res.ma);
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

    function showGraph() {
        if (!tg) { console.error(`tg not initialised`); return; }
        clearCanvasOverlays();
        showTriangleGraph(tg);
    }

    function showTriangleGraph(tg: TriangleGraph) {
        // var triangles = sweepCtx.getTriangles();
        const overlay: CustomDrawBundle = { lines: [], circles: [], texts: [] };
        tg.triangles.forEach((tri, i) => {
            // var triPoints = t.getPoints();
            const triVerts = [tri[0], tri[1], tri[2]].map(i => tg.vertices[i]!);
            const triPoints: Vec2[] = triVerts.map(v => ({ x: v.x, y: v.y }));
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
        initialiseCDTFromCanvasPoints, addSteinerPoints, flipRemainingConvex, constructMedialAxisFromTriangulation,
        getMedialAxis: getAndShowMedialAxis, checkForObtuse,
        setToRectExample, setToFig10Example, setToObtuseExample,
        showGraph
    };
}
