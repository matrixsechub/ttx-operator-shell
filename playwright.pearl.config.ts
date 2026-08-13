import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Pearl substrate browser proofs. Uses the pre-provisioned
 * Chromium in this environment (no browser download). Serves the built
 * `dist-pearl/` preview statically; specs live in tests/pearl.
 */
const CHROMIUM = process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "tests/pearl",
  outputDir: "dist-pearl/.pw",
  timeout: 30000,
  reporter: [["json", { outputFile: "dist-pearl/pw-results.json" }], ["list"]],
  webServer: {
    command: "npx vite preview --config vite.pearl.config.ts --port 8812 --strictPort",
    port: 8812,
    reuseExistingServer: false,
    timeout: 60000,
  },
  use: {
    baseURL: "http://localhost:8812",
    launchOptions: { executablePath: CHROMIUM },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
