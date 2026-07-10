#!/usr/bin/env node
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function probe(path, init = {}) {
  const r = await fetch(`${base}${path}`, {
    redirect: "manual",
    headers: { "Cache-Control": "no-cache", Accept: "application/json" },
    ...init,
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    json = null;
  }
  return { path, status: r.status, location: r.headers.get("location"), json };
}

const systemState = await probe("/api/system/state");
const ghost = await probe("/api/ghost/telemetry");
const systemsHtml = await probe("/systems");
const opsApi = await probe("/api/ops/fedgrade");

const checks = {
  systemStateLive:
    systemState.status === 200 &&
    Boolean(systemState.json?.state?.governance?.northstar) &&
    Boolean(systemState.json?.state?.telemetry) &&
    Boolean(systemState.json?.state?.marketplace) &&
    Boolean(systemState.json?.state?.ghost),
  ghostConnected: ghost.json?.connected === true,
  sessionEnforcementHtml: systemsHtml.status === 302 && systemsHtml.location?.includes("/login"),
  sessionEnforcementApi: opsApi.status === 401 && opsApi.json?.code === "SESSION_REQUIRED",
  governancePolicy: Boolean(systemState.json?.state?.policy?.marketplaceValidationRequired),
  systemModeBeta: systemState.json?.state?.systemMode === "OPERATOR_BETA",
};

console.log(JSON.stringify({ base, systemState, ghost, systemsHtml, opsApi, checks }, null, 2));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
