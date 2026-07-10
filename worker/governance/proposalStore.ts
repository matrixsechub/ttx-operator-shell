import type { ActionProposal, ApprovalReceipt, ProposalStatus } from "./types";
import { computeProposalActionDigest } from "./proposalActionDigest";

const PROPOSAL_PREFIX = "governance:v1:proposal:";
const RECEIPT_PREFIX = "governance:v1:receipt:";
const PROPOSAL_INDEX_KEY = "governance:v1:proposal:index";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface ProposalStoreEnv {
  TTX_STATE: KVNamespace;
}

function proposalKey(proposalId: string): string {
  return `${PROPOSAL_PREFIX}${proposalId}`;
}

function receiptKey(approvalId: string): string {
  return `${RECEIPT_PREFIX}${approvalId}`;
}

async function readIndex(env: ProposalStoreEnv): Promise<string[]> {
  const raw = await env.TTX_STATE.get(PROPOSAL_INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function writeIndex(env: ProposalStoreEnv, ids: string[]): Promise<void> {
  await env.TTX_STATE.put(PROPOSAL_INDEX_KEY, JSON.stringify(ids.slice(0, 500)));
}

export async function saveProposal(env: ProposalStoreEnv, proposal: ActionProposal): Promise<ActionProposal> {
  await env.TTX_STATE.put(proposalKey(proposal.proposal_id), JSON.stringify(proposal), {
    expirationTtl: DEFAULT_TTL_SECONDS,
  });
  const index = await readIndex(env);
  if (!index.includes(proposal.proposal_id)) {
    index.unshift(proposal.proposal_id);
    await writeIndex(env, index);
  }
  return proposal;
}

export async function getProposal(env: ProposalStoreEnv, proposalId: string): Promise<ActionProposal | null> {
  const raw = await env.TTX_STATE.get(proposalKey(proposalId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActionProposal;
  } catch {
    return null;
  }
}

export async function listProposals(
  env: ProposalStoreEnv,
  status?: ProposalStatus,
): Promise<ActionProposal[]> {
  const ids = await readIndex(env);
  const proposals: ActionProposal[] = [];
  for (const id of ids) {
    const proposal = await getProposal(env, id);
    if (!proposal) continue;
    if (status && proposal.status !== status) continue;
    proposals.push(proposal);
  }
  return proposals;
}

export async function countGovernanceProposals(
  env: ProposalStoreEnv,
): Promise<{ pending: number; expired: number }> {
  const proposals = await listProposals(env);
  const now = Date.now();
  let pending = 0;
  let expired = 0;
  for (const proposal of proposals) {
    if (proposal.status === "pending") pending += 1;
    if (proposal.status === "expired" || (proposal.status === "pending" && Date.parse(proposal.expiration) <= now)) {
      expired += 1;
    }
  }
  return { pending, expired };
}

export async function updateProposalStatus(
  env: ProposalStoreEnv,
  proposalId: string,
  status: ProposalStatus,
  patch: Partial<ActionProposal> = {},
): Promise<ActionProposal | null> {
  const existing = await getProposal(env, proposalId);
  if (!existing) return null;
  const updated: ActionProposal = { ...existing, ...patch, status };
  await saveProposal(env, updated);
  return updated;
}

export async function saveApprovalReceipt(env: ProposalStoreEnv, receipt: ApprovalReceipt): Promise<void> {
  await env.TTX_STATE.put(receiptKey(receipt.approvalId), JSON.stringify(receipt), {
    expirationTtl: DEFAULT_TTL_SECONDS,
  });
}

export async function getApprovalReceipt(
  env: ProposalStoreEnv,
  approvalId: string,
): Promise<ApprovalReceipt | null> {
  const raw = await env.TTX_STATE.get(receiptKey(approvalId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApprovalReceipt;
  } catch {
    return null;
  }
}

export async function findReceiptForProposal(
  env: ProposalStoreEnv,
  proposalId: string,
): Promise<ApprovalReceipt | null> {
  const proposal = await getProposal(env, proposalId);
  if (!proposal?.approval_id) return null;
  return getApprovalReceipt(env, proposal.approval_id);
}

export async function verifyApprovalReceiptForRequest(
  env: ProposalStoreEnv,
  body: Record<string, unknown>,
): Promise<{ valid: boolean; reason: string; proposal?: ActionProposal; receipt?: ApprovalReceipt }> {
  const proposalId = typeof body.proposalId === "string" ? body.proposalId : "";
  const approvalId = typeof body.approvalId === "string" ? body.approvalId : "";
  if (!proposalId || !approvalId) {
    return { valid: false, reason: "proposalId and approvalId are required for approval receipt" };
  }

  const [proposal, receipt] = await Promise.all([
    getProposal(env, proposalId),
    getApprovalReceipt(env, approvalId),
  ]);
  if (!proposal) return { valid: false, reason: "Proposal not found" };
  if (!receipt) return { valid: false, reason: "Approval receipt not found" };
  if (receipt.proposalId !== proposalId) return { valid: false, reason: "Receipt proposal mismatch" };
  if (proposal.status !== "approved" && proposal.status !== "executed") {
    return { valid: false, reason: "Proposal not approved" };
  }
  if (Date.parse(receipt.expiresAt) <= Date.now()) {
    return { valid: false, reason: "Approval receipt expired" };
  }

  const actionHash = await computeProposalActionDigest(proposal, receipt.targetEnvironment);
  if (receipt.actionDigest !== actionHash) {
    return { valid: false, reason: "Approved action digest mismatch — proposal changed after approval" };
  }

  return { valid: true, reason: "Valid approval receipt", proposal, receipt };
}
