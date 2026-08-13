import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enforceMarketplaceGovernance,
  resolveEffectiveKernelContext,
  type GovernancePolicy,
} from "../worker/kernel.ts";
import type { BackboneEnv } from "../worker/backboneEnv.ts";
import type { GhostEnv } from "../worker/ghost.ts";
import type { TelemetryEnv } from "../worker/telemetry.ts";

const AUTH_SIGNING_KEY = "test-auth-signing-key-32chars!!";
const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function signAccessToken(secret: string): Promise<string> {
  const payload = { id: "operator", handle: "operator", type: "access" as const, exp: Math.floor(Date.now() / 1000) + 3600 };
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(data));
  return `${data}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

function mockKv(): KVNamespace {
  return {
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
}

/** Governance DO that always fails — simulates a governance outage. */
function failingGovernanceStub(): DurableObjectStub {
  return {
    fetch: async () => {
      throw new Error("governance durable object unreachable");
    },
  } as unknown as DurableObjectStub;
}

/** Governance DO that returns a healthy, wrapped state document. */
function healthyGovernanceStub(): DurableObjectStub {
  return {
    fetch: async () =>
      new Response(
        JSON.stringify({
          state: {
            northstar: { statement: "test", version: 1, updatedAt: new Date().toISOString() },
            strategicAxis: [],
            mandateRegistry: [],
            eventLog: [],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  } as unknown as DurableObjectStub;
}

function baseEnv(governance: DurableObjectStub, marketplace?: DurableObjectStub) {
  const kv = mockKv();
  return {
    GOVERNANCE: { getByName: () => governance } as unknown as DurableObjectNamespace,
    SESSION: { getByName: () => governance } as unknown as DurableObjectNamespace,
    MARKETPLACE: {
      getByName: () => marketplace ?? governance,
    } as unknown as DurableObjectNamespace,
    TTX_STATE: kv,
    SECURITY_EVENTS: kv,
    WEBHOOK_EVENTS: kv,
    AUTH_REVOCATION: kv,
    AUTH_SIGNING_KEY,
    SYSTEM_MODE: "OPERATOR_BETA",
    DEPLOY_ENV: "test",
  } as unknown as BackboneEnv & GhostEnv & TelemetryEnv;
}

describe("resolveEffectiveKernelContext — fail closed (F-CRIT-2)", () => {
  it("throws when the governance Durable Object is unreachable", async () => {
    await assert.rejects(() => resolveEffectiveKernelContext(baseEnv(failingGovernanceStub())));
  });

  it("resolves when governance is healthy", async () => {
    const ctx = await resolveEffectiveKernelContext(baseEnv(healthyGovernanceStub()));
    assert.ok(ctx.policy);
    assert.equal(typeof ctx.policy.marketplaceValidationRequired, "boolean");
  });
});

describe("enforceMarketplaceGovernance — fail closed (F-CRIT-2)", () => {
  const policy: GovernancePolicy = {
    marketplaceValidationRequired: true,
    wildcardFeaturesEnabled: true,
    northstarVersion: 2,
    mode: "strict",
  };

  it("propagates (does not swallow) an error from the marketplace validation DO", async () => {
    const token = await signAccessToken(AUTH_SIGNING_KEY);
    const request = new Request("https://example.com/api/marketplace/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ moduleId: "mod-1" }),
    });
    const env = baseEnv(healthyGovernanceStub(), failingGovernanceStub());
    await assert.rejects(() =>
      enforceMarketplaceGovernance(request, "/api/marketplace/purchase", env, policy),
    );
  });
});
