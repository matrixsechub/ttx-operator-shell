import { resolveTelemetryEnvironment, type ModeEnv } from "./mode";
import {
  isAdaptiveUiMode,
  readAttributedUiMode,
  recordModeAttributedClick,
  recordUiModeView,
  type AdaptiveUiMode,
} from "./usageModeMetrics";
import { recordTrafficSourceSession, sanitizeTrafficSource } from "./trafficSources";

const VISITS_KEY = "usage:v2:visits";
const ENTRY_CLICKS_KEY = "usage:v2:entryClicks";
const MARKETPLACE_CLICKS_KEY = "usage:v2:marketplaceClicks";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const COUNTER_TTL_SECONDS = 365 * 24 * 60 * 60;

export type UsageEvent = "visit" | "entry_click" | "marketplace_click" | "ui_mode_view";

export type SignalIntegrityStatus = "VALID" | "INVALID_RATIOS";

export interface UsageSummary {
  visits: number;
  entryClicks: number;
  marketplaceClicks: number;
  environment: string;
  updatedAt: string;
  signalIntegrity: SignalIntegrityStatus;
}

export interface UsageEventInput {
  event: UsageEvent;
  sessionId: string;
  uiMode?: AdaptiveUiMode;
  trafficSource?: string;
}

export interface UsageRecordResult {
  usage: UsageSummary;
  counted: boolean;
  reason?: "duplicate" | "no_visit" | "invalid_session" | "invalid_ui_mode" | "missing_ui_mode";
}

export interface UsageEnv {
  TTX_STATE: KVNamespace;
}

export type UsageContextEnv = UsageEnv & ModeEnv;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function sessionEventKey(event: UsageEvent, sessionId: string): string {
  return `usage:v2:session:${event}:${sessionId}`;
}

