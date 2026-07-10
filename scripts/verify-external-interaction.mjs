#!/usr/bin/env node
/**
 * External interaction gate — session-scoped usage counters reflected in KV and system state.
 */
import { randomUUID } from "node:crypto";

const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";
const operatorCallsign = process.argv[3] || process.env.OPERATOR_CALLSIGN || "operator";
const operatorPassword = process.argv[4] || process.env.OPERATOR_PASSWORD;

async function probe(path, init = {}, authHeaders = {}) {
  const r = await fetch(`${base}${path}`, {
    redirect: "manual",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      ...authHeaders,
      ...(init.headers ?? {}),
    },
    ...init,
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    json = null;
  }
  return { status: r.status, json };
}

async function resolveAuthHeaders() {
  if (!operatorPassword) return {};
  const login = await probe("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: operatorCallsign, password: operatorPassword }),
  });
  if (!login.json?.token) {
    throw new Error(`operator login failed (status=${login.status}): ${login.json?.error ?? "no token"}`);
  }
  return { Authorization: `Bearer ${login.json.token}` };
}

const authHeaders = await resolveAuthHeaders();
const rootHtml = await fetch(`${base}/`, { headers: { Accept: "text/html" } });
const rootBody = await rootHtml.text();
const ecosystemBundle = rootBody.match(/\/assets\/ecosystem-[^"']+\.js/)?.[0];
let ecosystemJs = "";
if (ecosystemBundle) {
  ecosystemJs = await fetch(`${base}${ecosystemBundle}`).then((r) => r.text());
}

const sessionId = randomUUID();
const usagePost = await probe("/api/usage/event", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ event: "visit", sessionId }),
});
const stateRes = await probe("/api/system/state", {}, authHeaders);

const usage = stateRes.json?.state?.usage ?? usagePost.json?.usage;
const checks = {
  publicEntry: rootHtml.status === 200,
  publicUsageApi: usagePost.status === 200 && Boolean(usagePost.json?.usage),
  sessionRequired: usagePost.json?.counted === true,
  signalIntegrityValid: usage?.signalIntegrity === "VALID",
  visitsPositive: (usage?.visits ?? 0) > 0,
  clicksWithinVisits:
    (usage?.entryClicks ?? 0) <= (usage?.visits ?? 0) &&
    (usage?.marketplaceClicks ?? 0) <= (usage?.visits ?? 0),
  stateHasUsage: Boolean(stateRes.json?.state?.usage) || Boolean(usagePost.json?.usage),
  entryCtaPresent:
    ecosystemJs.includes("Enter System") || ecosystemJs.includes("Start Session"),
  marketplaceCtaPresent:
    ecosystemJs.includes("Explore Marketplace") || ecosystemJs.includes("Explore Modules"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);

console.log(
  JSON.stringify(
    {
      base,
      externalInteractionStatus: failed.length === 0 ? "active" : "incomplete",
      failed,
      usage,
      checks,
    },
    null,
    2,
  ),
);

process.exit(failed.length === 0 ? 0 : 1);
