import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enforceOperatorApiAuth, isPublicApiRoute } from "../worker/apiAuth.ts";

describe("isPublicApiRoute", () => {
  it("allows public health and build endpoints", () => {
    assert.equal(isPublicApiRoute("/api/engine/health", "GET"), true);
    assert.equal(isPublicApiRoute("/api/engine/version", "GET"), true);
    assert.equal(isPublicApiRoute("/api/build-info", "GET"), true);
    assert.equal(isPublicApiRoute("/api/system/health", "GET"), true);
    assert.equal(isPublicApiRoute("/api/marketplace/catalog", "GET"), true);
    assert.equal(isPublicApiRoute("/api/register", "POST"), true);
    assert.equal(isPublicApiRoute("/api/register-lifecycle", "GET"), true);
    assert.equal(isPublicApiRoute("/api/service-selector", "POST"), true);
    assert.equal(isPublicApiRoute("/api/engagements/status", "GET"), true);
    assert.equal(isPublicApiRoute("/api/audit-lite/start", "POST"), true);
    assert.equal(isPublicApiRoute("/api/audit-lite/status/aud_123", "GET"), true);
    assert.equal(isPublicApiRoute("/api/audit-lite/result/aud_123", "GET"), true);
    assert.equal(isPublicApiRoute("/api/audit-lite/webhook", "POST"), true);
  });

  it("denies protected operator routes by default", () => {
    assert.equal(isPublicApiRoute("/api/security/events", "GET"), false);
    assert.equal(isPublicApiRoute("/api/webhooks/events", "GET"), false);
    assert.equal(isPublicApiRoute("/api/ttx/sessions/scenarios", "GET"), false);
    assert.equal(isPublicApiRoute("/api/ttx/intelligence", "GET"), false);
    assert.equal(isPublicApiRoute("/api/system/state", "GET"), false);
    assert.equal(isPublicApiRoute("/api/system/status", "GET"), true);
  });
});

describe("enforceOperatorApiAuth", () => {
  const env = { AUTH_SIGNING_KEY: "test-key", AUTH_REVOCATION: {} as KVNamespace };

  it("returns 401 for anonymous protected routes", async () => {
    const request = new Request("https://example.com/api/security/events");
    const blocked = await enforceOperatorApiAuth(request, "/api/security/events", env);
    assert.ok(blocked);
    assert.equal(blocked?.status, 401);
    assert.ok(blocked?.headers.get("X-Build-Commit"));
  });

  it("requires canonical auth on operator-class routes (F1 option C)", async () => {
    for (const [path, method] of [
      ["/api/operator/ai-agent-builds", "GET"],
      ["/api/wildcard", "GET"],
      ["/api/debug/anything", "GET"],
      ["/api/lifecycle/advance/run", "POST"],
    ] as const) {
      const blocked = await enforceOperatorApiAuth(new Request(`https://example.com${path}`, { method }), path, env);
      assert.ok(blocked, `${method} ${path}`);
      assert.equal(blocked.status, 401);
    }
  });

  it("leaves marketplace-class routes to the ctx-bound edge gate", async () => {
    const request = new Request("https://example.com/api/marketplace/integrity");
    assert.equal(await enforceOperatorApiAuth(request, "/api/marketplace/integrity", env), null);
  });

  it("allows public routes without a token", async () => {
    const request = new Request("https://example.com/api/build-info");
    const blocked = await enforceOperatorApiAuth(request, "/api/build-info", env);
    assert.equal(blocked, null);
  });
});
