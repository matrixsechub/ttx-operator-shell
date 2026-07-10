import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { recordSessionAttribution, readSessionAttribution } from "../worker/activation/attribution.ts";
import { createCampaign } from "../worker/activation/campaignStorage.ts";

function createEnv() {
  const store = new Map<string, string>();
  return {
    TTX_STATE: {
      async get(key: string) {
        return store.get(key) ?? null;
      },
      async put(key: string, value: string) {
        store.set(key, value);
      },
      async list() {
        return { keys: [], list_complete: true, cacheStatus: null };
      },
    } as unknown as KVNamespace,
  };
}

describe("activation attribution", () => {
  it("preserves first touch", async () => {
    const env = createEnv();
    const sessionId = randomUUID();
    const first = await recordSessionAttribution(env, {
      sessionId,
      src: "linkedin",
      campaignId: undefined,
    });
    const second = await recordSessionAttribution(env, {
      sessionId,
      src: "email",
      campaignId: undefined,
      contentId: "c2",
    });

    assert.equal(first.recorded, true);
    assert.equal(second.recorded, false);
    assert.equal(second.attribution.firstTouch.src, "linkedin");
    assert.equal(second.attribution.lastTouch?.src, "email");
  });

  it("rejects unknown campaigns", async () => {
    const env = createEnv();
    const sessionId = randomUUID();
    const result = await recordSessionAttribution(env, {
      sessionId,
      src: "reddit",
      campaignId: randomUUID(),
    });
    assert.equal(result.rejected, true);
    assert.equal(result.reason, "attribution_rejected");
  });

  it("accepts active campaign ids", async () => {
    const env = createEnv();
    const campaign = await createCampaign(env, { name: "C1", actor: "test", reason: "unit" });
    const sessionId = randomUUID();
    const result = await recordSessionAttribution(env, {
      sessionId,
      src: "linkedin",
      campaignId: campaign.campaignId,
    });
    assert.equal(result.rejected, false);
    const stored = await readSessionAttribution(env, sessionId);
    assert.equal(stored?.campaignId, campaign.campaignId);
  });
});
