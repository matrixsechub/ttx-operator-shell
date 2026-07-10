import type { BackboneEnv } from "./backboneEnv";
import type { ExtendedTelemetry, TelemetryRollup } from "./do/types";
import { resolveTelemetryEnvironment, type ModeEnv } from "./mode";

const ROLLUP_KEY = "telemetry:rollup";
const LATENCY_KEY = "telemetry:latencies";
const COST_KEY = "telemetry:cost";
const SESSION_EVENTS_KEY = "telemetry:session-events";
const GOVERNANCE_EVENTS_KEY = "telemetry:governance-events";
const FAILURE_LOG_KEY = "health:failures";
const GHOST_FRESHNESS_KEY = "telemetry:ghost-freshness";
const MAX_LATENCY_SAMPLES = 200;
const MAX_SESSION_EVENTS = 100;
const MAX_GOVERNANCE_EVENTS = 50;
const MAX_FAILURE_LOG = 50;

export type FailureSubsystem = "do" | "kv" | "ghost" | "session";

export interface TelemetryEnv {
  TTX_STATE: KVNamespace;
}

export type TelemetryContextEnv = TelemetryEnv & ModeEnv & Partial<Pick<BackboneEnv, "GOVERNANCE">>;

interface LatencySample {
  ms: number;
  ts: string;
  path: string;
  status: number;
  environment: string;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[index]);
}

function defaultRollup(environment: string): TelemetryRollup {
  return {
    costSignalsUsd: 0,
    uptimePct: 100,
    latencyP50Ms: 0,
    latencyP95Ms: 0,
    requestCount: 0,
    sessionEvents: 0,
    errorCount: 0,
    governanceEventCount: 0,
    ghostFreshnessMs: null,
    environment,
    updatedAt: new Date().toISOString(),
  };
}

