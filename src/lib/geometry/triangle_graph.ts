import * as poly2tri from "poly2tri";
import { geometry2d, type Vec2 } from "./geometry2d.ts"

export type Vertex = Vec2 & {
    connections: number[],
    steiner: boolean // whether this is not part of the original
}

export type VectorTuple = [Vertex, Vertex, Vertex];
export type Triangle = [number, number, number];

export class TriangleGraph {
    public vertices: Vertex[];
    public triangles: Triangle[];

    /** Map of sorted vertices of each triangle to that triangle's index in the `triangles` array. */
    private triangleMap = new Map<string, number>();

    constructor(points: Vec2[], triangles: poly2tri.Triangle[]) {
        this.vertices = points.map(p => ({ x: p.x, y: p.y, connections: [], steiner: false }));

        // triangles are sorted CCW!
        this.triangles = [];
        triangles.forEach(t => {
            const trianglePointIndices = t.getPoints().map(p => this.vertices.findIndex(v => v.x == p.x && v.y == p.y));
            this.triangles.push(trianglePointIndices as Triangle);
        });

        this.triangles.forEach((t, i) => {
            this.connectVertices(t[0], t[1]);
            this.connectVertices(t[1], t[2]);
            this.connectVertices(t[2], t[0]);
            this.addTriangleToMap(i);
        })
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

    /** Returns if an edge AB (if A is connected to B) exists. */
    public isABConnected(A: number, B: number) {
        const vertexA = this.vertices[A], vertexB = this.vertices[B];
        if (!vertexA || !vertexB) { console.error(`vertex ${A} or ${B} does not exist`); return; }
        return vertexA.connections.includes(B);
    }

    public getVertices(t: Triangle): VectorTuple {
        return [this.vertices[t[0]]!, this.vertices[t[1]]!, this.vertices[t[2]]!];
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

    /** Flips the triangles along the edge AB. */
    public flipTrianglesAlongEdge(A: number, B: number): boolean {
        // confirm that A is connected to B
        const vA = this.vertices[A], vB = this.vertices[B];
        if (!vA || !vB) { console.error(`could not fetch vertex ${A} or ${B}`); return false; }

        // confirm that A and B have 2 shared connections
        const sharedConns = this.getSharedConnections(vA, vB);
        if (sharedConns.length != 2) { console.error(`vertex ${A} and ${B} have ${sharedConns.length} connections, not 2.`); return false; }

        // confirm X and Y exist
        const X = sharedConns[0], Y = sharedConns[1];
        if (X == undefined || Y == undefined) { console.error(`could not get ${X} or ${Y}`); return false; }

        const vX = this.vertices[X], vY = this.vertices[Y];
        if (!vX || !vY) { console.error(`could not fetch vertex ${X} or ${Y}`); return false; }

        // get face ABX and ABY
        const ABX = this.getTriangleFromVertexIndices(A, B, X);
        const ABY = this.getTriangleFromVertexIndices(A, B, Y);

        if (!ABX) { console.error(`face ${A}-${B}-${X} does not exist in the triangle map`); return false; }
        if (!ABY) { console.error(`face ${A}-${B}-${Y} does not exist in the triangle map`); return false; }

        // determine direction of X (which will imply direction of Y). if AB is in order AB, X is on left by CCW winding.
        const orderedIndexOfA = ABX.triangle.findIndex(i => i == A);
        const isXOnLeft = ABX.triangle[(orderedIndexOfA + 1) % 3] == B;

        const L = isXOnLeft ? X : Y;
        // const vL = isXOnLeft ? vX : vY;
        const R = isXOnLeft ? Y : X;
        // const vR = isXOnLeft ? vY : vX;

        // face ABX is mapped to LRB
        this.removeTriangleFromMap(ABX.triangle);
        this.triangles[ABX.index] = [L, R, B];
        this.addTriangleToMap(ABX.index);

        // face ABY is mapped to ARL
        this.removeTriangleFromMap(ABY.triangle);
        this.triangles[ABY.index] = [A, R, L];
        this.addTriangleToMap(ABY.index);

        this.disconnectVertices(A, B);
        this.connectVertices(L, R);

        return true;
    }

    /** Finds and returns an array of indices of vertices which the two given vertices share. */
    public getSharedConnections(vertexA: Vertex, vertexB: Vertex) {
        return vertexA.connections.filter(conn => vertexB.connections.includes(conn));
    }

    /** Adds the given triangle to the map. */
    private addTriangleToMap(triangleIndex: number) {
        const key = this.getKeyFromTriangleIndex(triangleIndex)
        if (key) this.triangleMap.set(key, triangleIndex);
    }

    /** Removes the given triangle to the map using its index in the `triangles` array. */
    private removeTriangleIndexFromMap(triangleIndex: number) {
        const key = this.getKeyFromTriangleIndex(triangleIndex);
        if (key) this.triangleMap.delete(key);
    }

    /** Removes the given triangle to the map. */
    private removeTriangleFromMap(t: Triangle) {
        const key = this.getKeyFromVertexIndices(t[0], t[1], t[2]);
        if (key) this.triangleMap.delete(key);
    }

    private getKeyFromTriangleIndex(triangleIndex: number) {
        const t = this.triangles[triangleIndex];
        if (!t) { console.error(`could not find triangle ${triangleIndex}`); return undefined; }
        return this.getKeyFromVertexIndices(t[0], t[1], t[2]);
    }

    private getKeyFromVertexIndices(A: number, B: number, C: number) {
        const sorted = [A, B, C].sort();
        return `${sorted[0]}-${sorted[1]}-${sorted[2]}`;
    }

    private getTriangleFromVertexIndices(A: number, B: number, C: number) {
        const key = this.getKeyFromVertexIndices(A, B, C);
        const index_t = this.triangleMap.get(key);
        if (index_t == undefined) return undefined;
        const t = this.triangles[index_t];
        if (t == undefined) return undefined;
        return {
            index: index_t,
            triangle: t,
        };
    }

    /** Returns an array of indices of adjacent triangles. */
    public getAdjacentTriangles(t: Triangle) {
        const adjacentTriangles: number[] = [];
        const [vA, vB, vC] = this.getVertices(t);
        const [A, B, C] = t;
        this.getSharedConnections(vA, vB).filter(conn => conn != C).forEach(conn => {
            const adj = this.getTriangleFromVertexIndices(A, B, conn)?.index;
            if (adj) adjacentTriangles.push(adj)
        });
        this.getSharedConnections(vB, vC).filter(conn => conn != A).forEach(conn => {
            const adj = this.getTriangleFromVertexIndices(B, C, conn)?.index;
            if (adj) adjacentTriangles.push(adj)
        });
        this.getSharedConnections(vC, vA).filter(conn => conn != B).forEach(conn => {
            const adj = this.getTriangleFromVertexIndices(C, A, conn)?.index;
            if (adj) adjacentTriangles.push(adj)
        });

        return adjacentTriangles;
    }

    public getCircumcircleOfTriangle(t: Triangle) {
        return geometry2d.getCircumcircle(...this.getVertices(t));
    }

    public isPointInTriangle(t: Triangle, p: Vec2) {
        return geometry2d.isPointInTriangle(p, ...this.getVertices(t));
    }

    public getTriangleOnOtherSideOfABfromO(A: number, B: number, O: number) {
        const vA = this.vertices[A]!, vB = this.vertices[B]!;
        const D = this.getSharedConnections(vA, vB).filter(conn => conn != O)[0];
        if (D == undefined) return;
        return this.getTriangleFromVertexIndices(A, B, D)?.index;
    }

    public getVerticesFromIndices(...indices: number[]) {
        return indices.map(i => this.vertices[i]!);
    }
}