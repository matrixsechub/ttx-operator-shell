import type {
  PrismPatchProposal,
  PrismPatchProposalSummary,
  PrismTriageItem,
  PrismTriageItemSummary,
  PrismTriageStatus,
} from "./data/prismTriageTypes";
import { assertPrismPatchProposalInvariants, assertPrismTriageInvariants } from "./data/prismTriageTypes";
import { readUiUxAudit, type PrismUiuxStorageEnv } from "./prismUiuxStorage";

const TRIAGE_PREFIX = "mshops:uiux:v1:triage:";
const TRIAGE_INDEX_KEY = "mshops:uiux:v1:triage:index";
const TRIAGE_AUDIT_PREFIX = "mshops:uiux:v1:triage:audit:";
const PROPOSAL_PREFIX = "mshops:uiux:v1:proposal:";
const PROPOSAL_INDEX_KEY = "mshops:uiux:v1:proposal:index";
const PROPOSAL_TRIAGE_PREFIX = "mshops:uiux:v1:proposal:triage:";

const TRIAGE_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_TRIAGE_INDEX = 100;
const MAX_PROPOSAL_INDEX = 100;
const MAX_PROPOSALS_PER_TRIAGE = 10;
const MAX_AUDIT_TRIAGE_LOOKUP = 50;

export class PrismTriageStorageError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type PrismTriageStorageEnv = PrismUiuxStorageEnv;

function requireKv(env: PrismTriageStorageEnv): KVNamespace {
  if (!env.TTX_STATE) {
    throw new PrismTriageStorageError(503, "TTX_STATE storage is not configured");
  }
  return env.TTX_STATE;
}

function toTriageSummary(item: PrismTriageItem): PrismTriageItemSummary {
  return {
    triageId: item.triageId,
    sourceAuditId: item.sourceAuditId,
    title: item.title,
    routes: item.routes,
    highestSeverity: item.highestSeverity,
    priorityScore: item.priorityScore,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    advisoryOnly: item.advisoryOnly,
    mutationAuthorized: item.mutationAuthorized,
    operatorDecisionRequired: item.operatorDecisionRequired,
  };
}

function toProposalSummary(proposal: PrismPatchProposal): PrismPatchProposalSummary {
  return {
    proposalId: proposal.proposalId,
    triageId: proposal.triageId,
    sourceAuditId: proposal.sourceAuditId,
    title: proposal.title,
    risk: proposal.risk,
    estimatedComplexity: proposal.estimatedComplexity,
    generatedAt: proposal.generatedAt,
    advisoryOnly: proposal.advisoryOnly,
    mutationAuthorized: proposal.mutationAuthorized,
    operatorApprovalRequired: proposal.operatorApprovalRequired,
    governance: proposal.governance,
  };
}

