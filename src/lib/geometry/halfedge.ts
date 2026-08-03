import { geometry2d, type Point } from "./geometry2d.ts";

type HalfEdge = {
    /** The index of the vertex this half edge starts from. */
    origin: number,
    /** The index of the vertex this half edge ends at. */
    target: number,
    twin: number,
    next: number,
    prev: number,
    used: boolean,
    face: number,
    dead: boolean;
    locked: boolean,
}

type Vertex = Point & {
    /** The connecting half edges with this vertex as an origin. */
    edges: number[],
}

type Face = {
    edges: number[]
}

type BundledHalfEdge = {
    e: HalfEdge,
    index: number
}

export class HalfEdgeGraph {
    vertices: Vertex[];
    halfEdges: HalfEdge[];
    faces: Face[];
    private edgeMap: Map<string, number>;
    private freeEdges: number[] = [];
    private freeFaces: number[] = [];

    constructor(points: Point[]) {
        this.vertices = points.map(p => ({ x: p.x, y: p.y, edges: [] }));
        this.halfEdges = [];
        this.faces = [{ edges: [] }]; // outer face
        this.edgeMap = new Map<string, number>();
    }

    /** Registers the given edge indices into the edgeMap. */
    private registerEdgesInEdgeMap(...edgeIndices: number[]) {
        edgeIndices.forEach(edgeIndex => {
            const he = this.halfEdges[edgeIndex];
            if (!he) return;
            this.edgeMap.set(this.edgeToString(he), edgeIndex);
        });
    }

    /** Finds and returns the index of the edge from origin to dest in this HalfEdgeGraph's HalfEdge array. 
     * Returns -1 if it cannot be found. */
    public findEdgeIndex(origin: number, dest: number) {
        return this.edgeMap.get(`${origin}->${dest}`) ?? -1;
    }

    /** Validate that the vertices are connected in a correct order. */
    private validatePolygon(...vertices: number[]): boolean {
        if (vertices.length < 3) return false;
        // for (let i = 0; i < vertices.length; i++)
        vertices.forEach((origin, i) => {
            let nextIndex = i == vertices.length - 1 ? 0 : i + 1;
            let dest = vertices[nextIndex]!;
            if (this.findEdgeIndex(origin, dest) == -1) return false;
        });
        return true;
    }

    /** Adds a disconnected, standalone triangle surrounded by the outer face to the half edge map. Must be called before using addConnectedTriangle */
    public addDisconnectedTriangle(A: number, B: number, C: number) {
        const vertexA = this.vertices[A], vertexB = this.vertices[B], vertexC = this.vertices[C];
        if (!vertexA || !vertexB || !vertexC) { console.error(`vertex ${A},${B} or ${C} could not be found`); return false; }

        const outerFace = this.faces[0];
        if (!outerFace || outerFace.edges.length != 0) { console.error(`empty face is undefined or already has edges assigned`); return false; }

        // inner CW halfedges 
        const AB = this.initialiseHalfEdge(A, B);
        const BC = this.initialiseHalfEdge(B, C);
        const CA = this.initialiseHalfEdge(C, A);

        // initialise inner face
        const ABC = this.getFreeFace();
        ABC.f.edges = [AB.index, BC.index, CA.index];
        AB.e.face = ABC.index;
        BC.e.face = ABC.index;
        CA.e.face = ABC.index;

        // outer CCW halfedges
        const BA = this.initialiseHalfEdge(B, A);
        const CB = this.initialiseHalfEdge(C, B);
        const AC = this.initialiseHalfEdge(A, C);

        // assign outer face to outers
        outerFace.edges = [BA.index, AC.index, CB.index];
        BA.e.face = 0;
        AC.e.face = 0;
        CB.e.face = 0;

        // assign twins
        AB.e.twin = BA.index;
        BA.e.twin = AB.index;

        BC.e.twin = CB.index;
        CB.e.twin = BC.index;

        CA.e.twin = AC.index;
        AC.e.twin = CA.index;

        // assign ordering - inner
        AB.e.next = BC.index;
        BC.e.next = CA.index;
        CA.e.next = AB.index;

        AB.e.prev = CA.index;
        BC.e.prev = AB.index;
        CA.e.prev = BC.index;

        // assign ordering - outer
        BA.e.next = AC.index;
        CB.e.next = BA.index;
        AC.e.next = CB.index;

        BA.e.prev = CB.index;
        CB.e.prev = AC.index;
        AC.e.prev = BA.index;

        // register edges
        this.registerEdgesInEdgeMap(AB.index, BC.index, CA.index, BA.index, CB.index, AC.index);

        // push edges onto vertices
        vertexA.edges.push(AB.index, AC.index);
        vertexB.edges.push(BC.index, BA.index);
        vertexC.edges.push(CA.index, CB.index);

        console.log(`added disconnected triangle`);
        console.log(this);

        return true;
    }

