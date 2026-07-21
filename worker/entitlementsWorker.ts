/**
 * PEARL-SPECTRAL — ENTITLEMENTS WORKER (Track 5, live)
 * ---------------------------------------------------------------------------
 * Implements ENTITLEMENT-MODEL.md: tier baselines, pack grant templates,
 * and the pure resolution rule
 *
 *     effective = baseline(tier) ∪ activeGrants(packs) − revocations
 *
 * with deny-by-default and LATENT grants (a pack held below its
 * minimumTier stays stored but inactive — downgrades are non-destructive).
 *
 * Endpoints:
 *   GET  /api/entitlements/get      operator-auth — raw stored record
 *   POST /api/entitlements/set      operator-auth — { subject?, packs[] }
 *   GET  /api/entitlements/resolve  public — effective set for current subject
 *
 * Storage: KV TTX_STATE `pearl:entitlements:<subject>`.
 * Subject: authenticated operator handle; anonymous → ACCESS baseline.
 */

import { getAccessTokenOperator, type AuthEnv } from "./auth";
import { readTier, type TierEnv } from "./tierWorker";
import type { SubscriptionTier, UpgradePackKind } from "../src/pearl/qualificationContract";

export interface EntitlementsEnv extends TierEnv {
  TTX_STATE?: KVNamespace;
}

export const TIER_ORDER: readonly SubscriptionTier[] = ["access", "operator", "ops-division", "enterprise"];

export function tierRank(tier: SubscriptionTier): number {
  return TIER_ORDER.indexOf(tier);
}

/** Tier baselines — ENTITLEMENT-MODEL §2. */
export const TIER_BASELINES: Record<SubscriptionTier, readonly string[]> = {
  access: ["public.browse", "ttx.join"],
  operator: ["public.browse", "ttx.join", "cockpit.enter", "ttx.host", "marketplace.acquire"],
  "ops-division": [
    "public.browse",
    "ttx.join",
    "cockpit.enter",
    "ttx.host",
    "marketplace.acquire",
    "division.seats",
    "division.telemetry",
  ],
  enterprise: [
    "public.browse",
    "ttx.join",
    "cockpit.enter",
    "ttx.host",
    "marketplace.acquire",
    "division.seats",
    "division.telemetry",
    "catalog.private-lanes",
    "intel.feeds",
  ],
};

/** Pack grant templates — ENTITLEMENT-MODEL §3 / MARKETPLACE-M3 §1. */
export const PACK_TEMPLATES: Record<
  UpgradePackKind,
  { grantFor: (slug: string) => string; minimumTier: SubscriptionTier }
> = {
  "agent-pack": { grantFor: (slug) => `agents.${slug}.use`, minimumTier: "operator" },
  "automation-pack": { grantFor: (slug) => `automations.${slug}.use`, minimumTier: "operator" },
  "scenario-pack": { grantFor: (slug) => `ttx.scenarios.${slug}`, minimumTier: "operator" },
  "intelligence-pack": { grantFor: (slug) => `intel.${slug}.read`, minimumTier: "ops-division" },
};

export interface PackHolding {
  kind: UpgradePackKind;
  slug: string;
  grantedAt: string;
  acquisitionId?: string;
}

export interface EntitlementRecord {
  subject: string;
  packs: PackHolding[];
  revocations: string[];
  updatedAt: string;
}

export interface ResolvedEntitlements {
  subject: string;
  tier: SubscriptionTier;
  effective: string[];
  latent: { grant: string; requiresTier: SubscriptionTier }[];
}

/** THE resolution rule — pure, no I/O (unit-tested directly). */
export function resolveEntitlements(
  subject: string,
  tier: SubscriptionTier,
  record: Pick<EntitlementRecord, "packs" | "revocations"> | null,
): ResolvedEntitlements {
  const effective = new Set<string>(TIER_BASELINES[tier]);
  const latent: ResolvedEntitlements["latent"] = [];

  for (const pack of record?.packs ?? []) {
    const template = PACK_TEMPLATES[pack.kind];
    if (!template) continue;
    const grant = template.grantFor(pack.slug);
    if (tierRank(tier) >= tierRank(template.minimumTier)) {
      effective.add(grant);
    } else {
      latent.push({ grant, requiresTier: template.minimumTier });
    }
  }

  for (const revoked of record?.revocations ?? []) {
    effective.delete(revoked);
  }

  return { subject, tier, effective: [...effective].sort(), latent };
}

