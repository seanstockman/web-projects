import { Vector2 } from "three";

/**
 * @typedef {Object} Segment
 * @property {Vector2} start
 * @property {Vector2} end
 * @property {Vector2} dir
 * @property {number} len
 */

export const lineMaths = {
    getMaximumHalfLength(/** @type {Point[]} */ line, /** @type number */ i, /** @type Segment[] */ lineInfo) {
        let minHalfLen = -1;
        if (i != 0) {
            minHalfLen = lineInfo[i - 1].len / 2;
        }
        if (i < line.length - 1) { // next line exists
            if (minHalfLen == -1) {
                minHalfLen = lineInfo[i].len / 2;
                return;
            }
            minHalfLen = Math.min(lineInfo[i].len / 2, minHalfLen);
        }
        return minHalfLen;
    },
    getSegments(/** @type {Point[]} */ line) {
        /**@type Segment[] */
        let lineInfo = [];
        for (let i = 0; i < line.length - 1; i++) {
            lineInfo[i] = {};
            const li = lineInfo[i];
            li.start = new Vector2(line[i].x, line[i].y);
            li.end = new Vector2(line[i + 1].x, line[i + 1].y);
            li.len = li.start.distanceTo(li.end);
            li.dir = li.end.clone().sub(li.start).normalize();
        }
        return lineInfo;
    }
}

export const drawer = {
    drawLine: function (/** @type {CanvasRenderingContext2D} */ctx, /** @type {Point[]} */ line, maxRadius, colour, curveDebugColour = null) {
        if (line.length < 2) return;

        ctx.strokeStyle = colour;
        ctx.lineWidth = 8;

        const segments = lineMaths.getSegments(line);
        let startPoint = segments[0].start;
        // console.log(`last segment (i = ${segments.length - 1}):`);
        // console.log(segments[segments.length - 1]);
        if (segments.length == 1) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(segments[0].end.x, segments[0].end.y);
            ctx.stroke();
            return;
        }

        // ctx.beginPath();
        // ctx.moveTo(startPoint.x, startPoint.y);
        for (let i = 0; i < segments.length; i++) {
            // going to draw the previous straight line segment and the arc at the end
            // assume already in right spot (end of the circle of the previous)
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.strokeStyle = colour; // straight line colour

            const seg = segments[i];

            if (i == segments.length - 1) {
                ctx.lineTo(seg.end.x, seg.end.y);
                ctx.stroke();
                break;
            }
            // compute circle

            let maxHalfLength = lineMaths.getMaximumHalfLength(line, i + 1, segments);
            const nextSeg = segments[i + 1];
            const theta = seg.dir.clone().multiplyScalar(-1).angleTo(nextSeg.dir);
            let r = maxHalfLength * Math.tan(theta / 2);
            if (r > maxRadius) {
                r = maxRadius;
                maxHalfLength = r / Math.tan(theta / 2);
            }


            const dirPerp = nextSeg.dir.clone().rotateAround(new Vector2(0, 0), Math.PI / 2);
            const prevDirPerp = seg.dir.clone().rotateAround(new Vector2(0, 0), Math.PI / 2);

            // line to start of circle
            const lineEnd = seg.start.clone().add(seg.dir.clone().multiplyScalar(seg.len - maxHalfLength));
            ctx.lineTo(lineEnd.x, lineEnd.y);
            ctx.stroke();

            const nextLineStart = nextSeg.start.clone().add(nextSeg.dir.clone().multiplyScalar(maxHalfLength));
            const side = -Math.sign(seg.dir.dot(dirPerp));

            const circleCentre = nextLineStart.clone().add(dirPerp.multiplyScalar(side * r));
            // this.drawCircle(ctx, circleCentre, r, 'blue'); 

            ctx.beginPath();
            if (curveDebugColour) { ctx.strokeStyle = curveDebugColour };
            if (side == 1) {
                ctx.arc(circleCentre.x, circleCentre.y, r, prevDirPerp.angle() + Math.PI, dirPerp.angle() + Math.PI);
            } else {
                ctx.arc(circleCentre.x, circleCentre.y, r, dirPerp.angle() + Math.PI, prevDirPerp.angle());
            }

            // ctx.moveTo(lineEnd.x, lineEnd.y);
            // ctx.lineTo(seg.end.x, seg.end.y);
            // ctx.lineTo(nextLineStart.x, nextLineStart.y);
            ctx.stroke();

            // move marker to new start
            startPoint = nextLineStart;
        }

        // ctx.moveTo(line[0].x, line[0].y);
        // for (let i = 1; i < line.length; i++) {
        //     const maxHalfLength = lineMaths.getMaximumHalfLength(line, i, lineInfo, maxCurveRadius);
        //     // draw lines from midpoint
        //     if (i == 1) {
        //         ctx.moveTo(line[0].x, line[0].y);
        //     } else {
        //         const prevSeg = lineInfo[i-1];
        //         const midpoint = prevSeg.start + prevSeg.len * 0.5 * prevSeg.dir;
        //         ctx.moveTo(midpoint.x, midpoint.y);
        //     }
        //     // draw to start of circle.

        //     ctx.lineTo();


        //     // const distToNext

        //     // const minDist = Math.min();-


        //     ctx.lineTo(line[i].x, line[i].y);
        // }
    },
    drawCircle: function (
        /** @type {CanvasRenderingContext2D} */ ctx,
        p, filled = true, strokeWidth = 2, radius = 5, colour = '#aabbcc') {
        ctx.beginPath();
        ctx.fillStyle = colour;
        ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
        if (filled) {
            ctx.fill();
        } else {
            ctx.strokeStyle = colour;
            ctx.lineWidth = strokeWidth;
            ctx.stroke();
        }

    }
}