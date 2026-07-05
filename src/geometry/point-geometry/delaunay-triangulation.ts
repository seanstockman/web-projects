import { Line } from "../classes/line.ts";
import { geometry2d } from "./geometry2d.ts";
import { Point } from "../classes/point.ts";

export type DelaunayGraph = {
    points: Point[],
    graph: number[][],
    sweepIndices: number[],
    current: number
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
            sweepIndices: [0, 2, 1],
            current: 3
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
        let L = d.sweepIndices[0]!, R = -1, M = -1;

        for (let i = 1; i < d.sweepIndices.length; i++) {
            const curr = d.sweepIndices[i]!;

            const P_curr = d.points[curr]!;
            if (P_curr.x > P_i.x) {
                R = curr
                d.sweepIndices.splice(i, 0, d.current);
                break;
            } else if (P_curr.x == P_i.x) {
                d.sweepIndices.splice(i, 1, d.current);
                M = curr;
                R = d.sweepIndices[i + 1]!;
                break;
            }
            L = curr;
        }

        if (R == -1) { console.error("could not find a midpoint"); return; }

        let ccs;
        if (M == -1) {
            // 3.4.1 i
            ccs = addAndLegaliseNewTriangle(d, L, R);
        } else {
            // 3.4.1 ii
            ccs = [
                ...addAndLegaliseNewTriangle(d, L, M)!,
                ...addAndLegaliseNewTriangle(d, M, R)!,
            ];
        }

        d.current++;
        return ccs;
        // we have P_L and P_R defined

        // if (P_M) {pointEventLeftCase(d)}

        // assume middle case for now
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
        for (let i = 0; i < d.sweepIndices.length - 1; i++) {
            lines.push(new Line([d.points[d.sweepIndices[i]!]!, d.points[d.sweepIndices[i + 1]!]!], null, sweepColor, 2, true));
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

/** Connects the new point with index i (at d.current) to the graph.
 * 1) Determines the adjacent triangle L-R-O.
 * 2) Connects i-L and i-R, forming the triangle i-L-R
 * 3) Finds the circumcircle of i-L-R.
 * 4) If O is in the circumcircle, will disconnect L-R and connect i-O, forming the legalised triangles L-i-O and R-i-O. 
 * - Returns an array of circumcircles in the order they are explored (including L-i-O if it is switched).
*/
function addAndLegaliseNewTriangle(d: DelaunayGraph, L: number, R: number) {
    const P_L = d.points[L]!, P_R = d.points[R]!, P_i = d.points[d.current]!;

    let P_other;
    let otherIndex = -1;

    const leftPointConns = d.graph[L]!;
    const rightPointConns = d.graph[R]!;

    for (let i = 0; i < leftPointConns.length; i++) {
        for (let j = 0; j < rightPointConns.length; j++) {
            if (leftPointConns[i] != rightPointConns[j]) continue;
            otherIndex = leftPointConns[i]!;
            break;
        }
        if (otherIndex != -1) break;
    }

    if (otherIndex == -1) { console.error("No adjacent triangle could be found."); return; }

    P_other = d.points[otherIndex]!;

    connectPoints(d.graph, L, d.current);
    connectPoints(d.graph, R, d.current);
    const ccs = [geometry2d.getCircumcircle(P_L, P_R, P_i)];

    if (geometry2d.distance(P_other, ccs[0]!.centre) < ccs[0]!.radius) {
        disconnectPoints(d.graph, L, R);
        connectPoints(d.graph, otherIndex, d.current);
        ccs.push(geometry2d.getCircumcircle(P_other, P_i, P_R));
    }

    return ccs;
}