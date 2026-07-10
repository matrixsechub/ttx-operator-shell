import type { AgentGovernanceContext } from "../msh-ops/agent/initAgentGovernance";
import type { AutonomousActionProposal } from "../msh-ops/governance/checkAutonomy";
import type { SignalFlag } from "./policyResponse";
import {
  runGovernedInference,
  type AiGatewayEnv,
  type GovernedInferenceOutcome,
  type InferenceRequest,
} from "./aiGateway";

const MAX_CONCURRENT = 3;

export interface BatchInferenceItem {
  proposal: AutonomousActionProposal;
  request: InferenceRequest;
}

export interface BatchInferenceResult {
  index: number;
  outcome: GovernedInferenceOutcome;
}

export async function runGovernedInferenceBatch(
  env: AiGatewayEnv,
  ctx: AgentGovernanceContext,
  items: BatchInferenceItem[],
  policy: { mode: import("./policyResponse").PolicyMode; wildcardFeaturesEnabled: boolean },
  signalStates: SignalFlag[] = [],
): Promise<BatchInferenceResult[]> {
  if (items.length > MAX_CONCURRENT) {
    throw new Error(`Batch inference capped at ${MAX_CONCURRENT} concurrent calls`);
  }

  const settled = await Promise.allSettled(
    items.map((item, index) =>
      runGovernedInference(env, { ...ctx, agentId: item.proposal.agentId }, item.proposal, item.request, policy, signalStates).then(
        (outcome) => ({ index, outcome }),
      ),
    ),
  );

  return settled.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    return {
      index,
      outcome: {
        ok: false as const,
        code: "AI_BATCH_EXECUTION_ERROR",
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        status: 500,
      },
    };
  });
}
