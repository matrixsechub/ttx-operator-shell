/**
 * RECONSTRUCTED MODULE — the original operatorDashboardService was imported
 * by AgentRegistryPanel / AuditEventStream / BeaconPanel /
 * OrganizerFindingsPanel but never committed to this branch. This minimal
 * reconstruction types the responses from the consumers' usage and targets
 * the worker's real endpoints (worker/operatorAgentsRoutes.ts,
 * worker/governanceRoutes.ts, worker/beaconRoutes.ts). Replace with the
 * original implementation when it is recovered.
 */
import { request } from "./apiClient";

export interface AuditEvent {
  event_id: string;
  timestamp: string | number;
  actor_id: string;
  actor_type: string;
  system_target: string;
  action_class: string;
  result: string;
}

interface AuditEventsResponse {
  events: AuditEvent[];
  total: number;
}

interface AgentSummary {
  agentId: string;
  name: string;
  role: string;
  autonomyLevel: string | number;
  approvalGated: boolean;
  state: string;
  requestCount: number;
}

interface AgentsResponse {
  agents: AgentSummary[];
}

interface BeaconDocument {
  id: string;
  version: number;
  hash: string;
  safe_mode: boolean;
  payload: Record<string, unknown>;
}

interface BeaconV2DraftResponse {
  draft: unknown | null;
}

interface OrganizerIssue {
  ruleId: string;
  relativePath: string;
  severity: string;
  message: string;
}

interface OrganizerReport {
  scannedAt: string | number;
  summary: { errorCount: number; warnCount: number; suggestionCount: number };
  issues: OrganizerIssue[];
}

type OrganizerReportResponse =
  | { available: false; hint: string }
  | { available: true; report: OrganizerReport };

export const operatorDashboardService = {
  listAgents: () => request<AgentsResponse>("/api/operator/agents"),
  listAuditEvents: (limit = 50) =>
    request<AuditEventsResponse>(`/api/governance/audit/events?limit=${limit}`),
  getBeacon: () => request<BeaconDocument>("/api/beacon"),
  getBeaconV2Draft: () => request<BeaconV2DraftResponse>("/api/beacon/v2/draft"),
  getOrganizerReport: () => request<OrganizerReportResponse>("/api/operator/organizer/report"),
};
