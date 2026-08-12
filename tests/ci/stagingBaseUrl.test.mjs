import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { validateStagingBaseUrl } from "../../scripts/lib/stagingBaseUrl.mjs";

const ALLOWED = "https://ttx-operator-shell-staging.sogellagepul.workers.dev";

describe("validateStagingBaseUrl", () => {
  it("accepts the exact allowlisted HTTPS host and normalizes trailing slash", () => {
    const withSlash = validateStagingBaseUrl(`${ALLOWED}/`);
    assert.equal(withSlash.ok, true);
    if (withSlash.ok) assert.equal(withSlash.baseUrl, ALLOWED);

    const withoutSlash = validateStagingBaseUrl(ALLOWED);
    assert.equal(withoutSlash.ok, true);
    if (withoutSlash.ok) assert.equal(withoutSlash.baseUrl, ALLOWED);
  });

  it("rejects missing, HTTP, lookalikes, wildcards, userinfo, ports, query, fragment, and path", () => {
    const cases = [
      undefined,
      null,
      "",
      "   ",
      "http://ttx-operator-shell-staging.sogellagepul.workers.dev",
      "https://ttx-operator-shell.sogellagepul.workers.dev",
      "https://ttx-operator-shell-staging.sogellagepul.workers.dev.evil.example",
      "https://evil-ttx-operator-shell-staging.sogellagepul.workers.dev",
      "https://*.sogellagepul.workers.dev",
      "https://user:pass@ttx-operator-shell-staging.sogellagepul.workers.dev",
      "https://ttx-operator-shell-staging.sogellagepul.workers.dev:8443",
      "https://ttx-operator-shell-staging.sogellagepul.workers.dev?x=1",
      "https://ttx-operator-shell-staging.sogellagepul.workers.dev#frag",
      "https://ttx-operator-shell-staging.sogellagepul.workers.dev/api",
      "not-a-url",
    ];

    for (const raw of cases) {
      const result = validateStagingBaseUrl(raw);
      assert.equal(result.ok, false, `expected rejection for ${String(raw)}`);
      if (!result.ok) assert.equal(typeof result.error, "string");
    }
  });

  it("allows default HTTPS port 443 explicitly", () => {
    const result = validateStagingBaseUrl(`${ALLOWED}:443`);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.baseUrl, ALLOWED);
  });

  it("does not perform network I/O", () => {
    const fetchMock = mock.fn(async () => {
      throw new Error("fetch must not be called");
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      validateStagingBaseUrl(ALLOWED);
      validateStagingBaseUrl("https://evil.example");
      assert.equal(fetchMock.mock.callCount(), 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
