import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRISM_TRIAGE_ROUTE_CONTRACTS } from "../../../scripts/uiux/staging/types.ts";
import { scanArtifactDirectory } from "../../../scripts/uiux/staging/verify.ts";
import { buildStagingGovernance, assertGovernanceInvariants } from "../../../scripts/uiux/staging/governance.ts";

describe("PRISM staging triage smoke preparation", () => {
  it("defines bounded triage route contracts", () => {
    assert.equal(PRISM_TRIAGE_ROUTE_CONTRACTS.length, 3);
    for (const route of PRISM_TRIAGE_ROUTE_CONTRACTS) {
      assert.match(route.path, /^\/api\/operator\/uiux\//);
    }
  });

  it("keeps staging governance invariants for triage smoke", () => {
    const governance = buildStagingGovernance({
      runId: "triage-smoke-test",
      captureId: "capture-triage-smoke",
      canonicalOrigin: "https://ttx-operator-shell-staging.sogellagepul.workers.dev",
      routeScope: "operator",
      publicRoutes: [],
      authenticatedRoutes: ["/operator/uiux-expert/triage"],
      fixtureDriftStatus: "none",
    });
    assertGovernanceInvariants(governance);
    assert.equal(governance.mutationAuthorized, false);
    assert.equal(governance.advisoryOnly, true);
  });

  it("runs artifact secret scan helper", () => {
    const result = scanArtifactDirectory(".artifacts");
    assert.equal(typeof result.ok, "boolean");
    assert.equal(typeof result.scanned, "number");
  });
});
