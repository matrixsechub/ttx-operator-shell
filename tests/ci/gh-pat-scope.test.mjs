import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8").replace(/\r\n/g, "\n");
}

function extractJobEnv(yaml) {
  const match = yaml.match(/\n    env:\n([\s\S]*?)\n    steps:\n/);
  assert.ok(match, "job env block must exist");
  return match[1];
}

describe("GH_PAT least-privilege scope", () => {
  it("npm test cannot read GH_PAT under GitHub Actions", () => {
    const result = spawnSync(process.execPath, [join(root, "scripts/ci/assert-no-mshops-token.mjs")], {
      cwd: root,
      env: { ...process.env },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    if (process.env.GITHUB_ACTIONS === "true") {
      assert.equal(process.env.GH_PAT, undefined);
    }
  });

  it("keeps GH_PAT out of reusable and deploy job-level env", () => {
    for (const rel of [
      ".github/workflows/_reusable-build-test.yml",
      ".github/workflows/_reusable-wrangler-dry-run.yml",
      ".github/workflows/deploy-production.yml",
    ]) {
      const env = extractJobEnv(read(rel));
      assert.doesNotMatch(env, /GH_PAT:/);
    }
  });

  it("scopes MSHOPS clone to checkout-mshops-artifact with persist-credentials: false", () => {
    const action = read(".github/actions/checkout-mshops-artifact/action.yml");
    assert.match(action, /persist-credentials:\s*false/);
    assert.match(action, /token:\s*\$\{\{\s*inputs\.token\s*\}\}/);
    assert.doesNotMatch(action, /x-access-token:/);

    for (const rel of [
      ".github/workflows/_reusable-build-test.yml",
      ".github/workflows/_reusable-wrangler-dry-run.yml",
      ".github/workflows/deploy-production.yml",
    ]) {
      const yaml = read(rel);
      assert.match(yaml, /persist-credentials:\s*false/);
      assert.match(yaml, /uses:\s*\.\/\.github\/actions\/checkout-mshops-artifact/);
      assert.match(yaml, /assert-no-mshops-token\.mjs/);
      assert.doesNotMatch(yaml, /x-access-token:\$\{\{\s*secrets\.GH_PAT/);
    }
  });

  it("does not expose inputs.token to later composite run steps", () => {
    const action = read(".github/actions/checkout-mshops-artifact/action.yml");
    const [, ...named] = action.split("\n    - name:");
    const validate = named.find((block) => block.startsWith(" Validate MSHOPS artifact"));
    assert.ok(validate, "validate composite step must exist");
    assert.doesNotMatch(validate, /inputs\.token/);
    assert.doesNotMatch(validate, /env:\s*\$\{\{\s*inputs\s*\}\}/);
    assert.match(validate, /assert-no-mshops-token\.mjs/);
    const checkout = named.find((block) => block.startsWith(" Checkout MSHOPS"));
    assert.ok(checkout);
    assert.match(checkout, /token:\s*\$\{\{\s*inputs\.token\s*\}\}/);
  });

  it("rejects INPUT_TOKEN the same as GH_PAT", () => {
    const script = join(root, "scripts/ci/assert-no-mshops-token.mjs");
    const clean = spawnSync(process.execPath, [script], {
      cwd: root,
      env: { ...process.env, GH_PAT: "", INPUT_TOKEN: "" },
      encoding: "utf8",
    });
    assert.equal(clean.status, 0, clean.stderr || clean.stdout);

    const leaked = spawnSync(process.execPath, [script], {
      cwd: root,
      env: { ...process.env, INPUT_TOKEN: "gho_should_not_leak" },
      encoding: "utf8",
    });
    assert.notEqual(leaked.status, 0);
    assert.match(String(leaked.stderr || leaked.stdout), /INPUT_TOKEN/);
  });

  it("does not pass GH_PAT into npm test or npm run build steps", () => {
    for (const rel of [
      ".github/workflows/_reusable-build-test.yml",
      ".github/workflows/_reusable-wrangler-dry-run.yml",
      ".github/workflows/deploy-production.yml",
    ]) {
      const yaml = read(rel);
      for (const block of yaml.split(/\n(?=      - )/)) {
        if (!/npm (test|run build)/.test(block)) continue;
        assert.doesNotMatch(block, /secrets\.GH_PAT/);
        assert.doesNotMatch(block, /^\s+GH_PAT:/m);
      }
    }
  });
});
