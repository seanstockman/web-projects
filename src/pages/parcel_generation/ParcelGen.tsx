import { Button, ButtonGroup, Divider, Slider, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { PageStack } from '../../components/PageComponents.tsx';
import { useEffect, useRef } from 'react';
import { useParcelGenDraw } from './useParcelGenDraw.ts';

import DeleteIcon from '@mui/icons-material/Delete';
import Crop32Icon from '@mui/icons-material/Crop32';
import LayersClearIcon from '@mui/icons-material/LayersClear';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PentagonOutlinedIcon from '@mui/icons-material/PentagonOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import RoundedCornerOutlinedIcon from '@mui/icons-material/RoundedCornerOutlined';
import AccessibilityIcon from '@mui/icons-material/Accessibility';
import AddRoadOutlinedIcon from '@mui/icons-material/AddRoadOutlined';
import HdrAutoOutlinedIcon from '@mui/icons-material/HdrAutoOutlined';
import FormatBoldOutlinedIcon from '@mui/icons-material/FormatBoldOutlined';


import { ParcelGenerator } from './parcel-generator.ts';

import SkipNextIcon from '@mui/icons-material/SkipNext';
// import { lineStartMode } from '../components/drawingCanvas/draw_modes/lineTool.ts';
import { manipulateMode } from '../../components/drawingCanvas/draw_modes/manipulate.ts';
// import { pointDrawMode } from '../components/drawingCanvas/draw_modes/pointDraw.ts';
import { polygonStartMode } from '../../components/drawingCanvas/draw_modes/polygonTool.ts';
import { Skeleton, SkeletonBuilder } from 'straight-skeleton';
import type { CustomDrawBundle } from '../../components/drawingCanvas/useCanvasDraw.tsx';

let pg: ParcelGenerator | undefined = undefined;

export default function ParcelGeneration() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawModes = [polygonStartMode, manipulateMode];


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
            label: "Generate straight skeleton", icon: <AccessibilityIcon />, action: () => {
                pg = new ParcelGenerator(canvasCtx.points, []);
                const s = pg.generateStraightSkeleton();
                if (!s) return;
                drawSkeleton(pg);

                // clearCanvasOverlays();
            }
        },
        {
            label: "Generate peripheral roads", icon: <AddRoadOutlinedIcon />, action: () => {
                if (!pg) { console.error(`pg not defined`); return; }
                const roads = pg.generatePeripheralRoads();
                console.log(roads);
            }
        },
        {
            label: "Merge into alpha strip", icon: <HdrAutoOutlinedIcon />, action: () => {
                if (!pg) { console.error(`pg not defined`); return; }
                pg.mergeIntoAlphaStrip();
                drawSkeleton(pg);
            }
        },
        {
            label: "Merge into beta strip", icon: <FormatBoldOutlinedIcon />, action: () => {
                if (!pg) { console.error(`pg not defined`); return; }
                pg.mergeIntoBetaStrip();
            }
        },
    ];

    function drawSkeleton(pg: ParcelGenerator) {
        const s = pg.skeleton;
        if (!s) return;
        const polygons = s.Edges.map(e => e.Polygon);

        canvasCtx.clearCanvasOverlays();
        const overlay: CustomDrawBundle = { texts: [] };

        canvasCtx.addDrawBundleToCanvas({
            lines: polygons.filter(p => p.length >= 3).map(poly => ({
                points: [...poly.map(v => ({ x: v.X, y: v.Y }))
                    , { x: poly[0]!.X, y: poly[0]!.Y }],
                props: {
                    width: 2,
                    color: `red`,
                    dashed: true,
                }
            })),
        });

        pg.polygon.forEach((v, i) => {
            overlay.texts!.push({
                text: `V${i}`,
                position: { x: v.x + 6, y: v.y - 8 }
            });
        });
        canvasCtx.addDrawBundleToCanvas(overlay);
    }

    const actions = [
        {
            label: "Runs the full parcel generation and only shows the result.", icon: <PlayArrowIcon />, action: () => {
                pg = new ParcelGenerator(canvasCtx.points, []);
                const s = pg.generateStraightSkeleton();
                if (!s) return;
                const r = pg.generatePeripheralRoads();
                console.log(r);
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
            <Typography variant='h3'>Parcel Generation</Typography>

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