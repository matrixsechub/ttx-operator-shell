import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const workflow = readFileSync(
  join(root, ".github", "workflows", "deploy-production.yml"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("deploy-production CI gate contract", () => {
  it("triggers from successful CI workflow_run on main, not bare push", () => {
    assert.match(workflow, /workflow_run:/);
    assert.match(workflow, /workflows:\s*\[CI\]/);
    assert.match(workflow, /types:\s*\[completed\]/);
    assert.doesNotMatch(workflow, /^ {2}push:/m);
  });

  it("requires deploy SHA to equal current main", () => {
    assert.match(workflow, /Verify deploy SHA equals current main/);
    assert.match(workflow, /git rev-parse origin\/main/);
    assert.match(workflow, /test "\$HEAD_SHA" = "\$MAIN_SHA"/);
  });

  it("fails the workflow when smoke routes are not 200", () => {
    assert.match(workflow, /Smoke test \(hard gate\)/);
    assert.match(workflow, /STATUS" != "200"/);
    assert.match(workflow, /exit 1/);
    for (const route of ["/", "/pearl-os", "/products", "/status"]) {
      assert.match(workflow, new RegExp(route.replace("/", "\\/")));
    }
  });

  it("pins third-party actions to full commit SHAs", () => {
    assert.doesNotMatch(workflow, /uses:\s*actions\/checkout@v\d+/);
    assert.doesNotMatch(workflow, /uses:\s*actions\/setup-node@v\d+/);
    assert.match(
      workflow,
      /uses:\s*actions\/checkout@[0-9a-f]{40}/,
    );
    assert.match(
      workflow,
      /uses:\s*actions\/setup-node@[0-9a-f]{40}/,
    );
  });
});
