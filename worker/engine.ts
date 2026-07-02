// GET /api/engine/health and GET /api/engine/version — Worker self-health,
// not the real external Engine's status. "No external calls" per spec means
// this only proves the Worker process itself is alive and responding; it
// says nothing about whether ENGINE_API_URL is reachable. That's what
// /api/system/status (proxied, see proxyToEngine in index.ts) and the
// SystemTelemetryPanel/Status.tsx surfaces already report on, and this
// doesn't replace or touch either of those.
//
// Deliberately unauthenticated, same as /api/marketplace/catalog — no
// Authorization check, no role/access_level gating. Identity concerns stay
// entirely in auth.ts.

export interface EngineEnv {
  DEPLOY_ENV?: string;
  APP_VERSION?: string;
}

export function handleEngineRoute(request: Request, pathname: string, env: EngineEnv): Response | null {
  if (pathname === "/api/engine/health") return handleHealth(request, env);
  if (pathname === "/api/engine/version") return handleVersion(request, env);
  return null;
}

function handleHealth(request: Request, env: EngineEnv): Response {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: env.DEPLOY_ENV ?? "unknown",
  });
}

function handleVersion(request: Request, env: EngineEnv): Response {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  return Response.json({ version: env.APP_VERSION ?? "0.0.0" });
}
