import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { edgeAuthGate } from "../worker/edge/gate.ts";
import { classifyRoute } from "../worker/edge/routeClass.ts";
import { signToken } from "../worker/edge/crypto.ts";
import { handlePrismUiuxRoute } from "../worker/prismUiuxRoutes.ts";
import { PrismUiuxStorageError } from "../worker/prismUiuxStorage.ts";

const EDGE_SECRET = "test-edge-secret-key-32chars!!";

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

async function edgeToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return signToken(EDGE_SECRET, { sub: "operator", iat: now, exp: now + 3600 });
}

function envWithKv(kv: KVNamespace) {
  return {
    TTX_STATE: kv,
    AUTH_SIGNING_KEY: EDGE_SECRET,
    OPERATOR_SECRET: EDGE_SECRET,
    AI_FULFILLMENT_ENABLED: "false",
  };
}

describe("PRISM UI/UX routes", () => {
  it("classifies operator uiux paths as operator-protected", () => {
    assert.equal(classifyRoute("/api/operator/uiux/audits", "POST"), "operator");
    assert.equal(classifyRoute("/api/operator/uiux/audits", "GET"), "operator");
    assert.equal(classifyRoute("/api/operator/uiux/audits/abc-123", "GET"), "operator");
  });

  it("rejects unauthenticated access at edge gate", async () => {
    const res = await edgeAuthGate(
      new Request("https://example.com/api/operator/uiux/audits", { method: "POST" }),
      "/api/operator/uiux/audits",
      { OPERATOR_SECRET: EDGE_SECRET },
    );
    assert.ok(res);
    assert.equal(res?.status, 401);
  });

  it("creates, lists, reads, approves, and rejects audits", async () => {
    const { kv } = createKv();
    const env = envWithKv(kv);

    const createRes = await handlePrismUiuxRoute(
      new Request("https://example.com/api/operator/uiux/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "AUDIT_ROUTE",
          routes: ["/"],
          viewport: "mobile",
          useFixture: true,
        }),
      }),
      "/api/operator/uiux/audits",
      env,
    );
    assert.ok(createRes);
    assert.equal(createRes?.status, 200);
    const created = (await createRes!.json()) as {
      audit: { auditId: string; findings: { id: string; status: string }[] };
    };
    const auditId = created.audit.auditId;
    assert.ok(auditId);
    assert.equal(created.audit.findings[0]?.status, "open");

    const listRes = await handlePrismUiuxRoute(
      new Request("https://example.com/api/operator/uiux/audits"),
      "/api/operator/uiux/audits",
      env,
    );
    assert.ok(listRes);
    const listed = (await listRes!.json()) as { audits: { auditId: string }[] };
    assert.ok(listed.audits.some((a) => a.auditId === auditId));

    const getRes = await handlePrismUiuxRoute(
      new Request(`https://example.com/api/operator/uiux/audits/${auditId}`),
      `/api/operator/uiux/audits/${auditId}`,
      env,
    );
    assert.ok(getRes);
    assert.equal(getRes?.status, 200);

    const approveRes = await handlePrismUiuxRoute(
      new Request(`https://example.com/api/operator/uiux/audits/${auditId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingIds: created.audit.findings.map((f) => f.id),
          note: "ok",
        }),
      }),
      `/api/operator/uiux/audits/${auditId}/approve`,
      env,
    );
    assert.ok(approveRes);
    assert.equal(approveRes?.status, 200);
    const approved = (await approveRes!.json()) as {
      approval: { mutationAuthorized: boolean; action: string };
      audit: { findings: { status: string }[] };
    };
    assert.equal(approved.approval.mutationAuthorized, false);
    assert.equal(approved.approval.action, "approve");
    assert.ok(approved.audit.findings.every((f) => f.status === "accepted"));

    const rejectRes = await handlePrismUiuxRoute(
      new Request(`https://example.com/api/operator/uiux/audits/${auditId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      `/api/operator/uiux/audits/${auditId}/reject`,
      env,
    );
    assert.ok(rejectRes);
    const rejected = (await rejectRes!.json()) as { audit: { findings: { status: string }[] } };
    assert.ok(rejected.audit.findings.every((f) => f.status === "rejected"));
  });

  it("rejects malformed create payloads", async () => {
    const { kv } = createKv();
    const env = envWithKv(kv);
    const res = await handlePrismUiuxRoute(
      new Request("https://example.com/api/operator/uiux/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "NOT_A_MODE", viewport: "mobile" }),
      }),
      "/api/operator/uiux/audits",
      env,
    );
    assert.ok(res);
    assert.equal(res?.status, 400);
  });

  it("returns 503 when TTX_STATE is missing", async () => {
    const res = await handlePrismUiuxRoute(
      new Request("https://example.com/api/operator/uiux/audits"),
      "/api/operator/uiux/audits",
      {},
    );
    assert.ok(res);
    assert.equal(res?.status, 503);
  });

  it("returns 500 on persistence failure", async () => {
    const kv = {
      async get() {
        return null;
      },
      async put() {
        throw new Error("kv down");
      },
      async delete() {
        return;
      },
      async list() {
        return { keys: [], list_complete: true, cacheStatus: null };
      },
      async getWithMetadata() {
        return null;
      },
    } as unknown as KVNamespace;

    const res = await handlePrismUiuxRoute(
      new Request("https://example.com/api/operator/uiux/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "AUDIT_ROUTE",
          routes: ["/status"],
          viewport: "mobile",
          useFixture: true,
        }),
      }),
      "/api/operator/uiux/audits",
      envWithKv(kv),
    );
    assert.ok(res);
    assert.equal(res?.status, 500);
  });

  it("maintains audit index across multiple creates", async () => {
    const { kv } = createKv();
    const env = envWithKv(kv);

    for (const route of ["/services", "/enter"]) {
      await handlePrismUiuxRoute(
        new Request("https://example.com/api/operator/uiux/audits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "AUDIT_ROUTE",
            routes: [route],
            viewport: "desktop",
            useFixture: true,
          }),
        }),
        "/api/operator/uiux/audits",
        env,
      );
    }

    const listRes = await handlePrismUiuxRoute(
      new Request("https://example.com/api/operator/uiux/audits"),
      "/api/operator/uiux/audits",
      env,
    );
    const listed = (await listRes!.json()) as { audits: { routes: string[] }[] };
    assert.equal(listed.audits.length, 2);
    assert.equal(listed.audits[0]?.routes[0], "/enter");
  });

  it("deduplicates audits by idempotency key", async () => {
    const { kv } = createKv();
    const env = envWithKv(kv);
    const body = {
      mode: "ACCESSIBILITY_CHECK",
      routes: ["/enter"],
      viewport: "mobile",
      useFixture: false,
      useLiveEvidence: true,
      idempotencyKey: "idem-test-key-001",
      routeMetadata: [{ route: "/enter", accessibilityViolationCount: 1 }],
    };

    const first = await handlePrismUiuxRoute(
      new Request("https://example.com/api/operator/uiux/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      "/api/operator/uiux/audits",
      env,
    );
    assert.equal(first?.status, 200);
    const firstAudit = (await first!.json()) as { audit: { auditId: string } };

    const second = await handlePrismUiuxRoute(
      new Request("https://example.com/api/operator/uiux/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      "/api/operator/uiux/audits",
      env,
    );
    assert.equal(second?.status, 200);
    const secondAudit = (await second!.json()) as { duplicate?: boolean; audit: { auditId: string } };
    assert.equal(secondAudit.duplicate, true);
    assert.equal(secondAudit.audit.auditId, firstAudit.audit.auditId);

    const lookup = await handlePrismUiuxRoute(
      new Request("https://example.com/api/operator/uiux/audits/idempotency/idem-test-key-001"),
      "/api/operator/uiux/audits/idempotency/idem-test-key-001",
      env,
    );
    assert.equal(lookup?.status, 200);
    const lookupBody = (await lookup!.json()) as { audit: { auditId: string } };
    assert.equal(lookupBody.audit.auditId, firstAudit.audit.auditId);
  });

  it("allows edge-authenticated requests through gate", async () => {
    const token = await edgeToken();
    const res = await edgeAuthGate(
      new Request("https://example.com/api/operator/uiux/audits", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      "/api/operator/uiux/audits",
      { OPERATOR_SECRET: EDGE_SECRET },
    );
    assert.equal(res, null);
  });
});

describe("PRISM storage errors", () => {
  it("exposes storage error status codes", () => {
    const err = new PrismUiuxStorageError(503, "TTX_STATE storage is not configured");
    assert.equal(err.status, 503);
    assert.match(err.message, /TTX_STATE/);
  });
});
