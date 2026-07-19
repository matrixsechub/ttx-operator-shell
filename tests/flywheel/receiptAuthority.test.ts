import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateReceiptReserve,
  type ReceiptReserveInput,
  type ReservationRow,
} from "../../worker/governance/receiptReserveLogic.ts";

function input(overrides: Partial<ReceiptReserveInput> = {}): ReceiptReserveInput {
  return {
    approvalId: "approval-1",
    nonce: "nonce-1",
    actionDigest: "a".repeat(64),
    idempotencyKey: "idem-1",
    executionId: "exec-1",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  };
}

function row(overrides: Partial<ReservationRow> & Pick<ReservationRow, "approval_id" | "idempotency_key" | "execution_id" | "status">): ReservationRow {
  return {
    nonce: "nonce-1",
    action_digest: "a".repeat(64),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    result_digest: null,
    error_code: null,
    reserved_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("ReceiptAuthority reserve logic", () => {
  it("allows the first reserve", () => {
    const first = evaluateReceiptReserve([], input(), Date.now());
    assert.equal(first.status, "reserved");
    if (first.status === "reserved") assert.equal(first.executionId, "exec-1");
  });

  it("conflicts when the same approval is reserved under a different idempotency key", () => {
    const reserved = input();
    const rows = [
      row({
        approval_id: reserved.approvalId,
        idempotency_key: reserved.idempotencyKey,
        execution_id: reserved.executionId,
        status: "reserved",
        action_digest: reserved.actionDigest,
      }),
    ];
    const second = evaluateReceiptReserve(
      rows,
      input({ executionId: "exec-2", idempotencyKey: "idem-2" }),
      Date.now(),
    );
    assert.equal(second.status, "conflict");
    if (second.status === "conflict") assert.equal(second.reasonCode, "RECEIPT_CONSUMED");
  });

  it("replays completed reservations", () => {
    const completed = input({ approvalId: "approval-2", idempotencyKey: "idem-2", executionId: "exec-2", actionDigest: "b".repeat(64) });
    const rows = [
      row({
        approval_id: completed.approvalId,
        idempotency_key: completed.idempotencyKey,
        execution_id: completed.executionId,
        status: "completed",
        action_digest: completed.actionDigest,
        result_digest: "c".repeat(64),
      }),
    ];
    const replay = evaluateReceiptReserve(rows, completed, Date.now());
    assert.equal(replay.status, "already_completed");
    if (replay.status === "already_completed") assert.equal(replay.executionId, "exec-2");
  });

  it("rejects digest mismatch on the same idempotency key", () => {
    const original = input();
    const rows = [
      row({
        approval_id: original.approvalId,
        idempotency_key: original.idempotencyKey,
        execution_id: original.executionId,
        status: "reserved",
        action_digest: original.actionDigest,
      }),
    ];
    const conflict = evaluateReceiptReserve(
      rows,
      input({ actionDigest: "d".repeat(64) }),
      Date.now(),
    );
    assert.equal(conflict.status, "conflict");
    if (conflict.status === "conflict") assert.equal(conflict.reasonCode, "IDEMPOTENCY_DIGEST_MISMATCH");
  });

  it("rejects expired reservations", () => {
    const expired = evaluateReceiptReserve(
      [],
      input({ expiresAt: new Date(Date.now() - 1_000).toISOString() }),
      Date.now(),
    );
    assert.equal(expired.status, "expired");
  });
});
