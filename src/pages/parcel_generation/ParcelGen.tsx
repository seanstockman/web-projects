import { Button, ButtonGroup, Divider, Slider, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { PageStack } from '../../components/PageComponents.tsx';
import { useEffect, useRef } from 'react';
import { useParcelGenDraw } from './useParcelGenDraw.ts';

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
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import PentagonOutlinedIcon from '@mui/icons-material/PentagonOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import RoundedCornerOutlinedIcon from '@mui/icons-material/RoundedCornerOutlined';

import { ParcelGenerator } from './parcel-generator.ts';

import SkipNextIcon from '@mui/icons-material/SkipNext';
// import { lineStartMode } from '../components/drawingCanvas/draw_modes/lineTool.ts';
import { manipulateMode } from '../../components/drawingCanvas/draw_modes/manipulate.ts';
// import { pointDrawMode } from '../components/drawingCanvas/draw_modes/pointDraw.ts';
import { polygonStartMode } from '../../components/drawingCanvas/draw_modes/polygonTool.ts';
import { SkeletonBuilder } from 'straight-skeleton';

export default function ParcelGeneration() {
    SkeletonBuilder.init();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawModes = [polygonStartMode, manipulateMode];

    let pg: ParcelGenerator | undefined = undefined;

    const parcelCtx = useParcelGenDraw(canvasRef, drawModes);
    const canvasCtx = parcelCtx.canvasCtx;

    const drawActions = [
        {
            label: "Clear", icon: <DeleteIcon />, action: () => {
                canvasCtx.clearCanvasOverlays();
                canvasCtx.clearCanvas();
                canvasCtx.setDrawMode(drawModes[0]!);
            }
        },
    ];

    const stepByStepActions = [
        {
            label: "Reset", icon: <RestartAltOutlinedIcon />, action: () => {
                canvasCtx.clearCanvasOverlays();
                pg = undefined;
            }
        },
        {
            label: "Generate straight skeleton.", icon: <RestartAltOutlinedIcon />, action: () => {
                pg = new ParcelGenerator(canvasCtx.points, []);
                const s = pg.generateStraightSkeleton();
                if (!s) return;

                canvasCtx.clearCanvasOverlays();
                canvasCtx.addDrawBundleToCanvas({
                    lines: s.polygons.map(poly => ({
                        points: [...poly.map(i => ({ x: s.vertices[i]![0], y: s.vertices[i]![1] }))
                            , {x: s.vertices[poly[0]!]![0], y: s.vertices[poly[0]!]![1]}],
                        props: {
                            width: 2,
                            color: `red`,
                            dashed: true,
                        }
                    }))
                });
                // clearCanvasOverlays();
            }
        },
    ];

    const actions = [
        {
            label: "Runs the full parcel generation and only shows the result.", icon: <PlayArrowIcon />, action: () => {
                // getMedialAxis();
            }
        },
    ];

    const testShapes = [
        {
            label: "Sets the canvas to the box example in Figure 7.", icon: <Crop32Icon />, action: () => {
                parcelCtx.setToExamples.rect();
            }
        },
        {
            label: "Sets the canvas to the box example in Figure 10.", icon: <PentagonOutlinedIcon />, action: () => {
                parcelCtx.setToExamples.fig10();
            }
        },
        {
            label: "Sets the canvas to an example with an obtuse triangle with 3 neighbours and whose circumcircle lies outside the polygon.",
            icon: <RoundedCornerOutlinedIcon />, action: () => {
                parcelCtx.setToExamples.obtuse();
            }
        },
        {
            label: "Sets the canvas to broken example.",
            icon: <LayersClearIcon />, action: () => {
                parcelCtx.setToExamples.broken();
            }
        },
    ];

    useEffect(() => { canvasCtx.redrawCanvas(); }, [canvasCtx.redrawCanvas]);
    return (
        <PageStack>
            <Typography variant='h3'>ParcelGeneration</Typography>

            <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
                <ButtonGroup>
                    {drawActions.map(a => (
                        <Tooltip title={a.label} key={a.label}>
                            <Button onClick={a.action}>{a.icon}</Button>
                        </Tooltip>
                    ))}
                </ButtonGroup>

                <ToggleButtonGroup value={'id' in canvasCtx.drawMode ? canvasCtx.drawMode.id : null}
                    exclusive
                    onChange={(_e, val) => {
                        const next = drawModes.find(m => m.id === val);
                        if (next) canvasCtx.setDrawMode(next);
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

                <ButtonGroup>
                    {stepByStepActions.map(a => (
                        <Tooltip title={a.label} key={a.label}>
                            <Button onClick={a.action}>{a.icon}</Button>
                        </Tooltip>
                    ))}
                </ButtonGroup>

                <ButtonGroup>
                    {testShapes.map(a => (
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
                onMouseDown={canvasCtx.handleMouseDown}
                onMouseMove={canvasCtx.handleMouseMove}
                onMouseUp={canvasCtx.handleMouseUp}
                onMouseLeave={canvasCtx.handleMouseLeave}
                onContextMenu={canvasCtx.handleRightClick}
            />
        </PageStack>
    );
};