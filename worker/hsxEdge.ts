import { signToken, makeCtxHash } from "./edge/crypto";

export interface HsxEdgeEnv {
  OPERATOR_SECRET?: string;
  AUTH_SIGNING_KEY?: string;
}

function operatorSecret(env: HsxEdgeEnv): string | undefined {
  return env.OPERATOR_SECRET || env.AUTH_SIGNING_KEY;
}

export async function handleHsxEdgeRoute(
  request: Request,
  pathname: string,
  env: HsxEdgeEnv,
): Promise<Response | null> {
  if (pathname === "/api/hsx/session" && request.method === "POST") {
    const secret = operatorSecret(env);
    if (!secret) {
      return Response.json({ error: "OPERATOR_SECRET not configured" }, { status: 503 });
    }
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ctxHash = await makeCtxHash(ip, request.headers.get("User-Agent") || "");
    const token = await signToken(secret, {
      sub: "hsx-session",
      ctx: ctxHash,
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    return Response.json({ token, expires_in: 300 }, { status: 200 });
  }

  if (pathname === "/api/hsx" && request.method === "POST") {
    return Response.json(
      { error: "HSX envelope requires operator JWT with ctx binding" },
      { status: 401 },
    );
  }

  return null;
}
