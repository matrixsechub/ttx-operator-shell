import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the AUTHENTICATED cockpit Pearl-route browser proofs.
 * Serves the real built cockpit (`dist/`) through a test static server that
 * mirrors the Worker's cockpit SPA fallback, so direct-URL entry and refresh on
 * `/dashboard/pearl-pilot` exercise the real cockpitRouter + RequireAuth.
 *
 * The served build's flag state is chosen by how `dist/` was built:
 *   - default build            → VITE_PEARL_PILOT unset → pilot disabled  (PEARL_FLAG=off)
 *   - VITE_PEARL_PILOT=on build → pilot enabled                            (PEARL_FLAG=on)
 * The spec reads PEARL_FLAG to assert the matching render; auth-boundary and
 * route-reachability scenarios run identically in both.
 */
const CHROMIUM = process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium";
// Dedicated port (8815) so the cockpit server never collides with the
// substrate/living preview configs (both use 8813).
const PORT = Number(process.env.COCKPIT_PORT ?? 8815);
const COCKPIT_DIST = process.env.COCKPIT_DIST ?? "dist";

export default defineConfig({
  testDir: "tests/cockpit",
  outputDir: "dist/.pw-cockpit",
  timeout: 30000,
  reporter: [["list"]],
  webServer: {
    // Run via tsx so the server can import the REAL surface-routing decision
    // (worker/surfaceRegistry.ts) rather than re-implementing it.
    command: `node --import tsx tests/cockpit/serve-cockpit.mjs`,
    env: { COCKPIT_DIST, PORT: String(PORT) },
    port: PORT,
    reuseExistingServer: false,
    timeout: 60000,
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: { executablePath: CHROMIUM },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    {
      name: "desktop-reduced-motion",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 1000 }, reducedMotion: "reduce" },
    },
  ],
});
