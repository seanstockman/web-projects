import { Line } from "../classes/line.ts";
import { Point } from "../classes/point.ts";

type DelaunayResult = {
    points: Point[],
    graph: number[][],
    sweepIndices: number[],
}

export default function delaunayTriangulation(points: Point[]) {
    if (points.length < 3) return null;

    const initialised = initialisation(points);

    return initialised;
    // const sorted = [...points];
    // sorted.sort((a, b) => a.x` - b.x);
    // sorted.sort((a, b) => a.y - b.y);

}

export function initialisation(points: Point[]): DelaunayResult {
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
        sweepIndices: [0, 2, 1]
    };

    connect(res.graph, 0, 2);
    connect(res.graph, 1, 2);
    connect(res.graph, 0, 1);

    return res;
}

function connect(graph: number[][], a: number, b: number) {
    graph[a]?.push(b);
    graph[b]?.push(a);
}


export function delaunayResultAsLines(d: DelaunayResult, normalColor: string, sweepColor: string): Line[] {
    const lines = [];

    // normal

    for (let i = 0; i < d.graph.length; i++) {
        for (let j = 0; j < d.graph[i]!.length; j++) {
            lines.push(new Line([d.points[i]!, d.points[j]!], null, normalColor));
        }
    }

    // sweep
    for (let i = 0; i < d.sweepIndices.length - 1; i++) {
        lines.push(new Line([d.points[d.sweepIndices[i]!]!, d.points[d.sweepIndices[i + 1]!]!], null, sweepColor, 2, true));
    }

    return lines;
}