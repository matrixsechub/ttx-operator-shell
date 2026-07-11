import { getAgentGovernanceContextFor } from "../msh-ops/agent/initAgentGovernance";
import type { BackboneEnv } from "./backboneEnv";
import { runGovernedInference, type AiGatewayEnv } from "./aiGateway";
import type { GhostSignals } from "./ghost";
import {
  applySignalPolicyOverlay,
  evaluateSignalStates,
  type GovernancePolicyShape,
  type SignalFlag,
} from "./policyResponse";

export async function summarizeGhostSignals(
  env: AiGatewayEnv & BackboneEnv,
  signals: GhostSignals,
): Promise<string | null> {
  if (!env.AI) return null;

  const baseline: GovernancePolicyShape = {
    marketplaceValidationRequired: false,
    wildcardFeaturesEnabled: true,
    northstarVersion: 1,
    mode: "standard",
  };
  const signalStates: SignalFlag[] = evaluateSignalStates(signals, signals.local);
  const policy = applySignalPolicyOverlay(baseline, signalStates);

  if (
    !policy.wildcardFeaturesEnabled ||
    signalStates.includes("HIGH_RISK") ||
    signalStates.includes("LOW_INTELLIGENCE")
  ) {
    return null;
  }

  const outcome = await runGovernedInference(
    env,
    getAgentGovernanceContextFor("GhostLayer"),
    {
      agentId: "GhostLayer",
      actionKind: "advisory",
      description: "Ghost layer mirage signal summary",
      axis: "WILDCARD_INNOVATION",
    },
    {
      messages: [
        {
          role: "user",
          content: `Summarize ghost depth signals (advisory only): ${JSON.stringify(signals.depth)}`,
        },
      ],
      surface: "ghost",
    },
    policy,
    signalStates,
  );

  return outcome.ok ? outcome.content : null;
}
