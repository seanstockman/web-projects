/**
 * Bibliography
 * 
 * Based on
 * Smogavec, G. & Zalik, B. (2012). "A fast algorithm for constructing approximate medial axis of polygons, using Steiner points" 
 */


import * as poly2tri from "poly2tri";
import { geometry2d, type Vec2 } from "../../lib/geometry/geometry2d.ts";
import { TriangleGraph, type Triangle, type Vertex } from "../../lib/geometry/triangle_graph.ts";

type insertedConvexSteinerPoints = {
    vertexIndex: number,
    before: Vertex,
    after: Vertex
}

/** The types of triangles outlined in section 2.3. 
 *  Each value corresponds with the number of polygon edges coinciding with each triangle.
 *  - Type A represents a triangle with one coinciding polygon edge. 
 *  - Type B represents a triangle with two coinciding polygon edges. 
 *  - Type C represents a triangle with no coinciding polygon edges. */
enum triangleType {
    /** No polygon edges */
    C,
    /** One polygon edge */
    A,
    /** Two polygon edges */
    B,
}

export const medialAxis = {
    /** */
    initialise(points: Vec2[], tris: poly2tri.Triangle[]): TriangleGraph {
        return new TriangleGraph(points, tris);
    },

    getPolygonWithAddedSteinerPoints(g: TriangleGraph) {
        // addObtuseThreeNeighbourSteinerPoints(g); TODO
        return addConvexVertexSteinerPoints(g);
    },

    flipRemainingConvexVertices(g: TriangleGraph) {
        const epsilon = 0.0001;

        for (let i = 0; i < g.vertices.length; i++) {
            const V_curr = g.vertices[i]!;
            const prev = (i - 1 + g.vertices.length) % g.vertices.length;
            const V_prev = g.vertices[prev]!;
            const next = (i + 1) % g.vertices.length;
            const V_next = g.vertices[next]!;

            const turn = geometry2d.getAngleBetweenPoints(V_prev, V_curr, V_next);

            // CCW wound    
            // const turn = geometry2d.crossProduct(V_prev, V_i, V_next);
            const isConvex = turn < (Math.PI - epsilon);
            if (!isConvex) continue;

            const incorrectConnections = V_curr.connections.filter(conn => conn != next && conn != prev);
            if (incorrectConnections.length == 0) continue;

            incorrectConnections.forEach(conn => g.flipTrianglesAlongEdge(i, conn));
        }
    },

    constructMedialAxis(g: TriangleGraph) {
        const ma = new MedialAxisConstructor(g);
        ma.construct();
    }

    // /** Returns a set of Steiner points to be added to the SweepContext object then re-triangulated. */
    // addSteinerPoints(points: Point[], swctx: poly2tri.SweepContext): Point[] {
    //     return [...this.getObtuseThreeNeighbourSteinerPoints(points, swctx), ...this.getConvexVertexSteinerPoints(points, swctx)];
    // },
}

/** Adds the Steiner points to resolve convex triangles with 3 neighbours. */
function addObtuseThreeNeighbourSteinerPoints(g: TriangleGraph) {
    const obtuseTriangles: Triangle[] = [];

    g.triangles.forEach(t => {
        const verts = g.getVertices(t);
        const circumcentre = geometry2d.getCircumcircle(...verts).center;
        if (geometry2d.isPointInTriangle(circumcentre, ...verts)) return;

        // does this have three neighbours?
        for (let i = 0; i < 3; i++) {
            const vertexA = verts[i]!;
            const vertexB = i == 2 ? verts[0] : verts[i + 1]!;
            const sharedConnections = g.getSharedConnections(vertexA, vertexB);

            const C = i == 0 ? 2 : i - 1;
            sharedConnections.filter(connection => connection != t[C]);
            if (sharedConnections.length == 0) return;
        }

        obtuseTriangles.push(t);
    });

    if (obtuseTriangles.length == 0) return;

    console.warn(`not implemented: found obtuseTriangles with three points:`);
    console.log(obtuseTriangles);
}

