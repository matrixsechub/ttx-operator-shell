// Real backend for /api/auth/* — no external Engine, no database. A single
// operator credential lives in Worker secrets (see README "Auth setup");
// sessions are stateless HS256 JWTs signed and verified in-Worker. Same
// intercept-before-proxy pattern as the Phase 14 catalog endpoint.
//
// Still deliberately absent, per scope decisions:
// - No roles/RBAC: role and access_level ride along in the token payload
//   as display-only labels, never checked against anything.
// - No full user/session database: refresh-token revocation (Phase 16)
//   uses a KV denylist keyed by token jti, not a positive session store —
//   the smallest primitive that makes "revocable" true without a DB.
//
// Phase 23: failed logins and invalid-token verifications now also record a
// lightweight security signal (see ./security) — situational awareness for
// the operator, not a lockout/throttling mechanism. Nothing here blocks a
// request because of prior failures.

import { recordSecurityEvent, type SecurityEnv } from "./security";

// Note: PBKDF2 iteration count lives in the stored hash string itself
// (pbkdf2$<iterations>$...), set by scripts/hash-password.mjs — verification
// reads it from there, so there's no constant to keep in sync here.
const ACCESS_TOKEN_TTL_SECONDS = 12 * 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

// All-optional on purpose: production values arrive via `wrangler secret put`
// (unknown to typegen), local dev values via .dev.vars. Handlers return 503
// when unconfigured — same pattern as the ENGINE_API_URL check. AUTH_REVOCATION
// is a real binding (typegen knows it), never undefined once configured.
export interface AuthEnv {
  OPERATOR_CALLSIGN?: string;
  OPERATOR_PASSWORD_HASH?: string;
  AUTH_SIGNING_KEY?: string;
  OPERATOR_ROLE?: string;
  OPERATOR_ACCESS_LEVEL?: string;
  AUTH_REVOCATION: KVNamespace;
}

interface OperatorProfile {
  id: string;
  handle: string;
  role?: string;
  access_level?: string;
}

// `type` prevents an access token being handed to /refresh (only accepts
// "refresh") or a refresh token being handed to /me (only accepts "access")
// — both signed with the same key, so without this they'd otherwise verify
// as interchangeable.
interface AccessTokenPayload extends OperatorProfile {
  type: "access";
  exp: number;
}

interface RefreshTokenPayload extends OperatorProfile {
  type: "refresh";
  jti: string;
  exp: number;
}

