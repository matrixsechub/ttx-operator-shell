import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scanArtifactDirectory } from "../../../scripts/uiux/staging/verify.ts";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

describe("PRISM staging artifact verify", () => {
  it("fails secret scan on JWT material", () => {
    const dir = join(process.cwd(), "artifacts", "uiux", "staging", "_test-scan");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "bad.json"), '{"token":"eyJhbGciOiJIUzI1NiJ9.abc.def"}');
    const result = scanArtifactDirectory(dir);
    assert.equal(result.ok, false);
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes clean artifacts", () => {
    const dir = join(process.cwd(), "artifacts", "uiux", "staging", "_test-clean");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "ok.json"), '{"captureId":"abc","status":"complete"}');
    const result = scanArtifactDirectory(dir);
    assert.equal(result.ok, true);
    rmSync(dir, { recursive: true, force: true });
  });
});