    /** Adds the triangle A-B-C in a clockwise direction. */
    public addConnectedTriangle(A: number, B: number, C: number): boolean {
        const vertexA = this.vertices[A], vertexB = this.vertices[B], vertexC = this.vertices[C];
        if (!vertexA || !vertexB || !vertexC) { console.error(`vertex ${A},${B} or ${C} could not be found`); return false; }

        let AB = this.findEdgeIndex(A, B);
        let BC = this.findEdgeIndex(B, C);
        let CA = this.findEdgeIndex(C, A);

        const preExistingEdgeIndices = [AB, BC, CA].filter(v => v != -1);
        // reverse if AB -> CA for consistent 'first'
        if (preExistingEdgeIndices.includes(AB) && preExistingEdgeIndices.includes(CA)) preExistingEdgeIndices.reverse();

        // verify at least one exists
        if (preExistingEdgeIndices.length == 0) { console.error(`cannot add connected triangle: no edges already exist (no connection)`); return false; }
        if (preExistingEdgeIndices.length == 3) { console.log(`triangle already exists`); return false; }

        // generate new edges if they dont exist
        if (AB == -1) AB = this.initialiseHalfEdge(A, B).index;
        const edgeAB = this.halfEdges[AB];

        if (BC == -1) BC = this.initialiseHalfEdge(B, C).index;
        const edgeBC = this.halfEdges[BC];

        if (CA == -1) CA = this.initialiseHalfEdge(C, A).index;
        const edgeCA = this.halfEdges[CA];

        if (!edgeAB || !edgeBC || !edgeCA) { console.error(`one edge could not be found`); return false; }

        const newEdgeIndices = [AB, BC, CA].filter(v => !preExistingEdgeIndices.includes(v));
        const newEdges = newEdgeIndices.map(e => this.halfEdges[e]!);

        // determine (an) existing edge and outer face
        const outerFaceIndex = this.halfEdges[preExistingEdgeIndices[0]!]!.face;
        const outerFace = this.faces[outerFaceIndex];
        if (!outerFace) { console.error(`could not index outer face (${outerFaceIndex})`); console.log(this); return false; }

        // determine the prev and next.
        const firstExistingEdgeIndex = preExistingEdgeIndices[0]!;
        const firstExistingEdge = this.halfEdges[firstExistingEdgeIndex];
        if (!firstExistingEdge) { console.error(`somethings gone wrong`); return false; }

        const lastExistingEdgeIndex = preExistingEdgeIndices[preExistingEdgeIndices.length - 1]!;
        const lastExistingEdge = this.halfEdges[lastExistingEdgeIndex];
        if (!lastExistingEdge) { console.error(`somethings gone wrong`); return false; }

        // get prev edge in outer face
        const prevEdgeInOuterFaceIndex = firstExistingEdge.prev;
        const prevEdgeInOuterFace = this.getPrev(firstExistingEdge);
        if (!prevEdgeInOuterFace) { console.error(`could not find prevEdgeOuter ${prevEdgeInOuterFaceIndex} (from edge ${this.edgeToString(firstExistingEdge)})`); return false; }

        // get next edge in outer face
        const nextEdgeInOuterFaceIndex = lastExistingEdge.next;
        const nextEdgeInOuterFace = this.getNext(lastExistingEdge);
        if (!nextEdgeInOuterFace) { console.error(`could not find nextEdgeOuter ${nextEdgeInOuterFaceIndex}`); return false; }

        // generate twins for edges that dont exist
        let BA = edgeAB.twin, AC = edgeCA.twin, CB = edgeBC.twin;

        if (BA == -1) BA = this.initialiseHalfEdge(B, A).index;
        const edgeBA = this.halfEdges[BA];

        if (CB == -1) CB = this.initialiseHalfEdge(C, B).index;
        const edgeCB = this.halfEdges[CB];

        if (AC == -1) AC = this.initialiseHalfEdge(A, C).index;
        const edgeAC = this.halfEdges[AC];

        if (!edgeBA || !edgeCB || !edgeAC) { console.error(`one twin edge could not be found`); return false; }

        // push edges for new edges and assign twins
        if (newEdgeIndices.includes(AB)) {
            vertexA.edges.push(AB);
            vertexB.edges.push(BA);
            edgeAB.twin = BA;
            edgeBA.twin = AB;
        }
        if (newEdgeIndices.includes(BC)) {
            vertexB.edges.push(BC);
            vertexC.edges.push(CB);
            edgeBC.twin = CB;
            edgeCB.twin = BC;
        }
        if (newEdgeIndices.includes(CA)) {
            vertexC.edges.push(CA);
            vertexA.edges.push(AC);
            edgeCA.twin = AC;
            edgeAC.twin = CA;
        }

        // create new inner face
        const bundledABC = this.getFreeFace(), ABC = bundledABC.index, faceABC = bundledABC.f;

        // assign ordering
        // AB -> BC -> CA
        edgeAB.next = BC;
        edgeBC.next = CA;
        edgeCA.next = AB;

        edgeAB.prev = CA;
        edgeBC.prev = AB;
        edgeCA.prev = BC;

        // assign faces
        edgeAB.face = ABC;
        faceABC.edges = [AB, BC, CA];

        // AC -> CB -> BA
        edgeAC.next = CB;
        edgeCB.next = BA;
        edgeBA.next = AC;

        edgeAC.prev = BA;
        edgeCB.prev = AC;
        edgeBA.prev = CB;

        // wont change existing
        this.registerEdgesInEdgeMap(AB, BC, CA, BA, CB, AC);

        // assign outer face
        const firstOuterMatchIndex = outerFace.edges.findIndex(e => preExistingEdgeIndices.includes(e));
        if (firstOuterMatchIndex == -1) { console.error(`first existing element could not be found`); return false; }

        // the twins of the new edges we splice in where the old ones were.
        // remove old ones (this way looping doesnt matter)
        preExistingEdgeIndices.forEach(edgeIndex =>
            outerFace.edges.splice(outerFace.edges.findIndex(outerFaceEdge => outerFaceEdge == edgeIndex), 1)
        );

        const newEdgeTwinIndices = newEdges.map(e => e.twin);
        newEdgeTwinIndices.forEach(twinIndex => {
            const twin = this.halfEdges[twinIndex]
            if (!twin) { console.error(`could not index into edge ${twinIndex}`); return; }
            twin.face = outerFaceIndex;
        });

        newEdgeTwinIndices.reverse();
        // check case where includes only AC and BA. max length of newEdgeTwins can be 2 by setup. flip them so that they are oriented in the correct order (so theres not a missing jump)
        if (newEdgeTwinIndices.includes(BA) && newEdgeTwinIndices.includes(AC)) {
            newEdgeTwinIndices.reverse();
        }

        // insert the new edge twins into the outer array
        outerFace.edges.splice(firstOuterMatchIndex, 0, ...newEdgeTwinIndices);

        // correct the next and prev
        this.halfEdges[newEdgeTwinIndices[0]!]!.prev = prevEdgeInOuterFaceIndex;
        prevEdgeInOuterFace.next = newEdgeTwinIndices[0]!;

        this.halfEdges[newEdgeTwinIndices[newEdgeTwinIndices.length - 1]!]!.next = nextEdgeInOuterFaceIndex;
        nextEdgeInOuterFace.prev = newEdgeTwinIndices[newEdgeTwinIndices.length - 1]!;

        return true;
    }

