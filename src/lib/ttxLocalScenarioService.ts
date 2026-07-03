import { request, type ApiResult } from "./apiClient";
import type { TtxLocalScenario, TtxScenarioDraft, TtxScenarioExportBlob } from "./ttxTypes";

// Calls /api/ttx/local-scenarios* (worker/localScenarioRoutes.ts) — CRUD
// for operator-authored scenarios. Separate from ttxSessionService (which
// runs sessions against whichever scenario, builtin or authored) and from
// src/operator/ttx/service.ts's ttxService (the SaaS scaffold's client,
// untouched by this phase).
export const ttxLocalScenarioService = {
  list: (): Promise<ApiResult<{ scenarios: TtxLocalScenario[] }>> => request("/api/ttx/local-scenarios"),

  create: (draft: TtxScenarioDraft): Promise<ApiResult<{ scenario: TtxLocalScenario }>> =>
    request("/api/ttx/local-scenarios/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    }),

  update: (scenario: TtxLocalScenario): Promise<ApiResult<{ scenario: TtxLocalScenario }>> =>
    request("/api/ttx/local-scenarios/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scenario),
    }),

  remove: (id: string): Promise<ApiResult<{ deleted: true }>> =>
    request("/api/ttx/local-scenarios/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }),

  // Phase 28
  exportScenario: (id: string): Promise<ApiResult<TtxScenarioExportBlob>> =>
    request(`/api/ttx/local-scenarios/export?id=${encodeURIComponent(id)}`),

  importScenario: (blob: TtxScenarioExportBlob): Promise<ApiResult<{ scenario: TtxLocalScenario }>> =>
    request("/api/ttx/local-scenarios/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blob),
    }),
};