type TokenPayload = AccessTokenPayload | RefreshTokenPayload;

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const bin = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(data));
  return `${data}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const data = `${parts[0]}.${parts[1]}`;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      base64UrlToBytes(parts[2]),
      encoder.encode(data),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]))) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function signAccessToken(operator: OperatorProfile, secret: string): Promise<string> {
  const payload: AccessTokenPayload = {
    ...operator,
    type: "access",
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
  };
  return signToken(payload, secret);
}

async function signRefreshToken(operator: OperatorProfile, secret: string): Promise<{ token: string; jti: string }> {
  const jti = crypto.randomUUID();
  const payload: RefreshTokenPayload = {
    ...operator,
    type: "refresh",
    jti,
    exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL_SECONDS,
  };
  return { token: await signToken(payload, secret), jti };
}

// KV holds only revoked jtis (a denylist), not a positive session store —
// an unrevoked, unexpired, correctly-signed refresh token is valid by
// construction. TTL matches the refresh token's own lifetime so an entry
// always outlives whatever remained of the token it revoked.
async function isRevoked(jti: string, kv: KVNamespace): Promise<boolean> {
  return (await kv.get(jti)) !== null;
}

async function revoke(jti: string, kv: KVNamespace): Promise<void> {
  await kv.put(jti, "revoked", { expirationTtl: REFRESH_TOKEN_TTL_SECONDS });
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

// Constant-time comparison — don't leak match position via timing.
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Stored format: pbkdf2$<iterations>$<saltB64Url>$<hashB64Url>
// (generate with scripts/hash-password.mjs)
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1) return false;

  try {
    const salt = base64UrlToBytes(parts[2]);
    const expected = base64UrlToBytes(parts[3]);
    const actual = await pbkdf2(password, salt, iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function operatorFromEnv(env: AuthEnv): OperatorProfile {
  const handle = env.OPERATOR_CALLSIGN ?? "operator";
  const operator: OperatorProfile = { id: handle, handle };
  if (env.OPERATOR_ROLE) operator.role = env.OPERATOR_ROLE;
  if (env.OPERATOR_ACCESS_LEVEL) operator.access_level = env.OPERATOR_ACCESS_LEVEL;
  return operator;
}

// Reusable by other route handlers that need "is there a currently valid
// operator session" without duplicating token verification — not RBAC
// (there's one operator, no role decision), just authentication. First
// consumer: Phase 22's POST /api/webhooks/clear, a destructive action that
// (unlike the rest of this repo's unauthenticated GET/POST data routes)
// genuinely warrants requiring a valid session first.
export async function hasValidAccessToken(request: Request, env: AuthEnv & SecurityEnv): Promise<boolean> {
  if (!env.AUTH_SIGNING_KEY) return false;
  const token = bearerToken(request);
  if (!token) return false;
  const payload = await verifyToken(token, env.AUTH_SIGNING_KEY);
  if (payload?.type === "access") return true;
  // Only a present-but-invalid token counts as a signal — a missing token
  // is just an anonymous request, not an anomaly.
  await recordSecurityEvent(env.SECURITY_EVENTS, "invalid_token", {});
  return false;
}

// Returns null for /api/auth/* paths this module doesn't own so the caller
// falls through to the Engine proxy — the same graceful degradation those
// paths had before this file existed.
export async function handleAuthRoute(
  request: Request,
  pathname: string,
  env: AuthEnv & SecurityEnv,
): Promise<Response | null> {
  if (pathname === "/api/auth/login") return handleLogin(request, env);
  if (pathname === "/api/auth/me") return handleMe(request, env);
  if (pathname === "/api/auth/logout") return handleLogout(request, env);
  if (pathname === "/api/auth/refresh") return handleRefresh(request, env);
  return null;
}

async function handleLogin(request: Request, env: AuthEnv & SecurityEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  if (!env.OPERATOR_CALLSIGN || !env.OPERATOR_PASSWORD_HASH || !env.AUTH_SIGNING_KEY) {
    return Response.json({ error: "Auth is not configured on this deployment" }, { status: 503 });
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { username?: unknown; password?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.username !== "string" || typeof body.password !== "string") {
    return Response.json({ error: "username and password are required" }, { status: 400 });
  }

  // Always run the (deliberately slow) hash comparison, and return the same
  // 401 for a wrong callsign as for a wrong passphrase — don't reveal which.
  const passwordOk = await verifyPassword(body.password, env.OPERATOR_PASSWORD_HASH);
  if (body.username !== env.OPERATOR_CALLSIGN || !passwordOk) {
    // Username only, never the password — details are stored in KV and
    // surfaced in the cockpit feed.
    await recordSecurityEvent(env.SECURITY_EVENTS, "auth_failed", { username: body.username });
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const operator = operatorFromEnv(env);
  const token = await signAccessToken(operator, env.AUTH_SIGNING_KEY);
  const { token: refreshToken } = await signRefreshToken(operator, env.AUTH_SIGNING_KEY);
  return Response.json({ token, refreshToken, operator });
}

async function handleMe(request: Request, env: AuthEnv): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  if (!env.AUTH_SIGNING_KEY) {
    return Response.json({ error: "Auth is not configured on this deployment" }, { status: 503 });
  }

  const token = bearerToken(request);
  if (!token) {
    return Response.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const payload = await verifyToken(token, env.AUTH_SIGNING_KEY);
  if (!payload || payload.type !== "access") {
    return Response.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const { exp, type, ...operator } = payload;
  void exp;
  void type;
  return Response.json({ operator });
}

async function handleRefresh(request: Request, env: AuthEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  if (!env.AUTH_SIGNING_KEY) {
    return Response.json({ error: "Auth is not configured on this deployment" }, { status: 503 });
  }

  const token = bearerToken(request);
  if (!token) {
    return Response.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const payload = await verifyToken(token, env.AUTH_SIGNING_KEY);
  if (!payload || payload.type !== "refresh") {
    return Response.json({ error: "Invalid or expired refresh token" }, { status: 401 });
  }
  if (await isRevoked(payload.jti, env.AUTH_REVOCATION)) {
    return Response.json({ error: "Refresh token has been revoked" }, { status: 401 });
  }

  // Rotate: the presented refresh token is single-use. Revoke it before
  // issuing replacements so a network retry can't reuse it.
  await revoke(payload.jti, env.AUTH_REVOCATION);

  const { exp, jti, type, ...operator } = payload;
  void exp;
  void jti;
  void type;

  const newAccessToken = await signAccessToken(operator, env.AUTH_SIGNING_KEY);
  const { token: newRefreshToken } = await signRefreshToken(operator, env.AUTH_SIGNING_KEY);
  return Response.json({ token: newAccessToken, refreshToken: newRefreshToken, operator });
}

async function handleLogout(request: Request, env: AuthEnv): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  // Best-effort: revoke the refresh token if one was sent, but logout always
  // succeeds locally either way (the SPA discards both tokens regardless —
  // see AuthContext.logout). No body, a malformed body, or a token that
  // fails to verify are all treated the same as "nothing to revoke", not
  // an error — logout shouldn't be blockable by a bad request.
  try {
    const body = (await request.json()) as { refreshToken?: unknown };
    if (typeof body.refreshToken === "string" && env.AUTH_SIGNING_KEY) {
      const payload = await verifyToken(body.refreshToken, env.AUTH_SIGNING_KEY);
      if (payload?.type === "refresh") {
        await revoke(payload.jti, env.AUTH_REVOCATION);
      }
    }
  } catch {
    // No/invalid JSON body — nothing to revoke, not an error.
  }

  return Response.json({ ok: true });
}
