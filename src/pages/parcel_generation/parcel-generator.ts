import { geometry2d as g2d, type Vec2 } from "../../lib/geometry/geometry2d.ts";
import { SkeletonBuilder, type Skeleton } from 'straight-skeleton';
// import type { MedialAxis } from "./approximate_medial_axis.ts";
type Road = {
    segment: number[],
    attraction: number,
}

type SkeletonGraph = {
    /** Vertices in the graph. First n vertices correspond to the n external polygon vertices. */
    nodes: { v: Vec2, active: boolean }[],
    /** Unique connections between edges */
    edges: [number, number][],
}

export class ParcelGenerator {
    public polygon: Vec2[];
    public roads: Road[];
    public skeleton: SkeletonGraph | undefined;
    public frontageMap: Map<string, number> | undefined;
    // private skeleton: Skeleton | undefined = undefined;

    constructor(polygon: Vec2[], roads: Road[] = []) {
        this.polygon = g2d.windPolygonCCW(polygon);
        this.roads = roads;
    }

    public generateStraightSkeleton() {
        const s = SkeletonBuilder.BuildFromGeoJSON([[this.polygon.map(p => [p.x, p.y])]]);
        this.skeleton = this.buildSkeletonGraph(s);
        // this is in the format of skeleton.Edges, which is an array 
        // each Edge e in edges has a e.Polygon, which is an array of vec2 (with .X and .Y properties)
        // the problem is that together these form the straight skeleton, where each edge holds the skeleton polygon closest to it
        // i want to turn it into a data type with 

        return this.skeleton;
    }

    /**
     * Converts this.skeleton (a set of per-edge Polygons) into a deduplicated
     * vertex/edge graph. The first `this.polygon.length` vertices correspond
     * exactly to the original polygon vertices, in order.
     */
    private buildSkeletonGraph(skeleton: Skeleton, precision = 6): SkeletonGraph {
        const nodes: { v: Vec2, active: true }[] = [];
        const keyToIndex = new Map<string, number>();

        const keyOf = (x: number, y: number) => `${x.toFixed(precision)},${y.toFixed(precision)}`;

        const getIndex = (x: number, y: number): number => {
            const key = keyOf(x, y);
            let idx = keyToIndex.get(key);
            if (idx === undefined) {
                idx = nodes.length;
                keyToIndex.set(key, idx);
                nodes.push({ v: { x: x, y: y }, active: true });
            }
            return idx;
        };

        // Seed with the original polygon vertices first, so vertices[0..n-1]
        // line up 1:1 with this.polygon.
        for (const p of this.polygon) {
            getIndex(p.x, p.y);
        }

        const edgeSet = new Set<string>();
        const edges: [number, number][] = [];

        for (const edge of skeleton.Edges) {
            const poly = edge.Polygon;
            const n = poly.length;
            for (let i = 0; i < n; i++) {
                const a = poly[i]!;
                const b = poly[(i + 1) % n]!;

                const ai = getIndex(a.X, a.Y);
                const bi = getIndex(b.X, b.Y);
                if (ai === bi) continue; // degenerate

                const lo = Math.min(ai, bi);
                const hi = Math.max(ai, bi);
                const edgeKey = `${lo}_${hi}`;

                if (!edgeSet.has(edgeKey)) {
                    edgeSet.add(edgeKey);
                    edges.push([lo, hi]);
                }
            }
        }

        this.polygon.forEach((_, i) => {
            const edgeValue: [number, number] = [i, (i + 1) % this.polygon.length];
            edgeValue.sort((a, b) => a - b);
            const edgeIndex = edges.findIndex(e => e[0] == edgeValue[0] && e[1] == edgeValue[1]);
            if (edgeIndex != -1) edges.splice(edgeIndex, 1);
        });

        return { nodes: nodes, edges: edges };
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
            this.polygon.forEach((v, i) => {
                maxLength += g2d.dist(v, this.polygon[(i + 1) % this.polygon.length]!);
            });
            maxLength /= 2;
        }

        /** Maps edges (in ccw order) to roads. */
        this.frontageMap = new Map<string, number>();
        /** A list of  */
        const peripheralRoads: Road[] = [];

        let roadSegment = [this.polygon.length - 1];
        let cumulativeLength = 0;

        this.polygon.forEach((v, i) => {
            const curr = { i: i, v: v };
            const prev = { i: roadSegment[roadSegment.length - 1]!, v: this.polygon[roadSegment[roadSegment.length - 1]!]! }
            const next = { v: this.polygon[(i + 1) % this.polygon.length]! }
            cumulativeLength += g2d.dist(prev.v, curr.v);
            roadSegment.push(curr.i);
            this.frontageMap!.set(`${prev.i},${curr.i}`, peripheralRoads.length);
            const angle = g2d.getAngleDifferenceBetweenABandBC(prev.v, curr.v, next.v);
            if ((angle >= angleThreshold && cumulativeLength >= minLength) || cumulativeLength >= maxLength) {
                peripheralRoads.push({ segment: roadSegment, attraction: cumulativeLength });
                roadSegment = [roadSegment[roadSegment.length - 1]!];
                cumulativeLength = 0;
            }
        });

