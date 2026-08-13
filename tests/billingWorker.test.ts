import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handleBillingRoute,
  resolveProvider,
  verifyStripeSignature,
} from "../worker/marketplaceBillingWorker.ts";
import { CATALOG_ITEMS } from "../worker/catalogData.ts";
import { writeTier } from "../worker/tierWorker.ts";

function createKv() {
  const store = new Map<string, string>();
  return {
    store,
    kv: {
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
    } as unknown as KVNamespace,
  };
}

const SESSION = "6f9619ff-8b86-4d01-b42d-00cf4fc964ff";
const SUBJECT = `anon:${SESSION}`;

function packItemId(): string {
  const item = CATALOG_ITEMS.find((candidate) =>
    candidate.tags?.some((tag) =>
      ["agent-pack", "automation-pack", "scenario-pack", "intelligence-pack"].includes(tag),
    ),
  );
  return item?.id ?? "";
}

function checkoutRequest(itemId: string): Request {
  return new Request("https://x/api/billing/checkout-session", {
    method: "POST",
    body: JSON.stringify({ itemId, sessionId: SESSION }),
  });
}

describe("billing provider resolution", () => {
  it("production without keys has NO provider (503 path)", () => {
    assert.equal(resolveProvider({ DEPLOY_ENV: "production" }), null);
  });
  it("staging with BILLING_SANDBOX unset fails closed", () => {
    assert.equal(resolveProvider({ DEPLOY_ENV: "staging" }), null);
  });
  it("staging with BILLING_SANDBOX false fails closed", () => {
    assert.equal(resolveProvider({ DEPLOY_ENV: "staging", BILLING_SANDBOX: "false" }), null);
  });
  it("staging with BILLING_SANDBOX explicitly true enables sandbox", () => {
    assert.equal(resolveProvider({ DEPLOY_ENV: "staging", BILLING_SANDBOX: "true" }), "sandbox");
  });
  it("production with BILLING_SANDBOX explicitly true never enables sandbox", () => {
    assert.equal(resolveProvider({ DEPLOY_ENV: "production", BILLING_SANDBOX: "true" }), null);
  });
  it("stripe wins when configured", () => {
    assert.equal(resolveProvider({ DEPLOY_ENV: "production", STRIPE_SECRET_KEY: "sk_test" }), "stripe");
  });
});

describe("checkout-session endpoint", () => {
  it("rejects unknown items", async () => {
    const { kv } = createKv();
    const response = (await handleBillingRoute(checkoutRequest("nope"), "/api/billing/checkout-session", {
      TTX_STATE: kv,
      DEPLOY_ENV: "staging",
    })) as Response;
    assert.equal(response.status, 404);
  });

  it("enforces marketplace.acquire — ACCESS tier is 403 with upgrade hint", async () => {
    const { kv } = createKv();
    const itemId = packItemId();
    if (!itemId) return; // no pack-tagged item in catalog yet — mapping tested in entitlements suite
    const response = (await handleBillingRoute(checkoutRequest(itemId), "/api/billing/checkout-session", {
      TTX_STATE: kv,
      DEPLOY_ENV: "staging",
    })) as Response;
    assert.equal(response.status, 403);
    const payload = (await response.json()) as { requiresTier?: string };
    assert.equal(payload.requiresTier, "operator");
  });

  it("sandbox provider grants synchronously for an operator-tier subject (M3-1→M3-4)", async () => {
    const { kv, store } = createKv();
    const itemId = packItemId();
    if (!itemId) return;
    await writeTier({ TTX_STATE: kv }, SUBJECT, "operator");
    const response = (await handleBillingRoute(checkoutRequest(itemId), "/api/billing/checkout-session", {
      TTX_STATE: kv,
      DEPLOY_ENV: "staging",
      BILLING_SANDBOX: "true",
    })) as Response;
    assert.equal(response.status, 201);
    const payload = (await response.json()) as { acquisitionId: string; status: string; sandbox: boolean };
    assert.equal(payload.status, "granted");
    assert.equal(payload.sandbox, true);

    // Entitlement record written by the single writer.
    const record = JSON.parse(store.get(`pearl:entitlements:${SUBJECT}`) as string);
    assert.equal(record.packs.length, 1);
    assert.equal(record.packs[0].slug, itemId);

    // M3-3 polling sees the settled acquisition.
    const poll = (await handleBillingRoute(
      new Request(`https://x/api/billing/acquisition?id=${payload.acquisitionId}`),
      "/api/billing/acquisition",
      { TTX_STATE: kv, DEPLOY_ENV: "staging" },
    )) as Response;
    const polled = (await poll.json()) as { status: string };
    assert.equal(polled.status, "granted");
  });

  it("production without billing configured returns 503, never a grant", async () => {
    const { kv, store } = createKv();
    const itemId = packItemId();
    if (!itemId) return;
    await writeTier({ TTX_STATE: kv }, SUBJECT, "operator");
    const response = (await handleBillingRoute(checkoutRequest(itemId), "/api/billing/checkout-session", {
      TTX_STATE: kv,
      DEPLOY_ENV: "production",
    })) as Response;
    assert.equal(response.status, 503);
    assert.equal(store.has(`pearl:entitlements:${SUBJECT}`), false);
    assert.equal([...store.keys()].some((key) => key.startsWith("pearl:acquisition:")), false);
  });

  for (const testCase of [
    { name: "staging plus unset BILLING_SANDBOX", env: { DEPLOY_ENV: "staging" } },
    { name: "staging plus false BILLING_SANDBOX", env: { DEPLOY_ENV: "staging", BILLING_SANDBOX: "false" } },
    { name: "production plus true BILLING_SANDBOX", env: { DEPLOY_ENV: "production", BILLING_SANDBOX: "true" } },
  ] as const) {
    it(`${testCase.name} fails closed without acquisition or entitlement writes`, async () => {
      const { kv, store } = createKv();
      const itemId = packItemId();
      if (!itemId) return;
      await writeTier({ TTX_STATE: kv }, SUBJECT, "operator");

      const response = (await handleBillingRoute(checkoutRequest(itemId), "/api/billing/checkout-session", {
        TTX_STATE: kv,
        ...testCase.env,
      })) as Response;

      assert.equal(response.status, 503);
      assert.equal(store.has(`pearl:entitlements:${SUBJECT}`), false);
      assert.equal([...store.keys()].some((key) => key.startsWith("pearl:acquisition:")), false);
    });
  }
});

