import type { BeaconAxis } from "../../msh-ops/beacon/beaconSchema";

export type ActionClass = "C0" | "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
export type ProposalStatus = "draft" | "pending" | "approved" | "denied" | "executed" | "expired";
export type RuntimeEnvironment = "development" | "staging" | "production";
export type ExecutionStatus = "succeeded" | "failed" | "rolled_back" | "audit_incomplete";

export interface NorthstarImpact {
  stability: string;
  revenue_validation: string;
  trust: string;
  controlled_growth: string;
  wildcard_innovation: string;
}

export interface RiskScore {
  numeric: number;
  qualitative: "low" | "medium" | "high" | "critical";
}

export interface ActionProposal {
  proposal_id: string;
  revision: number;
  created_by: string;
  created_at: string;
  target_system: string;
  action_class: ActionClass;
  summary: string;
  intended_outcome: string;
  northstar_impact: NorthstarImpact;
  evidence_refs: string[];
  risk_score: RiskScore;
  rollback_plan: string;
  affected_data: string[];
  affected_users: "internal" | "customer" | "system" | "mixed";
  required_approver: "operator";
  beacon_hash: string;
  codex_hash: string;
  expiration: string;
  status: ProposalStatus;
  action_payload?: Record<string, unknown>;
  approval_id?: string;
  denial_reason?: string;
}

export interface ApprovalReceipt {
  approvalId: string;
  proposalId: string;
  proposalRevision: number;
  actionClass: ActionClass;
  actionDigest: string;
  beaconHash: string;
  codexHash: string;
  targetEnvironment: RuntimeEnvironment;
  approvedBy: string;
  approvedAt: string;
  expiresAt: string;
  nonce: string;
  signature: string;
  consumed?: boolean;
  consumedAt?: string;
}

export interface ExecutionReceipt {
  executionId: string;
  proposalId: string;
  approvalId: string;
  actionDigest: string;
  beaconHash: string;
  codexHash: string;
  environment: RuntimeEnvironment;
  idempotencyKey: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt: string;
  resultDigest?: string;
  errorCode?: string;
  rollbackReference: string;
  auditBundleId: string;
}

export interface AuditEvent {
  event_id: string;
  timestamp: string;
  actor_type: "operator" | "agent" | "system";
  actor_id: string;
  operator_id?: string;
  action_class: ActionClass;
  system_target: string;
  beacon_hash: string;
  codex_hash: string;
  trace_id: string;
  proposal_id?: string;
  approval_id?: string;
  execution_id?: string;
  event_type: string;
  correlation_id?: string;
  reason_code?: string;
  input_refs?: string[];
  output_refs?: string[];
  risk_score: number;
  result: "success" | "failure" | "denied" | "escalated" | "blocked";
  rollback_ref?: string;
  evidence_hash?: string;
  sequence?: number;
}

export interface GovernedMutationInput<TInput> {
  actionType: string;
  actionClass: ActionClass;
  environment: RuntimeEnvironment;
  proposalId: string;
  approvalId: string;
  idempotencyKey: string;
  input: TInput;
  rollbackReference: string;
  execute: () => Promise<unknown>;
}

export interface GovernedMutationResult<TResult> {
  ok: boolean;
  result?: TResult;
  executionReceipt?: ExecutionReceipt;
  error?: string;
  code?: string;
}

export const ACTION_CLASS_REQUIRES_APPROVAL: Record<ActionClass, boolean> = {
  C0: false,
  C1: false,
  C2: true,
  C3: true,
  C4: true,
  C5: true,
  C6: true,
};

export function defaultNorthstarImpact(axis: BeaconAxis = "STABILITY"): NorthstarImpact {
  return {
    stability: axis === "STABILITY" ? "primary" : "neutral",
    revenue_validation: axis === "REVENUE_VALIDATION" ? "primary" : "neutral",
    trust: axis === "TRUST" ? "primary" : "neutral",
    controlled_growth: axis === "CONTROLLED_GROWTH" ? "primary" : "neutral",
    wildcard_innovation: axis === "WILDCARD_INNOVATION" ? "primary" : "neutral",
  };
}

export function requiresFailClosedAudit(actionClass: ActionClass): boolean {
  const rank = Number(actionClass.slice(1));
  return rank >= 2;
}
