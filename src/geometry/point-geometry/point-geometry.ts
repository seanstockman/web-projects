import { Vector2 as Vec2 } from "../classes/vector-2.ts";

interface Circle {
    center: Vec2;
    radius: number;
}

export function findCircumcircle(vecs: Vec2[]): Circle {
    // Common denominator calculation
    const A = vecs[0];
    const B = vecs[1];
    const C = vecs[2];
    if (A == undefined || B == undefined || C == undefined) throw new Error("One vector is undefined");

    const d = 2.0 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    
    // Check for collinearity (Vec2s on a straight line or overlapping)
    if (Math.abs(d) < 1e-9) {
        throw new Error("Vec2s are collinear. Circumcircle does not exist.");
    }

    const aSq = A.x * A.x + A.y * A.y;
    const bSq = B.x * B.x + B.y * B.y;
    const cSq = C.x * C.x + C.y * C.y;

    // Calculate Circumcenter (x, y)
    const ux = (aSq * (B.y - C.y) + bSq * (C.y - A.y) + cSq * (A.y - B.y)) / d;
    const uy = (aSq * (C.x - B.x) + bSq * (A.x - C.x) + cSq * (B.x - A.x)) / d;
    
    // Calculate Radius using distance formula from center to vertex A
    const radius = Math.sqrt((ux - A.x) ** 2 + (uy - A.y) ** 2);
    
    return {
        center: new Vec2 (ux, uy),
        radius: radius
    };
}

// // Example Usage
// const A: Vec2 = new Vec2(0, -0.5);
// const B: Vec2 = new Vec2(0, 0);
// const C: Vec2 = new Vec2(-0.5, 0.5);

// try {
//     const result = findCircumcircle(A, B, C);
//     console.log(`Circumcenter: (${result.center.x}, ${result.center.y})`);
//     console.log(`Radius: ${result.radius}`);
// } catch (error) {
//     if (error instanceof Error) {
//         console.error("Error:", error.message);
//     }
// }