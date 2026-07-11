import type { AuditEvent } from "./types";
import type { ActionProposal, ApprovalReceipt } from "./types";
import type { ProposalStoreEnv } from "./proposalStore";

const AUDIT_PREFIX = "governance:v1:audit:";
const AUDIT_INDEX_KEY = "governance:v1:audit:index";
const AUDIT_TTL_SECONDS = 60 * 60 * 24 * 90;

export interface AuditDbEnv extends ProposalStoreEnv {
  AUDIT_DB?: D1Database;
}

async function readAuditIndex(env: AuditDbEnv): Promise<string[]> {
  const raw = await env.TTX_STATE.get(AUDIT_INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function writeAuditIndex(env: AuditDbEnv, ids: string[]): Promise<void> {
  await env.TTX_STATE.put(AUDIT_INDEX_KEY, JSON.stringify(ids.slice(0, 1000)));
}

async function persistAuditKv(env: AuditDbEnv, event: AuditEvent): Promise<void> {
  await env.TTX_STATE.put(`${AUDIT_PREFIX}${event.event_id}`, JSON.stringify(event), {
    expirationTtl: AUDIT_TTL_SECONDS,
  });
  const index = await readAuditIndex(env);
  index.unshift(event.event_id);
  await writeAuditIndex(env, index);
}

async function persistAuditD1(env: AuditDbEnv, event: AuditEvent): Promise<void> {
  if (!env.AUDIT_DB) return;
  await env.AUDIT_DB.prepare(
    `INSERT INTO audit_events (
      event_id, timestamp, actor_type, actor_id, operator_id, action_class,
      system_target, beacon_hash, codex_hash, trace_id, proposal_id, approval_id,
      risk_score, result, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      event.event_id,
      event.timestamp,
      event.actor_type,
      event.actor_id,
      event.operator_id ?? null,
      event.action_class,
      event.system_target,
      event.beacon_hash,
      event.codex_hash,
      event.trace_id,
      event.proposal_id ?? null,
      event.approval_id ?? null,
      event.risk_score,
      event.result,
      JSON.stringify({
        input_refs: event.input_refs ?? [],
        output_refs: event.output_refs ?? [],
        rollback_ref: event.rollback_ref ?? null,
      }),
    )
    .run();
}

export class AuditWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditWriteError";
  }
}

export async function recordAuditEvent(
  env: AuditDbEnv,
  event: AuditEvent,
  options?: { failClosed?: boolean },
): Promise<AuditEvent> {
  try {
    await Promise.all([persistAuditKv(env, event), persistAuditD1(env, event)]);
    return event;
  } catch (error) {
    if (options?.failClosed) {
      throw new AuditWriteError(error instanceof Error ? error.message : "audit write failed");
    }
    throw error;
  }
}

export interface ListAuditEventsOptions {
  limit?: number;
  cursor?: number;
}

export interface ListAuditEventsResult {
  events: AuditEvent[];
  total: number;
  nextCursor: number | null;
}

async function readAuditEventById(env: AuditDbEnv, id: string): Promise<AuditEvent | null> {
  const raw = await env.TTX_STATE.get(`${AUDIT_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuditEvent;
  } catch {
    return null;
  }
}

export async function listRecentAuditEvents(
  env: AuditDbEnv,
  options: ListAuditEventsOptions = {},
): Promise<ListAuditEventsResult> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const cursor = Math.max(options.cursor ?? 0, 0);
  const ids = await readAuditIndex(env);
  const slice = ids.slice(cursor, cursor + limit);
  const events: AuditEvent[] = [];

  for (const id of slice) {
    const event = await readAuditEventById(env, id);
    if (event) events.push(event);
  }

  const nextOffset = cursor + limit;
  return {
    events,
    total: ids.length,
    nextCursor: nextOffset < ids.length ? nextOffset : null,
  };
}

export async function listAuditEventsForProposal(
  env: AuditDbEnv,
  proposalId: string,
): Promise<AuditEvent[]> {
  const ids = await readAuditIndex(env);
  const events: AuditEvent[] = [];
  for (const id of ids) {
    const event = await readAuditEventById(env, id);
    if (event?.proposal_id === proposalId) events.push(event);
  }
  return events;
}

export interface EvidenceBundle {
  proposal_id: string;
  generated_at: string;
  proposal: ActionProposal | null;
  receipt: ApprovalReceipt | null;
  audit_events: AuditEvent[];
}

export async function buildEvidenceBundle(
  env: AuditDbEnv,
  proposalId: string,
  proposal: ActionProposal | null,
  receipt: ApprovalReceipt | null,
): Promise<EvidenceBundle> {
  const audit_events = await listAuditEventsForProposal(env, proposalId);
  return {
    proposal_id: proposalId,
    generated_at: new Date().toISOString(),
    proposal,
    receipt,
    audit_events,
  };
}
