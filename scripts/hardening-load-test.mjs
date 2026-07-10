#!/usr/bin/env node
/**
 * Load validation for 72h hardening — concurrent API probes.
 */
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";
const concurrency = Number(process.argv[3] || 20);

async function probe(path) {
  const started = Date.now();
  const r = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
  });
  let ok = r.ok;
  try {
    await r.json();
  } catch {
    ok = false;
  }
  return { path, status: r.status, ok, ms: Date.now() - started };
}

const paths = [
  "/api/system/state",
  "/api/system/health",
  "/api/telemetry/summary",
  "/api/ghost/telemetry",
  "/api/governance/state",
  "/api/marketplace/registry",
];

const tasks = Array.from({ length: concurrency }, (_, i) => probe(paths[i % paths.length]));
const results = await Promise.all(tasks);

const failures = results.filter((r) => !r.ok || r.status >= 500);
const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;

const report = {
  base,
  concurrency,
  total: results.length,
  failures: failures.length,
  p95Ms: p95,
  maxMs: latencies[latencies.length - 1] ?? 0,
  stable: failures.length === 0 && p95 < 5000,
  sample: results.slice(0, 5),
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.stable ? 0 : 1);
