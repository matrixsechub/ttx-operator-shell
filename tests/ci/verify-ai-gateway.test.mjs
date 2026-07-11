import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import {
  redactString,
  redactValue,
  runAiGatewaySmoke,
} from "../../scripts/ci/verify-ai-gateway.mjs";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("verify-ai-gateway", () => {
  it("redacts bearer tokens and jwt material", () => {
    const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.def";
    const redacted = redactString(input);
    assert.ok(!redacted.includes("eyJhbGci"));
    assert.match(redacted, /\[REDACTED\]/);
  });

  it("redacts secret keys in nested objects", () => {
    const redacted = redactValue({
      token: "abc123",
      nested: { authorization: "secret" },
      safe: "ok",
    });
    assert.equal(redacted.token, "[REDACTED]");
    assert.equal(redacted.nested.authorization, "[REDACTED]");
    assert.equal(redacted.safe, "ok");
  });

  it("fails closed on unauthenticated infer and MCP routes", async () => {
    const fetchMock = mock.fn(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/api/ai/infer")) {
        return init?.method === "POST" ? jsonResponse(401, { error: "Unauthorized" }) : jsonResponse(405, {});
      }
      if (url.endsWith("/api/ai/mcp/signal")) {
        return jsonResponse(401, { error: "Unauthorized" });
      }
      if (url.endsWith("/api/ai/usage")) return jsonResponse(401, { error: "Unauthorized" });
      if (url.endsWith("/api/council/packet")) return jsonResponse(401, { error: "Unauthorized" });
      if (url.endsWith("/api/telemetry/events")) return jsonResponse(401, { error: "Unauthorized" });
      if (url.endsWith("/api/system/state")) return jsonResponse(401, { error: "Unauthorized" });
      return jsonResponse(404, { error: "Not found" });
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const report = await runAiGatewaySmoke("https://staging.example", {
        requireAuthChecks: false,
      });
      assert.equal(report.ok, true);
      assert.equal(report.summary.mandatory_failed, 0);
      assert.equal(report.checks.find((c) => c.name === "infer_requires_auth")?.result, "PASS");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("passes authenticated governance checks with mocked fetch", async () => {
    const fetchMock = mock.fn(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      const hasAuth = Boolean(init?.headers?.Authorization);
      if (url.endsWith("/api/ai/infer")) {
        return jsonResponse(401, { error: "Unauthorized" });
      }
      if (url.endsWith("/api/ai/usage")) return jsonResponse(200, { ok: true, usage: {} });
      if (url.endsWith("/api/council/packet")) {
        return jsonResponse(200, { packet: { advisoryOnly: true } });
      }
      if (url.endsWith("/api/telemetry/events")) return jsonResponse(200, { events: [] });
      if (url.endsWith("/api/system/state")) {
        return jsonResponse(200, { state: { aiGateway: { enabled: true } } });
      }
      if (url.endsWith("/api/ai/mcp/signal")) {
        return hasAuth
          ? jsonResponse(200, { mutationApplied: false })
          : jsonResponse(401, { error: "Unauthorized" });
      }
      return jsonResponse(404, { error: "Not found" });
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const report = await runAiGatewaySmoke("https://staging.example", {
        token: "test-token",
        requireAuthChecks: true,
      });
      assert.equal(report.ok, true);
      assert.equal(report.auth_mode, "operator_bearer");
      assert.equal(report.checks.find((c) => c.name === "mcp_signal_no_mutation")?.result, "PASS");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails when unauthenticated infer is not denied", async () => {
    const fetchMock = mock.fn(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/api/ai/infer")) return jsonResponse(200, { ok: true });
      return jsonResponse(401, { error: "Unauthorized" });
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const report = await runAiGatewaySmoke("https://staging.example", {
        requireAuthChecks: false,
      });
      assert.equal(report.ok, false);
      assert.ok(report.summary.mandatory_failed > 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails when OPERATOR_BEARER_TOKEN is required but missing", async () => {
    const { spawnSync } = await import("node:child_process");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const script = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "scripts",
      "ci",
      "verify-ai-gateway.mjs",
    );
    const result = spawnSync(process.execPath, [script, "https://staging.example", "abc"], {
      env: {
        ...process.env,
        REQUIRE_OPERATOR_TOKEN: "1",
        OPERATOR_BEARER_TOKEN: "",
        MSH_OPERATOR_TOKEN: "",
      },
      encoding: "utf8",
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr ?? "", /OPERATOR_BEARER_TOKEN is required/);
  });
});
