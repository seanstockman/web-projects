import { geometry2d, type Point } from "./geometry2d.ts";

type HalfEdge = {
    twin: number,
    next: number,
    prev: number,
    /** The index of the vertex this half edge starts from. */
    origin: number,
    /** The index of the vertex this half edge ends at. */
    target: number,
    used: boolean,
    face: number,
    dead: boolean;
}

type Vertex = Point & {
    edges: number[]
}

type Face = {
    edges: number[]
}

export class HalfEdgeGraph {
    vertices: Vertex[];
    halfEdges: HalfEdge[];
    faces: Face[];
    private edgeMap: Map<string, number>;

    constructor(points: Point[]) {
        this.vertices = points.map(p => ({ x: p.x, y: p.y, edges: [] }));
        this.halfEdges = [];
        this.faces = [];
        this.edgeMap = new Map<string, number>();
    }

    private registerEdges(...edgeIndices: number[]) {
        edgeIndices.forEach(edgeIndex => {
            const he = this.halfEdges[edgeIndex]!;
            const dest = this.halfEdges[he.next]!.origin;
            this.edgeMap.set(`${he.origin}-${dest}`, edgeIndex);
        });
    }

    private findAndSetTwins(...edgeIndices: number[]) {
        edgeIndices.forEach(edgeIndex => {
            let e = this.halfEdges[edgeIndex]!;
            let dest = this.halfEdges[e.next]!.origin;
            let foundTwin = this.findEdgeIndex(dest, e.origin);
            if (foundTwin == -1) return;
            e.twin = foundTwin;
            this.halfEdges[foundTwin]!.twin = edgeIndex;
        });
    }

    /** Finds and returns the index of the edge from origin to dest in this HalfEdgeGraph's HalfEdge array. 
     * Returns -1 if it cannot be found. */
    public findEdgeIndex(origin: number, dest: number) {
        return this.edgeMap.get(`${origin}-${dest}`) ?? -1;
    }

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

    /** Adds the triangle A-B-C in a clockwise direction. */
    public addTriangle(A: number, B: number, C: number): boolean {
        if (!this.vertices[A]) return false;
        if (!this.vertices[B]) return false;
        if (!this.vertices[C]) return false;

        let edgeAB = initialiseHalfEdge(A, B);
        let edgeBC = initialiseHalfEdge(B, C);
        let edgeCA = initialiseHalfEdge(C, A);

        this.halfEdges.push(edgeAB, edgeBC, edgeCA);
        let AB = this.halfEdges.length - 3;
        let BC = this.halfEdges.length - 2;
        let CA = this.halfEdges.length - 1;

        edgeAB.next = BC;
        edgeAB.prev = CA;

        edgeBC.next = CA;
        edgeBC.prev = AB;

        edgeCA.next = AB;
        edgeCA.prev = BC;

        this.faces.push({
            edges: [AB, BC, CA]
        });

        edgeAB.face = this.faces.length - 1;
        edgeBC.face = this.faces.length - 1;
        edgeCA.face = this.faces.length - 1;

        this.findAndSetTwins(AB, BC, CA);
        this.registerEdges(AB, BC, CA);

        this.vertices[A].edges.push(AB);
        this.vertices[B].edges.push(BC);
        this.vertices[C].edges.push(CA);

        // console.log(`angles from point ${A}:`);
        // console.log(this.vertices[A].edges.map(e => this.halfEdges[e]!.targetVertex));
        // console.log(this.getAngleMap(A).map(theta => (180 / Math.PI) * theta));
        return true;
    }

    /** Flips the internal triangles in polygon ABCD from ABC & ACD (along AC) to ABD & DBC. */
    public flipTriangles(A: number, B: number, C: number, D: number): boolean {
        if (!this.vertices[A]) return false;
        if (!this.vertices[B]) return false;
        if (!this.vertices[C]) return false;
        if (!this.vertices[D]) return false;

        if (!this.validatePolygon(A, B, C)) return false;
        if (!this.validatePolygon(A, C, D)) return false;

        let AC = this.findEdgeIndex(A, C);
        if (AC == -1) { console.error(`flipTriangles: can't find halfEdge ${A}-${C}`); return false; }
        let CA = this.halfEdges[AC]!.twin;
        if (CA == -1) { console.error(`flipTriangles: can't find twin halfline ${C}-${A}`); return false; }
        if (this.findEdgeIndex(B, D) != -1 || this.findEdgeIndex(D, B) != -1) { console.error(`flipTriangles: halfEdge ${B}-${D} or ${D}-${B} exists`); return false; }

        let ABC = this.halfEdges[CA]!.face;
        let ACD = this.halfEdges[AC]!.face;

        let edgeAC = this.halfEdges[AC]!;
        let edgeCA = this.halfEdges[CA]!;

        let AB = edgeCA.next;
        let BC = edgeCA.prev;
        let CD = edgeAC.next;
        let DA = edgeAC.prev;

        // switch nomenclature
        let DB = CA;
        let edgeDB = edgeCA;

        let BD = AC;
        let edgeBD = edgeAC;

        let ABD = ACD;
        let BCD = ABC;

        // switch CA to DB
        edgeDB.origin = D;
        edgeDB.target = B;
        edgeDB.next = BC;
        this.halfEdges[BC]!.prev = DB;

        this.halfEdges[BC]!.next = CD;
        this.halfEdges[CD]!.prev = BC;

        this.halfEdges[CD]!.next = DB;
        edgeDB.prev = CD;

        this.halfEdges[CD]!.face = BCD;

        // switch AC to BD
        edgeBD.origin = B;
        edgeDB.target = D;
        edgeBD.next = DA;
        this.halfEdges[DA]!.prev = BD;

        this.halfEdges[DA]!.next = AB;
        this.halfEdges[AB]!.prev = DA;

        this.halfEdges[AB]!.next = BD;
        edgeBD.prev = AB;

        this.halfEdges[AB]!.face = ABD;

        // finalise
        this.edgeMap.delete(`${A}-${C}`);
        this.edgeMap.delete(`${C}-${A}`);
        this.edgeMap.set(`${B}-${D}`, BD);
        this.edgeMap.set(`${D}-${B}`, DB);

        this.vertices[A].edges = this.vertices[A].edges.filter(item => item != AC);
        this.vertices[C].edges = this.vertices[C].edges.filter(item => item != CA);

        this.vertices[B].edges.push(BD);
        this.vertices[D].edges.push(DB);

        this.faces[BCD]!.edges = [BC, CD, DB];
        this.faces[ABD]!.edges = [AB, BD, DA];

        return true;
    }

