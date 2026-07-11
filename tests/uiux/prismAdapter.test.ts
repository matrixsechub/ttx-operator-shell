import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evidenceHash, idempotencyKey } from "../../scripts/uiux/hash.ts";
import { manifestToAuditRequest, validateManifest } from "../../scripts/uiux/prismAdapter.ts";
import type { PrismCaptureManifest } from "../../scripts/uiux/types.ts";

const sampleManifest: PrismCaptureManifest = {
  captureId: "cap-1",
  origin: "http://127.0.0.1:4173",
  originClass: "local_preview",
  actorType: "local",
  startedAt: "2026-01-01T00:00:00.000Z",
  completedAt: "2026-01-01T00:00:05.000Z",
  routes: ["/services"],
  viewports: ["mobile"],
  browser: "chromium",
  dryRun: true,
  authenticationRequired: false,
  governance: {
    captureId: "cap-1",
    actorType: "local",
    targetOriginClass: "local_preview",
    routeScope: "public",
    requestedMode: "ACCESSIBILITY_CHECK",
    approvedRouteCount: 1,
    artifactRetentionClass: "local_dev",
    authenticationRequired: false,
    productionTargetDenied: true,
    mutationAuthorized: false,
    evidenceHash: "abc",
    timestamp: "2026-01-01T00:00:05.000Z",
  },
  evidence: [
    {
      captureId: "cap-1",
      route: "/services",
      originClass: "local_preview",
      origin: "http://127.0.0.1:4173",
      viewport: { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, colorScheme: "dark", reducedMotion: true },
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:00:04.000Z",
      durationMs: 4000,
      browser: "chromium",
      pageTitle: "Services",
      finalUrl: "http://127.0.0.1:4173/services.html",
      redirectChain: [],
      consoleErrors: [{ type: "error", message: "boom" }],
      pageErrors: [],
      failedRequests: [{ url: "/api/x", method: "GET", failureText: "failed" }],
      accessibilityViolations: [{ id: "color-contrast", impact: "serious", ruleId: "color-contrast", description: "x", help: "y", nodes: 1 }],
      landmarks: ["nav"],
      headingOutline: ["h1: Services"],
      interactiveElementCount: 4,
      linkCount: 3,
      focusOrder: ["a:#cta"],
      horizontalOverflow: true,
      hasMainLandmark: false,
      hasLoadingIndicator: false,
      hasEmptyStateText: false,
      screenshot: { ref: "artifacts/uiux/cap-1/screenshots/x-mobile.png", viewport: "mobile", clipped: true, masked: false },
      interactions: [{ action: "keyboard_tab_traversal", success: true, durationMs: 100 }],
      evidenceHash: "hash-1",
      status: "complete",
    },
  ],
  failures: [],
  idempotencyKey: "idem-1",
  evidenceHash: "manifest-hash",
  status: "complete",
};

describe("PRISM adapter", () => {
  it("maps capture manifest into UiUxAuditRequest", () => {
    validateManifest(sampleManifest);
    const request = manifestToAuditRequest(sampleManifest, "ACCESSIBILITY_CHECK");
    assert.equal(request.useLiveEvidence, true);
    assert.equal(request.useFixture, false);
    assert.equal(request.routeMetadata?.[0]?.horizontalScrollRequired, true);
    assert.equal(request.routeMetadata?.[0]?.accessibilityViolationCount, 1);
    assert.equal(request.interactionResults?.length, 1);
    assert.equal(request.screenshotRefs?.length, 1);
  });

  it("produces stable idempotency keys", () => {
    const a = idempotencyKey({
      origin: "http://127.0.0.1:4173",
      routes: ["/"],
      viewports: ["mobile"],
      mode: "AUDIT_ROUTE",
      evidenceHash: evidenceHash({ sample: 1 }),
    });
    const b = idempotencyKey({
      origin: "http://127.0.0.1:4173",
      routes: ["/"],
      viewports: ["mobile"],
      mode: "AUDIT_ROUTE",
      evidenceHash: evidenceHash({ sample: 1 }),
    });
    assert.equal(a, b);
  });

  it("always keeps governance mutationAuthorized false", () => {
    assert.equal(sampleManifest.governance.mutationAuthorized, false);
  });
});
