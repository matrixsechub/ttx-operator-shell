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

function operatorSecret(env: EdgeEnv): string | undefined {
  return env.OPERATOR_SECRET || env.AUTH_SIGNING_KEY;
}

function marketplaceSecret(env: EdgeEnv): string | undefined {
  return env.MARKETPLACE_SECRET || env.OPERATOR_SECRET || env.AUTH_SIGNING_KEY;
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

  const opSecret = operatorSecret(env);
  if (!env.OPERATOR_PASSWORD || !opSecret) {
    return Response.json(
      { error: "operator credentials not configured", hint: "Set OPERATOR_PASSWORD secret" },
      { status: 503 },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    body = {};
  }

  const expectedUser = env.OPERATOR_USERNAME || "operator";
  const [userOk, passOk] = await Promise.all([
    timingSafeEqual(body.username || "", expectedUser),
    timingSafeEqual(body.password || "", env.OPERATOR_PASSWORD),
  ]);
  if (!userOk || !passOk) {
    return Response.json({ error: "invalid credentials" }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(opSecret, { sub: "operator", iat: now, exp: now + 3600 });
  return Response.json({ token, expires: 3600 });
}

/**
 * WILDCARD Cycle 1 — operator session bootstrap (edge JWT).
 * FEDGRADE: Compliance preserved — public bootstrap route; token required for protected APIs.
 */
export async function handleOperatorSession(
  request: Request,
  pathname: string,
  env: EdgeEnv,
): Promise<Response | null> {
  if (pathname !== "/api/operator/session" || request.method !== "POST") return null;

  const opSecret = operatorSecret(env);
  if (!opSecret) {
    return Response.json(
      { error: "operator credentials not configured", code: "OPERATOR_AUTH_UNAVAILABLE" },
      { status: 503 },
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(opSecret, { sub: "operator", iat: now, exp: now + 3600 });
  const expiresAt = new Date((now + 3600) * 1000).toISOString();

  return Response.json({
    operator_token: token,
    token,
    namespace: "session:operator",
    agent: "WildcardAdvancementAgent",
    expires_at: expiresAt,
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
