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

export interface BehaviorIntelligenceSnapshot {
  metrics: {
    entryRate: number;
    marketplaceRate: number;
    dropOffRate: number;
  };
  behaviorClass: string | null;
  systemState: "LEARNING_ACTIVE" | "SIGNAL_WEAK" | "NOISE" | "SIGNAL_INVALID";
}

export interface BehaviorIntelligenceResponse {
  ok: boolean;
  intelligence: BehaviorIntelligenceSnapshot;
  report?: string;
}

export type ExperimentUiMode = "CONFUSION" | "FRICTION" | "ENGAGED" | "DEFAULT";

export interface ExperimentationSnapshot {
  modeDistribution: Record<ExperimentUiMode, number>;
  performanceByMode: Record<
    ExperimentUiMode,
    {
      views: number;
      entryRate: number;
      marketplaceRate: number;
      dropOffRate: number;
    }
  >;
  winningMode: "CONFUSION" | "FRICTION" | "ENGAGED" | null;
  worstMode: "CONFUSION" | "FRICTION" | "ENGAGED" | null;
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  systemState: "EXPERIMENTING" | "OPTIMIZING";
  behaviorMode: ExperimentUiMode;
}

export interface ExperimentationAssignmentResponse {
  ok: boolean;
  assignedMode: ExperimentUiMode;
  behaviorMode: ExperimentUiMode;
  source: "behavior" | "explore" | "biased";
  experimentation: ExperimentationSnapshot;
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
    usage?: {
      visits: number;
      entryClicks: number;
      marketplaceClicks: number;
      environment?: string;
      updatedAt?: string;
      signalIntegrity?: "VALID" | "INVALID_RATIOS";
    };
    behaviorIntelligence?: BehaviorIntelligenceSnapshot & {
      governanceProposals: {
        id: string;
        type: string;
        reason: string;
        priority: string;
        advisory?: boolean;
        source?: string;
      }[];
    };
    adaptation?: {
      modes: {
        CONFUSION: {
          views: number;
          entryRate: number;
          marketplaceRate: number;
          dropOffRate: number;
        };
        FRICTION: {
          views: number;
          entryRate: number;
          marketplaceRate: number;
          dropOffRate: number;
        };
        ENGAGED: {
          views: number;
          entryRate: number;
          marketplaceRate: number;
          dropOffRate: number;
          conversionSignal: number;
        };
        DEFAULT: {
          views: number;
          entryRate: number;
          marketplaceRate: number;
          dropOffRate: number;
        };
      };
      updatedAt: string;
    };
    experimentation?: ExperimentationSnapshot;
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
    aiGateway?: {
      usageRollup: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        costEstimateUsd: number;
        requestCount: number;
        denialCount: number;
        byAgent: Record<string, number>;
        byProfile: Record<string, number>;
      };
      policyMode: string;
      gatewayHealth: "ok" | "degraded" | "unavailable";
      recentDenials: number;
    };
    operatorOs?: {
      beacon: {
        id: string;
        version: number;
        hash: string;
        safeMode: boolean;
        runtimeStatus?: "verified_v2" | "legacy_v1" | "invalid";
        v2?: {
          verified: boolean;
          version: string | null;
          beaconHash: string | null;
          publishedAt: string | null;
          reason: string;
        };
      };
      codex: {
        manifestHash: string;
        manifestVersion?: string;
        lastValidatedAt: string | null;
        driftCount: number;
      };
      queues: {
        activation: {
          date: string;
          pending: number;
          total: number;
          maxPerDay: number;
        };
        registration: {
          length: number;
        };
      };
      approvals: {
        pending: number;
        expired: number;
      };
      governance?: {
        status?: "healthy" | "degraded" | "blocked";
        beaconVerified: boolean;
        beaconStatus?: "verified_v2" | "legacy_v1" | "invalid";
        codexValid?: boolean;
        receiptAuthorityAvailable?: boolean;
        proposalStoreAvailable?: boolean;
        allowedActionClasses?: string[];
        reasonCodes?: string[];
        pendingApprovals: number;
        expiredApprovals: number;
        auditIncompleteExecutions: number;
        mcpDeltasAwaitingReview: number;
        legacyBypassBlocked: boolean;
      };
    };
    runtimeHealth?: {
      score: number;
      state: "HEALTHY" | "WATCH" | "DEGRADED" | "CRITICAL" | "HALTED";
      factors: {
        workerSuccess: number;
        latencyP95: number;
        errorRate: number;
        safeModeActive: boolean;
      };
      activationSafeMode: {
        active: boolean;
        blockers: string[];
      };
    };
  };
}

export interface AiUsageResponse {
  ok: true;
  rollup: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costEstimateUsd: number;
    requestCount: number;
    denialCount: number;
    byAgent: Record<string, number>;
    byProfile: Record<string, number>;
    updatedAt: string;
    environment: string;
  };
}
