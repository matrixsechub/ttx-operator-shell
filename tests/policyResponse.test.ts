import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SIGNAL_THRESHOLDS,
  applySignalPolicyOverlay,
  buildPolicyAdjustments,
  evaluateSignalStates,
  policyWasTightened,
} from "../worker/policyResponse.ts";

const baseline = {
  marketplaceValidationRequired: false,
  wildcardFeaturesEnabled: true,
  northstarVersion: 1,
  mode: "standard" as const,
};

describe("evaluateSignalStates", () => {
  it("flags HIGH_RISK when volatility exceeds threshold", () => {
    const flags = evaluateSignalStates(
      { depth: { volatility: 100, spectralDensity: 50, oversoulDepth: 60, agentActivationCount: 1 } },
      { latencyP95Ms: 0, errorCount: 0 },
    );
    assert.ok(flags.includes("HIGH_RISK"));
  });

  it("flags ERROR_STATE when error count exceeds threshold", () => {
    const flags = evaluateSignalStates(
      { depth: { volatility: 0, spectralDensity: 50, oversoulDepth: 60, agentActivationCount: 1 } },
      { latencyP95Ms: 0, errorCount: SIGNAL_THRESHOLDS.errorCountState + 1 },
    );
    assert.ok(flags.includes("ERROR_STATE"));
  });
});

describe("applySignalPolicyOverlay", () => {
  it("tightens to RESTRICTIVE on HIGH_RISK without relaxing baseline mandates", () => {
    const signals = evaluateSignalStates(
      { depth: { volatility: 100, spectralDensity: 50, oversoulDepth: 60, agentActivationCount: 1 } },
      { latencyP95Ms: 5000, errorCount: 20 },
    );
    const effective = applySignalPolicyOverlay(baseline, signals);
    assert.equal(effective.mode, "RESTRICTIVE");
    assert.equal(effective.wildcardFeaturesEnabled, false);
    assert.equal(effective.marketplaceValidationRequired, true);
    assert.ok(policyWasTightened(baseline, effective));
    const adjustments = buildPolicyAdjustments(baseline, effective, signals);
    assert.ok(adjustments.some((a) => a.includes("HIGH_RISK")));
  });

  it("never relaxes a stricter baseline mode", () => {
    const strictBase = { ...baseline, mode: "RESTRICTIVE" as const, wildcardFeaturesEnabled: false };
    const effective = applySignalPolicyOverlay(strictBase, []);
    assert.deepEqual(effective, strictBase);
  });
});
