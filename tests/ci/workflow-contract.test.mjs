import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8").replace(/\r\n/g, "\n");
}

describe("workflow contract (launch-hold)", () => {
  it("keeps .github/CODEOWNERS covering privileged paths", () => {
    const text = read(".github/CODEOWNERS");
    for (const path of [
      ".github/workflows/",
      ".github/actions/",
      "scripts/ci/",
      "msh-ops/beacon/",
      "wrangler.jsonc",
    ]) {
      assert.match(text, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(text, /@matrixsechub/);
  });

  it("passes workflow-contract-lint.mjs", () => {
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts/ci/workflow-contract-lint.mjs")],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /WORKFLOW_CONTRACT::PASS::all/);
  });

  it("forbids soft-fail test fallbacks in baseline CI template", () => {
    const template = read("docs/ci/baseline-ci.yml");
    assert.doesNotMatch(template, /\|\|\s*echo\s+["']No tests/);
    assert.doesNotMatch(template, /\|\|\s*true\b/);
    assert.match(template, /^permissions:/m);
    assert.match(template, /contents:\s*read/);
  });

  it("records cross-repo credential inventory with fail-closed posture", () => {
    const invPath = join(root, "docs/ci/cross-repo-credential-inventory.json");
    assert.equal(existsSync(invPath), true);
    const inv = JSON.parse(read("docs/ci/cross-repo-credential-inventory.json"));
    assert.equal(inv.release_state, "HOLD");
    assert.ok(Array.isArray(inv.repos));
    assert.ok(inv.repos.length >= 5);
    const ttx = inv.repos.find((r) => r.name === "ttx-operator-shell");
    assert.ok(ttx);
    assert.equal(ttx.credential_gate, "step-scoped");
    const blocked = inv.repos.filter((r) => r.access === "unavailable_from_agent");
    assert.ok(blocked.some((r) => /MSHOPS/i.test(r.name)));
  });
});

describe("deploy trigger trust", () => {
  it("deploy-production is gated (no push-to-main auto deploy)", () => {
    const yaml = read(".github/workflows/deploy-production.yml");
    const onBlock = yaml.split(/\njobs:\n/)[0];
    assert.doesNotMatch(onBlock, /^\s+push:\s*$/m);
    assert.match(onBlock, /workflow_run:/);
    assert.match(onBlock, /workflow_dispatch:/);
    assert.match(yaml, /conclusion\s*==\s*'success'/);
    assert.match(yaml, /head_branch\s*==\s*'main'/);
    assert.match(yaml, /DEPLOY_PRODUCTION/);
  });
});
