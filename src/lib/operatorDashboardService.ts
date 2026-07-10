import { request, type ApiResult } from "./apiClient";
import type { CatalogResponse, SystemStateResponse } from "./types";

export interface AuditEvent {
  event_id: string;
  timestamp: string;
  actor_type: "operator" | "agent" | "system";
  actor_id: string;
  operator_id?: string;
  action_class: string;
  system_target: string;
  beacon_hash: string;
  codex_hash: string;
  trace_id: string;
  proposal_id?: string;
  approval_id?: string;
  risk_score: number;
  result: "success" | "failure" | "denied" | "escalated";
}

export interface AuditEventsResponse {
  ok: true;
  events: AuditEvent[];
  total: number;
  nextCursor: number | null;
}

export interface OperatorAgentRegistryEntry {
  agentId: string;
  name: string;
  role: string;
  autonomyLevel: string;
  implementation: string;
  approvalGated: boolean;
  requestCount: number;
  state: "idle" | "active";
}

export interface OperatorAgentsResponse {
  ok: true;
  agents: OperatorAgentRegistryEntry[];
  aiUsage: {
    requestCount: number;
    denialCount: number;
    updatedAt: string;
  };
}

export interface BeaconApiResponse {
  version: number;
  id: string;
  hash: string;
  safe_mode: boolean;
  payload: Record<string, unknown>;
  draft_v2_available: boolean;
}

export interface OrganizerFinding {
  ruleId: string;
  severity: "error" | "warn" | "info";
  relativePath: string;
  message: string;
  details?: string;
}

export interface OrganizerReportResponse {
  ok: true;
  available: boolean;
  reason?: string;
  hint?: string;
  report?: {
    agentId: string;
    scannedAt: string;
    issues: OrganizerFinding[];
    summary: {
      errorCount: number;
      warnCount: number;
      infoCount: number;
      suggestionCount: number;
      cycleCount: number;
    };
  };
}

export interface MarketplaceEntitlementsResponse {
  entitlements: {
    moduleId: string;
    operatorId: string;
    plan: string;
    validUntil: string;
    status: string;
  }[];
}

export const operatorDashboardService = {
  getBeacon: (): Promise<ApiResult<BeaconApiResponse>> => request("/api/beacon"),

  getBeaconV2Draft: (): Promise<ApiResult<{ version: number; draft: boolean; active: boolean; payload: unknown }>> =>
    request("/api/beacon/v2/draft"),

  listAuditEvents: (limit = 50, cursor?: number): Promise<ApiResult<AuditEventsResponse>> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor !== undefined) params.set("cursor", String(cursor));
    return request(`/api/governance/audit/events?${params.toString()}`);
  },

  listAgents: (): Promise<ApiResult<OperatorAgentsResponse>> => request("/api/operator/agents"),

  getOrganizerReport: (): Promise<ApiResult<OrganizerReportResponse>> =>
    request("/api/operator/organizer/report"),

  getSystemState: (): Promise<ApiResult<SystemStateResponse>> => request("/api/system/state"),

  getCatalog: (): Promise<ApiResult<CatalogResponse>> => request("/api/marketplace/catalog"),

  getEntitlements: (operatorId: string): Promise<ApiResult<MarketplaceEntitlementsResponse>> =>
    request(`/api/marketplace/entitlements?operatorId=${encodeURIComponent(operatorId)}`),

  getTelemetrySummary: (): Promise<
    ApiResult<{
      ok: true;
      summary: {
        requestCount: number;
        errorCount: number;
        latencyP50Ms: number;
        latencyP95Ms: number;
        uptimePct: number;
        governanceEventCount: number;
        routeLatency?: { path: string; count: number; p50Ms: number; p95Ms: number; errorCount: number }[];
      };
      source: string;
    }>
  > => request("/api/telemetry/summary"),
};
