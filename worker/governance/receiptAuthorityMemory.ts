import type {
  ReceiptCompleteInput,
  ReceiptFailInput,
  ReceiptReserveInput,
  ReceiptReserveStatus,
} from "./receiptReserveLogic";
import { evaluateReceiptReserve } from "./receiptReserveLogic";

interface MemoryRow {
  approval_id: string;
  nonce: string;
  action_digest: string;
  idempotency_key: string;
  execution_id: string;
  status: string;
  expires_at: string;
  result_digest: string | null;
  error_code: string | null;
  reserved_at: string;
}

const memoryStore = new Map<string, MemoryRow>();

function memoryReserve(input: ReceiptReserveInput): ReceiptReserveStatus {
  const rows = [...memoryStore.values()];
  const result = evaluateReceiptReserve(rows, input, Date.now());
  if (result.status === "reserved") {
    memoryStore.set(input.approvalId, {
      approval_id: input.approvalId,
      nonce: input.nonce,
      action_digest: input.actionDigest,
      idempotency_key: input.idempotencyKey,
      execution_id: input.executionId,
      status: "reserved",
      expires_at: input.expiresAt,
      result_digest: null,
      error_code: null,
      reserved_at: new Date().toISOString(),
    });
  }
  return result;
}

function memoryComplete(input: ReceiptCompleteInput): void {
  const row = memoryStore.get(input.approvalId);
  if (row && row.execution_id === input.executionId && row.status === "reserved") {
    row.status = "completed";
    row.result_digest = input.resultDigest;
  }
}

function memoryFail(input: ReceiptFailInput): void {
  const row = memoryStore.get(input.approvalId);
  if (row && row.execution_id === input.executionId && row.status === "reserved") {
    row.status = "failed";
    row.error_code = input.errorCode;
  }
}

export function createMemoryReceiptAuthorityClient(): {
  reserve(input: ReceiptReserveInput): Promise<ReceiptReserveStatus>;
  complete(input: ReceiptCompleteInput): Promise<void>;
  fail(input: ReceiptFailInput): Promise<void>;
  health(): Promise<{ ok: boolean }>;
  reset(): void;
} {
  return {
    reserve: async (input) => memoryReserve(input),
    complete: async (input) => memoryComplete(input),
    fail: async (input) => memoryFail(input),
    health: async () => ({ ok: true }),
    reset: () => memoryStore.clear(),
  };
}

export function resetMemoryReceiptAuthority(): void {
  memoryStore.clear();
}
