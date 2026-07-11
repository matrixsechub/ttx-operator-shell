import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { createCampaign, transitionCampaign, canTransition } from "../worker/activation/campaignStorage.ts";

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

describe("activation campaign registry", () => {
  it("creates draft campaigns", async () => {
    const env = createEnv();
    const campaign = await createCampaign(env, {
      name: "LinkedIn launch",
      actor: "test",
      reason: "unit test",
      targetChannels: ["linkedin"],
    });
    assert.equal(campaign.status, "DRAFT");
    assert.ok(campaign.campaignId);
  });

  it("enforces state machine", async () => {
    assert.equal(canTransition("DRAFT", "READY_FOR_APPROVAL"), true);
    assert.equal(canTransition("DRAFT", "ACTIVE"), false);

    const env = createEnv();
    const campaign = await createCampaign(env, { name: "Test", actor: "test", reason: "unit" });
    await transitionCampaign(env, campaign.campaignId, "READY_FOR_APPROVAL", "test", "submit");
    const approved = await transitionCampaign(env, campaign.campaignId, "APPROVED", "test", "approve");
    assert.equal(approved.status, "APPROVED");
  });
});
