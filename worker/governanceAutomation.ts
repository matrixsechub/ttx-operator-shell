import { SIGNAL_THRESHOLDS, type PolicyMode, type SignalFlag } from "./policyResponse";
import { getAgentGovernanceContext } from "../msh-ops/agent/initAgentGovernance";

export type GovernanceProposalType =
  | "restrict_wildcard_operations"
  | "increase_validation_strictness"
  | "limit_agent_recursion"
  | "enter_defensive_mode"
  | "improve_entry_clarity"
  | "optimize_marketplace_conversion"
  | "increase_capture_points"
  | `promote_ui_mode::${string}`
  | `deprecate_ui_mode::${string}`;

export type GovernanceProposalPriority = "low" | "medium" | "high";

export interface GovernanceProposal {
  id: string;
  type: GovernanceProposalType;
  reason: string;
  priority: GovernanceProposalPriority;
  advisory: true;
}

export interface GovernanceProposalStateInput {
  assembledAt: string;
  ghost: { depth: { volatility: number; oversoulDepth: number } };
  telemetry: { errorCount: number };
  signalStates: SignalFlag[];
  policy: { mode: PolicyMode };
  policyAdjustments: string[];
}

function proposalId(type: GovernanceProposalType, assembledAt: string): string {
  return `gprop-${type}-${assembledAt}`;
}

function isSustainedHighRisk(state: GovernanceProposalStateInput): boolean {
  return (
    state.signalStates.includes("HIGH_RISK") &&
    state.policy.mode === "RESTRICTIVE" &&
    state.policyAdjustments.some((adjustment) => adjustment.includes("HIGH_RISK"))
  );
}

function beaconPriorityPrefix(priorityIndex: number): string {
  const ctx = getAgentGovernanceContext();
  const priority = ctx.beacon.priorities[priorityIndex];
  return priority ? `[Northstar P${priorityIndex + 1}: ${priority}] ` : "";
}

export function generateGovernanceProposals(state: GovernanceProposalStateInput): GovernanceProposal[] {
  const proposals: GovernanceProposal[] = [];
  const { volatility, oversoulDepth } = state.ghost.depth;
  const { errorCount } = state.telemetry;

  if (volatility > SIGNAL_THRESHOLDS.volatilityHighRisk) {
    proposals.push({
      id: proposalId("restrict_wildcard_operations", state.assembledAt),
      type: "restrict_wildcard_operations",
      reason: `${beaconPriorityPrefix(5)}HIGH_RISK volatility`,
      priority: "high",
      advisory: true,
    });
  }

  if (errorCount > SIGNAL_THRESHOLDS.errorCountState) {
    proposals.push({
      id: proposalId("increase_validation_strictness", state.assembledAt),
      type: "increase_validation_strictness",
      reason: `${beaconPriorityPrefix(0)}ERROR_STATE errorCount`,
      priority: "high",
      advisory: true,
    });
  }

  if (oversoulDepth < SIGNAL_THRESHOLDS.oversoulDepthLow) {
    proposals.push({
      id: proposalId("limit_agent_recursion", state.assembledAt),
      type: "limit_agent_recursion",
      reason: `${beaconPriorityPrefix(5)}LOW_INTELLIGENCE oversoulDepth`,
      priority: "medium",
      advisory: true,
    });
  }

  if (isSustainedHighRisk(state)) {
    proposals.push({
      id: proposalId("enter_defensive_mode", state.assembledAt),
      type: "enter_defensive_mode",
      reason: "sustained HIGH_RISK",
      priority: "high",
      advisory: true,
    });
  }

  return proposals;
}
