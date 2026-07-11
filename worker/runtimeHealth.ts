import { evaluateActivationSafeMode, type ActivationSafeModeEnv } from "./activation/safeMode";
import type { TelemetryRollup } from "./do/types";

export type RuntimeHealthState = "HEALTHY" | "WATCH" | "DEGRADED" | "CRITICAL" | "HALTED";

export interface RuntimeHealthFactors {
  workerSuccess: number;
  latencyP95: number;
  errorRate: number;
  safeModeActive: boolean;
}

export interface RuntimeHealth {
  score: number;
  state: RuntimeHealthState;
  factors: RuntimeHealthFactors;
  activationSafeMode: {
    active: boolean;
    blockers: string[];
  };
}

export function computeRuntimeHealth(input: {
  telemetry: Pick<TelemetryRollup, "requestCount" | "errorCount" | "latencyP95Ms">;
  beaconSafeMode: boolean;
  activationSafeMode: boolean;
  ghostConnected: boolean;
}): RuntimeHealth {
  const requestCount = input.telemetry.requestCount;
  const errorCount = input.telemetry.errorCount;
  const errorRate =
    requestCount > 0 ? Math.round((errorCount / requestCount) * 1000) / 10 : 0;
  const workerSuccess =
    requestCount > 0
      ? Math.round(((requestCount - errorCount) / requestCount) * 1000) / 10
      : 100;
  const latencyP95 = input.telemetry.latencyP95Ms;

  const safeModeActive = input.beaconSafeMode || input.activationSafeMode;

  if (safeModeActive) {
    return {
      score: 0,
      state: "HALTED",
      factors: { workerSuccess, latencyP95, errorRate, safeModeActive: true },
      activationSafeMode: { active: input.activationSafeMode, blockers: [] },
    };
  }

  let score = 100;
  score -= Math.min(errorRate * 2, 40);
  if (latencyP95 > 2000) score -= 30;
  else if (latencyP95 > 800) score -= 15;
  else if (latencyP95 > 400) score -= 5;
  if (!input.ghostConnected) score -= 25;
  if (workerSuccess < 95) score -= 10;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let state: RuntimeHealthState = "HEALTHY";
  if (!input.ghostConnected || errorRate > 15 || workerSuccess < 80) {
    state = "CRITICAL";
  } else if (errorRate > 5 || latencyP95 > 2000 || workerSuccess < 95) {
    state = "DEGRADED";
  } else if (errorRate > 1 || latencyP95 > 800) {
    state = "WATCH";
  }

  return {
    score,
    state,
    factors: { workerSuccess, latencyP95, errorRate, safeModeActive: false },
    activationSafeMode: { active: false, blockers: [] },
  };
}

export async function buildRuntimeHealth(
  env: ActivationSafeModeEnv,
  input: {
    telemetry: Pick<TelemetryRollup, "requestCount" | "errorCount" | "latencyP95Ms">;
    beaconSafeMode: boolean;
    ghostConnected: boolean;
  },
): Promise<RuntimeHealth> {
  const activation = await evaluateActivationSafeMode(env);
  const health = computeRuntimeHealth({
    telemetry: input.telemetry,
    beaconSafeMode: input.beaconSafeMode,
    activationSafeMode: activation.active,
    ghostConnected: input.ghostConnected,
  });
  return {
    ...health,
    activationSafeMode: {
      active: activation.active,
      blockers: activation.blockers,
    },
  };
}
