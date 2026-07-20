import { useState, useEffect, useCallback, type RefObject } from 'react';
import { drawer } from '../components/drawingCanvas/CanvasDrawer.tsx';
import { geometry2d } from '../lib/geometry/geometry2d.ts';
import { delaunay, type DelaunayGraph } from '../lib/geometry/delaunay-triangulation.ts';
import { halfEdgeTriangular } from '../lib/geometry/halfedge.ts';
import { useCanvasDraw, type DefaultCanvasProps, type OverlayCircle, type OverlayLine, type OverlayText } from '../components/drawingCanvas/useCanvasDraw.tsx';
import { polygonStartMode } from '../components/drawingCanvas/draw_modes/polygonTool.ts';
import { manipulateMode } from '../components/drawingCanvas/draw_modes/manipulate.ts';
import { pointDrawMode } from '../components/drawingCanvas/draw_modes/pointDraw.ts';
import { lineStartMode } from '../components/drawingCanvas/draw_modes/lineTool.ts';
import type { SelectableDrawMode } from '../components/drawingCanvas/draw_modes/types.ts';

const drawingColour = '#2768f5';
const legalColour = `lime`;
const illegalColour = '#ff0000';

type CustomDrawBundle = {
    lines?: OverlayLine[],
    circles?: OverlayCircle[],
    texts?: OverlayText[]
}

let savedDelaunay: DelaunayGraph | undefined = undefined;

const defaultCanvasProps: DefaultCanvasProps = {
    pointProps: { filled: true, borderWidth: 0, color: drawingColour },
    pointRadius: 3,
    lineProps: { width: 2, color: drawingColour, dashed: false },
    cursorProps: { filled: true, borderWidth: 0, color: '#ff0000d4' },
    cursorRadius: 3,
    manipulateGrabRadius: 15,
};


