export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  status?: string;
  price?: string | number;
  /** Distinguishes a physical/digital product listing from a governance/content listing. */
  kind?: "product" | "content";
  service_tier?: string;
  /** Free-form descriptive metadata only — never implies a real certification or audit occurred. */
  compliance_tags?: string[];
  ttx_eligible?: boolean;
  deployment_target?: string;
  /** UI display/filter label only. No auth exists in this app to enforce it as real access control. */
  access_level?: string;
  source?: string;
  lastUpdated?: string;
  /** Descriptive labels only (e.g. "recon", "telemetry") — not executable capabilities, no runtime negotiation. */
  capabilities?: string[];
}

export interface CatalogResponse {
  items: CatalogItem[];
}

export interface SystemStatus {
  harness?: {
    state: string;
    detail?: string;
  };
  api?: {
    available: boolean;
    detail?: string;
  };
  lastSuccessfulCall?: string;
  errors?: string[];
  [key: string]: unknown;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface Operator {
  id: string;
  handle: string;
  /** Descriptive only — no RBAC enforcement in this app. Same display-only philosophy as CatalogItem.access_level. */
  role?: string;
  access_level?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  token: string;
  /** Present from login/refresh; absent from a plain /api/auth/me response reuse of this shape. */
  refreshToken?: string;
  operator?: Operator;
  [key: string]: unknown;
}

/** Worker's own liveness, not the external Engine's — see worker/engine.ts. */
export interface EngineHealth {
  status: string;
  timestamp: string;
  env: string;
}

export interface EngineVersion {
  version: string;
  commitSha?: string;
  buildTimestamp?: string;
  deployEnv?: string;
}

export interface BuildInfo {
  version: string;
  commitSha: string;
  buildTimestamp: string;
  deployEnv: string;
  workerName: string;
}

export interface SystemStateResponse {
  ok: true;
  state: {
    assembledAt: string;
    systemMode: string;
    governanceSource: string;
    governance: {
      northstar: { statement: string; version: number; updatedAt: string };
      strategicAxis: { id: string; name: string; weight: number; status: string }[];
      mandateRegistry: { id: string; title: string; status: string; owner: string }[];
      eventLog: { id: string; type: string; actor: string; ts: string }[];
    };
    policy: {
      marketplaceValidationRequired: boolean;
      wildcardFeaturesEnabled: boolean;
      northstarVersion: number;
      mode: string;
    };
    policyBaseline?: {
      marketplaceValidationRequired: boolean;
      wildcardFeaturesEnabled: boolean;
      northstarVersion: number;
      mode: string;
    };
    policyAdjustments?: string[];
    signalStates?: string[];
    proposals?: {
      id: string;
      type: string;
      reason: string;
      priority: string;
      advisory?: boolean;
    }[];
    governanceIntegrity?: {
      locked: boolean;
      proposalsAdvisory: boolean;
      approvalsRequireOperator: boolean;
      eventsLoggedPermanently: boolean;
    };
    telemetry: {
      environment?: string;
      governanceEventCount?: number;
      errorCount?: number;
      requestCount?: number;
      latencyP50Ms?: number;
      latencyP95Ms?: number;
      sessionEvents?: number;
      [key: string]: unknown;
    };
    ghost: {
      connected?: boolean;
      derived?: boolean;
      authMethod?: string | null;
      depth?: {
        volatility?: number;
        spectralDensity?: number;
        oversoulDepth?: number;
        agentActivationCount?: number;
      };
    };
    session: Record<string, unknown>;
    marketplace: Record<string, unknown>;
    health?: { overall: "STABLE" | "DEGRADED" | "CRITICAL" };
  };
}
