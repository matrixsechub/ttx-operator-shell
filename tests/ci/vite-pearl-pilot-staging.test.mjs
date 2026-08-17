import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("staging Pearl pilot env injection", () => {
  it("defaults VITE_PEARL_PILOT=on in deploy-staging script", () => {
    const script = readFileSync(join(root, "scripts", "deploy-staging.mjs"), "utf8");
    assert.match(script, /VITE_PEARL_PILOT/);
    assert.match(script, /"on"/);
  });

  it("accepts vite_pearl_pilot input on reusable staging build workflows", () => {
    const buildTest = readFileSync(
      join(root, ".github", "workflows", "_reusable-build-test.yml"),
      "utf8",
    );
    const dryRun = readFileSync(
      join(root, ".github", "workflows", "_reusable-wrangler-dry-run.yml"),
      "utf8",
    );
    assert.match(buildTest, /vite_pearl_pilot:/);
    assert.match(buildTest, /VITE_PEARL_PILOT:\s*\$\{\{\s*inputs\.vite_pearl_pilot\s*\}\}/);
    assert.match(dryRun, /vite_pearl_pilot:/);
    assert.match(dryRun, /VITE_PEARL_PILOT:\s*\$\{\{\s*inputs\.vite_pearl_pilot\s*\}\}/);
  });
});
