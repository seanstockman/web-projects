import type { Vec2 } from "../../lib/geometry/geometry2d.ts";
import type { MedialAxis } from "./approximate_medial_axis.ts";

export class ParcelDivision {
    private polygon: Vec2[];
    private ma: MedialAxis;
    private roads: number[][];

    constructor(polygon: Vec2[], ma: MedialAxis, roads: number[][]) {
        this.polygon = polygon;
        this.ma = ma;
        this.roads = roads;
    }

    // determine roads from parcel? or get given?
    public mergeIntoAlphaStrip() {

    }

    public mergeIntoBetaStrip() {

    }
}