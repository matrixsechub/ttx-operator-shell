import { request, type ApiResult } from "./apiClient";
import type { TtxScenarioSummary, TtxSessionState } from "./ttxTypes";

// Calls /api/ttx/sessions/* through the existing Worker proxy pattern
// (worker/ttx.ts), same as webhookTriggerService/securityService. Replaces
// Phase 24's ttxEngineService (single hardcoded linear machine, no
// sessions) — that file is gone, this is its successor. Named
// ttxSessionService, not ttxService — that name is already taken by
// src/operator/ttx/service.ts's separate scenario-builder client.
export const ttxSessionService = {
  listScenarios: (): Promise<ApiResult<{ scenarios: TtxScenarioSummary[] }>> => request("/api/ttx/sessions/scenarios"),

  startSession: (scenarioId: string): Promise<ApiResult<TtxSessionState>> =>
    request("/api/ttx/sessions/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    }),

  nextPhase: (sessionId: string, choice?: string): Promise<ApiResult<TtxSessionState>> =>
    request("/api/ttx/sessions/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, choice }),
    }),

  resetSession: (sessionId: string): Promise<ApiResult<{ reset: true }>> =>
    request("/api/ttx/sessions/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }),

  getState: (sessionId: string): Promise<ApiResult<TtxSessionState>> =>
    request(`/api/ttx/sessions/state?sessionId=${encodeURIComponent(sessionId)}`),
};
