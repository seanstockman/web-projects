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
enum TriangleType {
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

    constructMedialAxis(g: TriangleGraph, showDebug: boolean = false) {
        return new MedialAxisConstructor(g).construct(showDebug);
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
        if (!verticesWithSteinerPointsAdded.find(v => geometry2d.isApproximatelyEqual(v, steinerPointsAtVertex.before))) {
            verticesWithSteinerPointsAdded.push(steinerPointsAtVertex.before);
        }
        verticesWithSteinerPointsAdded.push(g.vertices[i]!);
        // dont push repeat on last vertex's after.
        if (i == g.vertices.length - 1 &&
            verticesWithSteinerPointsAdded.find(v => geometry2d.isApproximatelyEqual(v, steinerPointsAtVertex.after))
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

export type MedialAxis = {
    points: Vec2[],
    edges: [number, number][];
}

type TriangleInfo = {
    visited: boolean,
    /** Whether the triangle is ignored during traversal. */
    disabled: boolean,
    type: TriangleType,
    index: number
}

class MedialAxisConstructor {
    private g: TriangleGraph;
    private triInfo: TriangleInfo[];
    private finished = false;
    private ma: MedialAxis = { points: [], edges: [] };


    constructor(tg: TriangleGraph) {
        this.g = tg;
        // this.visitedTriangles = new Map<number, boolean>();
        this.triInfo = [];
        this.g.triangles.forEach((_, i) => this.triInfo.push({
            visited: false,
            disabled: false,
            type: TriangleType.A,
            index: i
        }));
    }

    public construct(showDebug: boolean = false) {
        if (this.finished) { console.error(`medial axis already constructed`); return; }
        // idea: map triangle indices to triangle types
        this.assignTriTypes();

        // The algorithm starts in an arbitrary C-type triangle. 
        const firstTypeCTriangleIndex = this.g.triangles.findIndex((_, i) => this.triInfo[i]?.type == TriangleType.C);
        if (undefined == firstTypeCTriangleIndex) { console.error(`No C type triangles exist.`); return; }
        this.disableATrisPiercedByCTris();

        const firstTypeCTriangle = this.g.triangles[firstTypeCTriangleIndex];
        if (!firstTypeCTriangle) { console.error(`No C type triangles exist.`); return; }

        this.startAtTypeC(firstTypeCTriangleIndex, firstTypeCTriangle, -1, showDebug);

        this.finished = true;
        return this.ma;
    }

    private assignTriTypes() {
        this.g.triangles.forEach((t, triangleIndex) => {
            let numberOfPolygonEdges = 0;

            // CCW winding helpful here 
            if ((t[0] + 1) % this.g.vertices.length == t[1]) numberOfPolygonEdges++;
            if ((t[1] + 1) % this.g.vertices.length == t[2]) numberOfPolygonEdges++;
            if ((t[2] + 1) % this.g.vertices.length == t[0]) numberOfPolygonEdges++;

            this.triInfo[triangleIndex]!.type = numberOfPolygonEdges;
        });
    }

    private disableATrisPiercedByCTris() {
        const cTypeTriangles = this.triInfo.filter(info => info.type == TriangleType.C).map(info => info.index);
        cTypeTriangles.forEach(i => {
            const t = this.g.triangles[i]!;
            const cc = this.g.getCircumcircleOfTriangle(t).center;
            if (this.g.isPointInTriangle(t, cc)) return;
            // If the centre of the C-type triangle is outside the triangle, a vector is sent from the triangle's 
            // obtuse vertex to the circle's centre. 

            // find all triangles pierced by a vector
            // const obtuseVertex = geometry2d.getFurthestPointFromP(circumcentre.center, triangle.map(i => this.g.vertices[i]!));
            console.log(`T${i} (c-type): circumcentre is not in the triangle`);

            let obtuseVertexIndex;
            const triVerts = this.g.getVertices(t);
            for (let i = 0; i < t.length; i++) {
                if (geometry2d.getAngleBetweenPoints(triVerts[(i + 2) % 3]!, triVerts[i]!, triVerts[(i + 1) % 3]!) <= (Math.PI / 2)) continue;
                obtuseVertexIndex = i;

                break;
            }
            if (obtuseVertexIndex == undefined) { console.error(`could not find obtuse vertex`); return; }

            const vO = triVerts[obtuseVertexIndex]!;
            const dir = geometry2d.normalise(geometry2d.sub(cc, vO));

            const facesTraversed = this.g.traceRay(vO, dir, i, cc);

            // All the triangles of type A, pierced by this vector, are marked as disabled
            // and do not participate in the final solution.
            facesTraversed.filter(i => this.triInfo[i]?.type == TriangleType.A).forEach(i => {
                console.log(`marking A-type triangle T${i} as disabled.`);
                this.triInfo[i]!.disabled = true;
            });
        });
    }

    private startAtTypeC(index: number, triangle: Triangle, lastCIndex: number = -1, showDebug: boolean = false) {
        if (showDebug) console.log(`~~ visiting C-type triangle T${index} ~~`);
        this.triInfo[index]!.visited = true;

        // Firstly, it is checked as to whether the centre of the triangles circumcircle is inside the triangle.
        const circumcentre = this.g.getCircumcircleOfTriangle(triangle)?.center;
        if (!circumcentre) { console.error(`Could not compute circumcentre`); return; }

        this.ma.points.push(circumcentre);
        const ccIndex = this.ma.points.length - 1;
        // connect to last point added (if it exists)
        if (this.ma.points.length > 1) {
            if (lastCIndex != -1) {
                this.ma.edges.push([lastCIndex, ccIndex]);
            } else {
                this.ma.edges.push([this.ma.points.length - 2, ccIndex]);
            }
        }

        /* The circumcentre represents a vertex on the medial axis and the algorithm 
         * recursively visits the neighbouring triangles. */

        const adjTriangles = this.g.getAdjacentTriangles(triangle);
        adjTriangles.forEach(adj => {
            const adjInfo = this.triInfo[adj]!;
            const adjTri = this.g.triangles[adj]!;
            if (adjInfo.visited) return;
            switch (adjInfo.type) {
                case TriangleType.A:
                    // If an A type triangle is encountered, the last vertex obtained on the medial axis is 
                    // connected to the bisector of the common edge with the next neighbouring triangle.
                    // const ba;
                    this.startAtTypeA(ccIndex, triangle, adj, adjTri, showDebug);
                    // console.warn(`not implemented: reached a type A (T${adj})`);
                    return;
                case TriangleType.B:
                    console.log(`- found B-type triangle T${adj}`);
                    const topVertexIndex = adjTri.find(i => !triangle.includes(i));
                    if (topVertexIndex == undefined) { console.error(`curr triangle == next triangle`); return; }
                    this.ma.points.push(this.g.vertices[topVertexIndex]!);
                    // connect last added
                    this.ma.edges.push([ccIndex, this.ma.points.length - 1]);
                    return;
                case TriangleType.C:
                    console.log(`- found C-type triangle T${adj}`);
                    this.startAtTypeC(adj, adjTri, ccIndex, showDebug);
                    return;
                default:
                    console.error(`erm.`);
                    return;
            }


            // If a B-type triangle is met, all the line segments between the considered B-type triangle and the last C-type triangle, 
            // generated by A-type triangles, are firstly removed from the solution.
            // After that, the circumcentre of the last C-type triangle is connected to the B-type triangle's top vertex.
        });

        // The algorithm then recursively visits the neighbouring triangles and upon each individual triangle type,
        // adds a contribution to the final MA.
    }



    /** Recursively searches through the graph until a triangle of type B or C is reached.
     * - If a type-B triangle is reached, the last point added to the `MA` will be connected 
     *   to the top of the B-type triangle and the traversal will end.
     * - If a type-C triangle is reached, all midpoints traversed will be connected and a search 
     *   at triangle C will be initialised. */
    private startAtTypeA(prevCIndex: number, prevCTri: Triangle, index: number, triangle: Triangle, showDebug: boolean = false, maxSteps = this.g.triangles.length) {
        let addedFirstMidpoint = false;

        // at start, find first NOT disabled A type.
        // first non-disabled A-type, add the front AND end midpoints.
        // then every subsequent non-disabled, add only end midpoint.

        let prev = { i: -1, t: prevCTri };
        let curr = { i: index, t: triangle, info: this.triInfo[index]! };
        const addedMidpointVertices: Vec2[] = [];

        for (let j = 0; j < maxSteps; j++) {
            // starting from an A vertex.
            console.log(`~~ visiting A-type triangle T${curr.i} ~~`);
            if (curr.info.visited) { console.log(`- visited, returning`); return; }
            curr.info.visited = true;

            const adjacentTriangles = this.g.getAdjacentTriangles(curr.t);
            if (adjacentTriangles.length != 2) {
                console.error(`type A triangle ${curr.i} has ${adjacentTriangles.length} adjacent triangles`);
                console.error(adjacentTriangles);
                return;
            }

            const nextIndex = adjacentTriangles.find(i => !this.triInfo[i]?.visited);
            if (nextIndex == undefined) { console.error(`- all adjacent visited`); console.error(adjacentTriangles); return; }
            const next = { i: nextIndex, t: this.g.triangles[nextIndex]!, info: this.triInfo[nextIndex]! }

            if (next.info.type == TriangleType.B) {
                console.log(`- found B-type triangle T${next.i}`);
                const topVertexIndex = next.t.find(vertIndex => !curr.t.includes(vertIndex));
                if (topVertexIndex == undefined) { console.error(`curr triangle == next triangle`); return; }
                this.ma.points.push(this.g.vertices[topVertexIndex]!);
                // connect last added
                this.ma.edges.push([prevCIndex, this.ma.points.length - 1]);
                return;
            } else if (next.info.type == TriangleType.C) {
                console.log(`- found C-type triangle T${next.i}`);
                // add and connect all previous

                if (addedMidpointVertices.length == 0) {
                    this.startAtTypeC(next.i, next.t, prevCIndex, showDebug);
                    return;
                }

                this.ma.edges.push([prevCIndex, this.ma.points.length]);
                for (let k = 0; k < addedMidpointVertices.length - 1; k++) {
                    this.ma.edges.push([this.ma.points.length + k, this.ma.points.length + k + 1]);
                }
                this.ma.points.push(...addedMidpointVertices);

                this.startAtTypeC(next.i, next.t, -1, showDebug);

                return;
            }

            if (!next.info.disabled) {
                if (!addedFirstMidpoint) {
                    // add the midpoint 
                    const edge = this.g.getEdgeBetweenTrianglesAsVertices(curr.t, prev.t)!;
                    addedMidpointVertices.push(geometry2d.getMidpoint(...edge));
                    addedFirstMidpoint = true;
                }
                // add the midpoint
                const edge = this.g.getEdgeBetweenTrianglesAsVertices(curr.t, next.t)!;
                addedMidpointVertices.push(geometry2d.getMidpoint(...edge));
            } else {
                console.log(`T${next.i} is disabled, skipping.`);
            }

            // type A
            prev = curr;
            curr = next;
        }

        console.error(`john fuck`);
    }
}