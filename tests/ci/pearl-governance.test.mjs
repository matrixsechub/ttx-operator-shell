import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPearlGovernance } from "../../scripts/ci/pearl-governance.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.resolve(HERE, "../../scripts/ci/pearl-fixtures");

describe("pearl-governance checker", () => {
  it("passes a clean, token-only, animation-free substrate", () => {
    const failures = runPearlGovernance(path.join(FIX, "good-root"));
    assert.deepEqual(failures, [], `expected no failures, got: ${JSON.stringify(failures)}`);
  });

  it("catches substrate violations: raw hex (P1), animation (P2), unbounded duration (P3), decorative green/red (P4)", () => {
    const failures = runPearlGovernance(path.join(FIX, "bad-root"));
    const rules = new Set(failures.map((f) => f.rule));
    assert.ok(rules.has("P1"), "P1 raw color literal not caught");
    assert.ok(rules.has("P2"), "P2 animation not caught");
    assert.ok(rules.has("P3"), "P3 unbounded duration not caught");
    assert.ok(rules.has("P4"), "P4 decorative green/red not caught");
  });

  it("catches Living violations: missing reduced-motion (L2), uncapped motes / uncleared timer (L3), pointer telemetry (L5), two ambient behaviors (L6)", () => {
    const failures = runPearlGovernance(path.join(FIX, "bad-root"));
    const rules = new Set(failures.map((f) => f.rule));
    assert.ok(rules.has("L2"), "L2 missing reduced-motion block not caught");
    assert.ok(rules.has("L3"), "L3 uncapped motes / uncleared interval not caught");
    assert.ok(rules.has("L5"), "L5 pointer-coordinate telemetry not caught");
    assert.ok(rules.has("L6"), "L6 two ambient behaviors on one primitive not caught");
  });

  it("passes the real repository substrate", () => {
    const failures = runPearlGovernance(path.resolve(HERE, "../.."));
    assert.deepEqual(failures, [], `real substrate must be clean, got: ${JSON.stringify(failures)}`);
  });
});
