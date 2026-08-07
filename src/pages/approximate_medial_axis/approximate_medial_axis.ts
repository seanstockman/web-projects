/**
 * Bibliography
 * 
 * Based on
 * Smogavec, G. & Zalik, B. (2012). "A fast algorithm for constructing approximate medial axis of polygons, using Steiner points" 
 */


import * as poly2tri from "poly2tri";
import { geometry2d as g2d, type Vec2 } from "../../lib/geometry/geometry2d.ts";
import { TriangleGraph, type BundledTriangle, type Triangle, type Vertex } from "../../lib/geometry/triangle_graph.ts";

type insertedConvexSteinerPoints = {
    vertexIndex: number,
    before: Vertex,
    after: Vertex
}

export const medialAxis = {
    /** */
    initialise(points: Vec2[], tris: poly2tri.Triangle[]): TriangleGraph {
        return new TriangleGraph(points, tris);
    },

    getPolygonWithAddedSteinerPoints(g: TriangleGraph) {
        // addObtuseThreeNeighbourSteinerPoints(g); //TODO
        return addConvexVertexSteinerPoints(g);
        return g.vertices;
    },

    flipRemainingConvexVertices(g: TriangleGraph) {
        const epsilon = 0.0001;

        for (let i = 0; i < g.vertices.length; i++) {
            const V_curr = g.vertices[i]!;
            const prev = (i - 1 + g.vertices.length) % g.vertices.length;
            const V_prev = g.vertices[prev]!;
            const next = (i + 1) % g.vertices.length;
            const V_next = g.vertices[next]!;

            const turn = g2d.getAngleBetweenPoints(V_prev, V_curr, V_next);

            // CCW wound    
            // const turn = geometry2d.crossProduct(V_prev, V_i, V_next);
            const isConvex = turn < (Math.PI - epsilon);
            if (!isConvex) continue;

            const incorrectConnections = V_curr.connections.filter(conn => conn != next && conn != prev);
            if (incorrectConnections.length == 0) continue;

            incorrectConnections.forEach(conn => g.flipTrianglesAlongEdge(i, conn));
        }
    },

    checkForObtuse(g: TriangleGraph) {
        addObtuseThreeNeighbourSteinerPoints(g);
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
    const obtuseTriangles: { i: number, t: Triangle }[] = [];

    g.triangles.forEach((t, i) => {
        const verts = g.getVertices(t);
        const circumcentre = g2d.getCircumcircle(...verts).center;
        if (g2d.isPointInTriangle(circumcentre, ...verts)) return;

        // does this have three neighbours?
        if (getNumberOfPolygonEdges(g, t) != 0) return;

        obtuseTriangles.push({ t: t, i: i });
    });

    if (obtuseTriangles.length == 0) return;

    console.log(`found ${obtuseTriangles.length} obtuse triangle/s with three adjacent triangles:`);
    console.log(obtuseTriangles.map(tri => tri.i));

    obtuseTriangles.forEach(obtuseTriangle => addSteinerPointForObtuseCase(g, obtuseTriangle));
}

function addSteinerPointForObtuseCase(g: TriangleGraph, obtuse: BundledTriangle) {
    // a ray is sent from the obtuse vertex towards c_i (circumcentre of t_i)
    // only those triangles intersected by the ray are inspected
    const circumcentre = g.getCircumcircleOfTriangle(obtuse.t).center;
    const obtuseVertex = g.getObtuseVertexOfTriangle(obtuse.t)!;
    const intersectedTris = g.traceRay(obtuseVertex.v, g2d.sub(circumcentre, obtuseVertex.v), obtuse.i, circumcentre);
    console.log(`intersectedFaces for triangle ${obtuse.i}`);
    console.log(intersectedTris);

    // if the ray does not intersect any polygon edge, c_i is inside the polygon and the triangle is considered acceptable.
    if (g.isPointInTriangle(g.triangles[intersectedTris[intersectedTris.length - 1]!]!, circumcentre)) {
        console.log(`circumcentre of T${obtuse.i} is inside the last pierced triangle T${intersectedTris[intersectedTris.length - 1]}`);
        return;
    }

    console.warn(`circumcentre of T${obtuse.i} is outside the polygon`);
    return circumcentre;
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
        const turn = g2d.getAngleBetweenPoints(V_prev, V_curr, V_next);
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
        if (!verticesWithSteinerPointsAdded.find(v => g2d.isApproximatelyEqual(v, steinerPointsAtVertex.before))) {
            verticesWithSteinerPointsAdded.push(steinerPointsAtVertex.before);
        }
        verticesWithSteinerPointsAdded.push(g.vertices[i]!);
        // dont push repeat on last vertex's after.
        if (i == g.vertices.length - 1 &&
            verticesWithSteinerPointsAdded.find(v => g2d.isApproximatelyEqual(v, steinerPointsAtVertex.after))
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
        .sort((a, b) => g2d.dist(v_c, g.vertices[a]!) - g2d.dist(v_c, g.vertices[b]!))[0]!;
    const v_n = g.vertices[n]!;

    // the distance d = |v_c v_n| represents the radius of circle c_c the centre of which is v_c.
    const d = g2d.dist(v_n, v_c);

    // 2 steiner points v_s1 and v_s2 are inserted at the intersections between c_c with halved-radius and polygon edges terminating in vertex v_c.
    const v_prev = g.vertices[(c - 1 + g.vertices.length) % g.vertices.length]!;
    const distToPrev = g2d.dist(v_prev, v_c);
    const cToPrev: Vec2 = { x: v_prev.x - v_c.x, y: v_prev.y - v_c.y };
    const cToPrevNormalised = { x: cToPrev.x / distToPrev, y: cToPrev.y / distToPrev };

    const v_next = g.vertices[(c + 1) % g.vertices.length]!;
    const distToNext = g2d.dist(v_next, v_c);
    const cToNext: Vec2 = { x: v_next.x - v_c.x, y: v_next.y - v_c.y };
    const cToNextNormalised = { x: cToNext.x / distToNext, y: cToNext.y / distToNext }

    const v_s1: Vertex = { x: v_c.x + cToPrevNormalised.x * (d / 2), y: v_c.y + cToPrevNormalised.y * (d / 2), connections: [], steiner: true }
    const v_s2: Vertex = { x: v_c.x + cToNextNormalised.x * (d / 2), y: v_c.y + cToNextNormalised.y * (d / 2), connections: [], steiner: true }

    return {
        vertexIndex: c,
        before: v_s1,
        after: v_s2
    };
}

type MedialAxis = {
    points: Vec2[],
    edges: [number, number][];
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
        this.disableATrisPiercedByCTris(showDebug);

        const firstTypeCTriangle = this.g.triangles[firstTypeCTriangleIndex];
        if (!firstTypeCTriangle) { console.error(`No C type triangles exist.`); return; }

        this.startAtTypeC(firstTypeCTriangleIndex, firstTypeCTriangle, -1, showDebug);

        this.finished = true;
        return this.ma;
    }

    private assignTriTypes() {
        this.g.triangles.forEach((t, triangleIndex) => {
            this.triInfo[triangleIndex]!.type = getNumberOfPolygonEdges(this.g, t);
        });
    }

    private disableATrisPiercedByCTris(showDebug = false) {
        const cTypeTriangles = this.triInfo.filter(info => info.type == TriangleType.C).map(info => info.index);
        cTypeTriangles.forEach(i => {
            const t = this.g.triangles[i]!;
            const cc = this.g.getCircumcircleOfTriangle(t).center;
            if (this.g.isPointInTriangle(t, cc)) return;
            // If the centre of the C-type triangle is outside the triangle, a vector is sent from the triangle's 
            // obtuse vertex to the circle's centre. 

            // find all triangles pierced by a vector
            // const obtuseVertex = geometry2d.getFurthestPointFromP(circumcentre.center, triangle.map(i => this.g.vertices[i]!));
            if (showDebug) console.log(`T${i} (c-type): circumcentre is not in the triangle`);

            const obtuseVertex = this.g.getObtuseVertexOfTriangle(t);
            if (!obtuseVertex) return;

            const vO = obtuseVertex.v;
            const dir = g2d.normalise(g2d.sub(cc, vO));

            const facesTraversed = this.g.traceRay(vO, dir, i, cc);

            // All the triangles of type A, pierced by this vector, are marked as disabled
            // and do not participate in the final solution.
            facesTraversed.filter(i => this.triInfo[i]?.type == TriangleType.A).forEach(i => {
                if (showDebug) console.log(`marking A-type triangle T${i} as disabled.`);
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
        const maIndexOfThis = this.ma.points.length - 1;
        // connect to last point added (if it exists)
        if (this.ma.points.length > 1) {
            if (lastCIndex != -1) {
                this.ma.edges.push([lastCIndex, maIndexOfThis]);
            } else {
                this.ma.edges.push([this.ma.points.length - 2, maIndexOfThis]);
            }
        }

        /* The circumcentre represents a vertex on the medial axis and the algorithm 
         * recursively visits the neighbouring triangles. */

        const adjTriangles = this.g.getAdjacentTriangles(triangle);
        adjTriangles.forEach(adjacentTriangleIndex => {
            const adj = {
                i: adjacentTriangleIndex,
                t: this.g.triangles[adjacentTriangleIndex]!,
                info: this.triInfo[adjacentTriangleIndex]!
            }

            if (adj.info.visited) return;
            switch (adj.info.type) {
                case TriangleType.A:
                    // If an A type triangle is encountered, the last vertex obtained on the medial axis is 
                    // connected to the bisector of the common edge with the next neighbouring triangle.
                    // const ba;
                    this.startAtTypeA(maIndexOfThis, triangle, adj.i, adj.t, showDebug);
                    // console.warn(`not implemented: reached a type A (T${adj})`);
                    return;
                case TriangleType.B:
                    if (showDebug) console.log(`- found B-type triangle T${adj.i}`);
                    const topVertexIndex = adj.t.find(i => !triangle.includes(i));
                    if (topVertexIndex == undefined) { console.error(`curr triangle == next triangle`); return; }
                    adj.info.visited = true;
                    this.ma.points.push(this.g.vertices[topVertexIndex]!);
                    // connect last added
                    this.ma.edges.push([maIndexOfThis, this.ma.points.length - 1]);
                    return;
                case TriangleType.C:
                    if (showDebug) console.log(`- found C-type triangle T${adj.i}`);
                    this.startAtTypeC(adj.i, adj.t, maIndexOfThis, showDebug);
                    return;
                default:
                    console.error(`T${adj.i} type is ${adj.info.type}.`);
                    return;
            }


            // If a B-type triangle is met, all the line segments between the considered B-type triangle and the last C-type triangle, 
            // generated by A-type triangles, are firstly removed from the solution.
            // After that, the circumcentre of the last C-type triangle is connected to the B-type triangle's top vertex.

            // The algorithm then recursively visits the neighbouring triangles and upon each individual triangle type,
            // adds a contribution to the final MA.
        });
    }



    /** Recursively searches through the graph until a triangle of type B or C is reached.
     * - If a type-B triangle is reached, the last point added to the `MA` will be connected 
     *   to the top of the B-type triangle and the traversal will end.
     * - If a type-C triangle is reached, all midpoints traversed will be connected and a search 
     *   at triangle C will be initialised. 
     * 
     * @param prevCIndex The index of the circumcentre of the last C-type triangle added in `this.ma.points`.
     * */
    private startAtTypeA(prevCIndex: number, prevCTri: Triangle, index: number, triangle: Triangle, showDebug: boolean = false, maxSteps = this.g.triangles.length) {
        let addedFirstMidpoint = false;
        let firstAddedEdge;

        // at start, find first NOT disabled A type.
        // first non-disabled A-type, add the front AND end midpoints.
        // then every subsequent non-disabled, add only end midpoint.

        let prev = { i: -1, t: prevCTri };
        let curr = { i: index, t: triangle, info: this.triInfo[index]! };

        const addedMidpointVertices: Vec2[] = [];

        for (let j = 0; j < maxSteps; j++) {
            // starting from an A vertex.
            if (showDebug) console.log(`~~ visiting A-type triangle T${curr.i} ~~`);
            if (curr.info.visited) { if (showDebug) console.log(`- visited, returning`); return; }
            curr.info.visited = true;

            const adjacentTriangles = this.g.getAdjacentTriangles(curr.t);
            if (adjacentTriangles.length != 2) {
                if (showDebug) console.error(`type A triangle ${curr.i} has ${adjacentTriangles.length} adjacent triangles`);
                if (showDebug) console.error(adjacentTriangles);
                return;
            }

            const nextIndex = adjacentTriangles.find(i => !this.triInfo[i]?.visited);
            if (nextIndex == undefined) {
                if (showDebug) {
                    console.error(`- all adjacent visited`);
                    console.error(adjacentTriangles);
                }
                return;
            }
            const next = { i: nextIndex, t: this.g.triangles[nextIndex]!, info: this.triInfo[nextIndex]! }

            if (next.info.type == TriangleType.B) {
                if (showDebug) console.log(`- found B-type triangle T${next.i}`);

                const B_i = next.t.find(vertIndex => !curr.t.includes(vertIndex));
                if (B_i == undefined) { if (showDebug) console.error(`curr triangle == next triangle`); return; }
                const B = { i: B_i, v: this.g.vertices[B_i]! };

                if (addedMidpointVertices.length != 0) {
                    // percent of the distance from L to R. 1 will force M to be added.
                    const O = { v: this.ma.points[prevCIndex]! }
                    const OB = g2d.normalise(g2d.sub(B.v, O.v));
                    const [L, R] = firstAddedEdge!;
                    
                    const intersection = g2d.getRaySegmentIntersection(O.v, OB, L.v, R.v);
                    const threshold = 0.25; // percent each side. max is 0.5

                    // console.log(`intersection from T${index} to ${L.i}-${R.i}`);
                    console.log(intersection);
                    if (!intersection || intersection.u > 0.5 + threshold || intersection.u < 0.5 - threshold) {
                        this.ma.points.push(addedMidpointVertices[0]!);
                        this.ma.points.push(B.v);

                        this.ma.edges.push([prevCIndex, this.ma.points.length - 2]);
                        this.ma.edges.push([this.ma.points.length - 2, this.ma.points.length - 1]);
                        return;
                    }
                }

                this.ma.points.push(B.v);
                // connect last added
                this.ma.edges.push([prevCIndex, this.ma.points.length - 1]);
                return;
            }


            if (!curr.info.disabled) {
                if (!addedFirstMidpoint) {
                    // add the midpoint 
                    const edge = this.g.getEdgeBetweenTriangles(curr.t, prev.t)!;
                    firstAddedEdge = edge;
                    addedMidpointVertices.push(g2d.getMidpoint(edge[0].v, edge[1].v));
                    addedFirstMidpoint = true;
                }

                // add the midpoint
                const edge = this.g.getEdgeBetweenTriangles(curr.t, next.t)!;
                addedMidpointVertices.push(g2d.getMidpoint(edge[0].v, edge[1].v));
            } else {
                if (showDebug) console.log(`T${next.i} is disabled, skipping.`);
            }

            if (next.info.type == TriangleType.C) {
                if (showDebug) console.log(`- found C-type triangle T${next.i}`);
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

            // type A
            prev = curr;
            curr = next;
        }

        console.error(`maximum type-A search iterations exceeded (T${index})`);
    }
}

function getNumberOfPolygonEdges(tg: TriangleGraph, t: Triangle) {
    let numberOfPolygonEdges = 0;

    // CCW winding helpful here 
    if ((t[0] + 1) % tg.vertices.length == t[1]) numberOfPolygonEdges++;
    if ((t[1] + 1) % tg.vertices.length == t[2]) numberOfPolygonEdges++;
    if ((t[2] + 1) % tg.vertices.length == t[0]) numberOfPolygonEdges++;

    return numberOfPolygonEdges;
}