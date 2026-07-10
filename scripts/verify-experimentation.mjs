#!/usr/bin/env node
/**
 * Experimentation gate — mode rotation, winner detection, and report output.
 */
const base = process.argv[2] || "https://ttx-operator-shell.sogellagepul.workers.dev";

const res = await fetch(`${base}/api/experimentation/report`, {
  headers: { Accept: "application/json", "Cache-Control": "no-cache" },
});
const json = await res.json().catch(() => null);
const experimentation = json?.experimentation;

const checks = {
  endpointOk: res.status === 200 && Boolean(experimentation),
  hasDistribution:
    typeof experimentation?.modeDistribution?.CONFUSION === "number" &&
    typeof experimentation?.modeDistribution?.FRICTION === "number",
  hasPerformance:
    typeof experimentation?.performanceByMode?.ENGAGED?.marketplaceRate === "number" &&
    typeof experimentation?.performanceByMode?.CONFUSION?.dropOffRate === "number",
  hasSystemState: ["EXPERIMENTING", "OPTIMIZING"].includes(experimentation?.systemState),
  reportPresent: typeof json?.report === "string" && json.report.includes("EXPERIMENTATION_REPORT"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);

console.log(
  [
    json?.report ?? "# EXPERIMENTATION_REPORT\n(unavailable)",
    "",
    JSON.stringify(
      {
        base,
        experimentationStatus: failed.length === 0 ? "active" : "incomplete",
        failed,
        checks,
        experimentation,
      },
      null,
      2,
    ),
  ].join("\n"),
);

process.exit(failed.length === 0 ? 0 : 1);
