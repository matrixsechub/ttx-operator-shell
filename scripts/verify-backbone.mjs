#!/usr/bin/env node
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function probe(path, init = {}) {
  const r = await fetch(`${base}${path}`, {
    headers: { "Cache-Control": "no-cache", Accept: "application/json" },
    ...init,
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    json = null;
  }
  return { path, status: r.status, json };
}

const governanceState = await probe("/api/governance/state");
const telemetry = await probe("/api/telemetry/summary");
const ghost = await probe("/api/ghost/telemetry");
const marketplaceRegistry = await probe("/api/marketplace/registry");
const marketplaceValidate = await probe("/api/marketplace/validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ moduleId: "digital-001", operatorId: "operator" }),
});
const authSession = await probe("/api/auth/session");

const checks = {
  governanceStateOk: governanceState.status === 200 && governanceState.json?.state?.northstar,
  governanceAxes: Array.isArray(governanceState.json?.state?.strategicAxis),
  telemetryLive: telemetry.status === 200 && telemetry.json?.summary?.updatedAt,
  ghostBridge: ghost.status === 200 && typeof ghost.json?.connected === "boolean",
  marketplaceRegistryOk: marketplaceRegistry.status === 200 && Array.isArray(marketplaceRegistry.json?.modules),
  marketplaceValidateOk: marketplaceValidate.status === 200 && marketplaceValidate.json?.valid === true,
  authSessionEndpoint: authSession.status === 401 || authSession.status === 200,
};

console.log(
  JSON.stringify(
    {
      base,
      governanceState,
      telemetry,
      ghost,
      marketplaceRegistry,
      marketplaceValidate,
      authSession,
      checks,
    },
    null,
    2,
  ),
);
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
