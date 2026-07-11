import { getAccessTokenOperator } from "./auth";
import { buildAdaptationFeedback, type AdaptationFeedback } from "./adaptation";
import { buildExperimentationSnapshot, type ExperimentationSnapshot } from "./experimentation";
import { resolveBehaviorDrivenUiMode } from "./experimentationBehavior";
import { analyzeBehaviorIntelligence, type BehaviorIntelligence } from "./behaviorIntelligence";
import {
  generateGovernanceProposals,
  type GovernanceProposal,
} from "./governanceAutomation";
import { stampBuildHeaders, type BuildInfoEnv } from "./buildInfo";
import type { BackboneEnv } from "./backboneEnv";
import type { GovernanceState, OperatorSession } from "./do/types";
import { defaultGovernanceState } from "./governanceDefaults";
import { fetchGhostSignals, type GhostEnv } from "./ghost";
import { resolveSystemMode, type ModeEnv } from "./mode";
import {
  applySignalPolicyOverlay,
  buildPolicyAdjustments,
  evaluateSignalStates,
  policyWasTightened,
  type PolicyMode,
  type SignalFlag,
} from "./policyResponse";
import {
  createOperatorSession,
  getOperatorSession,
  validateOperatorSession,
} from "./sessionBridge";
import {
  getTelemetrySummary,
  getAiUsageRollup,
  recordGovernanceEvent,
  recordSessionEvent,
  recordSubsystemFailure,
  type AiUsageRollup,
  type TelemetryEnv,
} from "./telemetry";
import { getUsageSummary } from "./usage";
import { buildOperatorOsStatusSnapshot, type OperatorOsStatusSnapshot } from "./operatorStatus";
import { buildRuntimeHealth, type RuntimeHealth } from "./runtimeHealth";
const COCKPIT_HTML_PREFIXES = ["/systems", "/ops", "/operator", "/dashboard", "/divisions", "/ttx", "/future", "/status", "/about"] as const;
const COCKPIT_API_PREFIXES = ["/api/ops"] as const;
const WILDCARD_API_PATHS = [/^\/api\/ttx\/local-scenarios\/import$/];

export interface GovernancePolicy {
  marketplaceValidationRequired: boolean;
  wildcardFeaturesEnabled: boolean;
  northstarVersion: number;
  mode: PolicyMode;
}

export interface KernelContext {
  governance: GovernanceState;
  policy: GovernancePolicy;
  signalStates: SignalFlag[];
}

export interface SystemState {
  assembledAt: string;
  systemMode: ReturnType<typeof resolveSystemMode>;
  governance: GovernanceState;
  governanceSource: "durable-object" | "fallback";
  telemetry: Awaited<ReturnType<typeof getTelemetrySummary>>;
  marketplace: {
    modules: unknown[];
    entitlements: unknown[];
  };
  ghost: Awaited<ReturnType<typeof fetchGhostSignals>>;
  session: {
    authenticated: boolean;
    operator: { id: string; handle: string; role?: string; access_level?: string } | null;
    record: OperatorSession | null;
  };
  policy: GovernancePolicy;
  policyBaseline: GovernancePolicy;
  policyAdjustments: string[];
  signalStates: SignalFlag[];
  proposals: GovernanceProposal[];
  governanceIntegrity: {
    locked: boolean;
    proposalsAdvisory: boolean;
    approvalsRequireOperator: boolean;
    eventsLoggedPermanently: boolean;
  };
  usage: Awaited<ReturnType<typeof getUsageSummary>>;
  behaviorIntelligence: BehaviorIntelligence;
  adaptation: AdaptationFeedback;
  experimentation: ExperimentationSnapshot;
  health: {
    overall: "STABLE" | "DEGRADED" | "CRITICAL";
  };
  aiGateway: {
    usageRollup: AiUsageRollup;
    policyMode: PolicyMode;
    gatewayHealth: "ok" | "degraded" | "unavailable";
    recentDenials: number;
  };
  operatorOs: OperatorOsStatusSnapshot;
  runtimeHealth: RuntimeHealth;
}

function doRequest(stub: DurableObjectStub, path: string, init?: RequestInit): Promise<Response> {
  return stub.fetch(new Request(`https://kernel.do${path}`, init));
}

export function isCockpitProtectedPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized.startsWith("/api/")) {
    return COCKPIT_API_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
  }
  return COCKPIT_HTML_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

