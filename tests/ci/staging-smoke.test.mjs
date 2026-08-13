import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, mock } from "node:test";
import {
  buildFailureDiagnostic,
  emitFailedProbeDiagnostics,
  persistStagingSmokeReport,
  resolveStagingAccessCredentials,
  runStagingSmoke,
  sanitizeDiagnosticText,
} from "../../scripts/ci/staging-smoke.mjs";
import { validateStagingBaseUrl } from "../../scripts/lib/stagingBaseUrl.mjs";

const ALLOWED = "https://ttx-operator-shell-staging.sogellagepul.workers.dev";
const FAKE_ACCESS_ID = "test-staging-access-client-id";
const FAKE_ACCESS_SECRET = "test-staging-access-client-secret-value";

const ACCESS_ENV = {
  STAGING_ACCESS_CLIENT_ID: FAKE_ACCESS_ID,
  STAGING_ACCESS_CLIENT_SECRET: FAKE_ACCESS_SECRET,
};

function smokeOptions(overrides = {}) {
  const { env: envOverride, ...rest } = overrides;
  return {
    maxAttempts: 1,
    ...rest,
    env: { ...ACCESS_ENV, ...(envOverride ?? {}) },
  };
}

function assertAccessHeaders(init) {
  assert.ok(init && typeof init === "object", "fetch init required");
  const headers = init.headers ?? {};
  assert.equal(headers["CF-Access-Client-Id"], FAKE_ACCESS_ID);
  assert.equal(headers["CF-Access-Client-Secret"], FAKE_ACCESS_SECRET);
}

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

describe("resolveStagingAccessCredentials", () => {
  it("accepts trimmed credential env vars", () => {
    const resolved = resolveStagingAccessCredentials({
      STAGING_ACCESS_CLIENT_ID: `  ${FAKE_ACCESS_ID}  `,
      STAGING_ACCESS_CLIENT_SECRET: ` ${FAKE_ACCESS_SECRET} `,
    });
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.equal(resolved.clientId, FAKE_ACCESS_ID);
      assert.equal(resolved.clientSecret, FAKE_ACCESS_SECRET);
    }
  });

  it("fails closed when either credential is missing", () => {
    const cases = [
      {},
      { STAGING_ACCESS_CLIENT_ID: FAKE_ACCESS_ID },
      { STAGING_ACCESS_CLIENT_SECRET: FAKE_ACCESS_SECRET },
      { STAGING_ACCESS_CLIENT_ID: " ", STAGING_ACCESS_CLIENT_SECRET: FAKE_ACCESS_SECRET },
      { STAGING_ACCESS_CLIENT_ID: FAKE_ACCESS_ID, STAGING_ACCESS_CLIENT_SECRET: "" },
    ];
    for (const env of cases) {
      const resolved = resolveStagingAccessCredentials(env);
      assert.equal(resolved.ok, false);
      if (!resolved.ok) {
        assert.match(resolved.error, /Missing required Cloudflare Access credentials/);
        assert.doesNotMatch(resolved.error, new RegExp(FAKE_ACCESS_SECRET));
      }
    }
  });
});

