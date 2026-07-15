import type { BackboneEnv } from "./backboneEnv";
import { fetchGhostSignals, type GhostEnv } from "./ghost";
import { buildGovernancePolicy, fetchGovernanceState, type KernelContext } from "./kernel";
import { applySignalPolicyOverlay, evaluateSignalStates } from "./policyResponse";
import { getTelemetrySummary, type TelemetryEnv } from "./telemetry";

/**
 * Strict policy resolution for governed mutations.
 *
 * Read-only system views may use fallback state, but a mutation must never
 * proceed from fallback or indeterminate governance data. Any unavailable
 * dependency is allowed to throw so the request dispatcher can fail closed.
 */
export async function resolveGovernedMutationContext(
  env: BackboneEnv & GhostEnv & TelemetryEnv,
): Promise<KernelContext> {
  const governance = await fetchGovernanceState(env);
  const [telemetry, ghost] = await Promise.all([getTelemetrySummary(env), fetchGhostSignals(env)]);
  const baseline = buildGovernancePolicy(governance);
  const signalStates = evaluateSignalStates(ghost, telemetry);
  const policy = applySignalPolicyOverlay(baseline, signalStates);
  return { governance, policy, signalStates };
}
