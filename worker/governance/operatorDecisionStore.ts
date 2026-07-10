import type { OperatorDecisionV1 } from "./phase2bContracts";
import type { ProposalStoreEnv } from "./proposalStore";

const DECISION_PREFIX = "governance:decision:";

export async function saveOperatorDecision(
  env: ProposalStoreEnv,
  decision: OperatorDecisionV1,
): Promise<void> {
  await env.TTX_STATE.put(`${DECISION_PREFIX}${decision.proposalId}`, JSON.stringify(decision), {
    expirationTtl: 60 * 60 * 24 * 30,
  });
}

export async function getOperatorDecision(
  env: ProposalStoreEnv,
  proposalId: string,
): Promise<OperatorDecisionV1 | null> {
  const raw = await env.TTX_STATE.get(`${DECISION_PREFIX}${proposalId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OperatorDecisionV1;
  } catch {
    return null;
  }
}
