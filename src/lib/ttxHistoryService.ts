import { request, type ApiResult } from "./apiClient";
import type { TtxHistoryPacket } from "./ttxTypes";

// Calls GET /api/ttx/sessions/history (worker/ttxHistory.ts) — read-only,
// same service-per-feature pattern as ttxScoringService/ttxAnalyticsService.
// For future cockpit panels (timeline/history views) as well as any
// scenario-scoped consumer; TTXScorePanel's sparkline stays on the leaner
// ttxScoringService.listScores() (it only ever needed score + timestamp,
// never scenario names), so nothing here forces an existing UI to switch.
export const ttxHistoryService = {
  getSessionHistory: (): Promise<ApiResult<{ history: TtxHistoryPacket[] }>> => request("/api/ttx/sessions/history"),

  getSessionHistoryByScenario: (scenarioId: string): Promise<ApiResult<{ history: TtxHistoryPacket[] }>> =>
    request(`/api/ttx/sessions/history?scenarioId=${encodeURIComponent(scenarioId)}`),
};
