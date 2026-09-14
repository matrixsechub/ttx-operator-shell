// Regression scaffold for docs/security/AUTH-SESSION-REVIEW.md (Task 3).
// Passing cases lock in the containment boundaries that exist today.
// `todo` cases name gaps whose fix changes auth semantics (NEEDS_OPERATOR)
// and must not be implemented without an Operator mission.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAccessTokenOperator, handleAuthRoute } from "../worker/auth.ts";
import { enforceOperatorApiAuth } from "../worker/apiAuth.ts";
import { readFileSync } from "node:fs";
import { edgeAuthGate } from "../worker/edge/gate.ts";
import { signToken } from "../worker/edge/crypto.ts";
import { classifyRoute } from "../worker/edge/routeClass.ts";

const AUTH_SIGNING_KEY = "review-auth-signing-key-32-chars!";
const CALLSIGN = "operator";
const PASSWORD = "correct horse battery staple";
const encoder = new TextEncoder();

function createMockKv(): KVNamespace {
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

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

// Low iteration count keeps the suite fast; format matches scripts/hash-password.mjs.
async function makeStoredHash(password: string, iterations = 1_000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256),
  );
  return `pbkdf2$${iterations}$${b64url(salt)}$${b64url(bits)}`;
}

type AuthRouteEnv = Parameters<typeof handleAuthRoute>[2];

async function authEnv(): Promise<AuthRouteEnv> {
  return {
    OPERATOR_CALLSIGN: CALLSIGN,
    OPERATOR_PASSWORD_HASH: await makeStoredHash(PASSWORD),
    AUTH_SIGNING_KEY,
    AUTH_REVOCATION: createMockKv(),
    SECURITY_EVENTS: createMockKv(),
  } as unknown as AuthRouteEnv;
}

