import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const workflowsDir = join(root, ".github", "workflows");

function readWorkflow(name) {
  return readFileSync(join(workflowsDir, name), "utf8").replace(/\r\n/g, "\n");
}

const REUSABLES = [
  "_reusable-build-test.yml",
  "_reusable-wrangler-dry-run.yml",
];

const CALLERS = ["ci.yml", "staging-deploy.yml", "deploy-production.yml"];

describe("reusable MSHOPS private-dependency secret contract (F18b)", () => {
  for (const name of REUSABLES) {
    const yaml = readWorkflow(name);

    it(`${name} declares required workflow_call secret GH_PAT`, () => {
      assert.match(
        yaml,
        /^on:\n {2}workflow_call:\n[\s\S]*? {4}secrets:\n {6}GH_PAT:\n(?: {8}.+\n)*? {8}required: true/m,
      );
    });

    it(`${name} clones MSHOPS with deploy-equivalent sparse checkout`, () => {
      assert.match(yaml, /name:\s*Clone MSHOPS storefront artifact/);
      assert.match(yaml, /GH_PAT:\s*\$\{\{\s*secrets\.GH_PAT\s*\}\}/);
      assert.match(
        yaml,
        /git clone --depth 1 --filter=blob:none --sparse/,
      );
      assert.match(yaml, /sparse-checkout set build-final/);
      assert.match(
        yaml,
        /ERROR: GH_PAT secret is required to clone private MSHOPS/,
      );
    });

    it(`${name} sets deterministic MSHOPS_BUILD_DIR for Build`, () => {
      assert.match(
        yaml,
        /MSHOPS_BUILD_DIR:\s*\$\{\{\s*github\.workspace\s*\}\}\/MSHOPS\/build-final/,
      );
      assert.match(yaml, /name:\s*Build\n\s+env:\n\s+MSHOPS_BUILD_DIR:/);
    });

    it(`${name} does not use secrets: inherit`, () => {
      assert.doesNotMatch(yaml, /secrets:\s*inherit/);
    });

    it(`${name} scopes GH_PAT only to the clone step env`, () => {
      // Job-level env must not carry GH_PAT; only the clone step does.
      const jobEnvMatch = yaml.match(
        /jobs:\n {2}[a-z-]+:\n(?: {4}.+\n)*? {4}env:\n((?: {6}.+\n)*)/,
      );
      assert.ok(jobEnvMatch, "job env block must exist");
      assert.doesNotMatch(jobEnvMatch[1], /GH_PAT/);

      const cloneStep = yaml.match(
        /name:\s*Clone MSHOPS storefront artifact\n([\s\S]*?)(?=\n {6}- |\n {4}- )/,
      );
      assert.ok(cloneStep, "clone step must exist");
      assert.match(cloneStep[1], /GH_PAT:\s*\$\{\{\s*secrets\.GH_PAT\s*\}\}/);
    });
  }

  for (const name of CALLERS) {
    const yaml = readWorkflow(name);

    it(`${name} passes GH_PAT explicitly to both reusable workflows`, () => {
      assert.match(
        yaml,
        /uses:\s*\.\/\.github\/workflows\/_reusable-build-test\.yml\n(?: {4}.+\n)*? {4}secrets:\n {6}GH_PAT:\s*\$\{\{\s*secrets\.GH_PAT\s*\}\}/,
      );
      assert.match(
        yaml,
        /uses:\s*\.\/\.github\/workflows\/_reusable-wrangler-dry-run\.yml\n(?: {4}.+\n)*? {4}secrets:\n {6}GH_PAT:\s*\$\{\{\s*secrets\.GH_PAT\s*\}\}/,
      );
      assert.doesNotMatch(yaml, /secrets:\s*inherit/);
    });
  }

  it("no unrelated workflow declares or inherits GH_PAT for reusable calls", () => {
    const files = readdirSync(workflowsDir).filter(
      (f) => f.endsWith(".yml") || f.endsWith(".yaml"),
    );
    for (const file of files) {
      if (REUSABLES.includes(file) || CALLERS.includes(file)) continue;
      const yaml = readWorkflow(file);
      assert.doesNotMatch(
        yaml,
        /_reusable-(?:build-test|wrangler-dry-run)\.yml/,
        `${file} must not call MSHOPS-build reusables`,
      );
      assert.doesNotMatch(yaml, /secrets:\s*inherit/);
    }
  });

  it("deploy-production keeps the reference MSHOPS_BUILD_DIR convention", () => {
    const yaml = readWorkflow("deploy-production.yml");
    assert.match(
      yaml,
      /MSHOPS_BUILD_DIR:\s*\$\{\{\s*github\.workspace\s*\}\}\/MSHOPS\/build-final/,
    );
    assert.match(yaml, /x-access-token:\$\{GH_PAT\}@github\.com/);
    assert.doesNotMatch(yaml, /secrets:\s*inherit/);
  });
});