    /** Flips the internal triangles in polygon ABCD from ABC & ACD (along AC) to ABD & DBC. */
    public flipTriangles(A: number, B: number, C: number, D: number): boolean {
        const vertexA = this.vertices[A], vertexB = this.vertices[B], vertexC = this.vertices[C], vertexD = this.vertices[D];

        if (!vertexA) { console.error(`flipTriangles: could not find vertex ${A}`); return false; }
        if (!vertexB) { console.error(`flipTriangles: could not find vertex ${B}`); return false; }
        if (!vertexC) { console.error(`flipTriangles: could not find vertex ${C}`); return false; }
        if (!vertexD) { console.error(`flipTriangles: could not find vertex ${D}`); return false; }

        if (!this.validatePolygon(A, B, C)) return false;
        if (!this.validatePolygon(A, C, D)) return false;

        let AC = this.findEdgeIndex(A, C);
        if (AC == -1) { console.error(`flipTriangles: can't find halfEdge ${A}->${C}`); return false; }

        let CA = this.halfEdges[AC]!.twin;
        if (CA == -1) { console.error(`flipTriangles: can't find twin halfline ${C}->${A}`); return false; }

        if (this.findEdgeIndex(B, D) != -1 || this.findEdgeIndex(D, B) != -1) {
            console.error(`flipTriangles: halfEdge ${this.vertEdgeToString(B, D)} or ${this.vertEdgeToString(D, B)} exists`);
            return false;
        }

        const edgeAC = this.halfEdges[AC];
        const edgeCA = this.halfEdges[CA];

        if (!edgeCA || !edgeAC) return false;

        if (edgeCA.locked || edgeAC.locked) {
            console.log(`edge ${this.edgeToString(edgeAC)} or ${this.edgeToString(edgeCA)} is locked. returning.`);
            return false;
        }

        const ABC = edgeCA.face;
        const ACD = edgeAC.face;

        const AB = edgeCA.next;
        const BC = edgeCA.prev;
        const CD = edgeAC.next;
        const DA = edgeAC.prev;

        // switch nomenclature
        const DB = CA;
        const edgeDB = edgeCA;

        const BD = AC;
        const edgeBD = edgeAC;

        const ABD = ACD;
        const faceABD = this.faces[ABD];
        if (!faceABD) { console.error(`no face ${A}-${C}-${D} could be found.`); return false; }

        const BCD = ABC;
        const faceBCD = this.faces[ABC];
        if (!faceBCD) { console.error(`no face ${A}-${B}-${C} could be found.`); return false; }

        // switch CA to DB
        edgeDB.origin = D;
        edgeDB.target = B;
        edgeDB.next = BC;

        const edgeBC = this.halfEdges[BC];
        if (!edgeBC) { console.error(`no edge ${this.vertEdgeToString(B, C)} could be found`); return false; }

        const edgeCD = this.halfEdges[CD];
        if (!edgeCD) { console.error(`no edge ${this.vertEdgeToString(C, D)} could be found`); return false; }

        edgeBC.prev = DB;

        edgeBC.next = CD;
        edgeCD.prev = BC;

        edgeCD.next = DB;
        edgeDB.prev = CD;

        edgeCD.face = BCD;

        // switch AC to BD
        edgeBD.origin = B;
        edgeBD.target = D;
        edgeBD.next = DA;

        const edgeDA = this.halfEdges[DA];
        if (!edgeDA) { console.error(`no edge ${this.vertEdgeToString(D, A)} could be found`); return false; }

        const edgeAB = this.halfEdges[AB];
        if (!edgeAB) { console.error(`no edge ${this.vertEdgeToString(A, B)} could be found`); return false; }

        edgeDA.prev = BD;

        edgeDA.next = AB;
        edgeAB.prev = DA;

        edgeAB.next = BD;
        edgeBD.prev = AB;

        edgeAB.face = ABD;

        // finalise
        this.edgeMap.delete(`${A}-${C}`);
        this.edgeMap.delete(`${C}-${A}`);
        this.edgeMap.set(this.vertEdgeToString(B, D), BD);
        this.edgeMap.set(this.vertEdgeToString(D, B), DB);

        vertexA.edges = vertexA.edges.filter(item => item != AC);
        vertexC.edges = vertexC.edges.filter(item => item != CA);

        vertexB.edges.push(BD);
        vertexD.edges.push(DB);

        faceBCD.edges = [BC, CD, DB];
        faceABD.edges = [AB, BD, DA];

        return true;
    }

