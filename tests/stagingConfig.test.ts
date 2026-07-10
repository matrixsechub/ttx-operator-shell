import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { readWranglerKvBindings, validateStagingKvConfig } from "../scripts/lib/stagingKvPlaceholders.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function extractKvBindings(section) {
  const bindings = {};
  const pattern = /"binding":\s*"([^"]+)"\s*,\s*"id":\s*"([^"]+)"/g;
  for (const match of section.matchAll(pattern)) {
    bindings[match[1]] = match[2];
  }
  return bindings;
}

describe("staging wrangler config", () => {
  const raw = readFileSync(join(root, "wrangler.jsonc"), "utf8");
  const prodSection = raw.split('"env"')[0];
  const stagingBlock = raw.match(/"staging"\s*:\s*\{[\s\S]*?\n\s*\}\s*\n\s*\}/)?.[0] ?? "";

  const prodBindings = extractKvBindings(prodSection);
  const stagingBindings = extractKvBindings(stagingBlock);

  it("uses dedicated staging KV namespace IDs distinct from production", () => {
    for (const binding of ["AUTH_REVOCATION", "WEBHOOK_EVENTS", "SECURITY_EVENTS", "TTX_STATE"]) {
      assert.ok(prodBindings[binding], `missing production binding ${binding}`);
      assert.ok(stagingBindings[binding], `missing staging binding ${binding}`);
      assert.notEqual(prodBindings[binding], stagingBindings[binding]);
    }
  });

  it("sets staging deploy metadata vars", () => {
    assert.match(stagingBlock, /"DEPLOY_ENV":\s*"staging"/);
    assert.match(stagingBlock, /"ORIGIN_URL":\s*"https:\/\/ttx-operator-shell-staging/);
    assert.match(stagingBlock, /"BUILD_COMMIT_SHA"/);
  });

  it("fails validation while placeholder staging KV ids remain", () => {
    const result = validateStagingKvConfig(readWranglerKvBindings());
    assert.equal(result.ok, false);
    assert.ok(result.errors.length >= 4);
  });
});
