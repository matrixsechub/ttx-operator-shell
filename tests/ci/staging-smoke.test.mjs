import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { runStagingSmoke } from "../../scripts/ci/staging-smoke.mjs";
import { validateStagingBaseUrl } from "../../scripts/lib/stagingBaseUrl.mjs";

const ALLOWED = "https://ttx-operator-shell-staging.sogellagepul.workers.dev";

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
  it("passes HTML and JSON routes with mocked fetch against allowlisted host", async () => {
    const fetchMock = mock.fn(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      assert.ok(url.startsWith(ALLOWED), `fetch must target allowlisted host: ${url}`);
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
      const report = await runStagingSmoke(ALLOWED, "abc123", {
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
      assert.equal(report.base_url, ALLOWED);
      assert.ok(fetchMock.mock.callCount() > 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails on 5xx responses for allowlisted host", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("boom", { status: 503 });
    try {
      const report = await runStagingSmoke(ALLOWED, "abc123", {
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

  it("flags unsafe redirects without following them", async () => {
    const fetchMock = mock.fn(
      async () =>
        new Response("", {
          status: 302,
          headers: { location: "https://evil.example/phish" },
        }),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      const report = await runStagingSmoke(ALLOWED, "abc123", {
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
      assert.equal(fetchMock.mock.callCount(), 1);
      const calledUrl = String(fetchMock.mock.calls[0].arguments[0]);
      assert.ok(calledUrl.startsWith(ALLOWED));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("writes evidence-compatible report shape", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => jsonResponse(200, { ok: true });
    try {
      const report = await runStagingSmoke(ALLOWED, "abc123", {
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
      assert.equal(report.base_url, ALLOWED);
      assert.ok(Array.isArray(report.checks));
      assert.ok(report.checks[0]?.duration_ms >= 0);
      assert.ok(JSON.stringify(report).includes("health"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects disallowed targets before any fetch when called as a library", async () => {
    const fetchMock = mock.fn(async () => {
      throw new Error("fetch must not be called");
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    const rejected = [
      undefined,
      null,
      "",
      "   ",
      "not-a-url",
      "http://ttx-operator-shell-staging.sogellagepul.workers.dev",
      "https://user:pass@ttx-operator-shell-staging.sogellagepul.workers.dev",
      "https://ttx-operator-shell-staging.sogellagepul.workers.dev:8443",
      "https://localhost",
      "https://127.0.0.1",
      "https://ttx-operator-shell.sogellagepul.workers.dev",
      "https://ttx-operator-shell-staging.sogellagepul.workers.dev.evil.example",
      "https://evil-ttx-operator-shell-staging.sogellagepul.workers.dev",
      "https://staging.example",
      "https://example.workers.dev",
    ];

    try {
      for (const raw of rejected) {
        await assert.rejects(
          async () => runStagingSmoke(raw, "abc123", { contracts: [], maxAttempts: 1 }),
          (err) => {
            assert.ok(err instanceof Error);
            assert.equal(typeof err.message, "string");
            assert.ok(err.message.length > 0);
            return true;
          },
        );
        // Same policy as the canonical CLI helper.
        assert.equal(validateStagingBaseUrl(raw).ok, false);
      }
      assert.equal(fetchMock.mock.callCount(), 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("accepts exact approved staging host and normalizes trailing slash", async () => {
    const fetchMock = mock.fn(async () => jsonResponse(200, { ok: true }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      const report = await runStagingSmoke(`${ALLOWED}/`, "abc123", {
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
      assert.equal(report.base_url, ALLOWED);
      assert.equal(fetchMock.mock.callCount(), 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
