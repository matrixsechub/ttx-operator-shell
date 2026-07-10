#!/usr/bin/env node
/**
 * Ghost signal pipeline gate — depth fields must be numeric and KV-backed.
 */
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function probe(path) {
  const r = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
  });
  const json = await r.json();
  return { status: r.status, json };
}

const ghost = await probe("/api/ghost/telemetry");
const state = await probe("/api/system/state");
const depth = ghost.json?.depth ?? {};
const fields = ["volatility", "spectralDensity", "oversoulDepth", "agentActivationCount"];

const checks = {
  connected: ghost.json?.connected === true,
  derivedFlag: typeof ghost.json?.derived === "boolean",
  allDepthNumeric: fields.every((f) => typeof depth[f] === "number" && Number.isFinite(depth[f])),
  freshnessNumeric: typeof ghost.json?.signalFreshnessMs === "number",
  stateDepthNumeric: fields.every((f) => typeof state.json?.state?.ghost?.depth?.[f] === "number"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);

const report = {
  base,
  pipelineStatus: failed.length === 0 ? "ACTIVE" : "INCOMPLETE",
  derived: ghost.json?.derived ?? null,
  depth,
  signalFreshnessMs: ghost.json?.signalFreshnessMs ?? null,
  checks,
  failed,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
