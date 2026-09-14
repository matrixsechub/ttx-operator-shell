// Regression scaffold for docs/security/AUTH-SESSION-REVIEW.md (Task 3).
// Passing cases lock in the containment boundaries that exist today.
// `todo` cases name gaps whose fix changes auth semantics (NEEDS_OPERATOR)
// and must not be implemented without an Operator mission.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAccessTokenOperator, handleAuthRoute } from "../worker/auth.ts";
import { enforceOperatorApiAuth } from "../worker/apiAuth.ts";
import { edgeAuthGate, handleOperatorSession } from "../worker/edge/gate.ts";

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

describe("edge bootstrap token containment (edge/gate.ts vs auth.ts)", () => {
  // Worst case for key sharing: OPERATOR_SECRET unset, so the edge gate
  // falls back to AUTH_SIGNING_KEY and both token families share one key.
  const edgeEnv = { AUTH_SIGNING_KEY };

  async function bootstrapToken(): Promise<string> {
    const response = await handleOperatorSession(
      new Request("https://example.com/api/operator/session", { method: "POST" }),
      "/api/operator/session",
      edgeEnv,
    );
    assert.ok(response);
    const body = (await response.json()) as { token: string };
    return body.token;
  }

  it("CURRENT_BEHAVIOR F1: POST /api/operator/session issues an operator-class token with no credentials", async () => {
    const token = await bootstrapToken();
    const gate = await edgeAuthGate(
      new Request("https://example.com/api/operator/ai-agent-builds", { headers: { Authorization: `Bearer ${token}` } }),
      "/api/operator/ai-agent-builds",
      edgeEnv,
    );
    assert.equal(gate, null, "edge gate admits the credential-less bootstrap token on operator-class routes");
  });

  it("bootstrap token is NOT an auth.ts operator session even when keys are shared", async () => {
    const env = await authEnv();
    const token = await bootstrapToken();
    const operator = await getAccessTokenOperator(
      new Request("https://example.com/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
      env,
    );
    assert.equal(operator, null);
  });

  it("bootstrap token does not pass enforceOperatorApiAuth on default-deny routes", async () => {
    const env = await authEnv();
    const token = await bootstrapToken();
    const blocked = await enforceOperatorApiAuth(
      new Request("https://example.com/api/security/events", { headers: { Authorization: `Bearer ${token}` } }),
      "/api/security/events",
      env as unknown as Parameters<typeof enforceOperatorApiAuth>[2],
    );
    assert.ok(blocked);
    assert.equal(blocked.status, 401);
  });

  it.todo("F1 NEEDS_OPERATOR: POST /api/operator/session should require operator credentials or be reclassified");
});
