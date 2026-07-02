// Lightweight operator security signals (Phase 23) — not a threat detection
// engine, not RBAC, not a security module system. Derives simple anomaly
// counters from data auth.ts and webhookTrigger.ts already produce (failed
// logins, invalid tokens, malformed/duplicate/spiking webhook payloads) and
// stores them in one shared KV namespace so the cockpit has a single feed
// to poll. Same intercept-before-proxy, same retention-then-list pattern as
// webhookTrigger.ts — deliberately not a new architectural shape.

const MAX_STORED_SECURITY_EVENTS = 50;
const FEED_LIMIT = 20;
const EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface SecurityEnv {
  SECURITY_EVENTS: KVNamespace;
}

export type SecurityEventType =
  | "auth_failed"
  | "invalid_token"
  | "webhook_malformed"
  | "webhook_signature_failed"
  | "webhook_duplicate_payload"
  | "webhook_burst"
  | "webhook_spike";

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  timestamp: string;
  details?: Record<string, unknown>;
}

// Same oldest-excess-deleted retention shape as webhookTrigger.ts's
// enforceRetention — kept as its own copy rather than a shared helper since
// the two operate on different KV namespaces/prefixes and the logic is only
// five lines; extracting it would be more indirection than it saves.
async function enforceRetention(kv: KVNamespace): Promise<void> {
  try {
    const listed = await kv.list({ prefix: "sec:", limit: 1000 });
    if (listed.keys.length <= MAX_STORED_SECURITY_EVENTS) return;
    const excess = listed.keys.length - MAX_STORED_SECURITY_EVENTS;
    const oldestKeys = listed.keys.slice(0, excess); // ascending order = oldest first
    await Promise.all(oldestKeys.map((key) => kv.delete(key.name)));
  } catch (err) {
    console.error("security: retention cleanup failed", err instanceof Error ? err.message : err);
  }
}

// Called from auth.ts's and webhookTrigger.ts's own failure paths. Never
// throws into the caller — a signal write failing shouldn't turn an
// otherwise-handled 401/400 into a 500 for the operator or external caller.
export async function recordSecurityEvent(
  kv: KVNamespace,
  type: SecurityEventType,
  details?: Record<string, unknown>,
): Promise<void> {
  const event: SecurityEvent = { id: crypto.randomUUID(), type, timestamp: new Date().toISOString(), details };
  try {
    await kv.put(`sec:${event.timestamp}:${event.id}`, JSON.stringify(event), { expirationTtl: EVENT_TTL_SECONDS });
  } catch (err) {
    console.error("security: failed to store event", type, err instanceof Error ? err.message : err);
    return;
  }
  await enforceRetention(kv);
}

export async function handleSecurityRoute(
  request: Request,
  pathname: string,
  env: SecurityEnv,
): Promise<Response | null> {
  if (pathname === "/api/security/events") return handleEvents(request, env);
  return null;
}

// No pagination — retention already caps this at MAX_STORED_SECURITY_EVENTS
// (50), and the feed only ever shows the newest 20. Same "small dataset,
// slice in memory" reasoning as webhookTrigger.ts's handleEvents.
async function handleEvents(request: Request, env: SecurityEnv): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  try {
    const listed = await env.SECURITY_EVENTS.list({ prefix: "sec:", limit: MAX_STORED_SECURITY_EVENTS });
    const events = await Promise.all(
      listed.keys.map(async (key) => {
        const raw = await env.SECURITY_EVENTS.get(key.name);
        if (!raw) return null;
        try {
          return JSON.parse(raw) as SecurityEvent;
        } catch {
          return null;
        }
      }),
    );
    const newestFirst = events.filter((event): event is SecurityEvent => event !== null).reverse();
    return Response.json({ events: newestFirst.slice(0, FEED_LIMIT) });
  } catch (err) {
    console.error("security: failed to list events", err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to retrieve security events" }, { status: 500 });
  }
}
