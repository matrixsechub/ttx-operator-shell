import type { ActionProposal } from "./types";
import { resolveProposalActionType } from "./proposalActionDigest";
import type { ActionClassPolicyResult } from "./actionClassPolicy";

export const ROLLBACK_ACTION_BY_SOURCE: Record<string, string> = {
  "activation.campaign.create": "activation.campaign.archive",
};

export function resolveRollbackActionType(sourceActionType: string): string | null {
  return ROLLBACK_ACTION_BY_SOURCE[sourceActionType] ?? null;
}

export interface RollbackValidationInput {
  sourceProposal: ActionProposal;
  rollbackProposal: ActionProposal;
}

export function validateRollbackRequest(input: RollbackValidationInput): ActionClassPolicyResult {
  const sourceActionType = resolveProposalActionType(input.sourceProposal);
  const rollbackActionType = resolveProposalActionType(input.rollbackProposal);
  const expectedRollback = resolveRollbackActionType(sourceActionType);

  if (!expectedRollback) {
    return {
      allowed: false,
      code: "ROLLBACK_NOT_SUPPORTED",
      reason: `Rollback is not registered for action type ${sourceActionType}`,
    };
  }

  if (!input.sourceProposal.rollback_plan.trim()) {
    return {
      allowed: false,
      code: "ROLLBACK_PLAN_MISSING",
      reason: "Source proposal has no rollback plan",
    };
  }

  if (input.sourceProposal.status !== "executed") {
    return {
      allowed: false,
      code: "ROLLBACK_SOURCE_NOT_EXECUTED",
      reason: "Rollback requires an executed source proposal",
    };
  }

  if (input.rollbackProposal.proposal_id === input.sourceProposal.proposal_id) {
    return {
      allowed: false,
      code: "ROLLBACK_PROPOSAL_REQUIRED",
      reason: "Rollback must use a separate governed proposal",
    };
  }

  if (rollbackActionType !== expectedRollback) {
    return {
      allowed: false,
      code: "ROLLBACK_PROPOSAL_REQUIRED",
      reason: `Rollback proposal must target ${expectedRollback}`,
    };
  }

  if (input.rollbackProposal.status !== "approved") {
    return {
      allowed: false,
      code: "ROLLBACK_RECEIPT_REQUIRED",
      reason: "Rollback proposal must be approved with a fresh receipt",
    };
  }

  if (!input.rollbackProposal.approval_id) {
    return {
      allowed: false,
      code: "ROLLBACK_RECEIPT_REQUIRED",
      reason: "Rollback approval receipt missing",
    };
  }

  return { allowed: true, reason: "Rollback proposal validated" };
}
