import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateAdvisorySummary, evaluateInfrastructureFailures } from "../../../scripts/uiux/staging/thresholds.ts";
import type { PrismStagingPreflight, PrismRouteTruthMatrix } from "../../../scripts/uiux/staging/types.ts";
import type { PrismBrowserEvidence } from "../../../scripts/uiux/types.ts";

const baseEvidence = (): PrismBrowserEvidence => ({
  captureId: "c",
  route: "/enter",
  originClass: "staging",
  origin: "https://staging",
  viewport: { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, colorScheme: "dark", reducedMotion: true },
  startedAt: "",
  completedAt: "",
  durationMs: 1,
  browser: "chromium",
  pageTitle: "Enter",
  finalUrl: "https://staging/enter",
  redirectChain: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  accessibilityViolations: [],
  landmarks: [],
  headingOutline: [],
  interactiveElementCount: 0,
  linkCount: 0,
  focusOrder: [],
  horizontalOverflow: false,
  hasMainLandmark: false,
  hasLoadingIndicator: false,
  hasEmptyStateText: false,
  screenshot: { ref: "x", viewport: "mobile", clipped: true, masked: false },
  interactions: [{ action: "keyboard_tab_traversal", success: true }],
  evidenceHash: "h",
  status: "complete",
});

describe("PRISM staging thresholds", () => {
  it("does not treat advisory breaches as infrastructure failures", () => {
    const evidence = [
      {
        ...baseEvidence(),
        accessibilityViolations: [
          { id: "c", impact: "critical" as const, ruleId: "c", description: "", help: "", nodes: 1 },
        ],
      },
    ];
    const advisory = evaluateAdvisorySummary(evidence);
    assert.ok(advisory.thresholdBreaches.length > 0);
    assert.equal(advisory.infrastructureFailures.length, 0);
  });

  it("fails infrastructure on route mismatch and secret scan", () => {
    const preflight = { passed: true, failures: [] } as PrismStagingPreflight;
    const routeTruth = {
      passed: false,
      rows: [{ route: "/", validationResult: "route_mismatch" as const }],
    } as PrismRouteTruthMatrix;
    const failures = evaluateInfrastructureFailures({
      preflight,
      routeTruth,
      secretScanPassed: false,
      mutationAuthorized: false,
    });
    assert.ok(failures.some((f) => f.includes("route /")));
    assert.ok(failures.some((f) => f.includes("secret scan")));
  });

  it("fails when mutationAuthorized becomes true", () => {
    const failures = evaluateInfrastructureFailures({
      preflight: { passed: true, failures: [] } as PrismStagingPreflight,
      routeTruth: { passed: true, rows: [] } as PrismRouteTruthMatrix,
      secretScanPassed: true,
      mutationAuthorized: true,
    });
    assert.ok(failures.some((f) => f.includes("mutationAuthorized")));
  });
});
