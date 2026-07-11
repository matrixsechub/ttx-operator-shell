import type { ActionProposal } from "./types";
import type { CouncilPosition, CouncilReviewV1 } from "./phase2bContracts";
import { resolveProposalActionType } from "./proposalActionDigest";

function position(
  role: string,
  stance: CouncilPosition["stance"],
  summary: string,
  constraints: string[] = [],
  risks: string[] = [],
): CouncilPosition {
  return { role, stance, summary, constraints, risks };
}

function rankFromClass(actionClass: ActionProposal["action_class"]): number {
  return Number(actionClass.slice(1));
}

export function generateCouncilReview(proposal: ActionProposal, partial = false): CouncilReviewV1 {
  const rank = rankFromClass(proposal.action_class);
  const actionType = resolveProposalActionType(proposal);
  const hasRollback = proposal.rollback_plan.trim().length > 0;
  const hasEvidence = proposal.evidence_refs.length > 0;
  const risk = proposal.risk_score.qualitative;

  const proposer = position(
    "Proposer",
    "support",
    `Proposes ${actionType} on ${proposal.target_system}: ${proposal.summary}`,
  );

  const stabilizer = position(
    "Stabilizer",
    rank >= 5 || risk === "critical" ? "caution" : "neutral",
    rank >= 5 ? "Elevated blast radius — verify rollback and monitoring." : "Change appears bounded for current posture.",
    rank >= 3 && !hasRollback ? ["Require rollback plan before approval"] : [],
    rank >= 5 ? ["Operational instability if rollback untested"] : [],
  );

  const revenueValidator = position(
    "RevenueValidator",
    proposal.northstar_impact.revenue_validation === "primary" ? "support" : "neutral",
    proposal.northstar_impact.revenue_validation === "primary"
      ? "Primary revenue-validation axis — confirm customer impact."
      : "No primary revenue axis impact declared.",
  );

  const trustGuardian = position(
    "TrustGuardian",
    rank >= 4 && !hasEvidence ? "oppose" : rank >= 4 ? "caution" : "neutral",
    rank >= 4
      ? hasEvidence
        ? "Trust evidence attached — review references before approval."
        : "Customer-facing class without trust evidence."
      : "Internal-scope change with limited trust surface.",
    rank >= 4 && !hasEvidence ? ["Attach trust-impact evidence"] : [],
    rank >= 4 ? ["Trust regression if payload diverges from summary"] : [],
  );

  const redTeamSkeptic = position(
    "RedTeamSkeptic",
    risk === "critical" || risk === "high" ? "oppose" : "caution",
    `Risk ${risk} (${proposal.risk_score.numeric}/100). Digest binding must match exact payload.`,
    ["Any post-approval mutation invalidates receipt"],
    ["Replay", "Digest tampering", "Beacon drift"],
  );

  const beaconSentinel = position(
    "BeaconSentinel",
    "neutral",
    `Beacon hash ${proposal.beacon_hash.slice(0, 12)}… and codex ${proposal.codex_hash.slice(0, 12)}… must match runtime.`,
    [],
    ["BEACON_DRIFT", "CODEX_DRIFT"],
  );

  const disagreements: string[] = [];
  if (stabilizer.stance === "caution" || stabilizer.stance === "oppose") {
    disagreements.push("Stabilizer requests additional containment controls");
  }
  if (trustGuardian.stance === "oppose") {
    disagreements.push("TrustGuardian opposes without trust evidence");
  }
  if (redTeamSkeptic.stance === "oppose") {
    disagreements.push("RedTeamSkeptic flags elevated exploit surface");
  }

  const consensus: string[] = [
    "Council is advisory only — operator retains sole approval authority",
    "ReceiptAuthority remains sole execution gate",
    `Action class ${proposal.action_class} requires operator-signed receipt for mutation`,
  ];

  let recommendedDecision: CouncilReviewV1["recommendedDecision"] = "approve";
  const recommendedConstraints: string[] = [];
  const unresolvedRisks: string[] = [];

  if (trustGuardian.stance === "oppose" || (rank >= 6 && risk === "critical")) {
    recommendedDecision = "deny";
    unresolvedRisks.push("Trust or critical-risk threshold not satisfied");
  } else if (stabilizer.constraints.length > 0 || trustGuardian.constraints.length > 0) {
    recommendedDecision = "approve_with_constraints";
    recommendedConstraints.push(...stabilizer.constraints, ...trustGuardian.constraints);
  } else if (rank >= 5 && !hasEvidence) {
    recommendedDecision = "request_revision";
    unresolvedRisks.push("Elevated class without complete evidence package");
  }

  if (partial) {
    recommendedDecision = "request_revision";
    unresolvedRisks.push("Council review completed with partial reviewer coverage");
  }

  return {
    proposalId: proposal.proposal_id,
    generatedAt: new Date().toISOString(),
    proposer,
    stabilizer,
    revenueValidator,
    trustGuardian,
    redTeamSkeptic,
    beaconSentinel,
    consensus,
    disagreements,
    recommendedDecision,
    recommendedConstraints,
    unresolvedRisks,
    advisoryOnly: true,
    partial,
  };
}
