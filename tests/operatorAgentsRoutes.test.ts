import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleOperatorAgentsRoute, ORGANIZER_REPORT_KV_KEY } from "../worker/operatorAgentsRoutes.ts";

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

async function signToken(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=+$/, "");
  const body = btoa(
    JSON.stringify({ id: "op-1", handle: "operator", type: "access", exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).replace(/=+$/, "");
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return `${data}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, "")}`;
}

describe("operator agents routes", () => {
  const env = {
    TTX_STATE: mockKv(),
    AUTH_SIGNING_KEY: "test-signing-key",
    DEPLOY_ENV: "test",
  };

  it("returns codex agent registry for authenticated operator", async () => {
    const token = await signToken(env.AUTH_SIGNING_KEY);
    const response = await handleOperatorAgentsRoute(
      new Request("https://example.com/api/operator/agents", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      "/api/operator/agents",
      "GET",
      env,
    );
    assert.ok(response);
    assert.equal(response?.status, 200);
    const body = (await response?.json()) as { agents?: { agentId: string }[] };
    assert.ok(body.agents?.some((a) => a.agentId === "OrganizerAgent"));
  });

  it("returns unavailable organizer report when KV is empty", async () => {
    const token = await signToken(env.AUTH_SIGNING_KEY);
    const response = await handleOperatorAgentsRoute(
      new Request("https://example.com/api/operator/organizer/report", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      "/api/operator/organizer/report",
      "GET",
      env,
    );
    assert.ok(response);
    const body = (await response?.json()) as { available?: boolean };
    assert.equal(body.available, false);
  });

  it("returns organizer report from KV when published", async () => {
    const report = {
      agentId: "OrganizerAgent",
      mode: "advisory",
      scannedAt: new Date().toISOString(),
      summary: { warnCount: 1, errorCount: 0, infoCount: 0, suggestionCount: 0, cycleCount: 0 },
    };
    await env.TTX_STATE.put(ORGANIZER_REPORT_KV_KEY, JSON.stringify(report));
    const token = await signToken(env.AUTH_SIGNING_KEY);
    const response = await handleOperatorAgentsRoute(
      new Request("https://example.com/api/operator/organizer/report", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      "/api/operator/organizer/report",
      "GET",
      env,
    );
    const body = (await response?.json()) as { available?: boolean; report?: { agentId?: string } };
    assert.equal(body.available, true);
    assert.equal(body.report?.agentId, "OrganizerAgent");
  });
});
