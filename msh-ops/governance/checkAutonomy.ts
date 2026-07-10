import type { BeaconAxis } from "../beacon/beaconSchema";
import type { AgentGovernanceContext } from "../agent/initAgentGovernance";
import { BEACON_AXIS_ORDER } from "../beacon/beaconSchema";

export type AutonomyDecision = "allowed" | "denied" | "escalate";
export type AutonomyActionKind = "advisory" | "mutate_state" | "autonomous_execute";

export interface AutonomousActionProposal {
  agentId: string;
  actionKind: AutonomyActionKind;
  description: string;
  axis: BeaconAxis;
  priorityIndex?: number;
  operatorApproval?: boolean;
  operatorApprovalToken?: string;
}

export interface AutonomyCheckResult {
  decision: AutonomyDecision;
  reason: string;
  beaconId: string;
}

function isValidAxis(axis: BeaconAxis): boolean {
  return (BEACON_AXIS_ORDER as readonly string[]).includes(axis);
}

function hasOperatorApproval(proposal: AutonomousActionProposal): boolean {
  return proposal.operatorApproval === true || Boolean(proposal.operatorApprovalToken);
}

export function checkAutonomy(
  proposal: AutonomousActionProposal,
  ctx: AgentGovernanceContext,
): AutonomyCheckResult {
  const beaconId = ctx.beacon.id;

  if (!isValidAxis(proposal.axis)) {
    return {
      decision: "escalate",
      reason: "action not justified against strategic axis",
      beaconId,
    };
  }

  if (proposal.priorityIndex !== undefined) {
    if (
      !Number.isInteger(proposal.priorityIndex) ||
      proposal.priorityIndex < 0 ||
      proposal.priorityIndex >= ctx.beacon.priorities.length
    ) {
      return {
        decision: "escalate",
        reason: "priority index is out of range for beacon priorities",
        beaconId,
      };
    }
  }

  if (ctx.safeMode) {
    if (proposal.actionKind === "advisory") {
      return {
        decision: "allowed",
        reason: "advisory action permitted in beacon safe mode",
        beaconId,
      };
    }
    return {
      decision: "denied",
      reason: "Beacon safe mode — advisory only",
      beaconId,
    };
  }

  switch (proposal.actionKind) {
    case "advisory":
      return {
        decision: "allowed",
        reason: `advisory action aligned to axis ${proposal.axis}`,
        beaconId,
      };
    case "autonomous_execute":
      if (!hasOperatorApproval(proposal)) {
        return {
          decision: "denied",
          reason: "autonomous execution requires explicit operator approval",
          beaconId,
        };
      }
      return {
        decision: "allowed",
        reason: `autonomous execution approved for axis ${proposal.axis}`,
        beaconId,
      };
    case "mutate_state":
      if (!hasOperatorApproval(proposal)) {
        return {
          decision: "escalate",
          reason: "state mutation requires operator approval",
          beaconId,
        };
      }
      return {
        decision: "allowed",
        reason: `state mutation approved for axis ${proposal.axis}`,
        beaconId,
      };
    default: {
      const _exhaustive: never = proposal.actionKind;
      void _exhaustive;
      return {
        decision: "denied",
        reason: "unknown action kind",
        beaconId,
      };
    }
  }
}
