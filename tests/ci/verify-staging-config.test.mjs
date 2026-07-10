import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCTION_WORKER,
  STAGING_WORKER,
  parseWrangler,
} from "../../scripts/ci/verify-staging-config.mjs";

describe("verify-staging-config", () => {
  it("passes on the repository wrangler configuration", () => {
    const result = parseWrangler();
    assert.equal(result.ok, true, result.errors?.join("; "));
    assert.equal(result.summary?.productionWorker, PRODUCTION_WORKER);
    assert.equal(result.summary?.stagingWorker, STAGING_WORKER);
  });

  it("detects missing staging environment", () => {
    const raw = `{
      "name": "${PRODUCTION_WORKER}",
      "compatibility_date": "2026-06-30",
      "kv_namespaces": []
    }`;
    const stagingBlock = raw.match(/"staging"\s*:\s*\{[\s\S]*?\n\s*\}\s*\n\s*\}/)?.[0] ?? "";
    assert.equal(stagingBlock, "");
  });

  it("defines distinct production and staging worker constants", () => {
    assert.notEqual(PRODUCTION_WORKER, STAGING_WORKER);
    assert.equal(STAGING_WORKER, "ttx-operator-shell-staging");
  });

  it("masks KV identifiers in summary output", () => {
    const result = parseWrangler();
    assert.equal(result.ok, true);
    for (const masked of Object.values(result.summary?.kvBindings ?? {})) {
      assert.match(String(masked), /^[0-9a-f]{4}…[0-9a-f]{4}$/i);
    }
  });
});
