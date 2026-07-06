import { Line } from "../classes/line.ts";
import { geometry2d, type Circle } from "./geometry2d.ts";
import { Point } from "../classes/point.ts";

export type DelaunayGraph = {
    points: Point[],
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

        sorted.unshift(Pm1, Pm2);

        const res: DelaunayGraph = {
            points: sorted,
            graph: Array.from({ length: sorted.length }, () => []),
            sweepLine: [0, 2, 1],
            current: 3,
            finished: false
        };

        connectPoints(res.graph, 0, 2);
        connectPoints(res.graph, 1, 2);
        connectPoints(res.graph, 0, 1);

        return res;
    },

    iterate(d: DelaunayGraph) {
        // 3.4.1 Point event
        const P_i = d.points[d.current]!;
        // let P_L = d.points[d.sweepIndices[0]!], P_R, P_M;
        let L = d.sweepLine[0]!, R = -1, M = -1;
        let sweep_i; // index of the point P_i in the sweep-edge after insertion.

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
        if (sweep_i == undefined) return; // just to trigger intellisense

        let ccs;
        if (M == -1) {
            // 3.4.1 i
            console.log(`adding triangle ${d.current}-${L}-${R}`);
            connectPoints(d.graph, d.current, L);
            connectPoints(d.graph, d.current, R);
            ccs = legaliseTriangle(d, d.current, L, R);
        } else {
            // 3.4.1 ii
            console.log(`adding triangles ${d.current}-${L}-${M} and ${d.current}-${M}-${R}`);
            connectPoints(d.graph, d.current, L);
            connectPoints(d.graph, d.current, M);
            connectPoints(d.graph, d.current, R);
            ccs = [
                ...legaliseTriangle(d, d.current, L, M)!,
                ...legaliseTriangle(d, d.current, M, R)!,
            ];
        }

        // triangle(s) are added... now check visible
        // step 1) check angle between i and adjacent sweep edges. if angle is < pi/2, add and legalise a new triangle i-i+1-i+2

        for (let i = sweep_i; i > 2; i--) {
            const adjFillResult = checkAndFillAdjacentSharpAngles(d, i - 2);
            if (!adjFillResult) break;
            ccs!.push(...adjFillResult);
        }

        for (let i = sweep_i; i < d.sweepLine.length - 2; i++) {
            const adjFillResult = checkAndFillAdjacentSharpAngles(d, i);
            if (!adjFillResult) break;
            ccs!.push(...adjFillResult);
        }

        d.current++;
        return ccs;
        // we have P_L and P_R defined

        // if (P_M) {pointEventLeftCase(d)}

        // assume middle case for now
    },

    finalise(d: DelaunayGraph) {
        for (let i = 2; i < d.graph.length; i++) {
            for (let j = 0; j < d.graph[i]!.length; j++) {
                if (d.graph[i]![j]! >= 2) continue;
                d.graph[i]!.splice(j, 1);
                j--;
            }
        }

        for (let i = 0; i < d.graph.length; i++) {
            for (let j = 0; j < d.graph[i]!.length; j++) {
                d.graph[i]![j]! -= 2;
            }
        }

        d.graph.splice(0, 2);
        d.points.splice(0, 2);
        d.sweepLine.splice(d.sweepLine.length - 1, 1);
        d.sweepLine.splice(0, 1);
        d.sweepLine = [];
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

/** Connects the new point with index i to the graph. */
// function addAndLegaliseNewTriangle(d: DelaunayGraph, X: number, A: number, B: number) {
//     connectPoints(d.graph, A, X);
//     connectPoints(d.graph, B, X);

//     return legaliseTriangle(d, X, A, B);
// }

/** Legalises the triangle pairs formed by the points A, B, X and Y, where Y forms the neighbouring triangle along the line AB.
 * 1) Determines the adjacent triangle A-B-Y.
 * 2) Finds the circumcircle of A-B-X.
 * 3) If Y is in the circumcircle, will disconnect A-B and connect X-Y, forming the legalised triangles A-X-Y and B-X-Y. 
 * - Returns an array of circumcircles in the order they are explored (including A-X-Y if it is switched).
*/
function legaliseTriangle(d: DelaunayGraph, X: number, A: number, B: number) {
    const P_X = d.points[X]!, P_A = d.points[A]!, P_B = d.points[B]!;

    let P_Y;
    let Y = -1; // other index

    const leftPointConns = d.graph[A]!;
    const rightPointConns = d.graph[B]!;

    for (let i = 0; i < leftPointConns.length; i++) {
        for (let j = 0; j < rightPointConns.length; j++) {
            if (leftPointConns[i] != rightPointConns[j]) continue;
            if (leftPointConns[i] == X) continue;
            Y = leftPointConns[i]!;
            break;
        }
        if (Y != -1) break;
    }

    if (Y == -1) { console.error("No adjacent triangle A-B-Y could be found."); return; }

    P_Y = d.points[Y]!;

    const ccs: DelaunayCheckedCircle[] = [{
        circle: geometry2d.getCircumcircle(P_A, P_B, P_X),
        legal: true,
        removedLine: null
    }];

    if (geometry2d.distance(P_Y, ccs[0]!.circle.centre) < ccs[0]!.circle.radius) {
        ccs[0]!.legal = false;

        disconnectPoints(d.graph, A, B);
        connectPoints(d.graph, Y, X);
        ccs.push({
            circle: geometry2d.getCircumcircle(P_Y, P_X, P_B),
            legal: true,
            removedLine: [A, B]
        });
        console.log(`legalising triangle ${X}-${A}-${B}, adding  ${A}-${X}-${Y} & ${B}-${X}-${Y}`);
    }

    return ccs;
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
    let ccs = legaliseTriangle(d, pointIndices[2]!, pointIndices[0]!, pointIndices[1]!);

    if (ccs!.length == 1) { // didnt change, check other case
        ccs = legaliseTriangle(d, pointIndices[0]!, pointIndices[1]!, pointIndices[2]!);
    }

    return ccs;
}