    public removeFace(faceIndex: number): boolean {
        const ABC = this.faces[faceIndex];
        if (!ABC) return false;
        if (ABC.edges.length != 3) return false;

        // Assumption: face index 0 is always THE single open-exterior region,
        // as established by addDisconnectedTriangle. If your mesh ever tracks
        // multiple distinct "exterior-like" faces, this needs to check against
        // whichever set those are, not a hardcoded 0.
        const EXTERIOR_FACE = 0;

        for (let i = 0; i < 3; i++) {
            const edgeIndex = ABC.edges[i]!;
            const removedEdge = this.halfEdges[edgeIndex]!;

            const origin = this.vertices[removedEdge.origin]!;
            origin.edges = origin.edges.filter(e => e != edgeIndex);

            const removedEdgeTwin = this.getTwin(removedEdge);

            if (removedEdgeTwin) {
                if (removedEdgeTwin.face === EXTERIOR_FACE) {
                    // This side bordered open exterior, not a real triangle — the
                    // boundary detour that was inserted for this triangle collapses:
                    // splice the twin out of the exterior loop, reconnecting its
                    // neighbors directly, and remove it too.
                    const twinIndex = removedEdge.twin;
                    const prev = this.getPrev(removedEdgeTwin);
                    const next = this.getNext(removedEdgeTwin);

                    if (prev && next && prev !== removedEdgeTwin) {
                        prev.next = removedEdgeTwin.next;
                        next.prev = removedEdgeTwin.prev;
                    }
                    // if prev/next resolve back to the twin itself, it was the
                    // exterior face's only remaining edge — nothing left to relink.

                    const twinOrigin = this.vertices[removedEdgeTwin.origin]!;
                    twinOrigin.edges = twinOrigin.edges.filter(e => e != twinIndex);

                    removedEdgeTwin.dead = true;
                    this.edgeMap.delete(this.edgeToString(removedEdgeTwin));
                    this.freeEdges.push(twinIndex);
                } else {
                    // This side bordered a real, still-existing neighbor triangle —
                    // that triangle and its own face/loop are untouched. It just
                    // now has a boundary-facing edge instead of a twin.
                    removedEdgeTwin.twin = -1;
                }
            }

            removedEdge.dead = true;
            this.edgeMap.delete(this.edgeToString(removedEdge));
            this.freeEdges.push(edgeIndex);
        }

        ABC.edges = [];
        this.freeFaces.push(faceIndex);
        return true;
    }

