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

async function createEdgeOperatorToken(secret: string = EDGE_SECRET): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return signToken(secret, { sub: "operator", iat: now, exp: now + 3600 });
}

function edgeEnv() {
  return {
    OPERATOR_SECRET: EDGE_SECRET,
    AUTH_SIGNING_KEY: AUTH_SIGNING_KEY,
    OPERATOR_PASSWORD: "test-password",
    OPERATOR_USERNAME: "operator",
  };
}

function apiAuthEnv() {
  return {
    AUTH_SIGNING_KEY: AUTH_SIGNING_KEY,
    AUTH_REVOCATION: createMockKv(),
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("classifyRoute", () => {
  it("marks wildcard and operator routes as operator-protected", () => {
    assert.equal(classifyRoute("/api/operator/service-intake", "GET"), "operator");
    assert.equal(classifyRoute("/api/wildcard", "GET"), "operator");
    assert.equal(classifyRoute("/api/wildcard/scan", "POST"), "operator");
    assert.equal(classifyRoute("/api/operator/session", "POST"), "public");
  });
});

describe("edgeAuthGate — operator routes", () => {
  it("rejects missing bearer token on /api/operator/*", async () => {
    const blocked = await edgeAuthGate(
      new Request("https://example.com/api/operator/service-intake"),
      "/api/operator/service-intake",
      edgeEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked?.status, 401);
    const body = await readJson(blocked!);
    assert.equal(body.error, "authentication required");
    assert.ok(typeof body.hint === "string");
  });

  it("rejects missing bearer token on GET /api/wildcard", async () => {
    const blocked = await edgeAuthGate(
      new Request("https://example.com/api/wildcard"),
      "/api/wildcard",
      edgeEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked?.status, 401);
    const body = await readJson(blocked!);
    assert.equal(body.error, "authentication required");
  });

  it("rejects missing bearer token on POST /api/wildcard/scan", async () => {
    const blocked = await edgeAuthGate(
      new Request("https://example.com/api/wildcard/scan", { method: "POST" }),
      "/api/wildcard/scan",
      edgeEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked?.status, 401);
    const body = await readJson(blocked!);
    assert.equal(body.error, "authentication required");
  });

  it("rejects invalid bearer token on operator routes", async () => {
    const blocked = await edgeAuthGate(
      new Request("https://example.com/api/wildcard", {
        headers: { Authorization: "Bearer not-a-valid-token" },
      }),
      "/api/wildcard",
      edgeEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked?.status, 403);
    const body = await readJson(blocked!);
    assert.equal(body.error, "forbidden");
  });

  it("rejects malformed Authorization header (no Bearer prefix)", async () => {
    const token = await createEdgeOperatorToken();
    const blocked = await edgeAuthGate(
      new Request("https://example.com/api/wildcard", {
        headers: { Authorization: token },
      }),
      "/api/wildcard",
      edgeEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked?.status, 401);
  });

  it("allows valid edge token from POST /api/operator/session", async () => {
    const sessionResponse = await handleOperatorSession(
      new Request("https://example.com/api/operator/session", { method: "POST" }),
      "/api/operator/session",
      edgeEnv(),
    );
    assert.ok(sessionResponse);
    assert.equal(sessionResponse?.status, 200);
    const sessionBody = await readJson(sessionResponse!);
    const token = String(sessionBody.operator_token || sessionBody.token);
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
    assert.equal(health?.status, 200);
    const healthBody = await readJson(health!);
    assert.equal(healthBody.agent, "WildcardAdvancementAgent");
  });
});

describe("enforceOperatorApiAuth — security routes", () => {
  it("rejects missing bearer token on /api/security/events", async () => {
    const blocked = await enforceOperatorApiAuth(
      new Request("https://example.com/api/security/events"),
      "/api/security/events",
      apiAuthEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked?.status, 401);
    const body = await readJson(blocked!);
    assert.equal(body.error, "Operator authentication required");
    assert.equal(body.code, "OPERATOR_AUTH_REQUIRED");
  });

  it("allows valid auth.ts access token on /api/security/events", async () => {
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

  it("rejects invalid bearer token on security routes", async () => {
    const blocked = await enforceOperatorApiAuth(
      new Request("https://example.com/api/security/events", {
        headers: { Authorization: "Bearer invalid.jwt.token" },
      }),
      "/api/security/events",
      apiAuthEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked?.status, 401);
    const body = await readJson(blocked!);
    assert.equal(body.code, "OPERATOR_AUTH_REQUIRED");
  });

  it("rejects malformed Authorization header on security routes", async () => {
    const token = await signAuthAccessToken(AUTH_SIGNING_KEY);
    const blocked = await enforceOperatorApiAuth(
      new Request("https://example.com/api/security/events", {
        headers: { Authorization: token },
      }),
      "/api/security/events",
      apiAuthEnv(),
    );
    assert.ok(blocked);
    assert.equal(blocked?.status, 401);
  });
});

describe("handleWildcardRoute — scan lifecycle", () => {
  it("returns wildcard_scan_v2 lifecycle object on POST /api/wildcard/scan", async () => {
    const response = await handleWildcardRoute(
      new Request("https://example.com/api/wildcard/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ include_site_map: true }),
      }),
      "/api/wildcard/scan",
    );
    assert.ok(response);
    assert.equal(response?.status, 200);
    const body = await readJson(response!);
    assert.equal(body.schema, "wildcard_scan_v2");
    assert.equal(body.agent, "WildcardAdvancementAgent");
    assert.ok(Array.isArray(body.proposals));
    assert.ok(typeof body.summary === "object");
  });
});
