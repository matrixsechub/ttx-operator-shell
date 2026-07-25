/**
 * PEARL PILOT — feature-flag seam
 * ---------------------------------------------------------------------------
 * The repository has no existing feature-flag facility, so this is the smallest
 * internal configuration seam: it DEFAULTS OFF, FAILS CLOSED on any error, and
 * requires **no Cloudflare binding, variable, or secret**. The pilot route
 * renders a disabled state unless this returns true.
 *
 * Resolution order (first match wins):
 *   1. an explicit test override (set only by unit tests);
 *   2. the build-time env `VITE_PEARL_PILOT` (unset → OFF).
 * Anything else, or any thrown error, resolves to OFF.
 */

let testOverride: boolean | null = null;

/** Test-only seam. Pass `null` to clear. Never called by application code. */
export function __setPearlPilotOverride(value: boolean | null): void {
  testOverride = value;
}

export function isPearlPilotEnabled(): boolean {
  try {
    if (testOverride !== null) return testOverride;
    const raw = (import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_PEARL_PILOT;
    return raw === "on" || raw === "true" || raw === "1";
  } catch {
    return false; // fail closed
  }
}
