import { geometry2d as g2d, type Vec2 } from "../../lib/geometry/geometry2d.ts";
import { SkeletonBuilder, type Skeleton } from 'straight-skeleton';
// import type { MedialAxis } from "./approximate_medial_axis.ts";
type Road = {
    segment: number[],
    attraction: number,
}

type SkeletonGraphNode = {
    v: Vec2,
    i: number,
    active: boolean,
    connections: SkeletonGraphNode[],
    elevation: number,
    static: boolean,
}

export type SkeletonGraph = {
    /** Vertices in the graph. First n vertices correspond to the n external polygon vertices. */
    nodes: SkeletonGraphNode[],
    /** Unique connections between edges */
    edges: [number, number][],
}

type FinalStripResult = {
    vertices: number[], //indices into the strip graph, wound ccw
    frontageVertices: number[],
    internalEdge: number[],
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
        const nodes: SkeletonGraphNode[] = [];
        const keyToIndex = new Map<string, number>();

        const keyOf = (x: number, y: number) => `${x.toFixed(precision)},${y.toFixed(precision)}`;

        const getIndex = (x: number, y: number): number => {
            const key = keyOf(x, y);
            let idx = keyToIndex.get(key);
            if (idx === undefined) {
                idx = nodes.length;
                keyToIndex.set(key, idx);
                nodes.push({ v: { x: x, y: y }, active: true, connections: [], elevation: 0, static: false, i: nodes.length });
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
                    nodes[lo]!.connections.push(nodes[hi]!);
                    nodes[hi]!.connections.push(nodes[lo]!);
                }
            }
        }

        for (const [pointPos, distance] of skeleton.Distances) {
            // `distance` is the elevation of the vertex located on `pointPos`.
            const pi = getIndex(pointPos.X, pointPos.Y);
            if (!pi) continue;
            nodes[pi]!.elevation = distance;
        }

        this.polygon.forEach((_, i) => {
            const edgeValue: [number, number] = [i, (i + 1) % this.polygon.length];
            edgeValue.sort((a, b) => a - b);
            const edgeIndex = edges.findIndex(e => e[0] == edgeValue[0] && e[1] == edgeValue[1]);
            if (edgeIndex != -1) {
                edges.splice(edgeIndex, 1);
                nodes[edgeValue[0]]!.connections = nodes[edgeValue[0]]!.connections.filter(c => c != nodes[edgeValue[1]]!);
                nodes[edgeValue[1]]!.connections = nodes[edgeValue[1]]!.connections.filter(c => c != nodes[edgeValue[0]]!);
            }
        });

        return { nodes: nodes, edges: edges };
    }

    /** 
     * Generates new road segments around a given polygon (block).
     * @param angleThreshold The angle (in radians) between two segments above which the two segments belong to different roads. Defaults to `π/3`.
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
                    this.disconnect(strip, c, removedNode);
                });
            }
        });

        // clean up loose middle bits
        strip.nodes.forEach((n, i) => {
            if (i < this.polygon.length || n.connections.length !== 1) return;
            // console.log(`loose vertex found: V${i}`);

            this.recursivelyDisconnectTillJunctionOrStatic(strip,n);
        });
    }

    public mergeIntoBetaStrip(showDebug = false) {
        // for all e: exterior edges:\
        if (!this.strip) return;
        const s = this.strip;

        // verify junction exists
        const junction = s.nodes.find(node => node.connections.length > 2);

        /** Maps from inside vertex index to exterior nodes to fix. */
        const betaFixMap = new Map<SkeletonGraphNode, { n: SkeletonGraphNode, roadToCollapseTo: Road, roadToFace: Road }[]>();

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

            let insideNeighbour = n.connections[0]!;

            if (g2d.getAngleABC(prevExternalNode, n.v, nextExternalNode) > Math.PI) {
                // if obtuse, remove connection
                // TODO: will there be a case where it doesnt intersect with a junction on the alpha graph?
                // this.disconnect(s, i, insideNeighbourIndex);
                return;
            }

            this.disconnect(s, insideNeighbour, n);
            n.active = false;

            if (junction) {
                while (insideNeighbour.connections.length == 1) {
                    if (insideNeighbour.static) break;
                    const nextInLink = insideNeighbour.connections[0]!;
                    this.disconnect(s, nextInLink, insideNeighbour);
                    insideNeighbour = nextInLink;
                }
            }

            insideNeighbour.static = true;

            const prevRoad = this.roads[this.frontageMap!.get(`${prev},${i}`)!]!;
            const nextRoad = this.roads[this.frontageMap!.get(`${i},${next}`)!]!;

            const chosenRoad = nextRoad.attraction > prevRoad.attraction ? nextRoad : prevRoad;
            const roadToFace = nextRoad.attraction <= prevRoad.attraction ? nextRoad : prevRoad;

            betaFixMap.getOrInsert(insideNeighbour, []).push({ n: n, roadToCollapseTo: chosenRoad, roadToFace: roadToFace });
        });

        betaFixMap.forEach((conns, interiorNode) => {
            if (conns.length == 2 && (conns[0]!.roadToFace == conns[1]!.roadToFace || conns[0]!.roadToCollapseTo == conns[1]!.roadToCollapseTo)) {
                // add to the midpoint intersection instead
                const A = conns[0]!;
                const B = conns[1]!;
                const O = interiorNode;
                const midpointAB = g2d.midpoint(A.n.v, B.n.v);
                const dir = g2d.normalise(g2d.sub(midpointAB, O.v));

                if (conns[0]!.roadToCollapseTo == conns[1]!.roadToCollapseTo) {
                    // junction - case where both are collapsing onto the same road
                    const intersection = g2d.getRayLineIntersection(O.v, dir, A.roadToCollapseTo.segment.map(i => s.nodes[i]!.v))!;
                    s.nodes.push({ v: intersection.intersection.point, active: true, connections: [interiorNode], elevation: 0, static: false, i: s.nodes.length });
                    this.connect(s, s.nodes[s.nodes.length - 1]!, interiorNode);
                    return;
                }

                // junction - case where both are changing to face the same road
                const perpRHS = g2d.perpRHS(dir);
                const OA = g2d.sub(A.n.v, O.v);
                const [L, R] = g2d.dot(OA, perpRHS) > 0 ? [B, A] : [A, B];

                const dirLR = g2d.normalise(g2d.sub(R.n.v, L.n.v));

                const intersectionL = g2d.getRayLineIntersection(O.v, g2d.scalarMult(dirLR, -1), L.roadToCollapseTo.segment.map(i => s.nodes[i]!.v))!;
                const intersectionR = g2d.getRayLineIntersection(O.v, dirLR, R.roadToCollapseTo.segment.map(i => s.nodes[i]!.v));
                if (!intersectionL) { if (showDebug) console.error({ message: `could not get intersection L, from V${interiorNode} in direction ${R.n}->${L.n}`, road: L.roadToCollapseTo.segment }); return; }
                if (!intersectionR) { if (showDebug) console.error({ message: `could not get intersection R, from V${interiorNode} in direction ${L.n}->${R.n}`, road: R.roadToCollapseTo.segment }); return; }

                s.nodes.push({ v: intersectionL.intersection.point, active: true, connections: [interiorNode], elevation: 0, static: false, i: s.nodes.length });
                s.nodes.push({ v: intersectionR.intersection.point, active: true, connections: [interiorNode], elevation: 0, static: false, i: s.nodes.length });
                this.connect(s, s.nodes[s.nodes.length - 2]!, interiorNode);
                this.connect(s, s.nodes[s.nodes.length - 1]!, interiorNode);

                this.resolveStripCollapse(L.n, s.nodes[s.nodes.length - 2]!, intersectionL.edge, L.roadToCollapseTo, showDebug);
                this.resolveStripCollapse(R.n, s.nodes[s.nodes.length - 1]!, intersectionR.edge, R.roadToCollapseTo, showDebug);
                return;
            }

            conns.forEach(conn => {
                const closestPointOnRoad = g2d.getClosestPointToPOnLine(interiorNode.v, conn.roadToCollapseTo.segment.map(i => this.polygon[i]!));

                s.nodes.push({ v: closestPointOnRoad.point, active: true, connections: [interiorNode], elevation: 0, static: false, i: s.nodes.length });
                this.connect(s, s.nodes[s.nodes.length - 1]!, interiorNode);

                this.resolveStripCollapse(conn.n, s.nodes[s.nodes.length - 1]!, closestPointOnRoad.edge, conn.roadToCollapseTo, showDebug);
            });
        });

        console.log(this.roads);
    }

    private connect(s: SkeletonGraph, A: SkeletonGraphNode, B: SkeletonGraphNode) {
        if (!A.connections.includes(B)) A.connections.push(B);
        if (!B.connections.includes(A)) B.connections.push(A);

        s.edges.push([A.i, B.i].sort((a, b) => a - b) as [number, number]);
    }

    private disconnect(s: SkeletonGraph, A: SkeletonGraphNode, B: SkeletonGraphNode) {
        A.connections = A.connections.filter(conn => conn != B);
        B.connections = B.connections.filter(conn => conn != A);

        const key = [A.i, B.i].sort((a, b) => a - b) as [number, number];

        s.edges = s.edges.filter(e => e[0] != key[0] || e[1] != key[1]);
    }

    private recursivelyDisconnectTillJunctionOrStatic(s: SkeletonGraph, curr: SkeletonGraphNode) {
        while (curr.connections.length == 1 && !curr.static) {
            const next = curr.connections[0]!;
            this.disconnect(s, next, curr);
            curr = next;
        }
    }

    /**
     * Corrects `roadCollapsedOnto` to remove points no longer part of its associated strip. Also removes edges from the frontage map.
     * @param edgeOntoIndices Indexes into `roadCollapsedOnto.segment` that show which external nodes the newPoint falls between.
     */
    private resolveStripCollapse(
        cornerPoint: SkeletonGraphNode,
        newPoint: SkeletonGraphNode,
        edgeOntoIndices: [number, number],
        roadCollapsedOnto: Road,
        showDebug = false) {
        // const edgeOnto = edgeOntoIndices.map(i => roadCollapsedOnto.segment[i]!)

        if (showDebug) console.log(`collapsing onto road ${roadCollapsedOnto.segment.toString()}`);
        /** Whether the collapse moved the edge leftwards (i.e. is the cornerPoint at the end of the road segment.) */
        const collapsedLeft = roadCollapsedOnto.segment[roadCollapsedOnto.segment.length - 1]! == cornerPoint.i;
        let spliceIndex = 0;
        let spliceLength = 0;
        if (collapsedLeft) {
            spliceIndex = edgeOntoIndices[1];
            spliceLength = roadCollapsedOnto.segment.length - spliceIndex;
        } else {
            spliceIndex = 0;
            spliceLength = edgeOntoIndices[0] + 1;
        }

        roadCollapsedOnto.segment.splice(spliceIndex, spliceLength, newPoint.i);

        if (showDebug) console.log(`updated road collapsed to ${roadCollapsedOnto.segment.toString()}`);
    }

    private generateSubBlocksFromStrip() {

    }

    private correctStraightSkeleton() {

    }
}