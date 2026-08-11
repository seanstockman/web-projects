import { geometry2d as g2d, type Vec2 } from "../../lib/geometry/geometry2d.ts";
import { SkeletonBuilder, type Skeleton } from 'straight-skeleton';
import { PairedNumberMap } from "../../lib/geometry/pairedNumberMap.ts";
// import type { MedialAxis } from "./approximate_medial_axis.ts";
type Road = {
    frontage: number[],
    attraction: number,
    verticesOnRight?: number[],
    verticesOnLeft?: number[],
    interiorVertices?: number[]
}

enum Direction {
    CW,
    CCW,
    higher
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

export class ParcelGenerator {
    public polygon: Vec2[];
    public roads: Road[];
    public skeleton: SkeletonGraph | undefined;
    public strip: SkeletonGraph | undefined;
    public parcels: SkeletonGraph = { nodes: [], edges: [] };
    /** Maps edges (in ccw order) to roads. */
    public frontageMap: PairedNumberMap = new PairedNumberMap(false);
    // private skeleton: Skeleton | undefined = undefined;
    private lastTouchedNodes: SkeletonGraphNode[] = [];

    constructor(polygon: Vec2[], roads: Road[] = []) {
        this.polygon = g2d.windPolygonCCW(polygon);
        this.roads = roads;
    }

    //#region Straight Skeleton

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

    //#region Roads and Alpha Strip

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
            this.frontageMap!.set(prev.i, curr.i, peripheralRoads.length);
            const angle = g2d.getAngleDifferenceBetweenABandBC(prev.v, curr.v, next.v);
            if ((angle >= angleThreshold && cumulativeLength >= minLength) || cumulativeLength >= maxLength) {
                peripheralRoads.push({ frontage: roadSegment, attraction: cumulativeLength });
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
                peripheralRoads.push({ frontage: roadSegment, attraction: cumulativeLength });
            } else {
                roadSegment.splice(roadSegment.length - 1);
                peripheralRoads[0]!.frontage.splice(0, 0, ...roadSegment);
                peripheralRoads[0]!.attraction += cumulativeLength;
                for (let i = 0; i < roadSegment.length - 1; i++) {
                    this.frontageMap.set(roadSegment[i]!, roadSegment[i + 1]!, 0);
                }
            }
        }

