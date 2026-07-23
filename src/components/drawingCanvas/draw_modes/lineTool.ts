import PolylineIcon from '@mui/icons-material/Polyline';
import type { Point } from "../../../lib/geometry/geometry2d.ts";
import type { CanvasDrawContext, DrawMode, SelectableDrawMode } from "./types.ts";

/** The toolbar-selectable entry point: click once to place the line's start,
 * which immediately hands off to LineContinue below. */
export class LineStart implements SelectableDrawMode {
    readonly id = 'lineDraw';
    readonly label = 'Draw lines';
    readonly icon = PolylineIcon;

    handleMouseMove(ctx: CanvasDrawContext, mouse: Point) {
        ctx.setCursor(mouse);
    }

    handleMouseDown(ctx: CanvasDrawContext, mouse: Point) {
        ctx.setCursor(null);
        ctx.setPoints(prev => [...prev, mouse, { ...mouse }]);
        ctx.setLines(prev => [...prev, [mouse, { ...mouse }]]);
        ctx.setDrawMode(lineContinueMode);
    }

    handleMouseLeave(ctx: CanvasDrawContext) {
        ctx.setCursor(null);
    }
}

/** Internal-only continuation state — never appears in a toolbar, only ever
 * reached via LineStart.handleMouseDown, so it implements plain DrawMode
 * (no id/label/icon required). */
export class LineContinue implements DrawMode {
    handleMouseMove(ctx: CanvasDrawContext, mouse: Point) {
        // ctx.movedPoint!.x = mouse.x;
        // ctx.movedPoint!.y = mouse.y;
        ctx.setLines(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const last = [...updated[updated.length - 1]!];
            last[last.length - 1] = mouse;
            updated[updated.length - 1] = last;
            return updated;
        });
        ctx.setPoints(prev => {
            const updated = prev;
            updated[prev.length - 1] = mouse;
            return updated;
        });
    }

    handleMouseDown(ctx: CanvasDrawContext, mouse: Point) {
        ctx.setLines(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[updated.length - 1] = [...updated[updated.length - 1]!, { ...mouse }];
            return updated;
        });
        ctx.setPoints(prev => {
            const updated = [...prev];
            updated.push({...mouse});
            return updated;
        })
    }

    handleRightClick(ctx: CanvasDrawContext) {
        ctx.setLines(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const last = [...updated[updated.length - 1]!];
            last.pop(); // drop the uncommitted, cursor-following point
            if (last.length < 2) {
                updated.pop(); // not enough real points to keep the line
            } else {
                updated[updated.length - 1] = last;
            }
            return updated;
        });
        ctx.setPoints(prev => {
            return prev.slice(0, -1);
        });
        ctx.setDrawMode(lineStartMode);
    }
}

export const lineStartMode = new LineStart();
export const lineContinueMode = new LineContinue();