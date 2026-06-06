import { Segment } from "./classes/segment.js";
import { Vector2 as Vec2 } from "./classes/vector-2.js";

export class Line {
    segments: Segment[] = [];
    points: Vec2[] = [];
    color: string = "#ffffff";

    constructor(points: Vec2[], color: string | null = null) {
        this.points = points;
        if (color) this.color = color;
        // create segments
        for (let i = 1; i < points.length; i++) {
            const curr = points[i];
            if (!curr) return;
            if (i == 1) {
                const prevPoint = points[i-1];
                if (!prevPoint) return;
                this.segments = [new Segment(prevPoint, curr)];
            } else {
                Segment.addPoint(this.segments, curr);
            }
        }
        console.log(this.segments);
    }
}