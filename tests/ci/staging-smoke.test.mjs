import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, mock } from "node:test";
import { PLACEHOLDER_DESCRIPTION } from "../../scripts/lib/storefrontBundle.mjs";
import { runStagingSmoke } from "../../scripts/ci/staging-smoke.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const realFixtureHtml = readFileSync(join(root, "tests", "fixtures", "storefront-real", "index.html"), "utf8");
const placeholderHtml = readFileSync(join(root, "scripts", "fixtures", "storefront-placeholder.html"), "utf8");

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

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("staging-smoke storefront", () => {
  it("passes real storefront bundle with asset probes", async () => {
    const storefrontHtml = realFixtureHtml.replace(
      "<head>",
      '<head>\n    <meta name="mshops-surface" content="marketplace" />',
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/app/assets/index-test.js")) {
        return new Response("export {}", { status: 200, headers: { "content-type": "application/javascript" } });
      }
      if (url.endsWith("/app/assets/index-test.css")) {
        return new Response("body{}", { status: 200, headers: { "content-type": "text/css" } });
      }
      if (url.includes("/marketplace")) {
        return htmlResponse(200, storefrontHtml);
      }
      return new Response("not found", { status: 404 });
    };

    try {
      const report = await runStagingSmoke("https://staging.example", "abc123", {
        contracts: [
          {
            name: "marketplace_surface",
            method: "GET",
            path: "/marketplace",
            expectStatus: 200,
            contentTypeIncludes: "text/html",
            htmlIncludes: ["MSH OPS Storefront", 'name="mshops-surface"', 'id="root"'],
            htmlForbidden: [PLACEHOLDER_DESCRIPTION],
            validateStorefrontAssets: true,
          },
        ],
        maxAttempts: 1,
      });
      assert.equal(report.summary.failed, 0);
      assert.ok(report.checks[0]?.asset_validation?.references?.length >= 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails placeholder-only storefront", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => htmlResponse(200, placeholderHtml);
    try {
      const report = await runStagingSmoke("https://staging.example", "abc123", {
        contracts: [
          {
            name: "marketplace_surface",
            method: "GET",
            path: "/marketplace",
            expectStatus: 200,
            contentTypeIncludes: "text/html",
            htmlIncludes: ["MSH OPS Storefront"],
            htmlForbidden: [PLACEHOLDER_DESCRIPTION],
            validateStorefrontAssets: true,
          },
        ],
        maxAttempts: 1,
      });
      assert.equal(report.summary.failed, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails when referenced JS asset is missing", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/marketplace")) return htmlResponse(200, realFixtureHtml);
      return new Response("missing", { status: 404 });
    };
    try {
      const report = await runStagingSmoke("https://staging.example", "abc123", {
        contracts: [
          {
            name: "marketplace_surface",
            method: "GET",
            path: "/marketplace",
            expectStatus: 200,
            contentTypeIncludes: "text/html",
            validateStorefrontAssets: true,
          },
        ],
        maxAttempts: 1,
      });
      assert.equal(report.summary.failed, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fails on 503 storefront body", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("MSHOPS storefront shell missing", { status: 503 });
    try {
      const report = await runStagingSmoke("https://staging.example", "abc123", {
        contracts: [
          {
            name: "marketplace_surface",
            method: "GET",
            path: "/marketplace",
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
});

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
