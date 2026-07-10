import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleTtxRoute } from "../worker/ttx.ts";
import type { TtxEnv } from "../worker/ttx.ts";

function createMockKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list() {
      return { keys: [], list_complete: true, cacheStatus: null };
    },
    async getWithMetadata() {
      return null;
    },
  } as unknown as KVNamespace;
}

function mockTtxEnv(kv: KVNamespace): TtxEnv {
  return { TTX_STATE: kv };
}

describe("TTX session happy path", () => {
  it("lists builtin scenarios, starts a session, and advances", async () => {
    const kv = createMockKv();
    const env = mockTtxEnv(kv);

    const listResponse = await handleTtxRoute(
      new Request("https://example.com/api/ttx/sessions/scenarios"),
      "/api/ttx/sessions/scenarios",
      env,
    );
    assert.ok(listResponse);
    assert.equal(listResponse?.status, 200);
    const listBody = (await listResponse?.json()) as { scenarios: { id: string }[] };
    assert.ok(listBody.scenarios.length > 0);

    const scenarioId = listBody.scenarios[0].id;
    const startResponse = await handleTtxRoute(
      new Request("https://example.com/api/ttx/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      }),
      "/api/ttx/sessions/start",
      env,
    );
    assert.ok(startResponse);
    assert.equal(startResponse?.status, 200);
    const startBody = (await startResponse?.json()) as { sessionId: string; done: boolean };
    assert.ok(startBody.sessionId);
    assert.equal(startBody.done, false);

    const nextResponse = await handleTtxRoute(
      new Request("https://example.com/api/ttx/sessions/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: startBody.sessionId }),
      }),
      "/api/ttx/sessions/next",
      env,
    );
    assert.ok(nextResponse);
    assert.equal(nextResponse?.status, 200);
  });
});
