import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8").replace(/\r\n/g, "\n");
}

const deploy = read(".github/workflows/deploy-production.yml");
const ci = read(".github/workflows/ci.yml");

function onBlock(yaml) {
  const match = yaml.match(/^on:\n([\s\S]*?)(?=\npermissions:|\nconcurrency:|\njobs:)/m);
  assert.ok(match, "on: block must exist");
  return match[1];
}

describe("deploy-production workflow contract", () => {
  it("does not trigger on push to main", () => {
    assert.doesNotMatch(onBlock(deploy), /^\s+push:/m);
  });

  it("gates via workflow_run on CI completion or guarded workflow_dispatch", () => {
    const on = onBlock(deploy);
    assert.match(on, /workflow_run:/);
    assert.match(on, /workflows:\s*\[CI\]/);
    assert.match(on, /workflow_dispatch:/);
    assert.match(deploy, /confirm_deploy/);
    assert.match(deploy, /DEPLOY_PRODUCTION/);
  });

  it("pins deploy to DEPLOY_SHA and verifies ancestry without tip-race", () => {
    assert.match(deploy, /DEPLOY_SHA:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha \|\| github\.sha\s*\}\}/);
    assert.match(deploy, /test "\$\(git rev-parse HEAD\)" = "\$DEPLOY_SHA"/);
    assert.match(deploy, /git merge-base --is-ancestor "\$DEPLOY_SHA" origin\/main/);
    assert.doesNotMatch(
      deploy,
      /test "\$\(git rev-parse HEAD\)" = "\$\(git rev-parse origin\/main\)"/,
    );
  });

  it("uses step-scoped MSHOPS checkout and assert-no-mshops-token", () => {
    assert.match(deploy, /uses:\s*\.\/\.github\/actions\/checkout-mshops-artifact/);
    assert.match(deploy, /assert-no-mshops-token\.mjs/);
    assert.match(deploy, /persist-credentials:\s*false/);
  });

  it("smoke-tests with retry/backoff hard gate", () => {
    assert.match(deploy, /Smoke test \(hard gate, retry\/backoff\)/);
    assert.match(deploy, /for attempt in 1 2 3 4 5 6/);
    assert.match(deploy, /sleep \$\(\(attempt \* 5\)\)/);
  });
});

describe("CI workflow contract", () => {
  it("passes MSHOPS checkout secret into reusables without job-wide env at caller", () => {
    assert.match(ci, /secrets:\n\s+GH_PAT:/);
    // Prefer dedicated token when Operator has split credentials.
    assert.match(
      ci,
      /GH_PAT:\s*\$\{\{\s*secrets\.MSHOPS_CHECKOUT_TOKEN\s*\|\|\s*secrets\.GH_PAT\s*\}\}/,
    );
  });

  it("runs trigger audit in pr-gate", () => {
    assert.match(ci, /audit-workflow-triggers\.mjs/);
  });
});

describe("CODEOWNERS present for critical surfaces", () => {
  it("requires Operator ownership of workflows and CI scripts", () => {
    const owners = read(".github/CODEOWNERS");
    assert.match(owners, /\.github\/workflows\/\s+@matrixsechub/);
    assert.match(owners, /\.github\/actions\/\s+@matrixsechub/);
    assert.match(owners, /scripts\/ci\/\s+@matrixsechub/);
    assert.match(owners, /scripts\/build\.mjs\s+@matrixsechub/);
  });
});
