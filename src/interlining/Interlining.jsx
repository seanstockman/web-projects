import { useRef, useEffect, useState } from 'react';
import { lineMaths, drawer } from './LineMaths';
import { Vector2 } from 'three';
import { ToggleButton, ToggleButtonGroup, Button, ButtonGroup } from '@mui/material';
// import { Bezier } from 'bezier-js';

/** 
 * @typedef ArcLine
 * @property {Point[]} line
 * @property {string} color
 */

function Interlining() {
    const Mode = Object.freeze({
        MANIPULATE: 'manipulate',
        DRAW: 'draw',
        NEWLINE: 'new-line'
        // PREVIEW: 'preview'
    });

    const canvasRef = useRef(null);
    const [mode, setMode] = useState(Mode.MANIPULATE);
    /** @type ArcLine[][] */
    const [lines, setLines] = useState([]);
    const [origin, setOrigin] = useState(null);
    const [draggedPoint, setDraggedPoint] = useState({ lineIndex: -1, pointIndex: -1 });
    const radius = 20;
    const [currentColor, setCurrentColor] = useState("#ff6f2d");



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
            drawer.drawLine(ctx, lines[i].line, lines[i].color, "#599fe4");
        }

        if (!origin) return;
        drawer.drawCircle(ctx, origin, 4, currentColor);
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
                    /** @type ArcLine[] */
                    const newline = {};
                    newline.line = [mouse, mouse]; // make next click at mouse too.
                    newline.color = currentColor;
                    const updated = [...prevLines, newline];
                    return updated;
                });
                setDraggedPoint({ lineIndex: lineIdx, pointIndex: 1 });
                setMode(Mode.DRAW);
                break;
            case Mode.DRAW:
                setLines(prevLines => {
                    const lastLineIdx = lines.length - 1;
                    /** @type ArcLine[] */
                    const updated = [...prevLines];
                    updated[lastLineIdx].line = [...updated[lastLineIdx].line, mouse];
                    const pointIdx = updated[lastLineIdx].line.length - 1;
                    setDraggedPoint({ lineIndex: lastLineIdx, pointIndex: pointIdx });
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
                    /** @type ArcLine[] */
                    const updated = [...prevLines];
                    // updated[draggedPoint.lineIndex] = [...updated[draggedPoint.lineIndex]];
                    updated[draggedPoint.lineIndex].line[draggedPoint.pointIndex] = { x: mouse.x, y: mouse.y };
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

    const modeButtons = [
        { mode: Mode.MANIPULATE, label: 'Manipulate', bg: 'bg-purple-500' },
        { mode: Mode.NEWLINE, label: 'Draw New Line', bg: 'bg-blue-500' },
    ];

    const actions = [
        {
            action: () => {
                setMode(Mode.MANIPULATE);
                setLines([]);
                setDraggedPoint({ lineIndex: -1, pointIndex: -1 });
            },
            label: "Clear"
        }
    ];

    // const handleMouseUpOrLeave = () => {
    //     setDraggedPoint([-1, -1]);
    // };

    // const handleAlignment = (event, newAlignment) => {
    //     setAlignment(newAlignment);
    // };

    return (
        <>
            <div className="p-4">
                <h1 className="text-xl font-bold">Interlining Demo</h1>
                <p className="text-gray-600 mb-2">
                    Description.
                </p>
            </div>
            <div className='flex flex-row justify-center gap-2 p-2'>
                <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={(e, val) => setMode(val)}
                    aria-label="Basic button group">
                    {modeButtons.map((b) => (
                        <ToggleButton
                            value={b.mode}
                        >
                            {b.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
                <input type='color' value={currentColor} onChange={(c) => setCurrentColor(c.target.value)} />
                <ButtonGroup
                    variant='constrained'
                    aria-label="Basic button group"
                >
                    {actions.map((a) => (
                        <Button
                            onClick={a.action}
                        >
                            {a.label}
                        </Button>
                    ))}
                </ButtonGroup>
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
