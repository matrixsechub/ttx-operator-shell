import type { ActionClass, RuntimeEnvironment } from "./types";
import { hashCanonicalPayload } from "./receiptCrypto";

export interface ActionDigestInput {
  actionType: string;
  actionClass: ActionClass;
  targetEnvironment: RuntimeEnvironment;
  targetResource: string;
  mutationPayload: Record<string, unknown>;
  rollbackReference: string;
  proposalRevision: number;
  proposalId: string;
}

export async function computeActionDigest(input: ActionDigestInput): Promise<string> {
  return hashCanonicalPayload({
    actionType: input.actionType,
    actionClass: input.actionClass,
    targetEnvironment: input.targetEnvironment,
    targetResource: input.targetResource,
    mutationPayload: input.mutationPayload,
    rollbackReference: input.rollbackReference,
    proposalRevision: input.proposalRevision,
    proposalId: input.proposalId,
  });
}

export function digestInputFromProposal(
  proposal: {
    proposal_id: string;
    revision: number;
    action_class: ActionClass;
    target_system: string;
    rollback_plan: string;
    action_payload?: Record<string, unknown>;
  },
  actionType: string,
  environment: RuntimeEnvironment,
  mutationPayload: Record<string, unknown>,
): ActionDigestInput {
  return {
    actionType,
    actionClass: proposal.action_class,
    targetEnvironment: environment,
    targetResource: proposal.target_system,
    mutationPayload,
    rollbackReference: proposal.rollback_plan,
    proposalRevision: proposal.revision,
    proposalId: proposal.proposal_id,
  };
}
