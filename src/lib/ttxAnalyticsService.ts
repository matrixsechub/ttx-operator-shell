import { request, type ApiResult } from "./apiClient";
import type { TtxAnalyticsPacket } from "./ttxTypes";

// Calls GET /api/ttx/analytics?sessionId=... (worker/ttxAnalytics.ts) —
// read-only, mirrors the existing service patterns. No create/update
// routes here: analytics is written by the session engine itself
// (worker/ttx.ts calling worker/ttxAnalytics.ts directly on the same
// request), never by the frontend.
export const ttxAnalyticsService = {
  getAnalytics: (sessionId: string): Promise<ApiResult<TtxAnalyticsPacket>> =>
    request(`/api/ttx/analytics?sessionId=${encodeURIComponent(sessionId)}`),
};
