import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { runStagingSmoke } from "../../scripts/ci/staging-smoke.mjs";

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function htmlResponse(status, html, headers = {}) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

describe("staging-smoke", () => {
  it("passes HTML and JSON routes with mocked fetch", async () => {
    const fetchMock = mock.fn(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/")) {
        return htmlResponse(200, "<title>Ecosystem Entry</title><body>Operator Terminal</body>");
      }
      if (url.endsWith("/api/build-info")) {
        return jsonResponse(200, { commitSha: "abc", deployEnv: "staging" });
      }
      if (url.endsWith("/api/security/events")) {
        return jsonResponse(401, { error: "Unauthorized" });
      }
      if (url.includes("__staging-smoke-missing-route__")) {
        return new Response("not found", { status: 404 });
      }
      return new Response("ok", { status: 200 });
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      const report = await runStagingSmoke("https://staging.example", "abc123", {
        contracts: [
          {
            name: "html",
            method: "GET",
            path: "/",
            expectStatus: 200,
            contentTypeIncludes: "text/html",
            htmlIncludes: ["Ecosystem Entry"],
            securityHeaders: true,
          },
          {
            name: "json",
            method: "GET",
            path: "/api/build-info",
            expectStatus: 200,
            contentTypeIncludes: "application/json",
            jsonFields: ["commitSha", "deployEnv"],
          },
          {
            name: "auth",
            method: "GET",
            path: "/api/security/events",
            expectStatus: 401,
            contentTypeIncludes: "application/json",
          },
          {
            name: "missing",
            method: "GET",
            path: "/__staging-smoke-missing-route__",
            expectStatusClass: "4xx",
          },
        ],
        maxAttempts: 1,
      });

      assert.equal(report.summary.failed, 0);
      assert.equal(report.summary.passed + report.summary.warnings, 4);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails on 5xx responses", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("boom", { status: 503 });
    try {
      const report = await runStagingSmoke("https://staging.example", "abc123", {
        contracts: [
          {
            name: "broken",
            method: "GET",
            path: "/",
            expectStatus: 200,
          },
        ],
        maxAttempts: 1,
      });
      assert.equal(report.summary.failed, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("flags unsafe redirects", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response("", {
        status: 302,
        headers: { location: "https://evil.example/phish" },
      });
    try {
      const report = await runStagingSmoke("https://staging.example", "abc123", {
        contracts: [
          {
            name: "redirect",
            method: "GET",
            path: "/systems",
            expectStatus: 302,
            redirectIncludes: "/login",
          },
        ],
        maxAttempts: 1,
      });
      assert.equal(report.summary.failed, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("writes evidence-compatible report shape", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => jsonResponse(200, { ok: true });
    try {
      const report = await runStagingSmoke("https://staging.example", "abc123", {
        contracts: [
          {
            name: "health",
            method: "GET",
            path: "/api/engine/health",
            expectStatus: 200,
            contentTypeIncludes: "application/json",
          },
        ],
        maxAttempts: 1,
      });
      assert.equal(report.schema_version, "1.0");
      assert.equal(report.environment, "staging");
      assert.ok(Array.isArray(report.checks));
      assert.ok(report.checks[0]?.duration_ms >= 0);
      assert.ok(JSON.stringify(report).includes("health"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
