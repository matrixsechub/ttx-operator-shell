import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSha256, validateFlywheelApproval, validateFlywheelEvidence, validateRunCreate } from "../../shared/flywheel/contracts.ts";
import { FLYWHEEL_STAGE_REGISTRY, stageFromTarget } from "../../shared/flywheel/stages.ts";

describe("Flywheel contracts and registry", () => {
  it("accepts only canonical SHA256 values", () => {
    assert.equal(isSha256("a".repeat(64)), true);
    assert.equal(isSha256("A".repeat(64)), false);
    assert.equal(isSha256("a".repeat(63)), false);
  });
  it("validates run, approval, and evidence inputs", () => {
    assert.equal(validateRunCreate({ missionId: "mission-1", idempotencyKey: "run-1" }).valid, true);
    assert.equal(validateRunCreate({ missionId: "" }).valid, false);
    assert.equal(validateFlywheelApproval({ commandId: "cmd-1", proposalId: "proposal-1" }).valid, true);
    assert.equal(validateFlywheelEvidence({ evidenceId: "e", runId: "r", stageId: "lead_generation", artifactRef: "mock://a", sha256: "bad", attachedAt: new Date().toISOString(), attachedBy: "mock" }).valid, false);
  });
  it("defines one closed loop with all KPI groups", () => {
    assert.equal(FLYWHEEL_STAGE_REGISTRY.length, 10);
    for (let index = 0; index < 10; index += 1) {
      const stage = FLYWHEEL_STAGE_REGISTRY[index];
      assert.equal(stage.numericOrder, index + 1);
      assert.ok(stage.kpis.length >= 2);
      assert.equal(stage.nextStage, FLYWHEEL_STAGE_REGISTRY[(index + 1) % 10].stageId);
      assert.equal(stage.retryPolicy.maxRetries, 3);
    }
    assert.equal(stageFromTarget("STAGE_10")?.stageId, "continuous_improvement");
  });
});
