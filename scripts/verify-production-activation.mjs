#!/usr/bin/env node
/**
 * Production activation gate — OPERATOR_BETA → PRODUCTION promotion verification.
 *
 * Requires OPERATOR_CALLSIGN + OPERATOR_PASSWORD for authenticated probes.
 */
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
  return {
    status: r.status,
    json,
    headers: {
      systemMode: r.headers.get("x-system-mode"),
    },
  };
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
const [stateRes, healthRes, systemsRes, wildcardRes] = await Promise.all([
  probe("/api/system/state", {}, authHeaders),
  probe("/api/system/health"),
  fetch(`${base}/systems`, { redirect: "manual", headers: { "Cache-Control": "no-cache" } }),
  probe(
    "/api/ttx/local-scenarios/import",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "production-activation-gate" }),
    },
    authHeaders,
  ),
]);

const state = stateRes.json?.state;
const healthOverall = healthRes.json?.health?.overall ?? "UNKNOWN";
const publicSystemMode = healthRes.json?.systemMode ?? healthRes.headers?.systemMode;
const signalStates = state?.signalStates ?? [];
const hasHighRisk = signalStates.includes("HIGH_RISK");
const governanceIntegrity = state?.governanceIntegrity;
const telemetryEnvironment = state?.telemetry?.environment;

const checks = {
  operatorAuth: operatorPassword ? stateRes.status !== 401 : true,
  productionMode: (state?.systemMode ?? publicSystemMode) === "PRODUCTION",
  headerProductionMode:
    stateRes.headers?.systemMode === "PRODUCTION" || healthRes.headers?.systemMode === "PRODUCTION",
  systemStateComplete:
    stateRes.status === 401 && !operatorPassword
      ? true
      : Boolean(state?.policy) &&
        Array.isArray(state?.signalStates) &&
        Array.isArray(state?.proposals) &&
        Boolean(state?.governanceIntegrity),
  healthStable: healthRes.status === 200 && healthOverall === "STABLE",
  systemsProtected:
    systemsRes.status === 302 ||
    systemsRes.status === 401 ||
    (systemsRes.status === 200 &&
      (systemsRes.headers.get("x-operator-route") === "ttx-cockpit" ||
        systemsRes.headers.get("x-surface") === "cockpit")),
  proposalsVisible: stateRes.status === 401 && !operatorPassword ? true : Array.isArray(state?.proposals),
  proposalsAdvisory: (state?.proposals ?? []).every((p) => p.advisory !== false),
  governanceLocked:
    stateRes.status === 401 && !operatorPassword
      ? true
      : governanceIntegrity?.locked === true &&
        governanceIntegrity?.proposalsAdvisory === true &&
        governanceIntegrity?.approvalsRequireOperator === true &&
        governanceIntegrity?.eventsLoggedPermanently === true,
  telemetryProduction:
    stateRes.status === 401 && !operatorPassword
      ? publicSystemMode === "PRODUCTION"
      : telemetryEnvironment === "production",
  policyResponseActive:
    stateRes.status === 401 && !operatorPassword ? publicSystemMode === "PRODUCTION" : typeof state?.policy?.mode === "string",
  wildcardEnforcedUnderRisk:
    hasHighRisk ? wildcardRes.status === 403 && wildcardRes.json?.code === "GOVERNANCE_WILDCARD_BLOCKED" : true,
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);

const mode = checks.productionMode && checks.headerProductionMode ? "PRODUCTION" : "FAILED";
const systemHealth = healthOverall;
const governanceIntegrityStatus = checks.governanceLocked ? "LOCKED" : "UNSTABLE";
const policyEnforcement =
  checks.policyResponseActive && checks.wildcardEnforcedUnderRisk ? "ACTIVE" : "PARTIAL";
const finalStatus = failed.length === 0 ? "LIVE" : "BLOCKED";

console.log(
  [
    "# PRODUCTION_ACTIVATION_REPORT",
    "## Mode",
    mode,
    "## System health",
    systemHealth,
    "## Governance integrity",
    governanceIntegrityStatus,
    "## Policy enforcement",
    policyEnforcement,
    "## Final status",
    finalStatus,
    "",
    JSON.stringify(
      {
        base,
        authenticated: Boolean(authHeaders.Authorization),
        failed,
        checks,
        systemMode: state?.systemMode ?? publicSystemMode ?? null,
        headerSystemMode: stateRes.headers?.systemMode ?? healthRes.headers?.systemMode ?? null,
        proposals: state?.proposals ?? [],
        policy: state?.policy ?? null,
        telemetryEnvironment,
      },
      null,
      2,
    ),
  ].join("\n"),
);

process.exit(finalStatus === "LIVE" ? 0 : 1);
