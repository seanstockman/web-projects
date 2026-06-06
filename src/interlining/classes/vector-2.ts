export class Vector2 {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    distTo(target: Vector2) {
        return Math.hypot(
            this.x - target.x,
            this.y - target.y
        );
    }

    updateXY(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    dot(other: Vector2): number {
        return this.x * other.x + this.y * other.y;
    }

    dotValues(x: number, y: number): number {
        return this.x * x + this.y * y;
    }

    /** Treats this `Vector2` as though it is a normalised vector and returns the angle in radians (-PI,PI). */
    angleAsNormalised(): number {
        let theta = Math.asin(this.y);
        if (this.x < 0) {
            theta *= -1;
            if (this.y > 0) {
                theta += Math.PI;
            } else {
                theta -= Math.PI;
            }
        }
        return theta;
    }

    /** Returns a new `Vector2` object with the same x and y values. */
    clone() {
        return new Vector2(this.x, this.y);
    }

    static zero() {
        return new Vector2(0, 0);
    }
};