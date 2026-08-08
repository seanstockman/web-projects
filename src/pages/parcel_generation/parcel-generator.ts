import type { Vec2 } from "../../lib/geometry/geometry2d.ts";
import { SkeletonBuilder } from 'straight-skeleton';
// import type { MedialAxis } from "./approximate_medial_axis.ts";

export class ParcelGenerator {
    private polygon: Vec2[];
    private roads: number[][];
    // private skeleton: Skeleton | undefined = undefined;

    constructor(polygon: Vec2[], roads: number[][]) {
        this.polygon = polygon;
        this.roads = roads;
    }

    public generateStraightSkeleton() {
        const polygonAsGeoJSON = [this.polygon.map(p => [p.x, p.y])];
        const result = SkeletonBuilder.buildFromPolygon(polygonAsGeoJSON);
        return result;
    }

    // determine roads from parcel? or get given?
    public mergeIntoAlphaStrip() {

    }

    public mergeIntoBetaStrip() {

    }
}