/** Finds and returns the Steiner Points to be added to resolve three-neighbour obtuse triangles (section 2.1). */
function addConvexVertexSteinerPoints(g: TriangleGraph) {
    // find all convex vertices (interior angle < 180)

    // wound CW.

    const convexVertices = [];

    for (let i = 0; i < g.vertices.length; i++) {
        const V_curr = g.vertices[i]!;
        const V_next = g.vertices[(i + 1) % g.vertices.length]!;
        const V_prev = g.vertices[(i - 1 + g.vertices.length) % g.vertices.length]!;
        // CW wound    
        const turn = geometry2d.getAngleBetweenPoints(V_prev, V_curr, V_next);
        // const turn = geometry2d.crossProduct(V_prev, V_i, V_next);
        const isConvex = turn < Math.PI;
        if (isConvex) convexVertices.push(i);
    }

    // console.log(`convex vertices:`);
    // console.log(convexVertices);

    const steinerVertices = convexVertices.map(c => getSteinerPointsAtVertex(g, c));

    // insert these steiner points into the array of polygon vertices to get re-CDT'ed.
    const verticesWithSteinerPointsAdded: Vec2[] = [];
    for (let i = 0; i < g.vertices.length; i++) {
        // if the vertex index i is in the steiner vertices array, add the before and after.
        // otherwise just push the point.
        const steinerPointsAtVertex = steinerVertices.find(sv => sv.vertexIndex == i);
        if (steinerPointsAtVertex == undefined) {
            verticesWithSteinerPointsAdded.push(g.vertices[i]!);
            continue;
        }
        // dont push repeats (test before only)
        if (!verticesWithSteinerPointsAdded.find(v => v.x == steinerPointsAtVertex.before.x && v.y == steinerPointsAtVertex.before.y)) {
            verticesWithSteinerPointsAdded.push(steinerPointsAtVertex.before);
        }
        verticesWithSteinerPointsAdded.push(g.vertices[i]!);
        // dont push repeat on last vertex's after.
        if (i == g.vertices.length - 1 &&
            verticesWithSteinerPointsAdded.find(v => v.x == steinerPointsAtVertex.after.x && v.y == steinerPointsAtVertex.after.y)
        ) {
            continue;
        }
        verticesWithSteinerPointsAdded.push(steinerPointsAtVertex.after);
    }

    return verticesWithSteinerPointsAdded;
}

function getSteinerPointsAtVertex(g: TriangleGraph, c: number): insertedConvexSteinerPoints {
    // firstly a list of triangles originating in v_c is formed
    const trianglesOriginatingAtC = g.triangles.filter(t => t[0] == c || t[1] == c || t[2] == c);

    // these triangles are sorted in a ccw direction around vertex v_c in order to form a triangle strip T_s (an ccw array of Ts)
    const ccwSortedTriangles = g.sortTrianglesCCW(trianglesOriginatingAtC, c);

    // the nearest polygon vertex v_n in regard to vertex v_c is found.
    const v_c = g.vertices[c]!;
    const n = [...v_c.connections].filter(v => !g.vertices[v]?.steiner)
        .sort((a, b) => geometry2d.distance(v_c, g.vertices[a]!) - geometry2d.distance(v_c, g.vertices[b]!))[0]!;
    const v_n = g.vertices[n]!;

    // the distance d = |v_c v_n| represents the radius of circle c_c the centre of which is v_c.
    const d = geometry2d.distance(v_n, v_c);

    // 2 steiner points v_s1 and v_s2 are inserted at the intersections between c_c with halved-radius and polygon edges terminating in vertex v_c.
    const v_prev = g.vertices[(c - 1 + g.vertices.length) % g.vertices.length]!;
    const distToPrev = geometry2d.distance(v_prev, v_c);
    const cToPrev: Vec2 = { x: v_prev.x - v_c.x, y: v_prev.y - v_c.y };
    const cToPrevNormalised = { x: cToPrev.x / distToPrev, y: cToPrev.y / distToPrev };

    const v_next = g.vertices[(c + 1) % g.vertices.length]!;
    const distToNext = geometry2d.distance(v_next, v_c);
    const cToNext: Vec2 = { x: v_next.x - v_c.x, y: v_next.y - v_c.y };
    const cToNextNormalised = { x: cToNext.x / distToNext, y: cToNext.y / distToNext }

    const v_s1: Vertex = { x: v_c.x + cToPrevNormalised.x * (d / 2), y: v_c.y + cToPrevNormalised.y * (d / 2), connections: [], steiner: true }
    const v_s2: Vertex = { x: v_c.x + cToNextNormalised.x * (d / 2), y: v_c.y + cToNextNormalised.y * (d / 2), connections: [], steiner: true }

    return {
        vertexIndex: c,
        before: v_s1,
        after: v_s2
    };

    // insertedSteinerPoints[0]!.isBeforeVertex = true;

    // return insertedSteinerPoints;


    // the triangles from T_s are now changed as follows:
    // firstly the bisector of /_ v_c-1 v_c v_c+1 is determined and after that the angle at vertex v_c is calculated.


    // the triangles from T_s are processed sequentially in a ccw direction.

    // until the cumulative value of the angles at v_c is smalled than the half of /_ v_c-1 v_c v_c+1, the triangle vertex is moved.
}

