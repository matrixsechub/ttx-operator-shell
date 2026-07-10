import type { ActionClass } from "../governance/types";
import {
  extractGovernanceFields,
  governedDeniedResponse,
  governedSuccessResponse,
  runGovernedRoute,
} from "../governance/mutationGate";
import { getProposal } from "../governance/proposalStore";
import { isGovernedMutationEnvironment, resolveRuntimeEnvironment } from "../governance/runtimeEnv";
import type { GovernedExecutionEnv } from "../governance/governedMutation";
import type { ActivationRouteEnv } from "./activationRoutes";

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function executeGovernedActivationMutation<TResult>(
  env: ActivationRouteEnv & GovernedExecutionEnv,
  options: {
    actionType: string;
    body: Record<string, unknown>;
    mutationPayload: Record<string, unknown>;
    rollbackReference?: string;
    execute: () => Promise<TResult>;
    successPayload: (result: TResult) => Record<string, unknown>;
    successStatus?: number;
  },
): Promise<Response> {
  const fields = extractGovernanceFields(options.body);
  if (!fields) {
    return jsonResponse(
      {
        ok: false,
        error: "Signed approval receipt required (proposalId, approvalId, idempotencyKey)",
        code: "RECEIPT_REQUIRED",
      },
      403,
    );
  }

  const proposal = await getProposal(env, fields.proposalId);
  if (!proposal) {
    return jsonResponse({ ok: false, error: "Proposal not found", code: "PROPOSAL_NOT_FOUND" }, 404);
  }

  const governed = await runGovernedRoute(env, {
    actionType: options.actionType,
    actionClass: proposal.action_class as ActionClass,
    environment: resolveRuntimeEnvironment(env),
    proposalId: fields.proposalId,
    approvalId: fields.approvalId,
    idempotencyKey: fields.idempotencyKey,
    input: options.body,
    rollbackReference: options.rollbackReference ?? proposal.rollback_plan,
    execute: options.execute,
  });

  if (!governed.ok) {
    return governedDeniedResponse(governed);
  }

  return governedSuccessResponse(
    options.successPayload(governed.result as TResult),
    governed,
    options.successStatus ?? 200,
  );
}

export function activationMutationRequiresGovernance(env: ActivationRouteEnv): boolean {
  return isGovernedMutationEnvironment(env);
}
