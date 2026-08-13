/**
 * PEARL LIVING LAYER — motion policy (single source of truth)
 * ---------------------------------------------------------------------------
 * Mirrors the governed envelope declared as `--pearl-motion-*` tokens in
 * pearl-theme.css. Amplitudes/frequencies live here so JS behaviors and the
 * governance checker share one authority. The Living Layer's whole reason for
 * existing is bounded, decorative light — these are the bounds.
 *
 * Motion is decorative and never load-bearing. Nothing here communicates state.
 */

export const MOTION_POLICY = {
  /** Max ambient opacity delta (whisper amplitude). */
  opacityDeltaMax: 0.08,
  /** Max decorative translation, in px. */
  translateMaxPx: 3,
  /** Max tilt / rotation, in degrees. */
  tiltMaxDeg: 2,
  /** Ambient cycles run no faster than this (ms). */
  ambientMinMs: 5000,
  /** Rare events (tide/shimmer/activation) stay at least this far apart (ms). */
  rareEventMinMs: 12000,
  /** Hard cap on simultaneously-live ghost motes. */
  maxMotes: 16,
  /** Governed easing (matches --pearl-motion-ease). */
  ease: "cubic-bezier(0.22, 0.9, 0.24, 1)",
} as const;

/** Clamp helper used by amplitude-bounded behaviors. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Synchronous reduced-motion probe (behaviors also use the reactive hook). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Coarse-pointer probe — pointer parallax is disabled on touch devices. */
export function isCoarsePointer(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}
