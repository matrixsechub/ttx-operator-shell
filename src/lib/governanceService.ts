import { request, type ApiResult } from "./apiClient";

export type ActionClass = "C0" | "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
export type ProposalStatus =
  | "draft"
  | "pending"
  | "approved"
  | "denied"
  | "executed"
  | "expired"
  | "rolled_back";

export interface ActionProposal {
  proposal_id: string;
  revision?: number;
  created_by: string;
  created_at: string;
  target_system: string;
  action_class: ActionClass;
  summary: string;
  intended_outcome: string;
  northstar_impact: {
    stability: string;
    revenue_validation: string;
    trust: string;
    controlled_growth: string;
    wildcard_innovation: string;
  };
  evidence_refs: string[];
  risk_score: {
    numeric: number;
    qualitative: "low" | "medium" | "high" | "critical";
  };
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
  targetEnvironment: string;
  approvedBy: string;
  approvedAt: string;
  expiresAt: string;
  nonce: string;
  signature: string;
  consumed?: boolean;
  consumedAt?: string;
}

export interface CreateProposalPayload {
  target_system: string;
  action_class: ActionClass;
  summary: string;
  intended_outcome: string;
  rollback_plan: string;
  beacon_hash?: string;
  codex_hash?: string;
  action_payload?: Record<string, unknown>;
  evidence_refs?: string[];
}

export const governanceService = {
  listProposals: (status?: ProposalStatus): Promise<ApiResult<{ ok: true; proposals: ActionProposal[] }>> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/api/governance/proposals${query}`);
  },
  createProposal: (
    payload: CreateProposalPayload,
  ): Promise<ApiResult<{ ok: true; proposal: ActionProposal }>> =>
    request("/api/governance/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  approveProposal: (
    proposalId: string,
    body: { actionType?: string; mutationPayload?: Record<string, unknown> } = {},
  ): Promise<ApiResult<{ ok: true; proposal: ActionProposal; receipt: ApprovalReceipt }>> =>
    request(`/api/governance/proposals/${encodeURIComponent(proposalId)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  denyProposal: (
    proposalId: string,
    reason: string,
  ): Promise<ApiResult<{ ok: true; proposal: ActionProposal }>> =>
    request(`/api/governance/proposals/${encodeURIComponent(proposalId)}/deny`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),
};
