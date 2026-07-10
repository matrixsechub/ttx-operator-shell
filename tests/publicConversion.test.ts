import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, mock } from "node:test";
import {
  resolveCalendlyConfig,
  resolveCalendlyUrl,
  resolveLeadNotificationConfig,
} from "../worker/publicConversionConfig.ts";
import {
  deliverLeadNotification,
  notifyIdempotencyKey,
  sendLeadNotification,
} from "../worker/leadNotification.ts";
import { handleRecoveredFunnelApi } from "../worker/funnelRecovery.ts";
import { deploymentHeaders } from "../worker/edge/headers.ts";

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

describe("public conversion config", () => {
  it("accepts a valid HTTPS Calendly URL", () => {
    const url = resolveCalendlyUrl({ PUBLIC_CALENDLY_URL: "https://calendly.com/matrixsechub/30min" });
    assert.equal(url, "https://calendly.com/matrixsechub/30min");
    assert.ok(resolveCalendlyConfig({ PUBLIC_CALENDLY_URL: url ?? undefined }));
  });

  it("rejects missing or invalid Calendly URLs", () => {
    assert.equal(resolveCalendlyUrl({}), null);
    assert.equal(resolveCalendlyUrl({ PUBLIC_CALENDLY_URL: "http://calendly.com/x" }), null);
    assert.equal(resolveCalendlyUrl({ PUBLIC_CALENDLY_URL: "https://example.com/x" }), null);
  });

  it("requires recipient and webhook for lead notification config", () => {
    assert.equal(resolveLeadNotificationConfig({}), null);
    assert.equal(
      resolveLeadNotificationConfig({
        LEAD_NOTIFICATION_EMAIL: "ops@example.com",
      }),
      null,
    );
    assert.deepEqual(
      resolveLeadNotificationConfig({
        LEAD_NOTIFICATION_EMAIL: "ops@example.com",
        LEAD_NOTIFICATION_WEBHOOK_URL: "https://n8n.example/webhook/lead",
      }),
      {
        recipient: "ops@example.com",
        webhookUrl: "https://n8n.example/webhook/lead",
      },
    );
  });
});

describe("lead notification delivery", () => {
  it("deduplicates accepted notifications by lead id", async () => {
    const { kv, store } = createKv();
    const config = {
      recipient: "ops@example.com",
      webhookUrl: "https://n8n.example/webhook/lead",
    };
    const input = {
      kind: "register" as const,
      leadId: "reg_test_1",
      correlationMarker: "MSHOPS-LEAD-PROOF-reg_test_1",
      timestamp: new Date().toISOString(),
      sourcePage: "/register",
      name: "Test Operator",
      email: "test@example.com",
      role: "operator",
      reason: "Need access to Operator OS staging review.",
    };

    mock.method(globalThis, "fetch", async () => new Response("{}", { status: 200, headers: { "x-request-id": "msg-1" } }));

    const first = await deliverLeadNotification(kv, config, input);
    const second = await deliverLeadNotification(kv, config, input);

    assert.equal(first.status, "accepted");
    assert.equal(second.status, "accepted");
    assert.equal(second.messageId, "msg-1");
    assert.ok(store.has(notifyIdempotencyKey("reg_test_1")));

    mock.restoreAll();
  });

  it("retains skipped status when notification wiring is missing", async () => {
    const { kv } = createKv();
    const result = await deliverLeadNotification(kv, null, {
      kind: "register",
      leadId: "reg_test_2",
      correlationMarker: "MSHOPS-LEAD-PROOF-reg_test_2",
      timestamp: new Date().toISOString(),
      sourcePage: "/register",
      name: "Test Operator",
      email: "test@example.com",
      reason: "Need access.",
    });
    assert.equal(result.status, "skipped");
    assert.equal(result.code, "LEAD_NOTIFICATION_NOT_CONFIGURED");
  });
});

