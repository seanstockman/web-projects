import type { Dispatch, SetStateAction } from 'react';
import type { Vec2 } from "../../../lib/geometry/geometry2d.ts";

/** Everything a mode class needs to read or mutate. One object, passed once per
 * call, instead of threading a dozen individual setters through every method. */
export type CanvasDrawContext = {
    points: Vec2[],
    setPoints: Dispatch<SetStateAction<Vec2[]>>,

    lines: Vec2[][],
    setLines: Dispatch<SetStateAction<Vec2[][]>>,

    cursor: Vec2 | null,
    setCursor: Dispatch<SetStateAction<Vec2 | null>>,

    movedPoint: Vec2 | null,
    setMovedPoint: Dispatch<SetStateAction<Vec2 | null>>,

    setDrawMode: Dispatch<SetStateAction<DrawMode>>,

    findNearestPoint: (mouse: Vec2) => Vec2 | null,
}

/** Every method is optional — a mode only implements the events it cares about.
 * Idle implements none of them. */
export interface DrawMode {
    handleMouseMove?(ctx: CanvasDrawContext, mouse: Vec2): void,
    handleMouseDown?(ctx: CanvasDrawContext, mouse: Vec2): void,
    handleMouseUp?(ctx: CanvasDrawContext, mouse: Vec2): void,
    handleMouseLeave?(ctx: CanvasDrawContext, mouse: Vec2): void,
    handleRightClick?(ctx: CanvasDrawContext, mouse: Vec2): void,
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