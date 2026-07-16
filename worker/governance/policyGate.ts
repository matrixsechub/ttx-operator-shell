import type { ActionProposal } from "./types";
import { ACTION_CLASS_REQUIRES_APPROVAL } from "./types";
import { getCodexManifestSnapshot } from "../codex/manifestHash";
import type { BeaconReleaseEnv } from "../beacon/beaconRelease";
import { resolveBeaconRuntimeState } from "./beaconRuntime";
import { resolveProposalPolicyDenial } from "./governanceDenialPrecedence";

export interface PolicyGateResult {
  allowed: boolean;
  reason: string;
  code?: string;
}

export async function validateProposalEligibility(
  proposal: Pick<
    ActionProposal,
    "action_class" | "beacon_hash" | "codex_hash" | "summary" | "rollback_plan" | "expiration"
  >,
  env: BeaconReleaseEnv = {},
): Promise<PolicyGateResult> {
  const [beaconState, codex] = await Promise.all([resolveBeaconRuntimeState(env), getCodexManifestSnapshot()]);
  const denial = resolveProposalPolicyDenial(beaconState, proposal, codex.manifestHash);
  if (denial) {
    return { allowed: false, reason: denial.reason, code: denial.code };
  }
  return { allowed: true, reason: "Proposal eligible for operator review" };
}

export function actionClassRequiresApproval(actionClass: ActionProposal["action_class"]): boolean {
  return ACTION_CLASS_REQUIRES_APPROVAL[actionClass];
}
