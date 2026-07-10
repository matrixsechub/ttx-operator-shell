import type { ActivationAuditEvent } from "./types";
import { auditKey, campaignAuditIndexKey } from "./kvKeys";

export interface ActivationAuditEnv {
  TTX_STATE: KVNamespace;
}

const AUDIT_INDEX_MAX = 200;

export async function appendActivationAudit(
  env: ActivationAuditEnv,
  event: Omit<ActivationAuditEvent, "auditId" | "createdAt">,
): Promise<ActivationAuditEvent> {
  const auditId = crypto.randomUUID();
  const record: ActivationAuditEvent = {
    ...event,
    auditId,
    createdAt: new Date().toISOString(),
  };

  await env.TTX_STATE.put(auditKey(auditId), JSON.stringify(record));

  if (event.campaignId) {
    const indexKey = campaignAuditIndexKey(event.campaignId);
    const raw = await env.TTX_STATE.get(indexKey);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    ids.unshift(auditId);
    await env.TTX_STATE.put(indexKey, JSON.stringify(ids.slice(0, AUDIT_INDEX_MAX)));
  }

  return record;
}

export async function readActivationAudit(
  env: ActivationAuditEnv,
  auditId: string,
): Promise<ActivationAuditEvent | null> {
  const raw = await env.TTX_STATE.get(auditKey(auditId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActivationAuditEvent;
  } catch {
    return null;
  }
}

export async function listCampaignAuditEvents(
  env: ActivationAuditEnv,
  campaignId: string,
  limit = 50,
): Promise<ActivationAuditEvent[]> {
  const raw = await env.TTX_STATE.get(campaignAuditIndexKey(campaignId));
  if (!raw) return [];
  const ids = JSON.parse(raw) as string[];
  const events: ActivationAuditEvent[] = [];
  for (const id of ids.slice(0, limit)) {
    const event = await readActivationAudit(env, id);
    if (event) events.push(event);
  }
  return events;
}
