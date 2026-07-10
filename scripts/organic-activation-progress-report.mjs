#!/usr/bin/env node
const base = process.argv[2] || process.env.ACTIVATION_BASE_URL || "https://ttx-operator-shell.sogellagepul.workers.dev";
const res = await fetch(`${base}/api/traffic/activation`, { headers: { Accept: "application/json" } });
const json = await res.json().catch(() => ({}));
const a = json.activation;
if (!a) {
  console.error("activation snapshot unavailable");
  process.exit(1);
}
const report = [
  "# ORGANIC_ACTIVATION_PROGRESS",
  `sessions: ${a.sessionsGenerated}`,
  `qualifiedOrganic: ${a.qualifiedOrganicSessions ?? 0}`,
  `organicSources: ${(a.trafficSources ?? []).join(", ") || "(none)"}`,
  `winningMode: ${a.winningMode ?? "UNRESOLVED"}`,
  `promotionEligibleWinner: ${a.promotionEligibleWinner ?? "BLOCKED"}`,
  `confidenceBlockers: ${(a.confidenceBlockers ?? []).join(", ") || "(none)"}`,
  `signalIntegrity: ${a.signalIntegrity}`,
  `nextAction: ${a.nextAction}`,
].join("\n");
console.log(report);
console.log("\n---\n");
console.log(json.report ?? "");
