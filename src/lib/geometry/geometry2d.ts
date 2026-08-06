export interface Circle {
    center: Vec2;
    radius: number;
}

export interface Vec2 {
    x: number,
    y: number
}

export interface Vector {
    direction: number,
    magnitude: number
}

export const geometry2d = {
    getCircumcircle(A: Vec2, B: Vec2, C: Vec2): Circle {
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

        const center = { x: ux, y: uy };
        const radius = this.distance(A, center)

        return {
            center: { x: ux, y: uy },
            radius: radius
        };
    },

    getMidpoint(a: Vec2, b: Vec2): Vec2 {
        return {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2
        }
    },

    // getMidpointOfLine(ab: Line): Point {
    //     return this.getMidpoint(ab.start, ab.end);
    // },

    getMeanOfPoints(...points: Vec2[]): Vec2 {
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
    getInterceptFromPoints(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): Vec2 | undefined {
        const denominator = (p1.x - p2.x) * (p3.y = p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        if (denominator == 0) return undefined;

        return {
            x: ((p1.x * p2.y - p1.y * p2.x) * (p3.x - p4.x) - (p1.x - p2.x) * (p3.x * p4.y - p3.y * p4.x)) / denominator,
            y: ((p1.x * p2.y - p1.y * p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x * p4.y - p3.y * p4.x)) / denominator
        }
    },

    distance(a: Vec2, b: Vec2) {
        return (Math.hypot(b.x - a.x, b.y - a.y));
    },

    getClosestPointToP(P: Vec2, candidates: Vec2[]) {
        return candidates.toSorted((A, B) => this.distance(A, P) - this.distance(B, P))[0];
    },

    getFurthestPointFromP(P: Vec2, candidates: Vec2[]) {
        return candidates.toSorted((A, B) => this.distance(B, P) - this.distance(A, P))[0];
    },

    /** Returns the angle (in radians) between segments AB and BC, along the left side of the direction of the line ABC. 
     * Returns the angle as a value in range [0, 2*pi) */
    getAngleBetweenPoints(A: Vec2, B: Vec2, C: Vec2) {
        const angleBA = Math.atan2(A.y - B.y, A.x - B.x);
        const angleBC = Math.atan2(C.y - B.y, C.x - B.x);
        const angleBetween = (angleBA - angleBC + Math.PI * 2) % (Math.PI * 2);
        return angleBetween;
    },

    /** Returns the angle in radians of the vector AB. Angles will be in the range [0, 2π). */
    getDirectionFromAToB(A: Vec2, B: Vec2) {
        return (Math.atan2(B.y - A.y, B.x - A.x) + Math.PI * 2) % (Math.PI * 2);
    },

    pointToFromScreen(p: Vec2) {
        p.y *= -1;
    },

    getSignedArea(A: Vec2, B: Vec2, C: Vec2) {
        // shoelace formula
        return 0.5 * ((A.x * B.y + B.x * C.y + C.x * A.y) - (A.y * B.x + B.y * C.x + C.y * A.x));
    },

    getVectorFromAToB(A: Vec2, B: Vec2): Vector {
        return {
            direction: this.getDirectionFromAToB(A, B),
            magnitude: this.distance(A, B)
        }
    },

    /** Tests if the three points are collinear. */
    arePointsCollinear(A: Vec2, B: Vec2, C: Vec2): boolean {
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
    isPointInTriangle(p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
        const d1 = this.crossProduct(p, a, b);
        const d2 = this.crossProduct(p, b, c);
        const d3 = this.crossProduct(p, c, a);

        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

        // If signs are mixed, the point is outside.
        // Change to `!(hasNeg && hasPos)` to include points exactly on the edge.
        return !(hasNeg && hasPos);
    },

    crossProduct(p1: Vec2, p2: Vec2, p3: Vec2) {
        return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    },

    isCounterClockwise(points: Vec2[]): boolean {
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
    removeDuplicatePoints(points: Vec2[]): Vec2[] {
        const seen = new Set<string>();
        const result: Vec2[] = [];

        points.forEach(p => {
            const key = `${p.x},${p.y}`;
            if (seen.has(key)) return;
            seen.add(key);
            result.push(p);
        });

        return result;
    },

    /** Returns the point that is the result of A - B. */
    sub(A: Vec2, B: Vec2) {
        return { x: A.x - B.x, y: A.y - B.y };
    },

    /** Returns the point that is the result of A + B. */
    add(A: Vec2, B: Vec2) {
        return { x: A.x + B.x, y: A.y + B.y };
    },

    /** Returns the point that is the result of A * s. */
    scalarMult(A: Vec2, s: number) {
        return { x: A.x * s, y: A.y * s };
    },

    /** Returns the point that is the result of A / s. */
    divScalar(A: Vec2, s: number) {
        return { x: A.x / s, y: A.y / s };
    },

    /** Returns the normalised vector in the direction of A. */
    normalise(A: Vec2) {
        const dist = Math.hypot(A.x, A.y);
        return { x: A.x / dist, y: A.y / dist };
    },

    /** Returns the perpendicular vector of A. */
    perp(A: Vec2) {
        return { x: A.y, y: - A.x };
    },

    /** Returns the intersection of a ray (starting at O, travelling in direction D) with the
     * segment AB, or undefined if the ray and segment don't cross.
     * `t` is the ray parameter (P = O + t*D, t >= 0) and `u` is the segment parameter (0-1). */
    getRaySegmentIntersection(O: Vec2, dir: Vec2, A: Vec2, B: Vec2): { point: Vec2, t: number, u: number } | undefined {
        const sx = B.x - A.x, sy = B.y - A.y;
        const denom = dir.x * sy - dir.y * sx;
        if (Math.abs(denom) < 1e-12) return undefined; // parallel (or degenerate segment)

        const dx = A.x - O.x, dy = A.y - O.y;
        const t = (dx * sy - dy * sx) / denom;
        const u = (dx * dir.y - dy * dir.x) / denom;

        if (t < 0 || u < 0 || u > 1) return undefined;

        return {
            point: { x: O.x + dir.x * t, y: O.y + dir.y * t },
            t,
            u
        };
    },
}