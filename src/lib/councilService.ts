import { request, type ApiResult } from "./apiClient";
import type { CouncilPacketResponse, PrismAdvisoriesResponse } from "./councilTypes";

export const councilService = {
  getPacket: (): Promise<ApiResult<CouncilPacketResponse>> =>
    request<CouncilPacketResponse>("/api/council/packet"),

  getPrismAdvisories: (params?: { auditId?: string; limit?: number }): Promise<ApiResult<PrismAdvisoriesResponse>> => {
    const search = new URLSearchParams();
    if (params?.auditId) search.set("auditId", params.auditId);
    if (params?.limit !== undefined) search.set("limit", String(params.limit));
    const query = search.toString();
    return request<PrismAdvisoriesResponse>(`/api/council/prism-advisories${query ? `?${query}` : ""}`);
  },
};
