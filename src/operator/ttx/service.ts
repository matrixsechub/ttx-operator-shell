import { request, type ApiResult } from "../../lib/apiClient";
import type { TTXInject, TTXOperatorRole, TTXScenario, TTXScenarioStatus, TTXScoreEntry, TTXScoringRubric } from "./types";

// Legacy engine-proxy client for the TTX SaaS scaffold. Prefer
// ttxSessionService / ttxLocalScenarioService / scenarioBridge.ts for Worker-backed flows.

export const ttxService = {
  listScenarios: (): Promise<ApiResult<{ scenarios: TTXScenario[] }>> => request("/api/ttx/scenarios"),

  getScenario: (scenarioId: string): Promise<ApiResult<{ scenario: TTXScenario }>> =>
    request(`/api/ttx/scenarios/${encodeURIComponent(scenarioId)}`),

  createScenario: (payload: Pick<TTXScenario, "title" | "summary" | "division">): Promise<ApiResult<{ scenario: TTXScenario }>> =>
    request("/api/ttx/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  listInjects: (scenarioId: string): Promise<ApiResult<{ injects: TTXInject[] }>> =>
    request(`/api/ttx/scenarios/${encodeURIComponent(scenarioId)}/injects`),

  listRoles: (): Promise<ApiResult<{ roles: TTXOperatorRole[] }>> => request("/api/ttx/roles"),

  getScore: (sessionId: string): Promise<ApiResult<{ entries: TTXScoreEntry[] }>> =>
    request(`/api/ttx/sessions/${encodeURIComponent(sessionId)}/score`),

  getRubric: (scenarioId: string): Promise<ApiResult<{ rubric: TTXScoringRubric }>> =>
    request(`/api/ttx/scenarios/${encodeURIComponent(scenarioId)}/rubric`),

  updateScenarioStatus: (scenarioId: string, status: TTXScenarioStatus): Promise<ApiResult<{ scenario: TTXScenario }>> =>
    request(`/api/ttx/scenarios/${encodeURIComponent(scenarioId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
};
