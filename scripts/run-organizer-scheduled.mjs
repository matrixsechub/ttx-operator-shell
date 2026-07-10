#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const INTERVAL_MS = 72 * 60 * 60 * 1000;
const repoRoot = process.cwd();
const artifactsDir = join(repoRoot, ".artifacts");
const lastRunFile = join(artifactsDir, "organizer-last-run.json");
const reportFile = join(artifactsDir, "organizer-scheduled-report.json");
const force = process.argv.includes("--force");

mkdirSync(artifactsDir, { recursive: true });

if (!force && existsSync(lastRunFile)) {
  const { lastRunAt } = JSON.parse(readFileSync(lastRunFile, "utf8"));
  const elapsed = Date.now() - Date.parse(lastRunAt);
  if (elapsed < INTERVAL_MS) {
    const hoursLeft = ((INTERVAL_MS - elapsed) / 3_600_000).toFixed(1);
    console.log(`OrganizerAgent scheduled run skipped — next eligible run in ~${hoursLeft}h`);
    process.exit(0);
  }
}

const result = spawnSync(
  "node",
  ["--import", "tsx", "msh-ops/agents/runOrganizer.ts", "--json"],
  { cwd: repoRoot, encoding: "utf8" },
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

writeFileSync(reportFile, result.stdout, "utf8");
writeFileSync(
  lastRunFile,
  JSON.stringify({ lastRunAt: new Date().toISOString(), intervalHours: 72 }, null, 2),
  "utf8",
);

console.log(`OrganizerAgent scheduled report written to ${reportFile}`);
