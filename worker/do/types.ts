export type GovernanceEventType =
  | "propose"
  | "approve"
  | "reject"
  | "northstar_update"
  | "system";

export interface GovernanceEvent {
  id: string;
  type: GovernanceEventType;
  actor: string;
  ts: string;
  payload: Record<string, unknown>;
}

export interface NorthstarState {
  statement: string;
  version: number;
  updatedAt: string;
}

export interface StrategicAxis {
  id: string;
  name: string;
  weight: number;
  status: "active" | "watch" | "dormant";
}

export interface Mandate {
  id: string;
  title: string;
  status: "proposed" | "approved" | "rejected";
  owner: string;
  axisId?: string;
}

export interface GovernanceState {
  northstar: NorthstarState;
  strategicAxis: StrategicAxis[];
  mandateRegistry: Mandate[];
  eventLog: GovernanceEvent[];
}

export interface OperatorSession {
  sessionId: string;
  operatorId: string;
  handle: string;
  role?: string;
  accessLevel?: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
}

export interface MarketplaceModule {
  id: string;
  name: string;
  tier: "free" | "pro" | "enterprise";
  status: "active" | "deprecated";
}

export interface Entitlement {
  moduleId: string;
  operatorId: string;
  plan: string;
  validUntil: string;
  status: "active" | "expired" | "pending";
}

export interface RouteLatencySummary {
  path: string;
  count: number;
  p50Ms: number;
  p95Ms: number;
  errorCount: number;
}

export interface TelemetryRollup {
  costSignalsUsd: number;
  uptimePct: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  requestCount: number;
  sessionEvents: number;
  errorCount: number;
  governanceEventCount: number;
  ghostFreshnessMs: number | null;
  environment: string;
  updatedAt: string;
}

export interface ExtendedTelemetry extends TelemetryRollup {
  routeLatency: RouteLatencySummary[];
  sessionEventLog: { event: string; ts: string; environment: string }[];
  governanceEvents: { type: string; ts: string; environment: string }[];
}
