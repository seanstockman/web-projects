import { Line } from "../classes/line.ts";
import { geometry2d } from "./geometry2d.ts";
import { Point } from "../classes/point.ts";

export type DelaunayResult = {
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

    initialise(points: Point[]): DelaunayResult {
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

        const res: DelaunayResult = {
            points: sorted,
            graph: Array.from({ length: sorted.length }, () => []),
            sweepIndices: [0, 2, 1],
            current: 3
        };

        delaunay.connectPoints(res.graph, 0, 2);
        delaunay.connectPoints(res.graph, 1, 2);
        delaunay.connectPoints(res.graph, 0, 1);

        return res;
    },

    connectPoints(graph: number[][], a: number, b: number) {
        console.log(`connecting ${a} and ${b}`);
        graph[a]?.push(b);
        graph[b]?.push(a);
    },

    disconnectPoints(graph: number[][], a: number, b: number) {
        graph[a]?.splice(graph[a].findIndex(n => n == b), 1);
        graph[b]?.splice(graph[b].findIndex(n => n == a), 1);
    },

    iterate(d: DelaunayResult) {
        // 3.4.1 Point event
        const P_i = d.points[d.current]!;
        console.log(d.points);
        console.log(d.sweepIndices);
        console.log(`current: ${d.current}`);
        // let P_L = d.points[d.sweepIndices[0]!], P_R, P_M;
        let L = d.sweepIndices[0]!, R = -1, M = -1;

        for (let i = 1; i < d.sweepIndices.length; i++) {
            const curr = d.sweepIndices[i]!;

            // console.log(`curr: ${curr}, L: ${L}, R: ${R}`);

            const P_curr = d.points[curr]!;
            if (P_curr.x > P_i.x) {
                R = curr
                d.sweepIndices.splice(i, 0, d.current);
                break;
            } else if (P_curr.x == P_i.x) {
                M = curr;
                R = d.sweepIndices[i + 1]!;
                break;
            }
            L = curr;
        }

        if (R == -1) { console.error("could not find a midpoint"); return; }

        let ccs;
        if (M == -1) {
            console.log('itr: middle case');
            ccs = delaunay.pointEventMiddleCase(d, L, R);
        } else {
            console.log(`M: ${M}`);
            delaunay.pointEventLeftCase(d);
        }

        d.current++;
        return ccs;
        // we have P_L and P_R defined

        // if (P_M) {pointEventLeftCase(d)}

        // assume middle case for now
    },

    // 3.4.1 i
    pointEventMiddleCase(d: DelaunayResult, leftIndex: number, rightIndex: number) {
        const P_L = d.points[leftIndex]!, P_R = d.points[rightIndex]!, P_i = d.points[d.current]!;

        let P_other;
        let otherIndex = -1;

        const leftPointConns = d.graph[leftIndex]!;
        const rightPointConns = d.graph[rightIndex]!;

        for (let i = 0; i < leftPointConns.length; i++) {
            for (let j = 0; j < rightPointConns.length; j++) {
                if (leftPointConns[i] != rightPointConns[j]) continue;
                otherIndex = leftPointConns[i]!;
                break;
            }
            if (otherIndex != -1) break;
        }

        P_other = d.points[otherIndex]!;

        // const P_Q = geometry2d.getInterceptFromPoints(P_L, P_R, P_i, {x: P_i.x, y: P_i.y - 1});
        delaunay.connectPoints(d.graph, leftIndex, d.current);
        delaunay.connectPoints(d.graph, rightIndex, d.current);
        const ccs = [geometry2d.getCircumcircle(P_L, P_R, P_i)];


        // console.log(`otherI: ${otherIndex}`);

        if (geometry2d.distance(P_other, ccs[0]!.centre) < ccs[0]!.radius) {
            console.log(`flipping.`);
            delaunay.disconnectPoints(d.graph, leftIndex, rightIndex);
            delaunay.connectPoints(d.graph, otherIndex, d.current);
            ccs.push(geometry2d.getCircumcircle(P_other, P_i, P_R));
        }

        return ccs;
    },

    // 3.4.1 ii
    pointEventLeftCase(d: DelaunayResult) {
        console.error('not implemented pointEventLeftCase');

    },

    getResultToLines(d: DelaunayResult, normalColor: string, sweepColor: string): Line[] {
        const lines = [];

        // normal
        for (let i = 0; i < d.graph.length; i++) {
            console.log(`graph i:`);
            console.log(d.graph[i]);
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