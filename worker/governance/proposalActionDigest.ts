import type { ActionProposal } from "./types";
import type { RuntimeEnvironment } from "./types";
import { hashProposalAction } from "./receiptCrypto";

export function resolveProposalActionType(proposal: ActionProposal): string {
  const payload = proposal.action_payload;
  if (payload && typeof payload.actionType === "string" && payload.actionType.trim()) {
    return payload.actionType.trim();
  }
  return `${proposal.target_system}.execute`;
}

export function resolveProposalMutationPayload(
  proposal: ActionProposal,
  override?: Record<string, unknown>,
): Record<string, unknown> {
  if (override) return override;
  const payload = proposal.action_payload;
  if (payload && typeof payload.mutationPayload === "object" && payload.mutationPayload && !Array.isArray(payload.mutationPayload)) {
    return payload.mutationPayload as Record<string, unknown>;
  }
  if (payload) return payload;
  return {};
}

export async function computeProposalActionDigest(
  proposal: ActionProposal,
  environment: RuntimeEnvironment,
  options?: { actionType?: string; mutationPayload?: Record<string, unknown> },
): Promise<string> {
  const actionType = options?.actionType ?? resolveProposalActionType(proposal);
  const mutationPayload = resolveProposalMutationPayload(proposal, options?.mutationPayload);
  return hashProposalAction(proposal, actionType, environment, mutationPayload);
}