export function buildGovernancePolicy(state: GovernanceState): GovernancePolicy {
  const marketMandate = state.mandateRegistry.find((m) => m.id === "mandate-marketplace");
  const marketAxis = state.strategicAxis.find((a) => a.id === "axis-market");
  const marketplaceValidationRequired = marketMandate?.status === "approved";
  const wildcardFeaturesEnabled = marketAxis?.status !== "watch" && marketAxis?.status !== "dormant";
  const mode = state.northstar.version >= 2 ? "strict" : "standard";
  return {
    marketplaceValidationRequired,
    wildcardFeaturesEnabled,
    northstarVersion: state.northstar.version,
    mode,
  };
}

export function deriveSystemHealthOverall(input: {
  ghost: { connected: boolean; derived?: boolean };
  governanceSource: "durable-object" | "fallback";
  telemetry: { errorCount?: number };
}): "STABLE" | "DEGRADED" | "CRITICAL" {
  if (!input.ghost.connected) return "CRITICAL";
  const errors = input.telemetry.errorCount ?? 0;
  if (errors > 50) return "CRITICAL";
  if (input.governanceSource === "fallback" || input.ghost.derived || errors > 0) return "DEGRADED";
  return "STABLE";
}

export async function fetchGovernanceState(env: BackboneEnv): Promise<GovernanceState> {
  const response = await doRequest(env.GOVERNANCE.getByName("global"), "/state");
  const body = (await response.json()) as { state?: GovernanceState };
  if (!body.state) throw new Error("governance state unavailable");
  return body.state;
}

export async function fetchGovernanceStateSafe(
  env: BackboneEnv & TelemetryEnv,
): Promise<{ state: GovernanceState; source: "durable-object" | "fallback" }> {
  try {
    return { state: await fetchGovernanceState(env), source: "durable-object" };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await recordSubsystemFailure(env, "do", `governance: ${detail}`);
    return { state: defaultGovernanceState(), source: "fallback" };
  }
}

async function fetchMarketplaceStateSafe(env: BackboneEnv): Promise<SystemState["marketplace"]> {
  try {
    return await fetchMarketplaceState(env);
  } catch {
    return { modules: [], entitlements: [] };
  }
}

async function fetchMarketplaceState(env: BackboneEnv): Promise<SystemState["marketplace"]> {
  const response = await doRequest(env.MARKETPLACE.getByName("global"), "/registry");
  const body = (await response.json()) as { modules?: unknown[]; entitlements?: unknown[] };
  return {
    modules: body.modules ?? [],
    entitlements: body.entitlements ?? [],
  };
}

export async function resolveEffectiveKernelContext(
  env: BackboneEnv & GhostEnv & TelemetryEnv,
): Promise<KernelContext> {
  const governanceResult = await fetchGovernanceStateSafe(env);
  const [telemetry, ghost] = await Promise.all([getTelemetrySummary(env), fetchGhostSignals(env)]);
  const baseline = buildGovernancePolicy(governanceResult.state);
  const signalStates = evaluateSignalStates(ghost, telemetry);
  const policy = applySignalPolicyOverlay(baseline, signalStates);
  return { governance: governanceResult.state, policy, signalStates };
}

/** @deprecated Use resolveEffectiveKernelContext for signal-adjusted policy. */
export async function resolveKernelContext(env: BackboneEnv): Promise<KernelContext> {
  const governance = await fetchGovernanceState(env);
  const policy = buildGovernancePolicy(governance);
  return { governance, policy, signalStates: [] };
}

