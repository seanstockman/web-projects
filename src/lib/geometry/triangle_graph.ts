import * as poly2tri from "poly2tri";
import { type Point } from "./geometry2d.ts"

export type Vertex = Point & {
    connections: number[],
    steiner: boolean // whether this is not part of the original
}

export type VectorTuple = [Vertex, Vertex, Vertex];

export type Triangle = [number, number, number];

export class TriangleGraph {
    public vertices: Vertex[];
    public triangles: Triangle[];

    constructor(points: Point[], triangles: poly2tri.Triangle[]) {
        this.vertices = points.map(p => ({ x: p.x, y: p.y, connections: [], steiner: false }));

        this.triangles = [];
        triangles.forEach(t => {
            const trianglePointIndices = t.getPoints().map(p => this.vertices.findIndex(v => v.x == p.x && v.y == p.y));
            this.triangles.push(trianglePointIndices as Triangle);
        });

        this.triangles.forEach(t => {
            this.connectVertices(t[0], t[1]);
            this.connectVertices(t[1], t[2]);
            this.connectVertices(t[2], t[0]);
        })

        // console.log(this);
    }

    /** Connects two vertices's references to each other. Does not create triangles. */
    public connectVertices(A: number, B: number) {
        const vertexA = this.vertices[A], vertexB = this.vertices[B];
        if (!vertexA || !vertexB) { console.error(`vertex ${A} or ${B} does not exist`); return; }

        if (!vertexA.connections.includes(B)) vertexA.connections.push(B);
        if (!vertexB.connections.includes(A)) vertexB.connections.push(A);
    }

    /** Disconnects two vertices's references from each other. Does not remove triangles. */
    public disconnectVertices(A: number, B: number) {
        const vertexA = this.vertices[A], vertexB = this.vertices[B];
        if (!vertexA || !vertexB) { console.error(`vertex ${A} or ${B} does not exist`); return; }

        vertexA.connections = vertexA.connections.filter(v => v != B);
        vertexB.connections = vertexB.connections.filter(v => v != A);
    }

    public getVertices(t: Triangle): VectorTuple {
        return [this.vertices[t[0]]!, this.vertices[t[1]]!, this.vertices[t[2]]!];
    }

    public getPoints(t: Triangle): [Point, Point, Point] {
        const verts = this.getVertices(t);
        return verts.map(v => ({ x: v.x, y: v.y })) as [Point, Point, Point];
    }

    public sortTrianglesCCW(triangles: Triangle[], c: number): Triangle[] {
        const centre = this.vertices[c]!;

        const angleOf = (t: Triangle): number => {
            const others = t.filter(idx => idx !== c);
            if (others.length !== 2) {
                console.error(`triangle ${t} doesn't contain vertex ${c} exactly once`);
            }
            const p1 = this.vertices[others[0]!]!;
            const p2 = this.vertices[others[1]!]!;

            const d1x = p1.x - centre.x, d1y = p1.y - centre.y;
            const d2x = p2.x - centre.x, d2y = p2.y - centre.y;
            const len1 = Math.hypot(d1x, d1y), len2 = Math.hypot(d2x, d2y);

            // sum of unit vectors, then atan2 of the resultant — this is the
            // correct way to get a representative "average direction" for a
            // triangle spanning two angles; naively averaging the two atan2
            // values directly breaks whenever they straddle the ±π boundary.
            const sumX = d1x / len1 + d2x / len2;
            const sumY = d1y / len1 + d2y / len2;

            return Math.atan2(sumY, sumX);
        };

        return [...triangles].sort((a, b) => angleOf(a) - angleOf(b));
    }

    /** Finds and returns an array of indices of vertices which the two given vertices share. */
    public getSharedConnections(A: Vertex, B: Vertex) {
        return A.connections.filter(conn => B.connections.includes(conn));
    }
}