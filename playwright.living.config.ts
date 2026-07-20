import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the Pearl Living Layer browser proofs. Serves the same
 * built `dist-pearl/` preview (which now contains pearl-living-preview.html)
 * on a distinct port so it never collides with the substrate proof server.
 * Specs live in tests/living. Uses the pre-provisioned Chromium (no download).
 */
const CHROMIUM = process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "tests/living",
  outputDir: "dist-pearl/.pw-living",
  timeout: 30000,
  reporter: [["json", { outputFile: "dist-pearl/pw-living-results.json" }], ["list"]],
  webServer: {
    command: "npx vite preview --config vite.pearl.config.ts --port 8813 --strictPort",
    port: 8813,
    reuseExistingServer: false,
    timeout: 60000,
  },
  use: {
    baseURL: "http://localhost:8813",
    launchOptions: { executablePath: CHROMIUM },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
