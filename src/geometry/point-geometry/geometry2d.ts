export interface Circle {
    centre: Point;
    radius: number;
}

export interface Point {
    x: number,
    y: number
}

export const geometry2d = {
    getCircumcircle(A: Point, B: Point, C: Point): Circle {
        // Common denominator calculation
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
            centre: { x: ux, y: uy },
            radius: radius
        };
    },

    getMidpoint(a: Point, b: Point): Point {
        return {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2
        }
    },

    getWeightedCentre(A: Point, B: Point, C: Point): Point {
        const midpointAB = this.getMidpoint(A, B);
        const midpointBC = this.getMidpoint(C, B);
        const midpointCA = this.getMidpoint(A, C);
        return {
            x: (midpointAB.x + midpointBC.x + midpointCA.x) / 3,
            y: (midpointAB.y + midpointBC.y + midpointCA.y) / 3,
        };
    },

    /** Returns the Point or undefined from the lines defined by (p1-p2) and (p3-p4) */
    getInterceptFromPoints(p1: Point, p2: Point, p3: Point, p4: Point): Point | undefined {
        const denominator = (p1.x - p2.x) * (p3.y = p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        if (denominator == 0) return undefined;

        return {
            x: ((p1.x * p2.y - p1.y * p2.x) * (p3.x - p4.x) - (p1.x - p2.x) * (p3.x * p4.y - p3.y * p4.x)) / denominator,
            y: ((p1.x * p2.y - p1.y * p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x * p4.y - p3.y * p4.x)) / denominator
        }
    },

    distance(a: Point, b: Point) {
        return (Math.hypot(b.x - a.x, b.y - a.y));
    },

    /** Returns the angle (in radians) between segments AB and BC, along the left side of the direction of the line ABC. 
     * Returns the angle as a value in range [0, 2*pi) */
    getAngleBetweenPoints(A: Point, B: Point, C: Point) {
        const angleBA = Math.atan2(A.y - B.y, A.x - B.x);
        const angleBC = Math.atan2(C.y - B.y, C.x - B.x);
        const angleBetween = (angleBA - angleBC + Math.PI * 2) % (Math.PI * 2);
        return angleBetween;
    },

    /** Returns the angle in radians of the vector AB. Angles will be in the range [0, 2π). */
    getAngleAB(A: Point, B: Point) {
        return (Math.atan2(B.y - A.y, B.x - A.x) + Math.PI * 2) % (Math.PI * 2);
    },

    pointToFromScreen(p: Point) {
        p.y *= -1;
    },

    getSignedArea(A: Point, B: Point, C: Point) {
        // shoelace formula
        return 0.5 * ((A.x * B.y + B.x * C.y + C.x * A.y) - (A.y * B.x + B.y * C.x + C.y * A.x));
    }
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