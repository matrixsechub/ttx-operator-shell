import { injectSecurityHeaders } from "./edge/headers";
import { isPublicAssetRoute, servePublicAsset } from "./splash";
import {
  isAuthAssetPath,
  isCockpitAssetPath,
  isGovernanceAssetPath,
  isStorefrontAssetPath,
  serveSurfaceSpa,
} from "./surfaceSpa";

export type SurfaceMode = "operator" | "public" | "storefront";

export function resolveSurfaceMode(env: Env): SurfaceMode {
  const mode = (env as Env & { MSHOPS_SURFACE?: string }).MSHOPS_SURFACE;
  if (mode === "operator") return "operator";
  if (mode === "public") return "public";
  return "storefront";
}

export function proxyLabel(mode: SurfaceMode): string {
  if (mode === "operator") return "mshops-operator-worker";
  if (mode === "public") return "mshops-public-worker";
  return "ttx-operator-shell";
}

/** Multi-surface HTML routing — each path resolves to an isolated SPA shell. */
export async function routeStorefrontSurface(
  request: Request,
  pathname: string,
  assets: Fetcher,
): Promise<Response | null> {
  if (/\.[a-z0-9]+$/i.test(pathname)) {
    return injectSecurityHeaders(await assets.fetch(request));
  }

  if (isStorefrontAssetPath(pathname)) {
    return assets.fetch(request);
  }

  if (isCockpitAssetPath(pathname)) {
    return assets.fetch(request);
  }

  if (isAuthAssetPath(pathname)) {
    return assets.fetch(request);
  }

  if (isGovernanceAssetPath(pathname)) {
    return assets.fetch(request);
  }

  if (pathname.startsWith("/api/")) {
    return null;
  }

  if (isPublicAssetRoute(pathname)) {
    return servePublicAsset(request, assets);
  }

  if (pathname === "/splash.html") {
    return Response.json({ error: "Static splash removed — use storefront entry" }, { status: 410 });
  }

  return serveSurfaceSpa(request, assets, pathname);
}
