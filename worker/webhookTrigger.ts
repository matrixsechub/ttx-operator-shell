// Real backend for /api/webhooks/* — receives external webhook POSTs,
// validates an HMAC signature, stores events in KV, and serves them back
// to the cockpit. Same intercept-before-proxy pattern as catalog/auth/
// engine, same HMAC approach as auth.ts's token signing (Web Crypto,
// HMAC-SHA256) — no new crypto style introduced.
//
// Single-operator system, same as everywhere else in this repo: one
// WEBHOOK_SECRET (via `wrangler secret put`, exactly like AUTH_SIGNING_KEY),
// not a per-operator secret-generation/rotation flow. "Rotating" the
// secret means running that command again — there's no rotate endpoint,
// same as there's none for AUTH_SIGNING_KEY.
//
// The secret is write-only, like every other secret in this repo — no
// route ever reads it back to the browser. The webhook URL itself needs
// no backend endpoint either; it's just this Worker's own origin +
// /api/webhooks/ingest, computable client-side from window.location.
//
// Pagination (Phase 22): "cursor" here is an offset encoded as a string,
// not KV's native list() cursor. KV's cursor walks keys in ascending
// (oldest-first) order and can't reverse — but retention keeps the total
// dataset at <= MAX_STORED_EVENTS, so listing everything, sorting newest-
// first, and slicing in memory is simpler and correct, where chaining
// KV's own cursor would fight the ordering the operator actually wants.

import { hasValidAccessToken, type AuthEnv } from "./auth";

const MAX_STORED_EVENTS = 50;
const DEFAULT_PAGE_SIZE = 20;
const EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface WebhookTriggerEnv {
  WEBHOOK_SECRET?: string;
  WEBHOOK_EVENTS: KVNamespace;
}

// handleWebhookRoute takes WebhookTriggerEnv & AuthEnv rather than just
// WebhookTriggerEnv, since /api/webhooks/clear needs hasValidAccessToken's
// full env shape too. worker/index.ts always passes the real generated
// Env, which satisfies both — this intersection just says so explicitly
// instead of duplicating AuthEnv's fields here and risking drift.
type Env = WebhookTriggerEnv & AuthEnv;

export interface WebhookEvent {
  id: string;
  receivedAt: string;
  payload: unknown;
  test?: boolean;
  /** Lifted from payload.source / payload.type when present, for display/filtering — the full payload is kept as-is either way. */
  source?: string;
  type?: string;
}

const encoder = new TextEncoder();

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function hexToBytes(hex: string): Uint8Array | null {
  const matches = hex.match(/../g);
  if (!matches) return null;
  try {
    return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
  } catch {
    return null;
  }
}

async function verifySignature(rawBody: string, signatureHex: string, secret: string): Promise<boolean> {
  const signatureBytes = hexToBytes(signatureHex);
  if (!signatureBytes) return false;
  try {
    return await crypto.subtle.verify("HMAC", await hmacKey(secret), signatureBytes, encoder.encode(rawBody));
  } catch {
    return false;
  }
}

function normalizePayload(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    // Not JSON — store as a raw string rather than rejecting. Ingestion
    // shouldn't assume every external caller sends a JSON body.
    return { raw: rawBody };
  }
}

// Lifts payload.source / payload.type to top-level fields when the caller's
// JSON has them, purely for cheap filtering/display in the cockpit — the
// full payload is stored unchanged either way, this doesn't strip anything.
function extractSourceAndType(payload: unknown): { source?: string; type?: string } {
  if (typeof payload !== "object" || payload === null) return {};
  const record = payload as Record<string, unknown>;
  const result: { source?: string; type?: string } = {};
  if (typeof record.source === "string") result.source = record.source;
  if (typeof record.type === "string") result.type = record.type;
  return result;
}

// Enforces the retention cap by deleting the oldest excess events after a
// store. Fixes a real bug, not just adding a nice-to-have: the old
// handleEvents did kv.list({limit: 50}) with no cursor, which returns the
// lexicographically-*first* (= chronologically oldest) 50 keys once more
// than 50 exist — silently showing stale events and hiding new ones
// entirely. Keeping the stored count at <= MAX_STORED_EVENTS at all times
// means that bug can no longer occur, and pagination below can safely
// assume the full dataset is small.
async function enforceRetention(kv: KVNamespace): Promise<void> {
  try {
    const listed = await kv.list({ prefix: "event:", limit: 1000 });
    if (listed.keys.length <= MAX_STORED_EVENTS) return;
    const excess = listed.keys.length - MAX_STORED_EVENTS;
    const oldestKeys = listed.keys.slice(0, excess); // ascending order = oldest first
    await Promise.all(oldestKeys.map((key) => kv.delete(key.name)));
  } catch (err) {
    // Non-fatal — the event this call followed is already stored. Worst
    // case the store briefly exceeds the cap until the next successful run.
    console.error("webhookTrigger: retention cleanup failed", err instanceof Error ? err.message : err);
  }
}

