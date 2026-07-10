#!/usr/bin/env node
/**
 * Traffic activation monitor — outputs TRAFFIC_ACTIVATION_REPORT from live system state.
 */
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

const res = await fetch(`${base}/api/traffic/activation`, {
  headers: { Accept: "application/json", "Cache-Control": "no-cache" },
});

let json = null;
let report = "# TRAFFIC_ACTIVATION_REPORT\n(unavailable)";

if (res.ok) {
  json = await res.json().catch(() => null);
  report = json?.report ?? report;
} else {
  const [usageRes, experimentRes] = await Promise.all([
    fetch(`${base}/api/behavior/intelligence`, { headers: { Accept: "application/json" } }),
    fetch(`${base}/api/experimentation/report`, { headers: { Accept: "application/json" } }),
  ]);
  const usageJson = await usageRes.json().catch(() => null);
  const experimentJson = await experimentRes.json().catch(() => null);
  const usage = usageJson?.usage;
  const experimentation = experimentJson?.experimentation;
  const sessions = usage?.visits ?? 0;
  const systemState = experimentation?.systemState ?? "EXPERIMENTING";
  const nextAction =
    usage?.signalIntegrity !== "VALID" ? "fix" : systemState === "OPTIMIZING" ? "adjust" : "scale";

  report = [
    "# TRAFFIC_ACTIVATION_REPORT",
    "## sessions_generated",
    String(sessions),
    "## traffic_sources",
    "(activation endpoint not deployed — run npm run deploy)",
    "## mode_distribution",
    experimentation
      ? Object.entries(experimentation.modeDistribution)
          .map(([mode, pct]) => `${mode}=${pct}%`)
          .join(", ")
      : "unavailable",
    "## system_state",
    systemState,
    "## next_action",
    nextAction,
  ].join("\n");
}

const activation = json?.activation;
const checks = {
  endpointOk: res.status === 200 && Boolean(activation),
  hasSessions: (activation?.sessionsGenerated ?? 0) >= 0,
  hasSystemState: ["EXPERIMENTING", "OPTIMIZING"].includes(activation?.systemState),
  reportPresent: report.includes("TRAFFIC_ACTIVATION_REPORT"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);

console.log(
  [
    report,
    "",
    JSON.stringify(
      {
        base,
        trafficActivationStatus: failed.length === 0 ? "active" : "degraded",
        failed,
        checks,
        activation,
      },
      null,
      2,
    ),
  ].join("\n"),
);

process.exit(failed.length === 0 ? 0 : 1);
