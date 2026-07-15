import { classifyRoute } from "./routeClass";
import { makeCtxHash, signToken, timingSafeEqual, verifyToken } from "./crypto";
import { rateLimitFor } from "./rateLimit";

export interface EdgeEnv {
  OPERATOR_SECRET?: string;
  MARKETPLACE_SECRET?: string;
  AUTH_SIGNING_KEY?: string;
  OPERATOR_PASSWORD?: string;
  OPERATOR_USERNAME?: string;
}

const OPERATOR_TOKEN_TYPE = "edge_operator";
const OPERATOR_TOKEN_AUDIENCE = "ttx-operator-shell";
const OPERATOR_TOKEN_SCOPE = "operator:edge";

function operatorSecret(env: EdgeEnv): string | undefined {
  return env.OPERATOR_SECRET;
}

function marketplaceSecret(env: EdgeEnv): string | undefined {
  return env.MARKETPLACE_SECRET;
}

async function readCredentials(request: Request): Promise<{ username: string; password: string }> {
  try {
    const body = (await request.json()) as { username?: unknown; password?: unknown };
    return {
      username: typeof body.username === "string" ? body.username : "",
      password: typeof body.password === "string" ? body.password : "",
    };
  } catch {
    return { username: "", password: "" };
  }
}

async function authenticateOperator(request: Request, env: EdgeEnv): Promise<Response | null> {
  const opSecret = operatorSecret(env);
  if (!env.OPERATOR_PASSWORD || !opSecret) {
    return Response.json(
      { error: "operator credentials not configured", code: "OPERATOR_AUTH_UNAVAILABLE" },
      { status: 503 },
    );
  }

  const body = await readCredentials(request);
  const expectedUser = env.OPERATOR_USERNAME || "operator";
  const [userOk, passOk] = await Promise.all([
    timingSafeEqual(body.username, expectedUser),
    timingSafeEqual(body.password, env.OPERATOR_PASSWORD),
  ]);
  if (!userOk || !passOk) {
    return Response.json({ error: "invalid credentials" }, { status: 401 });
  }

  return null;
}

async function issueOperatorToken(env: EdgeEnv): Promise<{ token: string; expiresAt: string }> {
  const opSecret = operatorSecret(env);
  if (!opSecret) throw new Error("operator signing secret unavailable");

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;
  const token = await signToken(opSecret, {
    sub: "operator",
    type: OPERATOR_TOKEN_TYPE,
    aud: OPERATOR_TOKEN_AUDIENCE,
    scope: OPERATOR_TOKEN_SCOPE,
    jti: crypto.randomUUID(),
    iat: now,
    exp,
  });

  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

/**
 * Canonical POST /api/operator/auth from live mshops-public worker.
 */
export async function handleOperatorAuth(
  request: Request,
  pathname: string,
  env: EdgeEnv,
): Promise<Response | null> {
  if (pathname !== "/api/operator/auth" || request.method !== "POST") return null;

  const blocked = await authenticateOperator(request, env);
  if (blocked) return blocked;

  const issued = await issueOperatorToken(env);
  return Response.json({ token: issued.token, expires: 3600, expires_at: issued.expiresAt });
}

/**
 * WILDCARD Cycle 1 — authenticated operator session bootstrap (edge JWT).
 */
export async function handleOperatorSession(
  request: Request,
  pathname: string,
  env: EdgeEnv,
): Promise<Response | null> {
  if (pathname !== "/api/operator/session" || request.method !== "POST") return null;

  const blocked = await authenticateOperator(request, env);
  if (blocked) return blocked;

  const issued = await issueOperatorToken(env);
  return Response.json({
    operator_token: issued.token,
    token: issued.token,
    namespace: "session:operator",
    agent: "WildcardAdvancementAgent",
    expires_at: issued.expiresAt,
    expires: 3600,
  });
}

/**
 * Live mshops-public edge gate — returns a Response when the request must be
 * blocked; null when the caller should continue handling.
 */
export async function edgeAuthGate(
  request: Request,
  pathname: string,
  env: EdgeEnv,
): Promise<Response | null> {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!rateLimitFor(pathname, ip)) {
    return Response.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  const routeClass = classifyRoute(pathname, request.method);
  if (routeClass === "public") return null;

  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    const hint =
      routeClass === "marketplace"
        ? "POST /api/marketplace/session to obtain token"
        : "Authorization: Bearer <token>";
    return Response.json({ error: "authentication required", hint }, { status: 401 });
  }

  const secret = routeClass === "marketplace" ? marketplaceSecret(env) : operatorSecret(env);
  if (!secret) {
    return Response.json({ error: "edge auth secrets not configured" }, { status: 503 });
  }

  const verified = await verifyToken(token, secret);
  if (!verified.ok) {
    const status = routeClass === "operator" ? 403 : 401;
    return Response.json({ error: routeClass === "operator" ? "forbidden" : verified.error, reason: verified.error }, { status });
  }

  if (routeClass === "operator") {
    const payload = verified.payload;
    if (
      payload.type !== OPERATOR_TOKEN_TYPE ||
      payload.aud !== OPERATOR_TOKEN_AUDIENCE ||
      payload.scope !== OPERATOR_TOKEN_SCOPE ||
      payload.sub !== "operator" ||
      typeof payload.jti !== "string"
    ) {
      return Response.json({ error: "forbidden", reason: "operator_token_scope_invalid" }, { status: 403 });
    }
  }

  // Live canonical: ctx-hash binding applies to marketplace routes only.
  if (routeClass === "marketplace") {
    const ctxHash = await makeCtxHash(ip, request.headers.get("User-Agent") || "");
    const tokenCtx = verified.payload.ctx;
    if (typeof tokenCtx !== "string" || tokenCtx !== ctxHash) {
      return Response.json({ error: "forbidden", reason: "binding_mismatch" }, { status: 403 });
    }
  }

  return null;
}

export { classifyRoute };
