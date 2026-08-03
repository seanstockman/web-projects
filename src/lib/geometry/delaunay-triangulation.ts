// implementation of Domiter & Zalik constrained sweep-line algorithm (2008).

import { geometry2d, type Circle, type Point } from "./geometry2d.ts";
import { HalfEdgeGraph, halfEdgeTriangular } from "./halfedge.ts";

export type DelaunayGraph = {
    points: PointWithConnections[],
    count: number,
    graph: HalfEdgeGraph,
    sweepLine: number[],
    current: number,
    finished: boolean,
}

export type DelaunayCheckedCircle = {
    circle: Circle,
    legal: boolean,
    removedLine: null | number[]
}

type PointWithConnections = Point & {
    connectingVertices: number[]
}

export const delaunay = {
    delaunayTriangulation(dg: DelaunayGraph) {
        while (dg.current < dg.count) {
            console.log(`~~~~~ adding vertex ${dg.current} ~~~~~~`);
            this.iterate(dg);
        }
        this.finalise(dg);
    },

    initialise(vertices: Point[], lines: Point[][]): DelaunayGraph {

        const sortedVertices: PointWithConnections[] = vertices.map(p => ({ x: p.x, y: p.y, connectingVertices: [] }));
        // The last duplicate element wins with this approach


        // sort by x left to right
        sortedVertices.sort((a, b) => a.x - b.x);
        const xMin = sortedVertices[0]!.x;
        const xMax = sortedVertices[sortedVertices.length - 1]!.x;

        // sort by y bottom to top
        sortedVertices.sort((a, b) => a.y - b.y);
        const yMin = sortedVertices[0]!.y;
        const yMax = sortedVertices[sortedVertices.length - 1]!.y;

        const alpha = 0.3;

        const deltaX = alpha * (xMax - xMin);
        const deltaY = alpha * (yMax - yMin);

        const Pm1: PointWithConnections = { x: xMin - deltaX, y: yMin - deltaY, connectingVertices: [] };
        const Pm2: PointWithConnections = { x: xMax + deltaX, y: yMin - deltaY, connectingVertices: [] };

        sortedVertices.push(Pm1, Pm2);

        // add the connection indices
        const connectionIndices: number[][] = [];
        lines.forEach((l, i) => {
            const lineIndices: number[] = [];
            l.forEach(p => {
                lineIndices.push(sortedVertices.findIndex(sortedPoint => sortedPoint.x == p.x && sortedPoint.y == p.y));
            });
            connectionIndices.push(lineIndices);
        });

        // remove duplicates in a row
        connectionIndices.forEach(l => {
            let prev: number = -1;
            for (let i = 0; i < l.length; i++) {
                if (prev != l[i]) { prev = l[i]!; continue; }
                l.splice(i, 1);
                i--;
            }
        });

        console.log(`connectionIndices:`);
        console.log(connectionIndices);

        connectionIndices.forEach((l) => {
            for (let i = 0; i < l.length - 1; i++) {
                const A = l[i];
                const B = l[i + 1];
                if (A == undefined || B == undefined) { console.error(`the length of l exceeds the index ${i} or ${i + 1}`); console.log(l); continue; }
                const vertexA = sortedVertices[A];
                const vertexB = sortedVertices[B];
                if (!vertexA || !vertexB) { console.error(`vertex ${A} or ${B} does not exist.`); continue; }

                if (vertexA.y < vertexB.y) {
                    // add point A index to point B
                    vertexB.connectingVertices.push(A);
                } else {
                    // add point B index to point A
                    vertexA.connectingVertices.push(B);
                }
            }
        });

        console.log(`sorted:`);
        console.log(sortedVertices);


        const dg: DelaunayGraph = {
            points: sortedVertices,
            count: vertices.length,
            graph: new HalfEdgeGraph(sortedVertices),
            sweepLine: [vertices.length, 0, vertices.length + 1],
            current: 1,
            finished: false,
        };

        dg.graph.addTriangle(dg.count, 0, dg.count + 1);

        return dg;
    },

    iterate(dg: DelaunayGraph) {
        // 3.4.1 Point event
        const P_curr = dg.points[dg.current]!;
        // let P_L = d.points[d.sweepIndices[0]!], P_R, P_M;
        let L = dg.sweepLine[0]!, R = -1, M = -1;
        let sweepIndexOfCurr: number = -1; // index of the point P_i in the sweep-edge after insertion.

        for (let i = 1; i < dg.sweepLine.length; i++) {
            const sweepline_i = dg.sweepLine[i]!;

            const P_sweepline_i = dg.points[sweepline_i]!;
            if (P_sweepline_i.x > P_curr.x) {
                R = sweepline_i;
                // insert current to the sweepline at point i
                dg.sweepLine.splice(i, 0, dg.current);
                sweepIndexOfCurr = i;
                break;
            } else if (P_sweepline_i.x == P_curr.x) {
                dg.sweepLine.splice(i, 1, dg.current);
                M = sweepline_i;
                R = dg.sweepLine[i + 1]!;
                sweepIndexOfCurr = i;
                break;
            }
            L = sweepline_i;
        }

        if (R == -1) { console.error("could not find a midpoint"); return; }
        if (sweepIndexOfCurr == -1) return; // just to trigger intellisense

        // add legal triangle
        let ccs;
        if (M == -1) {
            console.log(`adding triangle ${L}-${dg.current}-${R}`);
            dg.graph.addTriangle(L, dg.current, R);
            ccs = legaliseTriangle(dg, dg.current, L, R).dccs;
        } else {
            console.log(`adding triangles ${L}-${dg.current}-${M} and ${M}-${dg.current}-${R}`);
            dg.graph.addTriangle(L, dg.current, M);
            dg.graph.addTriangle(M, dg.current, R);
            ccs = [
                ...legaliseTriangle(dg, dg.current, L, M).dccs,
                ...legaliseTriangle(dg, dg.current, M, R).dccs,
            ];
        }

        // fix 1) adjacent shallow angles: check angle between i and adjacent sweep edges. 
        // if angle is < pi/2, add and legalise a new triangle i-i+1-i+2

        for (let i = sweepIndexOfCurr; i < dg.sweepLine.length - 2; i++) {
            const adjFillResult = checkAndFillAdjacentSharpAngles(dg, i);
            if (!adjFillResult) break;
            ccs!.push(...adjFillResult);
        }

        for (let i = sweepIndexOfCurr; i > 2; i--) {
            const adjFillResult = checkAndFillAdjacentSharpAngles(dg, i - 2);
            if (!adjFillResult) break;
            ccs!.push(...adjFillResult);
        }

        sweepIndexOfCurr = dg.sweepLine.findIndex(p => p == dg.current);

        // fix 2) check for basins
        ccs.push(...checkForBasins(dg, sweepIndexOfCurr, false));
        ccs.push(...checkForBasins(dg, sweepIndexOfCurr, true));


        if (P_curr.connectingVertices.length == 0) {
            dg.current++;
            return ccs;
        }

        // 3.4.2. edge event
        // if the vertex I contains
        console.log(`EDGE EVENT! POINT ${dg.current} contains the following connections:`);
        console.log(P_curr.connectingVertices);

        P_curr.connectingVertices.forEach(connectedVertexIndex => {
            console.log(`traversing ${dg.current}->${connectedVertexIndex}`);

            // check case where edge is directly connected.
            let directEdgeIndex = dg.graph.findEdgeIndex(dg.current, connectedVertexIndex);
            if (directEdgeIndex == -1) {
                directEdgeIndex = dg.graph.findEdgeIndex(connectedVertexIndex, dg.current);
            }
            if (directEdgeIndex != -1) {
                const directEdge = dg.graph.halfEdges[directEdgeIndex];
                if (!directEdge) { console.error(`edge ${directEdgeIndex} does not exist`); return; }
                console.log(`locking directedge ${dg.graph.edgeToString(directEdge)}`);
                directEdge.locked = true;
                return;
            }

            console.log(`traversed faces:`);
            const traversedFaces = halfEdgeTriangular.traverse(dg.graph, dg.current, connectedVertexIndex);
            console.log(traversedFaces);
        });

        // dg.graph.getAngleMap(dg.current);




        dg.current++;
        return ccs;
    },

    /** Returns an array of all the circumcircles of the triangles for checking.
     * i) removes triangles defined by at least one artificial point
     * ii) adds the bordering triangles forming the convex hull of V
     */
    finalise(d: DelaunayGraph) {
        triangulateChain(d, d.sweepLine.slice(1, d.sweepLine.length - 1));

        const baseLine = [d.sweepLine[d.sweepLine.length - 2]!];
        let edge = d.graph.findEdgeIndex(d.sweepLine[d.sweepLine.length - 2]!, d.sweepLine[d.sweepLine.length - 1]!);
        let prevEdge;
        while (edge != -1) {
            prevEdge = d.graph.halfEdges[d.graph.halfEdges[edge]!.prev]!;
            if (prevEdge.origin == d.points.length - 2) { edge = prevEdge.twin; continue; }
            baseLine.push(prevEdge.origin);
            edge = d.graph.halfEdges[prevEdge.prev]!.twin;
        }

        for (let i = 0; i < 2; i++) {
            const v = d.graph.vertices[d.graph.vertices.length - 1 - i]!;
            v.edges.forEach(e_i => {
                const e = d.graph.halfEdges[e_i]!;
                d.graph.removeFace(e.face);
            });
        }

        triangulateChain(d, baseLine);

        d.points.splice(d.points.length - 2, 2);
        d.sweepLine = [];

        d.graph.clean();
    },

    getFacesAsCircumcircles(d: DelaunayGraph) {
        const tris: number[][] = d.graph.faces.filter(f => f.edges.length == 3).map(face => [
            d.graph.halfEdges[face.edges[0]!]!.origin,
            d.graph.halfEdges[face.edges[1]!]!.origin,
            d.graph.halfEdges[face.edges[2]!]!.origin
        ]);

        const centrepoints = tris.map(tri => geometry2d.getMeanOfPoints(
            d.points[tri[0]!]!,
            d.points[tri[1]!]!,
            d.points[tri[2]!]!,
        ));

        let triCircles = tris.map(tri => geometry2d.getCircumcircle(d.points[tri[0]!]!, d.points[tri[1]!]!, d.points[tri[2]!]!));

        for (let i = 0; i < tris.length; i++) {
            let c = triCircles[i]!;
            for (let j = 0; j < d.points.length; j++) {
                if (tris[i]!.includes(j)) continue;
                let X = d.points[j]!;
                if (geometry2d.distance(X, c.center) > c.radius) continue;
                console.error(`triangle ${tris[i]} includes point ${j}`);
            }
        }

        return { circles: triCircles, centrepoints: centrepoints };
    },

    getResultToLines(d: DelaunayGraph): { points: Point[], sweep: boolean }[] {
        const lines: { points: Point[], sweep: boolean }[] = [];

        // normal
        d.graph.halfEdges.forEach(he => {
            if (he.dead) { lines.push(); return; }
            lines.push({
                points: [d.points[he.origin]!, d.points[he.target]!],
                sweep: false
            });
        });

        // sweep
        for (let i = 0; i < d.sweepLine.length - 1; i++) {
            lines.push({
                points: [d.points[d.sweepLine[i]!]!, d.points[d.sweepLine[i + 1]!]!],
                sweep: true
            });
        }

        return lines;
    }
}

