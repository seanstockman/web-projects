import { useRef, useEffect, useState } from 'react';
import lineMaths from './VectorMaths';
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
    const maxCurveRadius = 20;

    const drawer = {
        drawLine: function (/** @type {CanvasRenderingContext2D} */ctx, inputLine) {
            /** @type {Point[]} */
            const line = inputLine;
            if (line.length < 2) return;

            ctx.beginPath();
            ctx.strokeStyle = '#ff2d2d';
            ctx.lineWidth = 8;

            const lineInfo = lineMaths.getLineInfo(line);

            ctx.moveTo(line[0].x, line[0].y);
            for (let i = 1; i < line.length; i++) {
                const minRadius = lineMaths.getMinCurveRad(line, i);
                // draw lines from midpoint
                ctx.moveTo();


                // const distToNext

                // const minDist = Math.min();-


                ctx.lineTo(line[i].x, line[i].y);
            }
            ctx.stroke();
        },
        drawCircle: function (
            /** @type {CanvasRenderingContext2D} */
            ctx,
            p, radius, colour) {
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
                console.log(`length: ${draggedPoint.pointIndex}`);
                break;
            case Mode.MANIPULATE:
                const clickRadius = 24;

                break;
            default:
                break;
        }

        console.log(lines);

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

                console.log(`moving point ${draggedPoint.lineIndex}, ${draggedPoint.pointIndex}`);
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
