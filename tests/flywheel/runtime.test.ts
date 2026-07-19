import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DeterministicMockAdapter } from "../../worker/flywheel/adapters.ts";
import { buildQueuedNextCycle } from "../../worker/flywheel/cycle.ts";
import { normalizeFlywheelError, withFlywheelRetry } from "../../worker/flywheel/errors.ts";
import { resolveIdempotency } from "../../worker/flywheel/idempotency.ts";
import type { FlywheelRun } from "../../shared/flywheel/contracts.ts";

describe("Flywheel deterministic runtime", () => {
  it("produces stable mock outputs", async () => {
    const adapter = new DeterministicMockAdapter("lead_generation");
    const context = { runId: "r", missionId: "m", tenantId: "t", stageId: "lead_generation" as const, traceId: "x", idempotencyKey: "i", input: {} };
    assert.deepEqual(await adapter.execute(context), await adapter.execute(context));
    assert.match((await adapter.execute(context)).evidenceRefs[0], /^sha256:[a-f0-9]{64}$/);
  });
  it("distinguishes replay from conflicting idempotency digests", () => {
    assert.equal(resolveIdempotency(null, "a").kind, "new");
    assert.equal(resolveIdempotency({ digest: "a", response: { ok: true }, state: "completed" }, "a").kind, "replay");
    assert.equal(resolveIdempotency({ digest: "a", response: {} }, "b").kind, "conflict");
  });
  it("does not treat accepted or awaiting_approval as completed replays", () => {
    const accepted = resolveIdempotency({ digest: "a", response: { commandId: "c1", state: "accepted" }, state: "accepted" }, "a");
    assert.equal(accepted.kind, "in_progress");
    if (accepted.kind === "in_progress") assert.equal(accepted.state, "accepted");

    const awaiting = resolveIdempotency({ digest: "a", response: { state: "awaiting_approval" }, state: "awaiting_approval" }, "a");
    assert.equal(awaiting.kind, "in_progress");
    if (awaiting.kind === "in_progress") assert.equal(awaiting.state, "awaiting_approval");

    const denied = resolveIdempotency({ digest: "a", response: { ok: false, code: "RUN_NOT_FOUND" }, state: "denied" }, "a");
    assert.equal(denied.kind, "replay");
    if (denied.kind === "replay") assert.equal(denied.response.code, "RUN_NOT_FOUND");
  });
  it("defaults legacy records without state to completed replay", () => {
    const legacy = resolveIdempotency({ digest: "a", response: { ok: true } }, "a");
    assert.equal(legacy.kind, "replay");
  });
  it("exhausts three retries and classifies integrity failures", async () => {
    let attempts = 0; let retries = 0;
    await assert.rejects(withFlywheelRetry(async () => { attempts += 1; throw new Error("provider"); }, async () => { retries += 1; }, async () => undefined));
    assert.equal(attempts, 4); assert.equal(retries, 3);
    assert.equal(normalizeFlywheelError("SCHEMA_MISMATCH").safeModeRequired, true);
    assert.equal(normalizeFlywheelError("GOVERNANCE_DENIED").retryable, false);
  });
  it("creates a queued next cycle without auto-starting", () => {
    const previous = { id: "r1", missionId: "m", tenantId: "t", currentStage: "continuous_improvement", state: "running", autonomyLevel: 1, riskLevel: "low", beaconVersion: "2", beaconSha256: "a".repeat(64), approvalReceiptId: "receipt", createdAt: "old", updatedAt: "old", startedAt: "old", traceId: "x", idempotencyKey: "key" } satisfies FlywheelRun;
    const next = buildQueuedNextCycle(previous, "now", "r2");
    assert.equal(next.state, "queued"); assert.equal(next.currentStage, "lead_generation"); assert.equal(next.approvalReceiptId, undefined); assert.equal(next.startedAt, undefined);
  });
});
