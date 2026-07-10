import { test, expect } from "@playwright/test";
import { captureRoute } from "../../scripts/uiux/captureRoute.ts";
import { resolveApprovedTarget } from "../../scripts/uiux/targetPolicy.ts";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

test("captures one public route from local preview", async ({ page, browserName }) => {
  const captureId = `integration-${Date.now()}`;
  const artifactDir = join(process.cwd(), "artifacts", "uiux", captureId);
  mkdirSync(artifactDir, { recursive: true });

  const target = resolveApprovedTarget("http://127.0.0.1:4175");
  await page.setViewportSize({ width: 390, height: 844 });

  const result = await captureRoute(page, {
    captureId,
    route: "/services",
    target,
    viewport: "mobile",
    viewportEvidence: {
      name: "mobile",
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      colorScheme: "dark",
      reducedMotion: true,
    },
    artifactDir,
    dryRun: false,
    requireAuth: false,
    maskSensitive: false,
  });

  expect("evidenceHash" in result).toBeTruthy();
  if ("evidenceHash" in result) {
    expect(result.route).toBe("/services");
    expect(result.browser).toBe("chromium");
    expect(browserName).toBe("chromium");
    expect(result.screenshot.ref).toContain(captureId);
  }
});
