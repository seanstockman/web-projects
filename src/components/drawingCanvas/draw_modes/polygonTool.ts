import PentagonOutlinedIcon from '@mui/icons-material/PentagonOutlined';
import type { Point } from "../../../lib/geometry/geometry2d.ts";
import type { CanvasDrawContext, DrawMode, SelectableDrawMode } from "./types.ts";

/** The toolbar-selectable entry point: click once to place the line's start,
 * which immediately hands off to LineContinue below. */
export class PolygonStart implements SelectableDrawMode {
    readonly id = 'polygonDraw';
    readonly label = 'Draw Polygon';
    readonly icon = PentagonOutlinedIcon;

    handleMouseMove(ctx: CanvasDrawContext, mouse: Point) {
        ctx.setCursor(mouse);
    }

    handleMouseDown(ctx: CanvasDrawContext, mouse: Point) {
        ctx.setCursor(null);
        ctx.setLines(prev => [...prev, [mouse, { ...mouse }, mouse]]);
        ctx.setDrawMode(polygonContinueMode);
    }

    handleMouseLeave(ctx: CanvasDrawContext) {
        ctx.setCursor(null);
    }
}

/** Internal-only continuation state — never appears in a toolbar, only ever
 * reached via LineStart.handleMouseDown, so it implements plain DrawMode
 * (no id/label/icon required). */
export class PolygonContinue implements DrawMode {
    handleMouseMove(ctx: CanvasDrawContext, mouse: Point) {
        ctx.setLines(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const last = [...updated[updated.length - 1]!];
            last[last.length - 2] = mouse;
            updated[updated.length - 1] = last;
            return updated;
        });
        ctx.setMovedPoint(mouse);
    }

    handleMouseDown(ctx: CanvasDrawContext, mouse: Point) {
        ctx.setLines(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const last = updated[updated.length - 1]!;
            updated[updated.length - 1]!.splice(last.length - 1, 0, { ...mouse });
            return updated;
        });
    }

    handleRightClick(ctx: CanvasDrawContext) {
        ctx.setLines(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const last = [...updated[updated.length - 1]!];
            last.splice(last.length - 2, 1); // drop the uncommitted, cursor-following point
            if (last.length < 2) {
                updated.pop(); // not enough real points to keep the line
            } else {
                updated[updated.length - 1] = last;
            }
            return updated;
        });
        ctx.setDrawMode(polygonStartMode);
    }
}

export const polygonStartMode = new PolygonStart();
export const polygonContinueMode = new PolygonContinue();