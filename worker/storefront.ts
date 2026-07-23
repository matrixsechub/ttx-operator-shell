import { injectSecurityHeaders } from "./edge/headers";

const STOREFRONT_SHELL_PATH = "/app/index.html";
const STOREFRONT_MARKERS = ["MSH OPS Storefront", 'id="root"'] as const;
const LEGACY_OPERATOR_MARKERS = ["Operator Terminal"] as const;

const STOREFRONT_SPA_PATHS = new Set([
  "/storefront",
  "/marketplace",
]);

/** Built MSHOPS bundle assets (vite base: /app). */
export function isStorefrontAssetPath(pathname: string): boolean {
  return pathname.startsWith("/app/assets/");
}

export function isStorefrontSpaPath(pathname: string): boolean {
  const normalized = pathname === "/index.html" ? "/" : pathname.replace(/\/$/, "") || "/";
  if (STOREFRONT_SPA_PATHS.has(normalized)) return true;
  if (normalized === "/app") return true;
  if (pathname.startsWith("/app/") && !isStorefrontAssetPath(pathname)) return true;
  return false;
}

function isStorefrontShellHtml(html: string): boolean {
  return STOREFRONT_MARKERS.every((marker) => html.includes(marker));
}

function isLegacyOperatorShellHtml(html: string): boolean {
  return LEGACY_OPERATOR_MARKERS.some((marker) => html.includes(marker));
}

/** Serve the MSHOPS storefront React SPA shell (agents/apps/marketplace UI). */
export async function serveStorefrontSpa(
  request: Request,
  assets: Fetcher,
): Promise<Response> {
  const shellUrl = new URL(STOREFRONT_SHELL_PATH, request.url);
  const shellRequest = new Request(shellUrl.toString(), {
    method: "GET",
    headers: request.headers,
  });
  const response = await assets.fetch(shellRequest);
  const html = await response.text();
  const storefrontOk = isStorefrontShellHtml(html);
  const legacyLeak = isLegacyOperatorShellHtml(html);

  if (!storefrontOk || legacyLeak || !response.ok) {
    return Response.json(
      { error: "MSHOPS storefront shell missing or misconfigured" },
      { status: 503 },
    );
  }

  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "X-Storefront-Route": "mshops-spa",
  });

  if (request.method === "HEAD") {
    return injectSecurityHeaders(new Response(null, { status: 200, headers }));
  }

  return injectSecurityHeaders(new Response(html, { status: response.status, headers }));
}