export async function buildSystemState(
  request: Request,
  env: BackboneEnv & GhostEnv & ModeEnv,
): Promise<SystemState> {
  const governanceResult = await fetchGovernanceStateSafe(env);
  const governance = governanceResult.state;

  const [telemetry, marketplace, ghost, usage, aiUsageRollup, operatorOs] = await Promise.all([
    getTelemetrySummary(env),
    fetchMarketplaceStateSafe(env),
    fetchGhostSignals(env),
    getUsageSummary(env),
    getAiUsageRollup(env),
    buildOperatorOsStatusSnapshot(env),
  ]);

  const runtimeHealth = await buildRuntimeHealth(env, {
    telemetry,
    beaconSafeMode: operatorOs.beacon.safeMode,
    ghostConnected: ghost.connected,
  });

  const policyBaseline = buildGovernancePolicy(governance);
  const signalStates = evaluateSignalStates(ghost, telemetry);
  const policy = applySignalPolicyOverlay(policyBaseline, signalStates);
  const policyAdjustments = buildPolicyAdjustments(policyBaseline, policy, signalStates);

  if (policyWasTightened(policyBaseline, policy)) {
    await recordGovernanceEvent(env, "policy_tightened");
  }

  const assembledAt = new Date().toISOString();
  const behaviorIntelligence = analyzeBehaviorIntelligence(usage);
  const adaptation = await buildAdaptationFeedback(env);
  const experimentation = buildExperimentationSnapshot(
    adaptation,
    resolveBehaviorDrivenUiMode(behaviorIntelligence),
    assembledAt,
  );
  const signalProposals = generateGovernanceProposals({
    assembledAt,
    ghost,
    telemetry,
    signalStates,
    policy,
    policyAdjustments,
  });
  const proposals: GovernanceProposal[] = [
    ...signalProposals,
    ...behaviorIntelligence.governanceProposals.map((proposal) => ({
      id: `gprop-${proposal.id}-${assembledAt}`,
      type: proposal.type,
      reason: proposal.reason,
      priority: proposal.priority,
      advisory: true as const,
    })),
    ...experimentation.governanceProposals,
  ];

  const operator = await getAccessTokenOperator(request, env);
  let sessionRecord: OperatorSession | null = null;

  if (operator) {
    try {
      sessionRecord = await getOperatorSession(env, operator.id);
      if (!sessionRecord) {
        await createOperatorSession(env, operator);
        sessionRecord = await getOperatorSession(env, operator.id);
        await recordSessionEvent(env, "session_create");
      } else {
        const validated = await validateOperatorSession(env, sessionRecord.sessionId);
        if (validated.valid) {
          await recordSessionEvent(env, "session_validate");
          sessionRecord = validated.session ?? sessionRecord;
        } else {
          await recordSessionEvent(env, "session_reject");
          sessionRecord = null;
        }
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await recordSubsystemFailure(env, "session", detail);
      sessionRecord = null;
    }
  }

  return {
    assembledAt,
    systemMode: resolveSystemMode(env),
    governance,
    governanceSource: governanceResult.source,
    telemetry,
    marketplace,
    ghost,
    session: {
      authenticated: Boolean(operator),
      operator: operator ?? null,
      record: sessionRecord,
    },
    policy,
    policyBaseline,
    policyAdjustments,
    signalStates,
    proposals,
    governanceIntegrity: {
      locked: true,
      proposalsAdvisory: true,
      approvalsRequireOperator: true,
      eventsLoggedPermanently: true,
    },
    usage,
    behaviorIntelligence,
    adaptation,
    experimentation,
    health: {
      overall: deriveSystemHealthOverall({
        ghost,
        governanceSource: governanceResult.source,
        telemetry,
      }),
    },
    aiGateway: {
      usageRollup: aiUsageRollup,
      policyMode: policy.mode,
      gatewayHealth:
        aiUsageRollup.requestCount === 0 && aiUsageRollup.denialCount === 0
          ? "ok"
          : aiUsageRollup.denialCount > aiUsageRollup.requestCount
            ? "degraded"
            : "ok",
      recentDenials: aiUsageRollup.denialCount,
    },
    operatorOs,
    runtimeHealth,
  };
}

export async function enforceCockpitSession(
  request: Request,
  env: BackboneEnv & TelemetryEnv,
  pathname: string,
): Promise<Response | null> {
  // Browsers never send an Authorization header on HTML navigation — the
  // access token lives in localStorage, not a cookie. Gating HTML routes
  // here would block the cockpit shell from loading for any direct URL
  // access. Client-side RequireAuth handles the /login redirect instead.
  if (!pathname.startsWith("/api/")) return null;
  if (!isCockpitProtectedPath(pathname)) return null;

  const operator = await getAccessTokenOperator(request, env);
  if (!operator) {
    await recordSessionEvent(env, "session_reject");
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Cockpit session required", code: "SESSION_REQUIRED" }, { status: 401 });
    }
    return Response.redirect(new URL("/login", request.url).toString(), 302);
  }

  let session = await getOperatorSession(env, operator.id);
  if (!session) {
    const created = await createOperatorSession(env, operator);
    if (created) await recordSessionEvent(env, "session_create");
    session = await getOperatorSession(env, operator.id);
  }

  if (!session) {
    await recordSessionEvent(env, "session_reject");
    await recordSubsystemFailure(env, "session", "SessionDO create failed during enforcement");
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Session DO validation failed", code: "SESSION_INVALID" }, { status: 401 });
    }
    return Response.redirect(new URL("/login", request.url).toString(), 302);
  }

  const validated = await validateOperatorSession(env, session.sessionId);
  if (!validated.valid || !session.active || Date.parse(session.expiresAt) <= Date.now()) {
    await recordSessionEvent(env, "session_reject");
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Session DO validation failed", code: "SESSION_INVALID" }, { status: 401 });
    }
    return Response.redirect(new URL("/login", request.url).toString(), 302);
  }

  await recordSessionEvent(env, "session_validate");
  return null;
}

