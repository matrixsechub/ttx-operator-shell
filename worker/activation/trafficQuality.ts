import type { InteractionSignal, TrafficQuality } from "./types";
import { qualityKey, ACTIVATION_SESSION_TTL_SECONDS } from "./kvKeys";
import type { TrafficSourceChannel } from "../trafficSources";

export interface TrafficQualityEnv {
  TTX_STATE: KVNamespace;
}

export interface SessionQualityRecord {
  sessionId: string;
  quality: TrafficQuality;
  signals: InteractionSignal[];
  eventCount: number;
  lastEventAt?: string;
  hasVisit: boolean;
  hasFunnelProgression: boolean;
  updatedAt: string;
}

const CRAWLER_UA_PREFIXES = ["googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider", "yandexbot", "facebookexternalhit", "twitterbot", "linkedinbot", "discordbot", "slackbot", "headlesschrome", "phantomjs"];

const EXCESSIVE_EVENT_THRESHOLD = 30;
const EXCESSIVE_EVENT_WINDOW_MS = 10_000;

export function classifyTrafficSource(source: TrafficSourceChannel | string | null): TrafficQuality {
  if (!source) return "UNKNOWN";
  if (source === "synthetic_injection") return "SYNTHETIC";
  if (source === "internal") return "INTERNAL";
  return "UNKNOWN";
}

export function classifyUserAgent(userAgent: string | null): TrafficQuality | null {
  if (!userAgent) return null;
  const normalized = userAgent.toLowerCase();
  for (const prefix of CRAWLER_UA_PREFIXES) {
    if (normalized.includes(prefix)) {
      if (prefix.includes("bot") || prefix.includes("spider")) return "BOT_LIKELY";
      return "PREVIEW_OR_CRAWLER";
    }
  }
  return null;
}

export function hashSessionId(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash << 5) - hash + sessionId.charCodeAt(i);
    hash |= 0;
  }
  return `s${Math.abs(hash).toString(16)}`;
}

export async function readSessionQuality(
  env: TrafficQualityEnv,
  sessionId: string,
): Promise<SessionQualityRecord | null> {
  const raw = await env.TTX_STATE.get(qualityKey(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionQualityRecord;
  } catch {
    return null;
  }
}

async function writeSessionQuality(env: TrafficQualityEnv, record: SessionQualityRecord): Promise<void> {
  await env.TTX_STATE.put(qualityKey(record.sessionId), JSON.stringify(record), {
    expirationTtl: ACTIVATION_SESSION_TTL_SECONDS,
  });
}

export function resolveQualityLevel(record: SessionQualityRecord): TrafficQuality {
  if (record.quality === "SYNTHETIC" || record.quality === "INTERNAL") return record.quality;
  if (record.quality === "IMPOSSIBLE_EVENT_ORDER" || record.quality === "EXCESSIVE_EVENT_RATE") {
    return record.quality;
  }
  if (record.quality === "BOT_LIKELY" || record.quality === "PREVIEW_OR_CRAWLER") {
    return record.quality;
  }
  if (record.signals.length > 0 || record.hasFunnelProgression) {
    return "HUMAN_LIKELY";
  }
  return record.quality;
}

export async function initializeSessionQuality(
  env: TrafficQualityEnv,
  sessionId: string,
  trafficSource: TrafficSourceChannel | string | null,
  userAgent?: string | null,
): Promise<SessionQualityRecord> {
  const existing = await readSessionQuality(env, sessionId);
  if (existing) return existing;

  let quality = classifyTrafficSource(trafficSource);
  const uaQuality = classifyUserAgent(userAgent ?? null);
  if (uaQuality) quality = uaQuality;

  const record: SessionQualityRecord = {
    sessionId,
    quality,
    signals: [],
    eventCount: 0,
    hasVisit: false,
    hasFunnelProgression: false,
    updatedAt: new Date().toISOString(),
  };

  await writeSessionQuality(env, record);
  return record;
}

export async function markSessionVisit(
  env: TrafficQualityEnv,
  sessionId: string,
  trafficSource: TrafficSourceChannel | string | null,
): Promise<SessionQualityRecord> {
  const record = await initializeSessionQuality(env, sessionId, trafficSource);
  record.hasVisit = true;
  record.eventCount += 1;
  record.lastEventAt = new Date().toISOString();
  record.quality = resolveQualityLevel(record);
  record.updatedAt = record.lastEventAt;
  await writeSessionQuality(env, record);
  return record;
}

export async function markSessionFunnelEvent(
  env: TrafficQualityEnv,
  sessionId: string,
  event: string,
): Promise<SessionQualityRecord> {
  let record = await readSessionQuality(env, sessionId);
  if (!record) {
    record = await initializeSessionQuality(env, sessionId, null);
  }

  if (!record.hasVisit && event !== "visit") {
    record.quality = "IMPOSSIBLE_EVENT_ORDER";
  }

  if (["service_view", "intake_started", "intake_completed", "checkout_started", "purchase_completed"].includes(event)) {
    record.hasFunnelProgression = true;
  }

  record.eventCount += 1;
  const now = Date.now();
  if (record.lastEventAt) {
    const last = Date.parse(record.lastEventAt);
    if (now - last < EXCESSIVE_EVENT_WINDOW_MS && record.eventCount >= EXCESSIVE_EVENT_THRESHOLD) {
      record.quality = "EXCESSIVE_EVENT_RATE";
    }
  }
  record.lastEventAt = new Date().toISOString();
  record.quality = resolveQualityLevel(record);
  record.updatedAt = record.lastEventAt;
  await writeSessionQuality(env, record);
  return record;
}

export async function recordInteractionSignal(
  env: TrafficQualityEnv,
  sessionId: string,
  signal: InteractionSignal,
): Promise<SessionQualityRecord> {
  let record = await readSessionQuality(env, sessionId);
  if (!record) {
    record = await initializeSessionQuality(env, sessionId, null);
  }

  if (!record.signals.includes(signal)) {
    record.signals.push(signal);
  }
  record.quality = resolveQualityLevel(record);
  record.updatedAt = new Date().toISOString();
  await writeSessionQuality(env, record);
  return record;
}

export function isQualifiedOrganicQuality(quality: TrafficQuality): boolean {
  return quality === "HUMAN_LIKELY";
}
