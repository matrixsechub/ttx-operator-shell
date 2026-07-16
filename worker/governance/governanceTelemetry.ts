import type { ProposalStoreEnv } from "./proposalStore";

const TELEMETRY_PREFIX = "governance:v2:telemetry:";
const TELEMETRY_INDEX_KEY = "governance:v2:telemetry:index";

export async function emitGovernanceTelemetry(
  env: ProposalStoreEnv,
  event: GovernanceTelemetryEvent,
): Promise<void> {
  await env.TTX_STATE.put(`${TELEMETRY_PREFIX}${event.eventId}`, JSON.stringify(event), {
    expirationTtl: 60 * 60 * 24 * 30,
  });
  const raw = await env.TTX_STATE.get(TELEMETRY_INDEX_KEY);
  const index = raw ? (JSON.parse(raw) as string[]) : [];
  index.unshift(event.eventId);
  await env.TTX_STATE.put(TELEMETRY_INDEX_KEY, JSON.stringify(index.slice(0, 500)));
  console.warn(
    `[GOVERNANCE_TELEMETRY] ${event.name} outcome=${event.outcome} env=${event.environment} class=${event.actionClass}`,
  );
}

export interface GovernanceTelemetryEvent {
  eventId: string;
  name: string;
  timestamp: string;
  proposalId?: string;
  approvalId?: string;
  executionId?: string;
  beaconHash: string;
  codexHash: string;
  environment: string;
  actionClass: string;
  outcome: string;
  reasonCode?: string;
  correlationId: string;
}

export function buildTelemetryEvent(
  name: string,
  fields: Omit<GovernanceTelemetryEvent, "eventId" | "name" | "timestamp">,
): GovernanceTelemetryEvent {
  return {
    eventId: crypto.randomUUID(),
    name,
    timestamp: new Date().toISOString(),
    ...fields,
  };
}
