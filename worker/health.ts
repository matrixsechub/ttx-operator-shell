import type { BackboneEnv } from "./backboneEnv";
import { stampBuildHeaders, type BuildInfoEnv } from "./buildInfo";
import { fetchGhostSignals, type GhostEnv } from "./ghost";
import { resolveSystemMode, type ModeEnv } from "./mode";
import { fetchGovernanceStateSafe } from "./kernel";
import {
  getExtendedTelemetry,
  getFailureLog,
  recordSubsystemFailure,
  type TelemetryEnv,
} from "./telemetry";

export type FailureSubsystem = "do" | "kv" | "ghost" | "session";

export { recordSubsystemFailure };

export interface SubsystemStatus {
  status: "ok" | "degraded" | "failed";
  detail: string | null;
  checkedAt: string;
}

export interface SystemHealth {
  assembledAt: string;
  overall: "STABLE" | "DEGRADED" | "CRITICAL";
  subsystems: {
    governance: SubsystemStatus;
    session: SubsystemStatus;
    marketplace: SubsystemStatus;
    ghost: SubsystemStatus;
    kv: SubsystemStatus;
  };
  recentFailures: Awaited<ReturnType<typeof getFailureLog>>;
  telemetry: Awaited<ReturnType<typeof getExtendedTelemetry>>;
}

function doRequest(stub: DurableObjectStub, path: string, init?: RequestInit): Promise<Response> {
  return stub.fetch(new Request(`https://health.do${path}`, init));
}

async function probeMarketplace(env: BackboneEnv & TelemetryEnv): Promise<SubsystemStatus> {
  const checkedAt = new Date().toISOString();
  try {
    const response = await doRequest(env.MARKETPLACE.getByName("global"), "/registry");
    if (!response.ok) {
      await recordSubsystemFailure(env, "do", `marketplace registry ${response.status}`);
      return { status: "degraded", detail: `registry HTTP ${response.status}`, checkedAt };
    }
    return { status: "ok", detail: null, checkedAt };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await recordSubsystemFailure(env, "do", `marketplace: ${detail}`);
    return { status: "failed", detail, checkedAt };
  }
}

async function probeSessionDo(env: BackboneEnv & TelemetryEnv): Promise<SubsystemStatus> {
  const checkedAt = new Date().toISOString();
  try {
    const response = await doRequest(env.SESSION.getByName("operator"), "/stats");
    if (!response.ok) {
      await recordSubsystemFailure(env, "session", `session stats ${response.status}`);
      return { status: "degraded", detail: `stats HTTP ${response.status}`, checkedAt };
    }
    return { status: "ok", detail: null, checkedAt };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await recordSubsystemFailure(env, "session", detail);
    return { status: "failed", detail, checkedAt };
  }
}

function overallFromSubsystems(subsystems: SystemHealth["subsystems"]): SystemHealth["overall"] {
  const statuses = Object.values(subsystems).map((s) => s.status);
  if (statuses.some((s) => s === "failed")) return "CRITICAL";
  if (statuses.some((s) => s === "degraded")) return "DEGRADED";
  return "STABLE";
}

export async function buildSystemHealth(
  env: BackboneEnv & GhostEnv & TelemetryEnv,
): Promise<SystemHealth> {
  const checkedAt = new Date().toISOString();

  const governanceResult = await fetchGovernanceStateSafe(env);
  const governance: SubsystemStatus = {
    status: governanceResult.source === "durable-object" ? "ok" : "degraded",
    detail: governanceResult.source === "fallback" ? "using default northstar" : null,
    checkedAt,
  };
  if (governanceResult.source === "fallback") {
    await recordSubsystemFailure(env, "do", "governance state fallback");
  }

  const [session, marketplace, ghost, telemetry, recentFailures] = await Promise.all([
    probeSessionDo(env),
    probeMarketplace(env),
    fetchGhostSignals(env).then((signals) => {
      const status: SubsystemStatus["status"] = signals.connected
        ? "ok"
        : signals.engineSignals
          ? "degraded"
          : "failed";
      if (!signals.connected) {
        void recordSubsystemFailure(env, "ghost", signals.engineError ?? "engine unreachable");
      }
      return {
        status,
        detail: signals.connected ? null : (signals.engineError ?? "cache fallback"),
        checkedAt,
      } satisfies SubsystemStatus;
    }),
    getExtendedTelemetry(env),
    getFailureLog(env),
  ]);

  let kvStatus: SubsystemStatus = { status: "ok", detail: null, checkedAt };
  try {
    await env.TTX_STATE.get("telemetry:rollup");
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await recordSubsystemFailure(env, "kv", detail);
    kvStatus = { status: "failed", detail, checkedAt };
  }

  const subsystems = {
    governance,
    session,
    marketplace,
    ghost,
    kv: kvStatus,
  };

  return {
    assembledAt: checkedAt,
    overall: overallFromSubsystems(subsystems),
    subsystems,
    recentFailures,
    telemetry,
  };
}

export async function handleHealthRoute(
  request: Request,
  pathname: string,
  env: BackboneEnv & GhostEnv & TelemetryEnv & ModeEnv & BuildInfoEnv,
): Promise<Response | null> {
  if (pathname !== "/api/system/health") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const health = await buildSystemHealth(env);
  return stampBuildHeaders(
    Response.json({
      ok: true,
      systemMode: resolveSystemMode(env),
      health,
    }),
    env,
  );
}
