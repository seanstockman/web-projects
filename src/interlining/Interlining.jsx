import { useRef, useEffect, useState } from 'react';
import lineMaths from './LineMaths';
import { Vector2 } from 'three';
// import { Bezier } from 'bezier-js';

function Interlining() {
    const Mode = Object.freeze({
        MANIPULATE: 'manipulate',
        DRAW: 'draw',
        NEWLINE: 'new-line'
        // PREVIEW: 'preview'
    });

    const canvasRef = useRef(null);
    const [mode, setMode] = useState(Mode.MANIPULATE);

    const [lines, setLines] = useState([]);
    const [origin, setOrigin] = useState(null);
    const [draggedPoint, setDraggedPoint] = useState({ lineIndex: -1, pointIndex: -1 });
    const radius = 20;

    const drawer = {
        drawLine: function (/** @type {CanvasRenderingContext2D} */ctx, /** @type {Point[]} */ line) {
            if (line.length < 2) return;

            ctx.strokeStyle = '#ff6f2d'; // straight line colour
            ctx.lineWidth = 8;

            const segments = lineMaths.getSegments(line);
            let startPoint = segments[0].start;
            // console.log(`last segment (i = ${segments.length - 1}):`);
            // console.log(segments[segments.length - 1]);
            if (line.length == 2) {
                ctx.beginPath();
                ctx.moveTo(startPoint.x, startPoint.y);
                ctx.lineTo(segments[0].end.x, segments[0].end.y);
                ctx.stroke();
                return;
            }

            // ctx.beginPath();
            // ctx.moveTo(startPoint.x, startPoint.y);
            for (let i = 0; i < line.length - 2; i++) {
            //     ctx.arcTo(line[i + 1].x, line[i + 1].y, line[i + 2].x, line[i + 2].y, radius);
            // }
            // ctx.stroke();
                // going to draw the previous straight line segment and the arc at the end
                // assume already in right spot (end of the circle of the previous)
                ctx.beginPath();
                ctx.moveTo(startPoint.x, startPoint.y);
                ctx.strokeStyle = '#ff6f2d'; // straight line colour
                // ctx.moveTo();
                const seg = segments[i];

                if (i == segments.length - 1) {
                    ctx.lineTo(seg.end.x, seg.end.y);
                    ctx.stroke();
                    break;
                }

                // line to start of circle
                const maxHalfLength = lineMaths.getMaximumHalfLength(line, i + 1, segments);
                const lineEnd = seg.start.clone().add(seg.dir.clone().multiplyScalar(seg.len - maxHalfLength));
                ctx.lineTo(lineEnd.x, lineEnd.y);
                ctx.stroke();

                // do the circle
                const nextSeg = segments[i + 1];
                const theta = seg.dir.clone().multiplyScalar(-1).angleTo(nextSeg.dir);
                const r = maxHalfLength * Math.tan(theta / 2);

                const dirPerp = nextSeg.dir.clone().rotateAround(new Vector2(0,0), Math.PI / 2);
                const prevDirPerp = seg.dir.clone().rotateAround(new Vector2(0,0), Math.PI / 2);

                const nextLineStart = nextSeg.start.clone().add(nextSeg.dir.clone().multiplyScalar(maxHalfLength));
                const circleCentre = nextLineStart.clone().add(dirPerp.multiplyScalar(-Math.sign(seg.dir.dot(dirPerp)) * r));
                // this.drawCircle(ctx, circleCentre, r, 'blue'); 

                ctx.beginPath();
                ctx.strokeStyle = '#81ff2d'; // "circle" colour
                ctx.arc(circleCentre.x, circleCentre.y, r, dirPerp.angle() + Math.PI, prevDirPerp.angle());
                
                // ctx.moveTo(lineEnd.x, lineEnd.y);
                // ctx.lineTo(seg.end.x, seg.end.y);
                // ctx.lineTo(nextLineStart.x, nextLineStart.y);
                ctx.stroke();

                // move marker to new start
                startPoint = nextLineStart;
            }

            // ctx.moveTo(line[0].x, line[0].y);
            // for (let i = 1; i < line.length; i++) {
            //     const maxHalfLength = lineMaths.getMaximumHalfLength(line, i, lineInfo, maxCurveRadius);
            //     // draw lines from midpoint
            //     if (i == 1) {
            //         ctx.moveTo(line[0].x, line[0].y);
            //     } else {
            //         const prevSeg = lineInfo[i-1];
            //         const midpoint = prevSeg.start + prevSeg.len * 0.5 * prevSeg.dir;
            //         ctx.moveTo(midpoint.x, midpoint.y);
            //     }
            //     // draw to start of circle.

            //     ctx.lineTo();


            //     // const distToNext

            //     // const minDist = Math.min();-


            //     ctx.lineTo(line[i].x, line[i].y);
            // }
        },
        drawCircle: function (/** @type {CanvasRenderingContext2D} */ ctx, p, radius, colour) {
            ctx.beginPath();
            ctx.fillStyle = colour;
            ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // mode debug
    useEffect(() => { console.log(`Mode swapped to ${mode}.`); }, [mode]);

    // refresh canvas
    useEffect(() => {
        /** @type {HTMLCanvasElement} */
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < lines.length; i++) {
            drawer.drawLine(ctx, lines[i]);
        }

        if (!origin) return;

        drawer.drawCircle(canvas.getContext('2d'), origin, 4, '#eb3333');
    }, [lines, origin]);

    const getMousePos = (e) => {
        /** @type {HTMLCanvasElement} */
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Calculate coordinate scale multipliers
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleMouseDown = (e) => {
        const mouse = getMousePos(e);

        switch (mode) {
            case Mode.NEWLINE:
                setOrigin(null);
                const lineIdx = lines.length;
                setLines(prevLines => {
                    const updated = [...prevLines, []];
                    updated[lineIdx] = [...updated[lineIdx], mouse, mouse]; // make next click at mouse too.
                    return updated;
                });
                setDraggedPoint({ lineIndex: lineIdx, pointIndex: 1 });
                setMode(Mode.DRAW);
                break;
            case Mode.DRAW:
                setLines(prevLines => {
                    const lastLineIdx = lines.length - 1;
                    const updated = [...prevLines];
                    updated[lastLineIdx] = [...updated[lastLineIdx], mouse];
                    const pi = updated[lastLineIdx].length - 1;
                    setDraggedPoint({ lineIndex: lastLineIdx, pointIndex: pi });
                    return updated;
                });
                // console.log(`length: ${draggedPoint.pointIndex}`);
                break;
            case Mode.MANIPULATE:
                const clickRadius = 24;

                break;
            default:
                break;
        }

        // console.log(lines);

        // const index = points.findIndex(p => {
        //     const distance = Math.sqrt((p.x - mouse.x) ** 2 + (p.y - mouse.y) ** 2);
        //     return distance < clickRadius;
        // });

        // if (index !== -1) {
        //     setDraggedPointIndex(index);
        // }
    };

    const handleMouseMove = (e) => {
        switch (mode) {
            case Mode.DRAW:
                if (!draggedPoint || (draggedPoint.lineIndex == -1 && draggedPoint.pointIndex == -1)) return;

                // console.log(`moving point ${draggedPoint.lineIndex}, ${draggedPoint.pointIndex}`);
                const mouse = getMousePos(e);
                setLines(prevLines => {
                    const updated = [...prevLines];
                    updated[draggedPoint.lineIndex] = [...updated[draggedPoint.lineIndex]];
                    updated[draggedPoint.lineIndex][draggedPoint.pointIndex] = { x: mouse.x, y: mouse.y };
                    return updated;
                });
                break;
            case Mode.NEWLINE:
                const pos = getMousePos(e);
                setOrigin(pos);
                break;
            default:
                break;
        }
    };

    const handleRightClick = () => {
        setDraggedPoint(null);
        setMode(Mode.MANIPULATE);
    }

    // const handleMouseUpOrLeave = () => {
    //     setDraggedPoint([-1, -1]);
    // };

    return (
        <>
            <div className="p-4">
                <h1 className="text-xl font-bold">Interlining Demo</h1>
                <p className="text-gray-600 mb-2">
                    Drag the red and blue dots to reshape the curve!
                </p>
            </div>
            {/* Added max-w-full to allow responsive sizing layout wrappers */}
            <div>
                <button
                    onClick={() => setMode(Mode.MANIPULATE)}
                    className="bg-purple-500"
                >
                    Manipulate
                </button>
                <button onClick={() => setMode(Mode.NEWLINE)}
                    className="bg-blue-500"
                >
                    Draw New Line
                </button>
            </div>
            <canvas
                ref={canvasRef}
                id="interlining-canvas"
                width={800}
                height={400}
                className="bg-gray-200 block touch-none max-w-full h-auto"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onContextMenu={handleRightClick}
            // onMouseUp={handleMouseUpOrLeave}
            // onMouseLeave={handleMouseUpOrLeave}
            />
        </>
    );
}

export default Interlining;
