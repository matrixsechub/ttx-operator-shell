// GET /api/engine/health and GET /api/engine/version — Worker self-health,
// not the real external Engine's status. "No external calls" per spec means
// this only proves the Worker process itself is alive and responding; it
// says nothing about whether ENGINE_API_URL is reachable. For unified kernel
// status see GET /api/system/state and GET /api/system/status (kernel.ts).
//
// Deliberately unauthenticated, same as /api/marketplace/catalog — no
// Authorization check, no role/access_level gating. Identity concerns stay
// entirely in auth.ts.

import { resolveBuildInfo, stampBuildHeaders, type BuildInfoEnv } from "./buildInfo";

export interface EngineEnv extends BuildInfoEnv {}

export function handleEngineRoute(request: Request, pathname: string, env: EngineEnv): Response | null {
  if (pathname === "/api/engine/health") return handleHealth(request, env);
  if (pathname === "/api/engine/version") return handleVersion(request, env);
  return null;
}

function handleHealth(request: Request, env: EngineEnv): Response {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  return stampBuildHeaders(
    Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      env: env.DEPLOY_ENV ?? "unknown",
    }),
    env,
  );
}

function handleVersion(request: Request, env: EngineEnv): Response {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }
  const buildInfo = resolveBuildInfo(env);
  return stampBuildHeaders(
    Response.json({
      version: buildInfo.version,
      commitSha: buildInfo.commitSha,
      buildTimestamp: buildInfo.buildTimestamp,
      deployEnv: buildInfo.deployEnv,
    }),
    env,
  );
}
