import { Typography, Stack, Divider, ToggleButtonGroup, Tooltip, ToggleButton, ButtonGroup, Button, Slider } from '@mui/material';
import './App.css';
import { PageStack } from './components/PageComponents.tsx';

function App() {
  return (
    <PageStack>
      <Typography variant='h4'>Work in progress...Choose a project under Projects to check out!</Typography>

      {/* <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
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

        <ToggleButtonGroup value={options} onChange={(e, v) => { setOptions(v); console.log(`set options to ${v}`) }}>
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
      /> */}
    </PageStack>
  )
}

export default App
