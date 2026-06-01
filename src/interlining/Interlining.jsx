import { useRef, useEffect } from 'react';
import { useInterlinerDraw } from './useInterliningDraw';
import { Stack, Typography, ToggleButtonGroup, ToggleButton, Button, ButtonGroup, Slider, Divider, Tooltip } from '@mui/material';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import DeleteIcon from '@mui/icons-material/Delete';
import { GridOn, GridOff } from '@mui/icons-material';
import { PageStack } from '../components/PageComponents';
import { Icon } from '@mdi/react';
import { mdiMagnet, mdiMagnetOn } from '@mdi/js';

export default function InterliningCanvas() {
    const canvasRef = useRef(null);

    const {
        Mode, mode, setMode,
        lines, setLines,
        radius, setRadius,
        currentColor, setCurrentColor,
        options, setOptions,
        gridSize, setGridSize,
        handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, handleRightClick,
        drawCanvas,
    } = useInterlinerDraw(canvasRef);

    useEffect(() => drawCanvas(), [drawCanvas]);

    const modeButtons = [
        { mode: Mode.NewLine, label: 'Draw New Line', icon: <ModeEditIcon /> },
        { mode: Mode.Manipulate, label: 'Manipulate', icon: <OpenWithIcon /> },
    ];

    const actions = [
        {
            label: "Clear", icon: <DeleteIcon />, action: () => {
                setLines([]);
                setMode(Mode.Manipulate);
            }
        }
    ];

    const toggles = [
        {
            value:
                "showGrid",
            label: "Toggle Grid",
            iconOn: <GridOn />,
            iconOff: <GridOff />,
            disabled: false,        
        },
        {
            value: "snapToGrid",
            label: "Snap to Grid",
            iconOn: <Icon path={mdiMagnetOn} size={1} />,
            iconOff: <Icon path={mdiMagnet} size={1} />,
            disabled: !options.includes("showGrid"),        
        },
    ];

    return (
        <PageStack>
            <Typography variant='h3'>Interlining Demo</Typography>

            <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
                <ToggleButtonGroup value={mode} exclusive onChange={(e, val) => setMode(val)}>
                    {modeButtons.map(b => (
                        <Tooltip title={b.label} key={b.mode}>
                            <ToggleButton value={b.mode}>{b.icon}</ToggleButton>
                        </Tooltip>
                    ))}
                </ToggleButtonGroup>

                <Tooltip title="Pick Line Colour">
                    <input type="color" value={currentColor} className='self-center' onChange={e => setCurrentColor(e.target.value)} />
                </Tooltip>

                <ButtonGroup>
                    {actions.map(a => (
                        <Tooltip title={a.label} key={a.label}>
                            <Button onClick={a.action}>{a.icon}</Button>
                        </Tooltip>
                    ))}
                </ButtonGroup>

                <ToggleButtonGroup value={options} onChange={(e, v) => {setOptions(v); console.log(`set options to ${v}`)}}>
                    {toggles.map(t => (
                        <Tooltip title={t.label} key={t.value}>
                            <ToggleButton disabled={t.disabled} value={t.value}>{options.includes(t.value) ? t.iconOn : t.iconOff}</ToggleButton>
                        </Tooltip>
                    ))}
                </ToggleButtonGroup>

                <Tooltip title="Curve Radius">
                    <Slider min={1} max={100} value={radius} onChange={(e, r) => setRadius(r)} valueLabelDisplay="auto" />
                </Tooltip>
            </Stack>

            <canvas
                ref={canvasRef}
                width={800}
                height={400}
                className="bg-gray-200 block touch-none max-w-full h-auto"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onContextMenu={handleRightClick}
            />
        </PageStack>
    );
}