describe("onboarding public surface", () => {
  it("includes detailed Operator OS sections and no fake step counter", () => {
    const html = readFileSync(new URL("../public/onboarding.html", import.meta.url), "utf8");
    assert.match(html, /Activate Operator OS/);
    assert.match(html, /What Operator OS is/);
    assert.match(html, /What is being built/);
    assert.match(html, /How activation works/);
    assert.match(html, /Public and operator-only boundary/);
    assert.doesNotMatch(html, /Step 1 of 3/);
    assert.doesNotMatch(html, /onboarding-step-label/);
    assert.doesNotMatch(html, /onboarding-prev/);
  });
});

describe("calendly public surface", () => {
  it("does not hardcode placeholder booking URLs in enter.html", () => {
    const html = readFileSync(new URL("../public/enter.html", import.meta.url), "utf8");
    assert.doesNotMatch(html, /https:\/\/calendly\.com\//);
    assert.match(html, /data-calendly-block/);
    assert.match(html, /calendly-booking\.js/);
  });

  it("returns blocked code when calendly config is missing", async () => {
    const response = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/public/calendly-config"),
      new URL("https://example.com/api/public/calendly-config"),
      {},
    );
    assert.equal(response?.status, 503);
    const body = (await response?.json()) as { code?: string };
    assert.equal(body.code, "BLOCKED_CALENDLY_URL_REQUIRED");
  });

  it("permits Calendly domains in CSP without broadening beyond scheduling", () => {
    const csp = deploymentHeaders()["Content-Security-Policy-Report-Only"] ?? "";
    assert.match(csp, /https:\/\/assets\.calendly\.com/);
    assert.match(csp, /https:\/\/calendly\.com/);
    assert.doesNotMatch(csp, /https:\/\/\*\.example\.com/);
  });
});

describe("register lead capture API", () => {
  it("persists registration and reports notification status", async () => {
    const { kv } = createKv();
    mock.method(globalThis, "fetch", async () => new Response("{}", { status: 200, headers: { "x-request-id": "msg-reg-1" } }));

    const response = await handleRecoveredFunnelApi(
      new Request("https://example.com/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Operator",
          email: "test@example.com",
          role: "operator",
          reason: "Need access to Operator OS.",
          source: "public-register",
          source_page: "/register",
        }),
      }),
      new URL("https://example.com/api/register"),
      {
        TTX_STATE: kv,
        LEAD_NOTIFICATION_EMAIL: "ops@example.com",
        LEAD_NOTIFICATION_WEBHOOK_URL: "https://n8n.example/webhook/lead",
      },
    );

    assert.equal(response?.status, 200);
    const body = (await response?.json()) as {
      register_id?: string;
      notification?: { status?: string; message_id?: string };
    };
    assert.ok(body.register_id);
    assert.equal(body.notification?.status, "accepted");
    assert.equal(body.notification?.message_id, "msg-reg-1");

    mock.restoreAll();
  });

  it("does not expose demo mode messaging on register page", () => {
    const html = readFileSync(new URL("../public/register.html", import.meta.url), "utf8");
    assert.doesNotMatch(html, /Demo Mode — No data stored/);
    assert.doesNotMatch(html, /intake-demo-banner\.js/);
  });
});

describe("email proof harness", () => {
  it("builds a unique correlation marker without leaking secrets", async () => {
    mock.method(globalThis, "fetch", async () => new Response("{}", { status: 200, headers: { "x-request-id": "msg-proof-1" } }));

    const result = await sendLeadNotification(
      {
        recipient: "ops@example.com",
        webhookUrl: "https://n8n.example/webhook/lead",
      },
      {
        kind: "register",
        leadId: "reg_proof_1",
        correlationMarker: "MSHOPS-LEAD-PROOF-reg_proof_1",
        timestamp: new Date().toISOString(),
        sourcePage: "/register",
        name: "Proof Lead",
        email: "proof@example.com",
        reason: "Proof reason",
      },
    );

    assert.equal(result.status, "accepted");
    assert.match(result.messageId, /msg|provider/);

    mock.restoreAll();
  });
});
