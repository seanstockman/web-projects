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

  const getMousePos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, [canvasRef]);

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
    const mouse = getMousePos(e);
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

  const handleMouseUpOrLeave = useCallback(() => {
    if (mode === Mode.MANIPULATE) setDraggedPoint(null);
  }, [mode]);

  const handleRightClick = useCallback((e) => {
    e.preventDefault();
    if (mode === Mode.DRAW && draggedPoint) {
      const { lineIndex, pointIndex } = draggedPoint;
      setLines(prevLines => {
        const updated = [...prevLines];
        if (updated[lineIndex].line.length <= 2) {
          updated.splice(lineIndex, 1);
        } else {
          updated[lineIndex].line.splice(pointIndex, 1);
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

    if (options.includes('showGrid')) drawer.drawGrid(ctx, canvas);

    lines.forEach(l => drawer.drawLine(ctx, l.line, radius, l.color));

    if (origin) drawer.drawCircle(ctx, origin, 4, currentColor);

    if (mode === Mode.MANIPULATE) {
      lines.forEach(line => {
        line.line.forEach(p => drawer.drawCircle(ctx, p, false));
      });
    }
  }, [canvasRef, lines, origin, radius, currentColor, options, mode]);

  return {
    Mode,
    mode, setMode,
    lines, setLines,
    origin, setOrigin,
    draggedPoint, setDraggedPoint,
    radius, setRadius,
    currentColor, setCurrentColor,
    options, setOptions,
    shiftHeld,

    getMousePos,
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleRightClick,

    drawCanvas,
  };
}