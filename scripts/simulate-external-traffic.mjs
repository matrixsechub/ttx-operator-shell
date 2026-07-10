#!/usr/bin/env node
/**
 * Simulate external traffic — one session per simulated user with visit-first funnel.
 */
import { randomUUID } from "node:crypto";

const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";
const visitCount = Number(process.argv[3] ?? 30);

async function get(path) {
  const r = await fetch(`${base}${path}`, {
    headers: { Accept: "text/html,application/json", "Cache-Control": "no-cache" },
  });
  return { path, status: r.status };
}

async function postUsage(event, sessionId) {
  const r = await fetch(`${base}/api/usage/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, sessionId }),
  });
  const json = await r.json().catch(() => null);
  return { event, status: r.status, counted: json?.counted ?? null, usage: json?.usage ?? null };
}

async function simulateUser(index) {
  const sessionId = randomUUID();
  const phase = index % 5;
  const results = [await postUsage("visit", sessionId)];

  if (phase === 3) results.push(await postUsage("entry_click", sessionId));
  if (phase === 4) results.push(await postUsage("marketplace_click", sessionId));
  if (phase === 1) results.push(await get("/enter"));
  if (phase === 2) results.push(await get("/marketplace"));

  return results;
}

const results = [];
for (let i = 0; i < visitCount; i++) {
  results.push(...(await simulateUser(i)));
}

const probeSession = randomUUID();
const usageProbe = await fetch(`${base}/api/usage/event`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ event: "visit", sessionId: probeSession }),
});
const usageJson = await usageProbe.json().catch(() => null);

console.log(
  JSON.stringify(
    {
      base,
      simulated: results.length,
      sample: results.slice(0, 5),
      usage: usageJson?.usage ?? null,
    },
    null,
    2,
  ),
);
