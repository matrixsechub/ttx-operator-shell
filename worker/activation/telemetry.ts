import type { ActivationTelemetryEvent } from "./types";
import { hashSessionId } from "./trafficQuality";

const ACTIVATION_EVENTS_KEY = "telemetry:activation-events";
const MAX_ACTIVATION_EVENTS = 100;

export interface ActivationTelemetryEnv {
  TTX_STATE: KVNamespace;
}

export async function logActivationTelemetry(
  env: ActivationTelemetryEnv,
  event: Omit<ActivationTelemetryEvent, "timestamp"> & { sessionId?: string },
): Promise<void> {
  const record: ActivationTelemetryEvent = {
    type: event.type,
    campaignId: event.campaignId,
    metadata: event.metadata,
    sessionIdHash: event.sessionId ? hashSessionId(event.sessionId) : event.sessionIdHash,
    timestamp: new Date().toISOString(),
  };

  const raw = await env.TTX_STATE.get(ACTIVATION_EVENTS_KEY);
  const events = raw ? (JSON.parse(raw) as ActivationTelemetryEvent[]) : [];
  events.unshift(record);
  await env.TTX_STATE.put(ACTIVATION_EVENTS_KEY, JSON.stringify(events.slice(0, MAX_ACTIVATION_EVENTS)));
}

export async function listActivationTelemetry(env: ActivationTelemetryEnv): Promise<ActivationTelemetryEvent[]> {
  const raw = await env.TTX_STATE.get(ACTIVATION_EVENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ActivationTelemetryEvent[];
  } catch {
    return [];
  }
}
