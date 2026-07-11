import { injectSecurityHeaders } from "./edge/headers";
import { resolveHtmlSurface, surfaceHeaderName, surfaceShellPath, type HtmlSurface } from "./surfaceRegistry";

type SurfaceMarkers = {
  required: readonly string[];
  forbidden: readonly string[];
  headerValue: string;
};

const SURFACE_MARKERS: Record<HtmlSurface, SurfaceMarkers> = {
  ecosystem: {
    required: ["Ecosystem Entry", 'id="root"'],
    forbidden: ["Operator Terminal", "MSH OPS Storefront"],
    headerValue: "ttx-ecosystem",
  },
  storefront: {
    required: ["MSH OPS Storefront", 'id="root"'],
    forbidden: ["Operator Terminal", "Ecosystem Entry"],
    headerValue: "mshops-storefront",
  },
  cockpit: {
    required: ["Operator Terminal", 'id="root"'],
    forbidden: ["MSH OPS Storefront"],
    headerValue: "ttx-cockpit",
  },
  auth: {
    required: ["Operator Auth", 'id="root"'],
    forbidden: ["MSH OPS Storefront"],
    headerValue: "ttx-auth",
  },
  governance: {
    required: ["Operator Council", 'id="root"'],
    forbidden: ["MSH OPS Storefront"],
    headerValue: "ttx-governance",
  },
};

function validateShellHtml(html: string, surface: HtmlSurface): boolean {
  const markers = SURFACE_MARKERS[surface];
  const hasRequired = markers.required.every((marker) => html.includes(marker));
  const hasForbidden = markers.forbidden.some((marker) => html.includes(marker));
  return hasRequired && !hasForbidden;
}

/** Serve an isolated SPA shell for the resolved architectural surface. */
export async function serveSurfaceSpa(request: Request, assets: Fetcher, pathname: string): Promise<Response> {
  const surface = resolveHtmlSurface(pathname);
  const shellPath = surfaceShellPath(surface);
  const shellUrl = new URL(shellPath, request.url);
  const shellRequest = new Request(shellUrl.toString(), {
    method: "GET",
    headers: request.headers,
  });
  const response = await assets.fetch(shellRequest);
  const html = await response.text();
  const markers = SURFACE_MARKERS[surface];
  const valid = validateShellHtml(html, surface);

  // #region agent log
  fetch("http://127.0.0.1:7654/ingest/c1420f4a-f03f-408c-822d-3c63b334f1b9", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "14ea90" },
    body: JSON.stringify({
      sessionId: "14ea90",
      runId: "multi-surface",
      hypothesisId: "H-surface-routing",
      location: "worker/surfaceSpa.ts:serveSurfaceSpa",
      message: "surface shell resolved",
      data: {
        pathname,
        surface,
        shellPath,
        status: response.status,
        valid,
        title: html.match(/<title>([^<]+)/)?.[1],
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (!valid || !response.ok) {
    return Response.json(
      { error: `${surface} shell missing or misconfigured`, shellPath, pathname },
      { status: 503 },
    );
  }

  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "X-Surface": surface,
    [surfaceHeaderName(surface)]: markers.headerValue,
  });

  if (request.method === "HEAD") {
    return injectSecurityHeaders(new Response(null, { status: 200, headers }));
  }

  return injectSecurityHeaders(new Response(html, { status: response.status, headers }));
}

export function isStorefrontAssetPath(pathname: string): boolean {
  return pathname.startsWith("/app/assets/");
}

export function isCockpitAssetPath(pathname: string): boolean {
  return pathname.startsWith("/assets/") || pathname === "/favicon.svg";
}

export function isAuthAssetPath(pathname: string): boolean {
  return pathname.startsWith("/auth/assets/");
}

export function isGovernanceAssetPath(pathname: string): boolean {
  return pathname.startsWith("/council/assets/");
}
