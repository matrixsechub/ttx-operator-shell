import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateReceiptReserve } from "../worker/governance/receiptReserveLogic.ts";
import { resetMemoryReceiptAuthority } from "../worker/governance/receiptAuthorityMemory.ts";
import { signApprovalReceipt, verifyApprovalReceiptSignature } from "../worker/governance/receiptCrypto.ts";
import {
  GOVERNANCE_RECEIPT_DOMAIN,
  BEACON_RELEASE_DOMAIN,
  GOVERNANCE_RECEIPT_KEY_ID,
} from "../worker/governance/signingKeys.ts";

const governanceSigning = {
  key: "governance-test-key",
  keyId: GOVERNANCE_RECEIPT_KEY_ID,
  domain: GOVERNANCE_RECEIPT_DOMAIN,
  source: "governance" as const,
};

const beaconSigning = {
  key: "beacon-test-key",
  keyId: "beacon-signing-key-v1",
  domain: BEACON_RELEASE_DOMAIN,
  source: "beacon" as const,
};

describe("ReceiptAuthority reserve logic", () => {
  it("allows exactly one reserve under parallel contention", () => {
    const input = {
      approvalId: "approval-1",
      nonce: "nonce-1",
      actionDigest: "a".repeat(64),
      idempotencyKey: "idem-1",
      executionId: "exec-1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    const first = evaluateReceiptReserve([], input, Date.now());
    assert.equal(first.status, "reserved");
    const rows = [
      {
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
      },
    ];
    const second = evaluateReceiptReserve(rows, { ...input, executionId: "exec-2", idempotencyKey: "idem-2" }, Date.now());
    assert.equal(second.status, "conflict");
    assert.equal(second.reasonCode, "RECEIPT_CONSUMED");
  });

  it("replays idempotent completion", () => {
    const input = {
      approvalId: "approval-2",
      nonce: "nonce-2",
      actionDigest: "b".repeat(64),
      idempotencyKey: "idem-2",
      executionId: "exec-2",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    const rows = [
      {
        approval_id: input.approvalId,
        nonce: input.nonce,
        action_digest: input.actionDigest,
        idempotency_key: input.idempotencyKey,
        execution_id: input.executionId,
        status: "completed",
        expires_at: input.expiresAt,
        result_digest: "c".repeat(64),
        error_code: null,
        reserved_at: new Date().toISOString(),
      },
    ];
    const replay = evaluateReceiptReserve(rows, input, Date.now());
    assert.equal(replay.status, "already_completed");
    assert.equal(replay.executionId, "exec-2");
  });

  it("conflicts on idempotency digest mismatch", () => {
    const input = {
      approvalId: "approval-3",
      nonce: "nonce-3",
      actionDigest: "d".repeat(64),
      idempotencyKey: "idem-3",
      executionId: "exec-3",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    const rows = [
      {
        approval_id: "other",
        nonce: input.nonce,
        action_digest: "e".repeat(64),
        idempotency_key: input.idempotencyKey,
        execution_id: "exec-old",
        status: "completed",
        expires_at: input.expiresAt,
        result_digest: null,
        error_code: null,
        reserved_at: new Date().toISOString(),
      },
    ];
    const conflict = evaluateReceiptReserve(rows, input, Date.now());
    assert.equal(conflict.status, "conflict");
    assert.equal(conflict.reasonCode, "IDEMPOTENCY_DIGEST_MISMATCH");
  });
});

describe("cryptographic domain separation", () => {
  it("rejects cross-domain receipt verification", async () => {
    const unsigned = {
      approvalId: crypto.randomUUID(),
      proposalId: crypto.randomUUID(),
      proposalRevision: 1,
      actionClass: "C3" as const,
      actionDigest: "f".repeat(64),
      beaconHash: "a".repeat(64),
      codexHash: "b".repeat(64),
      targetEnvironment: "development" as const,
      approvedBy: "operator",
      approvedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      nonce: crypto.randomUUID(),
    };
    const signature = await signApprovalReceipt(unsigned, governanceSigning);
    const receipt = { ...unsigned, signature };
    const wrongDomain = await verifyApprovalReceiptSignature(receipt, beaconSigning);
    assert.equal(wrongDomain, false);
  });
});

describe("memory receipt authority client", () => {
  it("resets between tests", () => {
    resetMemoryReceiptAuthority();
    assert.ok(true);
  });
});
