import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("generate-staging-evidence", () => {
  it("fails when ai gateway smoke report is not ok", () => {
    const artifactsDir = join(root, "artifacts");
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(
      join(artifactsDir, "ai-gateway-smoke-report.json"),
      JSON.stringify({ ok: false, summary: { mandatory_failed: 1 } }),
    );
    writeFileSync(
      join(artifactsDir, "ai-fulfillment-scope-report.json"),
      JSON.stringify({ ok: true, summary: { passed: 4, failed: 0 } }),
    );
    writeFileSync(
      join(artifactsDir, "staging-smoke-report.json"),
      JSON.stringify({ summary: { failed: 0 } }),
    );

    const result = spawnSync(process.execPath, ["scripts/ci/generate-staging-evidence.mjs"], {
      cwd: root,
      encoding: "utf8",
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr ?? "", /STAGING_EVIDENCE::FAIL/);
  });

  it("fails when storefront assembly report is not ok", () => {
    const artifactsDir = join(root, "artifacts");
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(
      join(artifactsDir, "ai-gateway-smoke-report.json"),
      JSON.stringify({ ok: true, summary: { mandatory_failed: 0 } }),
    );
    writeFileSync(
      join(artifactsDir, "ai-fulfillment-scope-report.json"),
      JSON.stringify({ ok: true, summary: { passed: 4, failed: 0 } }),
    );
    writeFileSync(
      join(artifactsDir, "staging-smoke-report.json"),
      JSON.stringify({ summary: { failed: 0 } }),
    );
    writeFileSync(
      join(artifactsDir, "storefront-assembly-report.json"),
      JSON.stringify({ ok: false, status: "fail", placeholderDetected: true }),
    );

    const result = spawnSync(process.execPath, ["scripts/ci/generate-staging-evidence.mjs"], {
      cwd: root,
      encoding: "utf8",
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr ?? "", /STAGING_EVIDENCE::FAIL/);
  });
});
