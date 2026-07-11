import { request, type ApiResult } from "./apiClient";
import type { UiUxAudit, UiUxAuditRequest, UiUxAuditSummary, UiUxApprovalRecord } from "./uiuxTypes";

type CreateAuditResponse = { ok: true; audit: UiUxAudit; status: string };
type ListAuditsResponse = { ok: true; audits: UiUxAuditSummary[] };
type GetAuditResponse = { ok: true; audit: UiUxAudit };
type ApprovalResponse = { ok: true; audit: UiUxAudit; approval: UiUxApprovalRecord; status: string };

export type ApprovalPayload = {
  findingIds?: string[];
  patchProposalIds?: string[];
  note?: string;
};

export const uiuxExpertService = {
  createAudit: (payload: UiUxAuditRequest): Promise<ApiResult<CreateAuditResponse>> =>
    request<CreateAuditResponse>("/api/operator/uiux/audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  listAudits: (): Promise<ApiResult<ListAuditsResponse>> =>
    request<ListAuditsResponse>("/api/operator/uiux/audits"),

  getAudit: (auditId: string): Promise<ApiResult<GetAuditResponse>> =>
    request<GetAuditResponse>(`/api/operator/uiux/audits/${encodeURIComponent(auditId)}`),

  approveAudit: (auditId: string, payload: ApprovalPayload = {}): Promise<ApiResult<ApprovalResponse>> =>
    request<ApprovalResponse>(`/api/operator/uiux/audits/${encodeURIComponent(auditId)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  rejectAudit: (auditId: string, payload: ApprovalPayload = {}): Promise<ApiResult<ApprovalResponse>> =>
    request<ApprovalResponse>(`/api/operator/uiux/audits/${encodeURIComponent(auditId)}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
