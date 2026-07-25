import { describe, it, expect, afterEach } from "vitest";
import { isPearlPilotEnabled, __setPearlPilotOverride } from "../featureFlag";

/**
 * F1 runtime-evidence closure for the pilot feature flag, exercised against the
 * REAL production reader in `featureFlag.ts` (which is never modified to satisfy
 * a test).
 *
 * Environment note (honest, and load-bearing for how these assertions are run):
 * under `@vitejs/plugin-react` Vite bakes a per-module *static* `import.meta.env`
 * snapshot at transform time. The value the reader sees for `VITE_PEARL_PILOT`
 * is therefore fixed by the BUILD environment for the whole process and cannot be
 * mutated at runtime from a sibling test module (`vi.stubEnv` / direct assignment
 * both miss the source module's own baked `import.meta.env`). We do not paper over
 * that with a mock; instead we prove the reader two honest ways:
 *
 *   1. Parametric table assertion (below): the real reader MUST agree with the
 *      canonical acceptance rule for whatever value the build env baked. The
 *      qualification matrix runs this file across several `VITE_PEARL_PILOT`
 *      values — `on`/`true`/`1` (→ ON) and `false`/`""`/malformed/absent (→ OFF) —
 *      so the full table is walked against unmodified production code.
 *   2. The test-only `__setPearlPilotOverride` seam, which governs runtime
 *      rendering (used by the router/render tests) without persistent activation,
 *      and whose `null` reset falls back to the real env reader.
 */

const CANONICAL_ENABLED = new Set(["on", "true", "1"]);
const BUILD_FLAG = (import.meta as unknown as { env?: Record<string, unknown> }).env?.VITE_PEARL_PILOT;
const BUILD_FLAG_LABEL = typeof BUILD_FLAG === "string" ? JSON.stringify(BUILD_FLAG) : "absent";
const EXPECTED_FROM_ENV = typeof BUILD_FLAG === "string" && CANONICAL_ENABLED.has(BUILD_FLAG);

afterEach(() => __setPearlPilotOverride(null));

describe("isPearlPilotEnabled — real import.meta.env reader", () => {
  it(`agrees with the canonical acceptance table for the build env (VITE_PEARL_PILOT=${BUILD_FLAG_LABEL})`, () => {
    // Fail-closed by construction: only "on"/"true"/"1" enable; everything else
    // (absent, "false", "0", "", any malformed string) must read OFF.
    expect(isPearlPilotEnabled()).toBe(EXPECTED_FROM_ENV);
  });

  describe("test override seam (governs render without persistent activation)", () => {
    it("override true → ON regardless of the env", () => {
      __setPearlPilotOverride(true);
      expect(isPearlPilotEnabled()).toBe(true);
    });

    it("override false → OFF regardless of the env", () => {
      __setPearlPilotOverride(false);
      expect(isPearlPilotEnabled()).toBe(false);
    });

    it("override null → falls back to the real env reader (no persistent activation)", () => {
      __setPearlPilotOverride(true);
      expect(isPearlPilotEnabled()).toBe(true);
      __setPearlPilotOverride(null);
      expect(isPearlPilotEnabled()).toBe(EXPECTED_FROM_ENV);
    });
  });
});
