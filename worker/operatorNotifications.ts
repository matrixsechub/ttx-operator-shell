/**
 * PEARL-SPECTRAL — OPERATOR NOTIFICATIONS (Track 6, live)
 * ---------------------------------------------------------------------------
 * The sanctioned worker → n8n → operator notification channel.
 *
 * Dispatch model:
 *  - If N8N_NOTIFY_WEBHOOK_URL is configured: POST the event envelope as
 *    JSON, HMAC-SHA256-signed via X-Pearl-Signature when N8N_NOTIFY_SECRET
 *    is also set (same Web Crypto style as auth.ts). Fire-and-forget —
 *    notification egress may never fail a user-facing request.
 *  - ALWAYS: append to the KV ring log (last 50, 7-day TTL) and emit one
 *    structured console line, so notifications are observable without n8n.
 *  - If the URL is unset there is NO egress of any kind.
 *
 * Capture-policy note (R12/R15): this is operator-notification egress to
 * an explicitly configured endpoint — not growth capture and not a debug
 * ingest. Events carry ids and kinds, never form contents or credentials.
 *
 * Endpoint:
 *   GET /api/notifications/recent  — operator JWT (default-deny gate) —
 *   ring-log reader for the cockpit.
 */

export type NotificationKind =
  | "qualify-reached"
  | "marketplace-intent"
  | "entitlement-grant"
  | "tier-upgrade"
  | "billing-webhook"
  | "qualification-anomaly";

export interface OperatorNotification {
  kind: NotificationKind;
  at: string;
  subject?: string;
  captureId?: string;
  data?: Record<string, string | number | boolean | null>;
}

export interface NotificationsEnv {
  TTX_STATE?: KVNamespace;
  N8N_NOTIFY_WEBHOOK_URL?: string;
  N8N_NOTIFY_SECRET?: string;
}

const RING_LOG_KEY = "pearl:notifications:log";
const RING_LOG_MAX = 50;
const RING_LOG_TTL_SECONDS = 7 * 24 * 60 * 60;

async function signBody(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function appendToRingLog(kv: KVNamespace, event: OperatorNotification): Promise<void> {
  let log: OperatorNotification[] = [];
  try {
    const raw = await kv.get(RING_LOG_KEY);
    if (raw) log = JSON.parse(raw) as OperatorNotification[];
  } catch {
    log = [];
  }
  log.unshift(event);
  if (log.length > RING_LOG_MAX) log.length = RING_LOG_MAX;
  await kv.put(RING_LOG_KEY, JSON.stringify(log), { expirationTtl: RING_LOG_TTL_SECONDS });
}

/**
 * Emit an operator notification. Never throws; never blocks the caller's
 * response path beyond the KV log append.
 */
export async function notifyOperator(
  env: NotificationsEnv,
  event: Omit<OperatorNotification, "at"> & { at?: string },
): Promise<void> {
  const enriched: OperatorNotification = { ...event, at: event.at ?? new Date().toISOString() };

  console.log(
    JSON.stringify({
      level: "info",
      scope: "operator-notification",
      kind: enriched.kind,
      subject: enriched.subject ?? null,
      captureId: enriched.captureId ?? null,
      at: enriched.at,
    }),
  );

  try {
    if (env.TTX_STATE) await appendToRingLog(env.TTX_STATE, enriched);
  } catch {
    // ring log is best-effort
  }

  const url = env.N8N_NOTIFY_WEBHOOK_URL;
  if (!url) return; // no egress when unconfigured — by design

  const body = JSON.stringify(enriched);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    if (env.N8N_NOTIFY_SECRET) {
      headers["X-Pearl-Signature"] = await signBody(body, env.N8N_NOTIFY_SECRET);
    }
  } catch {
    // signing failure downgrades to unsigned rather than dropping the event
  }

  void fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(5000) }).catch(() => {
    // fire-and-forget: n8n unavailability never surfaces to visitors
  });
}

export async function readRecentNotifications(env: NotificationsEnv): Promise<OperatorNotification[]> {
  if (!env.TTX_STATE) return [];
  try {
    const raw = await env.TTX_STATE.get(RING_LOG_KEY);
    return raw ? (JSON.parse(raw) as OperatorNotification[]) : [];
  } catch {
    return [];
  }
}

/** GET /api/notifications/recent — operator-gated by the default-deny apiAuth gate. */
export async function handleNotificationsRoute(
  request: Request,
  pathname: string,
  env: NotificationsEnv,
): Promise<Response | null> {
  if (pathname !== "/api/notifications/recent") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  const events = await readRecentNotifications(env);
  return Response.json({ events, egressConfigured: Boolean(env.N8N_NOTIFY_WEBHOOK_URL) });
}
