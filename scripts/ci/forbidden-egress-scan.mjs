#!/usr/bin/env node
/**
 * FORBIDDEN DEBUG-EGRESS SCAN
 * ---------------------------------------------------------------------------
 * A deterministic, narrowly-scoped static check for unauthorized debug egress:
 * hard-coded loopback telemetry endpoints and the debug-session instrumentation
 * that shipped with them. It keeps that class of issue — removed from
 * `src/lib/RequireAuth.tsx` and the Worker surface — from returning.
 *
 * DETECTS (per source line, each rule independent):
 *   - loopback egress URLs   http(s)://{127.0.0.1|localhost|[::1]|0.0.0.0|127.0.0.N|127.1}[:port]
 *   - loopback literals / simple split construction  127.0.0.  ·  [::1]  ·
 *     hex 0x7f000001  ·  decimal 2130706433
 *   - the debug ingest port  :7654
 *   - the debug ingest path  /ingest/
 *   - the debug session header  X-Debug-Session-Id
 *   - the debug-log marker  #region agent log
 *
 * BOUNDARY (honest): a lexical, line-based scan. It reliably catches literal
 * reintroduction, alternate loopback spellings, and *simple* split-string
 * construction (e.g. "127.0.0." + "1"), but cannot defeat determined
 * obfuscation (variable indirection, base64/atob, full runtime assembly). It
 * proves the specific indicators are absent from the scanned trees — not that
 * all telemetry is authorized.
 *
 * FAIL-CLOSED: a requested scan root that does not exist, or a file that cannot
 * be read, raises — the scan fails rather than silently passing.
 *
 * Usage: node scripts/ci/forbidden-egress-scan.mjs [dir ...]   (default: src worker)
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const DEFAULT_DIRS = ["src", "worker"];

// Directories never treated as production source: build output, dependencies,
// VCS, and intentionally-malicious lint/test fixtures + evidence artifacts.
const SKIP_DIRS = new Set(["node_modules", "dist", "dist-pearl", ".git", "pearl-fixtures", "fixtures", "__fixtures__"]);

const RULES = [
  { id: "loopback-egress", re: /https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\]|0\.0\.0\.0|127\.0\.0\.\d+|127\.1)(?::\d+)?/i, msg: "hard-coded loopback egress endpoint" },
  { id: "loopback-literal", re: /127\.0\.0\.|\[::1\]|\b0x7f000001\b|\b2130706433\b/i, msg: "loopback literal / split-string construction" },
  { id: "debug-port", re: /:7654\b/, msg: "debug ingest port" },
  { id: "ingest-path", re: /\/ingest\//, msg: "debug ingest path" },
  { id: "debug-session-header", re: /X-Debug-Session-Id/i, msg: "debug session header" },
  { id: "agent-log-marker", re: /#region agent log/i, msg: "agent-log debug block marker" },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTS.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

/**
 * Scan the given subdirs (relative to rootDir) for forbidden debug egress.
 * Throws if a requested root is missing or a file cannot be read (fail-closed).
 */
export function scanForbiddenEgress(rootDir, dirs = DEFAULT_DIRS) {
  const findings = [];
  for (const d of dirs) {
    const root = path.join(rootDir, d);
    if (!existsSync(root)) throw new Error(`forbidden-egress scan: required root missing: ${d}`);
    for (const file of walk(root)) {
      const rel = path.relative(rootDir, file);
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        for (const rule of RULES) {
          if (rule.re.test(line)) findings.push({ file: rel, rule: rule.id, line: i + 1, msg: rule.msg });
        }
      });
    }
  }
  return findings;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const dirs = process.argv.slice(2);
  const scanDirs = dirs.length ? dirs : DEFAULT_DIRS;
  let findings;
  try {
    findings = scanForbiddenEgress(REPO, scanDirs);
  } catch (err) {
    console.error(`Forbidden debug-egress scan ERROR (fail-closed): ${err.message}`);
    process.exit(2);
  }
  if (findings.length) {
    // Report file + rule + line only — never the matched payload.
    console.error(`Forbidden debug-egress scan FAILED (${findings.length}) over [${scanDirs.join(", ")}]:`);
    for (const f of findings) console.error(`  [${f.rule}] ${f.file}:${f.line} — ${f.msg}`);
    process.exit(1);
  }
  console.log(`Forbidden debug-egress scan passed: no loopback/ingest/debug-header/agent-log indicators in [${scanDirs.join(", ")}].`);
}
