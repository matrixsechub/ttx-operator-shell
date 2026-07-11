import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertPendingForbidden,
  classifyWorkerAuthFailure,
  isAccessInterstitial,
  redactValue,
  validateTelemetryEvents,
  workerReached,
} from "../../scripts/lib/stagingGovernanceProofLib.mjs";

describe("Phase 2B staging proof lib", () => {
  it("detects Access interstitial HTML", () => {
    const response = { status: 200, headers: new Map() };
    assert.equal(isAccessInterstitial(response, "<html>Cloudflare Access</html>"), true);
    assert.equal(isAccessInterstitial({ status: 302, headers: new Map() }, ""), true);
  });

  it("classifies worker auth failure", () => {
    assert.equal(classifyWorkerAuthFailure(401, { code: "OPERATOR_AUTH_REQUIRED" }), "WORKER_AUTH_REJECTED");
    assert.equal(workerReached({ status: 200, headers: new Map([["content-type", "application/json"]]) }, "{}"), true);
  });

  it("redacts bearer tokens from artifacts", () => {
    const redacted = redactValue({ token: "Bearer abc.def.ghi" });
    assert.equal(redacted.token, "[REDACTED]");
  });

  it("forbids PENDING proof status", () => {
    assert.equal(assertPendingForbidden("PENDING"), false);
    assert.equal(assertPendingForbidden("PASS"), true);
  });

  it("validates telemetry prefixes", () => {
    const ok = validateTelemetryEvents(
      [{ name: "governance_operator_approved" }, { name: "governance_safe_mode_entered" }],
      ["approved", "safe_mode"],
    );
    assert.equal(ok, true);
  });
});
