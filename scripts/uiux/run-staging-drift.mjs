#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeFixtureDrift } from "./staging/fixtureDrift.ts";
import { resolveStagingTarget } from "./staging/targetPolicy.ts";

const runId = process.argv[2] ?? process.env.PRISM_STAGING_RUN_ID;
if (!runId) {
  console.error("Usage: uiux:staging:drift <runId>");
  process.exit(1);
}

const artifactRoot = join(process.cwd(), "artifacts", "uiux", "staging", runId);
const publicEvidence = JSON.parse(readFileSync(join(artifactRoot, "public-capture", "evidence.json"), "utf8"));
const operatorEvidence = JSON.parse(readFileSync(join(artifactRoot, "operator-capture", "evidence.json"), "utf8"));
const target = resolveStagingTarget();
const report = analyzeFixtureDrift(target.origin, [...publicEvidence, ...operatorEvidence]);
console.log(JSON.stringify({ ok: true, classification: report.overallClassification }));
