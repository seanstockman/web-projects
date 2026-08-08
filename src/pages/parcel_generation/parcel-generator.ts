import { geometry2d as g2d, type Vec2 } from "../../lib/geometry/geometry2d.ts";
import { SkeletonBuilder, type Skeleton } from 'straight-skeleton';
// import type { MedialAxis } from "./approximate_medial_axis.ts";
type Road = {
    segment: number[],
    attraction: number,
}

export class ParcelGenerator {
    public polygon: Vec2[];
    public roads: Road[];
    public skeleton: Skeleton | null = null;
    public frontageMap: Map<number, number> | undefined;
    // private skeleton: Skeleton | undefined = undefined;

    constructor(polygon: Vec2[], roads: Road[] = []) {
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
        if (!this.skeleton) return;
        if (maxLength == 0) {
            this.skeleton.Edges.forEach(e => {
                maxLength += e.Edge.Begin.DistanceTo(e.Edge.End);
            });
            maxLength /= 2;
        }

        /** Maps edges (in ccw order) to roads. */
        this.frontageMap = new Map<number, number>();
        /** A list of  */
        const peripheralRoads: Road[] = [];

        let roadSegment: number[] = [];
        let cumulativeLength = 0;

        this.skeleton.Edges.forEach((e, i) => {
            cumulativeLength += e.Edge.Begin.DistanceTo(e.Edge.End);
            roadSegment.push(i);
            this.frontageMap!.set(i, peripheralRoads.length);
            const next = this.skeleton!.Edges[(i + 1) % this.skeleton!.Edges.length]!;
            const angle = g2d.getAngleDifferenceBetweenABandBC(
                { x: e.Edge.Begin.X, y: e.Edge.Begin.Y },
                { x: e.Edge.End.X, y: e.Edge.End.Y },
                { x: next.Edge.End.X, y: next.Edge.End.Y }
            );
            if ((angle >= angleThreshold && cumulativeLength >= minLength) || cumulativeLength >= maxLength) {
                peripheralRoads.push({ segment: roadSegment, attraction: 1 });
                roadSegment = [roadSegment[roadSegment.length - 1]!];
                cumulativeLength = 0;
            }
        });
        // TODO: Merge last road with first road if angle is good.
        this.roads = peripheralRoads;
        return { roads: peripheralRoads, frontageMap: this.frontageMap };
    }

    // determine roads from parcel? or get given?
    public mergeIntoAlphaStrip() {
        if (!this.skeleton) return;
        const alphaStrips = [];
        this.roads.forEach(r => {
            // delete the straight skeleton values for each thing. so we need to turn the s polygon into strips.
            for (let i = 1; i < r.segment.length - 1; i++) {
                this.skeleton!.Edges[i]!.Polygon.Clear();
            }
        });
    }

    public mergeIntoBetaStrip() {

    }
}