async function readCounter(env: UsageEnv, key: string): Promise<number> {
  const raw = await env.TTX_STATE.get(key);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

async function incrementCounter(env: UsageEnv, key: string): Promise<number> {
  const next = (await readCounter(env, key)) + 1;
  await env.TTX_STATE.put(key, String(next), { expirationTtl: COUNTER_TTL_SECONDS });
  return next;
}

export function assessSignalIntegrity(
  usage: Pick<UsageSummary, "visits" | "entryClicks" | "marketplaceClicks">,
): SignalIntegrityStatus {
  if (usage.entryClicks > usage.visits || usage.marketplaceClicks > usage.visits) {
    return "INVALID_RATIOS";
  }
  return "VALID";
}

export async function getUsageSummary(env: UsageContextEnv): Promise<UsageSummary> {
  const [visits, entryClicks, marketplaceClicks] = await Promise.all([
    readCounter(env, VISITS_KEY),
    readCounter(env, ENTRY_CLICKS_KEY),
    readCounter(env, MARKETPLACE_CLICKS_KEY),
  ]);

  const summary = {
    visits,
    entryClicks,
    marketplaceClicks,
    environment: resolveTelemetryEnvironment(env),
    updatedAt: new Date().toISOString(),
    signalIntegrity: "VALID" as SignalIntegrityStatus,
  };

  return {
    ...summary,
    signalIntegrity: assessSignalIntegrity(summary),
  };
}

async function resolveAttributedMode(
  env: UsageContextEnv,
  sessionId: string,
  uiMode?: AdaptiveUiMode,
): Promise<AdaptiveUiMode | null> {
  if (uiMode) return uiMode;
  return readAttributedUiMode(env, sessionId);
}

export async function recordUsageEvent(
  env: UsageContextEnv,
  input: UsageEventInput,
): Promise<UsageRecordResult> {
  const { event, sessionId, uiMode, trafficSource } = input;
  const source = sanitizeTrafficSource(trafficSource);

  if (!isValidSessionId(sessionId)) {
    return {
      usage: await getUsageSummary(env),
      counted: false,
      reason: "invalid_session",
    };
  }

  if (event === "ui_mode_view") {
    if (!uiMode || !isAdaptiveUiMode(uiMode)) {
      return {
        usage: await getUsageSummary(env),
        counted: false,
        reason: "missing_ui_mode",
      };
    }

    const dedupeKey = sessionEventKey("ui_mode_view", sessionId);
    const existing = await env.TTX_STATE.get(dedupeKey);
    if (existing) {
      return {
        usage: await getUsageSummary(env),
        counted: false,
        reason: "duplicate",
      };
    }

    await env.TTX_STATE.put(dedupeKey, uiMode, { expirationTtl: SESSION_TTL_SECONDS });
    await recordUiModeView(env, sessionId, uiMode);

    return {
      usage: await getUsageSummary(env),
      counted: true,
    };
  }

  const dedupeKey = sessionEventKey(event, sessionId);
  const existing = await env.TTX_STATE.get(dedupeKey);
  if (existing) {
    return {
      usage: await getUsageSummary(env),
      counted: false,
      reason: "duplicate",
    };
  }

  if (event !== "visit") {
    const visitKey = sessionEventKey("visit", sessionId);
    const hasVisit = await env.TTX_STATE.get(visitKey);
    if (!hasVisit) {
      return {
        usage: await getUsageSummary(env),
        counted: false,
        reason: "no_visit",
      };
    }
  }

  await env.TTX_STATE.put(dedupeKey, new Date().toISOString(), { expirationTtl: SESSION_TTL_SECONDS });

  switch (event) {
    case "visit":
      await incrementCounter(env, VISITS_KEY);
      if (source) await recordTrafficSourceSession(env, source);
      break;
    case "entry_click":
      await incrementCounter(env, ENTRY_CLICKS_KEY);
      await recordModeAttributedClick(env, await resolveAttributedMode(env, sessionId, uiMode), "entry_click");
      break;
    case "marketplace_click":
      await incrementCounter(env, MARKETPLACE_CLICKS_KEY);
      await recordModeAttributedClick(
        env,
        await resolveAttributedMode(env, sessionId, uiMode),
        "marketplace_click",
      );
      break;
    default: {
      const _exhaustive: never = event;
      void _exhaustive;
    }
  }

  return {
    usage: await getUsageSummary(env),
    counted: true,
  };
}

const VALID_EVENTS: UsageEvent[] = ["visit", "entry_click", "marketplace_click", "ui_mode_view"];

export async function handleUsageRoute(
  request: Request,
  pathname: string,
  env: UsageContextEnv,
): Promise<Response | null> {
  if (pathname !== "/api/usage/event") return null;
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let body: { event?: unknown; sessionId?: unknown; uiMode?: unknown; trafficSource?: unknown };
  try {
    body = (await request.json()) as {
      event?: unknown;
      sessionId?: unknown;
      uiMode?: unknown;
      trafficSource?: unknown;
    };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!VALID_EVENTS.includes(body.event as UsageEvent)) {
    return Response.json(
      { error: "event must be visit, entry_click, marketplace_click, or ui_mode_view" },
      { status: 400 },
    );
  }

  if (!isValidSessionId(body.sessionId)) {
    return Response.json({ error: "sessionId must be a UUID v4" }, { status: 400 });
  }

  if (body.uiMode !== undefined && !isAdaptiveUiMode(body.uiMode)) {
    return Response.json({ error: "uiMode must be CONFUSION, FRICTION, ENGAGED, or DEFAULT" }, { status: 400 });
  }

  const result = await recordUsageEvent(env, {
    event: body.event as UsageEvent,
    sessionId: body.sessionId,
    uiMode: body.uiMode as AdaptiveUiMode | undefined,
    trafficSource: typeof body.trafficSource === "string" ? body.trafficSource : undefined,
  });

  return Response.json({
    ok: true,
    counted: result.counted,
    reason: result.reason ?? null,
    usage: result.usage,
  });
}
