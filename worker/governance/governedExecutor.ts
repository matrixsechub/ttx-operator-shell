import { createCampaign, getCampaign, transitionCampaign } from "../activation/campaignStorage";
import type { GovernedExecutionEnv } from "./governedMutation";
import { runGovernedMutation } from "./governedMutation";
import type { ActionProposal } from "./types";
import {
  resolveProposalActionType,
  resolveProposalMutationPayload,
} from "./proposalActionDigest";
import type { RuntimeEnvironment } from "./types";

export interface GovernedExecuteInput {
  proposal: ActionProposal;
  approvalId: string;
  idempotencyKey: string;
  mutationPayload?: Record<string, unknown>;
  environment: RuntimeEnvironment;
}

export interface GovernedExecuteResult {
  ok: boolean;
  code?: string;
  error?: string;
  result?: unknown;
  executionReceipt?: import("./types").ExecutionReceipt;
}

async function executeActivationCampaignCreate(
  env: GovernedExecutionEnv,
  mutationPayload: Record<string, unknown>,
  actor: string,
): Promise<{ campaignId: string }> {
  const name = typeof mutationPayload.name === "string" ? mutationPayload.name : "governed-campaign";
  const reason = typeof mutationPayload.reason === "string" ? mutationPayload.reason : "governed execution";
  const description =
    typeof mutationPayload.description === "string" ? mutationPayload.description : undefined;
  const campaign = await createCampaign(env, {
    name,
    reason,
    description,
    actor,
  });
  return { campaignId: campaign.campaignId };
}

async function executeActivationCampaignArchive(
  env: GovernedExecutionEnv,
  mutationPayload: Record<string, unknown>,
  actor: string,
): Promise<{ campaignId: string; status: string }> {
  const campaignId = typeof mutationPayload.campaignId === "string" ? mutationPayload.campaignId.trim() : "";
  if (!campaignId) throw new Error("campaignId required for archive");
  const reason = typeof mutationPayload.reason === "string" ? mutationPayload.reason : "governed rollback";
  const campaign = await getCampaign(env, campaignId);
  if (!campaign) throw new Error("Campaign not found");
  const archived = await transitionCampaign(env, campaignId, "ARCHIVED", actor, reason);
  return { campaignId: archived.campaignId, status: archived.status };
}

export async function executeGovernedProposal(
  env: GovernedExecutionEnv,
  input: GovernedExecuteInput,
): Promise<GovernedExecuteResult> {
  const actionType = resolveProposalActionType(input.proposal);
  const mutationPayload = resolveProposalMutationPayload(input.proposal, input.mutationPayload);

  const governed = await runGovernedMutation(env, {
    actionType,
    actionClass: input.proposal.action_class,
    environment: input.environment,
    proposalId: input.proposal.proposal_id,
    approvalId: input.approvalId,
    idempotencyKey: input.idempotencyKey,
    input: mutationPayload,
    rollbackReference: input.proposal.rollback_plan,
    execute: async () => {
      switch (actionType) {
        case "activation.campaign.create":
          return executeActivationCampaignCreate(env, mutationPayload, input.proposal.created_by);
        case "activation.campaign.archive":
          return executeActivationCampaignArchive(env, mutationPayload, input.proposal.created_by);
        default:
          throw new Error(`EXECUTOR_NOT_IMPLEMENTED:${actionType}`);
      }
    },
  });

  return {
    ok: governed.ok,
    code: governed.code,
    error: governed.error,
    result: governed.result,
    executionReceipt: governed.executionReceipt,
  };
}
