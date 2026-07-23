import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanForbiddenEgress } from "../../scripts/ci/forbidden-egress-scan.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("forbidden debug-egress scan", () => {
  it("finds no forbidden egress in the client source tree (src/)", () => {
    const findings = scanForbiddenEgress(REPO, ["src"]);
    assert.deepEqual(findings, [], `src/ must be free of debug egress, got: ${JSON.stringify(findings)}`);
  });

  it("detects loopback endpoint + debug header in a known-bad fixture", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "egress-fix-"));
    try {
      mkdirSync(path.join(dir, "src"), { recursive: true });
      writeFileSync(
        path.join(dir, "src", "bad.ts"),
        [
          'fetch("http://127.0.0.1:7654/ingest/abc", {',
          '  headers: { "X-Debug-Session-Id": "x" },',
          "});",
        ].join("\n"),
      );
      const rules = new Set(scanForbiddenEgress(dir, ["src"]).map((f) => f.rule));
      assert.ok(rules.has("loopback-egress"), "loopback endpoint not caught");
      assert.ok(rules.has("ingest-path"), "ingest path not caught");
      assert.ok(rules.has("debug-session-header"), "debug session header not caught");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("RequireAuth performs no network request and preserves auth/redirect/loading behavior", () => {
    const src = readFileSync(path.join(REPO, "src", "lib", "RequireAuth.tsx"), "utf8");
    // no network egress of any kind
    assert.ok(!/fetch\s*\(/.test(src), "RequireAuth must not issue any fetch");
    assert.ok(!/127\.0\.0\.1|localhost|X-Debug-Session-Id|\/ingest\//.test(src), "RequireAuth must not reference debug egress");
    // behavior preserved (deterministic source-structure assertions)
    assert.ok(/Navigate\s+to="\/login"/.test(src), "unauthenticated redirect to /login must be preserved");
    assert.ok(/state=\{\{\s*from:\s*location\s*\}\}/.test(src), "redirect must preserve the `from` location state");
    assert.ok(/initializing/.test(src), "loading (initializing) branch must be preserved");
    assert.ok(/<Outlet\s*\/>/.test(src), "authenticated users must still render protected children (<Outlet/>)");
  });
});
