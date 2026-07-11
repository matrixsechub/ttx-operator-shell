import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeFixtureDrift } from "../../../scripts/uiux/staging/fixtureDrift.ts";
import { buildStagingGovernance, assertGovernanceInvariants } from "../../../scripts/uiux/staging/governance.ts";
import { assertNoSecretsInArtifact } from "../../../scripts/uiux/redact.ts";
import { isPerformanceProbeEnabled } from "../../../scripts/uiux/staging/performanceProbe.ts";

describe("PRISM staging governance and drift", () => {
  it("always keeps mutationAuthorized false", () => {
    const governance = buildStagingGovernance({
      runId: "run",
      captureId: "cap",
      canonicalOrigin: "https://staging",
      routeScope: "mixed",
      publicRoutes: ["/"],
      authenticatedRoutes: ["/operator/uiux-expert"],
      fixtureDriftStatus: "none",
    });
    assertGovernanceInvariants(governance);
    assert.equal(governance.mutationAuthorized, false);
  });

  it("generates fixture drift report for all fixtures", () => {
    const report = analyzeFixtureDrift("https://staging", []);
    assert.equal(report.rows.length, 8);
    assert.ok(report.recommendedFixtureUpdates.length >= 0);
  });

  it("flags expanded secret categories", () => {
    const violations = assertNoSecretsInArtifact("set-cookie: session=abc");
    assert.ok(violations.length > 0);
  });

  it("keeps performance probe disabled by default", () => {
    const prev = process.env.PRISM_STAGING_PERFORMANCE_PROBE;
    delete process.env.PRISM_STAGING_PERFORMANCE_PROBE;
    assert.equal(isPerformanceProbeEnabled(), false);
    if (prev) process.env.PRISM_STAGING_PERFORMANCE_PROBE = prev;
  });
});
