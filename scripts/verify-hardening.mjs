#!/usr/bin/env node
/**
 * 72h hardening gate — extended telemetry, health, ghost depth, session events.
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

const health = await probeJson("/api/system/health");
const telemetry = await probeJson("/api/telemetry/summary");
const ghost = await probeJson("/api/ghost/telemetry");
const systemState = await probeJson("/api/system/state");
const opsApi = await probeJson("/api/ops/fedgrade");

const summary = telemetry.json?.summary;
const healthPayload = health.json?.health;
const ghostPayload = ghost.json;
const depthFields = ["volatility", "spectralDensity", "oversoulDepth", "agentActivationCount"];
const sessionEvents = summary?.sessionEventLog?.map((e) => e.event) ?? [];

const checks = {
  healthEndpoint: health.status === 200 && Boolean(healthPayload?.overall),
  healthSubsystems:
    Boolean(healthPayload?.subsystems?.governance) &&
    Boolean(healthPayload?.subsystems?.session) &&
    Boolean(healthPayload?.subsystems?.ghost) &&
    Boolean(healthPayload?.subsystems?.kv),
  extendedTelemetry:
    typeof summary?.errorCount === "number" &&
    Array.isArray(summary?.routeLatency) &&
    Array.isArray(summary?.governanceEvents),
  ghostDepth:
    ghostPayload?.depth &&
    depthFields.every((f) => typeof ghostPayload.depth[f] === "number" && Number.isFinite(ghostPayload.depth[f])),
  ghostDerived: typeof ghostPayload?.derived === "boolean",
  ghostFreshness: typeof ghostPayload?.signalFreshnessMs === "number" || ghostPayload?.signalFreshnessMs === null,
  sessionRejectTelemetry: sessionEvents.includes("session_reject") || opsApi.status === 401,
  sessionEventTypes: ["session_create", "session_validate", "session_reject", "session_denied", "session_invalid"].some(
    (e) => sessionEvents.includes(e),
  ),
  systemStateGovernance:
    systemState.status === 200 && Boolean(systemState.json?.state?.governance?.northstar?.statement),
  ghostConnected: ghostPayload?.connected === true,
};

const failedChecks = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);

const report = {
  base,
  hardeningStatus: failedChecks.length === 0 ? "ready" : "incomplete",
  failedChecks,
  health: {
    overall: healthPayload?.overall ?? null,
    failureCount: healthPayload?.recentFailures?.length ?? 0,
  },
  telemetry: {
    errorCount: summary?.errorCount ?? null,
    routeLatencyPaths: summary?.routeLatency?.length ?? 0,
    governanceEvents: summary?.governanceEventCount ?? 0,
    sessionEventSample: sessionEvents.slice(-5),
  },
  ghost: {
    connected: ghostPayload?.connected ?? false,
    depth: ghostPayload?.depth ?? null,
    signalFreshnessMs: ghostPayload?.signalFreshnessMs ?? null,
  },
  checks,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failedChecks.length === 0 ? 0 : 1);
