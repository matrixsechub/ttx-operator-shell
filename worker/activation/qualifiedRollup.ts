import { ACTIVATION_SESSION_TTL_SECONDS } from "./kvKeys";
import { isQualifiedOrganicSession } from "./campaignMetrics";
import type { UsageContextEnv } from "../usage";
import type { QualifiedSessionContext } from "./campaignMetrics";

const QUALIFIED_ORGANIC_TOTAL_KEY = "activation:v1:rollup:qualifiedOrganicTotal";
const QUALIFIED_ORGANIC_SOURCES_KEY = "activation:v1:rollup:organicSources";

function sessionQualifiedKey(sessionId: string): string {
  return `activation:v1:qualified:${sessionId}`;
}

export async function markQualifiedOrganicSession(
  env: UsageContextEnv,
  ctx: QualifiedSessionContext,
): Promise<boolean> {
  const qualified = await isQualifiedOrganicSession(env, ctx);
  if (!qualified) return false;

  const dedupeKey = sessionQualifiedKey(ctx.sessionId);
  const existing = await env.TTX_STATE.get(dedupeKey);
  if (existing) return false;

  await env.TTX_STATE.put(dedupeKey, "1", { expirationTtl: ACTIVATION_SESSION_TTL_SECONDS });

  const totalRaw = await env.TTX_STATE.get(QUALIFIED_ORGANIC_TOTAL_KEY);
  const total = (totalRaw ? Number(totalRaw) : 0) + 1;
  await env.TTX_STATE.put(QUALIFIED_ORGANIC_TOTAL_KEY, String(total));

  if (ctx.trafficSource && ctx.trafficSource !== "synthetic_injection" && ctx.trafficSource !== "internal") {
    const sourceKey = `${QUALIFIED_ORGANIC_SOURCES_KEY}:${ctx.trafficSource}`;
    await env.TTX_STATE.put(sourceKey, "1");
  }

  return true;
}

export async function getQualifiedOrganicTotal(env: UsageContextEnv): Promise<number> {
  const raw = await env.TTX_STATE.get(QUALIFIED_ORGANIC_TOTAL_KEY);
  return raw ? Number(raw) : 0;
}

export async function countQualifiedOrganicSources(env: UsageContextEnv): Promise<number> {
  const list = await env.TTX_STATE.list({ prefix: `${QUALIFIED_ORGANIC_SOURCES_KEY}:` });
  return list.keys.length;
}
