#!/usr/bin/env node
/**
 * FORBIDDEN DEBUG-EGRESS SCAN
 * ---------------------------------------------------------------------------
 * A deterministic, narrowly-scoped static check for unauthorized debug egress:
 * hard-coded loopback telemetry endpoints and the debug-session instrumentation
 * that shipped with them. It exists to keep the class of issue removed from
 * `src/lib/RequireAuth.tsx` from returning.
 *
 * DETECTS (per source line):
 *   - loopback egress URLs      http://127.0.0.1[:port] / http://localhost[:port]
 *   - the debug ingest path     /ingest/
 *   - the debug session header   X-Debug-Session-Id
 *   - the debug-log marker       #region agent log
 *
 * Scope is a caller argument. The gating test scans `src/` (the client/auth
 * surface). Passing additional dirs (e.g. `worker`) produces a repository-wide
 * report. Boundary: this is a lexical scan — it proves these specific
 * indicators are absent from the scanned tree, not that all telemetry is
 * authorized.
 *
 * Usage: node scripts/ci/forbidden-egress-scan.mjs [dir ...]   (default: src)
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

const RULES = [
  { id: "loopback-egress", re: /https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/, msg: "hard-coded loopback egress endpoint" },
  { id: "ingest-path", re: /\/ingest\//, msg: "debug ingest path" },
  { id: "debug-session-header", re: /X-Debug-Session-Id/i, msg: "debug session header" },
  { id: "agent-log-marker", re: /#region agent log/i, msg: "agent-log debug block marker" },
];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "dist-pearl" || name === ".git") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTS.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

/** Scan the given subdirs (relative to rootDir) for forbidden debug egress. */
export function scanForbiddenEgress(rootDir, dirs = ["src"]) {
  const findings = [];
  for (const d of dirs) {
    for (const file of walk(path.join(rootDir, d))) {
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
  const scanDirs = dirs.length ? dirs : ["src"];
  const findings = scanForbiddenEgress(REPO, scanDirs);
  if (findings.length) {
    console.error(`Forbidden debug-egress scan FAILED (${findings.length}) over [${scanDirs.join(", ")}]:`);
    for (const f of findings) console.error(`  [${f.rule}] ${f.file}:${f.line} — ${f.msg}`);
    process.exit(1);
  }
  console.log(`Forbidden debug-egress scan passed: no loopback/ingest/debug-header/agent-log markers in [${scanDirs.join(", ")}].`);
}
