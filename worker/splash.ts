import { injectSecurityHeaders } from "./edge/headers";

/** Public static assets under /public/* */
export async function servePublicAsset(request: Request, assets: Fetcher): Promise<Response> {
  const response = await assets.fetch(request);
  return injectSecurityHeaders(response);
}

export function isPublicAssetRoute(pathname: string): boolean {
  return pathname === "/public" || pathname.startsWith("/public/");
}
