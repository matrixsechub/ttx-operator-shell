import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeRuntimeHealth } from "../worker/runtimeHealth.ts";

describe("runtime health", () => {
  it("returns HALTED when beacon safe mode is active", () => {
    const health = computeRuntimeHealth({
      telemetry: { requestCount: 100, errorCount: 0, latencyP95Ms: 100 },
      beaconSafeMode: true,
      activationSafeMode: false,
      ghostConnected: true,
    });
    assert.equal(health.state, "HALTED");
    assert.equal(health.score, 0);
  });

  it("returns HEALTHY for clean telemetry", () => {
    const health = computeRuntimeHealth({
      telemetry: { requestCount: 100, errorCount: 0, latencyP95Ms: 100 },
      beaconSafeMode: false,
      activationSafeMode: false,
      ghostConnected: true,
    });
    assert.equal(health.state, "HEALTHY");
    assert.ok(health.score >= 90);
  });
});