    /** Returns a map of angles from each edge originating from vertex A, in the order of their angle (0-2π). 
     * Does not consider any edges ending at vertex A. */
    public getAngleMap(A: number): Map<number, HalfEdge> {
        const angleMap = new Map<number, HalfEdge>();
        const origin = this.vertices[A];
        if (!origin) return angleMap;

        origin.edges.forEach(e_i => {
            const edge = this.halfEdges[e_i];
            if (!edge) { return; }
            const target = this.vertices[edge.target];
            if (!target) { return; }
            angleMap.set(geometry2d.getDirectionFromAToB(origin, target), edge);
        });

        // return angleMap;

        const sortedAngleMap = new Map([...angleMap].sort((a, b) => a[0] - b[0]));
        return sortedAngleMap;
    }

    /** Initialises a half edge going from A to B and returns the edge object and its index. Will resize the respective array if no free spots are found. */
    private initialiseHalfEdge(A: number, B: number): BundledHalfEdge {
        const edge = this.getFreeEdge();
        edge.e.origin = A;
        edge.e.target = B;
        return edge;
    }


    private getFreeEdge(): BundledHalfEdge {
        if (this.freeEdges.length != 0) {
            const freeEdgeIndex = this.freeEdges.splice(0, 1)[0]!;
            const edge = this.halfEdges[freeEdgeIndex]!;
            edge.twin = -1;
            edge.next = -1;
            edge.prev = -1;
            edge.origin = -1;
            edge.target = -1;
            edge.used = false;
            edge.face = -1;
            edge.dead = false;
            return { e: edge, index: freeEdgeIndex };
        }
        const newEdge = {
            twin: -1,
            next: -1,
            prev: -1,
            origin: -1,
            target: -1,
            used: false,
            face: -1,
            dead: false,
            locked: false
        };
        this.halfEdges.push(newEdge);
        return { e: newEdge, index: this.halfEdges.length - 1 }
    }

