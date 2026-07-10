import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/uiux",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  use: {
    trace: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PRISM_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run preview -- --host 127.0.0.1 --port 4175 --strictPort",
        url: "http://127.0.0.1:4175/services.html",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
