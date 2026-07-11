import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("generate-staging-evidence", () => {
  it("fails when staging smoke report records failures", () => {
    const artifactsDir = join(root, "artifacts");
    const evidenceDir = join(artifactsDir, "staging-release-evidence");
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(
      join(artifactsDir, "staging-smoke-report.json"),
      JSON.stringify({ summary: { failed: 1, passed: 0, warnings: 0 } }),
    );

    const result = spawnSync(process.execPath, ["scripts/ci/generate-staging-evidence.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, ARTIFACTS_DIR: evidenceDir },
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr ?? "", /STAGING_EVIDENCE::FAIL/);
  });
});