describe("billing webhook", () => {
  it("503 when webhook secret is not configured", async () => {
    const { kv } = createKv();
    const response = (await handleBillingRoute(
      new Request("https://x/api/webhooks/billing", { method: "POST", body: "{}" }),
      "/api/webhooks/billing",
      { TTX_STATE: kv },
    )) as Response;
    assert.equal(response.status, 503);
  });

  it("rejects bad signatures", async () => {
    const { kv } = createKv();
    const response = (await handleBillingRoute(
      new Request("https://x/api/webhooks/billing", {
        method: "POST",
        body: "{}",
        headers: { "Stripe-Signature": "t=1,v1=deadbeef" },
      }),
      "/api/webhooks/billing",
      { TTX_STATE: kv, STRIPE_WEBHOOK_SECRET: "whsec_test" },
    )) as Response;
    assert.equal(response.status, 401);
  });

  it("accepts a correctly signed event and settles the grant", async () => {
    const { kv, store } = createKv();
    // Seed a pending acquisition.
    const acquisitionId = "6f9619ff-8b86-4d01-b42d-00cf4fc964aa";
    store.set(
      `pearl:acquisition:${acquisitionId}`,
      JSON.stringify({
        id: acquisitionId,
        itemId: "any-item",
        packKind: "agent-pack",
        subject: SUBJECT,
        provider: "stripe",
        status: "pending",
        sandbox: false,
        createdAt: "t",
        updatedAt: "t",
      }),
    );
    const secret = "whsec_test";
    const body = JSON.stringify({
      type: "checkout.session.completed",
      data: { object: { metadata: { acquisition_id: acquisitionId } } },
    });
    const timestamp = "1234567890";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
    const signature = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

    assert.equal(await verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, secret), true);

    const response = (await handleBillingRoute(
      new Request("https://x/api/webhooks/billing", {
        method: "POST",
        body,
        headers: { "Stripe-Signature": `t=${timestamp},v1=${signature}` },
      }),
      "/api/webhooks/billing",
      { TTX_STATE: kv, STRIPE_WEBHOOK_SECRET: secret },
    )) as Response;
    assert.equal(response.status, 200);
    const settled = JSON.parse(store.get(`pearl:acquisition:${acquisitionId}`) as string);
    assert.equal(settled.status, "granted");
    const record = JSON.parse(store.get(`pearl:entitlements:${SUBJECT}`) as string);
    assert.equal(record.packs[0].acquisitionId, acquisitionId);
  });
});
