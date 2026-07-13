import type { Point } from "./geometry2d.ts";

type HalfEdge = {
    twin: number,
    next: number,
    prev: number,
    v: number,
    used: boolean,
    face: number,
}

type Vertex = {
    point: Point,
    edges: number[]
}

type Face = {
    edges: number[]
}

export class HalfEdgeGraph {
    vertices: Vertex[];
    halfEdges: HalfEdge[] = [];
    faces: Face[] = [];

    private edgeMap = new Map<string, number>();

    constructor(points: Point[]) {
        this.vertices = points.map(p => ({ point: p, edges: [] }));
    }

    private registerEdges(...edgeIndices: number[]) {
        edgeIndices.forEach(edgeIndex => {
            const he = this.halfEdges[edgeIndex]!;
            const dest = this.halfEdges[he.next]!.v;
            this.edgeMap.set(`${he.v}-${dest}`, edgeIndex);
        });
    }

    private findAndSetTwins(...edgeIndices: number[]) {
        edgeIndices.forEach(edgeIndex => {
            let e = this.halfEdges[edgeIndex]!;
            let foundTwin = this.findEdge(this.halfEdges[e.next]!.v, e.v);
            if (foundTwin == -1) return;
            e.twin = foundTwin;
            this.halfEdges[foundTwin]!.twin = edgeIndex;
        });
    }

    /** Finds and returns the index of the edge from origin to dest in this HalfEdgeGraph's HalfEdge array. 
     * Returns -1 if it cannot be found. */
    private findEdge(origin: number, dest: number) {
        return this.edgeMap.get(`${origin}-${dest}`) ?? -1;
    }

    private validatePolygon(...vertices: number[]): boolean {
        if (vertices.length < 3) return false;
        // for (let i = 0; i < vertices.length; i++)
        vertices.forEach((origin, i) => {
            let nextIndex = i == vertices.length - 1 ? 0 : i + 1;
            let dest = vertices[i]!;
            if (this.findEdge(origin, dest) == -1) return false;
        });
        return true;
    }

    /** Adds the triangle A-B-C in a clockwise direction. */
    public addTriangle(A: number, B: number, C: number): boolean {
        if (!this.vertices[A]) return false;
        if (!this.vertices[B]) return false;
        if (!this.vertices[C]) return false;

        let edgeAB = initialiseHalfEdge(A);
        let edgeBC = initialiseHalfEdge(B);
        let edgeCA = initialiseHalfEdge(C);

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

        let AC = this.findEdge(A, C);
        if (AC == -1) { console.error(`flipTriangles: cant find halfline ${A}-${C}`); return false; }
        let CA = this.halfEdges[AC]!.twin;
        if (CA == -1) { console.error(`flipTriangles: cant find twin halfline ${C}-${A}`); return false; }
        if (this.findEdge(B, D) != -1 || this.findEdge(D, B) != -1) { console.error(`flipTriangles: halfline ${B}-${D} or ${D}-${B} exists`); return false; }

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
        edgeDB.v = D;
        edgeDB.next = BC;
        this.halfEdges[BC]!.prev = DB;

        this.halfEdges[BC]!.next = CD;
        this.halfEdges[CD]!.prev = BC;

        this.halfEdges[CD]!.next = DB;
        edgeDB.prev = CD;

        this.halfEdges[CD]!.face = BCD;

        // switch AC to BD
        edgeBD.v = B;
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
}

function initialiseHalfEdge(A: number): HalfEdge {
    return {
        twin: -1,
        next: -1,
        prev: -1,
        v: A,
        used: false,
        face: -1
    }
}