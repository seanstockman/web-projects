import type { DrawMode } from "./types.ts";

/** Does nothing on any event. Stateless, so a single shared instance is fine —
 * see the singleton export below instead of `new Idle()` everywhere. */
export class Idle implements DrawMode { }

export const idleMode = new Idle();