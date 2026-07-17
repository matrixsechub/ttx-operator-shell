/**
 * PEARL-SPECTRAL — MARKETPLACE BILLING WORKER (Track 5, live)
 * ---------------------------------------------------------------------------
 * The M3 acquisition runtime (MARKETPLACE-M3.md):
 *
 *   M3-1 intent  →  M3-2 billing  →  M3-3 confirmation  →  M3-4 grant
 *
 * Provider model (BILLING-PACKET.md decision — Stripe, with sandbox):
 *   - STRIPE adapter: active iff STRIPE_SECRET_KEY is configured. Creates
 *     a hosted Checkout Session via REST; grants happen ONLY from the
 *     signature-verified webhook (provider state wins).
 *   - SANDBOX adapter: active iff BILLING_SANDBOX === "true" or
 *     DEPLOY_ENV is not production (and Stripe is not configured).
 *     Grants synchronously and stamps `sandbox: true` on the acquisition.
 *   - Neither: 503 "billing not configured" — production without keys
 *     can never take a payment or mint a grant.
 *
 * Grant path is the SINGLE WRITER for pack entitlements
 * (entitlementsWorker.grantPack, idempotent per acquisitionId).
 *
 * Endpoints:
 *   POST /api/billing/checkout-session   public (validated; tier-enforced)
 *   POST /api/webhooks/billing           public (Stripe-signature-gated)
 *   GET  /api/billing/acquisition?id=…   public (M3-3 polling)
 */

import { CATALOG_ITEMS } from "./catalogData";
import {
  grantPack,
  packKindFromTags,
  readEntitlements,
  resolveEntitlements,
  type EntitlementsEnv,
} from "./entitlementsWorker";
import { readTier } from "./tierWorker";
import { timingSafeEqual } from "./edge/crypto";
import { notifyOperator, type NotificationsEnv } from "./operatorNotifications";
import type { UpgradePackKind } from "../src/pearl/qualificationContract";

export interface BillingEnv extends EntitlementsEnv, NotificationsEnv {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  BILLING_SANDBOX?: string;
  DEPLOY_ENV?: string;
  ORIGIN_URL?: string;
}

export type BillingProviderName = "stripe" | "sandbox";

export interface AcquisitionRecord {
  id: string;
  itemId: string;
  packKind: UpgradePackKind;
  subject: string;
  provider: BillingProviderName;
  status: "pending" | "granted" | "failed";
  sandbox: boolean;
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
}

const acquisitionKey = (id: string) => `pearl:acquisition:${id}`;
const ACQUISITION_TTL_SECONDS = 60 * 60 * 24 * 90;
const SUBJECT_RE = /^[A-Za-z0-9:_@.-]{1,128}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveProvider(env: BillingEnv): BillingProviderName | null {
  if (env.STRIPE_SECRET_KEY) return "stripe";
  const sandboxFlag = (env.BILLING_SANDBOX ?? "").toLowerCase() === "true";
  const nonProduction = (env.DEPLOY_ENV ?? "").toLowerCase() !== "production";
  if (sandboxFlag || nonProduction) return "sandbox";
  return null;
}

async function readAcquisition(kv: KVNamespace, id: string): Promise<AcquisitionRecord | null> {
  const raw = await kv.get(acquisitionKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AcquisitionRecord;
  } catch {
    return null;
  }
}

async function writeAcquisition(kv: KVNamespace, record: AcquisitionRecord): Promise<void> {
  await kv.put(acquisitionKey(record.id), JSON.stringify(record), { expirationTtl: ACQUISITION_TTL_SECONDS });
}

/** M3-4: idempotent grant from a confirmed acquisition (single writer). */
async function settleGrant(kv: KVNamespace, record: AcquisitionRecord, env: BillingEnv): Promise<AcquisitionRecord> {
  if (record.status === "granted") return record;
  await grantPack(kv, record.subject, {
    kind: record.packKind,
    slug: record.itemId,
    grantedAt: new Date().toISOString(),
    acquisitionId: record.id,
  });
  const settled: AcquisitionRecord = { ...record, status: "granted", updatedAt: new Date().toISOString() };
  await writeAcquisition(kv, settled);
  await notifyOperator(env, {
    kind: "entitlement-grant",
    subject: record.subject,
    data: { itemId: record.itemId, packKind: record.packKind, acquisitionId: record.id, sandbox: record.sandbox },
  });
  return settled;
}

/** Stripe Checkout Session via REST (no SDK; Workers-native fetch). */
async function createStripeCheckout(
  env: BillingEnv,
  record: AcquisitionRecord,
  itemName: string,
  priceUsdCents: number,
): Promise<{ url: string } | { error: string }> {
  const origin = env.ORIGIN_URL ?? "";
  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(priceUsdCents),
    "line_items[0][price_data][product_data][name]": itemName,
    success_url: `${origin}/marketplace?acquisition=${record.id}&outcome=success`,
    cancel_url: `${origin}/marketplace?acquisition=${record.id}&outcome=cancelled`,
    "metadata[acquisition_id]": record.id,
    "metadata[subject]": record.subject,
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const payload = (await response.json().catch(() => null)) as { url?: string; error?: { message?: string } } | null;
  if (!response.ok || !payload?.url) {
    return { error: payload?.error?.message ?? `stripe checkout failed (${response.status})` };
  }
  return { url: payload.url };
}

/** Verify a Stripe webhook signature (t=…,v1=… HMAC-SHA256 of `${t}.${body}`). */
export async function verifyStripeSignature(
  body: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const parts = new Map(
    signatureHeader.split(",").map((part) => {
      const [k, ...rest] = part.split("=");
      return [k.trim(), rest.join("=")] as const;
    }),
  );
  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(expected, signature);
}

