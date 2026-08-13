/**
 * PEARL PILOT — operational condition → motion policy
 * ---------------------------------------------------------------------------
 * Decorative Living motion must SUSPEND under adverse governance conditions.
 * This maps a Beacon/system condition to a motion decision. Motion is never an
 * authority signal — suspension is a calm-down, not a status code, and state
 * color remains evidence-backed regardless.
 *
 * The condition is supplied by the caller. The pilot defaults it to `NOMINAL`
 * (no adverse condition asserted) — a neutral default, NOT fabricated live
 * state. A production integration would feed the real governance systemMode
 * (e.g. from the status/governance surface) into this seam.
 */

export type OperationalCondition =
  | "NOMINAL"
  | "VERIFIED"
  | "HOLD"
  | "PENDING"
  | "DEGRADED"
  | "SAFE_MODE"
  | "BLOCKED"
  | "CRITICAL";

/** True when decorative Living motion must be suspended for this condition. */
export function motionSuspended(condition: OperationalCondition): boolean {
  return condition === "SAFE_MODE" || condition === "BLOCKED" || condition === "CRITICAL";
}