type DelaunayLegalisationResult = {
    dccs: DelaunayCheckedCircle[],
    flipped: boolean
}

/** Legalises the triangle pairs ABC & ACD formed by the points A, B, C and D (where AC & D forms the opposing triangle).
 * 1) Determines the adjacent triangle ACD.
 * 2) Finds the circumcircles of ABC & ACD.
 * 3) If D is in the circumcircle ABC (or vice versa), will disconnect AC and connect BD, forming the legalised triangles ABD and BCD. 
 * - Returns an array of circumcircles in the order they are explored (including ABD & BDC if they are switched).
*/
function legaliseTriangle(dg: DelaunayGraph, B: number, A: number, C: number): { dccs: DelaunayCheckedCircle[], flipped: boolean } {


    const result: DelaunayLegalisationResult = {
        dccs: [],
        flipped: false
    }

    const edgeAC = dg.graph.halfEdges[dg.graph.findEdgeIndex(A, C)]!;
    const edgeAcPrev = edgeAC.prev;
    if (!edgeAcPrev) return result;
    const edgeAcPrevEdge = dg.graph.halfEdges[edgeAcPrev];
    if (!edgeAcPrevEdge) return result;

    const D = edgeAcPrevEdge.origin;

    // console.log(`checking triangle pairs along ${A}-${C}`);
    const P_B = dg.points[B]!, P_A = dg.points[A]!, P_C = dg.points[C]!, P_D = dg.points[D]!;

    const ccs: DelaunayCheckedCircle[] = [{
        circle: geometry2d.getCircumcircle(P_A, P_C, P_B),
        legal: true,
        removedLine: null
    }, {
        circle: geometry2d.getCircumcircle(P_A, P_C, P_D),
        legal: true,
        removedLine: null
    }];

    if (geometry2d.distance(P_D, ccs[0]!.circle.center) < ccs[0]!.circle.radius) {
        ccs[0]!.legal = false;
    }
    if (geometry2d.distance(P_B, ccs[1]!.circle.center) < ccs[1]!.circle.radius) {
        ccs[1]!.legal = false;
    }

    if (!ccs[0]!.legal || !ccs[1]!.legal) {
        // console.log(`legalising triangle ${A}-${B}-${C}, adding and checking ${A}-${B}-${D} & ${D}-${B}-${C}`);
        if (!dg.graph.flipTriangles(A, B, C, D)) {
            console.error(`could not flip triangle ${A}-${B}-${C}`);
            return result;
        }
        ccs.push({
            circle: geometry2d.getCircumcircle(P_D, P_B, P_C),
            legal: true,
            removedLine: [A, C]
        });
        result.flipped = true;

        if (dg.graph.halfEdges[dg.graph.findEdgeIndex(D, A)]!.twin != -1) {
            ccs.push(...legaliseTriangle(dg, B, A, D).dccs);
        }

        if (dg.graph.halfEdges[dg.graph.findEdgeIndex(C, D)]!.twin != -1) {
            ccs.push(...legaliseTriangle(dg, B, D, C).dccs);
        }
    }

    result.dccs.push(...ccs);
    return result;
}

