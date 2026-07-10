// Phase 36 — Live TTX HTTP route handler.
//
// Wires /api/ttx/live/* into the Worker. Every host/create/close/state/token
// route requires a valid operator Bearer token (same verifyToken check as
// the rest of the auth-gated API). The /join route accepts a short-lived
// participant join token and upgrades to WebSocket by proxying to the
// LiveTtxSession Durable Object.
//
// Participant join tokens are signed with LIVE_SESSION_SECRET (separate from
// AUTH_SIGNING_KEY) so a stolen join token cannot be used as an operator
// access token and vice versa. Routes return 503 if this secret is absent.

import { signToken, verifyToken } from "./edge/crypto";
import { getAccessTokenOperator } from "./auth";
import type { AuthEnv } from "./auth";
import type { SecurityEnv } from "./security";
import type { LiveJoinTokenPayload } from "./liveTtxProtocol";

const JOIN_TOKEN_TTL_SECONDS = 6 * 60 * 60; // 6h

export interface LiveTtxEnv {
  LIVE_TTX_SESSIONS: DurableObjectNamespace<import("./liveSession").LiveTtxSession>;
  LIVE_SESSION_SECRET?: string;
  TTX_STATE: KVNamespace;
  AUTH_REVOCATION: KVNamespace;
  AUTH_SIGNING_KEY?: string;
  OPERATOR_ROLE?: string;
  OPERATOR_ACCESS_LEVEL?: string;
}

export async function handleLiveTtxRoute(
  request: Request,
  pathname: string,
  env: LiveTtxEnv & SecurityEnv,
): Promise<Response | null> {
  if (!pathname.startsWith("/api/ttx/live/") && pathname !== "/api/ttx/live") return null;

  const sub = pathname.slice("/api/ttx/live".length); // e.g. "/create", "/join", ...

  if (sub === "/create") return handleCreate(request, env);
  if (sub === "/token") return handleToken(request, env);
  if (sub === "/join") return handleJoin(request, env);
  if (sub.startsWith("/state")) return handleState(request, sub, env);
  if (sub.startsWith("/close")) return handleClose(request, sub, env);
  return null;
}

// ── POST /api/ttx/live/create ─────────────────────────────────────────────

async function handleCreate(request: Request, env: LiveTtxEnv & SecurityEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  const operator = await getOperator(request, env);
  if (!operator) return Response.json({ error: "authentication required" }, { status: 401 });

  if (!env.LIVE_SESSION_SECRET) {
    return Response.json({ error: "Live sessions not configured — set LIVE_SESSION_SECRET" }, { status: 503 });
  }

  let body: { scenarioId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.scenarioId !== "string" || !body.scenarioId.trim()) {
    return Response.json({ error: "scenarioId is required" }, { status: 400 });
  }

  const sessionId = crypto.randomUUID();
  const code = generateCode();

  // Provision the DO instance keyed by code.
  const stub = doStub(env, code);
  const createResp = await stub.fetch(
    new Request("https://do-internal/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        code,
        scenarioId: body.scenarioId,
        hostOperatorId: operator.id,
      }),
    }),
  );
  if (!createResp.ok) {
    const err = await createResp.json().catch(() => ({ error: "DO error" })) as { error?: string };
    return Response.json({ error: err.error ?? "Failed to create session" }, { status: 500 });
  }

  // Create a host join token so the host can connect via WebSocket.
  const hostParticipantId = `host_${operator.id}`;
  const hostToken = await signJoinToken(env.LIVE_SESSION_SECRET, {
    sub: hostParticipantId,
    sessionCode: code,
    displayName: operator.handle ?? operator.id,
    assignedRole: "host",
    isHost: true,
  });

  return Response.json({ sessionId, code, hostToken }, { status: 201 });
}

// ── POST /api/ttx/live/token ──────────────────────────────────────────────

