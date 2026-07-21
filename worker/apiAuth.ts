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
  if (matchesPath(pathname, method, "/api/flow/event", "POST")) return true;
  if (matchesPath(pathname, method, "/api/behavior/intelligence", "GET")) return true;
  if (matchesPath(pathname, method, "/api/experimentation/report", "GET")) return true;
  if (matchesPath(pathname, method, "/api/experimentation/assignment", "GET")) return true;
  if (matchesPath(pathname, method, "/api/traffic/activation", "GET")) return true;
  if (matchesPath(pathname, method, "/api/webhooks/ingest", "POST")) return true;
  if (matchesPath(pathname, method, "/api/ttx/live/join", "GET")) return true;
  if (matchesPath(pathname, method, "/api/engagements/create", "POST")) return true;
  if (matchesPath(pathname, method, "/api/engagements", "POST")) return true;
  if (matchesPath(pathname, method, "/api/engagements/status", "GET")) return true;
  if (matchesPath(pathname, method, "/api/public/demo-mode", "GET")) return true;
  if (matchesPath(pathname, method, "/api/register", "POST")) return true;
  // Pearl-Spectral structural runtimes (Track 5). get/set surfaces for
  // entitlements and tier are NOT listed — they stay default-deny and
  // self-check operator auth in their handlers.
  if (matchesPath(pathname, method, "/api/qualification/evidence", "POST")) return true;
  if (matchesPath(pathname, method, "/api/qualification/state", "GET")) return true;
  if (matchesPath(pathname, method, "/api/entitlements/resolve", "GET")) return true;
  if (matchesPath(pathname, method, "/api/tier/get", "GET")) return true;
  if (matchesPath(pathname, method, "/api/billing/checkout-session", "POST")) return true;
  if (matchesPath(pathname, method, "/api/billing/acquisition", "GET")) return true;
  if (matchesPath(pathname, method, "/api/webhooks/billing", "POST")) return true;
  // Autonomy layer (Track 6). /api/notifications/recent is NOT listed —
  // it stays default-deny (operator JWT).
  if (matchesPath(pathname, method, "/api/recommendation/evaluate", "POST")) return true;
  if (matchesPath(pathname, method, "/api/marketplace/intent", "POST")) return true;
  if (matchesPath(pathname, method, "/api/blueprint", "GET")) return true;
  if (matchesPath(pathname, method, "/api/register-lifecycle", "GET")) return true;
  if (matchesPath(pathname, method, "/api/register-security", "GET")) return true;
  if (matchesPath(pathname, method, "/api/register-queue", "GET")) return true;
  if (matchesPath(pathname, method, "/api/service-selector", "POST")) return true;
  if (matchesPath(pathname, method, "/api/service-selector/catalog", "GET")) return true;
  if (matchesPath(pathname, method, "/api/audit-lite/start", "POST")) return true;
  if (matchesPath(pathname, method, "/api/audit-lite/webhook", "POST")) return true;
  if (matchesPath(pathname, method, "/api/audit-lite/lifecycle", "GET")) return true;
  if (/^\/api\/audit-lite\/status\/[A-Za-z0-9_-]+$/.test(pathname) && method === "GET") return true;
  if (/^\/api\/audit-lite\/result\/[A-Za-z0-9_-]+$/.test(pathname) && method === "GET") return true;
  if (matchesPath(pathname, method, "/api/growth/track", "POST")) return true;
  if (matchesPath(pathname, method, "/api/growth/posture", "GET")) return true;
  if (matchesPath(pathname, method, "/api/ai-agent-build-spec-generate", "POST")) return true;
  if (matchesPath(pathname, method, "/api/security-remediation-plan-generate", "POST")) return true;
  if (matchesPath(pathname, method, "/api/rag-architecture-plan-generate", "POST")) return true;
  if (matchesPath(pathname, method, "/api/local-ai-deployment-plan-generate", "POST")) return true;
  if (matchesPath(pathname, method, "/api/northstar-beacon/catalog", "GET")) return true;
  if (matchesPath(pathname, method, "/api/northstar-beacon/validate", "POST")) return true;
  if (matchesPath(pathname, method, "/api/northstar-beacon/hash", "POST")) return true;
  if (matchesPath(pathname, method, "/api/northstar-beacon/generate", "POST")) return true;
  if (matchesPath(pathname, method, "/api/northstar-beacon/proposal", "POST")) return true;
  if (matchesPath(pathname, method, "/api/marketplace/service-modules", "GET")) return true;
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