const sweepAddThreshold = Math.PI / 2;

/** Checks the angle between the points on the sweepline, starting from the given leftmost index, A. 
 * If the angle A-B-C < pi/2, it will add a new legal triangle to the graph and return any generated circumcircles.
 * Returns null otherwise. */
function checkAndFillAdjacentSharpAngles(d: DelaunayGraph, leftSweepIndex: number) {
    const pointIndices = [d.sweepLine[leftSweepIndex]!, d.sweepLine[leftSweepIndex + 1]!, d.sweepLine[leftSweepIndex + 2]!];
    const a = geometry2d.getAngleBetweenPoints(d.points[pointIndices[0]!]!, d.points[pointIndices[1]!]!,
        d.points[pointIndices[2]!]!);
    if (a > sweepAddThreshold) return null;
    // console.log(`adjacency angle < pi/2, adding triangle ${pointIndices[0]}-${pointIndices[2]}-${pointIndices[1]}`);

    d.sweepLine.splice(leftSweepIndex + 1, 1);

    d.graph.addTriangle(pointIndices[0]!, pointIndices[2]!, pointIndices[1]!);

    // legalise connection - test left, then right if not.
    let legalResult = legaliseTriangle(d, pointIndices[2]!, pointIndices[0]!, pointIndices[1]!);
    let ccs = legalResult.dccs;

    if (!legalResult.flipped) { // didnt change, check other case
        ccs.push(...legaliseTriangle(d, pointIndices[0]!, pointIndices[1]!, pointIndices[2]!).dccs);
    }

    return ccs;
}

