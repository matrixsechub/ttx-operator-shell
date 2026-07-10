import type { UsageEnv } from "./usage";

export const TRAFFIC_SOURCE_CHANNELS = [
  "reddit",
  "x",
  "direct",
  "discord",
  "slack",
  "linkedin",
  "email",
  "referral",
  "partner",
  "community",
  "synthetic_injection",
  "internal",
  "organic",
  "unknown",
] as const;

export type TrafficSourceChannel = (typeof TRAFFIC_SOURCE_CHANNELS)[number];

function trafficSourceKey(source: TrafficSourceChannel): string {
  return `usage:v3:traffic:source:${source}`;
}

const LEGACY_SOURCE_ALIASES: Record<string, TrafficSourceChannel> = {
  twitter: "x",
  fb: "organic",
  facebook: "organic",
  google: "organic",
  bing: "organic",
};

export function sanitizeTrafficSource(value: unknown): TrafficSourceChannel | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 32);
  if (!cleaned) return null;
  const mapped = LEGACY_SOURCE_ALIASES[cleaned] ?? cleaned;
  if ((TRAFFIC_SOURCE_CHANNELS as readonly string[]).includes(mapped)) {
    return mapped as TrafficSourceChannel;
  }
  return "unknown";
}

async function readCounter(env: UsageEnv, key: string): Promise<number> {
  const raw = await env.TTX_STATE.get(key);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

async function incrementCounter(env: UsageEnv, key: string): Promise<void> {
  const next = (await readCounter(env, key)) + 1;
  await env.TTX_STATE.put(key, String(next), { expirationTtl: 365 * 24 * 60 * 60 });
}

export async function recordTrafficSourceSession(
  env: UsageEnv,
  source: TrafficSourceChannel,
): Promise<void> {
  await incrementCounter(env, trafficSourceKey(source));
}

export async function getTrafficSourceSummary(env: UsageEnv): Promise<Record<TrafficSourceChannel, number>> {
  const entries = await Promise.all(
    TRAFFIC_SOURCE_CHANNELS.map(async (source) => [source, await readCounter(env, trafficSourceKey(source))] as const),
  );
  return Object.fromEntries(entries) as Record<TrafficSourceChannel, number>;
}

export function listActiveTrafficSources(summary: Record<TrafficSourceChannel, number>): string[] {
  return TRAFFIC_SOURCE_CHANNELS.filter((source) => summary[source] > 0);
}