export function useDelaunayDraw(canvasRef: RefObject<HTMLCanvasElement | null>, canvasModes: SelectableDrawMode[]) {
    const {
        drawMode, setDrawMode,
        points, setPoints,
        lines, setLines,
        clearCanvas, clearCanvasOverlays, redrawCanvas,
        handleMouseMove, handleMouseDown, handleMouseUp, handleMouseLeave, handleRightClick,
        setOverlayLines, setOverlayCircles, setOverlayTexts,
    } = useCanvasDraw(canvasRef, defaultCanvasProps, canvasModes);


    const wait = (ms: number): Promise<void> => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    };

    async function runDelaunayTimelapse(deltaMs: number) {
        clearCanvasOverlays();
        savedDelaunay = initialiseDelaunay();
        if (!savedDelaunay) return;
        showDelaunay(savedDelaunay);
        await wait(deltaMs);

        for (let i = 0; i <= savedDelaunay.count; i++) {
            iterateDelaunay();
            await wait(deltaMs);
        }

        // if (!savedDelaunay) return;
        // delaunay.delaunayTriangulation(savedDelaunay);
        // // halfEdgeTriangular.traverse(savedDelaunay.graph, 0, savedDelaunay.count - 1);

        // addDrawBundleToCanvas(extractFacesFromDelaunay(savedDelaunay, true));
        // addDrawBundleToCanvas(traverseDelaunay(savedDelaunay, 0, savedDelaunay.count - 1));

        // showDelaunay(savedDelaunay);
    }

    function fullDelaunayTriangulation() {
        clearCanvasOverlays();
        savedDelaunay = initialiseDelaunay();
        if (!savedDelaunay) return;
        delaunay.delaunayTriangulation(savedDelaunay);

        addDrawBundleToCanvas(extractFacesFromDelaunay(savedDelaunay, true));
        addDrawBundleToCanvas(traverseDelaunay(savedDelaunay, 0, savedDelaunay.count - 1));

        showDelaunay(savedDelaunay);
    }

    function iterateDelaunay() {
        if (savedDelaunay?.finished) return;

        clearCanvasOverlays();

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
        setOverlayCircles(e => [...e, ...ccs.map(c => ({
            circle: c.circle,
            props: {
                filled: false,
                borderWidth: 1,
                color: c.legal ? legalColour : illegalColour,
            },
        }))]);

        setOverlayLines(e => [...e, ...ccs.filter(c => c.removedLine != null).map(c => ({
            points: [savedDelaunay!.points[c.removedLine![0]!]!, savedDelaunay!.points[c.removedLine![1]!]!],
            props: {
                width: 1,
                color: illegalColour,
                dashed: true,
            },
        }))])

        showDelaunay(savedDelaunay);
    }

    function initialiseDelaunay() {
        // two types. lets just consider points.

        // if (lines.length == 0) return undefined;
        // const l = lines[lines.length - 1];
        // if (!l?.points.length) { console.error('l.p.len not found'); return undefined };
        // if (l.points.length < 4) { console.error('l.p.len != 3'); console.log(l); return undefined; }
        // const points = l.points.map(v => new Point(v.x, v.y));
        // points.splice(points.length - 1, 1);
        return delaunay.initialise(points);
    }

    function finaliseDelaunay(d: DelaunayGraph): CustomDrawBundle {
        delaunay.finalise(d);
        return extractFacesFromDelaunay(d);
    }

    function extractFacesFromDelaunay(d: DelaunayGraph, hideCircumCircles: boolean = false): CustomDrawBundle {
        const ccs = delaunay.getFacesAsCircumcircles(d);
        const result: CustomDrawBundle = {};

        result.circles = ccs.circles.map(c => ({
            circle: { center: c.center, radius: hideCircumCircles ? 0 : c.radius },
            props: {
                filled: false,
                borderWidth: hideCircumCircles ? 0 : 0.2,
                color: legalColour,
                dashed: true
            },
        }));

        result.texts = ccs.circles.map((_, i) => ({
            text: `F` + i.toString(),
            position: ccs.centrepoints[i]!,
            color: 'peach'
        }))

        d.finished = true;
        return result;
    }

    function traverseDelaunay(d: DelaunayGraph, origin: number, target: number): CustomDrawBundle {
        console.log(`~~~~~~~~~~~~~~   traversing  ~~~~~~~~~~~~~~`);
        const traversedFaces = halfEdgeTriangular.traverse(d.graph, origin, target);
        console.log(`traversed faces:`);
        console.log(traversedFaces);

        const result: CustomDrawBundle = {
            lines: [
                {
                    points: [d.points[origin]!, d.points[target]!],
                    props: {
                        width: 3,
                        color: 'orange',
                        dashed: true
                    },
                }
            ]
        };
        return result;
    }

    function addDrawBundleToCanvas(bundle: CustomDrawBundle) {
        if (bundle.lines) setOverlayLines(e => [...e, ...bundle.lines!]);
        if (bundle.circles) setOverlayCircles(e => [...e, ...bundle.circles!]);
        if (bundle.texts) setOverlayTexts(e => [...e, ...bundle.texts!]);
    }

    function binDelaunay() {
        savedDelaunay = undefined;
    }

    /** Appends all lines and points from the computed DelaunayGraph object to the canvas. */
    function showDelaunay(d: DelaunayGraph) {
        const delaunayLines = delaunay.getResultToLines(d);

        const overlay: CustomDrawBundle = {
            lines: delaunayLines.map(l => ({
                points: l.points,
                props: {
                    width: l.sweep ? 2 : 1,
                    color: l.sweep ? `purple` : drawingColour,
                    dashed: l.sweep ? true : false
                },
            })),
            circles: d.points.map(p => ({
                circle: { center: p, radius: 2 },
                props: {
                    filled: false,
                    borderWidth: 1,
                    color: `purple`,
                },
            })),
            texts: [
                ...d.points.map((p, i) => ({
                    text: i.toString(),
                    position: { x: p.x + 5, y: p.y - 5 },
                    color: `black`,
                    fontSize: 12,
                })),
                ...delaunayLines.map((l, i) => ({
                    text: `E${i}`,
                    position: geometry2d.getMidpoint(geometry2d.getMidpoint(l.points[0]!, l.points[1]!), l.points[0]!),
                    color: drawingColour,
                }))
            ]
        };

        addDrawBundleToCanvas(overlay);
    }

    return {
        redrawCanvas,
        handleMouseMove, handleMouseDown, handleMouseUp, handleMouseLeave, handleRightClick,
        drawMode, setDrawMode, clearCanvas, clearCanvasOverlays,
        iterateDelaunay, runDelaunayTimelapse, fullDelaunayTriangulation,
        binDelaunay
    };
}
