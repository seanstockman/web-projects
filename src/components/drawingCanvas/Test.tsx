import { Typography, Tooltip, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { useMemo, useRef } from "react";
import { PageStack } from "../PageComponents.tsx";

import { useCanvasDraw, type DefaultCanvasProps } from "./useCanvasDraw.tsx";
import { pointDrawMode } from "./draw_modes/pointDraw.ts";
import { lineStartMode } from "./draw_modes/lineTool.ts";
import { manipulateMode } from "./draw_modes/manipulate.ts";
import { polygonStartMode } from "./draw_modes/polygonTool.ts";

export default function TestPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const defaultProps: DefaultCanvasProps = {
        pointProps: {
            filled: true,
            borderWidth: 0,
            color: "#2768f5"
        },
        pointRadius: 4,
        lineProps: {
            width: 2,
            color: "#2768f5",
            dashed: false
        },
        cursorProps: {
            filled: true,
            borderWidth: 0,
            color: "#005effd4"
        },
        cursorRadius: 2,
        manipulateGrabRadius: 10
    }

    // The tools THIS canvas offers — swap/reorder freely per page, hook and UI
    // both derive from this one list.
    const modes = useMemo(() => [pointDrawMode, lineStartMode, polygonStartMode, manipulateMode], []);

    const { drawMode, setDrawMode,
        cursor,
        movedPoint,
        points, setPoints,
        lines, setLines,
        overlayCircles, setOverlayCircles,
        overlayLines, setOverlayLines,
        overlayTexts, setOverlayTexts,

        redrawCanvas,
        handleMouseMove,
        handleMouseDown,
        handleMouseUp,
        handleMouseLeave,
        handleRightClick } = useCanvasDraw(canvasRef, defaultProps, modes);

    return (
        <PageStack>
            <Typography variant='h3'>Test Page</Typography>

            <ToggleButtonGroup
                value={'id' in drawMode ? drawMode.id : null}
                exclusive
                onChange={(_e, val) => {
                    const next = modes.find(m => m.id === val);
                    if (next) setDrawMode(next);
                    // if val is null (deselecting the active button) or unmatched,
                    // just leave drawMode as-is rather than falling back to Idle —
                    // swap this for setDrawMode(idleMode) if you want deselect-to-idle.
                }}
            >
                {modes.map(m => {
                    const Icon = m.icon;
                    return (
                        <Tooltip title={m.label} key={m.id}>
                            <ToggleButton value={m.id}><Icon /></ToggleButton>
                        </Tooltip>
                    );
                })}
            </ToggleButtonGroup>

            <canvas
                ref={canvasRef}
                width={1600}
                height={800}
                className="bg-gray-200 block touch-none max-w-full h-auto"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onContextMenu={handleRightClick}
            />
        </PageStack>
    );
};