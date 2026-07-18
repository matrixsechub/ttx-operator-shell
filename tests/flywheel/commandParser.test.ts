import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actionClassFor, expectedStageTarget, parseFlywheelCommand } from "../../worker/flywheel/commandParser.ts";

describe("Flywheel command protocol", () => {
  it("normalizes a valid command and assigns bounded analysis", () => {
    const result = parseFlywheelCommand("  analyze::stage_1::leads  ");
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.command, { raw: "ANALYZE::STAGE_1::LEADS", category: "ANALYZE", target: "STAGE_1", parameter: "LEADS", actionClass: "C0" });
  });
  it("requires C2 for stage synthesis and C3 for scaling", () => {
    assert.equal(actionClassFor("SYNTH", "STAGE_1"), "C2");
    assert.equal(actionClassFor("SYNTH", "STAGE_2"), "C2");
    assert.equal(actionClassFor("LOOP", "STAGE_9"), "C3");
  });
  it("rejects malformed, unknown, and disallowed commands", () => {
    assert.equal(parseFlywheelCommand("ANALYZE:STAGE_1:LEADS").ok, false);
    assert.equal(parseFlywheelCommand("SEND::STAGE_3::OUTREACH").ok, false);
    assert.equal(parseFlywheelCommand("SCAN::STAGE_8::LEADS").ok, false);
  });
  it("maps every deterministic stage target", () => {
    assert.equal(expectedStageTarget("lead_generation"), "STAGE_1");
    assert.equal(expectedStageTarget("continuous_improvement"), "STAGE_10");
  });
});
