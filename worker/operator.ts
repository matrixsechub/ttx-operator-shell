import { injectSecurityHeaders } from "./edge/headers";

const OPERATOR_SHELL_DEFAULT = "/index.html";
const OPERATOR_SHELL_PUBLIC = "/operator-shell.html";
const OPERATOR_MARKERS = ["Operator Terminal", 'id="root"'] as const;
const STOREFRONT_LEAK_MARKERS = ["MSH OPS Storefront"] as const;

const COCKPIT_EXACT = new Set(["/login", "/dashboard", "/status", "/about", "/ops"]);
const COCKPIT_PREFIXES = ["/ops/", "/systems", "/ttx", "/divisions", "/future", "/marketplace/"];

/** Vite-built operator bundle assets. */
export function isOperatorAssetPath(pathname: string): boolean {
  return pathname.startsWith("/assets/") || pathname === "/favicon.svg";
}

export function operatorShellAssetPath(mode: "operator" | "public"): string {
  return mode === "operator" ? OPERATOR_SHELL_DEFAULT : OPERATOR_SHELL_PUBLIC;
}

/** Cockpit routes on the public worker (login + ops surfaces). */
export function isOperatorCockpitPath(pathname: string): boolean {
  const normalized = pathname === "/index.html" ? "/" : pathname.replace(/\/$/, "") || "/";
  if (COCKPIT_EXACT.has(normalized)) return true;
  return COCKPIT_PREFIXES.some(
    (prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix),
  );
}

/** HTML routes served by the dedicated mshops-operator worker. */
export function isOperatorSpaPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return false;
  if (isOperatorAssetPath(pathname)) return false;
  if (pathname === "/public" || pathname.startsWith("/public/")) return false;
  return true;
}

function isOperatorShellHtml(html: string): boolean {
  return OPERATOR_MARKERS.every((marker) => html.includes(marker));
}

function isStorefrontShellLeak(html: string): boolean {
  return STOREFRONT_LEAK_MARKERS.some((marker) => html.includes(marker));
}

/** Serve the ttx-operator-shell React cockpit SPA. */
export async function serveOperatorSpa(
  request: Request,
  assets: Fetcher,
  shellPath: string = OPERATOR_SHELL_DEFAULT,
): Promise<Response> {
  const shellUrl = new URL(shellPath, request.url);
  const shellRequest = new Request(shellUrl.toString(), {
    method: "GET",
    headers: request.headers,
  });
  const response = await assets.fetch(shellRequest);
  const html = await response.text();
  const operatorOk = isOperatorShellHtml(html);
  const storefrontLeak = isStorefrontShellLeak(html);

  if (!operatorOk || storefrontLeak || !response.ok) {
    return Response.json(
      { error: "Operator cockpit shell missing or misconfigured" },
      { status: 503 },
    );
  }

  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "X-Operator-Route": "ttx-cockpit",
  });

  if (request.method === "HEAD") {
    return injectSecurityHeaders(new Response(null, { status: 200, headers }));
  }

  return injectSecurityHeaders(new Response(html, { status: response.status, headers }));
}
