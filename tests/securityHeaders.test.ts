import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CSP,
  SPLASH_CSP,
  deploymentHeaders,
  injectSecurityHeaders,
  injectSplashSecurityHeaders,
} from "../worker/edge/headers.ts";

describe("security headers — CSP and injection invariants", () => {
  it("CSP_DENIES_FRAME_ANCESTORS_AND_DEFAULTS_SELF", () => {
    assert.match(CSP, /default-src 'self'/);
    assert.match(CSP, /frame-ancestors 'none'/);
    assert.match(CSP, /script-src 'self'/);
    assert.match(CSP, /base-uri 'self'/);
    assert.match(CSP, /form-action 'self'/);
    assert.doesNotMatch(CSP, /script-src[^;]*'unsafe-inline'/);
  });

  it("SPLASH_CSP_ALLOWS_ONLY_DOCUMENTED_EXTERNAL_ASSETS", () => {
    assert.match(SPLASH_CSP, /frame-ancestors 'none'/);
    assert.match(SPLASH_CSP, /cdn\.tailwindcss\.com/);
    assert.match(SPLASH_CSP, /fonts\.googleapis\.com/);
    assert.doesNotMatch(SPLASH_CSP, /\*/);
  });

  it("DEPLOYMENT_HEADERS_INCLUDE_FEDGRADE_BASELINE", () => {
    const headers = deploymentHeaders();
    assert.equal(headers["X-Frame-Options"], "DENY");
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
    assert.ok(headers["Content-Security-Policy-Report-Only"]);
    assert.match(headers["Content-Security-Policy-Report-Only"], /frame-ancestors 'none'/);
    assert.match(headers["Strict-Transport-Security"], /max-age=31536000/);
    assert.match(headers["Permissions-Policy"], /camera=\(\)/);
  });

  it("INJECT_SECURITY_HEADERS_APPLIES_ONLY_TO_HTML", async () => {
    const html = injectSecurityHeaders(
      new Response("<!doctype html><title>t</title>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
    );
    assert.equal(html.headers.get("Content-Security-Policy"), CSP);
    assert.equal(html.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(html.headers.get("X-Frame-Options"), "DENY");

    const json = injectSecurityHeaders(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    assert.equal(json.headers.get("Content-Security-Policy"), null);
    assert.deepEqual(await json.json(), { ok: true });
  });

  it("INJECT_SPLASH_SECURITY_HEADERS_USES_SPLASH_CSP", () => {
    const html = injectSplashSecurityHeaders(
      new Response("<!doctype html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );
    assert.equal(html.headers.get("Content-Security-Policy"), SPLASH_CSP);
    assert.equal(html.headers.get("X-Frame-Options"), "DENY");
  });

  it("INJECT_SECURITY_HEADERS_PRESERVES_STATUS_AND_BODY", async () => {
    const injected = injectSecurityHeaders(
      new Response("shell-body", {
        status: 203,
        statusText: "Non-Authoritative Information",
        headers: { "Content-Type": "text/html", "X-Custom": "keep" },
      }),
    );
    assert.equal(injected.status, 203);
    assert.equal(injected.headers.get("X-Custom"), "keep");
    assert.equal(await injected.text(), "shell-body");
  });
});
