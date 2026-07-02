import { Vector2 } from "./vector-2.ts";

export class Point extends Vector2 {
    connections: Point[] = [];

    /** Connects this point to the other given point (on both connections arrays) */
    addConnection(p: Point) {
        if (!p.connections.includes(this)) {
            p.connections.push(this);
        }
        if (!this.connections.includes(p)) {
            this.connections.push(p);
        }
    }

    /** Removes the connection between this point and the other point. */
    removeConnection(p: Point): void {
        if (this.connections.includes(p)) {
            this.connections.splice(this.connections.findIndex(v => v == p), 1);
        }
        if (p.connections.includes(this)) {
            p.connections.splice(p.connections.findIndex(v => v == this), 1);
        }
    }
}