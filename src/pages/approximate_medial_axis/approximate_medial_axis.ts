/**
 * Bibliography
 * 
 * Based on
 * Smogavec, G. & Zalik, B. (2012). "A fast algorithm for constructing approximate medial axis of polygons, using Steiner points" 
 */


import * as poly2tri from "poly2tri";
import { geometry2d, type Point } from "../../lib/geometry/geometry2d.ts";

export const medialAxis = {    
    /** Returns a set of Steiner points to be added to the SweepContext object then re-triangulated. */
    getSteinerPoints(points: Point[], swctx: poly2tri.SweepContext): Point[] {


        return [];
    },

    /** Finds and returns the Steiner Points to be added to resolve three-neighbour obtuse triangles (section 2.1). */
    getObtuseThreeNeighbourSteinerPoints(points: Point[], swctx: poly2tri.SweepContext) {

    }
}