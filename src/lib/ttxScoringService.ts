import { request, type ApiResult } from "./apiClient";
import type { TtxScorePacket } from "./ttxTypes";

// Calls /api/ttx/sessions/score and /scores (worker/ttxScoring.ts) — same
// service-per-feature pattern as ttxSessionService/ttxAnalyticsService.
// computeScore is a real mutation (computes and stores a packet); getScore
// and listScores are read-only.
export const ttxScoringService = {
  computeScore: (sessionId: string): Promise<ApiResult<TtxScorePacket>> =>
    request("/api/ttx/sessions/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }),

  getScore: (sessionId: string): Promise<ApiResult<TtxScorePacket>> =>
    request(`/api/ttx/sessions/score?sessionId=${encodeURIComponent(sessionId)}`),

  listScores: (): Promise<ApiResult<{ scores: TtxScorePacket[] }>> => request("/api/ttx/sessions/scores"),
};
