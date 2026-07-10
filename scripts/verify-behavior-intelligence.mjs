#!/usr/bin/env node
/**
 * Behavior intelligence gate — usage signals drive behavioral classification and proposals.
 */
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

const res = await fetch(`${base}/api/behavior/intelligence`, {
  headers: { Accept: "application/json", "Cache-Control": "no-cache" },
});
const json = await res.json().catch(() => null);
const intelligence = json?.intelligence;

const checks = {
  endpointOk: res.status === 200 && Boolean(intelligence),
  hasMetrics:
    typeof intelligence?.metrics?.entryRate === "number" &&
    typeof intelligence?.metrics?.marketplaceRate === "number" &&
    typeof intelligence?.metrics?.dropOffRate === "number",
  hasSystemState: ["LEARNING_ACTIVE", "SIGNAL_WEAK", "NOISE", "SIGNAL_INVALID"].includes(intelligence?.systemState),
  signalIntegrityValid:
    intelligence?.systemState !== "SIGNAL_INVALID" ||
    (intelligence?.behaviorClass === null && (intelligence?.governanceProposals?.length ?? 0) === 0),
  learningProducesClass:
    intelligence?.systemState !== "LEARNING_ACTIVE" || typeof intelligence?.behaviorClass === "string",
  proposalsWhenClassified:
    intelligence?.behaviorClass === null || (intelligence?.governanceProposals?.length ?? 0) > 0,
  reportPresent: typeof json?.report === "string" && json.report.includes("BEHAVIOR_INTELLIGENCE_REPORT"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);

console.log(
  [
    json?.report ?? "# BEHAVIOR_INTELLIGENCE_REPORT\n(unavailable)",
    "",
    JSON.stringify(
      {
        base,
        behaviorIntelligenceStatus: failed.length === 0 ? "active" : "incomplete",
        failed,
        checks,
        intelligence,
      },
      null,
      2,
    ),
  ].join("\n"),
);

process.exit(failed.length === 0 ? 0 : 1);
