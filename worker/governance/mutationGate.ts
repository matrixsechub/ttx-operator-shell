import type { ActionClass, GovernedMutationInput, GovernedMutationResult } from "./types";
import { runGovernedMutation, type GovernedExecutionEnv } from "./governedMutation";
import {
  actionClassAllowed,
  evaluateGovernanceHealth,
  requiresGovernedHealthGate,
  type GovernanceHealthEnv,
} from "./governanceHealth";

export interface GovernedRouteInput<TInput> extends GovernedMutationInput<TInput> {}

export async function runGovernedRoute<TInput, TResult>(
  env: GovernedExecutionEnv & GovernanceHealthEnv,
  mutation: GovernedRouteInput<TInput>,
): Promise<GovernedMutationResult<TResult>> {
  const health = await evaluateGovernanceHealth(env);
  if (requiresGovernedHealthGate(mutation.actionClass) && !actionClassAllowed(health, mutation.actionClass)) {
    return {
      ok: false,
      code: "GOVERNANCE_HEALTH_BLOCKED",
      error: `Governance health ${health.status}: ${health.reasonCodes.join(", ")}`,
    };
  }
  return runGovernedMutation(env, mutation);
}

export function extractGovernanceFields(body: Record<string, unknown>): {
  proposalId: string;
  approvalId: string;
  idempotencyKey: string;
} | null {
  const proposalId = typeof body.proposalId === "string" ? body.proposalId : "";
  const approvalId = typeof body.approvalId === "string" ? body.approvalId : "";
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!proposalId || !approvalId || !idempotencyKey) return null;
  return { proposalId, approvalId, idempotencyKey };
}

export function governedDeniedResponse(result: GovernedMutationResult<unknown>): Response {
  return Response.json(
    {
      ok: false,
      error: result.error,
      code: result.code,
      executionReceipt: result.executionReceipt,
    },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

export function governedSuccessResponse(
  payload: Record<string, unknown>,
  result: GovernedMutationResult<unknown>,
  status = 200,
): Response {
  return Response.json(
    { ok: true, ...payload, executionReceipt: result.executionReceipt },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function defaultActionClassForRoute(pathname: string): ActionClass {
  if (pathname.includes("/activate") || pathname.includes("/delete") || pathname.includes("/reset")) {
    return "C6";
  }
  if (pathname.includes("/security") || pathname.includes("/auth")) return "C5";
  if (pathname.includes("/register") || pathname.includes("/engagements")) return "C4";
  return "C3";
}
