#!/usr/bin/env node
/**
 * Policy Response Engine gate — signal states tighten effective governance policy.
 *
 * Protected routes require operator auth. Set OPERATOR_CALLSIGN + OPERATOR_PASSWORD
 * (or pass username/password as argv[3]/argv[4]) before probing production.
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
    throw new Error(
      `operator login failed (status=${login.status}): ${login.json?.error ?? "no token"}`,
    );
  }
  return { Authorization: `Bearer ${login.json.token}` };
}

const authHeaders = await resolveAuthHeaders();
const stateRes = await probe("/api/system/state", {}, authHeaders);
const state = stateRes.json?.state;
const wildcard = await probe(
  "/api/ttx/local-scenarios/import",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "policy-response-gate" }),
  },
  authHeaders,
);

const signalStates = state?.signalStates ?? [];
const hasHighRisk = signalStates.includes("HIGH_RISK");
const volatility = state?.ghost?.depth?.volatility ?? 0;

const checks = {
  operatorAuth: stateRes.status !== 401 || Boolean(operatorPassword),
  stateHasSignalStates: Array.isArray(state?.signalStates),
  stateHasPolicyAdjustments: Array.isArray(state?.policyAdjustments),
  stateHasPolicyBaseline: Boolean(state?.policyBaseline),
  effectivePolicyMode: typeof state?.policy?.mode === "string",
  highRiskWhenVolatile: volatility > 80 ? hasHighRisk : true,
  restrictiveWhenHighRisk: hasHighRisk ? state?.policy?.mode === "RESTRICTIVE" : true,
  wildcardBlockedUnderTightPolicy: wildcard.status === 403 && wildcard.json?.code === "GOVERNANCE_WILDCARD_BLOCKED",
  adjustmentsWhenSignals: signalStates.length > 0 ? (state?.policyAdjustments?.length ?? 0) > 0 : true,
  stateHasProposals: Array.isArray(state?.proposals),
  proposalsWhenVolatile: volatility > 80 ? (state?.proposals?.length ?? 0) > 0 : true,
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);

const report = {
  base,
  authenticated: Boolean(authHeaders.Authorization),
  policyResponseStatus: failed.length === 0 ? "active" : "incomplete",
  failed,
  signalStates,
  policy: state?.policy ?? null,
  policyAdjustments: state?.policyAdjustments ?? [],
  proposals: state?.proposals ?? [],
  volatility,
  checks,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
