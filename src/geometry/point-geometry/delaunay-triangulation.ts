// implementation of Domiter & Zalik constrained sweep-line algorithm (2008).

import { Line } from "../classes/line.ts";
import { geometry2d, type Circle } from "./geometry2d.ts";
import { Point } from "../classes/point.ts";

export type DelaunayGraph = {
    points: Point[],
    count: number,
    graph: number[][],
    sweepLine: number[],
    current: number,
    finished: boolean
}

export type DelaunayCheckedCircle = {
    circle: Circle,
    legal: boolean,
    removedLine: null | number[]
}

export const delaunay = {
    delaunayTriangulation(points: Point[]) {
        if (points.length < 3) return null;

        const initialised = delaunay.initialise(points);

        return initialised;
    },

    initialise(points: Point[]): DelaunayGraph {
        const sorted = [...points];
        sorted.sort((a, b) => a.x - b.x);
        const xMin = sorted[0]!.x;
        const xMax = sorted[sorted.length - 1]!.x;

        sorted.sort((a, b) => a.y - b.y);
        const yMin = sorted[0]!.y;
        const yMax = sorted[sorted.length - 1]!.y;

        const alpha = 0.3;

        const deltaX = alpha * (xMax - xMin);
        const deltaY = alpha * (yMax - yMin);

        const Pm1 = new Point(xMin - deltaX, yMin - deltaY);
        const Pm2 = new Point(xMax + deltaX, yMin - deltaY);

        sorted.push(Pm1, Pm2);

        const res: DelaunayGraph = {
            points: sorted,
            count: points.length,
            graph: Array.from({ length: sorted.length }, () => []),
            sweepLine: [points.length, 0, points.length + 1],
            current: 1,
            finished: false
        };

        connectPoints(res.graph, res.count, 0);
        connectPoints(res.graph, res.count + 1, 0);
        connectPoints(res.graph, res.count, res.count + 1);

        return res;
    },

    iterate(d: DelaunayGraph) {
        // 3.4.1 Point event
        const P_i = d.points[d.current]!;
        // let P_L = d.points[d.sweepIndices[0]!], P_R, P_M;
        let L = d.sweepLine[0]!, R = -1, M = -1;
        let sweep_i: number = -1; // index of the point P_i in the sweep-edge after insertion.

        for (let i = 1; i < d.sweepLine.length; i++) {
            const curr = d.sweepLine[i]!;

            const P_curr = d.points[curr]!;
            if (P_curr.x > P_i.x) {
                R = curr
                d.sweepLine.splice(i, 0, d.current);
                sweep_i = i;
                break;
            } else if (P_curr.x == P_i.x) {
                d.sweepLine.splice(i, 1, d.current);
                M = curr;
                R = d.sweepLine[i + 1]!;
                sweep_i = i;
                break;
            }
            L = curr;
        }

        if (R == -1) { console.error("could not find a midpoint"); return; }
        if (sweep_i == -1) return; // just to trigger intellisense

        // add legal triangle
        let ccs;
        if (M == -1) {
            console.log(`adding triangle ${L}-${d.current}-${R}`);
            connectPoints(d.graph, d.current, L);
            connectPoints(d.graph, d.current, R);
            ccs = legaliseTriangle(d, d.current, L, R).dccs;
        } else {
            console.log(`adding triangles ${L}-${d.current}-${M} and ${M}-${d.current}-${R}`);
            connectPoints(d.graph, d.current, L);
            connectPoints(d.graph, d.current, M);
            connectPoints(d.graph, d.current, R);
            ccs = [
                ...legaliseTriangle(d, d.current, L, M).dccs,
                ...legaliseTriangle(d, d.current, M, R).dccs,
            ];
        }

        // fix 1) adjacent shallow angles: check angle between i and adjacent sweep edges. 
        // if angle is < pi/2, add and legalise a new triangle i-i+1-i+2

        for (let i = sweep_i; i < d.sweepLine.length - 2; i++) {
            const adjFillResult = checkAndFillAdjacentSharpAngles(d, i);
            if (!adjFillResult) break;
            ccs!.push(...adjFillResult);
        }

        for (let i = sweep_i; i > 2; i--) {
            const adjFillResult = checkAndFillAdjacentSharpAngles(d, i - 2);
            if (!adjFillResult) break;
            ccs!.push(...adjFillResult);
        }

        sweep_i = d.sweepLine.findIndex(p => p == d.current);

        // fix 2) check for basins
        ccs.push(...checkForBasins(d, sweep_i, false));
        ccs.push(...checkForBasins(d, sweep_i, true));




        d.current++;
        return ccs;
        // we have P_L and P_R defined

        // if (P_M) {pointEventLeftCase(d)}

        // assume middle case for now
    },

    /** Returns an array of all the circumcircles of the triangles for checking. */
    finalise(d: DelaunayGraph) {
        for (let i = 0; i < d.count; i++) {
            for (let j = 0; j < d.graph[i]!.length; j++) {
                if (d.graph[i]![j]! < d.count) continue;
                d.graph[i]!.splice(j, 1);
                j--;
            }
        }

        // for (let i = 0; i < d.graph.length; i++) {
        //     for (let j = 0; j < d.graph[i]!.length; j++) {
        //         d.graph[i]![j]! -= 2;
        //     }
        // }

        d.graph.splice(d.count, 2);
        d.points.splice(d.count, 2);
        d.sweepLine = [];

        const tris: number[][] = [];

        for (let i = 0; i < d.graph.length; i++) {
            const neighbors = d.graph[i] || [];
            for (let j = 0; j < neighbors.length; j++) {
                const u = neighbors[j]!;
                if (u <= i) continue; // Only look forward

                for (let k = j + 1; k < neighbors.length; k++) {
                    const v = neighbors[k]!;
                    if (v <= u) continue; // Only look forward

                    // Check if u and v are connected
                    if (!d.graph[u]?.includes(v)) continue;

                    tris.push([i, u, v]);
                }
            }
        }

        return tris.map(tri => geometry2d.getCircumcircle(d.points[tri[0]!]!, d.points[tri[1]!]!, d.points[tri[2]!]!));

    },

    getResultToLines(d: DelaunayGraph, normalColor: string, sweepColor: string): Line[] {
        const lines = [];

        // normal
        for (let i = 0; i < d.graph.length; i++) {
            for (let j = 0; j < d.graph[i]!.length; j++) {
                lines.push(new Line([d.points[i]!, d.points[d.graph[i]![j]!]!], null, normalColor));
            }
        }

        // sweep
        for (let i = 0; i < d.sweepLine.length - 1; i++) {
            lines.push(new Line([d.points[d.sweepLine[i]!]!, d.points[d.sweepLine[i + 1]!]!], null, sweepColor, 2, true));
        }

        return lines;
    }
}

