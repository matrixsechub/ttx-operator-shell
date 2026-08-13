import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const stagingWorkflow = readFileSync(
  join(root, ".github", "workflows", "staging-deploy.yml"),
  "utf8",
).replace(/\r\n/g, "\n");

/**
 * Extract the staging-smoke job block (until the next top-level job key).
 */
function extractStagingSmokeJob(yaml) {
  const start = yaml.indexOf("\n  staging-smoke:");
  assert.ok(start >= 0, "staging-smoke job must exist");
  const fromJob = yaml.slice(start + 1);
  const nextJob = fromJob.search(/\n  [a-zA-Z0-9_-]+:/);
  return nextJob === -1 ? fromJob : fromJob.slice(0, nextJob);
}

describe("staging-deploy workflow staging-smoke binding", () => {
  it("binds staging-smoke to the staging GitHub Environment", () => {
    const job = extractStagingSmokeJob(stagingWorkflow);
    assert.match(job, /^ {2}staging-smoke:\n/m);
    assert.match(job, /^ {4}environment: staging$/m);
  });

  it("wires STAGING_BASE_URL var and both Access secrets into the smoke step", () => {
    const job = extractStagingSmokeJob(stagingWorkflow);
    assert.match(job, /STAGING_BASE_URL:\s*\$\{\{\s*vars\.STAGING_BASE_URL\s*\}\}/);
    assert.match(
      job,
      /STAGING_ACCESS_CLIENT_ID:\s*\$\{\{\s*secrets\.STAGING_ACCESS_CLIENT_ID\s*\}\}/,
    );
    assert.match(
      job,
      /STAGING_ACCESS_CLIENT_SECRET:\s*\$\{\{\s*secrets\.STAGING_ACCESS_CLIENT_SECRET\s*\}\}/,
    );
    assert.match(job, /node scripts\/ci\/staging-smoke\.mjs/);
  });

  it("does not embed literal Access credential values in the workflow", () => {
    assert.doesNotMatch(stagingWorkflow, /CF-Access-Client-/i);
    assert.doesNotMatch(stagingWorkflow, /client_secret:\s*["'][^$]/i);
  });

  it("uploads the staging-smoke report with if: always()", () => {
    const job = extractStagingSmokeJob(stagingWorkflow);
    assert.match(
      job,
      /uses:\s*actions\/upload-artifact@[0-9a-f]{40}[^\n]*\n\s+if:\s*always\(\)/,
    );
    assert.match(job, /name:\s*staging-smoke-report/);
    assert.match(job, /path:\s*artifacts\/staging-smoke-report\.json/);
    assert.match(job, /retention-days:\s*14/);
    assert.match(job, /if-no-files-found:\s*error/);
  });
});
