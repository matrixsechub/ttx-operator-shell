import type { AiGatewayEnv, GovernedInferenceOutcome } from "./aiGateway";
import { runGovernedInference } from "./aiGateway";
import type { AgentGovernanceContext } from "../msh-ops/agent/initAgentGovernance";
import type { AutonomousActionProposal } from "../msh-ops/governance/checkAutonomy";
import type { SignalFlag } from "./policyResponse";

export async function maybeEnrichWithAi<T extends Record<string, unknown>>(
  env: AiGatewayEnv,
  ctx: AgentGovernanceContext,
  proposal: AutonomousActionProposal,
  baseResult: T,
  prompt: string,
  policy: { mode: import("./policyResponse").PolicyMode; wildcardFeaturesEnabled: boolean },
  signalStates: SignalFlag[] = [],
): Promise<T & { ai_enrichment?: string; ai_model?: string }> {
  if (env.AI_FULFILLMENT_ENABLED !== "true" && env.AI_FULFILLMENT_ENABLED !== "1") {
    return baseResult;
  }

  const outcome = await runGovernedInference(
    env,
    ctx,
    proposal,
    {
      messages: [
        {
          role: "system",
          content:
            "You enrich advisory fulfillment specs. Output concise bullet points only. Do not claim mutations were performed.",
        },
        { role: "user", content: prompt },
      ],
      surface: "fulfillment",
    },
    policy,
    signalStates,
  );

  if (!outcome.ok) {
    return { ...baseResult, ai_enrichment: undefined };
  }

  return {
    ...baseResult,
    ai_enrichment: outcome.content,
    ai_model: outcome.model,
  };
}

export function isEnrichmentOutcome(outcome: GovernedInferenceOutcome): outcome is Extract<GovernedInferenceOutcome, { ok: true }> {
  return outcome.ok;
}