        if (roadSegment.length > 1) {
            const curr = { i: roadSegment[roadSegment.length - 1]!, v: this.polygon[roadSegment[roadSegment.length - 1]!]! }
            const prev = { i: roadSegment[roadSegment.length - 2]!, v: this.polygon[roadSegment[roadSegment.length - 2]!]! }
            const next = { v: this.polygon[0]! }

            const angle = g2d.getAngleDifferenceBetweenABandBC(prev.v, curr.v, next.v);
            if ((angle >= angleThreshold && cumulativeLength >= minLength) || cumulativeLength >= maxLength) {
                peripheralRoads.push({ segment: roadSegment, attraction: cumulativeLength });
            } else {
                roadSegment.splice(roadSegment.length - 1);
                peripheralRoads[0]!.segment.splice(0, 0, ...roadSegment);
                peripheralRoads[0]!.attraction += cumulativeLength;
                for (let i = 0; i < roadSegment.length - 1; i++) {
                    this.frontageMap.set(`${roadSegment[i]},${roadSegment[i + 1]}`, 0);
                }
            }
        }

        // TODO: Merge last road with first road if angle is good.
        this.roads = peripheralRoads;
        return { roads: this.roads, frontageMap: this.frontageMap };
    }

    public mergeIntoAlphaStrip() {
        if (!this.skeleton) return;
        this.roads.forEach(r => {
            // delete the straight skeleton values for each thing. so we need to turn the s polygon into strips.
            for (let i = 1; i < r.segment.length - 1; i++) {
                const remove_i = r.segment[i]!;
                // filter edges with vertex remove_i}
                this.skeleton!.edges = this.skeleton!.edges.filter(e => e[0] != remove_i && e[1] != remove_i);
                this.skeleton!.nodes[remove_i]!.active = false;
            }
        });

        // clean up loose middle bits
        const occurrences: number[][] = this.skeleton.nodes.map(() => []);
        this.skeleton.edges.forEach((e, i) => {
            occurrences[e[0]]!.push(i);
            occurrences[e[1]]!.push(i);
        });

        const edgesToSplice: number[] = [];
        occurrences.forEach((o, i) => {
            if (i < this.polygon.length || o.length !== 1) return;
            // console.log(`loose vertex found: V${i}`);
            let curr = i;
            while (occurrences[curr]!.length == 1) {
                let edgeToSplice = occurrences[curr]![0]!;
                let edgeToSpliceEdge = this.skeleton!.edges[edgeToSplice]!;
                edgesToSplice.push(edgeToSplice);
                let next = edgeToSpliceEdge.find(ei => ei != i)!;
                occurrences[next]! = occurrences[next]!.filter(e => e != edgeToSplice);
                occurrences[curr]! = occurrences[curr]!.filter(e => e != edgeToSplice);
                this.skeleton!.nodes[curr]!.active = false;
                curr = next;
            }
        });
        edgesToSplice.sort().reverse();
        edgesToSplice.forEach(e => {
            // console.log(`splicing ${this.skeleton!.edges[e]?.[0]},${this.skeleton!.edges[e]![1]}`);
            this.skeleton!.edges.splice(e, 1);
        })
    }

    public mergeIntoBetaStrip() {
        // for all e: exterior edges:\
        if (!this.skeleton) return;

        this.skeleton.nodes.forEach((n, i) => {
            // for each external node on the alpha-strip:
            if (i >= this.polygon.length) return;
            if (!n.active) return;

            // - c) add new node that is the orthoganal projection onto one of the two external edges connecting the node
            // find longest (replace with attraction later)

            const prev = (i - 1 + this.polygon.length) % this.polygon.length;
            const next = (i + 1) % this.polygon.length;

            const prevExternalNode = this.polygon[prev]!;
            const nextExternalNode = this.polygon[next]!;

            if (g2d.getAngleABC(prevExternalNode, n.v, nextExternalNode) > Math.PI) return;

            // - a) find the connecting node
            const connectionEdge = this.skeleton!.edges.find(e => e[0] == i || e[1] == i)!;
            const insideNeighbourIndex = connectionEdge.find(nodeIndex => nodeIndex != i)!;
            console.log(`v${i}:`);

            const attractionOfPrev = this.roads[this.frontageMap!.get(`${prev},${i}`)!]!.attraction;
            console.log(`- attractionOfPrev: ${attractionOfPrev}`);

            const attractionOfNext = this.roads[this.frontageMap!.get(`${i},${next}`)!]!.attraction;
            console.log(`- attractionOfNext: ${attractionOfNext}`);


            const edgeEnd = attractionOfNext < attractionOfPrev ? nextExternalNode : prevExternalNode;
            const thisToEdgeEnd = g2d.sub(edgeEnd, n.v);
            const thisToInsideNeighbour = g2d.sub(this.skeleton!.nodes[insideNeighbourIndex]!.v, n.v)

            console.log(`exterior node v${i}: modifying connection with V${insideNeighbourIndex}`);

            const newNodeRelativeToThis = g2d.projectAOntoB(thisToInsideNeighbour, thisToEdgeEnd);

            // if (g2d.dot(newNodeRelativeToThis, thisToFurthestEdge) < 0) return;

            const newNode = g2d.add(newNodeRelativeToThis, n.v);
            this.skeleton!.nodes.push({ v: newNode, active: true });
            n.active = false;

            connectionEdge[0] = insideNeighbourIndex;
            connectionEdge[1] = this.skeleton!.nodes.length - 1;
            // - b) disconnect
            // - d) connect that edge
        });
    }
}