import { request, type ApiResult } from "./apiClient";
import type { TtxIntelligencePacket } from "./ttxTypes";

// Calls GET /api/ttx/intelligence (worker/ttxIntelligence.ts) — read-only,
// same service-per-feature pattern as ttxHistoryService/ttxScoringService.
export const ttxIntelligenceService = {
  getIntelligence: (): Promise<ApiResult<TtxIntelligencePacket>> => request("/api/ttx/intelligence"),
};
