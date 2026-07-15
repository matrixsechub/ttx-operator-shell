import { signToken, makeCtxHash } from "./edge/crypto";

export interface HsxEdgeEnv {
  MARKETPLACE_SECRET?: string;
}

export async function handleHsxEdgeRoute(
  request: Request,
  pathname: string,
  env: HsxEdgeEnv,
): Promise<Response | null> {
  if (pathname === "/api/hsx/session" && request.method === "POST") {
    const secret = env.MARKETPLACE_SECRET;
    if (!secret) {
      return Response.json({ error: "MARKETPLACE_SECRET not configured" }, { status: 503 });
    }
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ctxHash = await makeCtxHash(ip, request.headers.get("User-Agent") || "");
    const now = Math.floor(Date.now() / 1000);
    const token = await signToken(secret, {
      sub: "hsx-session",
      ctx: ctxHash,
      jti: crypto.randomUUID(),
      iat: now,
      exp: now + 300,
    });
    return Response.json({ token, expires_in: 300 }, { status: 200 });
  }

  if (pathname === "/api/hsx" && request.method === "POST") {
    return Response.json(
      { error: "HSX envelope requires marketplace JWT with ctx binding" },
      { status: 401 },
    );
  }

  return null;
}
