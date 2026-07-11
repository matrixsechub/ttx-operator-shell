import type { ExecutionReceipt } from "./types";
import type { ProposalStoreEnv } from "./proposalStore";

const EXECUTION_PREFIX = "governance:v2:execution:";
const EXECUTION_INDEX_KEY = "governance:v2:execution:index";
const IDEMPOTENCY_PREFIX = "governance:v2:idempotency:";
const RECEIPT_CONSUMED_PREFIX = "governance:v2:receipt-consumed:";
const TTL_SECONDS = 60 * 60 * 24 * 30;

export async function getExecutionByIdempotencyKey(
  env: ProposalStoreEnv,
  idempotencyKey: string,
): Promise<ExecutionReceipt | null> {
  const raw = await env.TTX_STATE.get(`${IDEMPOTENCY_PREFIX}${idempotencyKey}`);
  if (!raw) return null;
  try {
    const executionId = JSON.parse(raw) as string;
    return getExecutionReceipt(env, executionId);
  } catch {
    return null;
  }
}

export async function getExecutionReceipt(
  env: ProposalStoreEnv,
  executionId: string,
): Promise<ExecutionReceipt | null> {
  const raw = await env.TTX_STATE.get(`${EXECUTION_PREFIX}${executionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExecutionReceipt;
  } catch {
    return null;
  }
}

export async function saveExecutionReceipt(env: ProposalStoreEnv, receipt: ExecutionReceipt): Promise<void> {
  await env.TTX_STATE.put(`${EXECUTION_PREFIX}${receipt.executionId}`, JSON.stringify(receipt), {
    expirationTtl: TTL_SECONDS,
  });
  await env.TTX_STATE.put(`${IDEMPOTENCY_PREFIX}${receipt.idempotencyKey}`, JSON.stringify(receipt.executionId), {
    expirationTtl: TTL_SECONDS,
  });
  const indexRaw = await env.TTX_STATE.get(EXECUTION_INDEX_KEY);
  const index = indexRaw ? (JSON.parse(indexRaw) as string[]) : [];
  index.unshift(receipt.executionId);
  await env.TTX_STATE.put(EXECUTION_INDEX_KEY, JSON.stringify(index.slice(0, 1000)));
}

export async function isReceiptConsumed(env: ProposalStoreEnv, approvalId: string): Promise<boolean> {
  const raw = await env.TTX_STATE.get(`${RECEIPT_CONSUMED_PREFIX}${approvalId}`);
  return raw === "1";
}

export async function reserveReceiptConsumption(
  env: ProposalStoreEnv,
  approvalId: string,
): Promise<boolean> {
  const key = `${RECEIPT_CONSUMED_PREFIX}${approvalId}`;
  const existing = await env.TTX_STATE.get(key);
  if (existing) return false;
  await env.TTX_STATE.put(key, "1", { expirationTtl: TTL_SECONDS });
  return true;
}

export async function countAuditIncompleteExecutions(env: ProposalStoreEnv): Promise<number> {
  const raw = await env.TTX_STATE.get(EXECUTION_INDEX_KEY);
  if (!raw) return 0;
  let count = 0;
  const ids = JSON.parse(raw) as string[];
  for (const id of ids.slice(0, 200)) {
    const receipt = await getExecutionReceipt(env, id);
    if (receipt?.status === "audit_incomplete") count += 1;
  }
  return count;
}
