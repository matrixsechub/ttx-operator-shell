import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleKernelRoute } from "../worker/kernel.ts";
import type { BackboneEnv } from "../worker/backboneEnv.ts";
import type { GhostEnv } from "../worker/ghost.ts";
import type { ModeEnv } from "../worker/mode.ts";
import type { BuildInfoEnv } from "../worker/buildInfo.ts";

function mockDoStub() {
  return {
    fetch: async () =>
      new Response(
        JSON.stringify({
          northstar: { statement: "test", version: 1, updatedAt: new Date().toISOString() },
          strategicAxis: [],
          mandateRegistry: [],
          eventLog: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  } as DurableObjectStub;
}

function mockEnv(): BackboneEnv & GhostEnv & ModeEnv & BuildInfoEnv {
  const kv = {
    async get() {
      return null;
    },
    async put() {},
    async delete() {},
    async list() {
      return { keys: [], list_complete: true, cacheStatus: null };
    },
    async getWithMetadata() {
      return null;
    },
  } as unknown as KVNamespace;

  return {
    GOVERNANCE: { getByName: () => mockDoStub() } as DurableObjectNamespace,
    SESSION: { getByName: () => mockDoStub() } as DurableObjectNamespace,
    MARKETPLACE: { getByName: () => mockDoStub() } as DurableObjectNamespace,
    TTX_STATE: kv,
    SECURITY_EVENTS: kv,
    WEBHOOK_EVENTS: kv,
    AUTH_REVOCATION: kv,
    SYSTEM_MODE: "OPERATOR_BETA",
    DEPLOY_ENV: "test",
    BUILD_COMMIT_SHA: "testsha",
    APP_VERSION: "0.1.0",
  };
}

describe("GET /api/system/status", () => {
  it("returns a stable status payload", async () => {
    const request = new Request("https://example.com/api/system/status");
    const response = await handleKernelRoute(request, "/api/system/status", mockEnv());
    assert.ok(response);
    assert.equal(response?.status, 200);
    const body = (await response?.json()) as {
      harness?: { state?: string };
      api?: { available?: boolean };
    };
    assert.ok(body.harness?.state);
    assert.equal(typeof body.api?.available, "boolean");
    assert.equal(response?.headers.get("X-Build-Commit"), "testsha");
  });
});
