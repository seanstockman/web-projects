import { geometry2d as g2d, type Vec2 } from "../../lib/geometry/geometry2d.ts";
import { SkeletonBuilder, type Skeleton } from 'straight-skeleton';
// import type { MedialAxis } from "./approximate_medial_axis.ts";
type Road = {
    segment: number[],
    attraction: number,
}

export type SkeletonGraph = {
    /** Vertices in the graph. First n vertices correspond to the n external polygon vertices. */
    nodes: { v: Vec2, active: boolean, connections: number[] }[],
    /** Unique connections between edges */
    edges: [number, number][],
}

export class ParcelGenerator {
    public polygon: Vec2[];
    public roads: Road[];
    public skeleton: SkeletonGraph | undefined;
    public strip: SkeletonGraph | undefined;
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
        const nodes: { v: Vec2, active: true, connections: number[] }[] = [];
        const keyToIndex = new Map<string, number>();

        const keyOf = (x: number, y: number) => `${x.toFixed(precision)},${y.toFixed(precision)}`;

        const getIndex = (x: number, y: number): number => {
            const key = keyOf(x, y);
            let idx = keyToIndex.get(key);
            if (idx === undefined) {
                idx = nodes.length;
                keyToIndex.set(key, idx);
                nodes.push({ v: { x: x, y: y }, active: true, connections: [] });
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
                    nodes[lo]!.connections.push(hi);
                    nodes[hi]!.connections.push(lo);
                }
            }
        }

        this.polygon.forEach((_, i) => {
            const edgeValue: [number, number] = [i, (i + 1) % this.polygon.length];
            edgeValue.sort((a, b) => a - b);
            const edgeIndex = edges.findIndex(e => e[0] == edgeValue[0] && e[1] == edgeValue[1]);
            if (edgeIndex != -1) {
                edges.splice(edgeIndex, 1);
                nodes[edgeValue[0]]!.connections = nodes[edgeValue[0]]!.connections.filter(c => c != edgeValue[1]);
                nodes[edgeValue[1]]!.connections = nodes[edgeValue[1]]!.connections.filter(c => c != edgeValue[0]);
            }
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
    public generateLogicalRoads(angleThreshold = (Math.PI / 3), minLength = 0, maxLength = 0) {
        if (!this.skeleton) return;
        if (maxLength == 0) {
            this.polygon.forEach((v, i) => {
                maxLength += g2d.dist(v, this.polygon[(i + 1) % this.polygon.length]!);
            });
            maxLength /= 2;
        }

        // TODO: need a more robust way to define roads.

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

        this.roads = peripheralRoads;
        return { roads: this.roads, frontageMap: this.frontageMap };
    }

    public mergeIntoAlphaStrip() {
        if (!this.skeleton) return;
        this.strip = { nodes: [...this.skeleton!.nodes], edges: [...this.skeleton!.edges] };
        const strip = this.strip;
        this.roads.forEach(r => {
            // delete the straight skeleton values for each thing. so we need to turn the s polygon into strips.
            for (let i = 1; i < r.segment.length - 1; i++) {
                const remove_i = r.segment[i]!;
                // filter edges with vertex remove_i}
                const removedNode = strip.nodes[remove_i]!;
                removedNode.active = false;
                removedNode.connections.forEach(c => {
                    this.disconnect(strip, c, remove_i);
                });
            }
        });

        // clean up loose middle bits
        strip.nodes.forEach((n, i) => {
            if (i < this.polygon.length || n.connections.length !== 1) return;
            // console.log(`loose vertex found: V${i}`);
            let curr = i;
            let currNode = n;
            while (currNode.connections.length == 1) {
                let next = currNode.connections[0]!;
                const nextNode = strip.nodes[next]!
                this.disconnect(strip, curr, next);
                curr = next;
                currNode = nextNode;
            }
        });
    }

    public mergeIntoBetaStrip(showDebug = false) {
        // for all e: exterior edges:\
        if (!this.strip) return;
        const s = this.strip;

        // verify junction exists
        const junction = s.nodes.find(node => node.connections.length > 2);

        /** Maps from inside vertex index to exterior nodes to fix. */
        const betaFixMap = new Map<number, { n: number, roadToMovePointTo: Road, roadToFace: Road }[]>();

        /**
         * TODO:
         * Change this so that each inside neighbour gets assigned the node to connect to/
         */

        s.nodes.forEach((n, i) => {
            // for each external node on the alpha-strip:
            if (i >= this.polygon.length) return;
            if (!n.active) return;
            if (n.connections.length == 0) return;

            // - c) add new node that is the orthoganal projection onto one of the two external edges connecting the node
            // find longest (replace with attraction later)

            const prev = (i - 1 + this.polygon.length) % this.polygon.length;
            const next = (i + 1) % this.polygon.length;

            const prevExternalNode = this.polygon[prev]!;
            const nextExternalNode = this.polygon[next]!;

            // - a) find the connecting node

            let insideNeighbourIndex = n.connections[0]!;
            let insideNeighbour = s.nodes[insideNeighbourIndex]!;

            if (g2d.getAngleABC(prevExternalNode, n.v, nextExternalNode) > Math.PI) {
                // if obtuse, remove connection
                // TODO: will there be a case where it doesnt intersect with a junction on the alpha graph?
                this.disconnect(s, i, insideNeighbourIndex);
                return;
            }

            this.disconnect(s, insideNeighbourIndex, i);
            n.active = false;

            if (junction) {
                while (insideNeighbour.connections.length == 1) {
                    if (betaFixMap.get(insideNeighbourIndex)) break;
                    const nextInLink = insideNeighbour.connections[0]!;
                    this.disconnect(s, nextInLink, insideNeighbourIndex);
                    const nextNodeInLink = s.nodes[nextInLink]!;
                    insideNeighbour = nextNodeInLink;
                    insideNeighbourIndex = nextInLink;
                }
            }

            const prevRoad = this.roads[this.frontageMap!.get(`${prev},${i}`)!]!;
            const nextRoad = this.roads[this.frontageMap!.get(`${i},${next}`)!]!;

            const chosenRoad = nextRoad.attraction > prevRoad.attraction ? nextRoad : prevRoad;
            const roadToFace = nextRoad.attraction <= prevRoad.attraction ? nextRoad : prevRoad;

            betaFixMap.getOrInsert(insideNeighbourIndex, []).push({ n: i, roadToMovePointTo: chosenRoad, roadToFace: roadToFace });
        });

        betaFixMap.forEach((conns, interiorIndex) => {
            if (conns.length == 2 && (conns[0]!.roadToFace == conns[1]!.roadToFace || conns[0]!.roadToMovePointTo == conns[1]!.roadToMovePointTo)) {
                // add to the midpoint intersection instead
                const A = conns[0]!;
                const B = conns[1]!;
                const O = s.nodes[interiorIndex]!;
                const midpointAB = g2d.midpoint(s.nodes[A.n]!.v, s.nodes[B.n]!.v);
                const dir = g2d.normalise(g2d.sub(midpointAB, O.v));

                if (conns[0]!.roadToMovePointTo == conns[1]!.roadToMovePointTo) {
                    const intersection = g2d.getRayLineIntersection(O.v, dir, A.roadToMovePointTo.segment.map(i => s.nodes[i]!.v))!;
                    s.nodes.push({ v: intersection.point, active: true, connections: [interiorIndex] });
                    this.connect(s, s.nodes.length - 1, interiorIndex);
                } else {
                    const perpRHS = g2d.perpRHS(dir);
                    const OA = g2d.sub(s.nodes[A.n]!.v, O.v);
                    const [L, R] = g2d.dot(OA, perpRHS) > 0 ? [B, A] : [A, B];

                    const dirLR = g2d.normalise(g2d.sub(s.nodes[R.n]!.v, s.nodes[L.n]!.v));

                    const intersectionL = g2d.getRayLineIntersection(O.v, g2d.scalarMult(dirLR, -1), L.roadToMovePointTo.segment.map(i => s.nodes[i]!.v))!;
                    const intersectionR = g2d.getRayLineIntersection(O.v, dirLR, R.roadToMovePointTo.segment.map(i => s.nodes[i]!.v));
                    if (!intersectionL) { console.error({ message: `could not get intersection L, from V${interiorIndex} in direction ${R.n}->${L.n}`, road: L.roadToMovePointTo.segment }); return; }
                    if (!intersectionR) { console.error({ message: `could not get intersection R, from V${interiorIndex} in direction ${L.n}->${R.n}`, road: R.roadToMovePointTo.segment }); return; }

                    s.nodes.push({ v: intersectionL.point, active: true, connections: [interiorIndex] });
                    s.nodes.push({ v: intersectionR.point, active: true, connections: [interiorIndex] });
                    this.connect(s, s.nodes.length - 2, interiorIndex);
                    this.connect(s, s.nodes.length - 1, interiorIndex);
                }
                return;
            }

            const insideNeighbour = s.nodes[interiorIndex]!
            conns.forEach(conn => {
                const closestPointOnRoad = g2d.getClosestPointToPOnLine(insideNeighbour.v, conn.roadToMovePointTo.segment.map(i => this.polygon[i]!));

                s.nodes.push({ v: closestPointOnRoad, active: true, connections: [interiorIndex] });
                this.connect(s, s.nodes.length - 1, interiorIndex);
            });
        });
    }

    private connect(s: SkeletonGraph, A: number, B: number) {
        const nodeA = s.nodes[A], nodeB = s.nodes[B];
        if (!nodeA || !nodeB) { console.error(`node ${A} or ${B} does not exist`); return; }

        if (!nodeA.connections.includes(B)) nodeA.connections.push(B);
        if (!nodeB.connections.includes(A)) nodeB.connections.push(A);

        s.edges.push([A, B].sort((a, b) => a - b) as [number, number]);
    }

    private disconnect(s: SkeletonGraph, A: number, B: number) {
        const nodeA = s.nodes[A], nodeB = s.nodes[B];
        if (!nodeA || !nodeB) { console.error(`node ${A} or ${B} does not exist`); return; }

        nodeA.connections = nodeA.connections.filter(conn => conn != B);
        nodeB.connections = nodeB.connections.filter(conn => conn != A);

        const key = [A, B].sort((a, b) => a - b) as [number, number];

        s.edges = s.edges.filter(e => e[0] != key[0] || e[1] != key[1]);
    }
}