        this.roads = peripheralRoads;
        return { roads: this.roads, frontageMap: this.frontageMap };
    }

    public mergeIntoAlphaStrip() {
        if (!this.skeleton) return;

        // deep copy
        this.strip = {
            nodes: [...this.skeleton!.nodes.map(n => ({
                v: n.v,
                i: n.i,
                connections: n.connections,
                active: n.active,
                static: n.static,
                elevation: n.elevation
            }))],
            edges: [...this.skeleton!.edges]
        };

        this.strip.nodes.forEach(n => {
            n.connections = n.connections.map(c => this.strip!.nodes[c.i]!);
        });

        const strip = this.strip;
        this.roads.forEach(r => {
            // delete the straight skeleton values for each thing. so we need to turn the s polygon into strips.
            for (let i = 1; i < r.frontage.length - 1; i++) {
                const remove_i = r.frontage[i]!;
                // filter edges with vertex remove_i}
                const removedNode = strip.nodes[remove_i]!;
                removedNode.active = false;
                removedNode.connections.forEach(c => {
                    this.disconnect(strip, c, removedNode);
                });
            }
        });

        this.cleanLooseEnds(strip);
    }

    //#region Beta Strip

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

            if (junction) insideNeighbour = this.recursivelyDisconnectTillJunctionOrStatic(s, insideNeighbour);

            insideNeighbour.static = true;

            const prevRoad = this.roads[this.frontageMap!.get(prev, i)!]!;
            const nextRoad = this.roads[this.frontageMap!.get(i, next)!]!;

            const chosenRoad = nextRoad.attraction > prevRoad.attraction ? nextRoad : prevRoad;
            const roadToFace = nextRoad.attraction <= prevRoad.attraction ? nextRoad : prevRoad;

            betaFixMap.getOrInsert(insideNeighbour, []).push({ n: n, roadToCollapseTo: chosenRoad, roadToFace: roadToFace });
        });

        const collapsesToResolve: { corner: SkeletonGraphNode, inserted: SkeletonGraphNode, e: [number, number], rCollapse: Road, rFace: Road }[] = [];
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
                    const intersection = g2d.getRayLineIntersection(O.v, dir, A.roadToCollapseTo.frontage.map(i => s.nodes[i]!.v))!;
                    s.nodes.push({ v: intersection.intersection.point, active: true, connections: [interiorNode], elevation: 0, static: false, i: s.nodes.length });
                    this.connect(s, s.nodes[s.nodes.length - 1]!, interiorNode);
                    return;
                }

                // junction - case where both are changing to face the same road
                const perpRHS = g2d.perpRHS(dir);
                const OA = g2d.sub(A.n.v, O.v);
                const [L, R] = g2d.dot(OA, perpRHS) > 0 ? [B, A] : [A, B];

                const dirLR = g2d.normalise(g2d.sub(R.n.v, L.n.v));

                const intersectionL = g2d.getRayLineIntersection(O.v, g2d.scalarMult(dirLR, -1), L.roadToCollapseTo.frontage.map(i => s.nodes[i]!.v))!;
                const intersectionR = g2d.getRayLineIntersection(O.v, dirLR, R.roadToCollapseTo.frontage.map(i => s.nodes[i]!.v));
                if (!intersectionL) { if (showDebug) console.error({ message: `could not get intersection L, from V${interiorNode} in direction ${R.n}->${L.n}`, road: L.roadToCollapseTo.frontage }); return; }
                if (!intersectionR) { if (showDebug) console.error({ message: `could not get intersection R, from V${interiorNode} in direction ${L.n}->${R.n}`, road: R.roadToCollapseTo.frontage }); return; }

                s.nodes.push({ v: intersectionL.intersection.point, active: true, connections: [interiorNode], elevation: 0, static: false, i: s.nodes.length });
                s.nodes.push({ v: intersectionR.intersection.point, active: true, connections: [interiorNode], elevation: 0, static: false, i: s.nodes.length });

                const [newNodeL, newNodeR] = [s.nodes[s.nodes.length - 2]!, s.nodes[s.nodes.length - 1]!];

                this.connect(s, newNodeL, interiorNode);
                this.connect(s, newNodeR, interiorNode);

                this.resolveStripCollapse(L.n, newNodeL, intersectionL.edge.map(ei => L.roadToCollapseTo.frontage[ei]!) as [number, number], L.roadToCollapseTo, L.roadToFace, showDebug);
                this.resolveStripCollapse(R.n, newNodeR, intersectionR.edge.map(ei => R.roadToCollapseTo.frontage[ei]!) as [number, number], R.roadToCollapseTo, R.roadToFace, showDebug);
                return;
            }


            conns.forEach(conn => {
                const closestPointOnRoad = g2d.getClosestPointToPOnLine(interiorNode.v, conn.roadToCollapseTo.frontage.map(i => this.polygon[i]!));

                s.nodes.push({ v: closestPointOnRoad.point, active: true, connections: [interiorNode], elevation: 0, static: false, i: s.nodes.length });
                this.connect(s, s.nodes[s.nodes.length - 1]!, interiorNode);
                collapsesToResolve.push({
                    corner: conn.n, inserted: s.nodes[s.nodes.length - 1]!,
                    e: closestPointOnRoad.edge.map(ei => conn.roadToCollapseTo.frontage[ei]!) as [number, number],
                    rCollapse: conn.roadToCollapseTo,
                    rFace: conn.roadToFace,
                });
            });
        });

        collapsesToResolve.forEach(c => {
            this.resolveStripCollapse(c.corner, c.inserted, c.e, c.rCollapse, c.rFace, showDebug);
        });

        this.correctStraightSkeletons();

        // console.log(this.roads);
        // console.log(this.frontageMap);
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

    /**
     *  
     * @returns The last explored node.
     */
    private recursivelyDisconnectTillJunctionOrStatic(s: SkeletonGraph, curr: SkeletonGraphNode) {
        while (curr.connections.length == 1 && !curr.static) {
            const next = curr.connections[0]!;
            this.disconnect(s, next, curr);
            curr = next;
        }
        return curr;
    }

    /**
     * Corrects `roadCollapsedOnto` to remove points no longer part of its associated strip. Also removes edges from the frontage map.
     * @param edgeOntoIndices Indices of nodes which the newPoint falls between.
     */
    private resolveStripCollapse(
        cornerNode: SkeletonGraphNode,
        insertedNode: SkeletonGraphNode,
        edgeOntoIndices: [number, number],
        roadCollapsedOnto: Road,
        roadToFace: Road,
        showDebug = false) {

        // const edgeOnto = edgeOntoIndices.map(i => roadCollapsedOnto.segment[i]!)
        const roadIndex = this.roads.findIndex(r => roadCollapsedOnto == r);
        const collapsedLeft = roadCollapsedOnto.frontage[roadCollapsedOnto.frontage.length - 1] == cornerNode.i;

        if (showDebug) console.log(`collapsing onto road ${roadCollapsedOnto.frontage.toString()}`);
        const crSeg = roadCollapsedOnto.frontage;

        /** Whether the collapse moved the edge leftwards (i.e. is the cornerPoint at the end of the road segment.) */
        let spliceIndex = 0;
        let spliceLength = 0;
        if (collapsedLeft) {
            spliceIndex = crSeg.findIndex(i => i == edgeOntoIndices[1]);
            spliceLength = crSeg.length - spliceIndex;
            this.frontageMap.set(edgeOntoIndices[0], insertedNode.i, roadIndex);
        } else {
            spliceIndex = 0;
            spliceLength = crSeg.findIndex(i => i == edgeOntoIndices[0]) + 1;
            this.frontageMap.set(insertedNode.i, edgeOntoIndices[1], roadIndex);
        }

        for (let i = spliceIndex; i < spliceIndex + spliceLength - 1; i++) {
            // per edge
            this.frontageMap.delete(crSeg[i]!, crSeg[i + 1]!);
        }

        for (let i = spliceIndex; i < spliceIndex + spliceLength; i++) {
            // per vert
            const lastTouched = this.recursivelyDisconnectTillJunctionOrStatic(this.skeleton!, this.skeleton!.nodes[crSeg[i]!]!);
            lastTouched.static = true;
            this.lastTouchedNodes.push(lastTouched);
            if (showDebug) console.log(`disconnecting node V${crSeg[i]!}, lt: ${lastTouched.i}`);
        }

        const vertsMoved = crSeg.slice(spliceIndex, spliceIndex + spliceLength);

        if (collapsedLeft) {
            roadToFace.verticesOnLeft = [insertedNode.i, ...vertsMoved];
        } else {
            roadToFace.verticesOnRight = [...vertsMoved, insertedNode.i];
        }

        this.frontageMap.delete(edgeOntoIndices[0], edgeOntoIndices[1]);

        crSeg.splice(spliceIndex, spliceLength, insertedNode.i);

        if (showDebug) console.log(`updated road collapsed to ${crSeg.toString()}`);
    }

    private correctStraightSkeletons(showDebug: boolean = false) {
        const sk = this.skeleton!;
        const strip = this.strip!;
        const nodesToRecomputeStrSk: SkeletonGraphNode[] = [];

        // de static all the nodes
        sk.nodes.forEach(n => { n.static = false; });

        // static only nodes on the strip
        strip.edges.forEach(e => {
            e.forEach(i => {
                if (i >= sk.nodes.length) return;
                sk.nodes[i]!.static = true;
            });
        });

        this.addInteriorStripToRoads();
        console.log({ roads: this.roads });

        // this.lastTouchedNodes = this.lastTouchedNodes.filter(n => !n.static && n.connections.length > 0);
        this.lastTouchedNodes = g2d.removeDupes(this.lastTouchedNodes.map(n => n.i)).map(i => sk.nodes[i]!);
        this.lastTouchedNodes.forEach(n => {
            nodesToRecomputeStrSk.push(...this.findSkeletonsToRecompute(sk, n));
        });
        this.roads.forEach(r => this.recomputeStraightSkeletonsInRoad(r, nodesToRecomputeStrSk.filter(n => r.frontage.includes(n.i))));
    }

    private addInteriorStripToRoads() {
        this.roads.forEach(r => {
            r.interiorVertices = [];
            const rightmostNodeIndex = r.verticesOnRight ? r.verticesOnRight[r.verticesOnRight.length - 1]! : r.frontage[r.frontage.length - 1]!;
            r.interiorVertices = this.followGraph(Direction.CCW, this.strip?.nodes[rightmostNodeIndex]!, undefined).map(n => n.i);
        });
    }

    private followGraph(direction: Direction, n: SkeletonGraphNode, prev: SkeletonGraphNode | undefined = undefined): SkeletonGraphNode[] {
        const connectionsWithoutPrev = n.connections.filter(c => c != prev);
        // return this
        if (connectionsWithoutPrev.length == 1) {
            return [n, ...this.followGraph(direction, connectionsWithoutPrev[0]!, n)];
        } else if (connectionsWithoutPrev.length == 0) {
            return [n];
        } else {
            if (prev == undefined) return [n, ...this.followGraph(direction, connectionsWithoutPrev[0]!, n)];
            // mulitple
            const angleNPrev = g2d.getAngleAB(n.v, prev.v);
            const normalise = (angle: number) => (angle + 2 * Math.PI) % (2 * Math.PI);
            if (direction == Direction.CCW || direction == Direction.CW) {
                connectionsWithoutPrev.sort((a, b) => {
                    const angleNA = g2d.getAngleAB(n.v, a.v);
                    const angleNB = g2d.getAngleAB(n.v, b.v);
                    const normalisedDiff = normalise(angleNB - angleNPrev) - normalise(angleNA - angleNPrev);
                    return direction == Direction.CCW ? normalisedDiff : -normalisedDiff;
                });
            }
            if (direction == Direction.higher) {
                connectionsWithoutPrev.sort((a, b) => b.elevation - a.elevation)
            }
            return [n, ...this.followGraph(direction, connectionsWithoutPrev[0]!, n)];
        }
    }

    private findSkeletonsToRecompute(s: SkeletonGraph, n: SkeletonGraphNode): SkeletonGraphNode[] {
        if (n.static) return [];
        if (n.i < this.polygon.length) return [n];
        let skels: SkeletonGraphNode[] = [];
        n.connections.forEach(c => {
            this.disconnect(s, n, c);
            skels.push(...this.findSkeletonsToRecompute(s, c));
        });
        return skels;
    }

    /** Cleans up loose middle bits. */
    private cleanLooseEnds(s: SkeletonGraph) {
        s.nodes.forEach((n, i) => {
            if (i < this.polygon.length || n.connections.length != 1) return;
            this.recursivelyDisconnectTillJunctionOrStatic(s, n);
        });
    }

    private recomputeStraightSkeletonsInRoad(r: Road, nodes: SkeletonGraphNode[]) {
        if (nodes.length == 0) return;
        const interior = r.interiorVertices!.map(i => this.strip!.nodes[i]!.v);
        if (!interior) { console.error(`road ${r.frontage.toString()} has no interior vertices defined`); return; }

        nodes.forEach(n => {
            const before = this.polygon[(n.i - 1 + this.polygon.length) % this.polygon.length]!;
            const after = this.polygon[(n.i + 1) % this.polygon.length]!;
            const angleBisector = g2d.getAngleABC(before, n.v, after) / 2 + g2d.getAngleAB(n.v, after);
            const dir = { x: Math.cos(angleBisector), y: Math.sin(angleBisector) };

            const int = g2d.getRayLineIntersection(n.v, dir, interior);
            if (!int) { console.error(`could not recompute straight skeleton for node ${n.i}`); return; }
            this.skeleton?.nodes.push({
                v: int.intersection.point,
                i: this.skeleton.nodes.length,
                active: false,
                connections: [],
                elevation: 0,
                static: false
            });
            this.connect(this.skeleton!, n, this.skeleton?.nodes[this.skeleton.nodes.length - 1]!);
        });
    }

    //#region Parcel Subdivision
    public subdivideIntoParcels(r: Road, distancePerSubdivision = 50, minArea = 0, maxArea = Infinity) {
        // distancePerSubdivision = Math.random() * 60 + 40;

        const interiorPolyline = r.interiorVertices!.map(i => this.strip!.nodes[i]!.v);
        const frontagePolyline = r.frontage.map(i => this.strip!.nodes[i]!.v);
        let totalDistance = 0;
        for (let i = 0; i < frontagePolyline.length - 1; i++) {
            totalDistance += g2d.dist(frontagePolyline[i]!, frontagePolyline[i + 1]!);
        }
        let cumulativeDistance = distancePerSubdivision;
        let pointOnRoad = g2d.getPointAlongPolyline(frontagePolyline, cumulativeDistance);
        let numIterations = 0;
        while (pointOnRoad != undefined) {
            if (totalDistance - cumulativeDistance < distancePerSubdivision) break;

            const [a, b] = pointOnRoad.edge.map(i => this.strip!.nodes[r.frontage[i]!]!) as [SkeletonGraphNode, SkeletonGraphNode];
            const dirIn = g2d.perpLHS(g2d.normalise(g2d.sub(b.v, a.v)));

            // test against straight skeletons left and right
            // TODO: really need to have these as their own vertex-strips
            // compute path?

            const nsToAddAfter: SkeletonGraphNode[] = [];
            let intersection: {
                intersection: {
                    point: Vec2;
                    t: number;
                    u: number;
                };
                edge: [number, number];
            } | undefined

            const skeletonPrev = this.skeleton!.nodes[a.i];
            // if (skeletonPrev) {
            //     const ccwNodes = this.followCounterClockwise(skeletonPrev, undefined);
            //     ccwNodes.splice(ccwNodes.findIndex(n => r.interiorVertices?.includes(n.i)));
            //     console.log(`nodes following left skeleton from node ${this.parcels.nodes.length}: ${ccwNodes.map(n => n.i).toString()}`);
            // }

            const [skeletonA, skeletonB] = [a, b].map(n => this.skeleton!.nodes[n.i]);
            [skeletonA, skeletonB].forEach((sk, i) => {
                if (intersection) return;
                if (!sk) return;
                const addedNodes = this.followGraph(Direction.higher, sk, undefined);
                addedNodes.splice(addedNodes.findIndex(n => r.interiorVertices?.includes(n.i)) + 1);


                intersection = g2d.getRayLineIntersection(pointOnRoad!.v, dirIn, addedNodes.map(n => n.v));
                if (intersection) {
                    nsToAddAfter.push(...addedNodes.slice(intersection.edge[1]));
                }
            });

            if (!intersection) {
                intersection = g2d.getRayLineIntersection(pointOnRoad.v, dirIn, interiorPolyline);
            }

            if (intersection) {
                const nodeOnRoad = {
                    v: pointOnRoad.v,
                    i: this.parcels.nodes.length,
                    active: false,
                    connections: [],
                    elevation: 0,
                    static: false
                }

                const intNode = {
                    v: intersection.intersection.point,
                    i: this.parcels.nodes.length + 1,
                    active: false,
                    connections: [],
                    elevation: 0,
                    static: false
                }

                this.parcels.nodes.push(nodeOnRoad, intNode);
                this.connect(this.parcels, nodeOnRoad, intNode);

                nsToAddAfter.forEach(n => {
                    this.parcels.nodes.push({
                        v: n.v,
                        i: this.parcels.nodes.length,
                        active: false,
                        connections: [],
                        elevation: 0,
                        static: false
                    });

                    this.connect(this.parcels, this.parcels.nodes[this.parcels.nodes.length - 1]!, this.parcels.nodes[this.parcels.nodes.length - 2]!);
                });
            }

            cumulativeDistance += distancePerSubdivision;
            pointOnRoad = g2d.getPointAlongPolyline(frontagePolyline, cumulativeDistance);
            numIterations++
        }
    }
}