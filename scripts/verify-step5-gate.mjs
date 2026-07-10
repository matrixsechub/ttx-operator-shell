#!/usr/bin/env node
/**
 * Phase 5 deploy gate — static + optional live probes.
 * Does NOT deploy. Run after `npm run build`.
 *
 * Usage:
 *   node scripts/verify-step5-gate.mjs
 *   node scripts/verify-step5-gate.mjs --base http://127.0.0.1:8787
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const checks = [];
function pass(id, msg) {
  checks.push({ id, ok: true, msg });
}
function fail(id, msg) {
  checks.push({ id, ok: false, msg });
}

const requiredFiles = [
  "worker/edge/gate.ts",
  "worker/edge/headers.ts",
  "worker/edge/crypto.ts",
  "worker/fedgrade.ts",
  "worker/marketplaceEdge.ts",
  "wrangler.mshops-public.jsonc",
  "src/pages/ops/FedGradeOps.tsx",
  "src/pages/ops/SecurityOps.tsx",
  "src/pages/ops/DeployOps.tsx",
];

for (const rel of requiredFiles) {
  if (existsSync(join(root, rel))) pass("files", rel);
  else fail("files", `missing ${rel}`);
}

const indexSrc = readFileSync(join(root, "worker/index.ts"), "utf8");
const routerSrc = readFileSync(join(root, "src/routes/router.tsx"), "utf8");
const headersSrc = readFileSync(join(root, "worker/edge/headers.ts"), "utf8");
const gateSrc = readFileSync(join(root, "worker/edge/gate.ts"), "utf8");

if (indexSrc.includes("edgeAuthGate")) pass("integrate", "worker/index.ts imports edgeAuthGate");
else fail("integrate", "worker/index.ts missing edgeAuthGate");

if (indexSrc.includes("injectSecurityHeaders")) pass("integrate", "CSP injection on HTML assets");
else fail("integrate", "missing injectSecurityHeaders");

if (headersSrc.includes("Content-Security-Policy")) pass("csp", "CSP defined");
else fail("csp", "CSP missing");

if (headersSrc.includes("X-Frame-Options")) pass("xfo", "XFO defined");
else fail("xfo", "XFO missing");

if (gateSrc.includes("binding_mismatch")) pass("binding", "binding_mismatch behavior");
else fail("binding", "binding_mismatch missing");

for (const route of ["/ops/fedgrade", "/ops/security", "/ops/deploy"]) {
  if (routerSrc.includes(route)) pass("ops-routes", route);
  else fail("ops-routes", `router missing ${route}`);
}

const mshopsWrangler = readFileSync(join(root, "wrangler.mshops-public.jsonc"), "utf8");
if (mshopsWrangler.includes('"name": "mshops-public"')) pass("wrangler", "mshops-public config present");
else fail("wrangler", "wrangler.mshops-public.jsonc name wrong");

const baseArg = process.argv.indexOf("--base");
const base = baseArg >= 0 ? process.argv[baseArg + 1] : null;

if (base) {
  try {
    const fedgrade = await fetch(`${base}/api/fedgrade/health`);
    if (fedgrade.status === 401) pass("live", "/api/fedgrade/health returns 401 without token");
    else fail("live", `/api/fedgrade/health expected 401 got ${fedgrade.status}`);

    const integrity = await fetch(`${base}/api/marketplace/integrity`);
    if (integrity.status === 401) pass("live", "/api/marketplace/integrity returns 401 without token");
    else fail("live", `/api/marketplace/integrity expected 401 got ${integrity.status}`);

    const html = await fetch(`${base}/ops/fedgrade`);
    const csp = html.headers.get("Content-Security-Policy");
    const xfo = html.headers.get("X-Frame-Options");
    if (csp) pass("live", `/ops/fedgrade has CSP`);
    else fail("live", `/ops/fedgrade missing CSP header`);
    if (xfo === "DENY") pass("live", `/ops/fedgrade XFO DENY`);
    else fail("live", `/ops/fedgrade XFO expected DENY got ${xfo}`);
  } catch (err) {
    fail("live", `probe failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const failed = checks.filter((c) => !c.ok);
console.log("\n=== Phase 5 Gate Verification ===\n");
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} [${c.id}] ${c.msg}`);
}
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
if (failed.length > 0) {
  process.exit(1);
}
console.log("\nDEPLOY_GATE: PASS (static checks). Run with --base for live probes.");
