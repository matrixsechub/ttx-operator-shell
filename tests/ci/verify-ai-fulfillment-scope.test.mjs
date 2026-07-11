import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FULFILLMENT_SCOPE_TARGETS,
  isFulfillmentEnabled,
  readFulfillmentFlag,
  verifyFulfillmentScope,
} from "../../scripts/ci/verify-ai-fulfillment-scope.mjs";

describe("verify-ai-fulfillment-scope", () => {
  it("passes on repository wrangler configs", () => {
    const result = verifyFulfillmentScope();
    assert.equal(result.ok, true, result.errors?.join("; "));
    assert.equal(result.summary.failed, 0);
  });

  it("defines all required fulfillment scope targets", () => {
    assert.ok(FULFILLMENT_SCOPE_TARGETS.length >= 4);
    const files = new Set(FULFILLMENT_SCOPE_TARGETS.map((target) => target.file));
    assert.ok(files.has("wrangler.jsonc"));
    assert.ok(files.has("wrangler.mshops-operator.jsonc"));
    assert.ok(files.has("wrangler.mshops-public.jsonc"));
  });

  it("detects enabled fulfillment flags", () => {
    const raw = `{
      "name": "ttx-operator-shell",
      "vars": {
        "AI_FULFILLMENT_ENABLED": "true"
      }
    }`;
    assert.equal(readFulfillmentFlag(raw, "root"), "true");
    assert.equal(isFulfillmentEnabled("true"), true);
    assert.equal(isFulfillmentEnabled("false"), false);
  });

  it("fails when production fulfillment is enabled", () => {
    const raw = `{
      "name": "ttx-operator-shell",
      "vars": {
        "AI_FULFILLMENT_ENABLED": "1"
      }
    }`;
    assert.equal(readFulfillmentFlag(raw, "root"), "1");
    assert.equal(isFulfillmentEnabled("1"), true);
  });
});
