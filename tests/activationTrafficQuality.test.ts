import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import {
  classifyTrafficSource,
  classifyUserAgent,
  recordInteractionSignal,
  isQualifiedOrganicQuality,
} from "../worker/activation/trafficQuality.ts";

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

describe("activation traffic quality", () => {
  it("classifies synthetic and internal sources", () => {
    assert.equal(classifyTrafficSource("synthetic_injection"), "SYNTHETIC");
    assert.equal(classifyTrafficSource("internal"), "INTERNAL");
  });

  it("detects crawler user agents", () => {
    assert.equal(classifyUserAgent("Mozilla/5.0 Googlebot/2.1"), "BOT_LIKELY");
  });

  it("upgrades to human likely with interaction", async () => {
    const env = createEnv();
    const sessionId = randomUUID();
    const record = await recordInteractionSignal(env, sessionId, "pointer_move");
    assert.equal(isQualifiedOrganicQuality(record.quality), true);
  });
});
