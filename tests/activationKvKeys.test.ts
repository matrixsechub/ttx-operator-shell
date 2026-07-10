import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ActivationKvKeyError, campaignKey, sanitizeKvSegment } from "../worker/activation/kvKeys.ts";

describe("activation kv keys", () => {
  it("builds campaign keys", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    assert.equal(campaignKey(id), `activation:v1:campaign:${id}`);
  });

  it("rejects invalid segments", () => {
    assert.throws(() => sanitizeKvSegment("../evil", "id"), ActivationKvKeyError);
    assert.throws(() => sanitizeKvSegment("bad/id", "id"), ActivationKvKeyError);
  });
});
