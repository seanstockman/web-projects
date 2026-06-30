import { Vector2 } from "./vector-2.ts";

export class Segment {
    start: Vector2;
    end: Vector2;
    dir: Vector2 = new Vector2(0, 0);
    length = 0;

    intercept: number = 0;
    posAngleDegrees = 0;

    nudged: {
        start: Vector2,
        end: Vector2,
        dir: Vector2,
        length: number,
    };

    next: Segment | null = null;
    prev: Segment | null = null;

    key: string | null = null;
    segmentMap: Map<string, Segment[]> | null = null;
    bucket: Segment[] | null = null;

    constructor(map: Map<string, Segment[]> | null, start: Vector2, end: Vector2, prev: Segment | null = null) {
        this.segmentMap = map;
        this.start = start;
        this.end = end;
        this.dir = Vector2.zero();
        this.nudged = {
            start: prev ? prev.nudged.end : start.clone(),
            end: end.clone(),
            dir: this.dir,
            length: 0,
        }
        this.update();
        if (prev) {
            prev.next = this;
            this.prev = prev;
        }


        this.nudged.length = this.length;
    }

    /** Updates all other parameters from the start and end. */
    update() {
        this.length = this.start.distTo(this.end);
        this.dir.updateXY(
            (this.end.x - this.start.x) / this.length,
            (this.end.y - this.start.y) / this.length
        );
        this.posAngleDegrees = this.dir.angleAsNormalised();
        this.posAngleDegrees *= 180 / Math.PI;
        this.posAngleDegrees = (this.posAngleDegrees + 180) % 180;
        this.intercept = this.posAngleDegrees == 0 ? this.start.y : -(this.start.y / this.dir.y) * this.dir.x + this.start.x;

        this.pruneFromBucket();
        this.key = `angle_${this.posAngleDegrees}:x0_${this.intercept}`;
        if (this.segmentMap) {
            this.bucket = this.segmentMap.getOrInsert(this.key, []);
            this.bucket.push(this);
            interline(this.bucket);
        }
    }

    pruneFromBucket() {
        if (this.bucket == null || !this.key) return;
        const i = this.bucket.findIndex(s => s === this);
        if (i != -1) {
            this.bucket.splice(i, 1);
            if (this.bucket.length == 0) {
                this.segmentMap?.delete(this.key);
            } else {
                interline(this.bucket);
            }
        } else {
            console.error(`could not find item in bucket`);
        }
        this.bucket = null;
    }

    intersect(p1: Vector2, p2: Vector2): Vector2 {
        const p3 = this.nudged.start, p4 = this.nudged.end;
        const denominator = (p1.x - p2.x) * (p3.y * p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        console.log(`p1: ${p1.x}, ${p1.y}\np2: ${p2.x}, ${p2.y}\np3: ${p3.x}, ${p3.y}\np4: ${p4.x}, ${p4.y}`);
        if (denominator == 0) {console.error(`denom == 0`);return Vector2.zero();}
        return new Vector2(
            ((p1.x * p2.y - p1.y * p2.x) * (p3.x - p4.x)
                - (p1.x - p2.x) * (p3.x * p4.y - p3.y * p4.x))
            / denominator,
            ((p1.x * p2.y - p1.y * p2.x) * (p3.y - p4.y)
                - (p1.y - p2.y) * (p3.x * p4.y - p3.y * p4.x))
            / denominator
        );
    }

    /** Creates and appends a new segment from the end of the last segment to the new point. */
    static addPoint(s: Segment[], end: Vector2) {
        const prev = s.at(-1);
        if (!prev) {
            console.error(`no previous segment exists. cannot add new segment to array`);
            return;
        }
        s.push(new Segment(prev.segmentMap, prev.end, end, prev));
    }
}

const interliningSpacing = 10;

const interline = (bucket: Segment[]) => {
    if (bucket.length < 2) {
        bucket.forEach(s => {
            s.nudged.start.updateXY(s.start.x, s.start.y);
            s.nudged.end.updateXY(s.end.x, s.end.y);
            s.nudged.length = s.length;
        });
        return;
    }
    const midpoint = (bucket.length - 1) / 2.0;
    for (let i = 0; i < bucket.length; i++) {
        const s = bucket[i];
        if (!s) {
            console.error(`s does not exist`);
            continue;
        }
        if (!s.nudged) {
            console.error(`s.nudged does not exist`)
            continue;
        }
        const offsetOrigin = new Vector2((i - midpoint) * interliningSpacing * -s.dir.y + s.start.x,
            (i - midpoint) * interliningSpacing * s.dir.x + s.start.y);
        const offsetOther = offsetOrigin.clone();
        offsetOther.x += s.dir.x;
        offsetOther.y += s.dir.y;

        const newStart = s.prev ? s.prev.intersect(offsetOrigin, offsetOther) : offsetOrigin;
        s.nudged.start.updateXY(newStart.x, newStart.y);

        const newEnd = s.next ? s.next.intersect(offsetOrigin, offsetOther) : { x: s.end.x - s.dir.y, y: s.end.y + s.dir.x };
        s.nudged.end.updateXY(newEnd.x, newEnd.y);
        s.length = s.nudged.start.distTo(s.nudged.end);
        if (s.prev) {
            s.prev.nudged.length = s.prev.nudged.end.distTo(s.prev.nudged.start);
        }
        if (s.next) {
            s.next.nudged.length = s.next.nudged.end.distTo(s.next.nudged.start);
        }
    }
}