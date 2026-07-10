import { request, type ApiResult } from "./apiClient";
import type {
  PrismPatchProposal,
  PrismPatchProposalSummary,
  PrismTriageDispositionStatus,
  PrismTriageItem,
  PrismTriageItemSummary,
} from "./prismTriageTypes";

type ListTriageResponse = {
  ok: true;
  advisoryOnly: true;
  mutationAuthorized: false;
  items: PrismTriageItemSummary[];
};

type GenerateTriageResponse = {
  ok: true;
  advisoryOnly: true;
  mutationAuthorized: false;
  auditId: string;
  sourceAuditUnchanged: true;
  created: number;
  updated: number;
  items: PrismTriageItem[];
  durationMs: number;
};

type GetTriageResponse = {
  ok: true;
  advisoryOnly: true;
  mutationAuthorized: false;
  item: PrismTriageItem;
  proposals: PrismPatchProposal[];
};

type DispositionResponse = {
  ok: true;
  advisoryOnly: true;
  mutationAuthorized: false;
  item: PrismTriageItem;
  disposition: { status: PrismTriageDispositionStatus; reason: string };
};

type GenerateProposalResponse = {
  ok: true;
  advisoryOnly: true;
  mutationAuthorized: false;
  sourceAuditUnchanged: true;
  proposal: PrismPatchProposal;
  item: PrismTriageItem;
};

type ListProposalsResponse = {
  ok: true;
  advisoryOnly: true;
  mutationAuthorized: false;
  proposals: PrismPatchProposalSummary[];
};

type GetProposalResponse = {
  ok: true;
  advisoryOnly: true;
  mutationAuthorized: false;
  proposal: PrismPatchProposal;
};

export const prismTriageService = {
  listTriage: (): Promise<ApiResult<ListTriageResponse>> =>
    request<ListTriageResponse>("/api/operator/uiux/triage"),

  generateTriage: (auditId: string): Promise<ApiResult<GenerateTriageResponse>> =>
    request<GenerateTriageResponse>("/api/operator/uiux/triage/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auditId }),
    }),

  getTriage: (triageId: string): Promise<ApiResult<GetTriageResponse>> =>
    request<GetTriageResponse>(`/api/operator/uiux/triage/${encodeURIComponent(triageId)}`),

  recordDisposition: (
    triageId: string,
    payload: { status: PrismTriageDispositionStatus; reason: string },
  ): Promise<ApiResult<DispositionResponse>> =>
    request<DispositionResponse>(`/api/operator/uiux/triage/${encodeURIComponent(triageId)}/disposition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  generateProposal: (triageId: string): Promise<ApiResult<GenerateProposalResponse>> =>
    request<GenerateProposalResponse>(`/api/operator/uiux/triage/${encodeURIComponent(triageId)}/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),

  listProposals: (): Promise<ApiResult<ListProposalsResponse>> =>
    request<ListProposalsResponse>("/api/operator/uiux/proposals"),

  getProposal: (proposalId: string): Promise<ApiResult<GetProposalResponse>> =>
    request<GetProposalResponse>(`/api/operator/uiux/proposals/${encodeURIComponent(proposalId)}`),
};

export function exportProposalText(proposal: PrismPatchProposal): string {
  const lines = [
    "PRISM PATCH PROPOSAL (ADVISORY ONLY — NO MUTATION AUTHORITY)",
    `Proposal ID: ${proposal.proposalId}`,
    `Triage ID: ${proposal.triageId}`,
    `Revision: ${proposal.governance.revision}`,
    "",
    proposal.objective,
    "",
    "IMPLEMENTATION PLAN",
    ...proposal.implementationPlan.map((s) => `${s.order}. ${s.description}`),
    "",
    "TEST PLAN",
    ...proposal.testPlan.map((t) => `- [${t.testType}] ${t.description}`),
    "",
    "ACCEPTANCE CRITERIA",
    ...proposal.acceptanceCriteria.map((c) => `- ${c}`),
  ];
  return lines.join("\n");
}
