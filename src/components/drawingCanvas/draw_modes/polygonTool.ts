import PentagonOutlinedIcon from '@mui/icons-material/PentagonOutlined';
import type { Vec2 } from "../../../lib/geometry/geometry2d.ts";
import type { CanvasDrawContext, DrawMode, SelectableDrawMode } from "./types.ts";

/** The toolbar-selectable entry point: click once to place the line's start,
 * which immediately hands off to LineContinue below. */
export class PolygonStart implements SelectableDrawMode {
    readonly id = 'polygonDraw';
    readonly label = 'Draw Polygon';
    readonly icon = PentagonOutlinedIcon;

    handleMouseMove(ctx: CanvasDrawContext, mouse: Vec2) {
        ctx.setCursor(mouse);
    }

    handleMouseDown(ctx: CanvasDrawContext, mouse: Vec2) {
        ctx.setCursor(null);
        ctx.setPoints(prev => [...prev, mouse, { ...mouse }]);
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
    handleMouseMove(ctx: CanvasDrawContext, mouse: Vec2) {
        ctx.setLines(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const last = [...updated[updated.length - 1]!];
            last[last.length - 2] = mouse;
            updated[updated.length - 1] = last;
            return updated;
        });
        ctx.setPoints(prev => {
            const updated = prev;
            updated[prev.length - 1] = mouse;
            return updated;
        });
        ctx.setMovedPoint(mouse);
    }

    handleMouseDown(ctx: CanvasDrawContext, mouse: Vec2) {
        ctx.setLines(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const last = updated[updated.length - 1]!;
            updated[updated.length - 1]!.splice(last.length - 2, 0, mouse);
            return updated;
        });
        ctx.setPoints(prev => {
            const updated = [...prev];
            updated.splice(updated.length - 1, 0, mouse);
            return updated;
        })
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
            // console.log(`updated line`);
            // console.log(last);
            return updated;
        });
        ctx.setPoints(prev => {
            return prev.slice(0, -1);

            const updated = [...prev];
            updated.splice(-2, 1);
            // console.log(updated);
            console.log(`updated points`);
            console.log(updated);
            return updated;
        });
        ctx.setDrawMode(polygonStartMode);
    }
}

export const polygonStartMode = new PolygonStart();
export const polygonContinueMode = new PolygonContinue();