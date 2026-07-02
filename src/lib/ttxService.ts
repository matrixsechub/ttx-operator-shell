import { request, type ApiResult } from "./apiClient";
import type { TtxPhaseState } from "./ttxTypes";

// Calls /api/ttx/{start,next,reset,state} through the existing Worker
// proxy pattern (worker/ttx.ts), same as webhookTriggerService/
// securityService. Named ttxEngineService, not ttxService — that name is
// already taken by src/operator/ttx/service.ts's separate, richer
// scenario-builder client; this module doesn't touch it.
export const ttxEngineService = {
  startScenario: (): Promise<ApiResult<TtxPhaseState>> => request("/api/ttx/start", { method: "POST" }),
  nextPhase: (): Promise<ApiResult<TtxPhaseState>> => request("/api/ttx/next", { method: "POST" }),
  resetScenario: (): Promise<ApiResult<{ reset: true }>> => request("/api/ttx/reset", { method: "POST" }),
  getState: (): Promise<ApiResult<TtxPhaseState>> => request("/api/ttx/state"),
};
