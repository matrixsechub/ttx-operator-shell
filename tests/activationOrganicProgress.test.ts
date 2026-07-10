import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOrganicActivationProgress } from "../worker/activation/organicProgress.ts";

function createEnv() {
  const store = new Map<string, string>();
  return {
    SYSTEM_MODE: "PRODUCTION",
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

describe("activation organic progress", () => {
  it("reports blockers when gates are unmet", async () => {
    const env = createEnv();
    const progress = await buildOrganicActivationProgress(env);
    assert.ok(progress.blockers.length > 0);
    assert.equal(progress.promotionEligibleWinner, null);
    assert.equal(progress.gates.totalSessions.target, 150);
    assert.equal(progress.gates.qualifiedOrganic.target, 50);
  });
});