function parsePriceCents(price: string | number | undefined): number | null {
  if (typeof price === "number" && Number.isFinite(price) && price > 0) return Math.round(price * 100);
  if (typeof price === "string") {
    const match = price.replace(/,/g, "").match(/\$?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value) && value > 0) return Math.round(value * 100);
    }
  }
  return null;
}

export async function handleBillingRoute(
  request: Request,
  pathname: string,
  env: BillingEnv,
): Promise<Response | null> {
  const isBilling =
    pathname === "/api/billing/checkout-session" ||
    pathname === "/api/billing/acquisition" ||
    pathname === "/api/webhooks/billing";
  if (!isBilling) return null;

  const kv = env.TTX_STATE;
  if (!kv) return Response.json({ error: "billing storage not configured" }, { status: 503 });

  /* ── M3-3: acquisition polling ─────────────────────────────────────── */
  if (pathname === "/api/billing/acquisition") {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!UUID_RE.test(id)) return Response.json({ error: "id must be an acquisition UUID" }, { status: 400 });
    const record = await readAcquisition(kv, id);
    if (!record) return Response.json({ error: "acquisition not found" }, { status: 404 });
    return Response.json({
      id: record.id,
      itemId: record.itemId,
      packKind: record.packKind,
      status: record.status,
      provider: record.provider,
      sandbox: record.sandbox,
      updatedAt: record.updatedAt,
    });
  }

  /* ── Provider webhook (M3-2 → M3-4 for Stripe) ─────────────────────── */
  if (pathname === "/api/webhooks/billing") {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
    }
    if (!env.STRIPE_WEBHOOK_SECRET) {
      return Response.json({ error: "billing webhook not configured" }, { status: 503 });
    }
    const body = await request.text();
    const valid = await verifyStripeSignature(body, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return Response.json({ error: "invalid webhook signature" }, { status: 401 });
    }
    let event: { type?: string; data?: { object?: { metadata?: { acquisition_id?: string } } } };
    try {
      event = JSON.parse(body) as typeof event;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const acquisitionId = event.data?.object?.metadata?.acquisition_id ?? "";
    await notifyOperator(env, {
      kind: "billing-webhook",
      data: { type: event.type ?? "unknown", acquisitionId: acquisitionId || null },
    });
    if (!UUID_RE.test(acquisitionId)) {
      return Response.json({ ok: true, ignored: "no acquisition metadata" });
    }
    const record = await readAcquisition(kv, acquisitionId);
    if (!record) return Response.json({ error: "acquisition not found" }, { status: 404 });

    if (event.type === "checkout.session.completed") {
      const settled = await settleGrant(kv, record, env);
      return Response.json({ ok: true, status: settled.status });
    }
    if (event.type === "checkout.session.expired") {
      const failed: AcquisitionRecord = {
        ...record,
        status: record.status === "granted" ? record.status : "failed",
        failureReason: "checkout expired",
        updatedAt: new Date().toISOString(),
      };
      await writeAcquisition(kv, failed);
      return Response.json({ ok: true, status: failed.status });
    }
    return Response.json({ ok: true, ignored: event.type ?? "unknown" });
  }

  /* ── M3-1/M3-2: intent → checkout ──────────────────────────────────── */
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  let body: { itemId?: unknown; subject?: unknown; sessionId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
  const item = CATALOG_ITEMS.find((candidate) => candidate.id === itemId);
  if (!item) return Response.json({ error: "catalog item not found" }, { status: 404 });

  const packKind = packKindFromTags(item.tags);
  if (!packKind) {
    return Response.json({ error: "item is not an acquirable pack (no pack-family tag)" }, { status: 422 });
  }

  let subject: string;
  if (typeof body.subject === "string" && SUBJECT_RE.test(body.subject)) {
    subject = body.subject;
  } else if (typeof body.sessionId === "string" && UUID_RE.test(body.sessionId)) {
    subject = `anon:${body.sessionId.toLowerCase()}`;
  } else {
    return Response.json({ error: "subject or sessionId (UUID v4) is required" }, { status: 400 });
  }

  // ENTITLEMENT-MODEL enforcement: acquisition requires marketplace.acquire.
  const tier = await readTier(env, subject);
  const resolved = resolveEntitlements(subject, tier, await readEntitlements(kv, subject));
  if (!resolved.effective.includes("marketplace.acquire")) {
    return Response.json(
      { error: "tier does not permit acquisition", tier, requiresTier: "operator" },
      { status: 403 },
    );
  }

  const provider = resolveProvider(env);
  if (!provider) {
    return Response.json({ error: "billing not configured" }, { status: 503 });
  }

  const now = new Date().toISOString();
  const record: AcquisitionRecord = {
    id: crypto.randomUUID(),
    itemId: item.id,
    packKind,
    subject,
    provider,
    status: "pending",
    sandbox: provider === "sandbox",
    createdAt: now,
    updatedAt: now,
  };
  await writeAcquisition(kv, record);

  if (provider === "sandbox") {
    const settled = await settleGrant(kv, record, env);
    return Response.json(
      { acquisitionId: settled.id, provider, status: settled.status, sandbox: true },
      { status: 201 },
    );
  }

  const priceCents = parsePriceCents(item.price);
  if (!priceCents) {
    return Response.json({ error: "item has no billable price" }, { status: 422 });
  }
  const checkout = await createStripeCheckout(env, record, item.name, priceCents);
  if ("error" in checkout) {
    await writeAcquisition(kv, {
      ...record,
      status: "failed",
      failureReason: checkout.error,
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ error: "checkout creation failed" }, { status: 502 });
  }
  return Response.json(
    { acquisitionId: record.id, provider, status: "pending", checkoutUrl: checkout.url },
    { status: 201 },
  );
}
