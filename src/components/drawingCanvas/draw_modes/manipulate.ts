import OpenWithIcon from '@mui/icons-material/OpenWith';
import type { Point } from "../../../lib/geometry/geometry2d.ts";
import type { CanvasDrawContext, SelectableDrawMode } from "./types.ts";

export class Manipulate implements SelectableDrawMode {
    readonly id = 'manipulate';
    readonly label = 'Move points';
    readonly icon = OpenWithIcon;

    handleMouseMove(ctx: CanvasDrawContext, mouse: Point) {
        ctx.setCursor(mouse);
        if (!ctx.movedPoint) return;

        ctx.movedPoint.x = mouse.x;
        ctx.movedPoint.y = mouse.y;

        // if (ctx.draggedTarget.type === 'point') {
        //     const index = ctx.draggedTarget.index;
        //     ctx.setPoints(prev => {
        //         const updated = [...prev];
        //         updated[index] = mouse;
        //         return updated;
        //     });
        // } else {
        //     const { lineIndex, pointIndex } = ctx.draggedTarget;
        //     ctx.setLines(prev => {
        //         const updated = [...prev];
        //         const line = updated[lineIndex];
        //         if (!line) return prev;
        //         const updatedLine = [...line];
        //         updatedLine[pointIndex] = mouse;
        //         updated[lineIndex] = updatedLine;
        //         return updated;
        //     });
        // }
        // ctx.setMovedPoint(mouse);
    }

    handleMouseDown(ctx: CanvasDrawContext, mouse: Point) {
        ctx.setMovedPoint(ctx.findNearestPoint(mouse));
    }

    handleMouseUp(ctx: CanvasDrawContext) {
        console.log(`mouse up!`);
        ctx.setMovedPoint(null);
    }

    handleMouseLeave(ctx: CanvasDrawContext) {
        ctx.setMovedPoint(null);
    }
}

export const manipulateMode = new Manipulate();