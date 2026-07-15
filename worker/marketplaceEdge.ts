import { signToken, makeCtxHash } from "./edge/crypto";

export interface MarketplaceEdgeEnv {
  MARKETPLACE_SECRET?: string;
}

export async function handleMarketplaceEdgeRoute(
  request: Request,
  pathname: string,
  env: MarketplaceEdgeEnv,
): Promise<Response | null> {
  if (pathname === "/api/marketplace/session" && request.method === "POST") {
    const secret = env.MARKETPLACE_SECRET;
    if (!secret) {
      return Response.json({ error: "MARKETPLACE_SECRET not configured" }, { status: 503 });
    }
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ctxHash = await makeCtxHash(ip, request.headers.get("User-Agent") || "");
    const token = await signToken(secret, {
      sub: "marketplace-session",
      ctx: ctxHash,
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600,
    });
    return Response.json({ token, expires_in: 600 }, { status: 200 });
  }

  if (pathname === "/api/marketplace/integrity" && request.method === "GET") {
    return Response.json(
      {
        status: "ok",
        integrity: "advisory",
        binding: "ctx-hash",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  }

  return null;
}