async function handleToken(request: Request, env: LiveTtxEnv & SecurityEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  const operator = await getOperator(request, env);
  if (!operator) return Response.json({ error: "authentication required" }, { status: 401 });

  if (!env.LIVE_SESSION_SECRET) {
    return Response.json({ error: "Live sessions not configured" }, { status: 503 });
  }

  let body: { code?: unknown; name?: unknown; role?: unknown; isObserver?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.code !== "string" || typeof body.name !== "string" || typeof body.role !== "string") {
    return Response.json({ error: "code, name, and role are required" }, { status: 400 });
  }
  const name = body.name.trim().slice(0, 80);
  const role = body.role.trim().slice(0, 80);
  const isObserver = body.isObserver === true || role === "Observer";

  const participantId = crypto.randomUUID();
  const token = await signJoinToken(env.LIVE_SESSION_SECRET, {
    sub: participantId,
    sessionCode: body.code,
    displayName: name,
    assignedRole: role,
    isObserver,
  });

  return Response.json({ participantId, token });
}

// ── GET /api/ttx/live/join?token=... ─────────────────────────────────────

async function handleJoin(request: Request, env: LiveTtxEnv): Promise<Response> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return Response.json({ error: "WebSocket upgrade required" }, { status: 426 });
  }

  if (!env.LIVE_SESSION_SECRET) {
    return Response.json({ error: "Live sessions not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return Response.json({ error: "Missing token" }, { status: 400 });

  // Peek at token to extract sessionCode — full validation happens in the DO.
  const verified = await verifyToken(token, env.LIVE_SESSION_SECRET);
  if (!verified.ok) {
    return Response.json({ error: `Invalid token: ${verified.error}` }, { status: 403 });
  }
  const payload = verified.payload as Partial<LiveJoinTokenPayload>;
  if (payload.type !== "live_join" || typeof payload.sessionCode !== "string") {
    return Response.json({ error: "Wrong token type" }, { status: 403 });
  }

  const stub = doStub(env, payload.sessionCode);
  // Forward the WebSocket upgrade to the DO, passing the token as a query param.
  return stub.fetch(
    new Request(`https://do-internal/ws?token=${encodeURIComponent(token)}`, {
      method: "GET",
      headers: request.headers,
    }),
  );
}

// ── GET /api/ttx/live/state?code=... ─────────────────────────────────────

async function handleState(request: Request, sub: string, env: LiveTtxEnv & SecurityEnv): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const operator = await getOperator(request, env);
  if (!operator) return Response.json({ error: "authentication required" }, { status: 401 });

  const code = extractCode(sub, request);
  if (!code) return Response.json({ error: "code is required" }, { status: 400 });

  return doStub(env, code).fetch(new Request("https://do-internal/state", { method: "GET" }));
}

// ── POST /api/ttx/live/close?code=... ────────────────────────────────────

async function handleClose(request: Request, sub: string, env: LiveTtxEnv & SecurityEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  const operator = await getOperator(request, env);
  if (!operator) return Response.json({ error: "authentication required" }, { status: 401 });

  const code = extractCode(sub, request);
  if (!code) return Response.json({ error: "code is required" }, { status: 400 });

  let body: { action?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // No body is fine.
  }

  return doStub(env, code).fetch(
    new Request("https://do-internal/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: body.action }),
    }),
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function doStub(env: LiveTtxEnv, code: string): DurableObjectStub {
  const id = env.LIVE_TTX_SESSIONS.idFromName(code);
  return env.LIVE_TTX_SESSIONS.get(id);
}

async function getOperator(
  request: Request,
  env: LiveTtxEnv & SecurityEnv,
): Promise<{ id: string; handle?: string } | null> {
  // Cast to the AuthEnv shape getAccessTokenOperator expects.
  const authEnv = env as unknown as AuthEnv & SecurityEnv;
  return getAccessTokenOperator(request, authEnv);
}

function extractCode(sub: string, request: Request): string | null {
  // Support both path segment (/state/ROOMCODE) and query param (?code=ROOMCODE).
  const slug = sub.split("/").filter(Boolean)[1]; // e.g. /state/ABCD12 → "ABCD12"
  if (slug) return slug;
  const url = new URL(request.url);
  return url.searchParams.get("code");
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0 I/1 confusion
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) code += chars[b % chars.length];
  return code;
}

async function signJoinToken(
  secret: string,
  fields: Omit<LiveJoinTokenPayload, "type" | "exp" | "nonce">,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: LiveJoinTokenPayload = {
    type: "live_join",
    exp: now + JOIN_TOKEN_TTL_SECONDS,
    nonce: crypto.randomUUID(),
    ...fields,
  };
  return signToken(secret, payload as unknown as Record<string, unknown>);
}
