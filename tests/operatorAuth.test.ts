import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enforceOperatorApiAuth } from "../worker/apiAuth.ts";
import { edgeAuthGate, handleOperatorSession } from "../worker/edge/gate.ts";
import { classifyRoute } from "../worker/edge/routeClass.ts";
import { signToken } from "../worker/edge/crypto.ts";
import { handleWildcardRoute } from "../worker/wildcardAdvancement.ts";

const EDGE_SECRET = "test-edge-secret-key-32chars!";
const AUTH_SIGNING_KEY = "test-auth-signing-key-32chars!!";

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

async function signAuthAccessToken(
  secret: string,
  operator: { id: string; handle: string } = { id: "operator", handle: "operator" },
): Promise<string> {
  const payload = {
    ...operator,
    type: "access" as const,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(data));
  return `${data}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

function edgeEnv() {
  return {
    OPERATOR_SECRET: EDGE_SECRET,
    MARKETPLACE_SECRET: "test-marketplace-secret-32chars!",
    AUTH_SIGNING_KEY,
    OPERATOR_PASSWORD: "test-password",
    OPERATOR_USERNAME: "operator",
  };
}

function apiAuthEnv() {
  return {
    AUTH_SIGNING_KEY,
    AUTH_REVOCATION: createMockKv(),
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function operatorSessionRequest(credentials?: { username: string; password: string }): Request {
  return new Request("https://example.com/api/operator/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials ?? {}),
  });
}

describe("classifyRoute", () => {
  it("marks wildcard and operator routes as operator-protected", () => {
    assert.equal(classifyRoute("/api/operator/service-intake", "GET"), "operator");
    assert.equal(classifyRoute("/api/wildcard", "GET"), "operator");
    assert.equal(classifyRoute("/api/wildcard/scan", "POST"), "operator");
    assert.equal(classifyRoute("/api/operator/session", "POST"), "public");
  });
});

describe("operator session bootstrap", () => {
  it("rejects anonymous token issuance", async () => {
    const response = await handleOperatorSession(
      operatorSessionRequest(),
      "/api/operator/session",
      edgeEnv(),
    );
    assert.ok(response);
    assert.equal(response.status, 401);
  });

  it("rejects invalid credentials", async () => {
    const response = await handleOperatorSession(
      operatorSessionRequest({ username: "operator", password: "wrong" }),
      "/api/operator/session",
      edgeEnv(),
    );
    assert.ok(response);
    assert.equal(response.status, 401);
  });

  it("issues a scoped edge token only after valid credentials", async () => {
    const response = await handleOperatorSession(
      operatorSessionRequest({ username: "operator", password: "test-password" }),
      "/api/operator/session",
      edgeEnv(),
    );
    assert.ok(response);
    assert.equal(response.status, 200);
    const body = await readJson(response);
    const token = String(body.operator_token || body.token);
    assert.ok(token.length > 20);

    const gate = await edgeAuthGate(
      new Request("https://example.com/api/wildcard", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      "/api/wildcard",
      edgeEnv(),
    );
    assert.equal(gate, null);

    const health = await handleWildcardRoute(
      new Request("https://example.com/api/wildcard", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      "/api/wildcard",
    );
    assert.ok(health);
    assert.equal(health.status, 200);
  });
});

describe("edgeAuthGate — operator routes", () => {
  it("rejects missing bearer tokens", async () => {
    const blocked = await edgeAuthGate(
      new Request("https://example.com/api/wildcard"),
      "/api/wildcard",
      edgeEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked.status, 401);
  });

  it("rejects invalid bearer tokens", async () => {
    const blocked = await edgeAuthGate(
      new Request("https://example.com/api/wildcard", {
        headers: { Authorization: "Bearer not-a-valid-token" },
      }),
      "/api/wildcard",
      edgeEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked.status, 403);
  });

  it("rejects legacy operator tokens without type, audience, scope, and jti", async () => {
    const now = Math.floor(Date.now() / 1000);
    const legacyToken = await signToken(EDGE_SECRET, { sub: "operator", iat: now, exp: now + 3600 });
    const blocked = await edgeAuthGate(
      new Request("https://example.com/api/wildcard", {
        headers: { Authorization: `Bearer ${legacyToken}` },
      }),
      "/api/wildcard",
      edgeEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked.status, 403);
    const body = await readJson(blocked);
    assert.equal(body.reason, "operator_token_scope_invalid");
  });

  it("does not accept an auth.ts access token as an edge operator token", async () => {
    const accessToken = await signAuthAccessToken(AUTH_SIGNING_KEY);
    const blocked = await edgeAuthGate(
      new Request("https://example.com/api/wildcard", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      "/api/wildcard",
      edgeEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked.status, 403);
  });
});

describe("enforceOperatorApiAuth", () => {
  it("rejects missing bearer token on protected API routes", async () => {
    const blocked = await enforceOperatorApiAuth(
      new Request("https://example.com/api/security/events"),
      "/api/security/events",
      apiAuthEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked.status, 401);
    const body = await readJson(blocked);
    assert.equal(body.code, "OPERATOR_AUTH_REQUIRED");
  });

  it("allows a valid typed auth access token", async () => {
    const token = await signAuthAccessToken(AUTH_SIGNING_KEY);
    const allowed = await enforceOperatorApiAuth(
      new Request("https://example.com/api/security/events", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      "/api/security/events",
      apiAuthEnv(),
    );
    assert.equal(allowed, null);
  });
});