    /** Finds a free edge and returns the face object and its index. Will resize and add the face to the face array if no free spots are found. */
    private getFreeFace(): { f: Face, index: number } {
        if (this.freeFaces.length != 0) {
            const freeFaceIndex = this.freeFaces.splice(0, 1)[0]!;
            return { f: this.faces[freeFaceIndex]!, index: freeFaceIndex };
        }
        const newFace: Face = {
            edges: []
        };
        this.faces.push(newFace);
        return { f: newFace, index: this.faces.length - 1 }
    }

    public clean() {
        // vertices: Vertex[]; DONE
        // halfEdges: HalfEdge[]; 
        // private edgeMap: Map<string, number>;
        // faces: Face[];

        const removedFaces: number[] = [];
        this.faces.forEach((f, i) => {
            if (f.edges.length == 0) {
                removedFaces.push(i);
                return;
            }

            if (removedFaces.length == 0) return;

            // face edge's face index
            f.edges.map(e => this.halfEdges[e]!).forEach(e => {
                e.face -= removedFaces.length;
            });
        });

        removedFaces.reverse().forEach(i => {
            this.faces.splice(i, 1);
        });


        // edges
        const removedEdges: number[] = [];
        const updatedEdgeMap: Map<number, number> = new Map<number, number>();

        this.halfEdges.forEach((e, i) => {
            if (e.dead) { removedEdges.push(i); return; }

            if (removedEdges.length == 0) return;
            const newIndex = i - removedEdges.length;

            // change origin vertex's map
            const vertexIndex = this.vertices[e.origin]!.edges.indexOf(i);
            this.vertices[e.origin]!.edges[vertexIndex]! = i - removedEdges.length;
            // console.log(`edge ${i}: changing vertex ${e.origin}'s edge index to ${this.vertices[e.origin]!.edges[vertexIndex]!}`);

            // change faces index
            if (e.face != -1) {
                this.faces[e.face]!.edges[this.faces[e.face]!.edges.indexOf(i)]! = newIndex;
            }

            // change edgemap
            this.edgeMap.set(`${this.edgeToString(e)}`, newIndex);

            updatedEdgeMap.set(i, newIndex);
        });

        updatedEdgeMap.forEach((_, original) => {
            const e = this.halfEdges[original]!;

            e.twin = updatedEdgeMap.get(e.twin)!;
            e.prev = updatedEdgeMap.get(e.prev)!;
            e.next = updatedEdgeMap.get(e.next)!;
        });

        removedEdges.reverse().forEach(i => {
            this.halfEdges.splice(i, 1);
        })
    }

