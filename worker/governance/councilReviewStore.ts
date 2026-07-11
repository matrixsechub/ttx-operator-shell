import type { CouncilReviewV1 } from "./phase2bContracts";
import type { ProposalStoreEnv } from "./proposalStore";

const REVIEW_PREFIX = "governance:council-review:";

export async function saveCouncilReview(env: ProposalStoreEnv, review: CouncilReviewV1): Promise<void> {
  await env.TTX_STATE.put(`${REVIEW_PREFIX}${review.proposalId}`, JSON.stringify(review), {
    expirationTtl: 60 * 60 * 24 * 30,
  });
}

export async function getCouncilReview(
  env: ProposalStoreEnv,
  proposalId: string,
): Promise<CouncilReviewV1 | null> {
  const raw = await env.TTX_STATE.get(`${REVIEW_PREFIX}${proposalId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CouncilReviewV1;
  } catch {
    return null;
  }
}
