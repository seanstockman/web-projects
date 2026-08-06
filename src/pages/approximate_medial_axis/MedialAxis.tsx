import { Button, ButtonGroup, Divider, Slider, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { PageStack } from '../../components/PageComponents.tsx';
import { useMedialAxisDraw } from './useMedialAxis.ts';
import { useEffect, useRef } from 'react';

import DeleteIcon from '@mui/icons-material/Delete';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import Crop32Icon from '@mui/icons-material/Crop32';
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';
import LayersClearIcon from '@mui/icons-material/LayersClear';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FastForwardIcon from '@mui/icons-material/FastForward';
import ControlPointIcon from '@mui/icons-material/ControlPoint';
import DetailsIcon from '@mui/icons-material/Details';

import SkipNextIcon from '@mui/icons-material/SkipNext';
// import { lineStartMode } from '../components/drawingCanvas/draw_modes/lineTool.ts';
import { manipulateMode } from '../../components/drawingCanvas/draw_modes/manipulate.ts';
// import { pointDrawMode } from '../components/drawingCanvas/draw_modes/pointDraw.ts';
import { polygonStartMode } from '../../components/drawingCanvas/draw_modes/polygonTool.ts';

export default function ApproximateMedialAxis() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const drawModes = [polygonStartMode, manipulateMode];

    const {
        handleMouseMove, handleMouseDown, handleMouseUp, handleMouseLeave, handleRightClick,
        redrawCanvas,
        drawMode, setDrawMode, clearCanvas, clearCanvasOverlays,
        initialiseCDTFromCanvasPoints, addSteinerPoints, flipRemainingConvex,
        setToRectExample
    } = useMedialAxisDraw(canvasRef, drawModes);

    const drawActions = [
        {
            label: "Clear", icon: <DeleteIcon />, action: () => {
                clearCanvasOverlays();
                clearCanvas();
                setDrawMode(drawModes[0]!);
            }
        },
    ];

    const actions = [
        {
            label: "Gets the Constrained Delaunay Triangulation (CDT) of the mesh.", icon: <ChangeHistoryIcon />, action: () => {
                initialiseCDTFromCanvasPoints();
            }
        },
        {
            label: "Adds the steiner points to assist in medial axis construction and re-computes the CDT.", icon: <ControlPointIcon />, action: () => {
                addSteinerPoints();
            }
        },
        {
            label: "Flips the remaining convex vertices with connections.", icon: <DetailsIcon />, action: () => {
                flipRemainingConvex();
            }
        },
        {
            label: "Runs the full Medial Axis approxuimation process and only shows the result.", icon: <PlayArrowIcon />, action: () => {
                // addSteinerPoints();
            }
        },
        {
            label: "Sets the canvas to the box example in Figure 7.", icon: <Crop32Icon />, action: () => {
                setToRectExample();
            }
        }
    ]

    useEffect(() => { redrawCanvas(); }, [redrawCanvas]);
    return (
        <PageStack>
            <Typography variant='h3'>Approximate Medial Axis</Typography>

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
                    {actions.map(a => (
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