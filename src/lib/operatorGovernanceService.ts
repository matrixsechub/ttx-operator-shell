import { request, type ApiResult } from "./apiClient";
import type { ActionClass, ActionProposal, ProposalStatus } from "./governanceService";

export interface ActionProposalV1View {
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
  status: ProposalStatus | "executing" | "failed" | "rolled_back";
  approvalId?: string;
  denialReason?: string;
  revision: number;
}

export interface CouncilReviewV1View {
  proposalId: string;
  generatedAt: string;
  recommendedDecision: "approve" | "approve_with_constraints" | "deny" | "request_revision";
  recommendedConstraints: string[];
  consensus: string[];
  disagreements: string[];
  unresolvedRisks: string[];
  advisoryOnly: true;
  partial: boolean;
  proposer: { role: string; stance: string; summary: string };
  stabilizer: { role: string; stance: string; summary: string };
  trustGuardian: { role: string; stance: string; summary: string };
  redTeamSkeptic: { role: string; stance: string; summary: string };
}

export interface GovernanceHealthView {
  ok: true;
  correlationId: string;
  beacon: { hash: string; safeMode: boolean; runtimeStatus: string };
  codex: { manifestHash: string };
  governance: {
    status: string;
    pendingApprovals: number;
    expiredApprovals: number;
    receiptAuthorityAvailable: boolean;
  };
  safeMode: {
    active: boolean;
    reason: string;
    activatedBy: string;
    activatedAt: string | null;
  };
  pendingProposals: number;
  expiredProposals: number;
  recentDenialCount: number;
}

export interface ProposalDetailResponse {
  ok: true;
  correlationId: string;
  proposal: ActionProposalV1View;
  councilReview: CouncilReviewV1View | null;
  operatorDecision: Record<string, unknown> | null;
  receipt: Record<string, unknown> | null;
  auditEvents: Array<Record<string, unknown>>;
}

export const operatorGovernanceService = {
  getHealth: (): Promise<ApiResult<GovernanceHealthView>> =>
    request("/api/operator/governance/health"),

  listProposals: (status?: ProposalStatus): Promise<ApiResult<{ ok: true; proposals: ActionProposal[]; correlationId?: string }>> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/api/operator/governance/proposals${query}`);
  },

  getProposal: (proposalId: string): Promise<ApiResult<ProposalDetailResponse>> =>
    request(`/api/operator/governance/proposals/${encodeURIComponent(proposalId)}`),

  createProposal: (
    payload: Record<string, unknown>,
  ): Promise<ApiResult<{ ok: true; proposal: ActionProposal; correlationId?: string }>> =>
    request("/api/operator/governance/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  runCouncilReview: (
    proposalId: string,
    partial = false,
  ): Promise<ApiResult<{ ok: true; review: CouncilReviewV1View; correlationId: string }>> =>
    request(`/api/operator/governance/proposals/${encodeURIComponent(proposalId)}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partial }),
    }),

  approveProposal: (
    proposalId: string,
    body: { rationale?: string; constraints?: string[]; actionType?: string; mutationPayload?: Record<string, unknown> },
  ): Promise<ApiResult<{ ok: true; proposal: ActionProposal; receipt: Record<string, unknown>; correlationId?: string }>> =>
    request(`/api/operator/governance/proposals/${encodeURIComponent(proposalId)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  denyProposal: (
    proposalId: string,
    body: { rationale?: string },
  ): Promise<ApiResult<{ ok: true; proposal: ActionProposal; correlationId?: string }>> =>
    request(`/api/operator/governance/proposals/${encodeURIComponent(proposalId)}/deny`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  requestRevision: (
    proposalId: string,
    rationale: string,
  ): Promise<ApiResult<{ ok: true; proposal: ActionProposal; correlationId?: string }>> =>
    request(`/api/operator/governance/proposals/${encodeURIComponent(proposalId)}/request-revision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rationale }),
    }),

  executeProposal: (
    proposalId: string,
    body: { idempotencyKey?: string; mutationPayload?: Record<string, unknown> },
  ): Promise<ApiResult<{ ok: true; executionReceipt: Record<string, unknown>; correlationId?: string }>> =>
    request(`/api/operator/governance/proposals/${encodeURIComponent(proposalId)}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  rollbackProposal: (
    sourceProposalId: string,
    body: { rollbackProposalId: string; idempotencyKey?: string; mutationPayload?: Record<string, unknown> },
  ): Promise<ApiResult<{ ok: true; executionReceipt: Record<string, unknown>; correlationId?: string }>> =>
    request(`/api/operator/governance/proposals/${encodeURIComponent(sourceProposalId)}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  getAudit: (
    proposalId: string,
  ): Promise<ApiResult<{ ok: true; bundle: Record<string, unknown>; events: Array<Record<string, unknown>>; execution: Record<string, unknown> | null }>> =>
    request(`/api/operator/governance/proposals/${encodeURIComponent(proposalId)}/audit`),

  getSafeMode: (): Promise<ApiResult<{ ok: true; safeMode: GovernanceHealthView["safeMode"] }>> =>
    request("/api/operator/governance/safe-mode"),

  enterSafeMode: (reason: string): Promise<ApiResult<{ ok: true; safeMode: GovernanceHealthView["safeMode"] }>> =>
    request("/api/operator/governance/safe-mode/enter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),

  exitSafeMode: (reason: string): Promise<ApiResult<{ ok: true; safeMode: GovernanceHealthView["safeMode"] }>> =>
    request("/api/operator/governance/safe-mode/exit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),

  listTelemetry: (limit = 50): Promise<ApiResult<{ ok: true; events: Array<Record<string, unknown>> }>> =>
    request(`/api/operator/governance/telemetry?limit=${limit}`),
};