    public edgeToString(e: HalfEdge) {
        return (`${e.origin}->${e.target}`);
    }

    public vertEdgeToString(origin: number, target: number) {
        return (`${origin}->${target}`);
    }

    /** Returns the twin of this half-edge, or undefined if it does not exist. */
    public getTwin(e: HalfEdge) {
        const twinEdgeIndex = e.twin;
        if (twinEdgeIndex == -1) { console.error(`twin edge of ${this.edgeToString(e)} is undefined`); return undefined; }
        const twin = this.halfEdges[twinEdgeIndex];
        if (!twin) console.error(`could not find edge ${this.vertEdgeToString(e.target, e.origin)}`);
        return twin;
    }

    /** Returns the face of this half-edge, or undefined. */
    public getFace(e: HalfEdge) {
        const faceIndex = e.face;
        if (faceIndex == -1) return undefined;
        return this.faces[faceIndex];
    }

    /** Returns the next edge of this half-edge, or undefined. */
    public getNext(e: HalfEdge) {
        const nextEdgeIndex = e.next;
        if (nextEdgeIndex == -1) return undefined;
        return this.halfEdges[nextEdgeIndex];
    }

    /** Returns the previous edge of this half-edge, or undefined. */
    public getPrev(e: HalfEdge) {
        const prevEdgeIndex = e.prev;
        if (prevEdgeIndex == -1) return undefined;
        return this.halfEdges[prevEdgeIndex];
    }

    /** Returns the origin of this half-edge, or undefined. */
    public getOrigin(e: HalfEdge) {
        const originVertexIndex = e.origin;
        if (originVertexIndex == -1) return undefined;
        return this.vertices[originVertexIndex];
    }

    /** Returns the origin of this half-edge, or undefined. */
    public getTarget(e: HalfEdge) {
        const targetVertexIndex = e.target;
        if (targetVertexIndex == -1) { console.error(`getTarget: target vertex is undefined`); return undefined; }
        const target = this.vertices[targetVertexIndex];
        if (!target) console.error(`getTarget: could not retrieve vertex ${targetVertexIndex}`);
        return target;
    }
}

