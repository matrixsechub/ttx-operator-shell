export interface FedGradeEnv {
  AUTH_REVOCATION?: KVNamespace;
}

/** Called after edgeAuthGate succeeds for operator-protected /api/fedgrade/* routes. */
export function handleFedGradeRoute(request: Request, pathname: string, env: FedGradeEnv): Response | null {
  if (pathname !== "/api/fedgrade/health") return null;
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  return Response.json(
    {
      status: "healthy",
      posture: "fedgrade-advisory",
      checks: {
        edge_auth: true,
        ctx_binding: true,
        kv_revocation: Boolean(env.AUTH_REVOCATION),
        hmac_jwt: true,
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
