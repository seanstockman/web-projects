import { Segment } from "./depricated_geometry/classes/segment.ts";
import { Vector2 as Vec2 } from "./depricated_geometry/classes/vector-2.ts";
import { Line } from "./depricated_geometry/classes/line.ts";

export const drawer = {
    drawLine: function (ctx: CanvasRenderingContext2D, line: Line) {
        if (line.points.length < 2) return;
        ctx.beginPath();

        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        if (line.dash) {
            ctx.setLineDash([10, 5]);
        } else {
            ctx.setLineDash([0]);
        }
        ctx.moveTo(line.points[0]!.x, line.points[0]!.y);

        for (let i = 1; i < line.points.length; i++) {
            ctx.lineTo(line.points[i]!.x, line.points[i]!.y);
        }

        ctx.stroke();
        ctx.closePath();
    },
    drawInterlinedLines: function (ctx: CanvasRenderingContext2D, lines: Line[],
        radius: number, lineWidth = 8) {
        lines.forEach(l => drawer.drawCurvedLine(ctx, l.segments, radius, l.color, lineWidth));
    },
    drawCurvedLine: function (ctx: CanvasRenderingContext2D, segments: Segment[],
        maxRadius: number, colour: string, lineWidth: number) {
        if (segments.length < 1) return;

        ctx.strokeStyle = colour;
        ctx.lineWidth = lineWidth;

        let startPoint = segments[0]!.nudged.start;
        if (segments.length == 1) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            const end = segments[0]!.nudged.end;
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            return;
        }

        const debugCircles = [];

        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        for (let i = 0; i < segments.length; i++) {
            // going to draw the previous straight line segment and the arc at the end
            // assume already in right spot (end of the circle of the previous)

            const curr = segments[i]?.nudged;
            if (!curr) { console.error(`no seg ${i}`); continue; }

            if (i == segments.length - 1) {
                ctx.lineTo(curr.end.x, curr.end.y);
                break;
            }


            // compute circle
            let maxHalfLength = getMaximumHalfLength(segments[i]);
            const next = segments[i + 1]?.nudged;
            if (!next) continue;

            // ctx.lineTo(seg.end.x, seg.end.y);
            // continue;
            // const theta = seg.dir.clone().multiplyScalar(-1).angleTo(nextSeg.dir);
            const nextSegAngle = next.dir.angleAsNormalised();
            const thisSegAngle = curr.dir.angleAsNormalised() + Math.PI;
            let theta = thisSegAngle - nextSegAngle;
            if (theta > Math.PI) theta = 2 * Math.PI - theta;
            theta = Math.abs(theta);

            let r = maxHalfLength * Math.tan(theta / 2);
            if (r < 0) {
                console.error(`r < 0; theta = ${theta}\nr = ${r}\nmhl=${maxHalfLength}`);
            }

            if (r > maxRadius) {
                r = maxRadius;
                maxHalfLength = r / Math.tan(theta / 2);
            }

            // line to start of circle
            const lineLength = curr.length - maxHalfLength;
            const lineEndX = curr.start.x + curr.dir.x * lineLength;
            const lineEndY = curr.start.y + curr.dir.y * lineLength;

            if (startPoint.x != lineEndX || startPoint.y != lineEndY) {
                ctx.lineTo(lineEndX, lineEndY);
            }

            // const nextLineStart = nextSeg.start.clone().add(nextSeg.dir.clone().multiplyScalar(maxHalfLength));
            const nextLineStart = new Vec2(
                next.start.x + next.dir.x * maxHalfLength,
                next.start.y + next.dir.y * maxHalfLength
            );


            if (lineEndX != nextLineStart.x || lineEndY != nextLineStart.y) {
                const side = -Math.sign(curr.dir.dotValues(-next.dir.y, next.dir.x));

                const circleCentre = nextLineStart.clone();
                circleCentre.x += side * r * -next.dir.y;
                circleCentre.y += side * r * next.dir.x;
                // .add(dirPerp.multiplyScalar(side * r));

                // drawer.drawCircle(ctx, circleCentre, true, 0, r);
                debugCircles.push({ centre: circleCentre, r: r });


                // rotated 90 = -y, x

                // const nextAngle = nextSeg.dir.angleAsNormalised();
                // const prevAngle = seg.dir.angleAsNormalised();


                if (r > 0) {
                    if (side > 0) {
                        ctx.arc(circleCentre.x, circleCentre.y, r, thisSegAngle + Math.PI * 0.5, nextSegAngle - Math.PI * 0.5);
                    } else {
                        ctx.arc(circleCentre.x, circleCentre.y, r, thisSegAngle - Math.PI * 0.5, nextSegAngle + Math.PI * 0.5, true);
                    }
                }
                // }

                // move marker to new start
                ctx.moveTo(nextLineStart.x, nextLineStart.y);
                startPoint = nextLineStart;
                // ctx.moveTo(nextLineStart.x, nextLineStart.y);
                // continue;
            }
        }
        ctx.stroke();
        // debugCircles.forEach(c => {
        //     drawer.drawCircle(ctx, c.centre, true, 0, c.r);
        // });
    },
    drawLinesStartOnly: function (ctx: CanvasRenderingContext2D, lines: Line[]) {
        lines.forEach(l => l.points.forEach(p => drawer.drawCircle(ctx, p, true, 0, 4, '#0095ff')));
    },
    drawCircle: function (ctx: CanvasRenderingContext2D, p: Vec2, filled = true,
        lineWidth = 2, radius = 5, colour = '#aabbcc') {
        ctx.beginPath();
        ctx.fillStyle = colour;
        ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
        if (filled) {
            ctx.fill();
        } else {
            ctx.strokeStyle = colour;
            ctx.lineWidth = lineWidth;
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
    drawText: function (ctx: CanvasRenderingContext2D,text: string,  position: {x: number, y:number}, offset: {x: number, y: number} = {x:0,y:0}, size: number = 10) {
        ctx.fillStyle = "#000000";
        // ctx.font
        ctx.fillText(text, position.x + offset.x, position.y + offset.y, size);
    },
}

/**
 * Returns the smallest of the two lengths of the segments adjacent to the end of this segment, halved.
 */
function getMaximumHalfLength(segment: Segment | undefined): number {
    if (!segment) return 0;
    let minHalfLen = segment.nudged.length / 2;
    if (!segment.next) return minHalfLen;
    minHalfLen = Math.min(minHalfLen, segment.next.nudged.length / 2);
    return minHalfLen;
};