type MedialAxis = {
    points: Vec2[],
    edges: number[][];
}

class MedialAxisConstructor {
    private g: TriangleGraph;
    private triTypeMap = new Map<number, triangleType>();
    private visitedTriangles;
    private finished = false;
    private medialAxis: MedialAxis = { points: [], edges: [] };

    constructor(tg: TriangleGraph) {
        this.g = tg;
        this.visitedTriangles = new Map<number, boolean>();
        this.g.triangles.forEach((_, i) => this.visitedTriangles.set(i, false));
    }

    public construct() {
        if (this.finished) { console.error(`medial axis already constructed`); return; }
        // idea: map triangle indices to triangle types
        this.generateTriTypeMap();

        // The algorithm starts in an arbitrary C-type triangle. 
        const firstTypeCTriangleIndex = this.g.triangles.findIndex((_, i) => this.triTypeMap.get(i) == triangleType.C);
        if (undefined == firstTypeCTriangleIndex) { console.error(`No C type triangles exist.`); return; }
        const firstTypeCTriangle = this.g.triangles[firstTypeCTriangleIndex];
        if (!firstTypeCTriangle) { console.error(`No C type triangles exist.`); return; }

        this.startAtTypeC(firstTypeCTriangleIndex, firstTypeCTriangle);

        this.finished = true;
        return medialAxis;
    }

    private generateTriTypeMap() {
        this.triTypeMap.clear();

        this.g.triangles.forEach((t, triangleIndex) => {
            let numberOfPolygonEdges = 0;

            // CCW winding helpful here 
            if ((t[0] + 1) % this.g.vertices.length == t[1]) numberOfPolygonEdges++;
            if ((t[1] + 1) % this.g.vertices.length == t[2]) numberOfPolygonEdges++;
            if ((t[2] + 1) % this.g.vertices.length == t[0]) numberOfPolygonEdges++;

            this.triTypeMap.set(triangleIndex, numberOfPolygonEdges);
        });
    }

    private startAtTypeC(index: number, triangle: Triangle) {
        // Firstly, it is checked as to whether the centre of the triangles circumcircle is inside the triangle.
        const circumcentre = this.g.getCircumcircleOfTriangle(triangle)?.center;
        if (!circumcentre) { console.error(`Could not compute circumcentre`); return; }

        if (!this.g.isPointInTriangle(triangle, circumcentre)) {
            // If the centre of the C-type triangle is outside the triangle, a vector is sent from the triangle's 
            // obtuse vertex to the circle's centre. All type-A triangles pierced by this vector are marked as disabled.

            // find all triangles pierced by a vector
            // const obtuseVertex = geometry2d.getFurthestPointFromP(circumcentre.center, triangle.map(i => this.g.vertices[i]!));
            let obtuseVertexIndex;
            const verts = this.g.getVertices(triangle);
            for (let i = 0; i < triangle.length; i++) {
                if (geometry2d.getAngleBetweenPoints(verts[(i + 2) % 3]!, verts[i]!, verts[(i + 1) % 3]!) <= Math.PI + 0.0001) continue;
                obtuseVertexIndex = i;

                break;
            }
            if (obtuseVertexIndex == undefined) { console.error(`could not find obtuse vertex`); return; }
            const A = triangle[(obtuseVertexIndex + 1) % 3]!;
            const B = triangle[(obtuseVertexIndex + 2) % 3]!;
            const O = triangle[obtuseVertexIndex]!;
            const vO = verts[obtuseVertexIndex]!;

            const dir = geometry2d.normalise(geometry2d.sub(circumcentre, vO));
        } else {
            this.visitedTriangles.set(index, true);
        }

        /* If the centre is inside.
         * In this case the centre represents a vertex on the medial axis and the algorithm 
         * recursively visits the neighbouring triangles. */

        // If an A type triangle is encountered, the last vertex obtained on the medial axis is 
        // connected to the bisector of the common edge with the next neighbouring triangle.

        // If a B-type triangle is met, all the line segments between the considered B-type triangle and the last C-type triangle, 
        // generated by A-type triangles, are firstly removed from the solution.

        // After that, the circumcentre of the last C-type triangle is connected to the B-type triangle's top vertex.






        // All the triangles of type A, pierced by this vector, are marked as disabled and do not participate in the final solution.
        // The algorithm then recursively visits the neighbouring triangles and upon each individual triangle type,
        // adds a contribution to the final MA.
    }

    private startAtTypeA(index: number, triangle: Triangle) {

    }
}