/** Map a catalog item to its pack family via tags (declarative, no per-pack code). */
export function packKindFromTags(tags: readonly string[] | undefined): UpgradePackKind | null {
  for (const tag of tags ?? []) {
    if ((Object.keys(PACK_TEMPLATES) as UpgradePackKind[]).includes(tag as UpgradePackKind)) {
      return tag as UpgradePackKind;
    }
  }
  return null;
}

const entitlementsKey = (subject: string) => `pearl:entitlements:${subject}`;
const SUBJECT_RE = /^[A-Za-z0-9:_@.-]{1,128}$/;

export async function readEntitlements(kv: KVNamespace, subject: string): Promise<EntitlementRecord | null> {
  const raw = await kv.get(entitlementsKey(subject));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EntitlementRecord;
  } catch {
    return null;
  }
}

/** Single-writer grant append (idempotent per acquisitionId) — used by billing. */
export async function grantPack(
  kv: KVNamespace,
  subject: string,
  pack: PackHolding,
): Promise<EntitlementRecord> {
  const record: EntitlementRecord = (await readEntitlements(kv, subject)) ?? {
    subject,
    packs: [],
    revocations: [],
    updatedAt: new Date().toISOString(),
  };
  const duplicate = record.packs.some(
    (held) =>
      (pack.acquisitionId && held.acquisitionId === pack.acquisitionId) ||
      (held.kind === pack.kind && held.slug === pack.slug),
  );
  if (!duplicate) {
    record.packs.push(pack);
  }
  record.updatedAt = new Date().toISOString();
  await kv.put(entitlementsKey(subject), JSON.stringify(record));
  return record;
}

async function resolveSubject(request: Request, env: EntitlementsEnv): Promise<string | null> {
  const operator = await getAccessTokenOperator(request, env as unknown as AuthEnv).catch(() => null);
  if (operator?.handle) return operator.handle;
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return `anon:${sessionId.toLowerCase()}`;
  }
  return null;
}

export async function handleEntitlementsRoute(
  request: Request,
  pathname: string,
  env: EntitlementsEnv,
): Promise<Response | null> {
  if (!pathname.startsWith("/api/entitlements/")) return null;
  const kv = env.TTX_STATE;
  if (!kv) return Response.json({ error: "entitlement storage not configured" }, { status: 503 });

  if (pathname === "/api/entitlements/resolve" && request.method === "GET") {
    const subject = (await resolveSubject(request, env)) ?? "anonymous";
    const tier = await readTier(env, subject);
    const record = await readEntitlements(kv, subject);
    return Response.json(resolveEntitlements(subject, tier, record));
  }

  // get/set are privileged (edge gate enforces operator auth before we
  // reach here; the checks below make the requirement self-contained).
  const operator = await getAccessTokenOperator(request, env as unknown as AuthEnv).catch(() => null);
  if (!operator) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  if (pathname === "/api/entitlements/get" && request.method === "GET") {
    const subject = new URL(request.url).searchParams.get("subject") ?? operator.handle;
    if (!SUBJECT_RE.test(subject)) return Response.json({ error: "subject is invalid" }, { status: 400 });
    const record = await readEntitlements(kv, subject);
    return Response.json(record ?? { subject, packs: [], revocations: [], updatedAt: null });
  }

  if (pathname === "/api/entitlements/set" && request.method === "POST") {
    let body: { subject?: unknown; packs?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const subject = typeof body.subject === "string" ? body.subject : operator.handle;
    if (!SUBJECT_RE.test(subject)) return Response.json({ error: "subject is invalid" }, { status: 400 });
    if (!Array.isArray(body.packs)) return Response.json({ error: "packs must be an array" }, { status: 400 });

    const packs: PackHolding[] = [];
    for (const raw of body.packs) {
      const pack = raw as { kind?: unknown; slug?: unknown };
      const kind = pack.kind as UpgradePackKind;
      const slug = typeof pack.slug === "string" ? pack.slug.trim().slice(0, 64) : "";
      if (!PACK_TEMPLATES[kind] || !/^[a-z0-9-]{1,64}$/.test(slug)) {
        return Response.json({ error: "packs entries must be { kind: <pack family>, slug }" }, { status: 400 });
      }
      packs.push({ kind, slug, grantedAt: new Date().toISOString() });
    }

    const existing = await readEntitlements(kv, subject);
    const record: EntitlementRecord = {
      subject,
      packs,
      revocations: existing?.revocations ?? [],
      updatedAt: new Date().toISOString(),
    };
    await kv.put(entitlementsKey(subject), JSON.stringify(record));
    const tier = await readTier(env, subject);
    return Response.json({ ok: true, record, resolved: resolveEntitlements(subject, tier, record) });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
