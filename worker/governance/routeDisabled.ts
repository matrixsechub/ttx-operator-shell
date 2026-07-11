import { isGovernedMutationEnvironment } from "./runtimeEnv";
import type { RuntimeEnvSource } from "./runtimeEnv";

export function routeDisabledInGovernedEnvironment(
  env: RuntimeEnvSource,
  reason = "Route disabled pending governance migration",
): Response | null {
  if (!isGovernedMutationEnvironment(env)) return null;
  return Response.json(
    {
      ok: false,
      error: reason,
      code: "ROUTE_DISABLED_PENDING_GOVERNANCE",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
