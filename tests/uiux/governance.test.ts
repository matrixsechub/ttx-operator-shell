import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildGovernanceEnvelope } from "../../scripts/uiux/telemetry.ts";
import { validateManifest, PrismAdapterError } from "../../scripts/uiux/prismAdapter.ts";

describe("PRISM capture governance", () => {
  it("always sets mutationAuthorized to false", () => {
    const envelope = buildGovernanceEnvelope({
      captureId: "cap",
      actorType: "ci",
      targetOriginClass: "local_preview",
      routeScope: "public",
      requestedMode: "ACCESSIBILITY_CHECK",
      approvedRouteCount: 1,
      artifactRetentionClass: "ephemeral_ci",
      authenticationRequired: false,
      productionTargetDenied: true,
      evidenceHash: "hash",
      timestamp: new Date().toISOString(),
    });
    assert.equal(envelope.mutationAuthorized, false);
  });

  it("rejects malformed manifests", () => {
    assert.throws(
      () => validateManifest({ captureId: "", routes: [], idempotencyKey: "" } as never),
      PrismAdapterError,
    );
  });
});
