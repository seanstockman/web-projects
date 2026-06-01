import { Vector2 } from "three";
import type { ArcLine, Point, Segment } from "./useInterliningDraw.js";

export const drawer = {
    drawInterlinedLines: function (ctx: CanvasRenderingContext2D, lines: ArcLine[],
        radius: number, lineWidth = 8) {
        interline(lines).forEach(l => drawer.drawLine(ctx, l.line, l.segments, radius, l.color, lineWidth));
    },
    drawLine: function (ctx: CanvasRenderingContext2D, line: Point[], segments: Segment[],
        maxRadius: number, colour: string, lineWidth: number) {
        if (line.length < 2) return;

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

        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        for (let i = 0; i < segments.length; i++) {
            // going to draw the previous straight line segment and the arc at the end
            // assume already in right spot (end of the circle of the previous)


            const seg = segments[i];
            if (!seg) continue;

            if (i == segments.length - 1) {
                ctx.lineTo(seg.end.x, seg.end.y);
                break;
            }
            // compute circle
            let maxHalfLength = getMaximumHalfLength(line, i + 1, segments);
            const nextSeg = segments[i + 1];
            if (!nextSeg) continue;
            const theta = seg.dir.clone().multiplyScalar(-1).angleTo(nextSeg.dir);
            let r = maxHalfLength * Math.tan(theta / 2);
            if (r > maxRadius) {
                r = maxRadius;
                maxHalfLength = r / Math.tan(theta / 2);
            }

            // line to start of circle
            const lineEnd = seg.start.clone().add(seg.dir.clone().multiplyScalar(seg.len - maxHalfLength));
            if (startPoint.x != lineEnd.x || startPoint.y != lineEnd.y) {
                ctx.lineTo(lineEnd.x, lineEnd.y);
            }

            const nextLineStart = nextSeg.start.clone().add(nextSeg.dir.clone().multiplyScalar(maxHalfLength));

            if (lineEnd.x != nextLineStart.x || lineEnd.y != nextLineStart.y) {
                const dirPerp = nextSeg.dir.clone().rotateAround(new Vector2(0, 0), Math.PI / 2);
                const prevDirPerp = seg.dir.clone().rotateAround(new Vector2(0, 0), Math.PI / 2);
                const side = -Math.sign(seg.dir.dot(dirPerp));

                const circleCentre = nextLineStart.clone().add(dirPerp.multiplyScalar(side * r));

                // FIXME:
                if (side > 0) {
                    ctx.arc(circleCentre.x, circleCentre.y, r, prevDirPerp.angle() + Math.PI, dirPerp.angle() + Math.PI);
                } else {
                    ctx.arc(circleCentre.x, circleCentre.y, r, prevDirPerp.angle(), dirPerp.angle() + Math.PI, true);
                }
            }

            // move marker to new start
            ctx.moveTo(nextLineStart.x, nextLineStart.y);
            startPoint = nextLineStart;
        }
        ctx.stroke();
    },
    drawCircle: function (ctx: CanvasRenderingContext2D, p: Point, filled = true,
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

export const lineMaths = {
    getSegments(line: Point[]) {
        let segments: Segment[] = [];
        for (let i = 0; i < line.length - 1; i++) {
            segments[i] = {} as Segment;
            const s = segments[i];
            const curr = line[i];
            const next = line[i + 1];
            if (!s || !curr || !next) continue;
            s.start = new Vector2(curr.x, curr.y);
            s.end = new Vector2(next.x, next.y);
            s.len = s.start.distanceTo(s.end);
            s.dir = s.end.clone().sub(s.start).normalize();
            s.xIntAngleDegrees = (s.dir.angle() * 180 / Math.PI) % 180; // insert these into a hash?
            s.x0 = s.xIntAngleDegrees == 0 ? -1 : -(s.start.y / s.dir.y) * s.dir.x + s.start.x;        // insert these into a hash?
            // console.log(`i: ${i}, x0: ${s.x0}, theta: ${s.xIntAngleDegrees}`);
        }
        return segments;
    }
}

function getMaximumHalfLength(line: Point[], i: number, lineInfo: Segment[]): number {
    // if (!lineInfo[i - 1]?.len) return 0;
    if (!lineInfo[i]) return 0;
    let minHalfLen = -1;
    if (i != 0) {
        minHalfLen = lineInfo[i - 1]!.len / 2;
    }
    if (i < line.length - 1) { // next line exists
        if (minHalfLen == -1) {
            minHalfLen = lineInfo[i].len / 2;
            return 0;
        }
        minHalfLen = Math.min(lineInfo[i].len / 2, minHalfLen);
    }
    return minHalfLen;
};

const interline = (lines: ArcLine[]) => {
    return lines;


    const updated = [...lines];
    // let n = 0;
    // // for every line, for every segment
    // for (let i = 0; i < updated.length - 1; i++) {
    //     const line = updated[i];
    //     if (!line) continue;
    //     for (let a = 0; a < line.segments.length; a++) {
    //         for (let j = i + 1; j < updated.length; j++) {
    //             for (let b = 0; b < updated[j].segments.length; b++) {
    //                 const segA = updated[i].segments[a];
    //                 const segB = updated[j].segments[b];
    //                 if (!segA.start.equals(segB.start) ||
    //                     !segA.end.equals(segB.end)
    //                 ) continue;
    //                 n++;
    //                 console.log(`intersection btw ${i} and ${j}`);
    //             }
    //         }
    //     }
    // }
    // console.log(`${n} intersections found`);
    return updated;
}