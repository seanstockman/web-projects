import { geometry2d as g2d, type Vec2 } from "../../lib/geometry/geometry2d.ts";
import { SkeletonBuilder, type Skeleton } from 'straight-skeleton';
// import type { MedialAxis } from "./approximate_medial_axis.ts";
type Road = {
    vertices: { v: Vec2, i: number }[],
    attraction: number,
}

export class ParcelGenerator {
    public polygon: Vec2[];
    public roads: number[][];
    public skeleton: Skeleton | null = null;
    // private skeleton: Skeleton | undefined = undefined;

    constructor(polygon: Vec2[], roads: number[][]) {
        this.polygon = g2d.windPolygonCCW(polygon);
        this.roads = roads;
    }

    public generateStraightSkeleton() {
        this.skeleton = SkeletonBuilder.BuildFromGeoJSON([[this.polygon.map(p => [p.x, p.y])]]);
        return this.skeleton;
    }

    /** 
     * Generates new road segments around a given polygon (block).
     * @param angleThreshold The angle between two segments above which the two segments belong to different roads.
     * @param minLength The minimum length of a road.
     * @param maxLength The maximum length of a road. If set to 0 will default to `exteriorEdges.length / 2`.
     * @author Parcel Manager (Algorithm 4)
     */
    public generatePeripheralRoads(angleThreshold = (Math.PI / 3), minLength = 0, maxLength = 0) {
        if (maxLength == 0) {
            this.polygon.forEach((v, i) => {
                maxLength += g2d.dist(v, this.polygon[(i + 1) % this.polygon.length]!);
            });
            maxLength /= 2;
        }
        /** Maps edges (in ccw order) to roads. */
        const frontageMap = new Map<[number, number], number>();
        /** A list of  */
        const peripheralRoads: Road[] = [];

        let roadSegment = [{ i: this.polygon.length - 1, v: this.polygon[this.polygon.length - 1]! }];
        let cumulativeLength = 0;

        this.polygon.forEach((v, i) => {
            // if (i == this.polygon.length - 1) return;
            const curr = { i: i, v: v, };
            const prev = roadSegment[roadSegment.length - 1]!;
            const next_v = this.polygon[(curr.i + 1) % this.polygon.length]!;
            cumulativeLength += g2d.dist(curr.v, prev.v)
            roadSegment.push(curr);
            frontageMap.set([prev.i, curr.i], peripheralRoads.length);
            const angle = g2d.getAngleDifferenceBetweenABandBC(prev.v, curr.v, next_v);
            if ((angle >= angleThreshold && cumulativeLength >= minLength) || cumulativeLength >= maxLength) {
                peripheralRoads.push({ vertices: roadSegment, attraction: 1 });
                roadSegment = [roadSegment[roadSegment.length - 1]!];
                cumulativeLength = 0;
            }
        });

        // TODO: Merge last road with first road if angle is good.

        return { roads: peripheralRoads, frontageMap: frontageMap };
    }

    // determine roads from parcel? or get given?
    public mergeIntoAlphaStrip() {
        
    }

    public mergeIntoBetaStrip() {

    }
}