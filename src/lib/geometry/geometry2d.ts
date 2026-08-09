export interface Circle {
    center: Vec2;
    radius: number;
}

export interface Vec2 {
    x: number,
    y: number
}

export interface Vector {
    origin: Vec2,
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

        // Calculate Radius using distance formula from center to vertex A
        const radius = Math.sqrt((ux - A.x) ** 2 + (uy - A.y) ** 2);

        return {
            center: { x: ux, y: uy },
            radius: radius
        };
    },

    midpoint(a: Vec2, b: Vec2): Vec2 {
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

    /** Returns the intersection of a ray (starting at `O`, travelling in direction `dir`) with the
     * segment `AB`, or undefined if the ray and segment don't cross.
     * `t` is the ray parameter (`P = O + t * dir`, `t >= 0`) and `u` is the segment parameter (0-1). */
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

    /** Returns the intersection of a ray (starting at `O`, travelling in direction `dir`) with the
     * line `AB`, or undefined if the ray and segment don't cross.
     * `t` is the ray parameter (`P = O + t * dir`, `t >= 0`) and `u` is the segment parameter (0-1). */
    getRayLineIntersection(O: Vec2, dir: Vec2, line: Vec2[]): { point: Vec2, t: number, u: number } | undefined {
        for (let i = 0; i < line.length - 1; i++) {
            const intersection = this.getRaySegmentIntersection(O, dir, line[i]!, line[i + 1]!);
            if (intersection) return intersection;
        }
    },

    /** Returns the Point or undefined from the lines defined by (p1-p2) and (p3-p4) */
    getInterceptFromPoints(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): Vec2 | undefined {
        const denominator = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        if (denominator == 0) return undefined;

        return {
            x: ((p1.x * p2.y - p1.y * p2.x) * (p3.x - p4.x) - (p1.x - p2.x) * (p3.x * p4.y - p3.y * p4.x)) / denominator,
            y: ((p1.x * p2.y - p1.y * p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x * p4.y - p3.y * p4.x)) / denominator
        }
    },

    dist(a: Vec2, b: Vec2) {
        return (Math.hypot(b.x - a.x, b.y - a.y));
    },

    getClosestPointToP(P: Vec2, candidates: Vec2[]) {
        return candidates.toSorted((A, B) => this.dist(A, P) - this.dist(B, P))[0];
    },

    getFurthestPointFromP(P: Vec2, candidates: Vec2[]) {
        return candidates.toSorted((A, B) => this.dist(B, P) - this.dist(A, P))[0];
    },

    /** Returns the angle (in radians) between segments AB and BC, along the left side of the direction of the line ABC. 
     * Returns the angle as a value in range [0, 2*pi) */
    getAngleABC(A: Vec2, B: Vec2, C: Vec2) {
        const angleBA = Math.atan2(A.y - B.y, A.x - B.x);
        const angleBC = Math.atan2(C.y - B.y, C.x - B.x);
        const angleBetween = (angleBA - angleBC + Math.PI * 2) % (Math.PI * 2);
        return angleBetween;
    },

    /** Returns the angle in radians of the vector AB. Angles will be in the range [0, 2π). */
    getAngleAB(A: Vec2, B: Vec2) {
        return (Math.atan2(B.y - A.y, B.x - A.x) + Math.PI * 2) % (Math.PI * 2);
    },

    pointToFromScreen(p: Vec2) {
        p.y *= -1;
    },

    /** Returns the signed area of the triangle ABC. Will be positive if the triangle is wound counter-clockwise. */
    getSignedArea(A: Vec2, B: Vec2, C: Vec2) {
        // shoelace formula
        return 0.5 * ((A.x * B.y + B.x * C.y + C.x * A.y) - (A.y * B.x + B.y * C.x + C.y * A.x));
    },

    /** Returns the vector from A to B. */
    constructVectorAB(A: Vec2, B: Vec2): Vector {
        return {
            origin: A,
            direction: this.getAngleAB(A, B),
            magnitude: this.dist(A, B)
        }
    },

    // /** Returns which of A (0), B (1), or C (2) has the largest interior angle of the triangle.
    //  * Uses the law of cosines on squared edge lengths — the largest angle is always opposite the
    //  * longest side — so, unlike `getAngleBetweenPoints`, this is completely independent of winding
    //  * direction (CW vs CCW) and immune to atan2 wraparound issues. If the triangle is obtuse, this
    //  * is also its obtuse vertex, since a triangle can only have one angle > π/2. */
    // indexOfLargestAngleVertex(A: Vec2, B: Vec2, C: Vec2): 0 | 1 | 2 {
    //     const a2 = this.distance(B, C) ** 2; // side opposite A
    //     const b2 = this.distance(A, C) ** 2; // side opposite B
    //     const c2 = this.distance(A, B) ** 2; // side opposite C

    //     if (a2 >= b2 && a2 >= c2) return 0;
    //     if (b2 >= a2 && b2 >= c2) return 1;
    //     return 2;
    // },

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

    getAngleDifferenceBetweenABandBC(A: Vec2, B: Vec2, C: Vec2): number {
        const headingAB = this.getAngleAB(A, B);
        const headingBC = this.getAngleAB(B, C);
        let diff = headingBC - headingAB;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        return Math.abs(diff);
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
    sub(A: Vec2, B: Vec2): Vec2 {
        return { x: A.x - B.x, y: A.y - B.y };
    },

    /** Returns the point that is the result of A + B. */
    add(A: Vec2, B: Vec2): Vec2 {
        return { x: A.x + B.x, y: A.y + B.y };
    },

    /** Returns the point that is the result of `A * s`. */
    scalarMult(A: Vec2, s: number): Vec2 {
        return { x: A.x * s, y: A.y * s };
    },

    /** Returns the point that is the result of `A / s`. */
    divScalar(A: Vec2, s: number): Vec2 {
        return { x: A.x / s, y: A.y / s };
    },

    /** Returns the normalised vector in the direction of A. */
    normalise(A: Vec2): Vec2 {
        const dist = Math.hypot(A.x, A.y);
        return { x: A.x / dist, y: A.y / dist };
    },

    /** Returns the vector pointing perpendicular to the right of A. */
    perpRHS(A: Vec2): Vec2 {
        return { x: A.y, y: - A.x };
    },

    /** Returns the vector pointing perpendicular to the left of A. */
    perpLHS(A: Vec2): Vec2 {
        return { x: -A.y, y: A.x };
    },

    isApproximatelyEqual(A: Vec2, B: Vec2) {
        const epsilon = 0.0001;
        return (Math.abs(A.x - B.x) < epsilon && Math.abs(A.y - B.y) < epsilon)
    },

    /** Returns the dot product `a ⋅ b` */
    dot(a: Vec2, b: Vec2) {
        return a.x * b.x + a.y * b.y;
    },

    magnitude(a: Vec2) {
        return Math.sqrt(a.x ^ 2 + a.y ^ 2);
    },

    /** Returns the vector projection of `a` onto `b`. */
    projectAOntoB(a: Vec2, b: Vec2) {
        return this.scalarMult(b, this.dot(a, b) / this.dot(b, b));
    },

    /** Returns the set of vertices that define the edge of the polygon such that they are wound counter-clockwise. */
    windPolygonCCW(points: Vec2[]) {
        const orderedVerts = [...points];
        // ensure points are ordered counter-clockwise for consistent winding
        if (!this.isCounterClockwise(orderedVerts)) { orderedVerts.reverse(); }
        return orderedVerts;
    },

    /** Get the orthogonal projection of point P onto the line segment AB. Also returns the parameter `u`, 
     * which is where the projection landed relative to AB (i.e. u = 0.25 indicates it landed a quarter of the way from A to B.). */
    orthogonalProjection(P: Vec2, A: Vec2, B: Vec2) {
        const AP = this.sub(P, A);
        const AB = this.sub(B, A);
        const projectionPAB = this.projectAOntoB(AP, AB);
        let u = Math.hypot(projectionPAB.x, projectionPAB.y) / Math.hypot(AB.x, AB.y);
        if (this.dot(projectionPAB, AB) < 0) u *= -1;
        return { p: this.add(A, projectionPAB), u: u };
    },

    getClosestPointToPOnLine(P: Vec2, line: Vec2[]) {
        let closestPoint: Vec2 = { x: Infinity, y: Infinity };
        let closestDist = Infinity;
        for (let i = 0; i < line.length - 1; i++) {
            const A = line[i]!;
            const B = line[i + 1]!;
            const projection = this.orthogonalProjection(P, A, B);
            let closestPointOnSegment = projection.p;
            if (projection.u > 1) {
                closestPointOnSegment = B;
            } else if (projection.u < 0) {
                closestPointOnSegment = A;
            }
            const dist = this.dist(closestPointOnSegment, P);
            if (dist >= closestDist) continue;
            closestPoint = closestPointOnSegment;
            closestDist = dist;
        }
        return closestPoint;
    },

    getAverageOfTwoAngles(a: number, b: number) {
        return Math.atan2(Math.sin(a) + Math.sin(b), Math.cos(a) + Math.cos(b));
    },
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