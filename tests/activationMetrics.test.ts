import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readCampaignMetrics } from "../worker/activation/campaignMetrics.ts";

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
    } as unknown as KVNamespace,
  };
}

describe("activation campaign metrics", () => {
  it("returns zeroed metrics for unknown campaigns", async () => {
    const env = createEnv();
    const metrics = await readCampaignMetrics(env, "00000000-0000-4000-8000-000000000099");
    assert.equal(metrics.qualifiedOrganicSessions, 0);
    assert.equal(metrics.entryRate, 0);
    assert.equal(metrics.valueStatus, "ATTENTION_ONLY");
  });
});
