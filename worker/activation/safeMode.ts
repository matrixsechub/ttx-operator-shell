import type { ActivationSafeModeState } from "./types";
import { getUsageSummary, type UsageContextEnv } from "../usage";

export interface ActivationSafeModeEnv extends UsageContextEnv {
  ACTIVATION_SAFE_MODE?: string;
}

let attributionFailureCount = 0;
let kvWriteFailureCount = 0;

export function recordAttributionFailure(): void {
  attributionFailureCount += 1;
}

export function recordKvWriteFailure(): void {
  kvWriteFailureCount += 1;
}

export function resetSafeModeCounters(): void {
  attributionFailureCount = 0;
  kvWriteFailureCount = 0;
}

const ATTRIBUTION_FAILURE_THRESHOLD = 10;
const KV_FAILURE_THRESHOLD = 5;

export async function evaluateActivationSafeMode(env: ActivationSafeModeEnv): Promise<ActivationSafeModeState> {
  if (env.ACTIVATION_SAFE_MODE === "true" || env.ACTIVATION_SAFE_MODE === "1") {
    return {
      active: true,
      blockers: ["env_override"],
      triggeredAt: new Date().toISOString(),
    };
  }

  const blockers: string[] = [];
  const usage = await getUsageSummary(env);

  if (usage.signalIntegrity !== "VALID") {
    blockers.push("signal_integrity_invalid");
  }
  if (attributionFailureCount >= ATTRIBUTION_FAILURE_THRESHOLD) {
    blockers.push("attribution_write_failure_rate");
  }
  if (kvWriteFailureCount >= KV_FAILURE_THRESHOLD) {
    blockers.push("kv_write_failures");
  }

  return {
    active: blockers.length > 0,
    blockers,
    triggeredAt: blockers.length > 0 ? new Date().toISOString() : undefined,
  };
}

export function safeModeResponse(blockers: string[]): Response {
  return Response.json(
    {
      ok: false,
      error: "activation_safe_mode",
      blockers,
    },
    { status: 503 },
  );
}
