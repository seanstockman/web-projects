/**
 * Bibliography
 * 
 * Based on
 * Smogavec, G. & Zalik, B. (2012). "A fast algorithm for constructing approximate medial axis of polygons, using Steiner points" 
 */


import * as poly2tri from "poly2tri";
import { geometry2d, type Point } from "../../lib/geometry/geometry2d.ts";
import { TriangleGraph, type Triangle, type Vertex } from "../../lib/geometry/triangle_graph.ts";

type insertedConvexSteinerPoints = {
    vertexIndex: number,
    before: Vertex,
    after: Vertex
}

export const medialAxis = {
    /** */
    initialise(points: Point[], tris: poly2tri.Triangle[]): TriangleGraph {
        return new TriangleGraph(points, tris);
    },

    // /** Returns a set of Steiner points to be added to the SweepContext object then re-triangulated. */
    // addSteinerPoints(points: Point[], swctx: poly2tri.SweepContext): Point[] {
    //     return [...this.getObtuseThreeNeighbourSteinerPoints(points, swctx), ...this.getConvexVertexSteinerPoints(points, swctx)];
    // },

    /** Finds and returns the Steiner Points to be added to resolve three-neighbour obtuse triangles (section 2.1). */
    addObtuseThreeNeighbourSteinerPoints(g: TriangleGraph) {
        const obtuseTriangles: Triangle[] = [];

        g.triangles.forEach(t => {
            const points = g.getPoints(t);
            const verts = g.getVertices(t);
            const circumcentre = geometry2d.getCircumcircle(...points).center;
            if (geometry2d.isPointInTriangle(circumcentre, ...points)) return;

            // does this have three neighbours?
            for (let i = 0; i < 3; i++) {
                const vertexA = verts[i]!;
                const vertexB = i == 3 ? verts[0]! : verts[i + 1]!;
                const C = i == 0 ? 2 : i - 1;
                const shared = vertexA.connections.filter(item => vertexB?.connections.includes(item)).filter(item => item != C);
                if (shared.length == 0) return;
            }

            obtuseTriangles.push(t);
        });

        if (obtuseTriangles.length == 0) return;

        console.log(`obtuseTriangles with three points:`);
        console.log(obtuseTriangles);
    },

    /** Finds and returns the Steiner Points to be added to resolve polygon convex vertices (section 2.2). */
    addConvexVertexSteinerPoints(g: TriangleGraph): Point[] {
        // find all convex vertices (interior angle < 180)

        // wound CW.

        const convexVertices = [];

        for (let i = 0; i < g.vertices.length; i++) {
            const V_curr = g.vertices[i]!;
            const V_next = g.vertices[(i + 1) % g.vertices.length]!;
            const V_prev = g.vertices[(i - 1 + g.vertices.length) % g.vertices.length]!;
            // CW wound    
            const turn = geometry2d.getAngleBetweenPoints(V_next, V_curr, V_prev);
            // const turn = geometry2d.crossProduct(V_prev, V_i, V_next);
            const isConvex = turn < Math.PI;
            if (isConvex) convexVertices.push(i);
        }

        console.log(`convex vertices:`);
        console.log(convexVertices);

        const steinerVertices = convexVertices.map(c => this.getSteinerPointsAtVertex(g, c));

        // insert these steiner points into the array of polygon vertices to get re-CDT'ed.
        const verticesWithSteinerPointsAdded: Point[] = [];
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

        console.log(verticesWithSteinerPointsAdded);

        return verticesWithSteinerPointsAdded;

        // const steinerPoints: Point[] = steinerVertices.map(v => ({ x: v.vertex.x, y: v.vertex.y }));

        // return geometry2d.removeDuplicatePoints(steinerPoints);
    },

    getSteinerPointsAtVertex(g: TriangleGraph, c: number): insertedConvexSteinerPoints {
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
        const cToPrev: Point = { x: v_prev.x - v_c.x, y: v_prev.y - v_c.y };
        const cToPrevNormalised = { x: cToPrev.x / distToPrev, y: cToPrev.y / distToPrev };

        const v_next = g.vertices[(c + 1) % g.vertices.length]!;
        const distToNext = geometry2d.distance(v_next, v_c);
        const cToNext: Point = { x: v_next.x - v_c.x, y: v_next.y - v_c.y };
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
    },
}