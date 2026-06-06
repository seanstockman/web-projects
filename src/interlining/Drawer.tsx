import { Segment } from "./classes/segment.js";
import { Vector2 as Vec2 } from "./classes/vector-2.js";
import { Line } from "./line.js";

export const drawer = {
    drawInterlinedLines: function (ctx: CanvasRenderingContext2D, lines: Line[],
        radius: number, lineWidth = 8) {
        interline(lines).forEach(l => drawer.drawLine(ctx, l.segments, radius, l.color, lineWidth));
    },
    drawLine: function (ctx: CanvasRenderingContext2D, segments: Segment[],
        maxRadius: number, colour: string, lineWidth: number) {
        if (segments.length < 1) return;

        ctx.strokeStyle = colour;
        ctx.lineWidth = lineWidth;

        let startPoint = segments[0]!.start;
        // console.log(`last segment (i = ${segments.length - 1}):`);
        // console.log(segments[segments.length - 1]);
        if (segments.length == 1) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(segments[0]!.end.x, segments[0]!.end.y);
            ctx.stroke();
            return;
        }

        const debugCircles = [];

        console.log(`dl claled`);
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        for (let i = 0; i < segments.length; i++) {
            // going to draw the previous straight line segment and the arc at the end
            // assume already in right spot (end of the circle of the previous)

            const seg = segments[i];
            if (!seg) { console.log(`no seg ${i}`); continue; }


            if (i == segments.length - 1) {
                ctx.lineTo(seg.end.x, seg.end.y);
                break;
            }


            // compute circle
            let maxHalfLength = getMaximumHalfLength(segments[i]);
            const nextSeg = segments[i + 1];
            if (!nextSeg) continue;

            // ctx.lineTo(seg.end.x, seg.end.y);
            // continue;
            // const theta = seg.dir.clone().multiplyScalar(-1).angleTo(nextSeg.dir);
            const nextSegAngle = nextSeg.dir.angleAsNormalised();
            const thisSegAngle = seg.dir.angleAsNormalised() + Math.PI;
            let theta = thisSegAngle - nextSegAngle;
            if (theta > Math.PI) theta = 2 * Math.PI - theta;
            theta = Math.abs(theta);

            let r = maxHalfLength * Math.tan(theta / 2);
            if (r < 0) {
                console.log(`r < 0; theta = ${theta}\nr = ${r}\nmhl=${maxHalfLength}`);
            }

            if (r > maxRadius) {
                r = maxRadius;
                maxHalfLength = r / Math.tan(theta / 2);
            }

            // line to start of circle
            const lineLength = seg.length - maxHalfLength;
            const lineEndX = seg.start.x + seg.dir.x * lineLength;
            const lineEndY = seg.start.y + seg.dir.y * lineLength;

            if (startPoint.x != lineEndX || startPoint.y != lineEndY) {
                ctx.lineTo(lineEndX, lineEndY);
            }

            // const nextLineStart = nextSeg.start.clone().add(nextSeg.dir.clone().multiplyScalar(maxHalfLength));
            const nextLineStart = new Vec2(
                nextSeg.start.x + nextSeg.dir.x * maxHalfLength,
                nextSeg.start.y + nextSeg.dir.y * maxHalfLength
            );


            if (lineEndX != nextLineStart.x || lineEndY != nextLineStart.y) {
                const side = -Math.sign(seg.dir.dotValues(-nextSeg.dir.y, nextSeg.dir.x));

                const circleCentre = nextLineStart.clone();
                circleCentre.x += side * r * -nextSeg.dir.y;
                circleCentre.y += side * r * nextSeg.dir.x;
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
}

/**
 * Returns the smallest of the two lengths of the segments adjacent to the end of this segment, halved.
 */
function getMaximumHalfLength(segment: Segment | undefined): number {
    if (!segment) return 0;
    let minHalfLen = segment.length / 2;
    if (!segment.next) return minHalfLen;
    minHalfLen = Math.min(minHalfLen, segment.next.length / 2);
    return minHalfLen;
};

const interline = (lines: Line[]) => {
    return lines;
    // const updated = [...lines];



    // let n = 0;
    // // for every line, for every segment
    // for (let i = 0; i < updated.length - 1; i++) {
    //     const lineA = updated[i];
    //     if (!lineA) continue;
    //     for (let a = 0; a < lineA.segments.length; a++) {
    //         const segA = lineA.segments[a];
    //         for (let j = i + 1; j < updated.length; j++) {
    //             const lineB = updated[j];
    //             if (!lineB) continue;
    //             for (let b = 0; b < lineB.segments.length; b++) {
    //                 const segB = lineB.segments[b];
    //                 if (segA?.x0 != segB?.x0) continue;
    //                 if (segA?.xIntAngleDegrees != segB?.xIntAngleDegrees) continue;
    //                 lineA.line[a]!.x += 5;
    //                 lineA.line[a + 1]!.x += 5;
    //                 lineB.line[b]!.x -= 5;
    //                 lineB.line[b + 1]!.x -= 5;
    //                 n++;
    //                 console.log(`intersection btw ${i} and ${j}`);
    //             }
    //         }
    //     }
    // }
    // console.log(`${n} intersections found`);
    // return updated;
}