import {
  getTelemetrySummary,
  recordGhostFreshness,
  recordSubsystemFailure,
  type TelemetryEnv,
} from "./telemetry";
import type { TelemetryRollup } from "./do/types";
import { signToken } from "./edge/crypto";
import type { EdgeSecretsEnv } from "./env";
import type { AiGatewayEnv } from "./aiGateway";
import type { BackboneEnv } from "./backboneEnv";
import { summarizeGhostSignals } from "./ghostAiSummary";

export interface GhostEnv extends TelemetryEnv, EdgeSecretsEnv, Partial<Omit<AiGatewayEnv, keyof TelemetryEnv>> {
  ENGINE_API_URL?: string;
  HARNESS?: Fetcher;
}

const GHOST_CACHE_KEY = "ghost:telemetry:cache";
const GHOST_META_KEY = "ghost:signals:meta";

const GHOST_KV_KEYS = {
  volatility: "ghost:volatility",
  spectralDensity: "ghost:spectralDensity",
  oversoulDepth: "ghost:oversoulDepth",
  agentActivationCount: "ghost:agentActivationCount",
} as const;

export interface GhostDepthSignals {
  volatility: number;
  spectralDensity: number;
  oversoulDepth: number;
  agentActivationCount: number;
}

interface GhostKvSignal {
  value: number;
  updatedAt: string;
  derived: boolean;
}

export interface GhostSignals {
  connected: boolean;
  derived: boolean;
  bridge: string;
  engine: string | null;
  engineError: string | null;
  local: Awaited<ReturnType<typeof getTelemetrySummary>>;
  engineSignals: Record<string, unknown> | null;
  depth: GhostDepthSignals;
  signalFreshnessMs: number;
  fetchedAt: string;
  adaptedAt: string;
  authMethod: string | null;
}

