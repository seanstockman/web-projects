import { Button, ButtonGroup, Divider, Slider, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { PageStack } from '../components/PageComponents.tsx';
import { useDelaunayDraw } from './useDelaunayDraw.ts';
import { useEffect, useRef } from 'react';

import DeleteIcon from '@mui/icons-material/Delete';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';
import LayersClearIcon from '@mui/icons-material/LayersClear';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FastForwardIcon from '@mui/icons-material/FastForward';

import SkipNextIcon from '@mui/icons-material/SkipNext';
import { lineStartMode } from '../components/drawingCanvas/draw_modes/lineTool.ts';
import { manipulateMode } from '../components/drawingCanvas/draw_modes/manipulate.ts';
import { pointDrawMode } from '../components/drawingCanvas/draw_modes/pointDraw.ts';
import { polygonStartMode } from '../components/drawingCanvas/draw_modes/polygonTool.ts';
import type { Mode } from '../interlining/useInterliningDraw.ts';

export default function DelaunayTriangulation() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const drawModes = [pointDrawMode, lineStartMode, polygonStartMode, manipulateMode];

    const {
        handleMouseMove, handleMouseDown, handleMouseUp, handleMouseLeave, handleRightClick, 
        redrawCanvas,
        drawMode, setDrawMode, clearCanvas, clearCanvasOverlays,
        iterateDelaunay, runDelaunayTimelapse, fullDelaunayTriangulation,
        binDelaunay
    } = useDelaunayDraw(canvasRef, drawModes);

    const drawActions = [
        {
            label: "Clear", icon: <DeleteIcon />, action: () => {
                clearCanvasOverlays();
                clearCanvas();
                setDrawMode(drawModes[0]!);
                binDelaunay();
            }
        },
    ];

    const delaunayActions = [
        {
            label: "Runs the full Delaunay Triangulation process and only shows the result.", icon: <ChangeHistoryIcon />, action: () => {
                fullDelaunayTriangulation();
            }
        },
        {
            label: "Iterate Delaunay", icon: <PlayArrowIcon />, action: () => {
                iterateDelaunay();
            }
        },
        {
            label: "Run Delaunay Triangulation Timelapse", icon: <FastForwardIcon />, action: () => {
                runDelaunayTimelapse(50);
            }
        },
        {
            label: "Reset Delaunay", icon: <RestartAltIcon />, action: () => {
                binDelaunay();
                clearCanvasOverlays();
            }
        },
        // {
        //     label: "Clear overlays", icon: <LayersClearIcon />, action: () => {
        //         setOverlayLines([]);
        //         setOverlayCircles([]);
        //     }
        // }
    ]

    useEffect(() => {redrawCanvas(); }, [redrawCanvas]);
    return (


        <PageStack>
            <Typography variant='h3'>Delaunay Triangulation Demo</Typography>

            <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
                <ButtonGroup>
                    {drawActions.map(a => (
                        <Tooltip title={a.label} key={a.label}>
                            <Button onClick={a.action}>{a.icon}</Button>
                        </Tooltip>
                    ))}
                </ButtonGroup>

                <ToggleButtonGroup value={'id' in drawMode ? drawMode.id : null}
                    exclusive
                    onChange={(_e, val) => {
                        const next = drawModes.find(m => m.id === val);
                        if (next) setDrawMode(next);
                    }}>
                    {drawModes.map(m => {
                        const Icon = m.icon;
                        return (
                            <Tooltip title={m.label} key={m.id}>
                                <ToggleButton value={m.id}><Icon /></ToggleButton>
                            </Tooltip>
                        )
                    })}
                </ToggleButtonGroup>

                <ButtonGroup>
                    {delaunayActions.map(a => (
                        <Tooltip title={a.label} key={a.label}>
                            <Button onClick={a.action}>{a.icon}</Button>
                        </Tooltip>
                    ))}
                </ButtonGroup>

                {/* <ToggleButtonGroup value={options} onChange={(e, v) => { setOptions(v); console.log(`set options to ${v}`) }}>
                    {toggles.map(t => (
                        <Tooltip title={t.label} key={t.value}>
                            <ToggleButton disabled={t.disabled} value={t.value}>{options.includes(t.value) ? t.iconOn : t.iconOff}</ToggleButton>
                        </Tooltip>
                    ))}
                </ToggleButtonGroup>

                <Tooltip title="Curve Radius">
                    <Slider min={1} max={100} value={radius} onChange={(e, r) => setRadius(r)} valueLabelDisplay="auto" />
                </Tooltip> */}
            </Stack>

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