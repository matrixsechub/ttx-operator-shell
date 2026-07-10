import type { PrismTriageStorageEnv } from "../prismTriageStorage";

const TELEMETRY_PREFIX = "mshops:uiux:v1:telemetry:";
const TELEMETRY_INDEX_KEY = "mshops:uiux:v1:telemetry:index";
const MAX_TELEMETRY_EVENTS = 200;

export type PrismTriageTelemetryEventName =
  | "prism_triage_generation_started"
  | "prism_triage_item_created"
  | "prism_triage_item_updated"
  | "prism_triage_disposition_recorded"
  | "prism_patch_proposal_requested"
  | "prism_patch_proposal_generated"
  | "prism_patch_proposal_regenerated"
  | "prism_patch_proposal_blocked"
  | "prism_triage_queue_viewed"
  | "prism_triage_invariant_failed";

export type PrismTriageTelemetryPayload = {
  event: PrismTriageTelemetryEventName;
  timestamp: string;
  auditIdHash?: string;
  triageId?: string;
  proposalId?: string;
  severity?: string;
  priorityScore?: number;
  routeCount?: number;
  findingCount?: number;
  proposalRevision?: number;
  status?: string;
  durationMs?: number;
  evidenceHash?: string;
  mutationAuthorized: false;
};

const SENSITIVE_PATTERN =
  /(bearer\s+|authorization:|password|token|cookie|set-cookie|api[_-]?key|secret|screenshot)/i;

export function redactTelemetryValue(value: string): string {
  const withoutQuery = value.includes("?") ? (value.split("?")[0] ?? value) : value;
  if (SENSITIVE_PATTERN.test(value) || SENSITIVE_PATTERN.test(withoutQuery)) {
    return "[REDACTED]";
  }
  return withoutQuery;
}

export function hashAuditId(auditId: string): string {
  return auditId.slice(0, 8);
}

export function buildPrismTriageTelemetry(
  event: PrismTriageTelemetryEventName,
  fields: Omit<PrismTriageTelemetryPayload, "event" | "timestamp" | "mutationAuthorized">,
): PrismTriageTelemetryPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    mutationAuthorized: false,
    ...fields,
    evidenceHash: fields.evidenceHash ? redactTelemetryValue(fields.evidenceHash) : undefined,
  };
}

export async function emitPrismTriageTelemetry(
  env: PrismTriageStorageEnv,
  payload: PrismTriageTelemetryPayload,
): Promise<void> {
  if (!env.TTX_STATE) return;
  const eventId = crypto.randomUUID();
  const safePayload = JSON.parse(JSON.stringify(payload)) as PrismTriageTelemetryPayload;
  await env.TTX_STATE.put(`${TELEMETRY_PREFIX}${eventId}`, JSON.stringify(safePayload), {
    expirationTtl: 60 * 60 * 24 * 30,
  });
  const raw = await env.TTX_STATE.get(TELEMETRY_INDEX_KEY);
  const index = raw ? (JSON.parse(raw) as string[]) : [];
  index.unshift(eventId);
  await env.TTX_STATE.put(TELEMETRY_INDEX_KEY, JSON.stringify(index.slice(0, MAX_TELEMETRY_EVENTS)));
  console.warn(`[PRISM_TRIAGE_TELEMETRY] ${payload.event} mutationAuthorized=false`);
}
