import type { ActionClass, ActionProposal, ApprovalReceipt, ExecutionReceipt } from "./types";
import {
  resolveProposalActionType,
  resolveProposalMutationPayload,
} from "./proposalActionDigest";
import { computeProposalActionDigest } from "./proposalActionDigest";
import type { RuntimeEnvironment } from "./types";

export type ActionProposalStatusV1 =
  | "draft"
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "executing"
  | "executed"
  | "failed"
  | "rolled_back";

export interface ActionProposalV1 {
  proposalId: string;
  version: "v1";
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  targetSystem: string;
  actionClass: ActionClass;
  actionType: string;
  summary: string;
  intendedOutcome: string;
  mutationPayload: Record<string, unknown>;
  actionDigest: string | null;
  northstarImpact: {
    stability: string;
    revenueValidation: string;
    trust: string;
    controlledGrowth: string;
    wildcardInnovation: string;
  };
  evidenceRefs: string[];
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  rollbackPlan: string;
  rollbackVerified: boolean;
  affectedDataClasses: string[];
  affectedUsers: string[];
  requiredApprover: "operator";
  beaconHash: string;
  codexHash: string;
  status: ActionProposalStatusV1;
  approvalId?: string;
  denialReason?: string;
  revision: number;
}

export interface CouncilPosition {
  role: string;
  stance: "support" | "caution" | "oppose" | "neutral";
  summary: string;
  constraints: string[];
  risks: string[];
}

export interface CouncilReviewV1 {
  proposalId: string;
  generatedAt: string;
  proposer: CouncilPosition;
  stabilizer: CouncilPosition;
  revenueValidator: CouncilPosition;
  trustGuardian: CouncilPosition;
  redTeamSkeptic: CouncilPosition;
  beaconSentinel: CouncilPosition;
  consensus: string[];
  disagreements: string[];
  recommendedDecision: "approve" | "approve_with_constraints" | "deny" | "request_revision";
  recommendedConstraints: string[];
  unresolvedRisks: string[];
  advisoryOnly: true;
  partial: boolean;
}

export interface OperatorDecisionV1 {
  proposalId: string;
  decision: "approve" | "deny" | "request_revision";
  operatorId: string;
  decidedAt: string;
  constraints: string[];
  rationale?: string;
  expectedActionDigest: string;
  beaconHash: string;
  codexHash: string;
}

export interface GovernanceTelemetryEventV1 {
  eventId: string;
  eventType: string;
  timestamp: string;
  correlationId: string;
  proposalId?: string;
  approvalId?: string;
  receiptId?: string;
  executionId?: string;
  auditBundleId?: string;
  actionClass?: string;
  targetSystem?: string;
  outcome: "pass" | "deny" | "fail" | "observe";
  beaconHash: string;
  codexHash: string;
  reasonCode?: string;
  durationMs?: number;
}

function mapProposalStatus(status: ActionProposal["status"]): ActionProposalStatusV1 {
  return status as ActionProposalStatusV1;
}

export async function toActionProposalV1(
  proposal: ActionProposal,
  environment: RuntimeEnvironment,
): Promise<ActionProposalV1> {
  const actionType = resolveProposalActionType(proposal);
  const mutationPayload = resolveProposalMutationPayload(proposal);
  let actionDigest: string | null = null;
  if (proposal.status === "approved" || proposal.status === "executed" || proposal.status === "pending") {
    try {
      actionDigest = await computeProposalActionDigest(proposal, environment);
    } catch {
      actionDigest = null;
    }
  }

  return {
    proposalId: proposal.proposal_id,
    version: "v1",
    createdBy: proposal.created_by,
    createdAt: proposal.created_at,
    expiresAt: proposal.expiration,
    targetSystem: proposal.target_system,
    actionClass: proposal.action_class,
    actionType,
    summary: proposal.summary,
    intendedOutcome: proposal.intended_outcome,
    mutationPayload,
    actionDigest,
    northstarImpact: {
      stability: proposal.northstar_impact.stability,
      revenueValidation: proposal.northstar_impact.revenue_validation,
      trust: proposal.northstar_impact.trust,
      controlledGrowth: proposal.northstar_impact.controlled_growth,
      wildcardInnovation: proposal.northstar_impact.wildcard_innovation,
    },
    evidenceRefs: proposal.evidence_refs,
    riskScore: proposal.risk_score.numeric,
    riskLevel: proposal.risk_score.qualitative,
    rollbackPlan: proposal.rollback_plan,
    rollbackVerified: proposal.rollback_plan.trim().length > 0,
    affectedDataClasses: proposal.affected_data,
    affectedUsers:
      proposal.affected_users === "mixed"
        ? ["internal", "customer"]
        : [proposal.affected_users],
    requiredApprover: "operator",
    beaconHash: proposal.beacon_hash,
    codexHash: proposal.codex_hash,
    status: mapProposalStatus(proposal.status),
    approvalId: proposal.approval_id,
    denialReason: proposal.denial_reason,
    revision: proposal.revision,
  };
}

export function toApprovalReceiptView(receipt: ApprovalReceipt): Record<string, unknown> {
  return {
    receiptId: receipt.approvalId,
    approvalId: receipt.approvalId,
    proposalId: receipt.proposalId,
    actionDigest: receipt.actionDigest,
    beaconHash: receipt.beaconHash,
    codexHash: receipt.codexHash,
    approvedBy: receipt.approvedBy,
    approvedAt: receipt.approvedAt,
    expiresAt: receipt.expiresAt,
    consumed: receipt.consumed ?? false,
    consumedAt: receipt.consumedAt,
  };
}

export function toExecutionReceiptView(receipt: ExecutionReceipt): Record<string, unknown> {
  return {
    executionId: receipt.executionId,
    proposalId: receipt.proposalId,
    approvalId: receipt.approvalId,
    actionDigest: receipt.actionDigest,
    auditBundleId: receipt.auditBundleId,
    status: receipt.status,
    startedAt: receipt.startedAt,
    completedAt: receipt.completedAt,
    resultDigest: receipt.resultDigest,
    errorCode: receipt.errorCode,
  };
}
