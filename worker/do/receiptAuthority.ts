import { DurableObject } from "cloudflare:workers";
import {
  type ReceiptCompleteInput,
  type ReceiptFailInput,
  type ReceiptReserveInput,
  type ReceiptReserveStatus,
  type ReservationRow,
} from "../governance/receiptReserveLogic";

export type {
  ReceiptCompleteInput,
  ReceiptFailInput,
  ReceiptReserveInput,
  ReceiptReserveStatus,
} from "../governance/receiptReserveLogic";

export { evaluateReceiptReserve } from "../governance/receiptReserveLogic";

export class ReceiptAuthority extends DurableObject {
  private schemaReady = false;

  private ensureSchema(): void {
    if (this.schemaReady) return;
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS reservation (
        approval_id TEXT PRIMARY KEY,
        nonce TEXT NOT NULL,
        action_digest TEXT NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        execution_id TEXT NOT NULL,
        status TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        result_digest TEXT,
        error_code TEXT,
        reserved_at TEXT NOT NULL
      )
    `);
    this.schemaReady = true;
  }

  async reserve(input: ReceiptReserveInput): Promise<ReceiptReserveStatus> {
    this.ensureSchema();
    if (Date.parse(input.expiresAt) <= Date.now()) {
      return { status: "expired" };
    }

    const byIdempotency = this.ctx.storage.sql
      .exec(
        "SELECT * FROM reservation WHERE idempotency_key = ?",
        input.idempotencyKey,
      )
      .one() as unknown as ReservationRow | undefined;
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
      if (byIdempotency.status === "failed") {
        return { status: "conflict", reasonCode: "PRIOR_EXECUTION_FAILED" };
      }
    }

    const existing = this.ctx.storage.sql
      .exec("SELECT * FROM reservation WHERE approval_id = ?", input.approvalId)
      .one() as unknown as ReservationRow | undefined;
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

    try {
      this.ctx.storage.sql.exec(
        `INSERT INTO reservation (
          approval_id, nonce, action_digest, idempotency_key, execution_id,
          status, expires_at, result_digest, error_code, reserved_at
        ) VALUES (?, ?, ?, ?, ?, 'reserved', ?, NULL, NULL, ?)`,
        input.approvalId,
        input.nonce,
        input.actionDigest,
        input.idempotencyKey,
        input.executionId,
        input.expiresAt,
        new Date().toISOString(),
      );
      return { status: "reserved", executionId: input.executionId };
    } catch {
      const raced = this.ctx.storage.sql
        .exec("SELECT * FROM reservation WHERE approval_id = ?", input.approvalId)
        .one() as unknown as ReservationRow | undefined;
      if (raced?.idempotency_key === input.idempotencyKey && raced.status === "reserved") {
        return { status: "in_progress", executionId: raced.execution_id };
      }
      return { status: "conflict", reasonCode: "RECEIPT_CONSUMED" };
    }
  }

  async complete(input: ReceiptCompleteInput): Promise<void> {
    this.ensureSchema();
    this.ctx.storage.sql.exec(
      `UPDATE reservation SET status = 'completed', result_digest = ?
       WHERE approval_id = ? AND execution_id = ? AND status = 'reserved'`,
      input.resultDigest,
      input.approvalId,
      input.executionId,
    );
  }

  async fail(input: ReceiptFailInput): Promise<void> {
    this.ensureSchema();
    this.ctx.storage.sql.exec(
      `UPDATE reservation SET status = 'failed', error_code = ?
       WHERE approval_id = ? AND execution_id = ? AND status = 'reserved'`,
      input.errorCode,
      input.approvalId,
      input.executionId,
    );
  }

  async health(): Promise<{ ok: boolean }> {
    this.ensureSchema();
    return { ok: true };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.pathname.replace(/^\//, "");
    try {
      const body = (await request.json()) as unknown;
      if (action === "reserve") {
        return Response.json(await this.reserve(body as unknown as ReceiptReserveInput));
      }
      if (action === "complete") {
        await this.complete(body as unknown as ReceiptCompleteInput);
        return Response.json({ ok: true });
      }
      if (action === "fail") {
        await this.fail(body as unknown as ReceiptFailInput);
        return Response.json({ ok: true });
      }
      if (action === "health") {
        return Response.json(await this.health());
      }
      return Response.json({ error: "unknown action" }, { status: 404 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "receipt-authority-error";
      return Response.json({ error: message }, { status: 500 });
    }
  }
}