describe("staging-smoke", () => {
  it("passes HTML and JSON routes with mocked fetch against allowlisted host", async () => {
    const fetchMock = mock.fn(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      assert.ok(url.startsWith(ALLOWED), `fetch must target allowlisted host: ${url}`);
      assertAccessHeaders(init);
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
      const report = await runStagingSmoke(
        ALLOWED,
        "abc123",
        smokeOptions({
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
        }),
      );

      assert.equal(report.summary.failed, 0);
      assert.equal(report.summary.passed + report.summary.warnings, 4);
      assert.equal(report.base_url, ALLOWED);
      assert.ok(fetchMock.mock.callCount() > 0);
      for (const call of fetchMock.mock.calls) {
        assertAccessHeaders(call.arguments[1]);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("attaches both Access headers on every smoke request", async () => {
    const fetchMock = mock.fn(async (_input, init) => {
      assertAccessHeaders(init);
      return jsonResponse(200, { ok: true });
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      await runStagingSmoke(
        ALLOWED,
        "abc123",
        smokeOptions({
          contracts: [
            { name: "a", method: "GET", path: "/api/engine/health", expectStatus: 200, contentTypeIncludes: "application/json" },
            { name: "b", method: "GET", path: "/api/engine/version", expectStatus: 200, contentTypeIncludes: "application/json" },
            { name: "c", method: "GET", path: "/api/build-info", expectStatus: 200, contentTypeIncludes: "application/json" },
          ],
        }),
      );
      assert.equal(fetchMock.mock.callCount(), 3);
      for (const call of fetchMock.mock.calls) {
        assertAccessHeaders(call.arguments[1]);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails closed before fetch when Access credentials are missing", async () => {
    const fetchMock = mock.fn(async () => {
      throw new Error("fetch must not be called");
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      await assert.rejects(
        async () =>
          runStagingSmoke(ALLOWED, "abc123", {
            env: {},
            contracts: [{ name: "health", method: "GET", path: "/api/engine/health", expectStatus: 200 }],
            maxAttempts: 1,
          }),
        (err) => {
          assert.ok(err instanceof Error);
          assert.match(err.message, /Missing required Cloudflare Access credentials/);
          assert.doesNotMatch(err.message, /CF-Access/);
          return true;
        },
      );
      assert.equal(fetchMock.mock.callCount(), 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not expose credential values in report JSON", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      assertAccessHeaders(init);
      return jsonResponse(200, { ok: true });
    };
    try {
      const report = await runStagingSmoke(
        ALLOWED,
        "abc123",
        smokeOptions({
          contracts: [
            {
              name: "health",
              method: "GET",
              path: "/api/engine/health",
              expectStatus: 200,
              contentTypeIncludes: "application/json",
            },
          ],
        }),
      );
      const serialized = JSON.stringify(report);
      assert.doesNotMatch(serialized, new RegExp(FAKE_ACCESS_ID));
      assert.doesNotMatch(serialized, new RegExp(FAKE_ACCESS_SECRET));
      assert.doesNotMatch(serialized, /CF-Access-Client-/i);
      assert.doesNotMatch(serialized, /Authorization/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("writes a report with sanitized diagnostics when probes fail", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      assertAccessHeaders(init);
      return new Response("<html>Cloudflare Access login</html>", {
        status: 302,
        headers: {
          location: `https://evil.example/callback?token=${FAKE_ACCESS_SECRET}&client_id=${FAKE_ACCESS_ID}`,
          "content-type": "text/html",
        },
      });
    };

    const dir = mkdtempSync(join(tmpdir(), "staging-smoke-"));
    const outputPath = join(dir, "staging-smoke-report.json");
    const emitted = [];
    try {
      const report = await runStagingSmoke(
        ALLOWED,
        "abc123",
        smokeOptions({
          contracts: [
            {
              name: "ecosystem_root",
              method: "GET",
              path: "/",
              expectStatus: 200,
              contentTypeIncludes: "text/html",
              htmlIncludes: ["MSHOPS.NET"],
            },
          ],
        }),
      );

      assert.equal(report.summary.failed, 1);
      assert.equal(report.checks[0].result, "FAIL");
      assert.ok(report.checks[0].diagnostic);
      assert.equal(report.checks[0].diagnostic.route, "GET /");
      assert.equal(report.checks[0].diagnostic.status, 302);
      assert.equal(report.checks[0].diagnostic.hostname, "evil.example");
      assert.match(report.checks[0].diagnostic.content_type, /text\/html/);
      assert.match(report.checks[0].diagnostic.expected, /status=200/);
      assert.equal(typeof report.checks[0].diagnostic.reason, "string");
      assert.ok(report.checks[0].diagnostic.reason.length > 0);

      persistStagingSmokeReport(report, outputPath);
      const onDisk = readFileSync(outputPath, "utf8");
      assert.ok(onDisk.includes('"failed": 1'));
      assert.ok(onDisk.includes('"diagnostic"'));

      emitFailedProbeDiagnostics(report.checks, (line) => emitted.push(String(line)));
      assert.equal(emitted.length, 1);
      assert.match(emitted[0], /^SMOKE_DIAG /);

      const combined = `${JSON.stringify(report)}\n${emitted.join("\n")}\n${onDisk}`;
      assert.doesNotMatch(combined, new RegExp(FAKE_ACCESS_ID));
      assert.doesNotMatch(combined, new RegExp(FAKE_ACCESS_SECRET));
      assert.doesNotMatch(combined, /token=/i);
      assert.doesNotMatch(combined, /CF-Access-Client-/i);
      assert.doesNotMatch(combined, /Authorization/i);
      assert.doesNotMatch(combined, /Cookie/i);
      assert.doesNotMatch(combined, /Cloudflare Access login/);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("sanitizeDiagnosticText never retains credential-shaped values", () => {
    const dirty = [
      `redirect https://login.example/start?id=${FAKE_ACCESS_ID}&secret=${FAKE_ACCESS_SECRET}`,
      `Authorization: Bearer ${FAKE_ACCESS_SECRET}`,
      `CF-Access-Client-Secret: ${FAKE_ACCESS_SECRET}`,
      `Cookie: session=${FAKE_ACCESS_ID}`,
    ].join(" | ");
    const clean = sanitizeDiagnosticText(dirty);
    assert.doesNotMatch(clean, new RegExp(FAKE_ACCESS_ID));
    assert.doesNotMatch(clean, new RegExp(FAKE_ACCESS_SECRET));
    assert.match(clean, /login\.example|\[redacted/);
    const diag = buildFailureDiagnostic({
      contract: { method: "GET", path: "/login", expectStatus: 200 },
      baseUrl: ALLOWED,
      status: 403,
      contentType: "text/html",
      location: `https://access.example/?client_secret=${FAKE_ACCESS_SECRET}`,
      notes: [dirty],
    });
    assert.equal(diag.hostname, "access.example");
    assert.doesNotMatch(JSON.stringify(diag), new RegExp(FAKE_ACCESS_SECRET));
    assert.doesNotMatch(JSON.stringify(diag), new RegExp(FAKE_ACCESS_ID));
  });

  it("fails on 5xx responses for allowlisted host", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      assertAccessHeaders(init);
      return new Response("boom", { status: 503 });
    };
    try {
      const report = await runStagingSmoke(
        ALLOWED,
        "abc123",
        smokeOptions({
          contracts: [
            {
              name: "broken",
              method: "GET",
              path: "/",
              expectStatus: 200,
            },
          ],
        }),
      );
      assert.equal(report.summary.failed, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("flags unsafe redirects without following them", async () => {
    const fetchMock = mock.fn(async (_input, init) => {
      assertAccessHeaders(init);
      return new Response("", {
        status: 302,
        headers: { location: "https://evil.example/phish" },
      });
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      const report = await runStagingSmoke(
        ALLOWED,
        "abc123",
        smokeOptions({
          contracts: [
            {
              name: "redirect",
              method: "GET",
              path: "/systems",
              expectStatus: 302,
              redirectIncludes: "/login",
            },
          ],
        }),
      );
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
    globalThis.fetch = async (_input, init) => {
      assertAccessHeaders(init);
      return jsonResponse(200, { ok: true });
    };
    try {
      const report = await runStagingSmoke(
        ALLOWED,
        "abc123",
        smokeOptions({
          contracts: [
            {
              name: "health",
              method: "GET",
              path: "/api/engine/health",
              expectStatus: 200,
              contentTypeIncludes: "application/json",
            },
          ],
        }),
      );
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
          async () => runStagingSmoke(raw, "abc123", smokeOptions({ contracts: [] })),
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
    const fetchMock = mock.fn(async (_input, init) => {
      assertAccessHeaders(init);
      return jsonResponse(200, { ok: true });
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      const report = await runStagingSmoke(
        `${ALLOWED}/`,
        "abc123",
        smokeOptions({
          contracts: [
            {
              name: "health",
              method: "GET",
              path: "/api/engine/health",
              expectStatus: 200,
              contentTypeIncludes: "application/json",
            },
          ],
        }),
      );
      assert.equal(report.base_url, ALLOWED);
      assert.equal(fetchMock.mock.callCount(), 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
