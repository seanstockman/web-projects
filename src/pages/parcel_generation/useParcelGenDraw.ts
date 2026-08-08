import { useState, useEffect, useCallback, type RefObject } from 'react';
import { useCanvasDraw, type DefaultCanvasProps, type OverlayCircle, type OverlayLine, type OverlayText } from '../../components/drawingCanvas/useCanvasDraw.tsx';
import type { SelectableDrawMode } from '../../components/drawingCanvas/draw_modes/types.ts';
import { geometry2d, type Vec2 } from '../../lib/geometry/geometry2d.ts';

const drawingColour = '#2768f5';

const defaultCanvasProps: DefaultCanvasProps = {
    pointProps: { filled: true, borderWidth: 0, color: drawingColour },
    pointRadius: 3,
    lineProps: { width: 2, color: drawingColour, dashed: false },
    cursorProps: { filled: true, borderWidth: 0, color: '#ff0000d4' },
    cursorRadius: 1.5,
    manipulateGrabRadius: 15,
};

export function useParcelGenDraw(canvasRef: RefObject<HTMLCanvasElement | null>, canvasModes: SelectableDrawMode[]) {
    const canvasCtx = useCanvasDraw(canvasRef, defaultCanvasProps, canvasModes);

    function setCanvasToPolygon(polygon: Vec2[]) {
        if (polygon.length < 3) return;
        canvasCtx.setPoints(polygon);
        canvasCtx.setLines([[...polygon, polygon[0]!]]);
    }

    const setToExamples = {
        rect() {
            setCanvasToPolygon([
                { x: 400, y: 500 },
                { x: 900, y: 500 },
                { x: 900, y: 300 },
                { x: 400, y: 300 },
            ]);
        },
        fig10() {
            setCanvasToPolygon([
                { x: 380.2228250647914, y: 153.64437459688003 },
                { x: 296.6573690065955, y: 366.7362875452796 },
                { x: 643.4540116481085, y: 687.0705357683639 },
                { x: 736.7687709130939, y: 493.47722923354337 },
                { x: 1082.172655953637, y: 602.1123221091981 },
                { x: 1176.8801728195924, y: 391.8059243627384 },
                { x: 655.9888300568379, y: 270.63601307835427 },
            ]);
        },
        obtuse() {
            setCanvasToPolygon([
                { x: 625.8333206176758, y: 94.67012617323134 },
                { x: 1243.8888761732312, y: 525.2256817287869 },
                { x: 938.3333206176758, y: 421.05901506212024 },
                { x: 700.8333206176758, y: 290.50345950656464 },
                { x: 404.9999872843424, y: 572.447903951009 },
                { x: 186.9444317287869, y: 433.55901506212024 },
                { x: 175.83332061767578, y: 104.39234839545355 }
            ]);
        }, 
        broken() {
            setCanvasToPolygon([
                { x: 244.27480916030535, y: 263.1488363251431 },
                { x: 372.51908396946567, y: 226.50761495109734 },
                { x: 477.86259541984737, y: 215.82059205033397 },
                { x: 592.3664122137405, y: 226.50761495109734 },
                { x: 690.0763358778627, y: 208.18700426407443 },
                { x: 777.0992366412214, y: 163.9121951037691 },
                { x: 868.7022900763359, y: 133.37784395873092 },
                { x: 987.7862595419848, y: 121.16410350071565 },
                { x: 1010.6870229007634, y: 188.33967601979964 },
                { x: 1038.1679389312978, y: 282.99616456941794 },
                { x: 1058.0152671755725, y: 357.8053248747615 },
                { x: 1003.0534351145038, y: 373.07250044728056 },
                { x: 906.8702290076336, y: 389.86639357705155 },
                { x: 842.7480916030535, y: 400.5534164778149 },
                { x: 786.2595419847329, y: 414.2938744930821 },
                { x: 706.8702290076336, y: 402.0801340350668 },
                { x: 677.8625954198474, y: 421.9274622793416 },
                { x: 664.1221374045801, y: 467.72898899689886 },
                { x: 699.236641221374, y: 524.2175386152195 },
                { x: 766.412213740458, y: 522.6908210579676 },
                { x: 792.3664122137405, y: 493.68318747018134 },
                { x: 867.175572519084, y: 493.68318747018134 },
                { x: 963.3587786259543, y: 484.52288212666986 },
                { x: 1087.0229007633588, y: 457.0419660961355 },
                { x: 1114.5038167938933, y: 592.9198286915554 },
                { x: 1045.8015267175574, y: 650.9350958671279 },
                { x: 880.9160305343512, y: 681.469447012166 },
                { x: 748.0916030534352, y: 713.5305157144561 },
                { x: 682.4427480916031, y: 718.1106683862118 },
                { x: 613.7404580152672, y: 705.8969279281966 },
                { x: 508.3969465648855, y: 708.9503630427005 },
                { x: 422.90076335877865, y: 682.9961645694179 },
                { x: 363.35877862595424, y: 657.0419660961355 },
                { x: 354.19847328244276, y: 595.9732638060592 },
                { x: 309.92366412213744, y: 496.73662258468516 },
                { x: 291.60305343511453, y: 395.9732638060592 },
                { x: 264.12213740458014, y: 328.79769128697524 }
            ]);
        },
    }

    return {
        canvasCtx,
        setToExamples
    };
}