function summarizeRoutes(samples: LatencySample[]): ExtendedTelemetry["routeLatency"] {
  const byPath = new Map<string, LatencySample[]>();
  for (const sample of samples) {
    const bucket = byPath.get(sample.path) ?? [];
    bucket.push(sample);
    byPath.set(sample.path, bucket);
  }

  return [...byPath.entries()]
    .map(([path, pathSamples]) => {
      const latencies = pathSamples.map((s) => s.ms);
      const errorCount = pathSamples.filter((s) => s.status >= 400).length;
      return {
        path,
        count: pathSamples.length,
        p50Ms: percentile(latencies, 50),
        p95Ms: percentile(latencies, 95),
        errorCount,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

async function appendPermanentGovernanceEvent(
  env: TelemetryContextEnv,
  type: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  if (!env.GOVERNANCE) return;
  try {
    const stub = env.GOVERNANCE.getByName("global");
    await stub.fetch(
      new Request("https://backbone.do/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, actor: "kernel", payload }),
      }),
    );
  } catch {
    await recordSubsystemFailure(env, "do", "governance permanent event write failed");
  }
}

export async function recordSessionEvent(env: TelemetryContextEnv, event: string): Promise<void> {
  const environment = resolveTelemetryEnvironment(env);
  try {
    const raw = await env.TTX_STATE.get(SESSION_EVENTS_KEY);
    const events: { event: string; ts: string; environment: string }[] = raw
      ? (JSON.parse(raw) as { event: string; ts: string; environment: string }[])
      : [];
    events.push({ event, ts: new Date().toISOString(), environment });
    await env.TTX_STATE.put(
      SESSION_EVENTS_KEY,
      JSON.stringify(events.slice(-MAX_SESSION_EVENTS)),
      { expirationTtl: 7 * 24 * 60 * 60 },
    );
  } catch {
    await recordSubsystemFailure(env, "kv", "session event write failed");
  }
}

export async function recordGovernanceEvent(
  env: TelemetryContextEnv,
  type: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const environment = resolveTelemetryEnvironment(env);
  try {
    const raw = await env.TTX_STATE.get(GOVERNANCE_EVENTS_KEY);
    const events: { type: string; ts: string; environment: string }[] = raw
      ? (JSON.parse(raw) as { type: string; ts: string; environment: string }[])
      : [];
    events.push({ type, ts: new Date().toISOString(), environment });
    await env.TTX_STATE.put(
      GOVERNANCE_EVENTS_KEY,
      JSON.stringify(events.slice(-MAX_GOVERNANCE_EVENTS)),
      { expirationTtl: 7 * 24 * 60 * 60 },
    );
  } catch {
    await recordSubsystemFailure(env, "kv", "governance event write failed");
  }

  await appendPermanentGovernanceEvent(env, type, { environment, ...payload });
}

export async function recordGhostFreshness(env: TelemetryEnv, fetchedAt: string): Promise<void> {
  try {
    const freshnessMs = Math.max(0, Date.now() - Date.parse(fetchedAt));
    await env.TTX_STATE.put(GHOST_FRESHNESS_KEY, String(freshnessMs), { expirationTtl: 7 * 24 * 60 * 60 });
  } catch {
    await recordSubsystemFailure(env, "kv", "ghost freshness write failed");
  }
}

export async function recordSubsystemFailure(
  env: TelemetryEnv,
  subsystem: FailureSubsystem,
  detail: string,
): Promise<void> {
  try {
    const raw = await env.TTX_STATE.get(FAILURE_LOG_KEY);
    const failures: { subsystem: FailureSubsystem; detail: string; ts: string }[] = raw
      ? (JSON.parse(raw) as { subsystem: FailureSubsystem; detail: string; ts: string }[])
      : [];
    failures.push({ subsystem, detail: detail.slice(0, 240), ts: new Date().toISOString() });
    await env.TTX_STATE.put(
      FAILURE_LOG_KEY,
      JSON.stringify(failures.slice(-MAX_FAILURE_LOG)),
      { expirationTtl: 7 * 24 * 60 * 60 },
    );
  } catch {
    // Last-resort no-op.
  }
}

export async function getFailureLog(env: TelemetryEnv): Promise<{ subsystem: FailureSubsystem; detail: string; ts: string }[]> {
  try {
    const raw = await env.TTX_STATE.get(FAILURE_LOG_KEY);
    if (raw) return JSON.parse(raw) as { subsystem: FailureSubsystem; detail: string; ts: string }[];
  } catch {
    // Fall through.
  }
  return [];
}

export async function recordTelemetrySample(
  env: TelemetryContextEnv,
  path: string,
  latencyMs: number,
  status: number,
): Promise<void> {
  const environment = resolveTelemetryEnvironment(env);
  try {
    const now = new Date().toISOString();
    const sample: LatencySample = { ms: latencyMs, ts: now, path, status, environment };
    const raw = await env.TTX_STATE.get(LATENCY_KEY);
    const samples: LatencySample[] = raw ? (JSON.parse(raw) as LatencySample[]) : [];
    samples.push(sample);
    const trimmed = samples.slice(-MAX_LATENCY_SAMPLES);

    const latencies = trimmed.map((s) => s.ms);
    const successCount = trimmed.filter((s) => s.status < 500).length;
    const errorCount = trimmed.filter((s) => s.status >= 400).length;

    const costBump = path.startsWith("/api/") ? 0.0002 : 0.00005;
    const priorCost = Number((await env.TTX_STATE.get(COST_KEY)) ?? "0");
    const costSignalsUsd = Math.round((priorCost + costBump) * 10000) / 10000;

    const sessionRaw = await env.TTX_STATE.get(SESSION_EVENTS_KEY);
    const sessionEvents = sessionRaw ? (JSON.parse(sessionRaw) as unknown[]).length : 0;

    const governanceRaw = await env.TTX_STATE.get(GOVERNANCE_EVENTS_KEY);
    const governanceEventCount = governanceRaw ? (JSON.parse(governanceRaw) as unknown[]).length : 0;

    const ghostFreshnessRaw = await env.TTX_STATE.get(GHOST_FRESHNESS_KEY);
    const ghostFreshnessMs = ghostFreshnessRaw ? Number(ghostFreshnessRaw) : null;

    const rollup: TelemetryRollup = {
      costSignalsUsd,
      uptimePct: trimmed.length ? Math.round((successCount / trimmed.length) * 10000) / 100 : 100,
      latencyP50Ms: percentile(latencies, 50),
      latencyP95Ms: percentile(latencies, 95),
      requestCount: trimmed.length,
      sessionEvents,
      errorCount,
      governanceEventCount,
      ghostFreshnessMs: Number.isFinite(ghostFreshnessMs) ? ghostFreshnessMs : null,
      environment,
      updatedAt: now,
    };

    await Promise.all([
      env.TTX_STATE.put(LATENCY_KEY, JSON.stringify(trimmed), { expirationTtl: 7 * 24 * 60 * 60 }),
      env.TTX_STATE.put(COST_KEY, String(costSignalsUsd), { expirationTtl: 7 * 24 * 60 * 60 }),
      env.TTX_STATE.put(ROLLUP_KEY, JSON.stringify(rollup), { expirationTtl: 7 * 24 * 60 * 60 }),
    ]);
  } catch {
    await recordSubsystemFailure(env, "kv", "telemetry sample write failed");
  }
}

export async function getTelemetrySummary(env: TelemetryContextEnv): Promise<TelemetryRollup> {
  const environment = resolveTelemetryEnvironment(env);
  try {
    const raw = await env.TTX_STATE.get(ROLLUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TelemetryRollup;
      return { ...defaultRollup(environment), ...parsed, environment };
    }
  } catch {
    await recordSubsystemFailure(env, "kv", "telemetry rollup read failed");
  }
  return defaultRollup(environment);
}

export async function getExtendedTelemetry(env: TelemetryContextEnv): Promise<ExtendedTelemetry> {
  const summary = await getTelemetrySummary(env);

  let routeLatency: ExtendedTelemetry["routeLatency"] = [];
  let sessionEventLog: ExtendedTelemetry["sessionEventLog"] = [];
  let governanceEvents: ExtendedTelemetry["governanceEvents"] = [];

  try {
    const latencyRaw = await env.TTX_STATE.get(LATENCY_KEY);
    if (latencyRaw) {
      routeLatency = summarizeRoutes(JSON.parse(latencyRaw) as LatencySample[]);
    }
  } catch {
    await recordSubsystemFailure(env, "kv", "route latency read failed");
  }

  try {
    const sessionRaw = await env.TTX_STATE.get(SESSION_EVENTS_KEY);
    if (sessionRaw) {
      sessionEventLog = JSON.parse(sessionRaw) as ExtendedTelemetry["sessionEventLog"];
    }
  } catch {
    // Safe default.
  }

  try {
    const govRaw = await env.TTX_STATE.get(GOVERNANCE_EVENTS_KEY);
    if (govRaw) {
      governanceEvents = JSON.parse(govRaw) as ExtendedTelemetry["governanceEvents"];
    }
  } catch {
    // Safe default.
  }

  return { ...summary, routeLatency, sessionEventLog, governanceEvents };
}

export async function handleTelemetryRoute(
  request: Request,
  pathname: string,
  env: TelemetryContextEnv,
): Promise<Response | null> {
  if (pathname !== "/api/telemetry/summary") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  const summary = await getExtendedTelemetry(env);
  return Response.json({ ok: true, summary, source: "kv" });
}
