import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanForbiddenEgress } from "../../scripts/ci/forbidden-egress-scan.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Write files into a throwaway root under a named subdir; returns the root. */
function fixtureRoot(sub, files) {
  const root = mkdtempSync(path.join(tmpdir(), "egress-"));
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(root, sub, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

describe("forbidden debug-egress scan", () => {
  it("(1) the five remediated Worker files are clean", () => {
    const findings = scanForbiddenEgress(REPO, ["worker"]);
    const targeted = findings.filter((f) =>
      ["worker/edge/gate.ts", "worker/index.ts", "worker/operator.ts", "worker/storefront.ts", "worker/surfaceSpa.ts"].includes(f.file),
    );
    assert.deepEqual(targeted, [], `remediated worker files must be clean, got: ${JSON.stringify(targeted)}`);
  });

  it("(2) the full src/ and worker/ source boundaries are clean", () => {
    const findings = scanForbiddenEgress(REPO, ["src", "worker"]);
    assert.deepEqual(findings, [], `src/ + worker/ must be clean, got: ${JSON.stringify(findings)}`);
  });

  it("(3) detects each prohibited indicator independently", () => {
    const root = fixtureRoot("src", {
      "bad.ts": [
        'fetch("http://127.0.0.1:7654/ingest/abc", {',
        '  headers: { "X-Debug-Session-Id": "x" },',
        "});",
        "// #region agent log",
      ].join("\n"),
    });
    try {
      const rules = new Set(scanForbiddenEgress(root, ["src"]).map((f) => f.rule));
      for (const id of ["loopback-egress", "loopback-literal", "debug-port", "ingest-path", "debug-session-header", "agent-log-marker"]) {
        assert.ok(rules.has(id), `rule ${id} not triggered`);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("(4) rejects a realistic known-bad Worker fixture", () => {
    const root = fixtureRoot("worker", {
      "edge/bad.ts": [
        "export function gate() {",
        "  // #region agent log",
        '  fetch("http://127.0.0.1:7654/ingest/c1420f4a", {',
        '    method: "POST",',
        '    headers: { "X-Debug-Session-Id": "14ea90" },',
        "  }).catch(() => {});",
        "  // #endregion",
        "}",
      ].join("\n"),
    });
    try {
      assert.ok(scanForbiddenEgress(root, ["worker"]).length > 0, "known-bad worker fixture must be rejected");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("(5) rejects alternate loopback literals ([::1], 0.0.0.0, 127.1, hex, decimal)", () => {
    for (const url of [
      'fetch("http://[::1]:7654/x");',
      'fetch("http://0.0.0.0:7654/x");',
      'fetch("http://127.1:7654/x");',
      "const h = 0x7f000001;",
      "const d = 2130706433;",
    ]) {
      const root = fixtureRoot("src", { "a.ts": url });
      try {
        assert.ok(scanForbiddenEgress(root, ["src"]).length > 0, `alternate loopback not caught: ${url}`);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it("(6) rejects simple split-string loopback construction", () => {
    const root = fixtureRoot("src", { "a.ts": 'const host = "127.0.0." + "1";' });
    try {
      assert.ok(scanForbiddenEgress(root, ["src"]).length > 0, "split-string loopback not caught");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("(7) fails closed when a required scan root is missing", () => {
    const root = fixtureRoot("src", { "a.ts": "export const x = 1;" }); // no worker/ dir
    try {
      assert.throws(() => scanForbiddenEgress(root, ["worker"]), /required root missing/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("(8) permits authorized first-party /api/* requests", () => {
    const root = fixtureRoot("src", {
      "ok.ts": [
        'void fetch("/api/flow/event", { method: "POST", body: "{}" });',
        'const r = fetch("/api/usage/event");',
      ].join("\n"),
    });
    try {
      assert.deepEqual(scanForbiddenEgress(root, ["src"]), [], "first-party /api/* must be permitted");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("(RequireAuth) issues no network request and preserves auth/redirect/loading behavior", () => {
    const src = readFileSync(path.join(REPO, "src", "lib", "RequireAuth.tsx"), "utf8");
    assert.ok(!/fetch\s*\(/.test(src), "RequireAuth must not issue any fetch");
    assert.ok(!/127\.0\.0\.1|localhost|X-Debug-Session-Id|\/ingest\//.test(src), "RequireAuth must not reference debug egress");
    assert.ok(/window\.location\.replace\(`\/login\?from=/.test(src), "unauthenticated redirect to /login preserved");
    assert.ok(/encodeURIComponent\(returnPath\)/.test(src), "redirect preserves the return path");
    assert.ok(/initializing/.test(src), "loading (initializing) branch preserved");
    assert.ok(/<Outlet\s*\/>/.test(src), "authenticated users still render <Outlet/>");
  });
});
