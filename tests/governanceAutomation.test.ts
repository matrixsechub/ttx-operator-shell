import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateGovernanceProposals } from "../worker/governanceAutomation.ts";
import {
  SIGNAL_THRESHOLDS,
  applySignalPolicyOverlay,
  buildPolicyAdjustments,
  evaluateSignalStates,
} from "../worker/policyResponse.ts";

const baseline = {
  marketplaceValidationRequired: false,
  wildcardFeaturesEnabled: true,
  northstarVersion: 1,
  mode: "standard" as const,
};

function stateInput(overrides: {
  volatility?: number;
  oversoulDepth?: number;
  errorCount?: number;
  assembledAt?: string;
}) {
  const assembledAt = overrides.assembledAt ?? "2026-07-10T06:00:00.000Z";
  const ghost = {
    depth: {
      volatility: overrides.volatility ?? 0,
      spectralDensity: 50,
      oversoulDepth: overrides.oversoulDepth ?? 60,
      agentActivationCount: 1,
    },
  };
  const telemetry = { latencyP95Ms: 0, errorCount: overrides.errorCount ?? 0 };
  const signalStates = evaluateSignalStates(ghost, telemetry);
  const policy = applySignalPolicyOverlay(baseline, signalStates);
  const policyAdjustments = buildPolicyAdjustments(baseline, policy, signalStates);

  return {
    assembledAt,
    ghost,
    telemetry,
    signalStates,
    policy,
    policyAdjustments,
  };
}

describe("generateGovernanceProposals", () => {
  it("proposes restrict_wildcard_operations when volatility exceeds threshold", () => {
    const proposals = generateGovernanceProposals(
      stateInput({ volatility: SIGNAL_THRESHOLDS.volatilityHighRisk + 1 }),
    );
    const match = proposals.find((p) => p.type === "restrict_wildcard_operations");
    assert.ok(match);
    assert.equal(match.reason, "HIGH_RISK volatility");
    assert.equal(match.priority, "high");
  });

  it("proposes increase_validation_strictness when error count exceeds threshold", () => {
    const proposals = generateGovernanceProposals(
      stateInput({ errorCount: SIGNAL_THRESHOLDS.errorCountState + 1 }),
    );
    const match = proposals.find((p) => p.type === "increase_validation_strictness");
    assert.ok(match);
    assert.equal(match.priority, "high");
  });

  it("proposes limit_agent_recursion when oversoul depth is low", () => {
    const proposals = generateGovernanceProposals(
      stateInput({ oversoulDepth: SIGNAL_THRESHOLDS.oversoulDepthLow - 1 }),
    );
    const match = proposals.find((p) => p.type === "limit_agent_recursion");
    assert.ok(match);
    assert.equal(match.priority, "medium");
  });

  it("proposes enter_defensive_mode on sustained HIGH_RISK", () => {
    const input = stateInput({ volatility: 100 });
    const proposals = generateGovernanceProposals(input);
    const match = proposals.find((p) => p.type === "enter_defensive_mode");
    assert.ok(match);
    assert.equal(match.reason, "sustained HIGH_RISK");
  });

  it("returns no proposals when signals are within thresholds", () => {
    const proposals = generateGovernanceProposals(stateInput({}));
    assert.equal(proposals.length, 0);
  });
});
