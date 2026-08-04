export interface Circle {
    center: Point;
    radius: number;
}

export interface Point {
    x: number,
    y: number
}

export interface Vector {
    direction: number,
    magnitude: number
}

export const geometry2d = {
    getCircumcircle(A: Point, B: Point, C: Point): Circle {
        // Common denominator calculation
        if (geometry2d.arePointsCollinear(A, B, C)) return { center: { x: 0, y: 0 }, radius: 0 };
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
            center: { x: ux, y: uy },
            radius: radius
        };
    },

    getMidpoint(a: Point, b: Point): Point {
        return {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2
        }
    },

    // getMidpointOfLine(ab: Line): Point {
    //     return this.getMidpoint(ab.start, ab.end);
    // },

    getMeanOfPoints(...points: Point[]): Point {
        let sumX = 0, sumY = 0;
        points.forEach(p => {
            sumX += p.x;
            sumY += p.y;
        });

        return {
            x: (sumX) / points.length,
            y: (sumY) / points.length,
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
    getDirectionFromAToB(A: Point, B: Point) {
        return (Math.atan2(B.y - A.y, B.x - A.x) + Math.PI * 2) % (Math.PI * 2);
    },

    pointToFromScreen(p: Point) {
        p.y *= -1;
    },

    getSignedArea(A: Point, B: Point, C: Point) {
        // shoelace formula
        return 0.5 * ((A.x * B.y + B.x * C.y + C.x * A.y) - (A.y * B.x + B.y * C.x + C.y * A.x));
    },

    getVectorFromAToB(A: Point, B: Point): Vector {
        return {
            direction: this.getDirectionFromAToB(A, B),
            magnitude: this.distance(A, B)
        }
    },

    /** Tests if the three points are collinear. */
    arePointsCollinear(A: Point, B: Point, C: Point): boolean {
        return ((B.y - A.y) * (C.x - B.x) == (C.y - B.y) * (B.x - A.x));
    },

    degreesToRadians(n: number) {
        return n * Math.PI / 180;
    },

    radiansToDegrees(n: number) {
        return n * 180 / Math.PI;
    },

    /** Checks if a point P is inside a triangle ABC using the Cross-Product (Sign) Method. 
     * Works for both clockwise and counter-clockwise vertex orders. */
    isPointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
        const d1 = this.crossProduct(p, a, b);
        const d2 = this.crossProduct(p, b, c);
        const d3 = this.crossProduct(p, c, a);

        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

        // If signs are mixed, the point is outside.
        // Change to `!(hasNeg && hasPos)` to include points exactly on the edge.
        return !(hasNeg && hasPos);
    },

    crossProduct(p1: Point, p2: Point, p3: Point) {
        return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    },

    isCounterClockwise(points: Point[]): boolean {
        let sum = 0;
        for (let i = 0; i < points.length; i++) {
            const current = points[i]!;
            const next = points[(i + 1) % points.length]!;
            sum += (next.x - current.x) * (next.y + current.y);
        }
        // If sum < 0, it is CCW (for screen coordinates with Y down)
        // If sum > 0, it is CW
        return sum < 0;
    },
    /** Returns a copy of the array with duplicates removed.
     * @link https://www.geeksforgeeks.org/typescript/remove-duplicate-elements-from-typescript-array/#approach-1-using-typescript-filter-method
     */
    removeDupes(arr: number[]): number[] {
        return arr.filter((item,
            index) => arr.indexOf(item) === index);
    },
    /** Removes duplicate points (exact x/y match) from an array, keeping the first occurrence of each. */
    removeDuplicatePoints(points: Point[]): Point[] {
        const seen = new Set<string>();
        const result: Point[] = [];

        points.forEach(p => {
            const key = `${p.x},${p.y}`;
            if (seen.has(key)) return;
            seen.add(key);
            result.push(p);
        });

        return result;
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