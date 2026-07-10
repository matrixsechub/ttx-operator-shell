import type { TelemetryRollup } from "./do/types";
import type { GhostSignals } from "./ghost";

export type PolicyMode = "standard" | "strict" | "RESTRICTIVE";

export type SignalFlag = "HIGH_RISK" | "PERFORMANCE_DEGRADED" | "ERROR_STATE" | "LOW_INTELLIGENCE";

export const SIGNAL_THRESHOLDS = {
  volatilityHighRisk: 80,
  latencyP95DegradedMs: 2000,
  errorCountState: 10,
  oversoulDepthLow: 40,
} as const;

export interface GovernancePolicyShape {
  marketplaceValidationRequired: boolean;
  wildcardFeaturesEnabled: boolean;
  northstarVersion: number;
  mode: PolicyMode;
}

export function evaluateSignalStates(
  ghost: Pick<GhostSignals, "depth">,
  telemetry: Pick<TelemetryRollup, "latencyP95Ms" | "errorCount">,
): SignalFlag[] {
  const flags: SignalFlag[] = [];
  if (ghost.depth.volatility > SIGNAL_THRESHOLDS.volatilityHighRisk) {
    flags.push("HIGH_RISK");
  }
  if (telemetry.latencyP95Ms > SIGNAL_THRESHOLDS.latencyP95DegradedMs) {
    flags.push("PERFORMANCE_DEGRADED");
  }
  if (telemetry.errorCount > SIGNAL_THRESHOLDS.errorCountState) {
    flags.push("ERROR_STATE");
  }
  if (ghost.depth.oversoulDepth < SIGNAL_THRESHOLDS.oversoulDepthLow) {
    flags.push("LOW_INTELLIGENCE");
  }
  return flags;
}

function escalateMode(current: PolicyMode, next: PolicyMode): PolicyMode {
  const rank: Record<PolicyMode, number> = { standard: 0, strict: 1, RESTRICTIVE: 2 };
  return rank[next] > rank[current] ? next : current;
}

export function buildPolicyAdjustments(
  baseline: GovernancePolicyShape,
  effective: GovernancePolicyShape,
  signalStates: SignalFlag[],
): string[] {
  const adjustments: string[] = [];
  for (const signal of signalStates) {
    switch (signal) {
      case "HIGH_RISK":
        if (effective.mode === "RESTRICTIVE" && baseline.mode !== "RESTRICTIVE") {
          adjustments.push("HIGH_RISK→RESTRICTIVE");
        }
        if (!effective.wildcardFeaturesEnabled && baseline.wildcardFeaturesEnabled) {
          adjustments.push("HIGH_RISK→wildcard_disabled");
        }
        break;
      case "ERROR_STATE":
        if (effective.marketplaceValidationRequired && !baseline.marketplaceValidationRequired) {
          adjustments.push("ERROR_STATE→marketplace_validation_required");
        }
        break;
      case "PERFORMANCE_DEGRADED":
        if (effective.mode === "strict" && baseline.mode === "standard") {
          adjustments.push("PERFORMANCE_DEGRADED→strict");
        }
        break;
      case "LOW_INTELLIGENCE":
        if (!effective.wildcardFeaturesEnabled && baseline.wildcardFeaturesEnabled) {
          adjustments.push("LOW_INTELLIGENCE→wildcard_disabled");
        }
        break;
      default: {
        const _exhaustive: never = signal;
        void _exhaustive;
      }
    }
  }
  return [...new Set(adjustments)];
}

export function policyWasTightened(baseline: GovernancePolicyShape, effective: GovernancePolicyShape): boolean {
  if (effective.marketplaceValidationRequired && !baseline.marketplaceValidationRequired) return true;
  if (!effective.wildcardFeaturesEnabled && baseline.wildcardFeaturesEnabled) return true;
  const rank: Record<PolicyMode, number> = { standard: 0, strict: 1, RESTRICTIVE: 2 };
  return rank[effective.mode] > rank[baseline.mode];
}

export function applySignalPolicyOverlay(
  base: GovernancePolicyShape,
  signalStates: SignalFlag[],
): GovernancePolicyShape {
  let policy: GovernancePolicyShape = { ...base };

  for (const signal of signalStates) {
    switch (signal) {
      case "HIGH_RISK":
        policy = {
          ...policy,
          mode: "RESTRICTIVE",
          wildcardFeaturesEnabled: false,
        };
        break;
      case "ERROR_STATE":
        policy = {
          ...policy,
          marketplaceValidationRequired: true,
        };
        break;
      case "PERFORMANCE_DEGRADED":
        policy = {
          ...policy,
          mode: escalateMode(policy.mode, "strict"),
        };
        break;
      case "LOW_INTELLIGENCE":
        policy = {
          ...policy,
          wildcardFeaturesEnabled: false,
        };
        break;
      default: {
        const _exhaustive: never = signal;
        void _exhaustive;
      }
    }
  }

  return policy;
}
