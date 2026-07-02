import { Vector2 as Vec2 } from "../classes/vector-2.ts";
import { Point } from "../classes/point.ts";

export default function delauneyTriangulation(points: Point[]) {
    if (points.length < 3) return null;

    const initialised = initialisation(points);

    return initialised;
    // const sorted = [...points];
    // sorted.sort((a, b) => a.x - b.x);
    // sorted.sort((a, b) => a.y - b.y);

}

function initialisation(points: Point[]) {
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

    Pm1.addConnection(sorted[2]!);
    Pm2.addConnection(sorted[2]!);
    Pm1.addConnection(Pm2);

    return {
        points: sorted,
        sweepIndices: [0, 2, 1],
    };
}