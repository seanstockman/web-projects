import { Vector2 } from "three";

/**
 * @typedef {Object} Segment
 * @property {Vector2} start
 * @property {Vector2} end
 * @property {Vector2} dir
 * @property {number} len
 */

const lineMaths = {
    getMaximumHalfLength(/** @type {Point[]} */ line, /** @type number */ i, /** @type Segment[] */ lineInfo) {
        let maxRad = -1;
        if (i != 0) {
            maxRad = lineInfo[i - 1].len / 2;
        }
        if (i < line.length - 1) { // next line exists
            if (maxRad == -1) {
                maxRad = lineInfo[i].len / 2;
                return;
            }
            maxRad = Math.min(lineInfo[i].len / 2, maxRad);
        }
        return maxRad;
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

export default lineMaths;