async function readJsonArray<T>(kv: KVNamespace, key: string): Promise<T[]> {
  const raw = await kv.get(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveTriageItem(env: PrismTriageStorageEnv, item: PrismTriageItem): Promise<void> {
  assertPrismTriageInvariants(item);
  const kv = requireKv(env);
  item.updatedAt = new Date().toISOString();

  await kv.put(`${TRIAGE_PREFIX}${item.triageId}`, JSON.stringify(item), {
    expirationTtl: TRIAGE_TTL_SECONDS,
  });

  const index = await readJsonArray<PrismTriageItemSummary>(kv, TRIAGE_INDEX_KEY);
  const summary = toTriageSummary(item);
  const nextIndex = [summary, ...index.filter((e) => e.triageId !== item.triageId)].slice(0, MAX_TRIAGE_INDEX);
  await kv.put(TRIAGE_INDEX_KEY, JSON.stringify(nextIndex), { expirationTtl: TRIAGE_TTL_SECONDS });

  const auditKey = `${TRIAGE_AUDIT_PREFIX}${item.sourceAuditId}`;
  const auditIds = await readJsonArray<string>(kv, auditKey);
  const nextAuditIds = [item.triageId, ...auditIds.filter((id) => id !== item.triageId)].slice(
    0,
    MAX_AUDIT_TRIAGE_LOOKUP,
  );
  await kv.put(auditKey, JSON.stringify(nextAuditIds), { expirationTtl: TRIAGE_TTL_SECONDS });
}

export async function readTriageItem(env: PrismTriageStorageEnv, triageId: string): Promise<PrismTriageItem | null> {
  const kv = requireKv(env);
  const raw = await kv.get(`${TRIAGE_PREFIX}${triageId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PrismTriageItem;
  } catch {
    return null;
  }
}

export async function listTriageSummaries(env: PrismTriageStorageEnv): Promise<PrismTriageItemSummary[]> {
  const kv = requireKv(env);
  const index = await readJsonArray<PrismTriageItemSummary>(kv, TRIAGE_INDEX_KEY);
  return index.sort((a, b) => b.priorityScore - a.priorityScore || b.updatedAt.localeCompare(a.updatedAt));
}

export async function listTriageItemsForAudit(
  env: PrismTriageStorageEnv,
  auditId: string,
): Promise<PrismTriageItem[]> {
  const kv = requireKv(env);
  const ids = await readJsonArray<string>(kv, `${TRIAGE_AUDIT_PREFIX}${auditId}`);
  const items: PrismTriageItem[] = [];
  for (const id of ids) {
    const item = await readTriageItem(env, id);
    if (item) items.push(item);
  }
  return items.sort((a, b) => b.priorityScore - a.priorityScore);
}

export async function loadExistingTriageMap(env: PrismTriageStorageEnv, auditId: string): Promise<Map<string, PrismTriageItem>> {
  const items = await listTriageItemsForAudit(env, auditId);
  return new Map(items.map((item) => [item.triageId, item]));
}

export async function savePatchProposal(env: PrismTriageStorageEnv, proposal: PrismPatchProposal): Promise<void> {
  assertPrismPatchProposalInvariants(proposal);
  const kv = requireKv(env);

  await kv.put(`${PROPOSAL_PREFIX}${proposal.proposalId}`, JSON.stringify(proposal), {
    expirationTtl: TRIAGE_TTL_SECONDS,
  });

  const index = await readJsonArray<PrismPatchProposalSummary>(kv, PROPOSAL_INDEX_KEY);
  const summary = toProposalSummary(proposal);
  const nextIndex = [summary, ...index.filter((e) => e.proposalId !== proposal.proposalId)].slice(
    0,
    MAX_PROPOSAL_INDEX,
  );
  await kv.put(PROPOSAL_INDEX_KEY, JSON.stringify(nextIndex), { expirationTtl: TRIAGE_TTL_SECONDS });

  const triageKey = `${PROPOSAL_TRIAGE_PREFIX}${proposal.triageId}`;
  const triageProposalIds = await readJsonArray<string>(kv, triageKey);
  const nextTriageIds = [proposal.proposalId, ...triageProposalIds.filter((id) => id !== proposal.proposalId)].slice(
    0,
    MAX_PROPOSALS_PER_TRIAGE,
  );
  await kv.put(triageKey, JSON.stringify(nextTriageIds), { expirationTtl: TRIAGE_TTL_SECONDS });
}

export async function readPatchProposal(
  env: PrismTriageStorageEnv,
  proposalId: string,
): Promise<PrismPatchProposal | null> {
  const kv = requireKv(env);
  const raw = await kv.get(`${PROPOSAL_PREFIX}${proposalId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PrismPatchProposal;
  } catch {
    return null;
  }
}

export async function listProposalSummaries(env: PrismTriageStorageEnv): Promise<PrismPatchProposalSummary[]> {
  const kv = requireKv(env);
  const index = await readJsonArray<PrismPatchProposalSummary>(kv, PROPOSAL_INDEX_KEY);
  return index.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

export async function listProposalsForTriage(
  env: PrismTriageStorageEnv,
  triageId: string,
): Promise<PrismPatchProposal[]> {
  const kv = requireKv(env);
  const ids = await readJsonArray<string>(kv, `${PROPOSAL_TRIAGE_PREFIX}${triageId}`);
  const proposals: PrismPatchProposal[] = [];
  for (const id of ids) {
    const proposal = await readPatchProposal(env, id);
    if (proposal) proposals.push(proposal);
  }
  return proposals.sort((a, b) => b.governance.revision - a.governance.revision);
}

export async function getNextProposalRevision(env: PrismTriageStorageEnv, triageId: string): Promise<number> {
  const proposals = await listProposalsForTriage(env, triageId);
  if (proposals.length === 0) return 1;
  return Math.max(...proposals.map((p) => p.governance.revision)) + 1;
}

export function validateDispositionTransition(
  current: PrismTriageStatus,
  next: PrismTriageStatus,
): { ok: true } | { ok: false; reason: string } {
  if (current === "superseded") {
    return { ok: false, reason: "Superseded triage items cannot change status" };
  }
  if (next === "accepted_for_planning" || next === "deferred" || next === "dismissed") {
    if (["new", "reviewing", "proposal_ready", "deferred", "dismissed"].includes(current)) {
      return { ok: true };
    }
    if (current === "accepted_for_planning" && next === "deferred") {
      return { ok: true };
    }
    return { ok: false, reason: `Cannot transition from ${current} to ${next}` };
  }
  return { ok: false, reason: `Disposition status ${next} is not operator-controlled in Phase 2D` };
}

export async function assertSourceAuditUnchanged(
  env: PrismTriageStorageEnv,
  auditId: string,
  expectedEvidenceHash: string,
): Promise<void> {
  const audit = await readUiUxAudit(env, auditId);
  if (!audit) {
    throw new PrismTriageStorageError(404, "Source audit not found");
  }
  if (audit.evidenceHash !== expectedEvidenceHash) {
    throw new PrismTriageStorageError(409, "Source audit evidence hash changed unexpectedly");
  }
}

export const PRISM_TRIAGE_STORAGE_LIMITS = {
  MAX_TRIAGE_INDEX,
  MAX_PROPOSAL_INDEX,
  MAX_PROPOSALS_PER_TRIAGE,
  MAX_AUDIT_TRIAGE_LOOKUP,
  TRIAGE_TTL_SECONDS,
} as const;
