export type RouteClass = "public" | "operator" | "marketplace";

const OPERATOR_PROTECTED = [
  /^\/api\/operator\//,
  /^\/api\/debug\//,
  /^\/api\/audit\//,
  /^\/api\/lifecycle\/advance\//,
  /^\/api\/marketplace\/audit$/,
  /^\/api\/fedgrade\//,
  /^\/api\/governance\/propose$/,
  /^\/api\/governance\/approve$/,
];

const MARKETPLACE_PROTECTED = [/^\/api\/marketplace\/integrity$/, /^\/api\/hsx$/];

export function classifyRoute(pathname: string, method: string): RouteClass {
  if (pathname === "/api/operator/auth") return "public";
  if (pathname === "/api/marketplace/session") return "public";
  if (pathname === "/api/hsx/session") return "public";
  if (pathname === "/api/marketplace-lifecycle" || pathname.startsWith("/api/marketplace-lifecycle/")) {
    return "public";
  }
  if (pathname === "/api/engagements/create" && method === "POST") return "public";
  if (MARKETPLACE_PROTECTED.some((re) => re.test(pathname))) return "marketplace";
  if (pathname.startsWith("/api/engagements/") && method === "GET") return "operator";
  if (OPERATOR_PROTECTED.some((re) => re.test(pathname))) return "operator";
  return "public";
}
