// Real backend for /api/auth/* — no external Engine, no database. A single
// operator credential lives in Worker secrets (see README "Auth setup");
// sessions are stateless HS256 JWTs signed and verified in-Worker. Same
// intercept-before-proxy pattern as the Phase 14 catalog endpoint.
//
// Deliberately absent, per scope decisions:
// - No refresh tokens: rotation needs a server-side store to revoke
//   against, and nothing in the SPA calls /api/auth/refresh. Tokens expire
//   after TOKEN_TTL_SECONDS; re-login after that.
// - No roles/RBAC: role and access_level ride along in the token payload
//   as display-only labels, never checked against anything.

// Note: PBKDF2 iteration count lives in the stored hash string itself
// (pbkdf2$<iterations>$...), set by scripts/hash-password.mjs — verification
// reads it from there, so there's no constant to keep in sync here.
const TOKEN_TTL_SECONDS = 12 * 60 * 60;

// All-optional on purpose: production values arrive via `wrangler secret put`
// (unknown to typegen), local dev values via .dev.vars. Handlers return 503
// when unconfigured — same pattern as the ENGINE_API_URL check.
export interface AuthEnv {
  OPERATOR_CALLSIGN?: string;
  OPERATOR_PASSWORD_HASH?: string;
  AUTH_SIGNING_KEY?: string;
  OPERATOR_ROLE?: string;
  OPERATOR_ACCESS_LEVEL?: string;
}

interface OperatorProfile {
  id: string;
  handle: string;
  role?: string;
  access_level?: string;
}

interface TokenPayload extends OperatorProfile {
  exp: number;
}

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

// Returns null for /api/auth/* paths this module doesn't own (e.g. a future
// /api/auth/refresh) so the caller falls through to the Engine proxy — the
// same graceful degradation those paths had before this file existed.
export async function handleAuthRoute(request: Request, pathname: string, env: AuthEnv): Promise<Response | null> {
  if (pathname === "/api/auth/login") return handleLogin(request, env);
  if (pathname === "/api/auth/me") return handleMe(request, env);
  if (pathname === "/api/auth/logout") return handleLogout(request);
  return null;
}

async function handleLogin(request: Request, env: AuthEnv): Promise<Response> {
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
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const operator = operatorFromEnv(env);
  const token = await signToken(
    { ...operator, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS },
    env.AUTH_SIGNING_KEY,
  );
  return Response.json({ token, operator });
}

async function handleMe(request: Request, env: AuthEnv): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  if (!env.AUTH_SIGNING_KEY) {
    return Response.json({ error: "Auth is not configured on this deployment" }, { status: 503 });
  }

  const authorization = request.headers.get("Authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  if (!token) {
    return Response.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const payload = await verifyToken(token, env.AUTH_SIGNING_KEY);
  if (!payload) {
    return Response.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const { exp, ...operator } = payload;
  void exp;
  return Response.json({ operator });
}

function handleLogout(request: Request): Response {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }
  // Stateless tokens + no DB means there's nothing server-side to revoke.
  // The SPA discards its token (AuthContext.logout) and TOKEN_TTL_SECONDS
  // bounds the remaining window. A real revocation list needs KV/D1 —
  // deliberately out of scope per the no-database decision.
  return Response.json({ ok: true });
}
