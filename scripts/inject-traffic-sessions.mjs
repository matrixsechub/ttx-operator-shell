#!/usr/bin/env node
/**
 * Inject session funnels into the live entry surface for experimentation feedback.
 *
 * Usage:
 *   node scripts/inject-traffic-sessions.mjs [baseUrl] [sessionCount] [source] [delayMs]
 *
 * Example:
 *   node scripts/inject-traffic-sessions.mjs https://ttx-operator-shell.sogellagepul.workers.dev 150 synthetic_injection 50
 */
import { randomUUID, randomInt } from "node:crypto";

const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";
const sessionCount = Number(process.argv[3] ?? 150);
const trafficSource = process.argv[4] || "synthetic_injection";
const delayMs = Number(process.argv[5] ?? 40);
const forceMode = process.argv[6] || null;
const fallbackModes = ["CONFUSION", "FRICTION", "ENGAGED"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postUsage(payload) {
  const r = await fetch(`${base}/api/usage/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await r.json().catch(() => null);
  return { status: r.status, counted: json?.counted ?? false, reason: json?.reason ?? null };
}

async function fetchAssignment(sessionId) {
  const r = await fetch(
    `${base}/api/experimentation/assignment?sessionId=${encodeURIComponent(sessionId)}`,
    { headers: { Accept: "application/json", "Cache-Control": "no-cache" } },
  );
  if (!r.ok) return null;
  const json = await r.json().catch(() => null);
  return json?.assignedMode ?? null;
}

async function injectSession(index) {
  const sessionId = randomUUID();
  const steps = [];

  steps.push(
    await postUsage({
      event: "visit",
      sessionId,
      trafficSource,
    }),
  );

  let uiMode = forceMode || (await fetchAssignment(sessionId));
  if (!uiMode) {
    uiMode = fallbackModes[index % fallbackModes.length];
  }

  steps.push(
    await postUsage({
      event: "ui_mode_view",
      sessionId,
      uiMode,
      trafficSource,
    }),
  );

  const entryRoll = randomInt(0, 100);
  if (entryRoll < 28) {
    steps.push(
      await postUsage({
        event: "entry_click",
        sessionId,
        uiMode,
        trafficSource,
      }),
    );
  }

  const marketplaceRoll = randomInt(0, 100);
  if (marketplaceRoll < 22) {
    steps.push(
      await postUsage({
        event: "marketplace_click",
        sessionId,
        uiMode,
        trafficSource,
      }),
    );
  }

  return { sessionId, uiMode, steps };
}

const results = [];
for (let i = 0; i < sessionCount; i++) {
  results.push(await injectSession(i));
  if (delayMs > 0 && i < sessionCount - 1) {
    await sleep(delayMs);
  }
}

const countedVisits = results.filter((result) => result.steps[0]?.counted).length;
const countedModeViews = results.filter((result) => result.steps[1]?.counted).length;

console.log(
  JSON.stringify(
    {
      base,
      trafficSource,
      requestedSessions: sessionCount,
      countedVisits,
      countedModeViews,
      sample: results.slice(0, 3),
    },
    null,
    2,
  ),
);
