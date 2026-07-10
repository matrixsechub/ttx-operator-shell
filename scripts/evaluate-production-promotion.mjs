#!/usr/bin/env node
/**
 * Production promotion evaluation — ghost, session stress, governance, resilience probes.
 */
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

async function probeJson(path, init = {}) {
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
  return { path, status: r.status, json };
}

// Phase A — Ghost intelligence
const ghost = await probeJson("/api/ghost/telemetry");
const systemState = await probeJson("/api/system/state");
const health = await probeJson("/api/system/health");

const depth = ghost.json?.depth ?? {};
const stateGhost = systemState.json?.state?.ghost ?? {};
const depthFields = ["volatility", "spectralDensity", "oversoulDepth", "agentActivationCount"];
const populatedDepth = depthFields.filter(
  (f) => typeof depth[f] === "number" && Number.isFinite(depth[f]) && depth[f] > 0,
);
const ghostIntelligence =
  populatedDepth.length === 4
    ? "ACTIVE"
    : populatedDepth.length > 0
      ? "PARTIAL"
      : "INACTIVE";

// Phase B — Session stress (concurrent unauthenticated + protected probes)
const SESSION_CONCURRENCY = 50;
const sessionTasks = Array.from({ length: SESSION_CONCURRENCY }, (_, i) =>
  i % 3 === 0
    ? probeJson("/api/ops/fedgrade")
    : i % 3 === 1
      ? probeJson("/api/system/state")
      : fetch(`${base}/systems`, { redirect: "manual" }).then(async (r) => ({
          path: "/systems",
          status: r.status,
          json: { location: r.headers.get("location") },
        })),
);
const sessionResults = await Promise.all(sessionTasks);
const unauthorizedOps = sessionResults.filter((r) => r.path === "/api/ops/fedgrade");
const opsAllBlocked = unauthorizedOps.every((r) => r.status === 401);
const systemsRedirects = sessionResults.filter((r) => r.path === "/systems");
const systemsAllRedirect = systemsRedirects.every((r) => r.status === 302);

// Phase C — Governance loop
const govStateBefore = await probeJson("/api/governance/state");
const telemetryBefore = await probeJson("/api/telemetry/summary");
const wildcardProbe = await probeJson("/api/ttx/local-scenarios/import", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "promotion-gate-test" }),
});
const telemetryAfter = await probeJson("/api/telemetry/summary");
const govEventsBefore = telemetryBefore.json?.summary?.governanceEventCount ?? 0;
const govEventsAfter = telemetryAfter.json?.summary?.governanceEventCount ?? 0;
const policy = systemState.json?.state?.policy;
const governanceLoopActive =
  wildcardProbe.status === 403 &&
  wildcardProbe.json?.code === "GOVERNANCE_WILDCARD_BLOCKED" &&
  Boolean(policy?.wildcardFeaturesEnabled === false) &&
  govEventsAfter >= govEventsBefore;

// Phase E — Resilience signals from health
const healthOverall = health.json?.health?.overall ?? "UNKNOWN";
const subsystems = health.json?.health?.subsystems ?? {};
const failureResilience =
  health.status === 200 &&
  healthOverall !== "CRITICAL" &&
  Boolean(subsystems.governance) &&
  Boolean(subsystems.kv)
    ? "STRONG"
    : healthOverall === "DEGRADED"
      ? "MODERATE"
      : "WEAK";

const report = {
  base,
  evaluatedAt: new Date().toISOString(),
  ghost: {
    intelligence: ghostIntelligence,
    connected: ghost.json?.connected ?? false,
    depth,
    stateIncludesGhost: Boolean(stateGhost?.connected),
    engineSignalsKeys: stateGhost?.engineSignals ? Object.keys(stateGhost.engineSignals) : [],
    signalFreshnessMs: ghost.json?.signalFreshnessMs ?? null,
  },
  session: {
    concurrency: SESSION_CONCURRENCY,
    opsAllBlocked,
    systemsAllRedirect,
    ops401Count: unauthorizedOps.filter((r) => r.status === 401).length,
    systems302Count: systemsRedirects.filter((r) => r.status === 302).length,
    resilience: opsAllBlocked && systemsAllRedirect ? "STABLE" : "UNSTABLE",
  },
  governance: {
    loop: governanceLoopActive ? "ACTIVE" : "PASSIVE",
    policy,
    wildcardBlocked: wildcardProbe.status === 403,
    governanceEventCount: govEventsAfter,
    mandateCount: systemState.json?.state?.governance?.mandateRegistry?.length ?? 0,
  },
  health: {
    overall: healthOverall,
    subsystems,
    recentFailures: health.json?.health?.recentFailures?.length ?? 0,
    failureResilience,
  },
  promotion: {
    ghostIntelligence,
    sessionResilience: opsAllBlocked && systemsAllRedirect ? "STABLE" : "UNSTABLE",
    governanceLoop: governanceLoopActive ? "ACTIVE" : "PASSIVE",
    systemDependencyModel: "FRAGMENTED",
    failureResilience,
    decision: "HOLD_IN_BETA",
    blockers: [],
  },
};

if (ghostIntelligence === "INACTIVE") report.promotion.blockers.push("ghost_depth_fields_null");
if (!opsAllBlocked || !systemsAllRedirect) report.promotion.blockers.push("session_stress_failed");
if (!governanceLoopActive) report.promotion.blockers.push("governance_loop_incomplete");
report.promotion.blockers.push("ui_not_unified_on_system_state");

const canPromote =
  ghostIntelligence !== "INACTIVE" &&
  report.session.resilience === "STABLE" &&
  report.governance.loop === "ACTIVE" &&
  report.promotion.systemDependencyModel === "UNIFIED" &&
  failureResilience === "STRONG";

if (canPromote) {
  report.promotion.decision = "PROMOTE_TO_PRODUCTION";
  report.promotion.blockers = [];
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.promotion.decision === "PROMOTE_TO_PRODUCTION" ? 0 : 1);
