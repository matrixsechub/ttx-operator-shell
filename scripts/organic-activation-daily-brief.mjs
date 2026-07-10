#!/usr/bin/env node
const base = process.argv[2] || process.env.ACTIVATION_BASE_URL || "https://ttx-operator-shell.sogellagepul.workers.dev";
const token = process.env.OPERATOR_TOKEN;
const headers = { Accept: "application/json" };
if (token) headers.Authorization = `Bearer ${token}`;
const res = await fetch(`${base}/api/operator/activation/overview`, { headers });
if (!res.ok) {
  const pub = await fetch(`${base}/api/traffic/activation`, { headers: { Accept: "application/json" } });
  const pubJson = await pub.json().catch(() => ({}));
  console.log(pubJson.report ?? JSON.stringify(pubJson, null, 2));
  process.exit(pub.ok ? 0 : 1);
}
const json = await res.json();
const o = json.overview;
const lines = [
  "# ORGANIC_ACTIVATION_DAILY_BRIEF",
  `generatedAt: ${o.updatedAt}`,
  `qualifiedOrganic: ${o.progress.qualifiedOrganicSessions}`,
  `confidence: ${o.progress.confidence}`,
  `promotionWinner: ${o.progress.promotionEligibleWinner ?? "BLOCKED"}`,
  `blockers: ${o.progress.blockers.join(", ") || "(none)"}`,
  `safeMode: ${o.safeMode.active}`,
  `campaigns: ${o.campaigns.length}`,
  `queueTasks: ${o.todayQueue.length}`,
];
console.log(lines.join("\n"));
