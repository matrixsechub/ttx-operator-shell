import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FlywheelCommand, FlywheelRun } from "../../shared/flywheel/contracts.ts";
import { evaluateFlywheelGovernance } from "../../worker/flywheel/governance.ts";

const run: FlywheelRun = { id: "run-1", missionId: "mission-1", tenantId: "tenant-1", currentStage: "lead_generation", state: "queued", autonomyLevel: 1, riskLevel: "low", beaconVersion: "2", beaconSha256: "a".repeat(64), createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", traceId: "trace-1", idempotencyKey: "run-key" };
const command = (overrides: Partial<FlywheelCommand> = {}): FlywheelCommand => ({ commandId: "cmd-1", raw: "SYNTH::STAGE_1::QUALIFY", category: "SYNTH", target: "STAGE_1", parameter: "QUALIFY", payload: {}, requestedBy: "operator", missionId: "mission-1", traceId: "trace-1", idempotencyKey: "cmd-key", requestedAt: "2026-01-01T00:00:00.000Z", actionClass: "C2", ...overrides });

describe("Flywheel governance preflight", () => {
  const env = {} as never;
  it("fails closed on tenant and mission mismatch before Beacon access", async () => {
    assert.equal((await evaluateFlywheelGovernance(env, "other", run, command())).code, "GOVERNANCE_TENANT_MISMATCH");
    assert.equal((await evaluateFlywheelGovernance(env, "tenant-1", run, command({ missionId: "other" }))).code, "GOVERNANCE_SCOPE_MISMATCH");
  });
  it("always denies deploy and invalid stage transitions", async () => {
    assert.equal((await evaluateFlywheelGovernance(env, "tenant-1", run, command({ category: "DEPLOY", raw: "DEPLOY::FLYWHEEL::PRODUCTION", target: "FLYWHEEL", parameter: "PRODUCTION", actionClass: "C6" }))).code, "PRODUCTION_DEPLOY_NOT_AUTHORIZED");
    assert.equal((await evaluateFlywheelGovernance(env, "tenant-1", run, command({ target: "STAGE_2" }))).code, "GOVERNANCE_INVALID_TRANSITION");
  });
  it("requires fresh evidence for queued next-cycle activation", async () => {
    const result = await evaluateFlywheelGovernance(env, "tenant-1", run, command({ category: "RESUME", raw: "RESUME::FLYWHEEL::NEXT_CYCLE", target: "FLYWHEEL", parameter: "NEXT_CYCLE", payload: {} }));
    assert.equal(result.code, "GOVERNANCE_EVIDENCE_MISSING");
  });
});
