import type { UiUxApprovalRecord, UiUxAudit, UiUxAuditSummary } from "./data/prismUiuxTypes";

const AUDIT_PREFIX = "mshops:uiux:v1:audit:";
const INDEX_KEY = "mshops:uiux:v1:index";
const ROUTE_PREFIX = "mshops:uiux:v1:route:";
const AUDIT_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_INDEX_ENTRIES = 50;
const MAX_ROUTE_HISTORY = 10;

export type PrismUiuxStorageEnv = {
  TTX_STATE?: KVNamespace;
};

export class PrismUiuxStorageError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function requireKv(env: PrismUiuxStorageEnv): KVNamespace {
  if (!env.TTX_STATE) {
    throw new PrismUiuxStorageError(503, "TTX_STATE storage is not configured");
  }
  return env.TTX_STATE;
}

export async function routeHash(route: string): Promise<string> {
  const normalized = route.replace(/\/$/, "") || "/";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

function toSummary(audit: UiUxAudit): UiUxAuditSummary {
  return {
    auditId: audit.auditId,
    mode: audit.mode,
    routes: audit.routes,
    component: audit.component,
    viewport: audit.viewport,
    overallScore: audit.scorecard.overall,
    releaseRecommendation: audit.releaseRecommendation,
    findingCount: audit.findings.length,
    criticalCount: audit.findings.filter((f) => f.severity === "critical").length,
    createdAt: audit.createdAt,
    evidenceHash: audit.evidenceHash,
  };
}

async function readIndex(kv: KVNamespace): Promise<UiUxAuditSummary[]> {
  const raw = await kv.get(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as UiUxAuditSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(kv: KVNamespace, entries: UiUxAuditSummary[]): Promise<void> {
  const trimmed = entries.slice(0, MAX_INDEX_ENTRIES);
  await kv.put(INDEX_KEY, JSON.stringify(trimmed), { expirationTtl: AUDIT_TTL_SECONDS });
}

async function updateRouteIndex(kv: KVNamespace, route: string, auditId: string): Promise<void> {
  const hash = await routeHash(route);
  const key = `${ROUTE_PREFIX}${hash}`;
  const raw = await kv.get(key);
  let ids: string[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as string[];
      ids = Array.isArray(parsed) ? parsed : [];
    } catch {
      ids = [];
    }
  }
  const next = [auditId, ...ids.filter((id) => id !== auditId)].slice(0, MAX_ROUTE_HISTORY);
  await kv.put(key, JSON.stringify(next), { expirationTtl: AUDIT_TTL_SECONDS });
}

export async function saveUiUxAudit(env: PrismUiuxStorageEnv, audit: UiUxAudit): Promise<void> {
  const kv = requireKv(env);
  try {
    await kv.put(`${AUDIT_PREFIX}${audit.auditId}`, JSON.stringify(audit), {
      expirationTtl: AUDIT_TTL_SECONDS,
    });

    const summary = toSummary(audit);
    const index = await readIndex(kv);
    const nextIndex = [summary, ...index.filter((e) => e.auditId !== audit.auditId)];
    await writeIndex(kv, nextIndex);

    for (const route of audit.routes) {
      await updateRouteIndex(kv, route, audit.auditId);
    }
  } catch (err) {
    console.error("prism-uiux: failed to persist audit", audit.auditId, err instanceof Error ? err.message : err);
    throw new PrismUiuxStorageError(500, "Failed to persist audit");
  }
}

export async function readUiUxAudit(env: PrismUiuxStorageEnv, auditId: string): Promise<UiUxAudit | null> {
  const kv = requireKv(env);
  try {
    const raw = await kv.get(`${AUDIT_PREFIX}${auditId}`);
    if (!raw) return null;
    return JSON.parse(raw) as UiUxAudit;
  } catch (err) {
    console.error("prism-uiux: failed to read audit", auditId, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function listUiUxAuditSummaries(env: PrismUiuxStorageEnv): Promise<UiUxAuditSummary[]> {
  const kv = requireKv(env);
  const index = await readIndex(kv);
  return index.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateUiUxAudit(
  env: PrismUiuxStorageEnv,
  audit: UiUxAudit,
): Promise<void> {
  audit.updatedAt = new Date().toISOString();
  await saveUiUxAudit(env, audit);
}

export function applyApprovalToAudit(
  audit: UiUxAudit,
  record: UiUxApprovalRecord,
): UiUxAudit {
  const findingIdSet = new Set(record.findingIds);
  const updatedFindings = audit.findings.map((f) => {
    if (record.findingIds.length === 0 || findingIdSet.has(f.id)) {
      return { ...f, status: record.action === "approve" ? ("accepted" as const) : ("rejected" as const) };
    }
    return f;
  });
  return {
    ...audit,
    findings: updatedFindings,
    approvals: [...audit.approvals, record],
    updatedAt: new Date().toISOString(),
  };
}

export function applyRejectionToAudit(
  audit: UiUxAudit,
  record: UiUxApprovalRecord,
): UiUxAudit {
  return applyApprovalToAudit(audit, record);
}
