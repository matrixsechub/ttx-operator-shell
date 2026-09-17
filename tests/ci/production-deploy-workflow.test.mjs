import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const workflow = readFileSync(join(root, ".github", "workflows", "deploy-production.yml"), "utf8").replace(
  /\r\n/g,
  "\n",
);

/** Extract one top-level job block (until the next top-level job key). */
function job(name) {
  const start = workflow.indexOf(`\n  ${name}:`);
  assert.ok(start >= 0, `job "${name}" must exist in deploy-production.yml`);
  const fromJob = workflow.slice(start + 1);
  const nextJob = fromJob.slice(1).search(/\n {2}[a-zA-Z0-9_-]+:\n/);
  return nextJob === -1 ? fromJob : fromJob.slice(0, nextJob + 1);
}

/**
 * Drop YAML comment lines. Without this a comment mentioning a flag could
 * satisfy a structural assertion — caught by mutation testing.
 */
function stripComments(block) {
  return block
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");
}

/** Everything above `jobs:` — triggers, permissions, concurrency. */
function header() {
  const idx = workflow.indexOf("\njobs:");
  assert.ok(idx > 0, "workflow must declare jobs:");
  return workflow.slice(0, idx);
}

describe("production deploy — approval gate", () => {
  it("binds the deploy job to the production GitHub Environment", () => {
    assert.match(job("deploy"), /^ {4}environment: production$/m);
  });

  it("binds the smoke job to the production GitHub Environment", () => {
    assert.match(job("production-smoke"), /^ {4}environment: production$/m);
  });
});

describe("production deploy — verification precedes deployment", () => {
  it("deploy depends on preflight, build-test, and the dry run", () => {
    const deploy = job("deploy");
    const needs = deploy.match(/^ {4}needs: \[(.+)\]$/m);
    assert.ok(needs, "deploy job must declare needs");
    for (const required of ["preflight", "build-test", "production-dry-run"]) {
      assert.ok(needs[1].includes(required), `deploy must depend on ${required}`);
    }
  });

  it("does not bypass typecheck or tests: the reusable build-test workflow is used", () => {
    assert.match(job("build-test"), /uses: \.\/\.github\/workflows\/_reusable-build-test\.yml/);
    const reusable = readFileSync(join(root, ".github", "workflows", "_reusable-build-test.yml"), "utf8");
    assert.match(reusable, /npm run typecheck/, "reusable build-test must run typecheck");
    assert.match(reusable, /npm test/, "reusable build-test must run the full suite");
    assert.match(reusable, /npm run build/, "reusable build-test must build");
  });

  it("runs a wrangler dry run before any production mutation", () => {
    assert.match(job("production-dry-run"), /uses: \.\/\.github\/workflows\/_reusable-wrangler-dry-run\.yml/);
    const deploy = stripComments(job("deploy"));
    const dryRun = deploy.search(/^\s*run: npx wrangler deploy --dry-run/m);
    const realDeploy = deploy.search(/^\s*npx wrangler deploy(?![^\n]*--dry-run)/m);
    assert.ok(dryRun >= 0, "deploy job must include an in-job pre-deploy dry run step");
    assert.ok(realDeploy >= 0, "deploy job must include a real wrangler deploy");
    assert.ok(dryRun < realDeploy, "the dry run must precede the real deploy");
  });

  it("no job deploys without depending on verification", () => {
    const deployingJobs = ["deploy"];
    for (const name of deployingJobs) {
      assert.match(job(name), /^ {4}needs: \[/m, `${name} mutates production and must declare needs`);
    }
  });
});

describe("production deploy — build identity", () => {
  it("supplies BUILD_COMMIT_SHA and BUILD_TIMESTAMP to the deploy", () => {
    const deploy = stripComments(job("deploy"));
    assert.match(deploy, /--var BUILD_COMMIT_SHA:/, "production must receive BUILD_COMMIT_SHA (F4)");
    assert.match(deploy, /--var BUILD_TIMESTAMP:/, "production must receive BUILD_TIMESTAMP (F4)");
  });

  it("does not hardcode a build timestamp", () => {
    assert.doesNotMatch(job("deploy"), /BUILD_TIMESTAMP: ["']?\d{4}-\d{2}-\d{2}["']?$/m);
  });
});

describe("production deploy — smoke is fail-closed and correctly targeted", () => {
  it("runs the production smoke script rather than an unchecked curl", () => {
    const smoke = stripComments(job("production-smoke"));
    assert.match(smoke, /node scripts\/ci\/production-smoke\.mjs/);
    assert.doesNotMatch(smoke, /curl/, "smoke must not use a bare curl whose status is ignored");
    assert.doesNotMatch(smoke, /\|\| true/, "smoke must not swallow failures");
    assert.doesNotMatch(smoke, /continue-on-error: true/, "smoke must be able to fail the workflow");
  });

  it("targets the production Worker through a variable, not a literal host", () => {
    const smoke = stripComments(job("production-smoke"));
    assert.match(smoke, /PRODUCTION_BASE_URL: \$\{\{ vars\.PRODUCTION_BASE_URL \}\}/);
    assert.doesNotMatch(stripComments(workflow), /www\.mshops\.net/, "the old wrong smoke target must not return");
  });

  it("smoke depends on the deploy it verifies", () => {
    assert.match(job("production-smoke"), /^ {4}needs: \[deploy\]$/m);
  });

  it("uploads the smoke report even on failure", () => {
    const smoke = job("production-smoke");
    assert.match(smoke, /if: always\(\)/);
    assert.match(smoke, /production-smoke-report/);
  });
});

describe("production deploy — hygiene", () => {
  it("embeds no literal credential values", () => {
    for (const name of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "GH_PAT"]) {
      const literal = new RegExp(`${name}:\\s*(?!\\$\\{\\{)[^\\s$]`);
      assert.doesNotMatch(workflow, literal, `${name} must come from secrets, never a literal`);
    }
  });

  it("pins every action by full SHA", () => {
    const uses = [...workflow.matchAll(/uses: (\S+)/g)].map((m) => m[1]);
    for (const ref of uses) {
      if (ref.startsWith("./")) continue; // local composite action or reusable workflow
      assert.match(ref, /@[0-9a-f]{40}$/, `${ref} must be pinned to a full commit SHA`);
    }
  });

  it("declares least-privilege permissions at workflow level", () => {
    assert.match(header(), /^permissions:\n {2}contents: read$/m);
  });
});