function connectPoints(graph: number[][], a: number, b: number) {
    graph[a]?.push(b);
    graph[b]?.push(a);
}

function disconnectPoints(graph: number[][], a: number, b: number) {
    graph[a]?.splice(graph[a].findIndex(n => n == b), 1);
    graph[b]?.splice(graph[b].findIndex(n => n == a), 1);
}

function getSharedConnections(graph: number[][], a: number, b: number) {
    const shared: number[] = [];
    for (let i = 0; i < graph[a]!.length; i++) {
        let n = graph[a]![i]!;
        if (shared.includes(n)) continue;
        if (!graph[b]!.includes(n)) continue;
        shared.push(n);
    }
    return shared;
}

type DelaunayLegalisationResult = {
    dccs: DelaunayCheckedCircle[],
    flipped: boolean
}

/** Legalises the triangle pairs formed by the points A, B, X and Y, where Y forms the neighbouring triangle along the line AB.
 * 1) Determines the adjacent triangle A-B-Y.
 * 2) Finds the circumcircle of A-B-X.
 * 3) If Y is in the circumcircle, will disconnect A-B and connect X-Y, forming the legalised triangles A-X-Y and B-X-Y. 
 * - Returns an array of circumcircles in the order they are explored (including A-X-Y if it is switched).
*/
function legaliseTriangle(d: DelaunayGraph, X: number, A: number, B: number): { dccs: DelaunayCheckedCircle[], flipped: boolean } {
    console.log(`checking triangle ${A}-${X}-${B}`);
    let P_X = d.points[X]!, P_A = d.points[A]!, P_B = d.points[B]!;

    let P_Y;
    let Y = -1; // other index

    const shared = getSharedConnections(d.graph, A, B);
    for (let i = 0; i < shared.length; i++) {
        if (shared[i]! == X) continue;
        Y = shared[i]!;
    }

    if (Y == -1) { console.error("No adjacent triangle A-Y-B could be found."); return { dccs: [], flipped: false }; }

    const result: DelaunayLegalisationResult = {
        dccs: [],
        flipped: false
    }

    P_Y = d.points[Y]!;

    const ccs: DelaunayCheckedCircle[] = [{
        circle: geometry2d.getCircumcircle(P_A, P_B, P_X),
        legal: true,
        removedLine: null
    }, {
        circle: geometry2d.getCircumcircle(P_A, P_B, P_Y),
        legal: true,
        removedLine: null
    }];

    if (geometry2d.distance(P_Y, ccs[0]!.circle.centre) < ccs[0]!.circle.radius) {
        ccs[0]!.legal = false;
    }
    if (geometry2d.distance(P_X, ccs[1]!.circle.centre) < ccs[1]!.circle.radius) {
        ccs[1]!.legal = false;
    }

    if (!ccs[0]!.legal || !ccs[1]!.legal) {
        disconnectPoints(d.graph, A, B);
        connectPoints(d.graph, Y, X);
        ccs.push({
            circle: geometry2d.getCircumcircle(P_Y, P_X, P_B),
            legal: true,
            removedLine: [A, B]
        });
        console.log(`legalising triangle ${A}-${X}-${B}, adding and checking ${A}-${X}-${Y} & ${Y}-${X}-${B}`);
        result.flipped = true;

        let subA = legaliseTriangle(d, X, A, Y);
        if (subA) ccs.push(...subA.dccs);

        let subB = legaliseTriangle(d, X, Y, B);
        if (subB) ccs.push(...subB.dccs);
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
    console.log(`adjacency angle < pi/2, adding triangle ${pointIndices[0]}-${pointIndices[1]}-${pointIndices[2]}`);

    d.sweepLine.splice(leftSweepIndex + 1, 1);

    connectPoints(d.graph, pointIndices[0]!, pointIndices[2]!);

    // legalise connection - test left, then right if not.
    let legalResult = legaliseTriangle(d, pointIndices[2]!, pointIndices[0]!, pointIndices[1]!);
    let ccs = legalResult.dccs;

    if (!legalResult.flipped) { // didnt change, check other case
        ccs.push(...legaliseTriangle(d, pointIndices[0]!, pointIndices[1]!, pointIndices[2]!).dccs);
    }

    return ccs;
}

function checkForBasins(d: DelaunayGraph, sweep_i: number, leftSideCheck: boolean): DelaunayCheckedCircle[] {
    const P_i = d.points[d.current]!;
    let P_basin_start: Point | undefined, P_basin_end: Point | undefined;
    let basinStartIndex: number = -1, basinEndIndex: number = -1;
    if (leftSideCheck) {
        if (sweep_i <= 4) return [];
        basinEndIndex = sweep_i - 2;
        P_basin_end = d.points[d.sweepLine[basinEndIndex]!]!;
        if (P_basin_end.y <= d.points[d.sweepLine[basinEndIndex - 1]!]!.y) return [];

        const angle = Math.atan2(P_i.y - P_basin_end.y, P_i.x - P_basin_end.x);
        console.log(`checking angle ${angle * 180 / Math.PI}`);
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
        console.log(`checking angle ${angle* 180 / Math.PI}`);
        if (angle < 3 / 4 * Math.PI) return [];
        for (let i = basinStartIndex + 2; i < d.sweepLine.length; i++) {
            if (d.points[d.sweepLine[i]!]!.y < P_basin_start.y) continue;
            basinEndIndex = i;
            break;
        }
    }

    if (basinStartIndex < 0 || basinEndIndex < 0) { console.log("warning: failed to find basin end or start index"); return []; }
    console.log(`omg theres a basin P_${d.sweepLine[basinStartIndex]}-P_${d.sweepLine[basinEndIndex]}`);

    let ccs: DelaunayCheckedCircle[] = [];

    for (let i = basinStartIndex + 2; i <= basinEndIndex; i++) {
        console.log(`basin fill: connecting ${d.sweepLine[basinStartIndex]}-${d.sweepLine[i - 1]}-${d.sweepLine[i]}`);
        connectPoints(d.graph, d.sweepLine[basinStartIndex]!, d.sweepLine[i]!);

        let legalisationResult = legaliseTriangle(d, d.sweepLine[i]!, d.sweepLine[basinStartIndex]!, d.sweepLine[i - 1]!);
        ccs.push(...legalisationResult.dccs);
        if (legalisationResult.flipped) continue;

        legalisationResult = legaliseTriangle(d, d.sweepLine[basinStartIndex]!, d.sweepLine[i - 1]!, d.sweepLine[i]!);
        ccs.push(...legalisationResult.dccs);
    }

    d.sweepLine.splice(basinStartIndex + 1, basinEndIndex - basinStartIndex - 1);

    // if (P_check.y     > )

    return ccs;
}