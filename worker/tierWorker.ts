/**
 * PEARL-SPECTRAL — TIER WORKER (Track 5, live)
 * ---------------------------------------------------------------------------
 * Persistent subscription tier per subject (UPGRADE-PATH.md ladder):
 *
 *     ACCESS → OPERATOR → OPS DIVISION → ENTERPRISE
 *
 * Endpoints:
 *   GET  /api/tier/get   public — current subject's tier (default: access)
 *   POST /api/tier/set   operator-auth — { subject?, tier }
 *
 * Storage: KV TTX_STATE `pearl:tier:<subject>`. Unknown subjects resolve
 * to "access" (Option B: the free trial IS the capture mechanism — no
 * one is tierless).
 */

import { getAccessTokenOperator, type AuthEnv } from "./auth";
import type { SubscriptionTier } from "../src/pearl/qualificationContract";

export interface TierEnv {
  TTX_STATE?: KVNamespace;
}

const TIERS: readonly SubscriptionTier[] = ["access", "operator", "ops-division", "enterprise"];
const tierKey = (subject: string) => `pearl:tier:${subject}`;
const SUBJECT_RE = /^[A-Za-z0-9:_@.-]{1,128}$/;

export async function readTier(env: TierEnv, subject: string): Promise<SubscriptionTier> {
  const kv = env.TTX_STATE;
  if (!kv) return "access";
  const raw = await kv.get(tierKey(subject));
  return raw && TIERS.includes(raw as SubscriptionTier) ? (raw as SubscriptionTier) : "access";
}

export async function writeTier(env: TierEnv, subject: string, tier: SubscriptionTier): Promise<void> {
  const kv = env.TTX_STATE;
  if (!kv) throw new Error("tier storage not configured");
  await kv.put(tierKey(subject), tier);
}

export async function handleTierRoute(
  request: Request,
  pathname: string,
  env: TierEnv & Partial<AuthEnv>,
): Promise<Response | null> {
  if (pathname !== "/api/tier/get" && pathname !== "/api/tier/set") return null;
  if (!env.TTX_STATE) return Response.json({ error: "tier storage not configured" }, { status: 503 });

  const operator = await getAccessTokenOperator(request, env as AuthEnv).catch(() => null);

  if (pathname === "/api/tier/get") {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    const subject =
      operator?.handle ??
      (sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)
        ? `anon:${sessionId.toLowerCase()}`
        : "anonymous");
    const tier = await readTier(env, subject);
    return Response.json({ subject, tier, ladder: TIERS });
  }

  // POST /api/tier/set — privileged write (edge-gated; self-contained check too).
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  if (!operator) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  let body: { subject?: unknown; tier?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const subject = typeof body.subject === "string" ? body.subject : operator.handle;
  if (!SUBJECT_RE.test(subject)) {
    return Response.json({ error: "subject is invalid" }, { status: 400 });
  }
  const tier = body.tier as SubscriptionTier;
  if (!TIERS.includes(tier)) {
    return Response.json({ error: "tier must be access, operator, ops-division, or enterprise" }, { status: 400 });
  }

  const previous = await readTier(env, subject);
  await writeTier(env, subject, tier);
  return Response.json({ ok: true, subject, tier, previous });
}
