// useInterlinerDraw.js
import { useState, useEffect, useCallback } from 'react';
import { drawer } from './Drawer';

export function useInterlinerDraw(canvasRef) {
    const Mode = {
        MANIPULATE: 'manipulate',
        DRAW: 'draw',
        NEWLINE: 'new-line'
    };

    const [mode, setMode] = useState(Mode.MANIPULATE);
    const [lines, setLines] = useState([]);
    const [origin, setOrigin] = useState(null);
    const [gridSize, setGridSize] = useState(20);
    const [draggedPoint, setDraggedPoint] = useState(null);
    const [radius, setRadius] = useState(20);
    const [currentColor, setCurrentColor] = useState("#ff6f2d");
    const [options, setOptions] = useState([]);
    const [shiftHeld, setShiftHeld] = useState(false);

    // Track shift key
    useEffect(() => {
        const downHandler = (e) => e.key === 'Shift' && setShiftHeld(true);
        const upHandler = (e) => e.key === 'Shift' && setShiftHeld(false);

        window.addEventListener('keydown', downHandler);
        window.addEventListener('keyup', upHandler);

        return () => {
            window.removeEventListener('keydown', downHandler);
            window.removeEventListener('keyup', upHandler);
        };
    }, []);

    // disable grid snapping if grid not shown
    // useEffect(() => {
    //     if (!options.includes("showGrid") && options.includes("snapToGrid")) {

    //     }
    // }, [options]);

    const getMousePos = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleY;

        if (shiftHeld && draggedPoint && draggedPoint.pointIndex != 0) {
            const l = lines[draggedPoint.lineIndex].line;
            const prev = l[draggedPoint.pointIndex - 1];
            const offset = { x: x - prev.x, y: y - prev.y };
            const avgXY = (Math.abs(offset.x) + Math.abs(offset.y)) / 2;
            const cursorToLeft = Math.sign(offset.x);
            // const cursorToLeft = Math.sign(offset.x);
            
            const snappedPoints = [
                { x: 0, y: offset.y },
                { x: offset.x, y: 0 },
                { x: cursorToLeft * avgXY, y: avgXY },
                { x: cursorToLeft * avgXY, y: -avgXY },
            ];

            let closestPoint;
            let closestDist;
            snappedPoints.forEach((p) => {
                const dist = Math.hypot(p.x - offset.x, p.y - offset.y);
                if (!closestPoint || dist < closestDist) {
                    closestPoint = p;
                    closestDist = dist;
                }
            });
            x = closestPoint.x + prev.x;
            y = closestPoint.y + prev.y;
        }

        if (options.includes("snapToGrid")) {
            x = Math.round(x / gridSize) * gridSize;
            y = Math.round(y / gridSize) * gridSize;
        }

        // if (shiftHeld && draggedPoint && lines[draggedPoint.lineIndex].line.length > 1) {
        //     if (draggedPoint.pointIndex > 0) {
        //         const prev = lines[draggedPoint.lineIndex].line[draggedPoint.pointIndex - 1];
        //         y = prev.y;
        //     }
        // }

        return {
            x: x,
            y: y,
        };
    }, [canvasRef, options, gridSize, shiftHeld, draggedPoint]);

    const handleMouseDown = useCallback((e) => {
        const mouse = getMousePos(e);
        switch (mode) {
            case Mode.NEWLINE: {
                setOrigin(null);
                const lineIdx = lines.length;
                setLines(prevLines => {
                    const newline = { line: [mouse, mouse], color: currentColor };
                    return [...prevLines, newline];
                });
                setDraggedPoint({ lineIndex: lineIdx, pointIndex: 1 });
                setMode(Mode.DRAW);
                break;
            }
            case Mode.DRAW: {
                if (!lines.length) return;
                const lastLineIdx = lines.length - 1;
                setLines(prevLines => {
                    const updated = [...prevLines];
                    updated[lastLineIdx].line = [...updated[lastLineIdx].line, mouse];
                    const pointIdx = updated[lastLineIdx].line.length - 1;
                    setDraggedPoint({ lineIndex: lastLineIdx, pointIndex: pointIdx });
                    return updated;
                });
                break;
            }
            case Mode.MANIPULATE: {
                const clickRadius = 24;
                let closestPoint = null;
                let minDistance = Infinity;

                lines.forEach((line, lineIndex) => {
                    line.line.forEach((p, pointIndex) => {
                        const distance = Math.hypot(p.x - mouse.x, p.y - mouse.y);
                        if (distance < clickRadius && distance < minDistance) {
                            closestPoint = { lineIndex, pointIndex };
                            minDistance = distance;
                        }
                    });
                });

                setDraggedPoint(closestPoint);
                break;
            }
            default: break;
        }
    }, [Mode, currentColor, lines, getMousePos, mode]);

    const handleMouseMove = useCallback((e) => {
        let mouse = getMousePos(e);

        switch (mode) {
            case Mode.DRAW:
            case Mode.MANIPULATE: {
                if (!draggedPoint) return;
                const { lineIndex, pointIndex } = draggedPoint;
                setLines(prevLines => {
                    const updated = [...prevLines];
                    updated[lineIndex] = { ...updated[lineIndex], line: [...updated[lineIndex].line] };
                    updated[lineIndex].line[pointIndex] = { x: mouse.x, y: mouse.y };
                    return updated;
                });
                break;
            }
            case Mode.NEWLINE:
                setOrigin(mouse);
                break;
            default:
                break;
        }
    }, [Mode, draggedPoint, getMousePos, mode]);

    const handleMouseUp = useCallback(() => {
        if (mode === Mode.MANIPULATE) setDraggedPoint(null);
    }, [mode]);

    const handleMouseLeave = useCallback(() => {
        if (mode === Mode.MANIPULATE) {
            setDraggedPoint(null);
        } else if (mode === Mode.NEWLINE) {
            setOrigin(null);
        }
    }, [mode]);

    const handleRightClick = useCallback((e) => {
        e.preventDefault();
        if (mode === Mode.DRAW && draggedPoint) {
            const { lineIndex, pointIndex } = draggedPoint;
            setLines(prevLines => {
                const updated = [...prevLines];
                if (updated[lineIndex].line.length <= 3) {
                    updated.splice(lineIndex, 1);
                } else {
                    updated[lineIndex].line.splice(pointIndex - 1, 2);
                }
                return updated;
            });
            setDraggedPoint(null);
            setOrigin(null);
            setMode(Mode.NEWLINE);
        }
    }, [Mode, draggedPoint, mode]);

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (options.includes('showGrid')) drawer.drawGrid(ctx, canvas, gridSize);

        lines.forEach(l => drawer.drawLine(ctx, l.line, radius, l.color));

        if (origin) drawer.drawCircle(ctx, origin, 4, currentColor);

        if (mode === Mode.MANIPULATE) {
            lines.forEach(line => {
                line.line.forEach(p => drawer.drawCircle(ctx, p, false));
            });
        }
    }, [canvasRef, lines, origin, radius, currentColor, options, mode, gridSize]);

    return {
        Mode,
        mode, setMode,
        lines, setLines,
        origin, setOrigin,
        draggedPoint, setDraggedPoint,
        radius, setRadius,
        currentColor, setCurrentColor,
        options, setOptions,
        gridSize, setGridSize,
        shiftHeld,

        getMousePos,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleMouseLeave,
        handleRightClick,

        drawCanvas,
    };
}