// KV writes/reads aren't expected to fail under normal operation, but if
// they do, callers should get a clean 500 instead of an uncaught throw
// bubbling out of the fetch handler. console.error here is genuinely new —
// neither auth.ts nor engine.ts logs anything, because neither has had a
// failure path worth logging before. This repo's observability config
// (wrangler.jsonc) has been capturing nothing since Phase 11; this is the
// first thing that actually emits to it.
async function storeEvent(event: WebhookEvent, kv: KVNamespace): Promise<void> {
  try {
    // ISO 8601 timestamps sort lexicographically in the same order they
    // sort chronologically, so a prefix listing on "event:" naturally
    // comes back oldest-first without needing a separate index.
    await kv.put(`event:${event.receivedAt}:${event.id}`, JSON.stringify(event), {
      expirationTtl: EVENT_TTL_SECONDS,
    });
  } catch (err) {
    console.error("webhookTrigger: failed to store event", event.id, err instanceof Error ? err.message : err);
    throw err;
  }
  await enforceRetention(kv);
}

export async function handleWebhookRoute(request: Request, pathname: string, env: Env): Promise<Response | null> {
  if (pathname === "/api/webhooks/ingest") return handleIngest(request, env);
  if (pathname === "/api/webhooks/test") return handleTest(request, env);
  if (pathname === "/api/webhooks/events") return handleEvents(request, env);
  if (pathname === "/api/webhooks/clear") return handleClear(request, env);
  return null;
}

// External, signed ingestion — the real webhook receiver. Not gated by
// operator auth (an external system posting here has no operator login
// token); the HMAC signature is the actual authentication mechanism.
async function handleIngest(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  if (!env.WEBHOOK_SECRET) {
    return Response.json({ error: "Webhook trigger is not configured on this deployment" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("X-Webhook-Signature");
  if (!signature || !(await verifySignature(rawBody, signature, env.WEBHOOK_SECRET))) {
    return Response.json({ error: "Invalid or missing signature" }, { status: 401 });
  }

  const payload = normalizePayload(rawBody);
  const event: WebhookEvent = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    payload,
    ...extractSourceAndType(payload),
  };

  try {
    await storeEvent(event, env.WEBHOOK_EVENTS);
  } catch {
    return Response.json({ error: "Failed to store event" }, { status: 500 });
  }

  return Response.json({ ok: true, id: event.id }, { status: 200 });
}

// Cockpit-triggered synthetic event — no signature involved. The caller is
// the already-authenticated SPA (this route is only reachable from inside
// the RequireAuth-gated Dashboard), not an external system, so HMAC
// wouldn't make sense here even though it's still an unauthenticated
// Worker route by this repo's existing convention (see serveCatalog).
async function handleTest(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  const event: WebhookEvent = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    payload: { message: "Test event triggered from the Cockpit" },
    test: true,
    source: "cockpit",
    type: "test",
  };

  try {
    await storeEvent(event, env.WEBHOOK_EVENTS);
  } catch {
    return Response.json({ error: "Failed to store event" }, { status: 500 });
  }

  return Response.json({ ok: true, id: event.id }, { status: 200 });
}

async function handleEvents(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const url = new URL(request.url);
  const sourceFilter = url.searchParams.get("source");
  const typeFilter = url.searchParams.get("type");
  const offset = Math.max(0, Number(url.searchParams.get("cursor") ?? "0") || 0);
  const pageSizeParam = Number(url.searchParams.get("pageSize"));
  const pageSize = Number.isInteger(pageSizeParam) && pageSizeParam > 0 ? Math.min(pageSizeParam, MAX_STORED_EVENTS) : DEFAULT_PAGE_SIZE;

  let allEvents: WebhookEvent[];
  try {
    // Retention keeps this at <= MAX_STORED_EVENTS, so one unpaginated
    // list() always returns the complete dataset — pagination below is
    // an in-memory slice, not repeated KV calls.
    const listed = await env.WEBHOOK_EVENTS.list({ prefix: "event:", limit: MAX_STORED_EVENTS });
    const events = await Promise.all(
      listed.keys.map(async (key) => {
        const raw = await env.WEBHOOK_EVENTS.get(key.name);
        if (!raw) return null;
        try {
          return JSON.parse(raw) as WebhookEvent;
        } catch {
          return null;
        }
      }),
    );
    allEvents = events.filter((event): event is WebhookEvent => event !== null).reverse(); // newest first
  } catch (err) {
    console.error("webhookTrigger: failed to list events", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to retrieve events" }, { status: 500 });
  }

  // Filtering happens after listing, not via a KV query — at MAX_STORED_EVENTS
  // (50) that's trivial in-memory work, and KV has no native field querying.
  if (sourceFilter) allEvents = allEvents.filter((event) => event.source === sourceFilter);
  if (typeFilter) allEvents = allEvents.filter((event) => event.type === typeFilter);

  const total = allEvents.length;
  const page = allEvents.slice(offset, offset + pageSize);
  const nextOffset = offset + pageSize;
  const nextCursor = nextOffset < total ? String(nextOffset) : undefined;

  return Response.json({ events: page, nextCursor, total });
}

// Destructive, so gated behind a valid operator session — see auth.ts's
// hasValidAccessToken. Unlike /ingest (signature-authenticated) and /test
// (unauthenticated, matches this repo's convention for non-destructive
// data routes), clearing all history warrants proving you're logged in.
async function handleClear(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  if (!(await hasValidAccessToken(request, env))) {
    return Response.json({ error: "Missing or invalid operator session" }, { status: 401 });
  }

  try {
    const listed = await env.WEBHOOK_EVENTS.list({ prefix: "event:", limit: 1000 });
    await Promise.all(listed.keys.map((key) => env.WEBHOOK_EVENTS.delete(key.name)));
  } catch (err) {
    console.error("webhookTrigger: failed to clear events", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to clear events" }, { status: 500 });
  }

  return Response.json({ cleared: true });
}