    public removeFace(faceIndex: number): boolean {
        const ABC = this.faces[faceIndex];
        if (!ABC) return false;
        if (ABC.edges.length != 3) return false;

        for (let i = 0; i < 3; i++) {
            const edgeIndex = ABC.edges[i]!;
            const removedEdge = this.halfEdges[edgeIndex]!;
            const origin = this.vertices[removedEdge.origin];
            origin!.edges = origin!.edges.filter(e => e != edgeIndex);
            removedEdge.dead = true;
        }

        ABC.edges = [];
        return true;
    }

    // Returns an array of angles from each edge from vertex A, in the order they are listed.
    public getAngleMap(A: number): number[] {
        const origin = this.vertices[A];
        if (!origin) return [];
        const edgeAngles: number[] = [];
        origin.edges.forEach(e_i => {
            const edge = this.halfEdges[e_i];
            if (!edge) { edgeAngles.push(-1); return; }
            const target = this.vertices[edge.target];
            if (!target) { edgeAngles.push(-1); return; }
            edgeAngles.push(geometry2d.getAngleAB(origin, target));
        });

        return edgeAngles;
    }
}

/** Initialises a new half edge going from A to B. */
function initialiseHalfEdge(A: number, B: number): HalfEdge {
    return {
        twin: -1,
        next: -1,
        prev: -1,
        origin: A,
        target: B,
        used: false,
        face: -1,
        dead: false
    }
}

export const halfEdgeTriangular = {
    /** Traverses the graph from the vertex at index A to the point at index B along a straight line, and returns the 
     * list of faces traversed. Assumes that a continuous list of triangles exists. */
    traverse(g: HalfEdgeGraph, A: number, B: number): number[] {
        if (!g.vertices[A] || !g.vertices[B]) return [];
        const angleAB = geometry2d.getAngleAB(g.vertices[A], g.vertices[B]);
        return halfEdgeTriangular.traverseStartingAtPoint(g, A, g.vertices[A]!, angleAB, B);
    },

    /** Recursively traverses the graph starting at point M, following the line from S along angle SE. 
     * Will return if it hits the `endVertexIndex`. */
    traverseStartingAtPoint(g: HalfEdgeGraph, M: number, startVertex: Vertex, angleAB: number, endVertexIndex: number): number[] {
        // find angle to target
        console.log(`traversing starting at vertex ${M}`);
        const angleMapM = g.getAngleMap(M);
        if (!g.vertices[M]) { console.error(`Vertex ${M} does not exist.`); return []; }
        let nextEdgeIndex = -1;
        console.log(`angleMapM`);
        console.log(angleMapM.map(a => (a * 180 / Math.PI).toFixed(1)));
        console.log(g.vertices[M].edges.map(e => g.halfEdges[e]?.target));
        for (let i = 0; i < angleMapM.length; i++) {
            console.log(`edge ${g.vertices[M].edges[i]} target = ${g.halfEdges[g.vertices[M]!.edges[i]!]!.target}`);
            if (angleMapM[i]! < angleAB) continue;
            
            if (angleMapM[i]! == angleAB) {
                const nextEdge = g.halfEdges[g.vertices[M].edges[i]!]!;
                const result = [nextEdge.face];
                if (nextEdge.twin != -1) {
                    result.push(g.halfEdges[nextEdge.twin]!.face);
                }
                if (nextEdge.target == endVertexIndex) return result;

                return [...result, ...this.traverseStartingAtPoint(g, nextEdge.target, startVertex, angleAB, endVertexIndex)];
            }
            nextEdgeIndex = i;
            break;
        }
        if (nextEdgeIndex == -1) nextEdgeIndex = 0;

        const nextEdge = g.halfEdges[g.vertices[M].edges[nextEdgeIndex]!]!;
        const farEdge = g.halfEdges[nextEdge.next]!;
        if (farEdge.twin == -1) { console.error(`far edge ${nextEdge.next} has no twin. Returning.`); return [farEdge.face]; }
        return [farEdge.face, ...this.traverseStartingAtEdge(g, g.halfEdges[farEdge.twin]!, startVertex, angleAB, endVertexIndex)];
    },

    traverseStartingAtEdge(g: HalfEdgeGraph, E: HalfEdge, startVertex: Vertex, angleAB: number, endVertexIndex: number): number[] {
        console.log(`traversing starting at edge ${E.origin}-${E.target}`);
        return [];
    }
}