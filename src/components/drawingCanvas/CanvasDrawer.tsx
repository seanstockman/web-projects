import { type Circle, type Point } from "../../lib/geometry/geometry2d.ts";

export type LineDrawProperties = {
    width: number,
    color: string,
    dashed: boolean
}

export type CircleDrawProperties = {
    filled: boolean,
    borderWidth: number,
    color: string,
    dashed?: boolean
}

export const drawer = {
    // drawLine: function (ctx: CanvasRenderingContext2D, line: Line, props: LineDrawProperties) {
    //     this.setLineProps(ctx, props);
    //     ctx.beginPath();
    //     ctx.moveTo(line.start.x, line.start.y);
    //     ctx.lineTo(line.end.x, line.end.y);
    //     ctx.stroke();
    //     ctx.closePath();
    // },
    // /** Draws the set of points drawn from the first line's start point to the end point of every successive line. */
    // drawConnectedLines: function (ctx: CanvasRenderingContext2D, lines: Line[], props: LineDrawProperties) {
    //     if (lines.length < 1) return;
    //     this.drawPolyline(ctx, [lines[0]!.start, ...lines.map(l => l.end)], props);
    // },
    /** Draws the set of points as a continuous line. */
    drawPolyline: function (ctx: CanvasRenderingContext2D, points: Point[], props: LineDrawProperties) {
        if (points.length < 2) return;

        this.setLineProps(ctx, props);
        ctx.beginPath();
        ctx.moveTo(points[0]!.x, points[0]!.y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i]!.x, points[i]!.y);
        }

        ctx.stroke();
        ctx.closePath();
    },

    setLineProps: function (ctx: CanvasRenderingContext2D, props: LineDrawProperties) {
        ctx.strokeStyle = props.color;
        ctx.lineWidth = props.width;
        if (props.dashed) {
            ctx.setLineDash([10, 5]);
        } else {
            ctx.setLineDash([0]);
        }
    },

    drawCircle: function (ctx: CanvasRenderingContext2D, c: Circle, props: CircleDrawProperties) {
        ctx.beginPath();
        ctx.fillStyle = props.color;
        if (props.dashed) {
            ctx.setLineDash([10, 5]);
        } else {
            ctx.setLineDash([0]);
        }
        ctx.arc(c.center.x, c.center.y, c.radius, 0, 2 * Math.PI);
        if (props.filled) {
            ctx.fill();
        } else {
            ctx.strokeStyle = props.color;
            ctx.lineWidth = props.borderWidth;
            ctx.stroke();
        }
    },

    drawGrid: function (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, gridSize: number) {
        ctx.strokeStyle = "#a7a7a7";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = gridSize; i < canvas.width - 1; i += gridSize) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
        }
        for (let j = gridSize; j < canvas.height - 1; j += gridSize) {
            ctx.moveTo(0, j);
            ctx.lineTo(canvas.width, j);
        }
        ctx.stroke();
    },

    drawText: function (ctx: CanvasRenderingContext2D, text: string, position: { x: number, y: number }, fontSize: number = 10, colour: string = "#000000") {
        ctx.fillStyle = colour;
        ctx.font = `${fontSize}px Arial`;
        ctx.fillText(text, position.x, position.y);
    }
}