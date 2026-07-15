import { proxyLabel, type SurfaceMode } from "./surface";

export interface SurfaceApiProxyEnv {
  ORIGIN_URL?: string;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function shouldProxySurfaceApi(mode: SurfaceMode): boolean {
  return mode === "public" || mode === "operator";
}

export async function proxySurfaceApiToOrigin(
  request: Request,
  url: URL,
  env: SurfaceApiProxyEnv,
  mode: SurfaceMode,
  fetcher: Fetcher = fetch,
): Promise<Response | null> {
  if (!shouldProxySurfaceApi(mode)) return null;

  if (!env.ORIGIN_URL) {
    return Response.json(
      { error: "Surface origin is not configured", code: "SURFACE_ORIGIN_UNAVAILABLE" },
      { status: 503 },
    );
  }

  let origin: URL;
  try {
    origin = new URL(env.ORIGIN_URL);
  } catch {
    return Response.json(
      { error: "Surface origin is invalid", code: "SURFACE_ORIGIN_INVALID" },
      { status: 503 },
    );
  }

  if (origin.origin === url.origin) {
    return Response.json(
      { error: "Surface origin would create a proxy loop", code: "SURFACE_ORIGIN_LOOP" },
      { status: 503 },
    );
  }

  const target = new URL(url.pathname + url.search, origin);
  const upstreamRequest = new Request(target, request);
  upstreamRequest.headers.set("X-Forwarded-Host", url.host);
  upstreamRequest.headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
  upstreamRequest.headers.set("X-MSHOPS-Surface", mode);

  try {
    const upstreamResponse = await fetcher(upstreamRequest);
    const response = new Response(upstreamResponse.body, upstreamResponse);
    response.headers.set("X-Proxied-By", proxyLabel(mode));
    return response;
  } catch (err) {
    return Response.json(
      {
        error: "Surface origin unreachable",
        code: "SURFACE_ORIGIN_UNREACHABLE",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
