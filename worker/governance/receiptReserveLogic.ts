export type ReceiptReserveStatus =
  | { status: "reserved"; executionId: string }
  | { status: "already_completed"; executionId: string }
  | { status: "in_progress"; executionId: string }
  | { status: "conflict"; reasonCode: string }
  | { status: "expired" };

export interface ReceiptReserveInput {
  approvalId: string;
  nonce: string;
  actionDigest: string;
  idempotencyKey: string;
  executionId: string;
  expiresAt: string;
}

export interface ReceiptCompleteInput {
  approvalId: string;
  executionId: string;
  resultDigest: string;
}

export interface ReceiptFailInput {
  approvalId: string;
  executionId: string;
  errorCode: string;
}

export interface ReservationRow {
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

export function evaluateReceiptReserve(
  rows: ReservationRow[],
  input: ReceiptReserveInput,
  nowMs: number,
): ReceiptReserveStatus {
  if (Date.parse(input.expiresAt) <= nowMs) {
    return { status: "expired" };
  }
  const byIdempotency = rows.find((row) => row.idempotency_key === input.idempotencyKey);
  if (byIdempotency) {
    if (byIdempotency.action_digest !== input.actionDigest) {
      return { status: "conflict", reasonCode: "IDEMPOTENCY_DIGEST_MISMATCH" };
    }
    if (byIdempotency.status === "completed") {
      return { status: "already_completed", executionId: byIdempotency.execution_id };
    }
    if (byIdempotency.status === "reserved") {
      return { status: "in_progress", executionId: byIdempotency.execution_id };
    }
    return { status: "conflict", reasonCode: "PRIOR_EXECUTION_FAILED" };
  }
  const existing = rows.find((row) => row.approval_id === input.approvalId);
  if (existing) {
    if (existing.idempotency_key === input.idempotencyKey) {
      if (existing.status === "completed") {
        return { status: "already_completed", executionId: existing.execution_id };
      }
      if (existing.status === "reserved") {
        return { status: "in_progress", executionId: existing.execution_id };
      }
    }
    return { status: "conflict", reasonCode: "RECEIPT_CONSUMED" };
  }
  return { status: "reserved", executionId: input.executionId };
}
