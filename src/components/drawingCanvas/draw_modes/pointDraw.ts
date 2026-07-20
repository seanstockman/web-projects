import WorkspacesIcon from '@mui/icons-material/Workspaces';
import type { Point } from "../../../lib/geometry/geometry2d.ts";
import type { CanvasDrawContext, SelectableDrawMode } from "./types.ts";

export class PointDraw implements SelectableDrawMode {
    readonly id = 'pointDraw';
    readonly label = 'Place points';
    readonly icon = WorkspacesIcon;

    handleMouseMove(ctx: CanvasDrawContext, mouse: Point) {
        ctx.setCursor(mouse);
    }

    handleMouseDown(ctx: CanvasDrawContext, mouse: Point) {
        ctx.setPoints(prev => [...prev, mouse]);
    }

    handleMouseLeave(ctx: CanvasDrawContext) {
        ctx.setCursor(null);
    }
}

export const pointDrawMode = new PointDraw();