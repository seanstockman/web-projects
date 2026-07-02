import { Button, ButtonGroup, Divider, Slider, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { PageStack } from '../components/PageComponents.tsx';
import { useMedialDraw, Mode } from './useMedialDraw.ts';
import { useEffect, useRef } from 'react';

import DeleteIcon from '@mui/icons-material/Delete';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';
import LayersClearIcon from '@mui/icons-material/LayersClear';

export default function MedialSkeleton() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const {
        handleMouseMove, handleMouseDown, drawCanvas,
        setLines, setMode, setOverlayPoints, setOverlayLines,
        showCircumcircle, showDelaunay
    } = useMedialDraw(canvasRef);

    const actions = [
        {
            label: "Clear", icon: <DeleteIcon />, action: () => {
                setLines([]);
                setOverlayPoints([]);
                setOverlayLines([]);
                setMode(Mode.NewLine);
            }
        }, {
            label: "Show the circumcircle of the last drawn polygon", icon: <PanoramaFishEyeIcon />, action: () => {
                showCircumcircle();
            }
        }, {
            label: "Run Delauney Triangulation", icon: <ChangeHistoryIcon />, action: () => {
                showDelaunay();
            }
        }, {
            label: "Clear overlays", icon: <LayersClearIcon />, action: () => {
                setOverlayLines([]);
                setOverlayPoints([]);
            }
        },
    ]

    useEffect(() => drawCanvas(), [drawCanvas]);
    return (


        <PageStack>
            <Typography variant='h3'>Medial Skeleton</Typography>

            <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
                {/* <ToggleButtonGroup value={mode} exclusive onChange={(e, val) => setMode(val)}>
                    {modeButtons.map(b => (
                        <Tooltip title={b.label} key={b.mode}>
                            <ToggleButton value={b.mode}>{b.icon}</ToggleButton>
                        </Tooltip>
                    ))}
                </ToggleButtonGroup>

                <Tooltip title="Pick Line Colour">
                    <input type="color" value={currentColor} className='self-center' onChange={e => setCurrentColor(e.target.value)} />
                </Tooltip> */}

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
                width={800}
                height={400}
                className="bg-gray-200 block touch-none max-w-full h-auto"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
            // onMouseUp={handleMouseUp}
            // onMouseLeave={handleMouseLeave}
            // onContextMenu={handleRightClick}
            />
        </PageStack>
    );
};