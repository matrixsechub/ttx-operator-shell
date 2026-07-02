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

const MAX_STORED_EVENTS = 50;
const EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface WebhookTriggerEnv {
  WEBHOOK_SECRET?: string;
  WEBHOOK_EVENTS: KVNamespace;
}

export interface WebhookEvent {
  id: string;
  receivedAt: string;
  payload: unknown;
  test?: boolean;
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

async function storeEvent(event: WebhookEvent, kv: KVNamespace): Promise<void> {
  // ISO 8601 timestamps sort lexicographically in the same order they sort
  // chronologically, so a prefix listing on "event:" naturally comes back
  // oldest-first without needing a separate index.
  await kv.put(`event:${event.receivedAt}:${event.id}`, JSON.stringify(event), {
    expirationTtl: EVENT_TTL_SECONDS,
  });
}

export async function handleWebhookRoute(request: Request, pathname: string, env: WebhookTriggerEnv): Promise<Response | null> {
  if (pathname === "/api/webhooks/ingest") return handleIngest(request, env);
  if (pathname === "/api/webhooks/test") return handleTest(request, env);
  if (pathname === "/api/webhooks/events") return handleEvents(request, env);
  return null;
}

// External, signed ingestion — the real webhook receiver. Not gated by
// operator auth (an external system posting here has no operator login
// token); the HMAC signature is the actual authentication mechanism.
async function handleIngest(request: Request, env: WebhookTriggerEnv): Promise<Response> {
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

  const event: WebhookEvent = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    payload: normalizePayload(rawBody),
  };
  await storeEvent(event, env.WEBHOOK_EVENTS);

  return Response.json({ ok: true, id: event.id }, { status: 200 });
}

// Cockpit-triggered synthetic event — no signature involved. The caller is
// the already-authenticated SPA (this route is only reachable from inside
// the RequireAuth-gated Dashboard), not an external system, so HMAC
// wouldn't make sense here even though it's still an unauthenticated
// Worker route by this repo's existing convention (see serveCatalog).
async function handleTest(request: Request, env: WebhookTriggerEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  const event: WebhookEvent = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    payload: { message: "Test event triggered from the Cockpit" },
    test: true,
  };
  await storeEvent(event, env.WEBHOOK_EVENTS);

  return Response.json({ ok: true, id: event.id }, { status: 200 });
}

async function handleEvents(request: Request, env: WebhookTriggerEnv): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

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

  const validEvents = events.filter((event): event is WebhookEvent => event !== null).reverse(); // newest first
  return Response.json({ events: validEvents });
}