function checkForBasins(d: DelaunayGraph, sweep_i: number, leftSideCheck: boolean): DelaunayCheckedCircle[] {
    // FIXME: KNOWN BUG: if the basin is not convex, 
    const P_i = d.points[d.current]!;
    let P_basin_start: Point | undefined, P_basin_end: Point | undefined;
    let basinStartIndex: number = -1, basinEndIndex: number = -1;
    if (leftSideCheck) {
        if (sweep_i <= 4) return [];
        basinEndIndex = sweep_i - 2;
        P_basin_end = d.points[d.sweepLine[basinEndIndex]!]!;
        if (P_basin_end.y <= d.points[d.sweepLine[basinEndIndex - 1]!]!.y) return [];

        const angle = Math.atan2(P_i.y - P_basin_end.y, P_i.x - P_basin_end.x);
        // console.log(`checking angle ${angle * 180 / Math.PI}`);
        if (angle > Math.PI / 4) return [];
        for (let i = basinEndIndex - 2; i >= 0; i--) {
            if (d.points[d.sweepLine[i]!]!.y < P_basin_end.y) continue;
            basinStartIndex = i;
            break;
        }
    } else {
        // right side check
        if (sweep_i >= d.sweepLine.length - 5) return [];
        basinStartIndex = sweep_i + 2;
        P_basin_start = d.points[d.sweepLine[basinStartIndex]!]!
        if (P_basin_start.y <= d.points[d.sweepLine[basinStartIndex + 1]!]!.y) return [];

        const angle = Math.atan2(P_i.y - P_basin_start.y, P_i.x - P_basin_start.x);
        // console.log(`checking angle ${angle * 180 / Math.PI}`);
        if (angle < 3 / 4 * Math.PI) return [];
        for (let i = basinStartIndex + 2; i < d.sweepLine.length; i++) {
            if (d.points[d.sweepLine[i]!]!.y < P_basin_start.y) continue;
            basinEndIndex = i;
            break;
        }
    }

    if (basinStartIndex < 0 || basinEndIndex < 0) { console.log("warning: failed to find basin end or start index"); return []; }
    // console.log(`Found basin from P_${d.sweepLine[basinStartIndex]} to P_${d.sweepLine[basinEndIndex]}.`);

    const result = triangulateChain(d, d.sweepLine.slice(basinStartIndex, basinEndIndex + 1));
    d.sweepLine.splice(basinStartIndex + 1, basinEndIndex - basinStartIndex - 1);
    return result;
}

