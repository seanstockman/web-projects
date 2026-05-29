import { useRef, useEffect, useState } from 'react';
import { lineMaths, drawer } from './LineMaths';
import { Vector2 } from 'three';
import { ToggleButton, ToggleButtonGroup, Button, ButtonGroup, Slider, Stack, Paper, Divider, Tooltip } from '@mui/material';

import ModeEditIcon from '@mui/icons-material/ModeEdit';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import DeleteIcon from '@mui/icons-material/Delete';
// import { Bezier } from 'bezier-js';
import { styled } from '@mui/material/styles';

const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: (theme.vars ?? theme).palette.text.secondary,
    ...theme.applyStyles('dark', {
        backgroundColor: '#1A2027',
    }),
}));



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
    const [draggedPoint, setDraggedPoint] = useState(null);
    const [radius, setRadius] = useState(20);
    const [currentColor, setCurrentColor] = useState("#ff6f2d");

    // mode debug
    useEffect(() => {
        setOrigin(null);
        console.log(`Mode swapped to ${mode}.`);
    }, [mode]);

    // refresh canvas
    useEffect(() => {
        /** @type {HTMLCanvasElement} */

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < lines.length; i++) {
            drawer.drawLine(ctx, lines[i].line, radius, lines[i].color);
        }

        if (origin) drawer.drawCircle(ctx, origin, 4, currentColor);
        if (mode != Mode.MANIPULATE) return;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].line;
            for (let j = 0; j < line.length; j++) {
                drawer.drawCircle(ctx, line[j], false);
            }
        }


    }, [lines, origin, radius, mode]);

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
                setDraggedPoint(null);
                const clickRadius = 24;
                const clickedPoint = {};
                let clickedPointDist;
                for (let i = 0; i < lines.length; i++) {
                    let distance;
                    const pointIndex = lines[i].line.findIndex(p => {
                        distance = Math.hypot(p.x - mouse.x, p.y - mouse.y);
                        return distance < clickRadius;
                    });
                    if (i == 0 || distance < clickedPointDist) {
                        clickedPoint.pointIndex = pointIndex;
                        clickedPoint.lineIndex = i;
                        clickedPointDist = distance;
                    }
                }
                setDraggedPoint(clickedPoint);
                // lines[0].line.findIndex();
                break;
            default:
                break;
        }

        // console.log(lines);

        // const index = lines[]

        // const index = points.findIndex(p => {
        //     const distance = Math.sqrt((p.x - mouse.x) ** 2 + (p.y - mouse.y) ** 2);
        //     return distance < clickRadius;
        // });

        // if (index !== -1) {
        //     setDraggedPointIndex(index);
        // }
    };

    const handleMouseMove = (e) => {
        const mouse = getMousePos(e);
        switch (mode) {
            case Mode.DRAW:
                if (!draggedPoint) return;

                // console.log(`moving point ${draggedPoint.lineIndex}, ${draggedPoint.pointIndex}`);
                setLines(prevLines => {
                    /** @type ArcLine[] */
                    const updated = [...prevLines];
                    // updated[draggedPoint.lineIndex] = [...updated[draggedPoint.lineIndex]];
                    updated[draggedPoint.lineIndex].line[draggedPoint.pointIndex] = { x: mouse.x, y: mouse.y };
                    return updated;
                });
                break;
            case Mode.NEWLINE:
                setOrigin(mouse);
                break;
            case Mode.MANIPULATE:
                if (!draggedPoint) return;
                setLines(prevLines => {
                    /** @type ArcLine[] */
                    const updated = [...prevLines];
                    updated[draggedPoint.lineIndex].line[draggedPoint.pointIndex] = { x: mouse.x, y: mouse.y };
                    return updated;
                });
                break;
            default:
                break;
        }
    };

    const handleRightClick = () => {
        setDraggedPoint(null);
        setOrigin(null);
        if (mode == Mode.DRAW) setMode(Mode.NEWLINE);
    }

    const modeButtons = [
        { mode: Mode.NEWLINE, label: 'Draw New Line', bg: 'bg-blue-500', icon: <ModeEditIcon /> },
        { mode: Mode.MANIPULATE, label: 'Manipulate', bg: 'bg-purple-500', icon: <OpenWithIcon /> },
    ];

    const actions = [
        {
            action: () => {
                setMode(Mode.MANIPULATE);
                setLines([]);
                setDraggedPoint(null);
                setOrigin(null);
            },
            label: "Clear",
            icon: <DeleteIcon />
        }
    ];

    const handleMouseUpOrLeave = () => {
        if (mode == Mode.MANIPULATE) {
            setDraggedPoint(null);
        }
    };

    return (
        <>
            <div className="p-4">
                <h1 className="font-bold">Interlining Demo</h1>
            </div>
            <div className='justify-center py-5 px-100'>
                <Stack direction="row"
                    divider={<Divider orientation="vertical" flexItem />}
                    spacing={2}>
                    {/* <Item>Item 1</Item> */}
                    {/* <p>Test</p> */}
                    <ToggleButtonGroup
                        value={mode}
                        exclusive
                        onChange={(e, val) => setMode(val)}
                        aria-label="Basic button group">
                        {modeButtons.map((b) => (
                            <Tooltip title={b.label}>
                                <ToggleButton
                                    value={b.mode}
                                >
                                    {b.icon}
                                </ToggleButton>
                            </Tooltip>
                        ))}
                    </ToggleButtonGroup>
                    <Tooltip title="Pick Line Colour">
                        <input
                            type='color'
                            className='self-center'
                            value={currentColor}
                            onChange={(c) => setCurrentColor(c.target.value)}
                        />
                    </Tooltip>
                    <ButtonGroup
                        variant='constrained'
                        aria-label="Basic button group"
                    >
                        {actions.map((a) => (
                            <Tooltip title={a.label}>
                                <Button
                                    onClick={a.action}
                                >
                                    {a.icon}
                                </Button>
                            </Tooltip>
                        ))}
                    </ButtonGroup>
                    <Tooltip title="Curve Radius">
                        <Slider
                            className='self-center'
                            min={1}
                            max={100}
                            aria-label="Radius"
                            value={radius}
                            onChange={(e, r) => { setRadius(r); }}
                            valueLabelDisplay="auto"
                        />
                    </Tooltip>
                </Stack>
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
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
            />
        </>
    );
}

export default Interlining;