export const halfEdgeTriangular = {
    /** Traverses the graph from the vertex at index A to the point at index B along a straight line, and returns the 
     * list of faces traversed. Assumes that a continuous list of triangles exists. */
    traverse(g: HalfEdgeGraph, A: number, B: number): number[] {
        // console.log(`Starting traversal from vertices ${A}->${B}.`);
        if (!g.vertices[A] || !g.vertices[B]) return [];
        const angleAB = geometry2d.getDirectionFromAToB(g.vertices[A], g.vertices[B]);
        return halfEdgeTriangular.traverseStartingAtPoint(g, A, g.vertices[A]!, angleAB, B);
    },

    /** Recursively traverses the graph starting at point M, following the line from S along angle SE. 
     * Will return if it hits the `endVertexIndex`. */
    traverseStartingAtPoint(g: HalfEdgeGraph, M: number, startVertex: Vertex, theta: number, endVertexIndex: number): number[] {
        // find angle to target
        // console.log(`Traversal iteration starting at vertex ${M}.`);
        if (!g.vertices[M]) { console.error(`traverse: vertex ${M} does not exist.`); return []; }
        const angleMapM = [...g.getAngleMap(M)];

        let nextEdge: HalfEdge | undefined;

        for (let i = 0; i < angleMapM.length; i++) {
            // console.log(`edge ${g.vertices[M].edges[i]} target = ${g.halfEdges[g.vertices[M]!.edges[i]!]!.target}`);
            const alpha = angleMapM[i]![0]!;
            const edge = angleMapM[i]![1]!;

            // console.log(`- v${M}: angle: ${(alpha * 180 / Math.PI).toFixed(1)}, edge: ${edge.origin}-${edge.target}`);

            // specific case
            const loopCheckVertex = g.halfEdges[edge.prev]!.origin;
            if (geometry2d.getDirectionFromAToB(g.vertices[M], g.vertices[loopCheckVertex]!) == theta) {
                if (loopCheckVertex == endVertexIndex) {
                    // console.log(`- found end (vertex ${endVertexIndex})`);
                    return [edge.face];
                }
                return [edge.face, ...this.traverseStartingAtPoint(g, loopCheckVertex, startVertex, theta, endVertexIndex)];
            }

            if (alpha == theta) {
                // console.log(`equal!`);
                const result = [edge.face];
                if (edge.twin && edge.twin != -1) {
                    result.push(g.halfEdges[edge.twin]!.face);
                }

                const nextVertex = edge.target;

                if (nextVertex == endVertexIndex) {
                    return result;
                }

                return [...result, ...this.traverseStartingAtPoint(g, nextVertex, startVertex, theta, endVertexIndex)];
            }

            if (alpha < theta) continue;
            nextEdge = edge;
            // console.log(`- angle > theta, setting edge as edge ${edge.origin}-${edge.target}`);
            break;
        }

        if (!nextEdge) {
            const newNextEdgeAngleInfo = angleMapM[0];
            if (!newNextEdgeAngleInfo) return [];
            nextEdge = newNextEdgeAngleInfo[1];
            if (!nextEdge) return [];
        }

        // console.log(`- found next edge: ${nextEdge.origin}-${nextEdge.target}`);
        const farEdge = g.halfEdges[nextEdge.next];
        if (!farEdge) { console.error(`far edge ${nextEdge.next} doesn't exist`); return []; }
        const newIterationStartEdge = g.getTwin(farEdge);
        if (!newIterationStartEdge) { console.error(`far edge ${nextEdge.twin} (twin of ${nextEdge.next} does not exist.`); return [farEdge.face]; }
        return [farEdge.face, ...this.traverseStartingAtEdge(g, newIterationStartEdge, startVertex, theta, endVertexIndex)];
    },

    traverseStartingAtEdge(g: HalfEdgeGraph, E: HalfEdge, startVertex: Vertex, theta: number, endVertexIndex: number): number[] {
        // console.log(`Traversal iteration starting at edge ${E.origin}-${E.target}`);
        const nextEdge = g.getNext(E);
        if (!nextEdge) { console.error(`traversal: could not find opposite vertex from edge ${g.edgeToString(E)}`); return []; }
        // console.log(`- opposite vertex: ${oppositeVertex}`);
        if (nextEdge.target == endVertexIndex) {
            // console.log(`- found end (vertex ${endVertexIndex})`);
            return [E.face];
        }

        const oppositeVertex = g.getTarget(nextEdge);
        if (!oppositeVertex) return [];

        const alpha = geometry2d.getDirectionFromAToB(startVertex, oppositeVertex);
        if (alpha == theta) {
            return [E.face, ...this.traverseStartingAtPoint(g, nextEdge.target, startVertex, theta, endVertexIndex)];
        }

        const whichEdgeTest = ((alpha - theta + Math.PI * 2) % (Math.PI * 2)) < Math.PI;

        const newEdgeTwin = whichEdgeTest ? g.getPrev(E) : g.getNext(E);
        if (!newEdgeTwin) { console.error(`traverse: could not find newEdgeTwin`); return [E.face]; }

        const newIterationStartEdge = g.getTwin(newEdgeTwin);
        if (!newIterationStartEdge) { console.error(`far edge ${newEdgeTwin.twin} (twin of ${g.edgeToString(newEdgeTwin)}) does not exist.`); return [E.face]; }
        return [E.face, ...this.traverseStartingAtEdge(g, newIterationStartEdge, startVertex, theta, endVertexIndex)];
    }
}