function jsonRequest(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`https://example.com${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function login(env: AuthRouteEnv): Promise<{ token: string; refreshToken: string }> {
  const response = await handleAuthRoute(
    jsonRequest("/api/auth/login", { username: CALLSIGN, password: PASSWORD }),
    "/api/auth/login",
    env,
  );
  assert.ok(response);
  assert.equal(response.status, 200);
  return (await response.json()) as { token: string; refreshToken: string };
}

async function refresh(env: AuthRouteEnv, refreshToken: string): Promise<Response> {
  const response = await handleAuthRoute(
    new Request("https://example.com/api/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    }),
    "/api/auth/refresh",
    env,
  );
  assert.ok(response);
  return response;
}

describe("operator auth — token lifecycle (auth.ts)", () => {
  it("login issues an access token that getAccessTokenOperator accepts", async () => {
    const env = await authEnv();
    const { token } = await login(env);
    const operator = await getAccessTokenOperator(
      new Request("https://example.com/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
      env,
    );
    assert.ok(operator);
    assert.equal(operator.handle, CALLSIGN);
  });

  it("refresh token is single-use: a second presentation is rejected", async () => {
    const env = await authEnv();
    const { refreshToken } = await login(env);
    assert.equal((await refresh(env, refreshToken)).status, 200);
    assert.equal((await refresh(env, refreshToken)).status, 401);
  });

  it("logout revokes the presented refresh token", async () => {
    const env = await authEnv();
    const { refreshToken } = await login(env);
    const logout = await handleAuthRoute(jsonRequest("/api/auth/logout", { refreshToken }), "/api/auth/logout", env);
    assert.equal(logout?.status, 200);
    assert.equal((await refresh(env, refreshToken)).status, 401);
  });

  it("a refresh token is not accepted where an access token is required", async () => {
    const env = await authEnv();
    const { refreshToken } = await login(env);
    const operator = await getAccessTokenOperator(
      new Request("https://example.com/api/auth/me", { headers: { Authorization: `Bearer ${refreshToken}` } }),
      env,
    );
    assert.equal(operator, null);
  });

  it.todo("F7 NEEDS_OPERATOR: access token should be rejected after logout (no access-token revocation today)");
  it.todo("F9 NEEDS_OPERATOR: verifyPassword should enforce a PBKDF2 iteration floor (accepts iterations >= 1 today)");
});

describe("F1 remediation — bootstrap removal and canonical auth on operator-class routes", () => {
  // Shared-key worst case: OPERATOR_SECRET unset, edge gate falls back to AUTH_SIGNING_KEY.
  const sharedKeyEdgeEnv = { AUTH_SIGNING_KEY };
  // Distinct-secret case (the F5 recommendation).
  const distinctEdgeEnv = { OPERATOR_SECRET: "distinct-edge-secret-32-chars!!!", AUTH_SIGNING_KEY };

  // A System B token as the removed route used to mint it (or as /api/operator/auth
  // still mints it), simulating a leaked or legacy bearer.
  async function legacySystemBToken(secret = AUTH_SIGNING_KEY): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return signToken(secret, { sub: "operator", iat: now, exp: now + 3600 });
  }

  function bearer(path: string, token: string | null, method = "GET"): Request {
    return new Request(`https://example.com${path}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  it("F1-A: the credential-less bootstrap route no longer exists", async () => {
    const gateSource = readFileSync(new URL("../worker/edge/gate.ts", import.meta.url), "utf8");
    const indexSource = readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
    assert.doesNotMatch(gateSource, /handleOperatorSession/);
    assert.doesNotMatch(indexSource, /handleOperatorSession/);
    assert.equal(classifyRoute("/api/operator/session", "POST"), "operator");
    const blocked = await edgeAuthGate(bearer("/api/operator/session", null, "POST"), "/api/operator/session", sharedKeyEdgeEnv);
    assert.ok(blocked);
    assert.equal(blocked.status, 401);
  });

  it("F1-C: a System B token passes the edge gate under a shared key but is stopped by canonical auth", async () => {
    const env = await authEnv();
    const token = await legacySystemBToken();
    assert.equal(await edgeAuthGate(bearer("/api/operator/ai-agent-builds", token), "/api/operator/ai-agent-builds", sharedKeyEdgeEnv), null);
    const blocked = await enforceOperatorApiAuth(
      bearer("/api/operator/ai-agent-builds", token),
      "/api/operator/ai-agent-builds",
      env as unknown as Parameters<typeof enforceOperatorApiAuth>[2],
    );
    assert.ok(blocked);
    assert.equal(blocked.status, 401);
  });

  it("F1-C: proxied operator-class paths require canonical auth (anonymous and System B)", async () => {
    const env = await authEnv();
    const token = await legacySystemBToken();
    const cases: Array<[string, string]> = [
      ["/api/debug/anything", "GET"],
      ["/api/audit/anything", "GET"],
      ["/api/lifecycle/advance/run", "POST"],
      ["/api/marketplace/audit", "GET"],
      ["/api/engagements/anything", "GET"],
      ["/api/wildcard/scan", "POST"],
      ["/api/fedgrade/health", "GET"],
    ];
    for (const [path, method] of cases) {
      for (const presented of [null, token]) {
        const blocked = await enforceOperatorApiAuth(
          bearer(path, presented, method),
          path,
          env as unknown as Parameters<typeof enforceOperatorApiAuth>[2],
        );
        assert.ok(blocked, `${method} ${path} with ${presented ? "System B token" : "no token"} must be blocked`);
        assert.equal(blocked.status, 401);
      }
    }
  });

  it("System B token is NOT an auth.ts operator session even when keys are shared", async () => {
    const env = await authEnv();
    const token = await legacySystemBToken();
    assert.equal(await getAccessTokenOperator(bearer("/api/auth/me", token), env), null);
  });

  it("System B token does not pass enforceOperatorApiAuth on default-deny routes", async () => {
    const env = await authEnv();
    const token = await legacySystemBToken();
    const blocked = await enforceOperatorApiAuth(
      bearer("/api/security/events", token),
      "/api/security/events",
      env as unknown as Parameters<typeof enforceOperatorApiAuth>[2],
    );
    assert.ok(blocked);
    assert.equal(blocked.status, 401);
  });

  it("valid Operator flow preserved: canonical access token passes both gates, shared or distinct secrets", async () => {
    const env = await authEnv();
    const { token } = await login(env);
    for (const edgeEnv of [sharedKeyEdgeEnv, distinctEdgeEnv]) {
      assert.equal(await edgeAuthGate(bearer("/api/operator/ai-agent-builds", token), "/api/operator/ai-agent-builds", edgeEnv), null);
    }
    assert.equal(
      await enforceOperatorApiAuth(
        bearer("/api/operator/ai-agent-builds", token),
        "/api/operator/ai-agent-builds",
        env as unknown as Parameters<typeof enforceOperatorApiAuth>[2],
      ),
      null,
    );
  });

  it("marketplace-class routes are unchanged: edge gate still rejects a System B operator token without ctx binding", async () => {
    const token = await legacySystemBToken();
    const blocked = await edgeAuthGate(bearer("/api/marketplace/integrity", token), "/api/marketplace/integrity", sharedKeyEdgeEnv);
    assert.ok(blocked);
    assert.equal(blocked.status, 403);
  });
});