function engineBase(env: GhostEnv): string {
  return (env.ENGINE_API_URL ?? "").replace(/\/$/, "");
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function deriveGhostDepthFromTelemetry(telemetry: TelemetryRollup): GhostDepthSignals {
  const requestCount = Math.max(telemetry.requestCount, 1);
  const errorRate = telemetry.errorCount / requestCount;
  const latencySpread = Math.max(0, telemetry.latencyP95Ms - telemetry.latencyP50Ms);

  return {
    volatility: clamp(Math.round(latencySpread / 8 + errorRate * 120), 1, 100),
    spectralDensity: clamp(Math.round(errorRate * 800 + telemetry.sessionEvents * 2 + requestCount / 5), 1, 100),
    oversoulDepth: clamp(
      Math.round(telemetry.uptimePct * 0.55 + telemetry.governanceEventCount * 8 + telemetry.latencyP50Ms / 20),
      1,
      100,
    ),
    agentActivationCount: clamp(
      Math.max(1, telemetry.sessionEvents + Math.floor(requestCount / 8) + telemetry.governanceEventCount),
      1,
      9999,
    ),
  };
}

function extractEngineDepth(payload: Record<string, unknown> | null): Partial<GhostDepthSignals> {
  if (!payload) return {};

  const signals = (payload.signals ?? payload.mirage ?? payload.ghost ?? payload) as Record<string, unknown>;
  const events = Array.isArray(payload.events) ? payload.events : [];
  const eventCountFallback = events.length > 0 ? events.length : null;

  const extracted: Partial<GhostDepthSignals> = {};
  const volatility = asNumber(signals.volatility ?? payload.volatility);
  const spectralDensity = asNumber(signals.spectralDensity ?? payload.spectralDensity);
  const oversoulDepth = asNumber(signals.oversoulDepth ?? payload.oversoulDepth);
  const agentActivationCount = asNumber(
    signals.agentActivationCount ?? payload.agentActivationCount ?? eventCountFallback,
  );

  if (volatility !== null) extracted.volatility = volatility;
  if (spectralDensity !== null) extracted.spectralDensity = spectralDensity;
  if (oversoulDepth !== null) extracted.oversoulDepth = oversoulDepth;
  if (agentActivationCount !== null) extracted.agentActivationCount = agentActivationCount;

  return extracted;
}

function mergeDepth(enginePartial: Partial<GhostDepthSignals>, derived: GhostDepthSignals): {
  depth: GhostDepthSignals;
  derived: boolean;
} {
  const hasEngine =
    enginePartial.volatility !== undefined &&
    enginePartial.spectralDensity !== undefined &&
    enginePartial.oversoulDepth !== undefined &&
    enginePartial.agentActivationCount !== undefined;

  if (hasEngine) {
    return {
      depth: {
        volatility: enginePartial.volatility!,
        spectralDensity: enginePartial.spectralDensity!,
        oversoulDepth: enginePartial.oversoulDepth!,
        agentActivationCount: enginePartial.agentActivationCount!,
      },
      derived: false,
    };
  }

  return {
    depth: {
      volatility: enginePartial.volatility ?? derived.volatility,
      spectralDensity: enginePartial.spectralDensity ?? derived.spectralDensity,
      oversoulDepth: enginePartial.oversoulDepth ?? derived.oversoulDepth,
      agentActivationCount: enginePartial.agentActivationCount ?? derived.agentActivationCount,
    },
    derived: !hasEngine,
  };
}

async function persistGhostSignalsToKv(
  env: GhostEnv,
  depth: GhostDepthSignals,
  derived: boolean,
  updatedAt: string,
): Promise<void> {
  try {
    const entries = Object.entries(GHOST_KV_KEYS) as [keyof GhostDepthSignals, string][];
    await Promise.all(
      entries.map(([field, key]) => {
        const record: GhostKvSignal = { value: depth[field], updatedAt, derived };
        return env.TTX_STATE.put(key, JSON.stringify(record), { expirationTtl: 7 * 24 * 60 * 60 });
      }),
    );
    await env.TTX_STATE.put(
      GHOST_META_KEY,
      JSON.stringify({ updatedAt, derived, signalFreshnessMs: 0 }),
      { expirationTtl: 7 * 24 * 60 * 60 },
    );
  } catch {
    await recordSubsystemFailure(env, "kv", "ghost signal write failed");
  }
}

export async function readGhostSignalsFromKv(env: GhostEnv): Promise<{
  depth: GhostDepthSignals | null;
  derived: boolean;
  updatedAt: string | null;
}> {
  try {
    const entries = Object.entries(GHOST_KV_KEYS) as [keyof GhostDepthSignals, string][];
    const values = await Promise.all(entries.map(([, key]) => env.TTX_STATE.get(key)));
    const parsed = values.map((raw) => (raw ? (JSON.parse(raw) as GhostKvSignal) : null));
    if (parsed.some((p) => p === null)) {
      return { depth: null, derived: true, updatedAt: null };
    }

    const depth = {
      volatility: parsed[0]!.value,
      spectralDensity: parsed[1]!.value,
      oversoulDepth: parsed[2]!.value,
      agentActivationCount: parsed[3]!.value,
    };
    const derived = parsed.every((p) => p!.derived);
    const updatedAt = parsed.reduce<string | null>((latest, p) => {
      if (!p?.updatedAt) return latest;
      if (!latest || Date.parse(p.updatedAt) > Date.parse(latest)) return p.updatedAt;
      return latest;
    }, null);

    return { depth, derived, updatedAt };
  } catch {
    await recordSubsystemFailure(env, "kv", "ghost signal read failed");
    return { depth: null, derived: true, updatedAt: null };
  }
}

async function enrichPayloadWithMirage(
  env: GhostEnv,
  basePayload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const harnessSecret = env.HARNESS_SECRET || env.OPERATOR_SECRET;
  if (!harnessSecret) return basePayload;

  const headers = new Headers({ Accept: "application/json", "X-Harness-Secret": harnessSecret });
  const mirage = await tryEngineFetch(env, "/api/mirage/events", headers);
  if (!mirage.ok) return basePayload;

  const mirageSignals = (mirage.payload.signals ?? mirage.payload) as Record<string, unknown>;
  return {
    ...basePayload,
    ...mirage.payload,
    signals: {
      ...(typeof basePayload.signals === "object" && basePayload.signals
        ? (basePayload.signals as Record<string, unknown>)
        : {}),
      ...mirageSignals,
    },
  };
}

async function parseEngineBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

async function tryEngineFetch(
  env: GhostEnv,
  path: string,
  headers: Headers,
): Promise<{ ok: true; payload: Record<string, unknown> } | { ok: false; status: number; detail?: string }> {
  const base = engineBase(env);
  if (!base && !env.HARNESS) return { ok: false, status: 0, detail: "missing ENGINE_API_URL" };

  try {
    const request = new Request(new URL(path, `${base || "https://harness.internal"}/`), {
      method: "GET",
      headers,
    });
    const response = env.HARNESS ? await env.HARNESS.fetch(request) : await fetch(request);

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 120);
      return { ok: false, status: response.status, detail };
    }
    const payload = await parseEngineBody(response);
    return { ok: true, payload };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchGhostSignals(env: GhostEnv): Promise<GhostSignals> {
  const localSummary = await getTelemetrySummary(env);
  const telemetryDerived = deriveGhostDepthFromTelemetry(localSummary);

  let enginePayload: Record<string, unknown> | null = null;
  let connected = false;
  let engineError: string | null = null;
  let authMethod: string | null = null;
  let fetchedAt = new Date().toISOString();

  if (engineBase(env) || env.HARNESS) {
    const publicHealth = await tryEngineFetch(env, "/health", new Headers({ Accept: "application/json" }));
    if (publicHealth.ok) {
      enginePayload = await enrichPayloadWithMirage(env, publicHealth.payload);
      connected = true;
      authMethod = "health-public";
      fetchedAt = new Date().toISOString();
    } else {
      engineError = `/health (public) returned ${publicHealth.status}${publicHealth.detail ? `: ${publicHealth.detail}` : ""}`;

      const harnessSecret = env.HARNESS_SECRET || env.OPERATOR_SECRET;
      if (harnessSecret) {
        const headers = new Headers({ Accept: "application/json", "X-Harness-Secret": harnessSecret });
        const authed = await tryEngineFetch(env, "/api/mirage/events", headers);
        if (authed.ok) {
          enginePayload = authed.payload;
          connected = true;
          authMethod = "x-harness-secret";
          fetchedAt = new Date().toISOString();
        } else {
          engineError = `/api/mirage/events (x-harness-secret) returned ${authed.status}`;
        }
      }

      if (!connected) {
        const opSecret = env.OPERATOR_SECRET || env.AUTH_SIGNING_KEY;
        if (opSecret) {
          const now = Math.floor(Date.now() / 1000);
          const token = await signToken(opSecret, { sub: "operator", iat: now, exp: now + 300 });
          const headers = new Headers({ Accept: "application/json", Authorization: `Bearer ${token}` });
          const authed = await tryEngineFetch(env, "/api/mirage/events", headers);
          if (authed.ok) {
            enginePayload = authed.payload;
            connected = true;
            authMethod = "operator-jwt";
            fetchedAt = new Date().toISOString();
          } else {
            engineError = `/api/mirage/events (operator-jwt) returned ${authed.status}`;
          }
        }
      }
    }

    if (connected && enginePayload) {
      await env.TTX_STATE.put(
        GHOST_CACHE_KEY,
        JSON.stringify({ enginePayload, fetchedAt, authMethod }),
        { expirationTtl: 300 },
      );
    }
  } else {
    engineError = "ENGINE_API_URL not configured";
    const cached = await env.TTX_STATE.get(GHOST_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as {
        enginePayload: Record<string, unknown>;
        fetchedAt?: string;
        authMethod?: string;
      };
      enginePayload = parsed.enginePayload;
      authMethod = parsed.authMethod ?? null;
      fetchedAt = parsed.fetchedAt ?? fetchedAt;
      connected = true;
    }
  }

  if (!connected) {
    const cached = await env.TTX_STATE.get(GHOST_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as {
        enginePayload: Record<string, unknown>;
        fetchedAt?: string;
        authMethod?: string;
      };
      enginePayload = parsed.enginePayload;
      authMethod = parsed.authMethod ?? null;
      fetchedAt = parsed.fetchedAt ?? fetchedAt;
      connected = true;
    } else {
      await recordSubsystemFailure(env, "ghost", engineError ?? "no cache available");
    }
  }

  const enginePartial = extractEngineDepth(enginePayload);
  const { depth, derived } = mergeDepth(enginePartial, telemetryDerived);

  await persistGhostSignalsToKv(env, depth, derived, fetchedAt);
  await recordGhostFreshness(env, fetchedAt);

  const signalFreshnessMs = Math.max(0, Date.now() - Date.parse(fetchedAt));

  return {
    connected,
    derived,
    bridge: "worker-kv",
    engine: env.ENGINE_API_URL ?? null,
    engineError,
    local: localSummary,
    engineSignals: enginePayload,
    depth,
    signalFreshnessMs,
    fetchedAt,
    adaptedAt: new Date().toISOString(),
    authMethod,
  };
}

export async function handleGhostRoute(
  request: Request,
  pathname: string,
  env: GhostEnv & BackboneEnv,
): Promise<Response | null> {
  if (pathname !== "/api/ghost/telemetry") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const signals = await fetchGhostSignals(env);
  const url = new URL(request.url);
  const includeAiSummary = url.searchParams.get("aiSummary") === "1";

  let aiSummary: string | null = null;
  if (includeAiSummary) {
    try {
      aiSummary = await summarizeGhostSignals(env, signals);
    } catch {
      // Ghost summary is optional — never fail the telemetry endpoint.
    }
  }

  return Response.json({
    ok: true,
    connected: signals.connected,
    derived: signals.derived,
    depth: signals.depth,
    signalFreshnessMs: signals.signalFreshnessMs,
    fetchedAt: signals.fetchedAt,
    authMethod: signals.authMethod,
    bridge: signals.bridge,
    engine: signals.engine,
    engineError: signals.engineError,
    local: signals.local,
    engineSignals: signals.engineSignals,
    adaptedAt: signals.adaptedAt,
    aiSummary,
  });
}
