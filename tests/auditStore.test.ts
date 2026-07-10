import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listRecentAuditEvents, recordAuditEvent } from "../worker/governance/auditStore.ts";
import type { AuditEvent } from "../worker/governance/types.ts";

function mockKv(): KVNamespace {
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

describe("audit store", () => {
  it("lists recent audit events in index order", async () => {
    const env = { TTX_STATE: mockKv() };
    const event: AuditEvent = {
      event_id: "evt-1",
      timestamp: new Date().toISOString(),
      actor_type: "operator",
      actor_id: "operator",
      action_class: "C3",
      system_target: "test",
      beacon_hash: "abc",
      codex_hash: "def",
      trace_id: "trace-1",
      risk_score: 10,
      result: "success",
    };
    await recordAuditEvent(env, event);

    const listed = await listRecentAuditEvents(env, { limit: 10 });
    assert.equal(listed.total, 1);
    assert.equal(listed.events[0]?.event_id, "evt-1");
  });
});
