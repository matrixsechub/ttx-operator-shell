import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { enforceOperatorApiAuth } from "../worker/apiAuth.ts";
import { enforceCockpitSession, isCockpitProtectedPath } from "../worker/kernel.ts";
import { resolveHtmlSurface, surfaceShellPath } from "../worker/surfaceRegistry.ts";

function memoryKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async () => ({ keys: [], list_complete: true, cacheStatus: null }),
    getWithMetadata: async () => ({ value: null, metadata: null, cacheStatus: null }),
  } as unknown as KVNamespace;
}

function telemetryEnv() {
  return {
    AUTH_SIGNING_KEY: "test-key",
    AUTH_REVOCATION: memoryKv(),
    TTX_STATE: memoryKv(),
    DEPLOY_ENV: "staging",
  };
}

describe("cockpit session boundary", () => {
  it("PUBLIC_HTML_NOT_SESSION_GATED", async () => {
    assert.equal(isCockpitProtectedPath("/"), false);
    assert.equal(isCockpitProtectedPath("/login"), false);
    assert.equal(isCockpitProtectedPath("/marketplace"), false);
    const blocked = await enforceCockpitSession(
      new Request("https://example.com/"),
      telemetryEnv() as never,
      "/",
    );
    assert.equal(blocked, null);
  });

  it("COCKPIT_HTML_NOT_SERVER_SESSION_GATED", async () => {
    for (const path of ["/systems", "/ops", "/operator", "/dashboard", "/ttx", "/status"]) {
      assert.equal(isCockpitProtectedPath(path), false);
      const blocked = await enforceCockpitSession(
        new Request(`https://example.com${path}`),
        telemetryEnv() as never,
        path,
      );
      assert.equal(blocked, null);
    }
  });

  it("UNAUTHENTICATED_COCKPIT_DOCUMENT_SERVES_SPA", () => {
    assert.equal(resolveHtmlSurface("/dashboard"), "cockpit");
    assert.equal(resolveHtmlSurface("/systems"), "cockpit");
    assert.equal(surfaceShellPath("cockpit"), "/operator-shell.html");
    assert.equal(isCockpitProtectedPath("/dashboard"), false);
  });

  it("CLIENT_AUTH_REDIRECT_PRESERVED", () => {
    const source = readFileSync(new URL("../src/lib/RequireAuth.tsx", import.meta.url), "utf8");
    // Remote-wins SPA navigation: window.location.replace with return path.
    assert.match(source, /window\.location\.replace\(`\/login\?from=/);
    assert.doesNotMatch(source, /127\.0\.0\.1:7654/);
    assert.doesNotMatch(source, /Response\.redirect/);
  });

  it("UNAUTHENTICATED_COCKPIT_API_RETURNS_JSON_401", async () => {
    const blocked = await enforceCockpitSession(
      new Request("https://example.com/api/ops/status"),
      telemetryEnv() as never,
      "/api/ops/status",
    );
    assert.ok(blocked);
    assert.equal(blocked.status, 401);
    assert.equal(blocked.headers.get("content-type")?.includes("application/json"), true);
    const body = (await blocked.json()) as { code?: string };
    assert.equal(body.code, "SESSION_REQUIRED");
  });

  it("API_OPS_SESSION_ENFORCEMENT_PRESERVED", () => {
    assert.equal(isCockpitProtectedPath("/api/ops"), true);
    assert.equal(isCockpitProtectedPath("/api/ops/status"), true);
    assert.equal(isCockpitProtectedPath("/api/ops/agents"), true);
    assert.equal(isCockpitProtectedPath("/api/system/state"), false);
    assert.equal(isCockpitProtectedPath("/api/marketplace/catalog"), false);
  });

  it("AUTHENTICATED_COCKPIT_API_REACHES_HANDLER", async () => {
    // Non-/api/ops cockpit-adjacent APIs are not session-classified here;
    // session gate returns null so downstream handlers can run.
    const blocked = await enforceCockpitSession(
      new Request("https://example.com/api/system/state", {
        headers: { Authorization: "Bearer not-a-real-token" },
      }),
      telemetryEnv() as never,
      "/api/system/state",
    );
    assert.equal(blocked, null);
  });

  it("SERVER_SESSION_GATE_NEVER_RETURNS_HTML_LOGIN_REDIRECT", async () => {
    const paths = ["/", "/dashboard", "/api/ops/status", "/api/system/state"];
    for (const path of paths) {
      const blocked = await enforceCockpitSession(
        new Request(`https://example.com${path}`),
        telemetryEnv() as never,
        path,
      );
      if (!blocked) continue;
      assert.notEqual(blocked.status, 302);
      assert.equal(blocked.headers.get("location"), null);
      const ct = blocked.headers.get("content-type") ?? "";
      assert.match(ct, /application\/json/);
    }
    const kernelSource = readFileSync(new URL("../worker/kernel.ts", import.meta.url), "utf8");
    assert.doesNotMatch(kernelSource, /Response\.redirect\([^\)]*\/login/);
    assert.doesNotMatch(kernelSource, /COCKPIT_HTML_PREFIXES/);
  });

  it("OPERATOR_API_UNAUTHENTICATED_DENIED", async () => {
    const env = { AUTH_SIGNING_KEY: "test-key", AUTH_REVOCATION: memoryKv() };
    const blocked = await enforceOperatorApiAuth(
      new Request("https://example.com/api/security/events"),
      "/api/security/events",
      env,
    );
    assert.ok(blocked);
    assert.equal(blocked.status, 401);
  });

  it("GOVERNANCE_MUTATION_UNAUTHENTICATED_DENIED", async () => {
    const env = { AUTH_SIGNING_KEY: "test-key", AUTH_REVOCATION: memoryKv() };
    const blocked = await enforceOperatorApiAuth(
      new Request("https://example.com/api/governance/proposals", { method: "POST" }),
      "/api/governance/proposals",
      env,
    );
    assert.ok(blocked);
    assert.equal(blocked.status, 401);
  });

  it("NO_SERVER_REDIRECT_LOOP", async () => {
    const htmlBlocked = await enforceCockpitSession(
      new Request("https://example.com/login"),
      telemetryEnv() as never,
      "/login",
    );
    assert.equal(htmlBlocked, null);
    const apiBlocked = await enforceCockpitSession(
      new Request("https://example.com/api/ops/status"),
      telemetryEnv() as never,
      "/api/ops/status",
    );
    assert.ok(apiBlocked);
    assert.equal(apiBlocked.status, 401);
    assert.equal(apiBlocked.headers.get("location"), null);
  });
});
