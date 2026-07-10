import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeSecurityScore,
  handleAuditLiteRoute,
  normalizeAuditDomain,
  type AuditResult,
} from "../worker/auditLite.ts";

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

async function stripeSignatureHeader(rawBody: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const hex = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

function installAuditFetch(headers: HeadersInit) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("https://cloudflare-dns.com/dns-query")) {
      return new Response(JSON.stringify({ Answer: [{ data: "ada.ns.cloudflare.com." }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("ok", { status: 200, headers });
  }) as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

describe("Audit Lite domain validation and scoring", () => {
  it("normalizes public domains and blocks private targets", () => {
    assert.equal(normalizeAuditDomain("https://Example.COM/path?q=1"), "example.com");
    assert.throws(() => normalizeAuditDomain("http://127.0.0.1"), /not allowed/);
    assert.throws(() => normalizeAuditDomain("localhost"), /not allowed/);
    assert.throws(() => normalizeAuditDomain("internal"), /not allowed/);
  });

  it("classifies strong and weak posture scores", () => {
    const strong = computeSecurityScore({
      tlsValid: true,
      cloudflare: true,
      headers: {
        csp: true,
        hsts: true,
        xFrameOptions: true,
        xContentTypeOptions: true,
        referrerPolicy: true,
        permissionsPolicy: true,
      },
    });
    assert.equal(strong.score, 100);
    assert.equal(strong.risk_level, "LOW");
    assert.equal(strong.findings.length, 0);

    const weak = computeSecurityScore({
      tlsValid: false,
      cloudflare: false,
      headers: {
        csp: false,
        hsts: false,
        xFrameOptions: false,
        xContentTypeOptions: false,
        referrerPolicy: false,
        permissionsPolicy: false,
      },
    });
    assert.equal(weak.risk_level, "HIGH");
    assert.ok(weak.score < 50);
    assert.ok(weak.findings.some((finding) => finding.type === "missing_csp"));
  });
});

describe("Audit Lite API lifecycle", () => {
  it("runs start to locked result, records Stripe payment, and unlocks JSON/PDF delivery", async () => {
    const restoreFetch = installAuditFetch({
      "content-security-policy": "default-src 'self'",
      "strict-transport-security": "max-age=31536000",
      "x-frame-options": "DENY",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "geolocation=()",
      "cf-ray": "test-ray",
      server: "cloudflare",
    });
    const { kv } = createKv();
    const secret = "whsec_test_secret";

    try {
      const startResponse = await handleAuditLiteRoute(
        new Request("https://example.com/api/audit-lite/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: "example.com", email: "buyer@example.com" }),
        }),
        "/api/audit-lite/start",
        { TTX_STATE: kv },
      );
      assert.equal(startResponse?.status, 201);
      const startBody = (await startResponse?.json()) as {
        job_id: string;
        payment_status: string;
        teaser: { score: number; risk_level: string };
      };
      assert.ok(startBody.job_id);
      assert.equal(startBody.payment_status, "unpaid");
      assert.equal(startBody.teaser.score, 100);

      const lockedResponse = await handleAuditLiteRoute(
        new Request(`https://example.com/api/audit-lite/result/${startBody.job_id}`),
        `/api/audit-lite/result/${startBody.job_id}`,
        { TTX_STATE: kv },
      );
      assert.equal(lockedResponse?.status, 200);
      const lockedBody = (await lockedResponse?.json()) as { locked: boolean; teaser: unknown };
      assert.equal(lockedBody.locked, true);
      assert.ok(lockedBody.teaser);

      const rawEvent = JSON.stringify({
        id: "evt_test_paid",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_paid",
            client_reference_id: startBody.job_id,
            metadata: { audit_id: startBody.job_id },
          },
        },
      });
      const signature = await stripeSignatureHeader(rawEvent, secret);
      const webhookResponse = await handleAuditLiteRoute(
        new Request("https://example.com/api/audit-lite/webhook", {
          method: "POST",
          headers: { "Stripe-Signature": signature },
          body: rawEvent,
        }),
        "/api/audit-lite/webhook",
        { TTX_STATE: kv, STRIPE_WEBHOOK_SECRET: secret },
      );
      assert.equal(webhookResponse?.status, 200);
      const webhookBody = (await webhookResponse?.json()) as { action: string };
      assert.equal(webhookBody.action, "payment-recorded");

      const duplicateResponse = await handleAuditLiteRoute(
        new Request("https://example.com/api/audit-lite/webhook", {
          method: "POST",
          headers: { "Stripe-Signature": signature },
          body: rawEvent,
        }),
        "/api/audit-lite/webhook",
        { TTX_STATE: kv, STRIPE_WEBHOOK_SECRET: secret },
      );
      assert.equal(duplicateResponse?.status, 200);
      const duplicateBody = (await duplicateResponse?.json()) as { duplicate: boolean };
      assert.equal(duplicateBody.duplicate, true);

      const fullResponse = await handleAuditLiteRoute(
        new Request(`https://example.com/api/audit-lite/result/${startBody.job_id}`),
        `/api/audit-lite/result/${startBody.job_id}`,
        { TTX_STATE: kv },
      );
      assert.equal(fullResponse?.status, 200);
      const fullBody = (await fullResponse?.json()) as { locked: boolean; payment_status: string; report: AuditResult };
      assert.equal(fullBody.locked, false);
      assert.equal(fullBody.payment_status, "paid");
      assert.equal(fullBody.report.domain, "example.com");

      const pdfResponse = await handleAuditLiteRoute(
        new Request(`https://example.com/api/audit-lite/result/${startBody.job_id}?format=pdf`),
        `/api/audit-lite/result/${startBody.job_id}`,
        { TTX_STATE: kv },
      );
      assert.equal(pdfResponse?.status, 200);
      assert.equal(pdfResponse?.headers.get("Content-Type"), "application/pdf");
      assert.match(await pdfResponse!.text(), /^%PDF-1\.4/);
    } finally {
      restoreFetch();
    }
  });

  it("rejects invalid Stripe webhook signatures", async () => {
    const { kv } = createKv();
    const response = await handleAuditLiteRoute(
      new Request("https://example.com/api/audit-lite/webhook", {
        method: "POST",
        headers: { "Stripe-Signature": "t=123,v1=bad" },
        body: JSON.stringify({ id: "evt_bad", type: "checkout.session.completed" }),
      }),
      "/api/audit-lite/webhook",
      { TTX_STATE: kv, STRIPE_WEBHOOK_SECRET: "whsec_test_secret" },
    );
    assert.equal(response?.status, 400);
  });
});
