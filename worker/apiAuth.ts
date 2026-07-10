import { getAccessTokenOperator, type AuthEnv } from "./auth";
import { classifyRoute } from "./edge/routeClass";
import { stampBuildHeaders, type BuildInfoEnv } from "./buildInfo";

type ApiAuthEnv = AuthEnv & BuildInfoEnv;

function matchesPath(pathname: string, method: string, targetPath: string, targetMethod?: string): boolean {
  if (pathname !== targetPath) return false;
  if (targetMethod && method !== targetMethod) return false;
  return true;
}

export function isPublicApiRoute(pathname: string, method: string): boolean {
  if (matchesPath(pathname, method, "/api/auth/login", "POST")) return true;
  if (matchesPath(pathname, method, "/api/auth/refresh", "POST")) return true;
  if (matchesPath(pathname, method, "/api/auth/logout", "POST")) return true;
  if (matchesPath(pathname, method, "/api/marketplace/catalog", "GET")) return true;
  if (matchesPath(pathname, method, "/api/engine/health", "GET")) return true;
  if (matchesPath(pathname, method, "/api/engine/version", "GET")) return true;
  if (matchesPath(pathname, method, "/api/build-info", "GET")) return true;
  if (matchesPath(pathname, method, "/api/system/health", "GET")) return true;
  if (matchesPath(pathname, method, "/api/system/status", "GET")) return true;
  if (matchesPath(pathname, method, "/api/usage/event", "POST")) return true;
  if (matchesPath(pathname, method, "/api/behavior/intelligence", "GET")) return true;
  if (matchesPath(pathname, method, "/api/webhooks/ingest", "POST")) return true;
  if (matchesPath(pathname, method, "/api/ttx/live/join", "GET")) return true;
  if (matchesPath(pathname, method, "/api/engagements/create", "POST")) return true;
  if (pathname === "/api/marketplace-lifecycle" || pathname.startsWith("/api/marketplace-lifecycle/")) {
    return true;
  }
  return false;
}

export async function enforceOperatorApiAuth(
  request: Request,
  pathname: string,
  env: ApiAuthEnv,
): Promise<Response | null> {
  if (!pathname.startsWith("/api/")) return null;

  const routeClass = classifyRoute(pathname, request.method);
  if (routeClass !== "public") {
    return null;
  }

  if (isPublicApiRoute(pathname, request.method)) {
    return null;
  }

  const operator = await getAccessTokenOperator(request, env);
  if (operator) {
    return null;
  }

  return stampBuildHeaders(
    Response.json({ error: "Operator authentication required", code: "OPERATOR_AUTH_REQUIRED" }, { status: 401 }),
    env,
  );
}
