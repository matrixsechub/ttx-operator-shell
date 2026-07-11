export type RouteClass = "public" | "operator" | "marketplace";

const OPERATOR_PROTECTED = [
  /^\/api\/operator\//,
  /^\/api\/wildcard$/,
  /^\/api\/wildcard\//,
  /^\/api\/debug\//,
  /^\/api\/audit\//,
  /^\/api\/lifecycle\/advance\//,
  /^\/api\/marketplace\/audit$/,
  /^\/api\/fedgrade\//,
  /^\/api\/governance\/propose$/,
  /^\/api\/governance\/approve$/,
  /^\/api\/ai\/infer$/,
  /^\/api\/ai\/usage$/,
  /^\/api\/ai\/mcp\/signal$/,
  /^\/api\/ai\/marketplace\//,
  /^\/api\/council\/packet$/,
  /^\/api\/council\/prism-advisories$/,
  /^\/api\/telemetry\/events$/,
];

const MARKETPLACE_PROTECTED = [/^\/api\/marketplace\/integrity$/, /^\/api\/hsx$/];

export function classifyRoute(pathname: string, method: string): RouteClass {
  if (pathname === "/api/operator/auth") return "public";
  if (pathname === "/api/operator/session" && method === "POST") return "public";
  if (pathname === "/api/marketplace/session") return "public";
  if (pathname === "/api/hsx/session") return "public";
  if (pathname === "/api/marketplace-lifecycle" || pathname.startsWith("/api/marketplace-lifecycle/")) {
    return "public";
  }
  if (pathname === "/api/engagements/create" && method === "POST") return "public";
  if (pathname === "/api/engagements" && method === "POST") return "public";
  if (pathname === "/api/engagements/status" && method === "GET") return "public";
  if (pathname === "/api/public/demo-mode" && method === "GET") return "public";
  if (pathname === "/api/register" && method === "POST") return "public";
  if (pathname === "/api/register-lifecycle" && method === "GET") return "public";
  if (pathname === "/api/register-security" && method === "GET") return "public";
  if (pathname === "/api/register-queue" && method === "GET") return "public";
  if (pathname === "/api/service-selector" && method === "POST") return "public";
  if (pathname === "/api/service-selector/catalog" && method === "GET") return "public";
  if (pathname === "/api/audit-lite/start" && method === "POST") return "public";
  if (pathname === "/api/audit-lite/webhook" && method === "POST") return "public";
  if (pathname === "/api/audit-lite/lifecycle" && method === "GET") return "public";
  if (/^\/api\/audit-lite\/status\/[A-Za-z0-9_-]+$/.test(pathname) && method === "GET") return "public";
  if (/^\/api\/audit-lite\/result\/[A-Za-z0-9_-]+$/.test(pathname) && method === "GET") return "public";
  if (pathname === "/api/growth/track" && method === "POST") return "public";
  if (pathname === "/api/flow/event" && method === "POST") return "public";
  if (pathname === "/api/flow/experiment/assignment" && method === "GET") return "public";
  if (pathname === "/api/growth/intent-capture" && method === "POST") return "public";
  if (pathname === "/api/growth/intent-handoff" && method === "POST") return "public";
  if (pathname === "/api/growth/posture" && method === "GET") return "public";
  if (pathname === "/api/ai-agent-build-spec-generate" && method === "POST") return "public";
  if (pathname === "/api/security-remediation-plan-generate" && method === "POST") return "public";
  if (pathname === "/api/rag-architecture-plan-generate" && method === "POST") return "public";
  if (pathname === "/api/local-ai-deployment-plan-generate" && method === "POST") return "public";
  if (pathname === "/api/northstar-beacon/catalog" && method === "GET") return "public";
  if (pathname === "/api/northstar-beacon/validate" && method === "POST") return "public";
  if (pathname === "/api/northstar-beacon/hash" && method === "POST") return "public";
  if (pathname === "/api/northstar-beacon/generate" && method === "POST") return "public";
  if (pathname === "/api/northstar-beacon/proposal" && method === "POST") return "public";
  if (pathname === "/api/marketplace/service-modules" && method === "GET") return "public";
  if (MARKETPLACE_PROTECTED.some((re) => re.test(pathname))) return "marketplace";
  if (pathname.startsWith("/api/engagements/") && method === "GET") return "operator";
  if (OPERATOR_PROTECTED.some((re) => re.test(pathname))) return "operator";
  return "public";
}