/** Triangulates a chain of points (x-sorted, e.g. a full sweep line or any sub-range of one)
 *  using the stack-based monotone-polygon algorithm. Handles arbitrary undulation. */
function triangulateChain(d: DelaunayGraph, chain: number[]): DelaunayCheckedCircle[] {
    const ccs: DelaunayCheckedCircle[] = [];
    if (chain.length < 3) return ccs;

    const stack: number[] = [chain[0]!, chain[1]!];

    for (let i = 2; i < chain.length; i++) {
        const v = chain[i]!;

        while (stack.length >= 2) {
            const top = stack[stack.length - 1]!;
            const second = stack[stack.length - 2]!;

            const area = geometry2d.getSignedArea(d.points[second]!, d.points[top]!, d.points[v]!);
            if (area <= 0) break; // not a valid ear here — stop popping

            // console.log(`chain fill: adding triangle ${second}-${v}-${top}`);
            d.graph.addTriangle(second, v, top); // matches your CW winding convention
            ccs.push(...legaliseTriangle(d, v, second, top).dccs);
            ccs.push(...legaliseTriangle(d, second, top, v).dccs);
            stack.pop();
        }
        stack.push(v);
    }

    return ccs;
}

/** CONSTRAINED DELAUNAY TRIANGULATION */

