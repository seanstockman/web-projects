import type { Dispatch, SetStateAction } from 'react';
import type { Point } from "../../../lib/geometry/geometry2d.ts";

/** Everything a mode class needs to read or mutate. One object, passed once per
 * call, instead of threading a dozen individual setters through every method. */
export type CanvasDrawContext = {
    points: Point[],
    setPoints: Dispatch<SetStateAction<Point[]>>,

    lines: Point[][],
    setLines: Dispatch<SetStateAction<Point[][]>>,

    cursor: Point | null,
    setCursor: Dispatch<SetStateAction<Point | null>>,

    movedPoint: Point | null,
    setMovedPoint: Dispatch<SetStateAction<Point | null>>,

    setDrawMode: Dispatch<SetStateAction<DrawMode>>,

    findNearestPoint: (mouse: Point) => Point | null,
}

/** Every method is optional — a mode only implements the events it cares about.
 * Idle implements none of them. */
export interface DrawMode {
    handleMouseMove?(ctx: CanvasDrawContext, mouse: Point): void,
    handleMouseDown?(ctx: CanvasDrawContext, mouse: Point): void,
    handleMouseUp?(ctx: CanvasDrawContext, mouse: Point): void,
    handleMouseLeave?(ctx: CanvasDrawContext, mouse: Point): void,
    handleRightClick?(ctx: CanvasDrawContext, mouse: Point): void,
}

/** A DrawMode that's meant to be user-selectable — e.g. shown as a toolbar
 * button. Modes that only exist as internal transition targets (like
 * LineContinue, reached only from LineStart) implement plain DrawMode instead. */
export interface SelectableDrawMode extends DrawMode {
    /** Stable identifier — used as the value in UI controls (e.g. ToggleButtonGroup),
     * since the mode objects themselves aren't great values to compare/serialize. */
    id: string,
    label: string,
    /** A component reference, not a rendered element — keeps these files as
     * plain .ts (no JSX) and lets the consumer decide how to render it. */
    icon: React.ComponentType,
}