#!/usr/bin/env node
/**
 * PEARL BUNDLE PROOF (F1 closure)
 * ---------------------------------------------------------------------------
 * Deterministic assertion over a built `dist/` that the Pearl pilot ships as a
 * DISTINCT lazy chunk reachable from the cockpit graph and is NOT eagerly
 * absorbed into an entry chunk. Codifies the manual F1 dist inspection.
 *
 * Proves:
 *   1. at least one distinct `PearlPilotRoute-*.js` chunk is emitted;
 *   2. it is imported (reachable), and only by the cockpit chunk (the chunk
 *      that carries the cockpit router / the `pearl-pilot` route path);
 *   3. the pilot's own logic (its disabled-state string) appears ONLY in the
 *      pilot chunk — not inlined into any entry/cockpit chunk.
 *
 * FAIL-CLOSED: throws if the dist directory is absent.
 * Usage: node scripts/ci/pearl-bundle-proof.mjs [distDir]   (default: dist)
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PILOT_MARKER = "Pearl pilot is not enabled";

function walkJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walkJs(full, out);
    else if (name.endsWith(".js")) out.push(full);
  }
  return out;
}

export function proveBundle(distDir) {
  if (!existsSync(distDir)) throw new Error(`bundle-proof: dist directory not found: ${distDir}`);
  const js = walkJs(distDir);
  const findings = [];

  const pilotChunks = js.filter((f) => /^PearlPilotRoute-[\w-]+\.js$/.test(path.basename(f)));
  if (pilotChunks.length < 1) findings.push("no distinct PearlPilotRoute-*.js chunk emitted");

  const pilotNames = pilotChunks.map((f) => path.basename(f));
  const others = js.filter((f) => !pilotChunks.includes(f));

  const importers = others.filter((f) => {
    const t = readFileSync(f, "utf8");
    return pilotNames.some((n) => t.includes(n));
  });
  if (pilotChunks.length && importers.length < 1) findings.push("pilot chunk is orphaned (no importer references it)");

  // A valid importer is the cockpit chunk: filename `cockpit-*.js` OR it carries the route path.
  const badImporters = importers.filter((f) => {
    const isCockpit = /^cockpit-[\w-]+\.js$/.test(path.basename(f)) || readFileSync(f, "utf8").includes("pearl-pilot");
    return !isCockpit;
  });
  if (badImporters.length) findings.push(`pilot imported by non-cockpit chunk(s): ${badImporters.map((f) => path.basename(f)).join(", ")}`);

  // Not eagerly absorbed: the pilot's disabled-state string must live only in the pilot chunk.
  const leaked = others.filter((f) => readFileSync(f, "utf8").includes(PILOT_MARKER));
  if (leaked.length) findings.push(`pilot logic inlined into non-pilot chunk(s): ${leaked.map((f) => path.basename(f)).join(", ")}`);

  return { ok: findings.length === 0, pilotChunks: pilotNames, importers: importers.map((f) => path.basename(f)), findings };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = path.resolve(process.argv[2] ?? path.join(REPO, "dist"));
  let res;
  try {
    res = proveBundle(dist);
  } catch (err) {
    console.error(`Pearl bundle proof ERROR (fail-closed): ${err.message}`);
    process.exit(2);
  }
  if (!res.ok) {
    console.error(`Pearl bundle proof FAILED over ${dist}:`);
    for (const f of res.findings) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`Pearl bundle proof passed: distinct pilot chunk (${res.pilotChunks.join(", ")}) imported by cockpit chunk (${res.importers.join(", ")}); not eagerly absorbed.`);
}
