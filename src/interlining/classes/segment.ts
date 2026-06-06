import { Vector2 } from "./vector-2.js";

export class Segment {
    start: Vector2;
    end: Vector2;
    dir: Vector2 = new Vector2(0, 0);
    length = 0;
    x0: number | null = 0;
    posAngleDegrees = 0;
    updatedStart: Vector2 | null = null;
    updatedEnd: Vector2 | null = null;
    next: Segment | null = null;
    prev: Segment | null = null;

    key: string | null = null;
    segmentMap: Map<string, Segment> | null = null;

    constructor(start: Vector2, end: Vector2, prev: Segment | null = null) {
        this.start = start;
        this.end = end;
        this.update();
        if (prev) {
            prev.next = this;
            this.prev = prev;
        }
    }

    /** Updates all other parameters from the start and end. */
    update() {
        this.length = this.start.distTo(this.end);
        this.dir = new Vector2(
            (this.end.x - this.start.x) / this.length,
            (this.end.y - this.start.y) / this.length
        );
        this.posAngleDegrees = Math.asin(this.dir.y);
        this.posAngleDegrees = (this.posAngleDegrees * 180 / Math.PI) % 180;
        this.x0 = this.posAngleDegrees == 0 ? null : -(this.start.y / this.dir.y) * this.dir.x + this.start.x;
        this.key = `angle_${this.posAngleDegrees}:x0_${this.x0}`;
    }

    /** Creates and appends a new segment from the end of the last segment to the new point. */
    static addPoint(s: Segment[], end: Vector2) {
        const prev = s.at(-1);
        if (!prev) {
            console.error(`no previous segment exists. cannot add new segment to array`);
            return;
        }
        s.push(new Segment(prev.end, end, prev));
    }
}