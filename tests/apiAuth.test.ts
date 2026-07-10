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
  });

  it("denies protected operator routes by default", () => {
    assert.equal(isPublicApiRoute("/api/security/events", "GET"), false);
    assert.equal(isPublicApiRoute("/api/webhooks/events", "GET"), false);
    assert.equal(isPublicApiRoute("/api/ttx/sessions/scenarios", "GET"), false);
    assert.equal(isPublicApiRoute("/api/ttx/intelligence", "GET"), false);
    assert.equal(isPublicApiRoute("/api/system/state", "GET"), false);
    assert.equal(isPublicApiRoute("/api/system/status", "GET"), false);
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

  it("allows public routes without a token", async () => {
    const request = new Request("https://example.com/api/build-info");
    const blocked = await enforceOperatorApiAuth(request, "/api/build-info", env);
    assert.equal(blocked, null);
  });
});