export function enforceGovernancePolicy(
  pathname: string,
  method: string,
  policy: GovernancePolicy,
  env?: TelemetryEnv,
): Response | null {
  if (!policy.wildcardFeaturesEnabled) {
    const blocked = WILDCARD_API_PATHS.some((re) => re.test(pathname));
    if (blocked && method !== "GET") {
      if (env) void recordGovernanceEvent(env, "wildcard_blocked");
      return Response.json(
        { error: "Wildcard feature restricted by governance policy", code: "GOVERNANCE_WILDCARD_BLOCKED" },
        { status: 403 },
      );
    }
  }
  return null;
}

export async function enforceMarketplaceGovernance(
  request: Request,
  pathname: string,
  env: BackboneEnv & TelemetryEnv,
  policy: GovernancePolicy,
): Promise<Response | null> {
  if (!policy.marketplaceValidationRequired) return null;
  if (pathname !== "/api/marketplace/purchase" && !pathname.startsWith("/api/marketplace/purchase/")) {
    return null;
  }

  const operator = await getAccessTokenOperator(request, env);
  if (!operator) {
    return Response.json({ error: "Operator required for marketplace purchase" }, { status: 401 });
  }

  let body: { moduleId?: string };
  try {
    body = (await request.clone().json()) as { moduleId?: string };
  } catch {
    return Response.json({ error: "moduleId required for governed marketplace purchase" }, { status: 400 });
  }

  if (!body.moduleId) {
    return Response.json({ error: "moduleId required" }, { status: 400 });
  }

  const validateResponse = await doRequest(env.MARKETPLACE.getByName("global"), "/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moduleId: body.moduleId, operatorId: operator.id }),
  });
  const result = (await validateResponse.json()) as { valid?: boolean };
  if (!result.valid) {
    await recordGovernanceEvent(env, "marketplace_blocked");
    return Response.json(
      { error: "Marketplace entitlement validation failed", code: "GOVERNANCE_MARKETPLACE_BLOCKED" },
      { status: 403 },
    );
  }

  return null;
}

export async function handleKernelRoute(
  request: Request,
  pathname: string,
  env: BackboneEnv & GhostEnv & ModeEnv & BuildInfoEnv,
): Promise<Response | null> {
  if (pathname === "/api/system/status") {
    return handleSystemStatus(request, env);
  }

  if (pathname !== "/api/system/state") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const state = await buildSystemState(request, env);
  return stampBuildHeaders(Response.json({ ok: true, state }, {
    headers: {
      "Content-Type": "application/json",
      "X-Kernel-State": "coherent",
      "X-Governance-Mode": state.policy.mode,
      "X-System-Mode": state.systemMode,
    },
  }), env);
}

async function handleSystemStatus(
  request: Request,
  env: BackboneEnv & GhostEnv & ModeEnv & BuildInfoEnv,
): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const state = await buildSystemState(request, env);
  const harnessState = state.ghost.connected ? "online" : "degraded";
  const apiAvailable = state.telemetry.requestCount >= 0;

  return stampBuildHeaders(
    Response.json({
      harness: {
        state: harnessState,
        detail: state.ghost.connected ? "Ghost layer connected" : "Ghost layer disconnected",
      },
      api: {
        available: apiAvailable,
        detail: `Kernel assembled at ${state.assembledAt}`,
      },
      systemMode: state.systemMode,
      governanceMode: state.policy.mode,
      lastSuccessfulCall: state.assembledAt,
      errors: state.telemetry.errorCount > 0 ? [`telemetry errors: ${state.telemetry.errorCount}`] : [],
      beacon: state.operatorOs.beacon,
      codex: state.operatorOs.codex,
      queues: state.operatorOs.queues,
      approvals: state.operatorOs.approvals,
    }),
    env,
  );
}