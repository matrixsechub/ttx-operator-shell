import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyRouteValidation } from "../../../scripts/uiux/staging/routeContracts.ts";
import { buildRouteTruthRow, isInfrastructureRouteFailure } from "../../../scripts/uiux/staging/routeTruth.ts";
import type { PrismBrowserEvidence } from "../../../scripts/uiux/types.ts";

const sampleEvidence = (overrides: Partial<PrismBrowserEvidence> = {}): PrismBrowserEvidence => ({
  captureId: "cap",
  route: "/services",
  originClass: "staging",
  origin: "https://ttx-operator-shell-staging.sogellagepul.workers.dev",
  viewport: { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, colorScheme: "dark", reducedMotion: true },
  startedAt: "2026-01-01T00:00:00.000Z",
  completedAt: "2026-01-01T00:00:05.000Z",
  durationMs: 5000,
  browser: "chromium",
  pageTitle: "Services",
  finalUrl: "https://ttx-operator-shell-staging.sogellagepul.workers.dev/services",
  redirectChain: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  accessibilityViolations: [],
  landmarks: ["nav"],
  headingOutline: ["h1: Services"],
  interactiveElementCount: 3,
  linkCount: 2,
  focusOrder: ["a:#cta"],
  horizontalOverflow: false,
  hasMainLandmark: true,
  hasLoadingIndicator: false,
  hasEmptyStateText: false,
  screenshot: { ref: "artifacts/uiux/cap/x.png", viewport: "mobile", clipped: true, masked: false },
  interactions: [{ action: "keyboard_tab_traversal", success: true }],
  evidenceHash: "hash",
  status: "complete",
  ...overrides,
});

describe("PRISM route truth matrix", () => {
  it("passes when markers and surface match", () => {
    const row = buildRouteTruthRow(
      { route: "/services", expectedSurface: "storefront", markers: ["Service"] },
      sampleEvidence(),
      "MSH OPS Service catalog",
    );
    assert.equal(row.validationResult, "pass");
    assert.equal(isInfrastructureRouteFailure(row.validationResult), false);
  });

  it("classifies route mismatch as infrastructure failure", () => {
    const result = classifyRouteValidation({
      contract: { route: "/services", expectedSurface: "cockpit", markers: ["Service"] },
      bodyText: "Service page",
      finalUrl: "https://staging/services",
      finalStatus: 200,
      redirectCount: 0,
      renderStatus: "complete",
      loginRedirect: false,
    });
    assert.equal(result, "route_mismatch");
    assert.equal(isInfrastructureRouteFailure(result), true);
  });

  it("detects unauthorized login redirect", () => {
    const result = classifyRouteValidation({
      contract: { route: "/operator/uiux-expert", expectedSurface: "cockpit", markers: ["PRISM"], forbidLoginRedirect: true },
      bodyText: "Operator Login",
      finalUrl: "https://staging/login",
      finalStatus: 200,
      redirectCount: 1,
      renderStatus: "complete",
      loginRedirect: true,
    });
    assert.equal(result, "unauthorized_redirect");
  });
});
